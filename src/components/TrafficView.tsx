import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw, 
  Server, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Zap, 
  Clock, 
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MikrotikServer } from '../types/index.js';

interface TrafficInterface {
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  comment?: string;
  rxBps: number;
  txBps: number;
  rxBytes: number;
  txBytes: number;
  rxPacketsSec: number;
  txPacketsSec: number;
}

interface RbTrafficData {
  serverId: string;
  serverName: string;
  host: string;
  port: number;
  location: string;
  status: string;
  cpuLoad: number;
  memoryFreeMb: number;
  uptime: string;
  totalRxBps: number;
  totalTxBps: number;
  interfaces: TrafficInterface[];
}

interface TrafficViewProps {
  servers: MikrotikServer[];
}

export const TrafficView: React.FC<TrafficViewProps> = ({ servers }) => {
  const [trafficData, setTrafficData] = useState<RbTrafficData[]>([]);
  const [totalRx, setTotalRx] = useState(0);
  const [totalTx, setTotalTx] = useState(0);
  const [selectedServerId, setSelectedServerId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchTraffic = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/mikrotik/traffic');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.servers) {
        setTrafficData(data.servers);
        setTotalRx(data.totalNetworkRxBps || 0);
        setTotalTx(data.totalNetworkTxBps || 0);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Erro ao buscar tráfego:', err);
      setTotalRx(0);
      setTotalTx(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraffic();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTraffic, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatBps = (bps: number) => {
    if (bps >= 1000000000) return `${(bps / 1000000000).toFixed(2)} Gbps`;
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    if (bps >= 1000) return `${(bps / 1000).toFixed(1)} kbps`;
    return `${bps} bps`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${bytes} B`;
  };

  const filteredServers = selectedServerId === 'all' 
    ? trafficData 
    : trafficData.filter(s => s.serverId === selectedServerId);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Tráfego em Tempo Real das RBs MikroTik</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento de banda, interfaces e throughput de todos os concentradores PPPoE e bridges cadastradas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Server filter */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as RBs ({trafficData.length})</option>
              {trafficData.map(s => (
                <option key={s.serverId} value={s.serverId}>
                  {s.serverName} ({s.host})
                </option>
              ))}
            </select>
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition ${
              autoRefresh 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={autoRefresh ? "Atualização automática a cada 4s ativa" : "Pausar atualização automática"}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{autoRefresh ? 'Auto 4s' : 'Pausado'}</span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchTraffic}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Atualizar tráfego agora"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Download Total (Rx)</span>
            <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400 tracking-tight">
            {formatBps(totalRx)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tráfego de entrada em todos os links</p>
          <div className="absolute -bottom-1 -right-1 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Upload Total (Tx)</span>
            <ArrowUpCircle className="w-5 h-5 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-400 tracking-tight">
            {formatBps(totalTx)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tráfego de saída / envio clientes</p>
          <div className="absolute -bottom-1 -right-1 w-20 h-20 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">RBs Cadastradas</span>
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white tracking-tight">
            {trafficData.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Concentradores ativos na rede</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Última Leitura</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-slate-200 tracking-tight">
            {lastUpdate.toLocaleTimeString()}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">● Conexão RouterOS API ativa</p>
        </div>
      </div>

      {/* RBs List & Interface Traffic Cards */}
      <div className="space-y-6">
        {filteredServers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
            Nenhum servidor MikroTik encontrado para o filtro selecionado.
          </div>
        ) : (
          filteredServers.map((server) => {
            const rxPercent = Math.min(Math.round((server.totalRxBps / 100000000) * 100), 100);
            const txPercent = Math.min(Math.round((server.totalTxBps / 100000000) * 100), 100);

            return (
              <div key={server.serverId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                {/* Server top header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-base font-bold text-white">{server.serverName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {server.host}:{server.port}
                      </span>
                      {server.status === 'connected' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ● Online
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          ● Desconectada / Offline
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Localidade: <span className="text-slate-200 font-semibold">{server.location}</span> | Uptime: <span className="font-mono text-slate-300">{server.uptime}</span> | CPU Load: <span className="font-mono text-amber-400">{server.cpuLoad}%</span>
                    </p>
                    {server.status !== 'connected' && (
                      <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>A RB não está respondendo no IP {server.host}:{server.port}. Ligue o equipamento ou verifique o cabo de rede.</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block font-semibold uppercase">Total Download</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        ↓ {formatBps(server.totalRxBps)}
                      </span>
                    </div>
                    <div className="w-px h-7 bg-slate-800" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block font-semibold uppercase">Total Upload</span>
                      <span className="text-xs font-mono font-bold text-sky-400">
                        ↑ {formatBps(server.totalTxBps)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interfaces Table */}
                <div className="overflow-x-auto">
                  {server.interfaces.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg">
                      {server.status === 'connected' 
                        ? 'Nenhuma interface com tráfego detectada nesta RB.'
                        : 'RB inacessível no momento. Conecte a RB na rede para ler as interfaces físicas reais.'}
                    </div>
                  ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Interface</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Taxa Rx (Download)</th>
                        <th className="py-2.5 px-3 text-right">Taxa Tx (Upload)</th>
                        <th className="py-2.5 px-3 text-right">Pacotes/s</th>
                        <th className="py-2.5 px-3 text-right">Consumo Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {server.interfaces.map((iface) => {
                        const isLink = iface.name.includes('WAN') || iface.name.includes('sfp');
                        return (
                          <tr key={iface.name} className="hover:bg-slate-800/30 transition">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${iface.running ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                <span className="font-bold text-white font-mono">{iface.name}</span>
                              </div>
                              {iface.comment && (
                                <span className="text-[10px] font-sans text-slate-400 block ml-4">
                                  {iface.comment}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-sans uppercase text-[10px]">
                              {iface.type}
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              {iface.running ? (
                                <span className="text-emerald-400 text-[11px] font-semibold">Running</span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Down</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                              ↓ {formatBps(iface.rxBps)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-sky-400 font-bold">
                              ↑ {formatBps(iface.txBps)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300">
                              {iface.rxPacketsSec + iface.txPacketsSec} pps
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                              ↓ {formatBytes(iface.rxBytes)} / ↑ {formatBytes(iface.txBytes)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
