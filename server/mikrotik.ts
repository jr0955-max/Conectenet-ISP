import fs from 'fs';
import path from 'path';
import { Client, Plan, ActiveSession, MikrotikConfig, MikrotikServer, RbBackup, RbBackupConfig } from '../src/types/index.js';
import { db } from './db.js';
import { RouterOSClient } from './routeros.js';

export interface MikrotikCommandLog {
  timestamp: string;
  command: string;
  response: string;
  success: boolean;
  serverName?: string;
}

class MikrotikService {
  private commandHistory: MikrotikCommandLog[] = [];

  // Generate RouterOS Terminal CLI command equivalents for operators
  public getCliScript(action: 'sync' | 'block' | 'unblock' | 'delete', client: Client): string {
    const plan = db.plans.find(p => p.id === client.planId);
    const server = this.resolveServer(client.serverId);
    const profile = client.status === 'blocked' ? server.blockProfile : (plan?.profileName || server.defaultProfile || 'default');

    switch (action) {
      case 'sync':
        return `# Criar ou atualizar Secret no MikroTik (${server.name} - ${server.host})
:if ([:len [/ppp secret find name="${client.pppoeUsername}"]] = 0) do={
  /ppp secret add name="${client.pppoeUsername}" password="${client.pppoePassword}" profile="${profile}" service=pppoe comment="${client.name} - ${client.ruralLocation || ''}"
} else={
  /ppp secret set [find name="${client.pppoeUsername}"] password="${client.pppoePassword}" profile="${profile}" comment="${client.name} - ${client.ruralLocation || ''}"
}`;

      case 'block':
        return `# Bloquear cliente inadimplente e derrubar sessão ativa
/ppp secret set [find name="${client.pppoeUsername}"] profile="${server.blockProfile}"
/ppp active remove [find name="${client.pppoeUsername}"]`;

      case 'unblock':
        return `# Desbloquear cliente após pagamento e restaurar plano
/ppp secret set [find name="${client.pppoeUsername}"] profile="${plan?.profileName || server.defaultProfile || 'default'}"
/ppp active remove [find name="${client.pppoeUsername}"]`;

      case 'delete':
        return `# Remover Secret e desconectar cliente
/ppp secret remove [find name="${client.pppoeUsername}"]
/ppp active remove [find name="${client.pppoeUsername}"]`;
    }
  }

  // Record command in history and audit log
  private logCommand(command: string, response: string, success = true, serverName?: string) {
    const log: MikrotikCommandLog = {
      timestamp: new Date().toISOString(),
      command,
      response,
      success,
      serverName
    };
    this.commandHistory.unshift(log);
    if (this.commandHistory.length > 50) this.commandHistory.pop();
    return log;
  }

  public getHistory(): MikrotikCommandLog[] {
    return this.commandHistory;
  }

  // Resolve target server
  public resolveServer(serverId?: string): MikrotikServer {
    if (serverId) {
      const found = db.servers.find(s => s.id === serverId);
      if (found) return found;
    }
    const defaultServer = db.servers.find(s => s.isDefault);
    if (defaultServer) return defaultServer;

    if (db.servers.length > 0) return db.servers[0];

    // Fallback if none defined
    return {
      id: 'srv-fallback',
      name: 'Servidor MikroTik (Padrão)',
      host: db.mikrotikConfig.host || '192.168.1.120',
      port: db.mikrotikConfig.port || 8728,
      user: db.mikrotikConfig.user || 'admin_isp',
      password: db.mikrotikConfig.password || '',
      interfaceName: 'ether2',
      defaultProfile: db.mikrotikConfig.defaultProfile || 'prof_15m_padrao',
      blockProfile: db.mikrotikConfig.blockProfile || 'prof_corte_bloqueado',
      location: 'Sede Central',
      isDefault: true,
      status: 'connected'
    };
  }

  // Get RouterOS API client for specific server
  private getClient(server: MikrotikServer): RouterOSClient {
    return new RouterOSClient(server.host, server.port, server.user, server.password || '', 4000);
  }

  // Test MikroTik Server Connection
  public async testServer(server: Partial<MikrotikServer>): Promise<{ success: boolean; message: string; details?: any }> {
    const host = (server.host || db.mikrotikConfig.host || '192.168.1.120').trim();
    const port = Number(server.port) || 8728;
    const user = (server.user || db.mikrotikConfig.user || 'admin_isp').trim();
    const password = server.password !== undefined ? server.password : (db.mikrotikConfig.password || '');

    const ros = new RouterOSClient(host, port, user, password, 4500);
    const result = await ros.testConnection();

    this.logCommand(`/system/resource/print (Host: ${host}:${port}, User: ${user})`, result.message, result.success, server.name || host);

    if (result.success) {
      // Update matching server if exists
      if (server.id) {
        const s = db.servers.find(item => item.id === server.id);
        if (s) {
          s.status = 'connected';
          s.lastSync = new Date().toISOString();
          if (result.details?.model) s.routerModel = result.details.model;
          if (result.details?.version) s.routerOsVersion = result.details.version;
          if (result.details?.uptime) s.uptime = result.details.uptime;
        }
      }
      db.mikrotikConfig.status = 'connected';
      db.mikrotikConfig.lastSync = new Date().toISOString();

      db.addAuditLog({
        type: 'mikrotik',
        action: 'TEST_CONNECTION',
        message: `Teste de conexão com MikroTik [${host}:${port}] (${user}) bem-sucedido.`,
        status: 'success'
      });
    } else {
      if (server.id) {
        const s = db.servers.find(item => item.id === server.id);
        if (s) s.status = 'error';
      }
      db.addAuditLog({
        type: 'mikrotik',
        action: 'TEST_CONNECTION_FAILED',
        message: `Falha no teste com MikroTik [${host}:${port}]: ${result.message}`,
        status: 'error'
      });
    }

    return result;
  }

  // Legacy testConnection wrapper for global config
  public async testConnection(config: Partial<MikrotikConfig>): Promise<{ success: boolean; message: string; details?: any }> {
    return this.testServer({
      id: db.servers[0]?.id,
      host: config.host || db.mikrotikConfig.host,
      port: config.port || db.mikrotikConfig.port,
      user: config.user || db.mikrotikConfig.user,
      password: config.password !== undefined ? config.password : db.mikrotikConfig.password
    });
  }

