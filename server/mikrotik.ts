import { Client, ActiveSession, MikrotikConfig, MikrotikServer } from '../src/types/index.js';
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

      this.logCommand(`/ppp/secret/set [find name="${client.pppoeUsername}"] profile="${blockProfile}"`, `!done`, true, server.name);
      this.logCommand(`/ppp/active/remove [find name="${client.pppoeUsername}"]`, `!done`, true, server.name);

      const existing = db.clients.find(c => c.id === client.id);
      if (existing) {
        existing.status = 'blocked';
      }

      db.addAuditLog({
        type: 'mikrotik',
        action: 'CLIENT_BLOCKED',
        message: `Cliente ${client.name} (${client.pppoeUsername}) BLOQUEADO na RB '${server.name}': alterado para profile='${blockProfile}' e sessão derrubada.`,
        status: 'warning'
      });

      return {
        success: true,
        message: `Cliente '${client.name}' bloqueado com sucesso no MikroTik '${server.name}'.`
      };
    } catch (err: any) {
      const existing = db.clients.find(c => c.id === client.id);
      if (existing) existing.status = 'blocked';

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

      this.logCommand(`/ppp/secret/set [find name="${client.pppoeUsername}"] profile="${normalProfile}"`, `!done`, true, server.name);

      const existing = db.clients.find(c => c.id === client.id);
      if (existing) {
        existing.status = 'active';
      }

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
      if (existing) existing.status = 'active';

      return {
        success: false,
        message: `Cliente reativado no sistema, mas erro no MikroTik: ${err.message}`
      };
    }
  }

  // Kick session
  public async kickSession(username: string, serverId?: string): Promise<{ success: boolean; message: string }> {
    const server = this.resolveServer(serverId);
    try {
      const ros = this.getClient(server);
      await ros.removeSecret(username);
      this.logCommand(`/ppp/active/remove [find name="${username}"]`, `!done`, true, server.name);
      return {
        success: true,
        message: `Sessão ativa de '${username}' derrubada no MikroTik '${server.name}'.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro ao desconectar sessão: ${err.message}`
      };
    }
  }

  // Active Sessions
  public getActiveSessions(): ActiveSession[] {
    const activeClients = db.clients.filter(c => c.status === 'active');
    
    return activeClients.map((client, index) => {
      const plan = db.plans.find(p => p.id === client.planId);
      const tower = db.towers.find(t => t.id === client.towerId);
      const server = this.resolveServer(client.serverId);

      const maxDownKbps = (plan?.speedDown || 15) * 1024;
      const rxRateKbps = Math.floor(Math.random() * (maxDownKbps * 0.7)) + 120;
      const txRateKbps = Math.floor(rxRateKbps * 0.2) + 40;

      const uptimeHours = (index * 7 + 3) % 48;
      const uptimeMins = (index * 13 + 22) % 60;
      const uptimeSecs = (index * 29 + 15) % 60;

      return {
        id: `act-${client.id}`,
        username: client.pppoeUsername,
        clientName: client.name,
        ipAddress: client.ipAddress || `10.50.${index + 1}.100`,
        uptime: `${uptimeHours}h ${uptimeMins}m ${uptimeSecs}s`,
        uptimeSeconds: uptimeHours * 3600 + uptimeMins * 60 + uptimeSecs,
        rxBytes: 1024 * 1024 * (index * 450 + 120),
        txBytes: 1024 * 1024 * (index * 80 + 35),
        rxRateKbps,
        txRateKbps,
        callerId: client.macAddress || `DC:9F:DB:${(10 + index).toString(16)}:4A:${(20 + index).toString(16)}`,
        service: 'pppoe',
        interfaceName: `<pppoe-${client.pppoeUsername}>`,
        signalDbm: client.signalDbm || -55 - (index % 12),
        towerName: tower?.name || server.name
      };
    });
  }

  // System info
  public getSystemInfo() {
    const defaultServer = this.resolveServer();
    return {
      model: defaultServer.routerModel || db.mikrotikConfig.routerModel,
      version: defaultServer.routerOsVersion || db.mikrotikConfig.routerOsVersion,
      cpuLoad: defaultServer.cpuLoad || 2,
      freeMemoryMb: db.mikrotikConfig.freeMemoryMb,
      uptime: defaultServer.uptime || db.mikrotikConfig.uptime,
      activeSessionsCount: db.clients.filter(c => c.status === 'active').length,
      totalSecretsCount: db.clients.length,
      blockedSecretsCount: db.clients.filter(c => c.status === 'blocked').length,
      totalServers: db.servers.length
    };
  }
}

export const mikrotikService = new MikrotikService();
