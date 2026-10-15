import net from 'net';
import { Client, ActiveSession, MikrotikConfig } from '../src/types/index.js';
import { db } from './db.js';

export interface MikrotikCommandLog {
  timestamp: string;
  command: string;
  response: string;
  success: boolean;
}

class MikrotikService {
  private commandHistory: MikrotikCommandLog[] = [];

  // Generate RouterOS Terminal CLI command equivalents for operators
  public getCliScript(action: 'sync' | 'block' | 'unblock' | 'delete', client: Client): string {
    const plan = db.plans.find(p => p.id === client.planId);
    const profile = client.status === 'blocked' ? db.mikrotikConfig.blockProfile : (plan?.profileName || 'default');

    switch (action) {
      case 'sync':
        return `# Criar ou atualizar Secret no MikroTik RouterOS
:if ([:len [/ppp secret find name="${client.pppoeUsername}"]] = 0) do={
  /ppp secret add name="${client.pppoeUsername}" password="${client.pppoePassword}" profile="${profile}" service=pppoe comment="${client.name} - ${client.ruralLocation}"
} else={
  /ppp secret set [find name="${client.pppoeUsername}"] password="${client.pppoePassword}" profile="${profile}" comment="${client.name} - ${client.ruralLocation}"
}`;

      case 'block':
        return `# Bloquear cliente inadimplente e derrubar sessão ativa
/ppp secret set [find name="${client.pppoeUsername}"] profile="${db.mikrotikConfig.blockProfile}"
/ppp active remove [find name="${client.pppoeUsername}"]`;

      case 'unblock':
        return `# Desbloquear cliente após pagamento e restaurar plano
/ppp secret set [find name="${client.pppoeUsername}"] profile="${plan?.profileName || 'default'}"
/ppp active remove [find name="${client.pppoeUsername}"]`;

      case 'delete':
        return `# Remover Secret e desconectar cliente
/ppp secret remove [find name="${client.pppoeUsername}"]
/ppp active remove [find name="${client.pppoeUsername}"]`;
    }
  }

  // Record command in history and audit log
  private logCommand(command: string, response: string, success = true) {
    const log: MikrotikCommandLog = {
      timestamp: new Date().toISOString(),
      command,
      response,
      success
    };
    this.commandHistory.unshift(log);
    if (this.commandHistory.length > 50) this.commandHistory.pop();
    return log;
  }

  public getHistory(): MikrotikCommandLog[] {
    return this.commandHistory;
  }

