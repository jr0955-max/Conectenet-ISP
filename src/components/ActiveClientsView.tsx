import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Search, 
  RefreshCw, 
  Server, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Phone, 
  MessageCircle, 
  Trash2, 
  UserCheck, 
  UserX,
  Power,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  HardDrive,
  AlertCircle,
  Zap,
  Copy,
  Check,
  Terminal,
  Wrench
} from 'lucide-react';
import { MikrotikServer } from '../types/index.js';

interface ActiveConnection {
  id: string;
  serverId: string;
  serverName: string;
  serverHost: string;
  username: string;
  clientName: string;
  clientPhone?: string;
  planName?: string;
  ipAddress: string;
  callerId: string;
  uptime: string;
  uptimeSeconds: number;
  rxRateKbps: number;
  txRateKbps: number;
  rxBytes: number;
  txBytes: number;
  interfaceName: string;
  status: 'active' | 'blocked';
  ruralLocation?: string;
  towerName?: string;
}

interface OfflineClient {
  id: string;
  name: string;
  pppoeUsername: string;
  phone?: string;
  ruralLocation?: string;
  planName?: string;
  status: string;
  serverId?: string;
  serverName?: string;
  isAuthFailed?: boolean;
  lastSeen?: string;
}

interface ActiveClientsViewProps {
  servers: MikrotikServer[];
  onDisconnectSession: (username: string, serverId?: string) => Promise<void>;
  onToggleBlockClient?: (clientId: string) => Promise<void>;
}