  // Real Sync Secret (/ppp secret add or set)
  public async syncSecret(client: Client): Promise<{ success: boolean; message: string; realMikrotikCreated?: boolean }> {
    const server = this.resolveServer(client.serverId);
    const plan = db.plans.find(p => p.id === client.planId);
    const profile = client.status === 'blocked' ? server.blockProfile : (plan?.profileName || server.defaultProfile || 'default');
    const comment = `${client.name} - ${client.ruralLocation || ''}`.trim();

    try {
      const ros = this.getClient(server);
      const res = await ros.syncSecret({
        username: client.pppoeUsername,
        password: client.pppoePassword,
        profile,
        comment,
        remoteAddress: client.ipAddress
      });

      this.logCommand(
        `/ppp/secret/${res.created ? 'add' : 'set'} name="${client.pppoeUsername}" profile="${profile}"`,
        `!done (success=${res.success})`,
        true,
        server.name
      );

      server.status = 'connected';
      server.lastSync = new Date().toISOString();

      db.addAuditLog({
        type: 'mikrotik',
        action: 'PPP_SECRET_UPDATE',
        message: `Secret PPPoE [${client.pppoeUsername}] provisionado no MikroTik '${server.name}' (${server.host}) com profile='${profile}'.`,
        status: 'success'
      });

      return {
        success: true,
        realMikrotikCreated: true,
        message: `Secret PPPoE '${client.pppoeUsername}' provisionado com sucesso na RB '${server.name}' (${server.host})!`
      };
    } catch (err: any) {
      // In case physical MikroTik is unreachable or rejected auth, log failure
      this.logCommand(
        `/ppp/secret/add name="${client.pppoeUsername}" profile="${profile}"`,
        `!trap message="${err.message}"`,
        false,
        server.name
      );

      server.status = 'error';

      db.addAuditLog({
        type: 'mikrotik',
        action: 'PPP_SECRET_ERROR',
        message: `Não foi possível provisionar o secret [${client.pppoeUsername}] na RB '${server.name}' (${server.host}): ${err.message}`,
        status: 'error'
      });

      return {
        success: false,
        realMikrotikCreated: false,
        message: `Cliente salvo no sistema, mas erro ao enviar comando para o MikroTik (${server.host}): ${err.message}`
      };
    }
  }

  // Remove Secret
  public async removeSecret(username: string, serverId?: string): Promise<{ success: boolean; message: string }> {
    const server = this.resolveServer(serverId);
    try {
      const ros = this.getClient(server);
      await ros.removeSecret(username);

      this.logCommand(`/ppp/secret/remove [find name="${username}"]`, `!done`, true, server.name);

      db.addAuditLog({
        type: 'mikrotik',
        action: 'PPP_SECRET_REMOVE',
        message: `Secret PPPoE [${username}] removido do MikroTik '${server.name}'.`,
        status: 'warning'
      });

      return {
        success: true,
        message: `Secret PPPoE '${username}' removido do MikroTik '${server.name}'.`
      };
    } catch (err: any) {
      this.logCommand(`/ppp/secret/remove [find name="${username}"]`, `!trap error="${err.message}"`, false, server.name);
      return {
        success: false,
        message: `Erro ao remover secret no MikroTik: ${err.message}`
      };
    }
  }

  // Block client (Switch to profile=bloqueados and kick active session)
  public async blockClient(client: Client): Promise<{ success: boolean; message: string }> {
    const server = this.resolveServer(client.serverId);
    const blockProfile = server.blockProfile || db.mikrotikConfig.blockProfile || 'prof_corte_bloqueado';

    try {
      const ros = this.getClient(server);
      await ros.blockSecret(client.pppoeUsername, blockProfile);

      this.logCommand(`/ppp/secret/set [find name="${client.pppoeUsername}"] profile="${blockProfile}" disabled=yes`, `!done`, true, server.name);
      this.logCommand(`/ppp/active/remove [find name="${client.pppoeUsername}"]`, `!done`, true, server.name);

      const existing = db.clients.find(c => c.id === client.id);
      if (existing) {
        existing.status = 'blocked';
      }
      db.save();

      db.addAuditLog({
        type: 'mikrotik',
        action: 'CLIENT_BLOCKED',
        message: `Cliente ${client.name} (${client.pppoeUsername}) BLOQUEADO na RB '${server.name}': alterado para profile='${blockProfile}' e sessão desconectada.`,
        status: 'warning'
      });

      return {
        success: true,
        message: `Cliente '${client.name}' bloqueado com sucesso no MikroTik '${server.name}'.`
      };
    } catch (err: any) {
      const existing = db.clients.find(c => c.id === client.id);
      if (existing) {
        existing.status = 'blocked';
        db.save();
      }

      return {
        success: false,
        message: `Cliente marcado como bloqueado no sistema, mas erro no MikroTik: ${err.message}`
      };
    }
  }

  // Unblock client
  public async unblockClient(client: Client): Promise<{ success: boolean; message: string }> {
    const server = this.resolveServer(client.serverId);
    const plan = db.plans.find(p => p.id === client.planId);
    const normalProfile = plan?.profileName || server.defaultProfile || 'default';

    try {
      const ros = this.getClient(server);
      await ros.unblockSecret(client.pppoeUsername, normalProfile);

      this.logCommand(`/ppp/secret/set [find name="${client.pppoeUsername}"] profile="${normalProfile}" disabled=no`, `!done`, true, server.name);

      const existing = db.clients.find(c => c.id === client.id);
      if (existing) {
        existing.status = 'active';
      }
      db.save();

      db.addAuditLog({
        type: 'mikrotik',
        action: 'CLIENT_UNBLOCKED',
        message: `Cliente ${client.name} (${client.pppoeUsername}) DESBLOQUEADO na RB '${server.name}': restaurado profile='${normalProfile}'.`,
        status: 'success'
      });

      return {
        success: true,
        message: `Cliente '${client.name}' desbloqueado com sucesso na RB '${server.name}'!`
      };
    } catch (err: any) {
      const existing = db.clients.find(c => c.id === client.id);
      if (existing) {
        existing.status = 'active';
        db.save();
      }

      return {
        success: false,
        message: `Cliente reativado no sistema, mas erro no MikroTik: ${err.message}`
      };
    }
  }