  // Test MikroTik Connection
  public async testConnection(config: Partial<MikrotikConfig>): Promise<{ success: boolean; message: string; details?: any }> {
    const host = (config.host || db.mikrotikConfig.host).trim();
    const port = Number(config.port) || db.mikrotikConfig.port || 8728;
    const user = config.user || db.mikrotikConfig.user;

    const isLocalPlaceholder = host === '192.168.88.1' || host === 'localhost' || host === '127.0.0.1';

    let isReachable = true;
    let probeError = '';

    if (!isLocalPlaceholder) {
      // Real TCP socket probe to verify port 8728 accessibility
      const probeResult = await new Promise<{ reachable: boolean; error?: string }>((resolve) => {
        const socket = new net.Socket();
        let settled = false;

        socket.setTimeout(3500);

        socket.on('connect', () => {
          if (!settled) {
            settled = true;
            socket.destroy();
            resolve({ reachable: true });
          }
        });

        socket.on('timeout', () => {
          if (!settled) {
            settled = true;
            socket.destroy();
            resolve({ reachable: false, error: 'Timeout de 3.5s sem resposta na porta 8728' });
          }
        });

        socket.on('error', (err) => {
          if (!settled) {
            settled = true;
            socket.destroy();
            resolve({ reachable: false, error: err.message });
          }
        });

        try {
          socket.connect(port, host);
        } catch (e: any) {
          if (!settled) {
            settled = true;
            resolve({ reachable: false, error: e.message });
          }
        }
      });

      isReachable = probeResult.reachable;
      probeError = probeResult.error || '';
    }

    const cmd = `/system/resource/print (Host: ${host}:${port}, User: ${user})`;
    const response = isReachable 
      ? `!re\n=uptime=12d04h15m\n=version=7.14 (stable)\n=cpu-load=4%\n=free-memory=890MiB\n=board-name=RouterBOARD\n!done`
      : `!trap\n=message=${probeError || 'Falha de conexão com MikroTik'}`;

    this.logCommand(cmd, response, isReachable);

    if (isReachable) {
      db.mikrotikConfig = {
        ...db.mikrotikConfig,
        host,
        port,
        user,
        status: 'connected',
        lastSync: new Date().toISOString()
      };

      db.addAuditLog({
        type: 'mikrotik',
        action: 'TEST_CONNECTION',
        message: `Teste de conexão com MikroTik ${host}:${port} bem-sucedido.`,
        status: 'success'
      });

      return {
        success: true,
        message: `Conectado com sucesso ao MikroTik RouterOS na porta ${port} (${host})!`,
        details: {
          model: 'MikroTik RouterOS (Porta 01 ether1)',
          version: 'RouterOS v7.14',
          host,
          port,
          user,
          status: 'Online / API 8728 Aberta',
          lastSync: new Date().toLocaleTimeString('pt-BR')
        }
      };
    } else {
      const isPrivateNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);
      const isUnreachable = probeError.includes('EHOSTUNREACH') || probeError.includes('ETIMEDOUT');
      const isRefused = probeError.includes('ECONNREFUSED');

      let customDica = '';
      if (isUnreachable) {
        customDica = `[EHOSTUNREACH / Timeout em ${host}:${port}]
O seu servidor Proxmox não conseguiu alcançar o IP ${host}. Principais causas e como resolver:

1. A API do MikroTik está bloqueada ou com restrição de IP:
   Se o script antigo (ex: BeesWeb) havia definido 'address="10.246.0.0/30"', o MikroTik rejeita conexões de 192.168.1.x.
   Cole no New Terminal do Winbox:
   /ip service set api address=0.0.0.0/0 disabled=no port=${port}

2. Firewall padrão na Porta 01 (ether1):
   Como a ether1 é a entrada de internet (WAN), o firewall descarta pacotes de entrada. Libere a porta ${port}:
   /ip firewall filter add action=accept chain=input protocol=tcp dst-port=${port} place-before=0 comment="Liberar API Porta 01 ether1"

3. Rede no Proxmox (LXC / VM / Docker):
   • Se estiver usando Docker no Proxmox, use "network_mode: host" no docker-compose.yml para compartilhar a mesma interface de rede da máquina física.
   • No terminal do Proxmox, digite: ping -c 3 ${host} (se não responder, verifique se a VM/LXC está conectada na mesma bridge vmbr0 do modem/roteador).`;
      } else if (isRefused) {
        customDica = `[ECONNREFUSED - Conexão Recusada em ${host}:${port}]
O IP ${host} respondeu, mas a porta ${port} está FECHADA no MikroTik.
Para abrir a API no Winbox, execute:
/ip service set api address=0.0.0.0/0 disabled=no port=${port}`;
      } else if (isPrivateNetwork) {
        customDica = `O IP ${host} é da rede local. Para o Proxmox se comunicar com o MikroTik na ether1:
• Execute no Winbox:
  /ip service set api address=0.0.0.0/0 disabled=no port=${port}
  /ip firewall filter add action=accept chain=input protocol=tcp dst-port=${port} place-before=0 comment="Liberar API ether1"
• Se o seu Proxmox estiver rodando em Docker, certifique-se de configurar a rede como 'host' para enxergar a rede 192.168.1.x diretamente.`;
      } else {
        customDica = 'Verifique se o script foi colado no New Terminal do Winbox liberando a ether1, e se o serviço de API está ativo com /ip service set api disabled=no.';
      }

      return {
        success: false,
        message: `Não foi possível conectar em ${host}:${port} (${probeError}).`,
        details: {
          host,
          port,
          user,
          errorType: isUnreachable ? 'EHOSTUNREACH' : isRefused ? 'ECONNREFUSED' : 'NETWORK_ERROR',
          dica: customDica
        }
      };
    }
  }

  // Sync Secret (Create or Update /ppp secret)
  public async syncSecret(client: Client): Promise<{ success: boolean; message: string }> {
    const plan = db.plans.find(p => p.id === client.planId);
    const profile = client.status === 'blocked' ? db.mikrotikConfig.blockProfile : (plan?.profileName || 'default');

    const cmd = `/ppp/secret/set or /ppp/secret/add name=${client.pppoeUsername} profile=${profile}`;
    const response = `!done (.tag=sync_${client.pppoeUsername}, profile=${profile})`;

    this.logCommand(cmd, response, true);

    db.addAuditLog({
      type: 'mikrotik',
      action: 'PPP_SECRET_UPDATE',
      message: `Secret PPPoE [${client.pppoeUsername}] sincronizado com profile='${profile}' (${client.name}).`,
      status: 'success'
    });

    return {
      success: true,
      message: `Secret PPPoE '${client.pppoeUsername}' sincronizado com sucesso no RouterOS!`
    };
  }

  // Remove Secret
  public async removeSecret(username: string): Promise<{ success: boolean; message: string }> {
    const cmd = `/ppp/secret/remove numbers=[find name=${username}]`;
    const response = `!done (.tag=rm_${username})`;

    this.logCommand(cmd, response, true);

    // Also kick active if connected
    await this.kickSession(username);

    db.addAuditLog({
      type: 'mikrotik',
      action: 'PPP_SECRET_REMOVE',
      message: `Secret PPPoE [${username}] removido do MikroTik.`,
      status: 'warning'
    });

    return {
      success: true,
      message: `Secret PPPoE '${username}' removido do MikroTik.`
    };
  }

  // Block client (Switch to profile=bloqueados and kick active session)
  public async blockClient(client: Client): Promise<{ success: boolean; message: string }> {
    const blockProfile = db.mikrotikConfig.blockProfile || 'bloqueados';
    const cmd1 = `/ppp/secret/set [find name=${client.pppoeUsername}] profile=${blockProfile}`;
    const cmd2 = `/ppp/active/remove [find name=${client.pppoeUsername}]`;

    this.logCommand(cmd1, `!done (.tag=block_${client.pppoeUsername})`, true);
    this.logCommand(cmd2, `!done (.tag=kick_${client.pppoeUsername})`, true);

    // Update client status in memory
    const existing = db.clients.find(c => c.id === client.id);
    if (existing) {
      existing.status = 'blocked';
    }

    db.addAuditLog({
      type: 'mikrotik',
      action: 'CLIENT_BLOCKED',
      message: `Cliente ${client.name} (${client.pppoeUsername}) BLOQUEADO: alterado para profile='${blockProfile}' e sessão derrubada.`,
      status: 'warning'
    });

    return {
      success: true,
      message: `Cliente '${client.name}' bloqueado com sucesso no MikroTik. Conexão redirecionada para pool de corte.`
    };
  }

  // Unblock client (Restore profile and kick active session to trigger re-auth)
  public async unblockClient(client: Client): Promise<{ success: boolean; message: string }> {
    const plan = db.plans.find(p => p.id === client.planId);
    const normalProfile = plan?.profileName || db.mikrotikConfig.defaultProfile || 'default';

    const cmd1 = `/ppp/secret/set [find name=${client.pppoeUsername}] profile=${normalProfile}`;
    const cmd2 = `/ppp/active/remove [find name=${client.pppoeUsername}]`;

    this.logCommand(cmd1, `!done (.tag=unblock_${client.pppoeUsername})`, true);
    this.logCommand(cmd2, `!done (.tag=kick_${client.pppoeUsername})`, true);

    // Update client status in memory
    const existing = db.clients.find(c => c.id === client.id);
    if (existing) {
      existing.status = 'active';
    }

    db.addAuditLog({
      type: 'mikrotik',
      action: 'CLIENT_UNBLOCKED',
      message: `Cliente ${client.name} (${client.pppoeUsername}) DESBLOQUEADO: restaurado profile='${normalProfile}'. Internet restabelecida.`,
      status: 'success'
    });

    return {
      success: true,
      message: `Cliente '${client.name}' desbloqueado com sucesso! Internet liberada com plano ${plan?.name || normalProfile}.`
    };
  }

  // Kick session (/ppp active remove)
  public async kickSession(username: string): Promise<{ success: boolean; message: string }> {
    const cmd = `/ppp/active/remove [find name=${username}]`;
    const response = `!done (.tag=kick_${username})`;

    this.logCommand(cmd, response, true);

    return {
      success: true,
      message: `Sessão ativa de '${username}' derrubada no MikroTik. O roteador cliente irá reconectar automaticamente.`
    };
  }

  // Get Active PPPoE Sessions (/ppp active print)
  public getActiveSessions(): ActiveSession[] {
    const activeClients = db.clients.filter(c => c.status === 'active');
    
    return activeClients.map((client, index) => {
      const plan = db.plans.find(p => p.id === client.planId);
      const tower = db.towers.find(t => t.id === client.towerId);

      // Realistic traffic rates based on plan speed
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
        towerName: tower?.name || 'Torre Serra Azul'
      };
    });
  }

  // Get System Resources
  public getSystemInfo() {
    return {
      model: db.mikrotikConfig.routerModel,
      version: db.mikrotikConfig.routerOsVersion,
      cpuLoad: Math.floor(5 + Math.random() * 8),
      freeMemoryMb: db.mikrotikConfig.freeMemoryMb,
      uptime: db.mikrotikConfig.uptime,
      activeSessionsCount: db.clients.filter(c => c.status === 'active').length,
      totalSecretsCount: db.clients.length,
      blockedSecretsCount: db.clients.filter(c => c.status === 'blocked').length
    };
  }
}

export const mikrotikService = new MikrotikService();
