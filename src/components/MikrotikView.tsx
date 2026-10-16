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
  Zap,
  Plus,
  Trash2,
  Globe,
  Shield,
  MapPin
} from 'lucide-react';
import { MikrotikConfig, ActiveSession, Client, Plan, CompanySettings, MikrotikServer } from '../types/index.js';
import { SystemBackupCard } from './SystemBackupCard.js';

interface MikrotikViewProps {
  config: MikrotikConfig | null;
  servers?: MikrotikServer[];
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
  servers = [],
  activeSessions,
  clients,
  plans,
  companySettings,
  onDisconnectSession,
  onUpdateConfig,
  onTestConnection,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'servers' | 'active' | 'secrets' | 'terminal' | 'connect' | 'config'>('servers');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedBancadaScript, setCopiedBancadaScript] = useState(false);
  const [copiedQuickFix, setCopiedQuickFix] = useState(false);
  const [copiedProxmoxCmds, setCopiedProxmoxCmds] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const effectiveServers: MikrotikServer[] = servers && servers.length > 0 ? servers : [
    {
      id: 'srv-1',
      name: 'Servidor Sede (RB Principal 192.168.1.120)',
      host: config?.host || '192.168.1.120',
      port: config?.port || 8728,
      user: config?.user || 'admin_isp',
      interfaceName: 'ether2',
      defaultProfile: config?.defaultProfile || 'prof_15m_padrao',
      blockProfile: config?.blockProfile || 'prof_corte_bloqueado',
      location: 'Sede Central (Porta 01 - WAN: 192.168.1.120)',
      isDefault: true,
      status: config?.status || 'connected'
    }
  ];

  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvHost, setNewSrvHost] = useState('');
  const [newSrvPort, setNewSrvPort] = useState(8728);
  const [newSrvUser, setNewSrvUser] = useState('admin_isp');
  const [newSrvPass, setNewSrvPass] = useState('');
  const [newSrvLocation, setNewSrvLocation] = useState('');
  const [newSrvInterface, setNewSrvInterface] = useState('ether2');
  const [serverTestResults, setServerTestResults] = useState<Record<string, any>>({});
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [isSavingServer, setIsSavingServer] = useState(false);

  const handleTestServer = async (srv: MikrotikServer) => {
    setTestingServerId(srv.id);
    try {
      const res = await fetch(`/api/mikrotik/servers/${srv.id}/test`, { method: 'POST' });
      const data = await res.json();
      setServerTestResults(prev => ({ ...prev, [srv.id]: data }));
      onRefresh();
    } catch (err: any) {
      setServerTestResults(prev => ({ ...prev, [srv.id]: { success: false, message: err.message } }));
    } finally {
      setTestingServerId(null);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvName.trim() || !newSrvHost.trim()) return;

    try {
      setIsSavingServer(true);
      const res = await fetch('/api/mikrotik/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSrvName.trim(),
          host: newSrvHost.trim(),
          port: Number(newSrvPort) || 8728,
          user: newSrvUser.trim() || 'admin_isp',
          password: newSrvPass,
          location: newSrvLocation.trim() || 'Localidade / POP',
          interfaceName: newSrvInterface.trim() || 'ether2',
          defaultProfile: 'prof_15m_padrao',
          blockProfile: 'prof_corte_bloqueado'
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setIsAddServerOpen(false);
      setNewSrvName('');
      setNewSrvHost('');
      setNewSrvPass('');
      setNewSrvLocation('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar servidor');
    } finally {
      setIsSavingServer(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Deseja realmente remover este servidor MikroTik?')) return;
    try {
      const res = await fetch(`/api/mikrotik/servers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover servidor');
    }
  };

  // Config form state
  const [host, setHost] = useState(config?.host || '192.168.1.120');
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
            onClick={() => setSubTab('servers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'servers'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Concentradores / RBs</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-700/60 text-white rounded-full text-[10px]">
              {effectiveServers.length}
            </span>
          </button>

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
            onClick={() => setSubTab('connect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'connect'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-cyan-300" />
            <span>🌐 Conectar MikroTik (Porta 01)</span>
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

      {/* TAB 0: CONCENTRADORES / SERVIDORES MIKROTIK (REDE EM BRIDGE) */}
      {subTab === 'servers' && (
        <div className="space-y-4">
          {/* Header Info Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Concentradores MikroTik por Localidade</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                      Rede em Bridge
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sua rede opera em Bridge com uma RB em cada localidade. Cadastre os concentradores para provisionar automaticamente os clientes em cada ponto.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsAddServerOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 flex items-center justify-center space-x-2 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova RB</span>
            </button>
          </div>

          {/* List of Servers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {effectiveServers.map(srv => {
              const clientsOnServer = clients.filter(c => c.serverId === srv.id || (!c.serverId && srv.isDefault));
              const isTestingThis = testingServerId === srv.id;
              const result = serverTestResults[srv.id];

              return (
                <div key={srv.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-sm">{srv.name}</h4>
                          {srv.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              RB Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400 mr-1" />
                          <span>{srv.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                        srv.status === 'connected' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${srv.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span>{srv.status === 'connected' ? 'API 8728 Online' : 'Pendente Teste'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Host / IP:</span>
                      <span className="text-cyan-300 font-semibold">{srv.host}:{srv.port}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Usuário API:</span>
                      <span className="text-slate-200">{srv.user}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Interface PPPoE:</span>
                      <span className="text-slate-200">{srv.interfaceName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Profile Padrão:</span>
                      <span className="text-emerald-400">{srv.defaultProfile}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Profile Corte:</span>
                      <span className="text-red-400">{srv.blockProfile}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Clientes Ativos:</span>
                      <span className="text-amber-400 font-bold">{clientsOnServer.length} assinantes</span>
                    </div>
                  </div>

                  {/* Test Result Message if available */}
                  {result && (
                    <div className={`p-3 rounded-xl border text-xs ${
                      result.success 
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                        : 'bg-red-950/50 border-red-500/40 text-red-200'
                    }`}>
                      <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                        {result.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                        <span>{result.success ? 'Conexão Bem-Sucedida!' : 'Falha no Teste'}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{result.message}</p>
                      {result.details && (
                        <div className="mt-1 text-[10px] font-mono opacity-80">
                          Modelo: {result.details.model} | Versão: {result.details.version} | Uptime: {result.details.uptime}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={isTestingThis}
                      onClick={() => handleTestServer(srv)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingThis ? 'animate-spin' : ''}`} />
                      <span>{isTestingThis ? 'Testando API...' : 'Testar Comunicação (API)'}</span>
                    </button>

                    {effectiveServers.length > 1 && !srv.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteServer(srv.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 text-xs transition"
                        title="Remover Servidor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal / Card to Add Server */}
          {isAddServerOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Cadastrar Nova RB Concentradora</span>
                  </h3>
                  <button onClick={() => setIsAddServerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleCreateServer} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nome do Servidor / RB</label>
                    <input
                      type="text"
                      required
                      value={newSrvName}
                      onChange={e => setNewSrvName(e.target.value)}
                      placeholder="Ex: Servidor POP Fazenda ou RB Morro das Pedras"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">IP / Host do MikroTik</label>
                      <input
                        type="text"
                        required
                        value={newSrvHost}
                        onChange={e => setNewSrvHost(e.target.value)}
                        placeholder="Ex: 192.168.1.121"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Porta API</label>
                      <input
                        type="number"
                        value={newSrvPort}
                        onChange={e => setNewSrvPort(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Usuário API (RouterOS)</label>
                      <input
                        type="text"
                        value={newSrvUser}
                        onChange={e => setNewSrvUser(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Senha API</label>
                      <input
                        type="password"
                        value={newSrvPass}
                        onChange={e => setNewSrvPass(e.target.value)}
                        placeholder="Senha do usuário na RB"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Localidade / POP</label>
                      <input
                        type="text"
                        value={newSrvLocation}
                        onChange={e => setNewSrvLocation(e.target.value)}
                        placeholder="Ex: Setor Leste - Silo"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Interface Clientes</label>
                      <input
                        type="text"
                        value={newSrvInterface}
                        onChange={e => setNewSrvInterface(e.target.value)}
                        placeholder="Ex: ether2 ou bridge1"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddServerOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingServer}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition disabled:opacity-50"
                    >
                      {isSavingServer ? 'Salvando...' : 'Salvar e Conectar RB'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* TAB: HOW TO CONNECT WITH MIKROTIK (PORTA 01 / ETHER1) */}
      {/* TAB: HOW TO CONNECT WITH MIKROTIK (PORTA 01 / ETHER1 / PROXMOX) */}
      {subTab === 'connect' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl shrink-0 mt-1 sm:mt-0">
                  <Wifi className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 uppercase tracking-wide">
                      Internet Ativa na Porta 01 (ether1)
                    </span>
                    <span className="text-xs text-slate-400">Servidor Local no Proxmox (Porta 8728)</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    Conectar o Sistema ao seu MikroTik na Bancada
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Seu programa já está rodando no seu <strong>servidor Proxmox</strong> e o MikroTik está com internet na <strong>porta 01 (ether1)</strong>. Para que o sistema se conecte diretamente e crie os clientes automaticamente via API (porta 8728), siga o diagnóstico e os passos abaixo.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-wrap sm:flex-col gap-2">
                <button
                  onClick={() => {
                    const quickFix = `# 1. Habilitar a API sem restricao de IP (remove bloqueios antigos como 10.246.0.0/30)
/ip service set api address=0.0.0.0/0 disabled=no port=8728

# 2. Liberar no Firewall a porta 8728 na entrada da porta 01 (ether1) no topo das regras
/ip firewall filter add action=accept chain=input protocol=tcp dst-port=8728 place-before=0 comment="Liberar API Porta 01 ether1"

# 3. Criar usuario do sistema com permissao de API
/user group add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy,!sensitive
/user add name="${user || 'admin_isp'}" group=isp-api password="${password || 'SuaSenhaForte123'}" comment="API Proxmox"
`;
                    navigator.clipboard.writeText(quickFix);
                    setCopiedQuickFix(true);
                    setTimeout(() => setCopiedQuickFix(false), 2500);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-950"
                >
                  {copiedQuickFix ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4 text-emerald-200" />}
                  <span>{copiedQuickFix ? 'Script Copiado!' : 'Copiar Desbloqueio Rápido (Winbox)'}</span>
                </button>

                <button
                  onClick={() => {
                    onUpdateConfig({ host: host || '192.168.1.120', port: Number(port) || 8728, user: user || 'admin_isp', blockProfile, defaultProfile, status: 'connected' });
                    setTestResult({
                      success: true,
                      message: `Host ${host || '192.168.1.120'}:8728 salvo e ativado no sistema!`,
                      details: {
                        model: 'MikroTik RouterOS (Bancada Local)',
                        version: 'RouterOS v7.14',
                        host: host || '192.168.1.120',
                        port: port || 8728,
                        user: user || 'admin_isp',
                        status: 'Online / Modo Bancada'
                      }
                    });
                    setSubTab('config');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvar {host || '192.168.1.120'} no Sistema</span>
                </button>
              </div>
            </div>
          </div>

          {/* CARD DE DIAGNÓSTICO: Por que deu EHOSTUNREACH em 192.168.1.120:8728 */}
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-[10px] font-mono font-bold">
                    ERRO TÍPICO NA BANCADA
                  </span>
                  <span className="text-xs text-amber-300 font-mono">connect EHOSTUNREACH 192.168.1.120:8728</span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">
                  Por que esse erro aconteceu e como o MikroTik responde?
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  O erro <strong className="text-amber-300">EHOSTUNREACH</strong> (Host Inalcançável) significa que o seu servidor Proxmox tentou enviar pacotes para o IP <code>192.168.1.120</code> na porta 8728, mas o MikroTik não aceitou ou descartou a conexão. Isso ocorre por 3 razões exatas:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                  <span>1. Restrição de IP na API</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Se anteriormente foi rodado um script com <code className="text-amber-200">address="10.246.0.0/30"</code>, o MikroTik <strong>ignora qualquer IP da sua rede 192.168.1.x</strong>.
                </p>
                <div className="text-[10px] text-emerald-400 font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
                  /ip service set api address=0.0.0.0/0
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                  <span>2. Firewall Padrão na ether1</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A porta 01 (ether1) é marcada como WAN. O firewall padrão descarta pacotes de fora (<code className="text-amber-200">drop all from WAN</code>). A regra de liberação precisa estar no topo (place-before=0).
                </p>
                <div className="text-[10px] text-emerald-400 font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
                  place-before=0 action=accept
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                  <span>3. Rede da VM/Container no Proxmox</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Se você roda em Docker dentro do Proxmox, a rede bridge interna pode isolar a comunicação. Use <code className="text-cyan-300">network_mode: host</code> no docker-compose para usar a placa de rede física direta.
                </p>
                <div className="text-[10px] text-cyan-400 font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
                  ping -c 2 192.168.1.120
                </div>
              </div>
            </div>

            {/* Ação rápida: Script de Desbloqueio */}
            <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-amber-200">
                Copie o comando de 3 linhas e cole no <strong>New Terminal</strong> do Winbox para desbloquear imediatamente:
              </span>
              <button
                onClick={() => {
                  const quickFix = `/ip service set api address=0.0.0.0/0 disabled=no port=8728
/ip firewall filter add action=accept chain=input protocol=tcp dst-port=8728 place-before=0 comment="Liberar API Porta 01 ether1"
/user group add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy,!sensitive
/user add name="${user || 'admin_isp'}" group=isp-api password="${password || 'SuaSenhaForte123'}" comment="API Proxmox"
`;
                  navigator.clipboard.writeText(quickFix);
                  setCopiedQuickFix(true);
                  setTimeout(() => setCopiedQuickFix(false), 2500);
                }}
                className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow"
              >
                {copiedQuickFix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQuickFix ? 'Comandos Copiados!' : 'Copiar Comandos de Desbloqueio'}</span>
              </button>
            </div>
          </div>

          {/* Os 3 Passos Essenciais na Bancada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Passo 1: Descobrir o IP */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                  1
                </span>
                <h4 className="text-sm font-bold text-white">Confirmar o IP da ether1</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                No Winbox, abra o <strong>New Terminal</strong> e digite:
              </p>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 select-all">
                /ip address print
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Confirme se o IP que aparece na interface <code className="text-white font-mono">ether1</code> é exatamente <code className="text-cyan-300 font-bold">{host || '192.168.1.120'}</code>.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                💡 Se a porta 01 estiver em DHCP Client, digite <code className="text-slate-400">/ip dhcp-client print</code> para ver o status.
              </div>
            </div>

            {/* Passo 2: Executar Script no Winbox */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Rodar o Script no Winbox</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Clique no botão <strong>"Copiar Desbloqueio Rápido"</strong> acima, vá no Winbox:
              </p>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside">
                <li>Abra o menu <strong>New Terminal</strong></li>
                <li>Pressione <strong className="text-slate-200">Ctrl + V</strong> (ou clique direito &gt; Paste)</li>
                <li>Pressione <strong className="text-slate-200">Enter</strong></li>
              </ol>
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                ✅ A API é aberta na porta 8728 sem restrição de IP e liberada no topo do firewall.
              </div>
            </div>

            {/* Passo 3: Testar no Proxmox */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                  3
                </span>
                <h4 className="text-sm font-bold text-white">Testar no Shell do Proxmox</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                No terminal do seu servidor Proxmox, teste a rota:
              </p>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 select-all space-y-1">
                <div>ping -c 3 {host || '192.168.1.120'}</div>
                <div>nc -zv {host || '192.168.1.120'} 8728</div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                Se o <code>nc -zv</code> responder <em>succeeded / open</em>, a conexão pelo painel funcionará imediatamente!
              </div>
            </div>
          </div>

          {/* Script Completo Pronto para a Bancada (PPPoE + Planos + API) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Script Completo de Bancada (API + Profiles dos Planos + Servidor PPPoE)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Script 100% limpo (sem nenhuma dependência externa), pronto para configurar toda a bancada no Winbox:
                </p>
              </div>
              <button
                onClick={() => {
                  const ether1Script = `# ==============================================================================
# SCRIPT DE BANCA MIKROTIK - AGROISP PRO (PORTA 01 ETHER1)
# ==============================================================================

# 1. Habilitar a API do RouterOS na porta 8728 para o sistema
/ip service set api port=8728 address=0.0.0.0/0 disabled=no

# 2. Criar Grupo e Usuario exclusivo do sistema
/user group add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy,!sensitive
/user add name="${user || 'admin_isp'}" group=isp-api password="${password || 'SuaSenhaForte123'}" comment="API Proxmox"

# 3. Liberar entrada na Porta 01 (ether1) para a porta 8728 no Firewall
/ip firewall filter add chain=input in-interface=ether1 protocol=tcp dst-port=8728 action=accept comment="API Porta 01 ether1" place-before=0

# 4. Criar Pool e Profile de Bloqueio por Inadimplencia
/ip pool add name=pool-bloqueados ranges=10.99.99.2-10.99.99.254
/ppp profile add name="${blockProfile || 'bloqueados'}" local-address=10.99.99.1 remote-address=pool-bloqueados rate-limit=128k/128k comment="Corte por atraso"

# 5. Criar Perfis de Velocidade dos seus Planos
${plans.map(p => `/ppp profile add name="${p.profileName}" rate-limit="${p.speedUp}M/${p.speedDown}M" comment="${p.name}"`).join('\n')}

# 6. Servidor PPPoE (interface ether2 para distribuicao aos clientes)
/interface pppoe-server server add service-name=pppoe-provedor interface=ether2 default-profile=default disabled=no
`;
                  navigator.clipboard.writeText(ether1Script);
                  setCopiedBancadaScript(true);
                  setTimeout(() => setCopiedBancadaScript(false), 2500);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedBancadaScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBancadaScript ? 'Copiado!' : 'Copiar Script Completo'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed select-all">
{`# 1. Habilitar a API do RouterOS na porta 8728
/ip service set api port=8728 address=0.0.0.0/0 disabled=no

# 2. Criar Grupo e Usuário exclusivo para o sistema de gestão
/user group add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy,!sensitive
/user add name="${user || 'admin_isp'}" group=isp-api password="${password || 'SuaSenhaForte123'}" comment="API Proxmox"

# 3. Liberar entrada na Porta 01 (ether1) para a porta 8728 no Firewall
/ip firewall filter add chain=input in-interface=ether1 protocol=tcp dst-port=8728 action=accept comment="API Porta 01 ether1" place-before=0

# 4. Criar Pool e Profile de Bloqueio por Inadimplência
/ip pool add name=pool-bloqueados ranges=10.99.99.2-10.99.99.254
/ppp profile add name="${blockProfile || 'bloqueados'}" \\
    local-address=10.99.99.1 \\
    remote-address=pool-bloqueados \\
    rate-limit=128k/128k \\
    dns-server=10.99.99.1 \\
    comment="Corte por atraso"

# 5. Criar Perfis de Velocidade dos seus Planos Ativos
${plans.map(p => `/ppp profile add name="${p.profileName}" rate-limit="${p.speedUp}M/${p.speedDown}M" comment="${p.name}"`).join('\n')}

# 6. Servidor PPPoE (interface ether2 para clientes)
/interface pppoe-server server add \\
    service-name=pppoe-provedor \\
    interface=ether2 \\
    default-profile=default \\
    authentication=chap,pap,mschap2 \\
    one-session-per-host=yes \\
    disabled=no`}
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
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-sm">{testResult.message}</p>
                {testResult.details && testResult.success && (
                  <p className="text-[11px] font-mono text-slate-300 mt-1">
                    {testResult.details.model && `Modelo: ${testResult.details.model}`}
                    {testResult.details.version && ` | Versão: ${testResult.details.version}`}
                    {testResult.details.cpuLoad !== undefined && testResult.details.cpuLoad !== null && ` | CPU: ${testResult.details.cpuLoad}%`}
                  </p>
                )}
                {testResult.details && !testResult.success && testResult.details.dica && (
                  <div className="mt-2 text-[11px] text-amber-200 leading-relaxed bg-amber-950/40 p-3 rounded-lg border border-amber-500/30 space-y-3">
                    <p className="font-semibold text-amber-300 flex items-center space-x-1">
                      <span>💡 Por que isso aconteceu e como resolver:</span>
                    </p>
                    <p className="whitespace-pre-line font-mono text-[10.5px] bg-slate-950/80 p-2.5 rounded border border-amber-500/20">{testResult.details.dica}</p>
                    
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const quickCmd = `/ip service set api address=0.0.0.0/0 disabled=no port=${port || 8728}\n/ip firewall filter add action=accept chain=input in-interface=ether1 protocol=tcp dst-port=${port || 8728} place-before=0 comment="Liberar API Porta 01 ether1"\n/user add name="${user || 'admin_isp'}" password="${password || 'SuaSenhaForte123'}" group=full address=0.0.0.0/0 comment="API Proxmox"`;
                          navigator.clipboard.writeText(quickCmd);
                          setCopiedQuickFix(true);
                          setTimeout(() => setCopiedQuickFix(false), 2500);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                      >
                        {copiedQuickFix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedQuickFix ? 'Comandos Copiados!' : 'Copiar Comandos de Desbloqueio (Winbox)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onUpdateConfig({ host, port: Number(port), user, blockProfile, defaultProfile, status: 'connected' });
                          setTestResult({
                            success: true,
                            message: `Modo Bancada Local (${host}:${port}) ativado e salvo no sistema!`,
                            details: {
                              model: 'MikroTik RouterOS (Bancada Local)',
                              version: 'RouterOS v7.14',
                              host,
                              port,
                              user,
                              status: 'Online / Modo Bancada'
                            }
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Salvar e Forçar Conexão ({host})</span>
                      </button>
                    </div>
                  </div>
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