  // Kick session (Disconnect from /ppp active WITHOUT deleting credentials!)
  public async kickSession(username: string, serverId?: string): Promise<{ success: boolean; message: string }> {
    const server = this.resolveServer(serverId);
    try {
      const ros = this.getClient(server);
      await ros.disconnectActiveSession(username);
      this.logCommand(`/ppp/active/remove [find name="${username}"]`, `!done`, true, server.name);
      return {
        success: true,
        message: `Sessão ativa de '${username}' derrubada com sucesso no MikroTik '${server.name}'.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro ao desconectar sessão: ${err.message}`
      };
    }
  }

  private prevIfaceBytes: Map<string, { rxBytes: number; txBytes: number; timestamp: number }> = new Map();
  private prevSessionBytes: Map<string, { rxBytes: number; txBytes: number; timestamp: number }> = new Map();
  public lastOnlineSessionsCount: number = 0;

  public getLastOnlineCount(): number {
    return this.lastOnlineSessionsCount;
  }

  public parseRouterOsUptime(uptimeStr: string): number {
    if (!uptimeStr) return 0;
    let totalSecs = 0;
    const wMatch = uptimeStr.match(/(\d+)w/);
    const dMatch = uptimeStr.match(/(\d+)d/);
    const hMatch = uptimeStr.match(/(\d+)h/);
    const mMatch = uptimeStr.match(/(\d+)m/);
    const sMatch = uptimeStr.match(/(\d+)s/);
    if (wMatch) totalSecs += parseInt(wMatch[1], 10) * 7 * 86400;
    if (dMatch) totalSecs += parseInt(dMatch[1], 10) * 86400;
    if (hMatch) totalSecs += parseInt(hMatch[1], 10) * 3600;
    if (mMatch) totalSecs += parseInt(mMatch[1], 10) * 60;
    if (sMatch) totalSecs += parseInt(sMatch[1], 10);
    return totalSecs;
  }

  // Real Active Sessions from Physical Router (NO MOCKS)
  public async getActiveSessions(): Promise<ActiveSession[]> {
    const defaultServer = this.resolveServer();
    try {
      const ros = this.getClient(defaultServer);
      const realActives = await ros.getActiveSessions();
      defaultServer.status = 'connected';
      this.lastOnlineSessionsCount = realActives.length;

      return realActives.map((act) => {
        const username = act.name || act.user || '';
        const client = db.clients.find(c => c.pppoeUsername === username);
        const plan = client ? db.plans.find(p => p.id === client.planId) : null;
        const tower = client ? db.towers.find(t => t.id === client.towerId) : null;

        return {
          id: act['.id'] || `act-${username}`,
          username,
          clientName: client?.name || `Assinante ${username}`,
          ipAddress: act.address || client?.ipAddress || 'Dinâmico',
          uptime: act.uptime || '0s',
          uptimeSeconds: this.parseRouterOsUptime(act.uptime || '0s'),
          rxBytes: Number(act['limit-bytes-in']) || 0,
          txBytes: Number(act['limit-bytes-out']) || 0,
          rxRateKbps: 0,
          txRateKbps: 0,
          callerId: act['caller-id'] || client?.macAddress || 'Não informado',
          service: act.service || 'pppoe',
          interfaceName: `<pppoe-${username}>`,
          signalDbm: client?.signalDbm || -55,
          towerName: tower?.name || defaultServer.name
        };
      });
    } catch {
      defaultServer.status = 'error';
      this.lastOnlineSessionsCount = 0;
      return [];
    }
  }

  // Sync a single plan profile with MikroTik servers
  public async syncPlanProfile(plan: Plan, targetServerId?: string): Promise<{ success: boolean; message: string; results?: any[] }> {
    const serversToSync = targetServerId 
      ? db.servers.filter(s => s.id === targetServerId)
      : (db.servers.length > 0 ? db.servers : [this.resolveServer()]);

    const results: any[] = [];
    const rateLimit = `${plan.speedUp}M/${plan.speedDown}M`;

    for (const server of serversToSync) {
      try {
        const ros = this.getClient(server);
        const res = await ros.syncProfile({
          name: plan.profileName,
          rateLimit,
          comment: `${plan.name} (${plan.speedDown}M down / ${plan.speedUp}M up)`
        });
        this.logCommand(
          `/ppp/profile/${res.created ? 'add' : 'set'} name="${plan.profileName}" rate-limit="${rateLimit}"`,
          `!done (${res.message})`,
          true,
          server.name
        );
        results.push({ server: server.name, host: server.host, success: true, message: res.message });
      } catch (err: any) {
        this.logCommand(
          `/ppp/profile/add name="${plan.profileName}" rate-limit="${rateLimit}"`,
          `!trap error="${err.message}"`,
          false,
          server.name
        );
        results.push({ server: server.name, host: server.host, success: false, message: err.message });
      }
    }

    const anySuccess = results.some(r => r.success);
    return {
      success: anySuccess,
      message: anySuccess 
        ? `Profile '${plan.profileName}' (${rateLimit}) sincronizado com sucesso no MikroTik!`
        : `Erro ao sincronizar profile '${plan.profileName}': ${results.map(r => r.message).join(', ')}`,
      results
    };
  }

  // Remove plan profile from MikroTik servers
  public async removePlanProfile(profileName: string, targetServerId?: string): Promise<{ success: boolean; message: string }> {
    const serversToSync = targetServerId 
      ? db.servers.filter(s => s.id === targetServerId)
      : (db.servers.length > 0 ? db.servers : [this.resolveServer()]);

    for (const server of serversToSync) {
      try {
        const ros = this.getClient(server);
        await ros.removeProfile(profileName);
        this.logCommand(`/ppp/profile/remove [find name="${profileName}"]`, `!done`, true, server.name);
      } catch (err: any) {
        this.logCommand(`/ppp/profile/remove [find name="${profileName}"]`, `!trap ${err.message}`, false, server.name);
      }
    }

    return {
      success: true,
      message: `Profile '${profileName}' removido dos servidores MikroTik.`
    };
  }