export const ActiveClientsView: React.FC<ActiveClientsViewProps> = ({
  servers,
  onDisconnectSession,
  onToggleBlockClient
}) => {
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([]);
  const [offlineClients, setOfflineClients] = useState<OfflineClient[]>([]);
  const [serverStatuses, setServerStatuses] = useState<Record<string, { status: string; error?: string }>>({});
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [summary, setSummary] = useState({
    totalOnline: 0,
    totalOffline: 0,
    totalClients: 0,
    totalServers: 0,
    totalRxBps: 0,
    totalTxBps: 0
  });

  const [activeSubTab, setActiveSubTab] = useState<'online' | 'offline'>('online');
  const [selectedServerId, setSelectedServerId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingUser, setActionLoadingUser] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isOptimizeModalOpen, setIsOptimizeModalOpen] = useState(false);
  const [optimizeTab, setOptimizeTab] = useState<'fasttrack' | 'beesweb' | 'scripts'>('fasttrack');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeFeedback, setOptimizeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formatBps = (bps: number) => {
    if (bps >= 1000000000) return `${(bps / 1000000000).toFixed(2)} Gbps`;
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(1)} Mbps`;
    if (bps >= 1000) return `${(bps / 1000).toFixed(1)} kbps`;
    return `${bps || 0} bps`;
  };

  const handleCopyCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleOptimizeBandwidth = async () => {
    setIsOptimizing(true);
    setOptimizeFeedback(null);
    try {
      const res = await fetch('/api/mikrotik/optimize-bandwidth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServerId !== 'all' ? selectedServerId : undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao comunicar com a RB');
      setOptimizeFeedback({
        type: 'success',
        text: data.message || 'Controle de banda otimizado com sucesso! FastTrack desativado.'
      });
      await fetchConnections();
    } catch (err: any) {
      setOptimizeFeedback({
        type: 'error',
        text: err.message || 'Erro ao otimizar FastTrack na RB.'
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCleanupBeesweb = async () => {
    if (!window.confirm('Deseja executar a limpeza profunda do Beesweb nas RBs MikroTik conectadas? Isso removerá agendamentos, scripts e address-lists órfãs do sistema antigo.')) {
      return;
    }
    setIsOptimizing(true);
    setOptimizeFeedback(null);
    try {
      const res = await fetch('/api/mikrotik/cleanup-beesweb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServerId !== 'all' ? selectedServerId : undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao executar limpeza');
      setOptimizeFeedback({
        type: 'success',
        text: data.message || 'Limpeza do Beesweb concluída com sucesso!'
      });
      await fetchConnections();
    } catch (err: any) {
      setOptimizeFeedback({
        type: 'error',
        text: err.message || 'Erro ao executar limpeza do Beesweb.'
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/mikrotik/active-connections');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Erro na resposta da API`);
      }
      const data = await res.json();
      
      const newActives = data.activeConnections || [];
      const newOfflines = data.offlineClients || [];
      setActiveConnections(newActives);
      setOfflineClients(newOfflines);
      setLastSyncTime(new Date());

      if (data.serverStatuses) {
        setServerStatuses(data.serverStatuses);
      }

      if (data.summary) {
        setSummary(data.summary);
      } else {
        setSummary({
          totalOnline: newActives.length,
          totalOffline: newOfflines.length,
          totalClients: newActives.length + newOfflines.length,
          totalServers: servers.length,
          totalRxBps: 0,
          totalTxBps: 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar conexões ativas do MikroTik:', err);
      // Se a RB estiver desconectada ou a API cair, ZERA as conexões ativas imediatamente!
      setActiveConnections([]);
      setSummary(prev => ({
        ...prev,
        totalOnline: 0,
        totalRxBps: 0,
        totalTxBps: 0
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchConnections, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleKick = async (conn: ActiveConnection) => {
    if (!window.confirm(`Deseja desconectar a sessão ativa de '${conn.username}' (${conn.clientName}) da RB '${conn.serverName}'? O roteador do cliente irá reconectar automaticamente assumindo as novas velocidades de perfil.`)) {
      return;
    }

    try {
      setActionLoadingUser(conn.username);
      await onDisconnectSession(conn.username, conn.serverId);
      await fetchConnections();
    } finally {
      setActionLoadingUser(null);
    }
  };

  const formatRate = (kbps: number) => {
    if (kbps >= 1000) return `${(kbps / 1024).toFixed(1)} Mbps`;
    return `${kbps} kbps`;
  };

  const filteredOnline = activeConnections.filter(c => {
    const matchesServer = selectedServerId === 'all' || c.serverId === selectedServerId;
    const matchesSearch = 
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ipAddress.includes(searchTerm) ||
      c.callerId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesServer && matchesSearch;
  });

  const filteredOffline = offlineClients.filter(c => {
    const matchesServer = selectedServerId === 'all' || c.serverId === selectedServerId;
    const matchesSearch = 
      c.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesServer && matchesSearch;
  });

  const offlineServerList = servers.filter(s => {
    return s.status === 'error' || serverStatuses[s.id]?.status === 'error';
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <span>Clientes On/Off - Sessões PPP Ativas por RB</span>
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <p className="text-xs text-slate-400">
              Sincronização direta com a RB física via RouterOS API (/ppp active).
            </p>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sincronizado {lastSyncTime.toLocaleTimeString()}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Server Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as RBs ({servers.length})</option>
              {servers.map(s => {
                const isOff = s.status === 'error' || serverStatuses[s.id]?.status === 'error';
                return (
                  <option key={s.id} value={s.id}>
                    {isOff ? '🔴' : '🟢'} {s.name} ({s.host})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Auto Refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition ${
              autoRefresh 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{autoRefresh ? 'Auto 4s' : 'Pausado'}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={fetchConnections}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Sincronizar com a RB agora"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Offline RB Alert Notice */}
      {offlineServerList.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-red-300 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Atenção: Concentrador MikroTik Desconectado ou Inacessível na Rede</span>
          </div>
          <div className="text-xs text-red-200/90 space-y-1 pl-6">
            {offlineServerList.map(s => (
              <div key={s.id} className="flex items-start space-x-1.5">
                <span className="font-semibold text-red-300">• {s.name} ({s.host}:{s.port}):</span>
                <span>{serverStatuses[s.id]?.error || 'Sem resposta na porta 8728 (API RouterOS). Verifique energia, cabo de rede e se IP > Services > api está habilitada no Winbox.'}</span>
              </div>
            ))}
            <p className="text-[11px] text-red-300/80 pt-1">
              Como a RB está desconectada, nenhuma sessão PPPoE está online neste momento. Todas as contas foram posicionadas na aba "Offline Desconectados".
            </p>
          </div>
        </div>
      )}

      {/* FastTrack & Beesweb Optimization Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-indigo-500/30 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white">Controle de Velocidade na RB & Limpeza Beesweb</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                MikroTik RouterOS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fez teste de velocidade e não mudou? Desative o FastTrack na RB para liberar as Queues do plano e remova agendamentos do Beesweb.
            </p>
            {optimizeFeedback && (
              <p className={`text-xs mt-1 font-semibold ${optimizeFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                ● {optimizeFeedback.text}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOptimizeBandwidth}
            disabled={isOptimizing}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950/50"
            title="Desativa FastTrack na RB para forçar testes de velocidade a respeitarem o plano"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isOptimizing ? 'Aplicando...' : '⚡ Ativar Controle de Banda'}</span>
          </button>

          <button
            onClick={handleCleanupBeesweb}
            disabled={isOptimizing}
            className="px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold transition flex items-center space-x-1.5"
            title="Remove scripts e agendamentos antigos do Beesweb da RB"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Apagar Beesweb</span>
          </button>

          <button
            onClick={() => setIsOptimizeModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scripts do Winbox</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Clientes Online (PPP)</span>
            <span className="p-1 rounded bg-emerald-500/15 text-emerald-400">
              <Wifi className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400 tracking-tight">
            {summary.totalOnline}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sessões ativas no momento</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Clientes Offline</span>
            <span className="p-1 rounded bg-slate-800 text-slate-400">
              <WifiOff className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-300 tracking-tight">
            {summary.totalOffline}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sem sessão ativa na RB</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Consumo Download</span>
            <ArrowDownCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-cyan-400 tracking-tight">
            {formatBps(summary.totalRxBps)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tráfego total de clientes (↓)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Consumo Upload</span>
            <ArrowUpCircle className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-400 tracking-tight">
            {formatBps(summary.totalTxBps)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tráfego de envio clientes (↑)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">RBs Ativas</span>
            <Server className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400 tracking-tight">
            {servers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Concentradores monitorados</p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('online')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
              activeSubTab === 'online'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Online Ativos ({activeConnections.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('offline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
              activeSubTab === 'offline'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UserX className="w-4 h-4" />
            <span>Offline Desconectados ({offlineClients.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por login, nome, IP ou MAC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ONLINE CLIENTS TAB */}
      {activeSubTab === 'online' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Login</th>
                  <th className="py-3 px-4">RB Concentradora</th>
                  <th className="py-3 px-4">IP Remoto & MAC</th>
                  <th className="py-3 px-4">Tempo Conectado</th>
                  <th className="py-3 px-4 text-right">Velocidade Atual</th>
                  <th className="py-3 px-4 text-right">Interface</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOnline.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs">
                      <div className="max-w-md mx-auto space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                          <WifiOff className="w-5 h-5" />
                        </div>
                        <p className="text-slate-200 font-bold text-sm">Nenhum cliente conectado no momento (0 conexões ativas)</p>
                        <p className="text-slate-500 text-xs">
                          A leitura em /ppp active está vazia. Quando um cliente discar na RB com o usuário e a senha corretos do PPPoE, ele aparecerá aqui automaticamente com o IP remoto real atribuído, MAC e tempo de conexão.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOnline.map((conn) => (
                    <tr key={conn.id} className="hover:bg-slate-800/40 transition">
                      {/* Client / User */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <div>
                            <div className="font-bold text-white flex items-center space-x-1.5">
                              <span>{conn.clientName}</span>
                              {conn.clientPhone && (
                                <a
                                  href={`https://wa.me/55${conn.clientPhone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="font-mono text-cyan-400 text-[11px] font-semibold">
                              {conn.username}
                            </div>
                            {conn.planName && (
                              <div className="text-[10px] text-slate-400">
                                {conn.planName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Server RB */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
                          <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{conn.serverName}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          {conn.serverHost}
                        </div>
                      </td>

                      {/* IP and MAC */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-emerald-300 font-semibold">{conn.ipAddress}</div>
                        <div className="text-[10px] text-slate-500">{conn.callerId}</div>
                      </td>

                      {/* Uptime */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center space-x-1 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{conn.uptime}</span>
                        </div>
                      </td>

                      {/* Speed Rate */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="text-emerald-400 font-bold">
                          ↓ {formatRate(conn.rxRateKbps)}
                        </div>
                        <div className="text-sky-400 text-[11px]">
                          ↑ {formatRate(conn.txRateKbps)}
                        </div>
                      </td>

                      {/* Interface */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                        {conn.interfaceName}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleKick(conn)}
                          disabled={actionLoadingUser === conn.username}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition font-semibold text-xs flex items-center space-x-1 ml-auto"
                          title="Derrubar sessão ativa no MikroTik (/ppp active remove)"
                        >
                          <Power className={`w-3.5 h-3.5 ${actionLoadingUser === conn.username ? 'animate-spin' : ''}`} />
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

      {/* OFFLINE CLIENTS TAB */}
      {activeSubTab === 'offline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente / Usuário</th>
                  <th className="py-3 px-4">RB Vinculada</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Status & Diagnóstico</th>
                  <th className="py-3 px-4">Motivo / Leitura da RB</th>
                  <th className="py-3 px-4 text-right">WhatsApp Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOffline.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum cliente offline encontrado. Todos os clientes cadastrados possuem sessão PPP ativa!
                    </td>
                  </tr>
                ) : (
                  filteredOffline.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{client.name}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{client.pppoeUsername}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {client.serverName || 'Sede Principal'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {client.planName || 'Plano Padrão'}
                      </td>
                      <td className="py-3 px-4">
                        {client.isAuthFailed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Senha PPPoE Incorreta
                          </span>
                        ) : client.status === 'blocked' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            Bloqueado (Corte)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Offline (Desconectado)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono text-slate-400 max-w-xs">
                        <span className={client.isAuthFailed ? 'text-amber-400 font-semibold' : client.lastSeen?.startsWith('🔴') ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                          {client.lastSeen || 'Desconectado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {client.phone ? (
                          <a
                            href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-[11px] font-medium transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Mensagem</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Sem tel</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Otimização de Banda & Limpeza Beesweb */}
      {isOptimizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Diagnóstico de Velocidade & Limpeza do Beesweb
                  </h3>
                  <p className="text-xs text-slate-400">
                    Soluções diretas para a velocidade respeitar o plano e remoção de scripts antigos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOptimizeModalOpen(false);
                  setOptimizeFeedback(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-5 pt-2">
              <button
                onClick={() => setOptimizeTab('fasttrack')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                  optimizeTab === 'fasttrack'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1. Teste de Velocidade (FastTrack)</span>
              </button>
              <button
                onClick={() => setOptimizeTab('beesweb')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                  optimizeTab === 'beesweb'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>2. Apagar Beesweb da RB</span>
              </button>
              <button
                onClick={() => setOptimizeTab('scripts')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
                  optimizeTab === 'scripts'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>3. Comandos Prontos Winbox</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {optimizeFeedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold border ${
                  optimizeFeedback.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {optimizeFeedback.text}
                </div>
              )}

              {/* TAB 1: FASTTRACK & SPEED TEST */}
              {optimizeTab === 'fasttrack' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>Por que você fez o teste de velocidade e não mudou nada?</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      No MikroTik RouterOS, existem dois motivos clássicos para o Speedtest atingir a velocidade total da porta em vez de obedecer o plano:
                    </p>
                    <ol className="list-decimal pl-5 text-xs text-slate-300 space-y-1.5 pt-1">
                      <li>
                        <strong className="text-amber-300">Regra de FastTrack ativa no Firewall:</strong> O FastTrack acelera pacotes TCP/UDP no kernel desviando das Queues. Ao desativá-lo, o MikroTik passa a forçar o limite de velocidade configurado no plano.
                      </li>
                      <li>
                        <strong className="text-amber-300">Sessão do cliente já estava conectada:</strong> No RouterOS, as filas dinâmicas (<code className="text-cyan-300">&lt;pppoe-junior&gt;</code>) só são criadas no momento exato em que o cliente disca. Se você alterou o plano ou profile depois que ele conectou, basta clicar em <strong className="text-red-400">"Derrubar"</strong> na tabela para que ele reconecte já com a velocidade nova!
                      </li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleOptimizeBandwidth}
                      disabled={isOptimizing}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isOptimizing ? 'Aplicando na RB...' : '⚡ Desativar FastTrack na RB Agora (Via API)'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Ou cole manualmente no Terminal do Winbox:</span>
                      <button
                        onClick={() => handleCopyCmd('/ip firewall filter disable [find action=fasttrack-connection]', 'fasttrack')}
                        className="text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        {copiedKey === 'fasttrack' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'fasttrack' ? 'Copiado!' : 'Copiar comando'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto select-all">
                      /ip firewall filter disable [find action=fasttrack-connection]
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: BEESWEB CLEANUP */}
              {optimizeTab === 'beesweb' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Limpeza Completa do Antigo Beesweb na RB</span>
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      O novo sistema <strong>AgroISP Pro</strong> já não possui qualquer vestígio do Beesweb. No entanto, sua RB física pode ter ficado com:
                    </p>
                    <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1 pt-1">
                      <li>Scripts em <code className="text-slate-200">/system script</code> deixados pelo Beesweb</li>
                      <li>Agendamentos em <code className="text-slate-200">/system scheduler</code> que tentam sincronizar com servidores antigos</li>
                      <li>Address Lists de corte em <code className="text-slate-200">/ip firewall address-list</code></li>
                      <li>Comentários em secrets como <code className="text-slate-200">#beesweb</code></li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleCleanupBeesweb}
                      disabled={isOptimizing}
                      className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-red-950/50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{isOptimizing ? 'Executando limpeza...' : '🧹 Limpar Todos os Resquícios do Beesweb na RB (Via API)'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Comando para executar direto no Terminal do Winbox:</span>
                      <button
                        onClick={() => handleCopyCmd(
`/system scheduler remove [find name~"beesweb"]
/system script remove [find name~"beesweb"]
/ip firewall address-list remove [find list~"beesweb"]
/ppp profile remove [find name~"beesweb"]
/ppp profile remove [find comment~"beesweb"]
/ppp secret set [find comment~"beesweb"] comment="Migrado AgroISP"`,
                          'beesweb_full'
                        )}
                        className="text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        {copiedKey === 'beesweb_full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'beesweb_full' ? 'Copiado!' : 'Copiar script completo'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 overflow-x-auto select-all">
{`/system scheduler remove [find name~"beesweb"]
/system script remove [find name~"beesweb"]
/ip firewall address-list remove [find list~"beesweb"]
/ppp profile remove [find name~"beesweb"]
/ppp profile remove [find comment~"beesweb"]
/ppp secret set [find comment~"beesweb"] comment="Migrado AgroISP"`}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: ALL WINBOX CLI COMMANDS */}
              {optimizeTab === 'scripts' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">1. Desativar FastTrack (Ativar Queues de Velocidade):</span>
                      <button
                        onClick={() => handleCopyCmd('/ip firewall filter disable [find action=fasttrack-connection]', 'script_ft')}
                        className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        {copiedKey === 'script_ft' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'script_ft' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 select-all">
                      /ip firewall filter disable [find action=fasttrack-connection]
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400">2. Limpar rastros do Beesweb:</span>
                      <button
                        onClick={() => handleCopyCmd(
`/system scheduler remove [find name~"beesweb"]
/system script remove [find name~"beesweb"]
/ip firewall address-list remove [find list~"beesweb"]
/ppp profile remove [find name~"beesweb"]
/ppp profile remove [find comment~"beesweb"]`,
                          'script_bw'
                        )}
                        className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        {copiedKey === 'script_bw' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'script_bw' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-300 select-all">
{`/system scheduler remove [find name~"beesweb"]
/system script remove [find name~"beesweb"]
/ip firewall address-list remove [find list~"beesweb"]
/ppp profile remove [find name~"beesweb"]
/ppp profile remove [find comment~"beesweb"]`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">3. Derrubar cliente conectado para aplicar nova velocidade:</span>
                      <button
                        onClick={() => handleCopyCmd('/ppp active remove [find name="junior"]', 'script_kick')}
                        className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
                      >
                        {copiedKey === 'script_kick' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'script_kick' ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 select-all">
                      /ppp active remove [find name="junior"]
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950">
              <button
                onClick={() => {
                  setIsOptimizeModalOpen(false);
                  setOptimizeFeedback(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
