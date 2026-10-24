import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  Activity, 
  PowerOff, 
  RefreshCw, 
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
  Zap,
  Plus,
  Trash2,
  Globe,
  Shield,
  MapPin,
  Edit3,
  Archive,
  Download,
  Eye,
  FileText,
  FolderDown,
  Clock,
  Sparkles
} from 'lucide-react';
import { MikrotikConfig, ActiveSession, Client, Plan, CompanySettings, MikrotikServer, RbBackup, RbBackupConfig } from '../types/index.js';
import { SystemBackupCard } from './SystemBackupCard.js';
import { RbBackupsView } from './RbBackupsView.js';
import { MikrotikScriptWizard } from './MikrotikScriptWizard.js';

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
  const [subTab, setSubTab] = useState<'servers' | 'wizard' | 'backups' | 'active' | 'secrets'>('servers');

  const effectiveServers: MikrotikServer[] = servers && servers.length > 0 ? servers : [
    {
      id: 'srv-1',
      name: 'Servidor Sede (RB Principal 192.168.1.120)',
      host: config?.host || '192.168.1.120',
      port: config?.port || 8728,
      user: config?.user || 'admin_isp',
      interfaceName: 'bridge-local',
      defaultProfile: config?.defaultProfile || 'prof_15m_padrao',
      blockProfile: config?.blockProfile || 'prof_corte_bloqueado',
      location: 'Sede Central (Porta 01 - WAN / Restante na Bridge: 192.168.1.120)',
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
  const [newSrvInterface, setNewSrvInterface] = useState('bridge-local');
  const [editingServer, setEditingServer] = useState<MikrotikServer | null>(null);
  const [serverTestResults, setServerTestResults] = useState<Record<string, any>>({});
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [importingServerId, setImportingServerId] = useState<string | null>(null);
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

  const handleImportSecrets = async (srv: MikrotikServer) => {
    try {
      setImportingServerId(srv.id);
      const res = await fetch(`/api/mikrotik/servers/${srv.id}/import-secrets`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(data.message || 'Secrets importados com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao importar secrets da RB');
    } finally {
      setImportingServerId(null);
    }
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;

    try {
      setIsSavingServer(true);
      const res = await fetch(`/api/mikrotik/servers/${editingServer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingServer)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Auto-retest with updated credentials
      const testRes = await fetch(`/api/mikrotik/servers/${editingServer.id}/test`, { method: 'POST' });
      const testData = await testRes.json();
      setServerTestResults(prev => ({ ...prev, [editingServer.id]: testData }));

      setEditingServer(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar servidor MikroTik');
    } finally {
      setIsSavingServer(false);
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
    if (effectiveServers.length <= 1) {
      alert('Não é possível excluir o único servidor MikroTik cadastrado. O provedor precisa de pelo menos 1 concentrador. Se desejar alterar as configurações dele, use o botão "Editar".');
      return;
    }
    const srv = effectiveServers.find(s => s.id === id);
    if (!confirm(`Deseja realmente excluir o servidor '${srv?.name || id}' (${srv?.host})?\n\nOs clientes cadastrados continuarão salvos no sistema, mas você precisará associá-los a outro concentrador.`)) return;
    try {
      const res = await fetch(`/api/mikrotik/servers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (editingServer && editingServer.id === id) {
        setEditingServer(null);
      }
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
            onClick={() => setSubTab('wizard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'wizard'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gerador de Script RB</span>
            <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[9px] font-bold">
              Wizard
            </span>
          </button>

          <button
            onClick={() => setSubTab('backups')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              subTab === 'backups'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Backups & Snapshots (.rsc)</span>
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
                    <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      result.success 
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                        : 'bg-red-950/50 border-red-500/40 text-red-200'
                    }`}>
                      <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                        {result.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                        <span>{result.success ? 'Conexão Bem-Sucedida!' : 'Falha na Autenticação (Usuário ou Senha)'}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{result.message}</p>
                      
                      {result.message?.includes('invalid user name or password') && (
                        <div className="p-3 bg-slate-900/90 border border-red-500/30 rounded-xl space-y-2 text-[11px] text-slate-300">
                          <p className="font-semibold text-amber-300 flex items-center space-x-1.5">
                            <span>🔑 Como resolver (A porta 8728 respondeu, mas a senha/usuário falhou):</span>
                          </p>
                          <div className="space-y-1 text-slate-400">
                            <p>
                              <strong>Opção 1 (Mais fácil):</strong> Clique no botão <strong>"Editar Dados / Senha"</strong> logo abaixo e coloque o usuário e a senha exatos que você usa no Winbox (ex: se na RB você usa o usuário <code>admin</code> e sua senha, basta alterar aqui!).
                            </p>
                            <p>
                              <strong>Opção 2:</strong> Ou crie/atualize o usuário <code>{srv.user}</code> no New Terminal do Winbox:
                            </p>
                          </div>
                          <div className="p-2 bg-slate-950 rounded-lg font-mono text-[10px] text-emerald-300 select-all break-all border border-slate-800">
                            /user add name="{srv.user}" password="SUA_SENHA_AQUI" group=full comment="AgroISP API"
                          </div>
                        </div>
                      )}

                      {result.details && (
                        <div className="mt-1 text-[10px] font-mono opacity-80">
                          Modelo: {result.details.model} | Versão: {result.details.version} | Uptime: {result.details.uptime}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingServer({ ...srv })}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Editar Servidor</span>
                      </button>

                      <button
                        type="button"
                        disabled={isTestingThis}
                        onClick={() => handleTestServer(srv)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingThis ? 'animate-spin' : ''}`} />
                        <span>{isTestingThis ? 'Testando API...' : 'Testar Comunicação (API)'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={importingServerId === srv.id}
                        onClick={() => handleImportSecrets(srv)}
                        className="px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                        title="Importar todos os logins e senhas PPPoE já gravados nesta RB para o banco de dados do sistema"
                      >
                        <Zap className={`w-3.5 h-3.5 ${importingServerId === srv.id ? 'animate-bounce text-amber-400' : 'text-cyan-400'}`} />
                        <span>{importingServerId === srv.id ? 'Importando...' : 'Puxar Secrets da RB'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubTab('backups')}
                        className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                        title="Visualizar e gerar snapshots de backup das configurações (.rsc) desta RB"
                      >
                        <Archive className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Backups (.rsc)</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!srv.isDefault && (
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/mikrotik/servers/${srv.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isDefault: true })
                            });
                            onRefresh();
                          }}
                          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-xs font-medium border border-slate-700 transition"
                          title="Tornar esta RB o concentrador padrão"
                        >
                          Tornar Padrão
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteServer(srv.id)}
                        className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                        title="Excluir este concentrador da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
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

          {/* Modal to Edit Server */}
          {editingServer && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        Editar Dados & Senha MikroTik
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingServer.name} ({editingServer.host})
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setEditingServer(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleUpdateServer} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nome do Servidor / RB</label>
                    <input
                      type="text"
                      required
                      value={editingServer.name}
                      onChange={e => setEditingServer({ ...editingServer, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">IP / Host</label>
                      <input
                        type="text"
                        required
                        value={editingServer.host}
                        onChange={e => setEditingServer({ ...editingServer, host: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Porta API (Padrão 8728)</label>
                      <input
                        type="number"
                        value={editingServer.port}
                        onChange={e => setEditingServer({ ...editingServer, port: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Usuário API (RouterOS)
                      </label>
                      <input
                        type="text"
                        required
                        value={editingServer.user}
                        onChange={e => setEditingServer({ ...editingServer, user: e.target.value })}
                        placeholder="Ex: admin ou admin_isp"
                        className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Nome do usuário no Winbox</span>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Senha API (RouterOS)
                      </label>
                      <input
                        type="text"
                        value={editingServer.password || ''}
                        onChange={e => setEditingServer({ ...editingServer, password: e.target.value })}
                        placeholder="Deixe vazio se não tiver senha"
                        className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Senha exata da sua RB</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Localidade / POP</label>
                      <input
                        type="text"
                        value={editingServer.location}
                        onChange={e => setEditingServer({ ...editingServer, location: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Interface Saída PPPoE</label>
                      <input
                        type="text"
                        value={editingServer.interfaceName}
                        onChange={e => setEditingServer({ ...editingServer, interfaceName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Concentrador Padrão Toggle */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingServer.isDefault)}
                        onChange={e => setEditingServer({ ...editingServer, isDefault: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-medium">Definir como Concentrador MikroTik Padrão da Rede</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleDeleteServer(editingServer.id)}
                      className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-white rounded-lg transition font-bold flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Excluir Servidor</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingServer(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingServer}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isSavingServer ? 'Salvando...' : 'Salvar Servidor'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB WIZARD: GERADOR DE SCRIPT MIKROTIK PASSO A PASSO */}
      {subTab === 'wizard' && (
        <MikrotikScriptWizard
          plans={plans}
          companySettings={companySettings}
          onScriptSaved={onRefresh}
        />
      )}

      {/* TAB: RB CONFIGURATION BACKUPS (.rsc SNAPSHOTS) & BACKUP DO SISTEMA */}
      {subTab === 'backups' && (
        <div className="space-y-6">
          <RbBackupsView 
            servers={effectiveServers} 
            onRefreshParent={onRefresh} 
          />

          {/* Backup e Exportação Geral do Sistema (Google Drive e Arquivo JSON) */}
          <div className="pt-2">
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



    </div>
  );
};