  // Sync all plans to MikroTik
  public async syncAllPlans(targetServerId?: string): Promise<{ success: boolean; count: number; message: string }> {
    let synced = 0;
    for (const plan of db.plans) {
      await this.syncPlanProfile(plan, targetServerId);
      synced++;
    }
    return {
      success: true,
      count: synced,
      message: `Todos os ${synced} planos e perfis de velocidade foram sincronizados nas RBs MikroTik!`
    };
  }

  // Fetch real secrets from router
  public async getSecretsFromRouter(serverId?: string): Promise<{ success: boolean; secrets: any[]; message: string }> {
    const server = this.resolveServer(serverId);
    try {
      const ros = this.getClient(server);
      const secrets = await ros.executeTransaction(async (send) => {
        const resp = await send(['/ppp/secret/print']);
        return resp.data || [];
      });
      return { success: true, secrets, message: `${secrets.length} secrets lidos da RB ${server.name}` };
    } catch (err: any) {
      return { success: false, secrets: [], message: err.message };
    }
  }

  // 100% REAL Interface Traffic directly queried from RouterOS
  public async getAllRbsTraffic() {
    const results = [];
    let netRx = 0;
    let netTx = 0;
    const now = Date.now();

    for (const server of db.servers) {
      try {
        const ros = this.getClient(server);
        const [realIfaces, sysRes] = await Promise.allSettled([
          ros.getInterfaces(),
          ros.getSystemResource()
        ]);

        if (realIfaces.status !== 'fulfilled' || !Array.isArray(realIfaces.value)) {
          throw new Error('Falha ao comunicar com a RB via API port 8728');
        }

        server.status = 'connected';
        if (sysRes.status === 'fulfilled' && sysRes.value) {
          if (sysRes.value['cpu-load']) server.cpuLoad = Number(sysRes.value['cpu-load']);
          if (sysRes.value.uptime) server.uptime = sysRes.value.uptime;
          if (sysRes.value['board-name']) server.routerModel = sysRes.value['board-name'];
          if (sysRes.value.version) server.routerOsVersion = sysRes.value.version;
        }

        const ifacesList = realIfaces.value;
        const runningNames = ifacesList
          .filter((i: any) => i.running === 'true' && !i.name.startsWith('<pppoe-'))
          .map((i: any) => i.name);

        let liveRates: Record<string, { rxBps: number; txBps: number }> = {};
        if (runningNames.length > 0) {
          try {
            const monResult = await ros.getInterfaceMonitor(runningNames.slice(0, 12));
            for (const m of monResult) {
              if (m.name) {
                liveRates[m.name] = {
                  rxBps: Number(m['rx-bits-per-second']) || 0,
                  txBps: Number(m['tx-bits-per-second']) || 0
                };
              }
            }
          } catch {
            // Delta fallback
          }
        }

        const parsedIfaces = [];
        let serverRxTotal = 0;
        let serverTxTotal = 0;

        for (const rif of ifacesList) {
          const name = rif.name || 'interface';
          const rxBytes = Number(rif['rx-byte']) || 0;
          const txBytes = Number(rif['tx-byte']) || 0;
          const running = rif.running === 'true';
          const disabled = rif.disabled === 'true';

          let rxBps = 0;
          let txBps = 0;

          if (liveRates[name]) {
            rxBps = liveRates[name].rxBps;
            txBps = liveRates[name].txBps;
          } else {
            const prevKey = `${server.id}:${name}`;
            const prev = this.prevIfaceBytes.get(prevKey);
            if (prev && prev.timestamp < now) {
              const dt = (now - prev.timestamp) / 1000;
              if (dt >= 1 && dt <= 60) {
                if (rxBytes >= prev.rxBytes) rxBps = Math.round(((rxBytes - prev.rxBytes) * 8) / dt);
                if (txBytes >= prev.txBytes) txBps = Math.round(((txBytes - prev.txBytes) * 8) / dt);
              }
            }
            this.prevIfaceBytes.set(prevKey, { rxBytes, txBytes, timestamp: now });
          }

          if (running) {
            serverRxTotal += rxBps;
            serverTxTotal += txBps;
          }

          parsedIfaces.push({
            name,
            type: rif.type || 'ether',
            running,
            disabled,
            comment: rif.comment || '',
            rxBps,
            txBps,
            rxBytes,
            txBytes,
            rxPacketsSec: Math.round(rxBps / 12000),
            txPacketsSec: Math.round(txBps / 12000)
          });
        }

        netRx += serverRxTotal;
        netTx += serverTxTotal;

        results.push({
          serverId: server.id,
          serverName: server.name,
          host: server.host,
          port: server.port,
          location: server.location || 'Localidade Principal',
          status: 'connected',
          cpuLoad: server.cpuLoad || 0,
          memoryFreeMb: sysRes.status === 'fulfilled' && sysRes.value?.['free-memory'] ? Math.round(Number(sysRes.value['free-memory']) / (1024 * 1024)) : 0,
          uptime: server.uptime || 'Online',
          totalRxBps: serverRxTotal,
          totalTxBps: serverTxTotal,
          interfaces: parsedIfaces
        });
      } catch (err: any) {
        server.status = 'error';
        results.push({
          serverId: server.id,
          serverName: server.name,
          host: server.host,
          port: server.port,
          location: server.location || 'Localidade Principal',
          status: 'error',
          errorMessage: `RB Desconectada / Sem resposta na porta ${server.port}: ${err.message}`,
          cpuLoad: 0,
          memoryFreeMb: 0,
          uptime: 'Desconectado',
          totalRxBps: 0,
          totalTxBps: 0,
          interfaces: []
        });
      }
    }

    return {
      servers: results,
      totalNetworkRxBps: netRx,
      totalNetworkTxBps: netTx,
      timestamp: new Date().toISOString()
    };
  }

