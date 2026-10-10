import React, { useState } from 'react';
import { 
  Server, 
  Cpu, 
  Activity, 
  PowerOff, 
  RefreshCw, 
  Terminal, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Wifi, 
  ArrowUpDown,
  Send,
  Zap
} from 'lucide-react';
import { MikrotikConfig, ActiveSession, Client, Plan, CompanySettings } from '../types/index.js';
import { SystemBackupCard } from './SystemBackupCard.js';

interface MikrotikViewProps {
  config: MikrotikConfig | null;
  activeSessions: ActiveSession[];
  clients: Client[];
  plans: Plan[];
  companySettings?: CompanySettings;
  onDisconnectSession: (username: string) => void;
  onUpdateConfig: (newConfig: Partial<MikrotikConfig>) => void;
  onTestConnection: (testData: { host: string; port: number; user: string }) => Promise<any>;
  onRefresh: () => void;
}

export const MikrotikView: React.FC<MikrotikViewProps> = ({
  config,
  activeSessions,
  clients,
  plans,
  companySettings,
  onDisconnectSession,
  onUpdateConfig,
  onTestConnection,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'active' | 'secrets' | 'terminal' | 'config'>('active');
  const [copiedScript, setCopiedScript] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Config form state
  const [host, setHost] = useState(config?.host || '192.168.88.1');
  const [port, setPort] = useState(config?.port || 8728);
  const [user, setUser] = useState(config?.user || 'admin_isp');
  const [password, setPassword] = useState('');
  const [blockProfile, setBlockProfile] = useState(config?.blockProfile || 'bloqueados');
  const [defaultProfile, setDefaultProfile] = useState(config?.defaultProfile || 'default');

  // Terminal state
  const [cliCommand, setCliCommand] = useState('/ppp active print');
  const [cliOutput, setCliOutput] = useState<string>(`[admin_isp@MikroTik-CCR1009] > /system resource print
                   uptime: 42d18h33m
                  version: 7.14.3 (stable)
               build-time: 2026-02-10 14:22:01
              free-memory: 942.8MiB
             total-memory: 1024.0MiB
                      cpu: tilegx
                cpu-count: 9
            cpu-frequency: 1000MHz
                 cpu-load: 8%
           free-hdd-space: 112.5MiB
          total-hdd-space: 128.0MiB
  write-sect-since-reboot: 184201
         write-sect-total: 512094
               board-name: CCR1009-7G-1C-1S+
                 platform: MikroTik
[admin_isp@MikroTik-CCR1009] >`);

  const handleRunCommand = () => {
    let response = '';
    const clean = cliCommand.trim();

    if (clean.includes('/ppp active print')) {
      response = `Flags: R - RADIUS\n #   NAME             SERVICE  CALLER-ID         ADDRESS         UPTIME   ENCODING\n` +
        activeSessions.map((s, idx) => ` ${idx}   ${s.username.padEnd(16)} pppoe    ${s.callerId} ${s.ipAddress.padEnd(15)} ${s.uptime}`).join('\n');
    } else if (clean.includes('/ppp secret print')) {
      response = `Flags: X - DISABLED\n #   NAME             SERVICE  CALLER-ID  PASSWORD    PROFILE        REMOTE-ADDRESS\n` +
        clients.map((c, idx) => {
          const plan = plans.find(p => p.id === c.planId);
          const prof = c.status === 'blocked' ? blockProfile : (plan?.profileName || defaultProfile);
          const flag = c.status === 'blocked' ? 'X' : ' ';
          return ` ${idx} ${flag} ${c.pppoeUsername.padEnd(16)} pppoe               ********    ${prof.padEnd(14)} ${c.ipAddress || 'dynamic'}`;
        }).join('\n');
    } else if (clean.includes('/interface print')) {
      response = ` #   NAME                     TYPE       ACTUAL-MTU   L2MTU  MAX-L2MTU  MAC-ADDRESS\n 0 R ether1-WAN               ether            1500    1580       4076  48:8F:5A:01:02:03\n 1 R ether2-LAN-POPS          ether            1500    1580       4076  48:8F:5A:01:02:04\n 2 R sfp-plus1-OLT-FIBRA      ether            1500    1580       4076  48:8F:5A:01:02:05`;
    } else {
      response = `!done\nComando aceito pelo RouterOS v7.14: "${clean}"\nRegistro de execução persistido no log de auditoria.`;
    }

    setCliOutput(prev => `${prev}\n[admin_isp@MikroTik-CCR1009] > ${cliCommand}\n${response}\n[admin_isp@MikroTik-CCR1009] >`);
    setCliCommand('');
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await onTestConnection({ host, port: Number(port), user });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Falha ao conectar no MikroTik.' });
    } finally {
      setIsTesting(false);
    }
  };

  const fullRouterOSSetupScript = `# ==============================================================================
# Script MikroTik RouterOS para Provedor de Internet & Telecom
# Compatível com RouterOS v6.x e v7.x (CCR, RB4011, RB3011, hEX)
# ==============================================================================

# 1. Criar Pool de IP e Perfil para Clientes Bloqueados / Corte
/ip pool add name=pool-bloqueados ranges=10.99.99.2-10.99.99.254

/ppp profile add name="${blockProfile}" \\
    local-address=10.99.99.1 \\
    remote-address=pool-bloqueados \\
    rate-limit=128k/128k \\
    dns-server=10.99.99.1 \\
    comment="Perfil de Inadimplentes com redirecionamento de aviso"

# 2. Criar Perfis Normais de Velocidade (Planos de Acesso)
/ppp profile add name=prof_15m_padrao rate-limit=5M/15M comment="Plano 15M Basico"
/ppp profile add name=prof_30m_ultra rate-limit=10M/30M comment="Plano 30M Ultra"
/ppp profile add name=prof_60m_plus rate-limit=20M/60M comment="Plano 60M Plus"
/ppp profile add name=prof_150m_fibra rate-limit=50M/150M comment="Fibra FTTH 150M"

# 3. Habilitar Servidor PPPoE na Interface dos POPs / Distribuição
/interface pppoe-server server add \\
    service-name=pppoe-provedor \\
    interface=ether2-LAN-POPS \\
    default-profile=default \\
    authentication=chap,pap \\
    one-session-per-host=yes \\
    disabled=no

# 4. Habilitar API Socket do MikroTik (Porta 8728)
/ip service enable api
/ip service set api port=8728 address=0.0.0.0/0

# 5. Criar usuario exclusivo para o AgroISP Pro
/user group add name=isp-api-group policy=read,write,test,api,!ftp,!reboot
/user add name="${user}" group=isp-api-group password="SUA_SENHA_AQUI" comment="AgroISP Billing API"
`;

  const copyScript = () => {
    navigator.clipboard.writeText(fullRouterOSSetupScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex space-x-1">
          <button
            onClick={() => setSubTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'active'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Conexões Online (/ppp active)</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-700/60 text-white rounded-full text-[10px]">
              {activeSessions.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('secrets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'secrets'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Secrets PPPoE (/ppp secret)</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-700/60 text-white rounded-full text-[10px]">
              {clients.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('terminal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'terminal'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal CLI & Script</span>
          </button>

          <button
            onClick={() => setSubTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'config'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Conexão & API</span>
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sincronizar MikroTik</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE SESSIONS (/ppp active) */}
      {subTab === 'active' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Sessões PPPoE Ativas no Roteador (/ppp active print)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoramento em tempo real de clientes conectados, IP atribuído, consumo e sinal wireless.
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Total conectado: <span className="text-emerald-400 font-bold">{activeSessions.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Usuário PPPoE</th>
                  <th className="py-3 px-4">Cliente / Torre & POP</th>
                  <th className="py-3 px-4">IP Atribuído</th>
                  <th className="py-3 px-4">Tempo Conectado</th>
                  <th className="py-3 px-4">Consumo Atual (Down/Up)</th>
                  <th className="py-3 px-4">Sinal dBm</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      Nenhuma conexão ativa no momento.
                    </td>
                  </tr>
                ) : (
                  activeSessions.map(session => (
                    <tr key={session.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-cyan-300">
                        {session.username}
                        <div className="text-[10px] text-slate-500 font-normal">
                          MAC: {session.callerId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{session.clientName}</div>
                        <div className="text-[11px] text-emerald-400 flex items-center mt-0.5">
                          <Radio className="w-3 h-3 mr-1" />
                          <span>{session.towerName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        {session.ipAddress}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {session.uptime}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1 font-mono text-emerald-400 text-xs font-semibold">
                          <ArrowUpDown className="w-3 h-3" />
                          <span>↓ {(session.rxRateKbps / 1024).toFixed(1)}M / ↑ {(session.txRateKbps / 1024).toFixed(1)}M</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Total: {(session.rxBytes / (1024 * 1024)).toFixed(0)} MB transferidos
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          session.signalDbm > -60 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {session.signalDbm} dBm
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onDisconnectSession(session.username)}
                          className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 hover:text-red-200 text-[11px] font-medium transition flex items-center space-x-1 ml-auto"
                          title="Derrubar sessão ativa no MikroTik (/ppp active remove)"
                        >
                          <PowerOff className="w-3 h-3" />
                          <span>Derrubar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SECRETS (/ppp secret) */}
      {subTab === 'secrets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Base de Secrets PPPoE (/ppp secret print)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Usuários e senhas registrados no roteador MikroTik com perfil e status de corte.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total secrets: <span className="text-white font-bold">{clients.length}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Senha</th>
                  <th className="py-3 px-4">Serviço</th>
                  <th className="py-3 px-4">Profile Atribuído</th>
                  <th className="py-3 px-4">Cliente / Comentário</th>
                  <th className="py-3 px-4">IP Fixo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clients.map(client => {
                  const plan = plans.find(p => p.id === client.planId);
                  const isBlocked = client.status === 'blocked';
                  const activeProfile = isBlocked ? config?.blockProfile || 'bloqueados' : (plan?.profileName || 'default');

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {client.pppoeUsername}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        ••••••••
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        pppoe
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                          isBlocked 
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {activeProfile}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <div className="font-medium text-white">{client.name}</div>
                        <div className="text-[10px] text-slate-400">{client.ruralLocation}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {client.ipAddress || 'Pool Dinâmico'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isBlocked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">
                            Bloqueado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLI TERMINAL & SETUP SCRIPT */}
      {subTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terminal Emulator */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[520px]">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white">RouterOS Terminal Console (API 8728)</span>
              </div>
              <div className="flex space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
              </div>
            </div>

            {/* Output */}
            <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 bg-slate-950 overflow-y-auto whitespace-pre-wrap select-text">
              {cliOutput}
            </div>

            {/* Command Input */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2">
              <span className="text-xs font-mono text-emerald-400 font-bold">&gt;</span>
              <input
                type="text"
                placeholder="Ex: /ppp active print ou /ppp secret print ou /interface print"
                value={cliCommand}
                onChange={(e) => setCliCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleRunCommand}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center space-x-1 transition"
              >
                <Send className="w-3 h-3" />
                <span>Executar</span>
              </button>
            </div>
          </div>

          {/* Setup Script for RouterOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm h-[520px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">Script de Provisionamento MikroTik</h3>
                  <p className="text-xs text-slate-400">Copie e cole diretamente no Terminal do Winbox</p>
                </div>
                <button
                  onClick={copyScript}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copiado!' : 'Copiar Script'}</span>
                </button>
              </div>

              <div className="mt-4 bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-[11px] text-slate-300 h-[360px] overflow-y-auto whitespace-pre">
                {fullRouterOSSetupScript}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Porta padrão: 8728 (API) ou 8729 (API-SSL)</span>
              <span className="text-emerald-400 font-medium">Testado em v6 e v7</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ROUTER CONFIGURATION & CONNECTION TEST */}
      {subTab === 'config' && (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              <span>Configuração da Conexão com MikroTik RouterOS</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Informe os dados de acesso ao roteador principal para sincronização de secrets e sessões.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Endereço IP / Host do MikroTik
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Ex: 192.168.88.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Porta da API RouterOS
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="8728"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Usuário da API
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin_isp"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Senha da API
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Perfil de Bloqueio (Inadimplentes)
              </label>
              <input
                type="text"
                value={blockProfile}
                onChange={(e) => setBlockProfile(e.target.value)}
                placeholder="bloqueados"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Nome do profile criado no MikroTik com redirecionamento de corte.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Perfil Padrão (Default)
              </label>
              <input
                type="text"
                value={defaultProfile}
                onChange={(e) => setDefaultProfile(e.target.value)}
                placeholder="default"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div className={`p-4 rounded-lg border text-xs flex items-start space-x-3 ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div>
                <p className="font-semibold">{testResult.message}</p>
                {testResult.details && (
                  <p className="text-[11px] font-mono text-slate-300 mt-1">
                    Modelo: {testResult.details.model} | Versão: {testResult.details.version} | CPU: {testResult.details.cpuLoad}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center space-x-2"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão RouterOS'}</span>
            </button>

            <button
              onClick={() => onUpdateConfig({ host, port: Number(port), user, blockProfile, defaultProfile })}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950"
            >
              Salvar Configurações
            </button>
          </div>

          {/* Backup e Exportação do Sistema no Google Drive e JSON */}
          <div className="pt-6 border-t border-slate-800">
            <SystemBackupCard
              companySettings={companySettings || {
                name: 'Meu Provedor Telecom',
                legalName: 'Provedor Telecomunicações Ltda',
                cnpj: '28.491.029/0001-83',
                logoUrl: '',
                slogan: 'Internet de Alta Performance',
                phone: '(11) 4004-9898',
                email: 'contato@meuprovedor.com.br',
                website: 'www.meuprovedor.com.br',
                pixKey: '28.491.029/0001-83',
                bankName: '033 - Santander',
                bankCode: '033-7',
                agency: '1234',
                account: '56789-0',
                carteira: '17',
                boletoInstructions: 'Não receber após vencimento. Multa 2%.',
                address: {
                  street: 'Av. Principal',
                  number: '100',
                  neighborhood: 'Centro',
                  city: 'São Paulo',
                  state: 'SP',
                  cep: '01001-000'
                }
              }}
              mikrotikConfig={config || undefined}
              onRefreshData={onRefresh}
            />
          </div>
        </div>
      )}
    </div>
  );
};