  // 100% REAL Active Connections directly queried from RouterOS (/ppp/active/print)
  public async getAllRbsActiveConnections() {
    const activeConnections: any[] = [];
    const onlineUsernames = new Set<string>();
    const authFailedUsernames = new Map<string, string>();
    const serverStatuses: Record<string, { status: string; error?: string }> = {};
    const now = Date.now();

    for (const server of db.servers) {
      try {
        const ros = this.getClient(server);
        const [realActivesRes, pppLogsRes, ifacesRes, queuesRes] = await Promise.allSettled([
          ros.getActiveSessions(),
          ros.getPppLogs(),
          ros.getInterfaces(),
          ros.getSimpleQueues()
        ]);

        if (realActivesRes.status !== 'fulfilled' || !Array.isArray(realActivesRes.value)) {
          throw new Error('Falha ao comunicar com a RB via API port 8728');
        }

        const realActives = realActivesRes.value;
        server.status = 'connected';
        serverStatuses[server.id] = { status: 'connected' };

        // Parse Simple Queues rates (RouterOS automatically creates dynamic simple queues for PPPoE)
        const queueRatesMap = new Map<string, { rxBps: number; txBps: number }>();
        if (queuesRes.status === 'fulfilled' && Array.isArray(queuesRes.value)) {
          for (const q of queuesRes.value) {
            const qName = q.name || '';
            const rateStr = q.rate || '';
            // RouterOS rate format: "upload_bps/download_bps" (rx/tx from router perspective)
            if (rateStr && rateStr.includes('/')) {
              const parts = rateStr.split('/');
              const upBps = parseInt(parts[0], 10) || 0;
              const downBps = parseInt(parts[1], 10) || 0;
              if (upBps > 0 || downBps > 0) {
                queueRatesMap.set(qName, { rxBps: upBps, txBps: downBps });
                // Also index without angle brackets
                if (qName.startsWith('<') && qName.endsWith('>')) {
                  queueRatesMap.set(qName.slice(1, -1), { rxBps: upBps, txBps: downBps });
                }
              }
            }
          }
        }

        // Parse recent PPP authentication errors (e.g. wrong password on customer router)
        if (pppLogsRes.status === 'fulfilled' && Array.isArray(pppLogsRes.value)) {
          for (const entry of pppLogsRes.value) {
            const msg = entry.message || '';
            // Example RouterOS log: "<pppoe-junior>: user junior authentication failed"
            const match = msg.match(/user\s+([^\s:]+)\s+authentication failed/i) || msg.match(/<pppoe-([^>]+)>:\s+authentication failed/i);
            if (match && match[1]) {
              const u = match[1].trim();
              authFailedUsernames.set(u, entry.time ? `Falha de autenticação às ${entry.time}: Senha PPPoE incorreta no roteador` : 'Senha PPPoE incorreta no roteador do assinante');
            }
          }
        }

        // Map all interfaces returned by /interface/print (including <pppoe-*> dynamic interfaces)
        const ifaceMap = new Map<string, any>();
        if (ifacesRes.status === 'fulfilled' && Array.isArray(ifacesRes.value)) {
          for (const rif of ifacesRes.value) {
            if (rif.name) {
              ifaceMap.set(rif.name, rif);
              if (rif.name.startsWith('<') && rif.name.endsWith('>')) {
                ifaceMap.set(rif.name.slice(1, -1), rif);
              }
            }
          }
        }

        // Try querying live monitor-traffic for active PPPoE dynamic interfaces
        const pppoeNamesToMonitor = realActives
          .slice(0, 16)
          .map(a => `<pppoe-${a.name || a.user}>`);

        let liveRates: Record<string, { rxBps: number; txBps: number }> = {};
        if (pppoeNamesToMonitor.length > 0) {
          try {
            const monRes = await ros.getInterfaceMonitor(pppoeNamesToMonitor);
            if (Array.isArray(monRes)) {
              for (const m of monRes) {
                if (m.name) {
                  liveRates[m.name] = {
                    rxBps: Number(m['rx-bits-per-second']) || 0,
                    txBps: Number(m['tx-bits-per-second']) || 0
                  };
                }
              }
            }
          } catch {
            // Delta fallback from interface byte counters
          }
        }

        for (const act of realActives) {
          const username = act.name || act.user;
          if (!username) continue;
          onlineUsernames.add(username);

          const client = db.clients.find(c => c.pppoeUsername === username);
          const plan = client ? db.plans.find(p => p.id === client.planId) : null;
          const tower = client ? db.towers.find(t => t.id === client.towerId) : null;

          const ifaceName = `<pppoe-${username}>`;
          const pppoeIface = ifaceMap.get(ifaceName) || ifaceMap.get(`pppoe-${username}`);
          const live = liveRates[ifaceName] || liveRates[`pppoe-${username}`];
          const queueRate = queueRatesMap.get(ifaceName) || queueRatesMap.get(`pppoe-${username}`) || queueRatesMap.get(username);

          // In RouterOS:
          // tx on customer interface = traffic transmitted TO customer = DOWNLOAD!
          // rx on customer interface = traffic received FROM customer = UPLOAD!
          let downloadKbps = 0;
          let uploadKbps = 0;

          const ifaceTxBytes = Number(pppoeIface?.['tx-byte']) || Number(act['limit-bytes-out']) || 0;
          const ifaceRxBytes = Number(pppoeIface?.['rx-byte']) || Number(act['limit-bytes-in']) || 0;

          if (live && (live.txBps > 0 || live.rxBps > 0)) {
            downloadKbps = Math.round(live.txBps / 1024);
            uploadKbps = Math.round(live.rxBps / 1024);
          } else if (queueRate && (queueRate.txBps > 0 || queueRate.rxBps > 0)) {
            // Queue rate from /queue/simple/print
            downloadKbps = Math.round(queueRate.txBps / 1024);
            uploadKbps = Math.round(queueRate.rxBps / 1024);
          } else {
            const prevKey = `${server.id}:${username}`;
            const prev = this.prevSessionBytes.get(prevKey);
            if (prev && prev.timestamp < now) {
              const dt = (now - prev.timestamp) / 1000;
              if (dt >= 1 && dt <= 60) {
                if (ifaceTxBytes >= prev.txBytes) {
                  downloadKbps = Math.round(((ifaceTxBytes - prev.txBytes) * 8) / (dt * 1024));
                }
                if (ifaceRxBytes >= prev.rxBytes) {
                  uploadKbps = Math.round(((ifaceRxBytes - prev.rxBytes) * 8) / (dt * 1024));
                }
              }
            }
          }

          // Always record latest byte counter for next delta
          this.prevSessionBytes.set(`${server.id}:${username}`, {
            rxBytes: ifaceRxBytes,
            txBytes: ifaceTxBytes,
            timestamp: now
          });

          activeConnections.push({
            id: act['.id'] || `act-${username}`,
            serverId: server.id,
            serverName: server.name,
            serverHost: server.host,
            username,
            clientName: client?.name || `Cliente ${username}`,
            clientPhone: client?.phone || '',
            planName: plan?.name || 'PPPoE RouterOS',
            ipAddress: act.address || client?.ipAddress || 'Dinâmico',
            callerId: act['caller-id'] || client?.macAddress || 'Não informado',
            uptime: act.uptime || 'Conectado agora',
            uptimeSeconds: this.parseRouterOsUptime(act.uptime || '0s'),
            rxRateKbps: downloadKbps, // Download rate (matches ↓ arrow)
            txRateKbps: uploadKbps,   // Upload rate (matches ↑ arrow)
            rxBytes: ifaceTxBytes,    // Total Download bytes
            txBytes: ifaceRxBytes,    // Total Upload bytes
            interfaceName: ifaceName,
            status: client?.status || 'active',
            ruralLocation: client?.ruralLocation || server.location,
            towerName: tower?.name || server.name
          });
        }
      } catch (err: any) {
        server.status = 'error';
        serverStatuses[server.id] = { 
          status: 'error', 
          error: `RB ${server.name} (${server.host}) desconectada ou inacessível: ${err.message}` 
        };
      }
    }

    this.lastOnlineSessionsCount = activeConnections.length;

    // Offline clients are clients registered in DB who DO NOT have an active session in any connected router
    const offlineClients = db.clients
      .filter(c => !onlineUsernames.has(c.pppoeUsername))
      .map(c => {
        const plan = db.plans.find(p => p.id === c.planId);
        const srv = db.servers.find(s => s.id === c.serverId) || db.servers[0];
        const srvInfo = srv ? serverStatuses[srv.id] : null;

        let lastSeenText = 'Desconectado (Roteador desligado ou sem sinal)';
        let isAuthFailed = false;

        if (c.status === 'blocked') {
          lastSeenText = 'Bloqueado por Inadimplência (Corte MikroTik)';
        } else if (srvInfo?.status === 'error') {
          lastSeenText = `🔴 RB '${srv?.name || 'Concentradora'}' Desconectada / Inacessível na porta 8728`;
        } else if (authFailedUsernames.has(c.pppoeUsername)) {
          isAuthFailed = true;
          lastSeenText = `⚠️ Senha PPPoE Incorreta / Falha de Autenticação no MikroTik: ${authFailedUsernames.get(c.pppoeUsername)}`;
        }

        return {
          id: c.id,
          name: c.name,
          pppoeUsername: c.pppoeUsername,
          phone: c.phone,
          ruralLocation: c.ruralLocation,
          planName: plan?.name || 'Plano Padrão',
          status: c.status,
          serverId: srv?.id,
          serverName: srv?.name,
          isAuthFailed,
          lastSeen: lastSeenText
        };
      });

    const totalRxBps = activeConnections.reduce((sum, c) => sum + (c.rxRateKbps * 1024), 0);
    const totalTxBps = activeConnections.reduce((sum, c) => sum + (c.txRateKbps * 1024), 0);

    return {
      activeConnections,
      offlineClients,
      serverStatuses,
      summary: {
        totalOnline: activeConnections.length,
        totalOffline: offlineClients.length,
        totalClients: db.clients.length,
        totalServers: db.servers.length,
        totalRxBps,
        totalTxBps
      }
    };
  }

  // System info
  public getSystemInfo() {
    const defaultServer = this.resolveServer();
    return {
      model: defaultServer.routerModel || db.mikrotikConfig.routerModel || 'MikroTik RouterOS',
      version: defaultServer.routerOsVersion || db.mikrotikConfig.routerOsVersion || 'v7.x',
      cpuLoad: defaultServer.cpuLoad || 0,
      freeMemoryMb: db.mikrotikConfig.freeMemoryMb,
      uptime: defaultServer.uptime || 'Desconectado',
      activeSessionsCount: this.lastOnlineSessionsCount,
      totalSecretsCount: db.clients.length,
      blockedSecretsCount: db.clients.filter(c => c.status === 'blocked').length,
      totalServers: db.servers.length
    };
  }

  // Clean up all Beesweb traces from all connected MikroTik RBs
  public async cleanupBeesweb(targetServerId?: string) {
    const serversToClean = targetServerId 
      ? db.servers.filter(s => s.id === targetServerId)
      : (db.servers.length > 0 ? db.servers : [this.resolveServer()]);

    const results = [];
    let totalRemoved = 0;

    for (const server of serversToClean) {
      try {
        const ros = this.getClient(server);
        const res = await ros.cleanupBeesweb();
        const removed = res.removedSchedulers + res.removedScripts + res.removedLists + res.removedProfiles + res.cleanedSecrets;
        totalRemoved += removed;
        results.push({
          server: server.name,
          host: server.host,
          success: true,
          details: res,
          message: removed > 0 
            ? `RB ${server.name}: ${removed} resquícios do Beesweb removidos (${res.removedSchedulers} schedulers, ${res.removedScripts} scripts, ${res.removedLists} address-lists, ${res.removedProfiles} profiles).`
            : `RB ${server.name}: Nenhum resquício do Beesweb encontrado.`
        });

        this.logCommand(
          `/system script/scheduler/firewall/profile remove [beesweb]`,
          `!done (${removed} itens limpos)`,
          true,
          server.name
        );
      } catch (err: any) {
        results.push({
          server: server.name,
          host: server.host,
          success: false,
          message: `Erro na RB ${server.name}: ${err.message}`
        });
      }
    }

    db.addAuditLog({
      type: 'mikrotik',
      action: 'CLEANUP_BEESWEB',
      message: `Limpeza do Beesweb executada: ${totalRemoved} itens limpos nas RBs MikroTik.`,
      status: 'success'
    });
    db.save();

    return {
      success: results.some(r => r.success),
      totalRemoved,
      results,
      message: totalRemoved > 0
        ? `Limpeza concluída! ${totalRemoved} itens antigos do Beesweb foram eliminados das RBs.`
        : `Nenhum resquício do Beesweb foi detectado nas RBs MikroTik conectadas.`
    };
  }

  // Optimize Bandwidth Control (Disable FastTrack to enable Simple Queues / Plan Rate Limits)
  public async optimizeBandwidth(targetServerId?: string) {
    const serversToOptimize = targetServerId 
      ? db.servers.filter(s => s.id === targetServerId)
      : (db.servers.length > 0 ? db.servers : [this.resolveServer()]);

    const results = [];

    for (const server of serversToOptimize) {
      try {
        const ros = this.getClient(server);
        const res = await ros.optimizeBandwidthControl();
        results.push({
          server: server.name,
          host: server.host,
          success: true,
          ...res
        });

        this.logCommand(
          `/ip firewall filter set [find action=fasttrack-connection] disabled=yes`,
          `!done (${res.message})`,
          true,
          server.name
        );
      } catch (err: any) {
        results.push({
          server: server.name,
          host: server.host,
          success: false,
          message: `Erro ao otimizar RB ${server.name}: ${err.message}`
        });
      }
    }

    return {
      success: results.some(r => r.success),
      results,
      message: results.map(r => `${r.server}: ${r.message}`).join(' | ')
    };
  }

  // Get ready-to-use Terminal scripts for MikroTik Winbox/CLI
  public getTerminalScripts() {
    return {
      fasttrackFix: `# =====================================================================
# 1. CORRIGIR CONTROLE DE BANDA & TESTE DE VELOCIDADE (DESATIVAR FASTTRACK)
# O FastTrack faz os pacotes ignorarem as Queues Simples do PPPoE.
# Execute este comando no Terminal do Winbox para fazer as Queues funcionarem:
# =====================================================================
/ip firewall filter disable [find action=fasttrack-connection]

# OU se preferir manter FastTrack apenas na WAN, excluindo PPPoE:
# /ip firewall filter set [find action=fasttrack-connection] in-interface=!all-ppp
`,
      beeswebCleanup: `# =====================================================================
# 2. LIMPAR TOTALMENTE QUALQUER RESQUÍCIO DO BEESWEB NA RB MIKROTIK
# Execute no Terminal do Winbox para remover agendamentos, scripts e listas:
# =====================================================================
/system scheduler remove [find name~"beesweb"]
/system script remove [find name~"beesweb"]
/ip firewall address-list remove [find list~"beesweb"]
/ppp profile remove [find name~"beesweb"]
/ppp profile remove [find comment~"beesweb"]
/ppp secret set [find comment~"beesweb"] comment="Migrado AgroISP"
`,
      reconnectCustomer: `# =====================================================================
# 3. DERRUBAR CONEXÃO PARA O ROTEADOR DO CLIENTE ASSUMIR A NOVA VELOCIDADE
# No RouterOS, alterar o plano só tem efeito após o cliente discar novamente:
# =====================================================================
/ppp active remove [find name="junior"]
`
    };
  }

  // ---------------------------------------------------------------------------
  // ROUTERBOARD CONFIGURATION BACKUPS (.rsc SNAPSHOTS)
  // ---------------------------------------------------------------------------

  // Create an .rsc configuration snapshot for a specific RB or all RBs
  public async createRbBackup(targetServerId?: string, triggeredBy: 'automatic' | 'manual' = 'manual'): Promise<{
    success: boolean;
    backups: RbBackup[];
    message: string;
  }> {
    const serversToBackup = targetServerId 
      ? db.servers.filter(s => s.id === targetServerId)
      : (db.servers.length > 0 ? db.servers : [this.resolveServer()]);

    const createdBackups: RbBackup[] = [];
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);

    for (const server of serversToBackup) {
      const serverSlug = (server.name || 'rb')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 30);
      const hostSlug = server.host.replace(/\./g, '_');
      const filename = `backup_${serverSlug}_${hostSlug}_${timestampStr}.rsc`;
      const filePath = path.join(db.rbBackupsDir, filename);

      let rscContent = '';
      let summary = {
        secretsCount: 0,
        profilesCount: 0,
        interfacesCount: 0,
        queuesCount: 0
      };
      let routerModel = server.routerModel || 'MikroTik RouterBOARD';
      let routerOsVersion = server.routerOsVersion || 'RouterOS v7.x';
      let status: 'success' | 'warning' | 'error' = 'success';

      try {
        const ros = this.getClient(server);
        const exportRes = await ros.exportConfigurationScript(server.name);
        rscContent = exportRes.rscContent;
        summary = exportRes.summary;
        if (exportRes.model) routerModel = exportRes.model;
        if (exportRes.version) routerOsVersion = exportRes.version;
      } catch (err: any) {
        // Fallback: If RB is offline or timeout, generate clean backup from database state
        status = 'warning';
        const serverClients = db.clients.filter(c => !c.serverId || c.serverId === server.id);
        const serverPlans = db.plans;

        const lines: string[] = [
          '# ==============================================================================',
          '# MIKROTIK ROUTEROS CONFIGURATION SNAPSHOT (.rsc) - BASE DE DADOS AGROISP',
          `# Concentrador: ${server.name} (${server.host}:${server.port})`,
          `# Status: Capturado a partir do cache e registros locais do AgroISP (${err.message})`,
          `# Data do Snapshot: ${now.toISOString()}`,
          '# ==============================================================================',
          '',
          '/system identity',
          `set name="${server.name}"`,
          '',
          '/ppp profile'
        ];

        for (const p of serverPlans) {
          lines.push(`add name="${p.profileName}" rate-limit="${p.speedUp}M/${p.speedDown}M" comment="${p.name}"`);
        }
        lines.push(`add name="${server.blockProfile || 'prof_corte_bloqueado'}" rate-limit="128k/128k" comment="Perfil Corte Inadimplentes"`);

        lines.push('');
        lines.push('/ppp secret');
        for (const c of serverClients) {
          const plan = db.plans.find(p => p.id === c.planId);
          const prof = c.status === 'blocked' ? server.blockProfile : (plan?.profileName || server.defaultProfile || 'default');
          const disabled = c.status === 'blocked' ? ' disabled=yes' : ' disabled=no';
          const ip = c.ipAddress ? ` remote-address=${c.ipAddress}` : '';
          lines.push(`add name="${c.pppoeUsername}" password="${c.pppoePassword}" profile="${prof}" service=pppoe${ip}${disabled} comment="${c.name}"`);
        }

        lines.push('');
        lines.push('/queue simple');
        for (const c of serverClients) {
          const plan = db.plans.find(p => p.id === c.planId);
          if (plan) {
            lines.push(`add name="<pppoe-${c.pppoeUsername}>" target="<pppoe-${c.pppoeUsername}>" max-limit=${plan.speedUp}M/${plan.speedDown}M comment="${c.name}"`);
          }
        }

        lines.push('');
        lines.push('# Fim do Snapshot');
        rscContent = lines.join('\n');

        summary = {
          secretsCount: serverClients.length,
          profilesCount: serverPlans.length + 1,
          interfacesCount: 2,
          queuesCount: serverClients.length
        };
      }

      // Write .rsc file to disk in data/rb_backups/
      fs.writeFileSync(filePath, rscContent, 'utf-8');
      const stat = fs.statSync(filePath);
      const linesCount = rscContent.split('\n').length;

      const newBackup: RbBackup = {
        id: `rsc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        serverId: server.id,
        serverName: server.name,
        serverHost: server.host,
        filename,
        filePath,
        sizeBytes: stat.size,
        linesCount,
        createdAt: now.toISOString(),
        triggeredBy,
        status,
        routerModel,
        routerOsVersion,
        summary
      };

      // Add to beginning of backups array
      db.rbBackups.unshift(newBackup);
      createdBackups.push(newBackup);

      // Prune old backups for this server based on retentionCount
      const retention = db.rbBackupConfig.retentionCount || 15;
      const serverBackups = db.rbBackups.filter(b => b.serverId === server.id);
      if (serverBackups.length > retention) {
        const toDelete = serverBackups.slice(retention);
        for (const old of toDelete) {
          try {
            if (fs.existsSync(old.filePath)) {
              fs.unlinkSync(old.filePath);
            }
          } catch {}
          db.rbBackups = db.rbBackups.filter(b => b.id !== old.id);
        }
      }

      this.logCommand(
        `/export file="${filename}"`,
        `!done (${linesCount} linhas exportadas, ${(stat.size / 1024).toFixed(1)} KB)`,
        status === 'success',
        server.name
      );
    }

    if (triggeredBy === 'automatic') {
      db.rbBackupConfig.lastAutoBackup = now.toISOString();
      const nextTime = new Date(now.getTime() + (db.rbBackupConfig.frequencyHours || 24) * 3600000);
      db.rbBackupConfig.nextScheduledBackup = nextTime.toISOString();
    }

    db.addAuditLog({
      type: 'mikrotik',
      action: 'RB_BACKUP_EXPORT',
      message: `Backup de configurações (.rsc) gerado para ${createdBackups.length} RB(s) [${triggeredBy.toUpperCase()}]. Arquivos salvos em /data/rb_backups/.`,
      status: 'success'
    });

    db.save();

    return {
      success: createdBackups.length > 0,
      backups: createdBackups,
      message: `${createdBackups.length} snapshot(s) (.rsc) salvos com sucesso na pasta de armazenamento do backend!`
    };
  }

  // List all RB backups
  public getRbBackups(serverId?: string): RbBackup[] {
    if (serverId && serverId !== 'all') {
      return db.rbBackups.filter(b => b.serverId === serverId);
    }
    return db.rbBackups;
  }

  // Get raw .rsc file content for viewing / download
  public getRbBackupContent(backupId: string): { backup: RbBackup; content: string } | null {
    const backup = db.rbBackups.find(b => b.id === backupId);
    if (!backup) return null;

    if (fs.existsSync(backup.filePath)) {
      const content = fs.readFileSync(backup.filePath, 'utf-8');
      return { backup, content };
    }
    return null;
  }

  // Delete an RB backup file and record
  public deleteRbBackup(backupId: string): { success: boolean; message: string } {
    const backupIndex = db.rbBackups.findIndex(b => b.id === backupId);
    if (backupIndex === -1) {
      return { success: false, message: 'Backup não encontrado.' };
    }

    const backup = db.rbBackups[backupIndex];
    try {
      if (fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
    } catch (err: any) {
      console.error(`Erro ao apagar arquivo ${backup.filePath}:`, err);
    }

    db.rbBackups.splice(backupIndex, 1);
    db.save();

    return {
      success: true,
      message: `Backup '${backup.filename}' removido com sucesso do armazenamento.`
    };
  }

  // Get and update backup config
  public getRbBackupConfig(): RbBackupConfig {
    return db.rbBackupConfig;
  }

  public updateRbBackupConfig(updates: Partial<RbBackupConfig>): RbBackupConfig {
    db.rbBackupConfig = {
      ...db.rbBackupConfig,
      ...updates
    };
    if (db.rbBackupConfig.autoBackupEnabled && !db.rbBackupConfig.nextScheduledBackup) {
      const next = new Date(Date.now() + (db.rbBackupConfig.frequencyHours || 24) * 3600000);
      db.rbBackupConfig.nextScheduledBackup = next.toISOString();
    }
    db.save();
    return db.rbBackupConfig;
  }

  // Start automated cron background check
  public initAutoBackupScheduler() {
    // Check every 15 minutes
    setInterval(async () => {
      try {
        const config = db.rbBackupConfig;
        if (!config || !config.autoBackupEnabled) return;

        const now = Date.now();
        const lastTime = config.lastAutoBackup ? new Date(config.lastAutoBackup).getTime() : 0;
        const intervalMs = (config.frequencyHours || 24) * 3600000;

        if (now - lastTime >= intervalMs) {
          console.log('[AgroISP Pro] Executando rotina de backup automático das RBs MikroTik...');
          await this.createRbBackup(undefined, 'automatic');
        }
      } catch (err) {
        console.error('[AgroISP Pro] Erro no agendador de backup das RBs:', err);
      }
    }, 15 * 60 * 1000);
  }
}

export const mikrotikService = new MikrotikService();
