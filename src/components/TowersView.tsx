import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  MapPin, 
  Plus, 
  Users, 
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Server,
  Wifi,
  Signal,
  Activity,
  RefreshCw,
  Bell,
  Volume2,
  VolumeX,
  Play,
  Terminal,
  Check,
  Copy,
  Clock,
  ArrowRight,
  ShieldAlert,
  Zap,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Tower, Client } from '../types/index.js';

interface TowersViewProps {
  towers: Tower[];
  clients: Client[];
  onAddTower: (tower: Partial<Tower>) => void;
  onEditTower?: (tower: Tower) => void;
  onDeleteTower?: (towerId: string) => void;
  onRefresh?: () => void;
}

export const TowersView: React.FC<TowersViewProps> = ({
  towers,
  clients,
  onAddTower,
  onEditTower,
  onDeleteTower,
  onRefresh
}) => {
  // Modals & local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTower, setEditingTower] = useState<Tower | null>(null);
  const [diagnosticTower, setDiagnosticTower] = useState<Tower | null>(null);
  const [pingingTowerId, setPingingTowerId] = useState<string | null>(null);
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [autoPingEnabled, setAutoPingEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pingMode, setPingMode] = useState<'auto' | 'real_icmp'>('auto');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [frequency, setFrequency] = useState('5.8 GHz (AirMAX AC)');
  const [capacity, setCapacity] = useState(100);
  const [ipGateway, setIpGateway] = useState('10.50.5.1');
  const [coordinates, setCoordinates] = useState('-15.8000, -47.9000');
  const [status, setStatus] = useState<'online' | 'warning' | 'offline'>('online');

  // Track previous offline towers to trigger audible alert
  const prevOfflineCountRef = useRef(0);

  // Audio Context synthesizer for pleasant NOC chime
  const playAlertSound = (type: 'alarm' | 'warning' | 'recover') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'alarm') {
        // Double alert beep (NOC Outage Alert)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Recover chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio autoplay restrictions or no audio support
    }
  };

  // Monitor offline towers and play sound if newly offline
  const offlineTowers = towers.filter(t => t.status === 'offline');
  const warningTowers = towers.filter(t => t.status === 'warning');
  const onlineTowers = towers.filter(t => t.status === 'online');

  useEffect(() => {
    if (offlineTowers.length > prevOfflineCountRef.current) {
      playAlertSound('alarm');
    }
    prevOfflineCountRef.current = offlineTowers.length;
  }, [offlineTowers.length]);

  // Auto-ping timer
  useEffect(() => {
    if (!autoPingEnabled) return;
    const interval = setInterval(() => {
      handlePingAll(false);
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [autoPingEnabled, pingMode]);

  const showTempMessage = (text: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Test single tower ping
  const handleTestPing = async (tower: Tower, forceStatus?: 'online' | 'warning' | 'offline') => {
    setPingingTowerId(tower.id);
    try {
      const res = await fetch(`/api/towers/${tower.id}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: pingMode, forceStatus })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.result.status === 'offline') {
        playAlertSound('alarm');
        showTempMessage(`🚨 POP '${tower.name}' está OFFLINE! 100% de perda de pacotes.`, 'error');
      } else if (data.result.status === 'warning') {
        playAlertSound('warning');
        showTempMessage(`⚠️ POP '${tower.name}' com oscilação: ${data.result.avgLatencyMs}ms (Perda: ${data.result.packetLossPercent}%).`, 'warning');
      } else {
        showTempMessage(`✅ POP '${tower.name}' online e estável (${data.result.avgLatencyMs}ms - 0% perda).`, 'success');
      }

      if (diagnosticTower && diagnosticTower.id === tower.id) {
        setDiagnosticTower(data.tower);
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      showTempMessage(err.message || 'Erro ao testar ping', 'error');
    } finally {
      setPingingTowerId(null);
    }
  };

  // Ping all towers
  const handlePingAll = async (notify = true) => {
    setIsPingingAll(true);
    try {
      const res = await fetch('/api/towers/ping-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: pingMode })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (notify) {
        const { offline, warning, online } = data.summary;
        if (offline > 0) {
          playAlertSound('alarm');
          showTempMessage(`🚨 Varredura de Ping concluída: ${offline} POP(s) Inativo(s) detectado(s)!`, 'error');
        } else if (warning > 0) {
          playAlertSound('warning');
          showTempMessage(`⚠️ Varredura de Ping: ${online} Online, ${warning} Instável(is).`, 'warning');
        } else {
          showTempMessage(`✅ Varredura concluída: Todos os ${online} POPs estão 100% Online e operacionais!`, 'success');
        }
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (notify) showTempMessage(err.message || 'Erro na checagem geral de ping', 'error');
    } finally {
      setIsPingingAll(false);
    }
  };

  // Simulate status for testing screen alert
  const handleSimulateStatus = async (tower: Tower, targetStatus: 'online' | 'warning' | 'offline') => {
    try {
      const res = await fetch(`/api/towers/${tower.id}/simulate-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (targetStatus === 'offline') {
        playAlertSound('alarm');
        showTempMessage(`🚨 Simulação Ativada: POP '${tower.name}' colocado em estado OFFLINE para teste de alarme na tela.`, 'error');
      } else if (targetStatus === 'warning') {
        playAlertSound('warning');
        showTempMessage(`⚠️ Simulação Ativada: POP '${tower.name}' com alta latência e perda simulada.`, 'warning');
      } else {
        playAlertSound('recover');
        showTempMessage(`✅ Simulação: POP '${tower.name}' restabelecido e online.`, 'success');
      }

      if (diagnosticTower && diagnosticTower.id === tower.id) {
        setDiagnosticTower(data.tower);
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      showTempMessage(err.message || 'Erro ao simular status', 'error');
    }
  };

  const handleOpenAdd = () => {
    setName('');
    setLocation('');
    setFrequency('5.8 GHz (AirMAX AC)');
    setCapacity(100);
    setIpGateway('10.50.5.1');
    setCoordinates('-15.8000, -47.9000');
    setStatus('online');
    setShowAddModal(true);
  };

  const handleOpenEdit = (tower: Tower) => {
    setEditingTower(tower);
    setName(tower.name);
    setLocation(tower.location);
    setFrequency(tower.frequency || '5.8 GHz (AirMAX AC)');
    setCapacity(tower.capacity || 100);
    setIpGateway(tower.ipGateway || '10.50.5.1');
    setCoordinates(tower.coordinates || '-15.8000, -47.9000');
    setStatus(tower.status || 'online');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;

    onAddTower({
      id: `tower-${Date.now()}`,
      name,
      location,
      frequency,
      capacity: Number(capacity),
      activeClients: 0,
      status,
      coordinates,
      ipGateway,
      lastPingMs: 14.5,
      packetLossPercent: 0,
      lastPingCheck: new Date().toISOString(),
      pingStatus: 'online'
    });

    setShowAddModal(false);
    showTempMessage(`POP/Torre '${name}' cadastrado com sucesso!`);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTower || !name || !location) return;

    if (onEditTower) {
      onEditTower({
        ...editingTower,
        name,
        location,
        frequency,
        capacity: Number(capacity),
        status,
        coordinates,
        ipGateway
      });
    }

    setEditingTower(null);
    showTempMessage(`POP/Torre '${name}' atualizado com sucesso!`);
  };

  const handleDelete = (tower: Tower) => {
    const linkedClients = clients.filter(c => c.towerId === tower.id);
    if (linkedClients.length > 0) {
      alert(`Atenção: Existem ${linkedClients.length} clientes vinculados ao POP/Torre '${tower.name}'. Reatribua os clientes antes de excluir.`);
      return;
    }

    if (window.confirm(`Deseja realmente excluir a torre / POP '${tower.name}'? Esta ação é irreversível.`)) {
      if (onDeleteTower) {
        onDeleteTower(tower.id);
      }
    }
  };

  const copyRouterOsPingCmd = (gateway: string) => {
    const cmd = `/tool ping address=${gateway} count=4`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  // Helper format relative time
  const formatTimeAgo = (isoDate?: string) => {
    if (!isoDate) return 'Nunca verificado';
    const seconds = Math.floor((new Date().getTime() - new Date(isoDate).getTime()) / 1000);
    if (seconds < 10) return 'Agora mesmo';
    if (seconds < 60) return `há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `há ${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* ACTION TOAST MESSAGE */}
      {actionMessage && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-lg animate-fade-in ${
          actionMessage.type === 'error'
            ? 'bg-red-950/90 border-red-500/50 text-red-200'
            : actionMessage.type === 'warning'
            ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
            : actionMessage.type === 'info'
            ? 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
            : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            ) : actionMessage.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : actionMessage.type === 'info' ? (
              <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PROMINENT CRITICAL SCREEN ALERT (AVISO NA TELA) - SE HOUVER POP OFFLINE */}
      {offlineTowers.length > 0 && !dismissedAlerts.includes('offline-banner') && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-950 via-red-900/90 to-slate-900 border-2 border-red-500/80 rounded-2xl p-5 shadow-2xl animate-pulse">
          <div className="absolute top-0 right-0 p-3">
            <button
              onClick={() => setDismissedAlerts(prev => [...prev, 'offline-banner'])}
              className="text-red-300/70 hover:text-white p-1 rounded-lg transition"
              title="Dispensar aviso na tela temporariamente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-900/50 flex-shrink-0 animate-bounce">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-red-600 text-white">
                    Alerta Crítico NOC
                  </span>
                  <span className="text-xs text-red-300 font-mono">
                    Perda de Conectividade ICMP (100% Loss)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Atenção: {offlineTowers.length} {offlineTowers.length === 1 ? 'POP / Torre Inativo!' : 'POPs / Torres Inativos!'}
                </h3>
                <p className="text-xs text-red-200/90 leading-relaxed max-w-2xl">
                  {offlineTowers.map(t => `'${t.name}' (${t.ipGateway})`).join(', ')} não respondeu aos pacotes de ping. Clientes da localidade podem estar sem internet. Verifique alimentação PoE, enlace 5.8 GHz ou nobreak.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => handlePingAll(true)}
                disabled={isPingingAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-red-950 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPingingAll ? 'animate-spin' : ''}`} />
                <span>Re-testar Ping Agora</span>
              </button>
              {offlineTowers[0] && (
                <button
                  onClick={() => setDiagnosticTower(offlineTowers[0])}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-red-500/50 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                  <span>Diagnosticar {offlineTowers[0].name.split(' ')[0]}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WARNING SCREEN ALERT - SE HOUVER POP COM ALTA LATÊNCIA OU PERDA PARCIAL */}
      {warningTowers.length > 0 && offlineTowers.length === 0 && !dismissedAlerts.includes('warning-banner') && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border border-amber-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-300">Aviso de Oscilação de Enlace</span>
                <span className="text-[10px] text-slate-400">({warningTowers.length} POP instável)</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {warningTowers.map(t => `${t.name} (Ping: ${t.lastPingMs || '--'}ms • Perda: ${t.packetLossPercent || 0}%)`).join(', ')}. Possível interferência em 5.8 GHz ou degradação de sinal.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePingAll(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
            >
              Re-testar
            </button>
            <button
              onClick={() => setDismissedAlerts(prev => [...prev, 'warning-banner'])}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & NOC Ping Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Torres de Transmissão & POPs Rurais</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Telemetria & Ping Ativo
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Monitoramento contínuo de conectividade dos enlaces de rádio 5.8 GHz, OLTs FTTH e repetidoras.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ping All Button */}
            <button
              onClick={() => handlePingAll(true)}
              disabled={isPingingAll}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950 disabled:opacity-50"
              title="Disparar ping ICMP em todos os POPs e atualizar telemetria"
            >
              <Activity className={`w-3.5 h-3.5 ${isPingingAll ? 'animate-spin' : ''}`} />
              <span>{isPingingAll ? 'Testando Ping...' : 'Checar Ping de Todos'}</span>
            </button>

            {/* Auto Monitor Toggle */}
            <button
              onClick={() => {
                const nextState = !autoPingEnabled;
                setAutoPingEnabled(nextState);
                if (nextState) {
                  showTempMessage('Monitoramento automático ativado: checagem de ping a cada 30 segundos.', 'info');
                  handlePingAll(false);
                } else {
                  showTempMessage('Monitoramento automático pausado.', 'info');
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
                autoPingEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Ativar/Desativar checagem periódica a cada 30 segundos"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Auto-Ping (30s): {autoPingEnabled ? 'ATIVO' : 'PAUSADO'}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playAlertSound('warning');
              }}
              className={`p-2 rounded-xl text-xs font-semibold transition border ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-amber-400'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-500'
              }`}
              title={soundEnabled ? 'Alarme sonoro ativado em caso de queda' : 'Alarme sonoro silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Add POP Button */}
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Novo POP / Torre</span>
            </button>
          </div>
        </div>

        {/* Status Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Total de POPs</span>
              <span className="text-base font-bold text-white">{towers.length}</span>
            </div>
            <Radio className="w-5 h-5 text-slate-500" />
          </div>

          <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-400 block font-medium">● Online / Estável</span>
              <span className="text-base font-bold text-emerald-300">{onlineTowers.length}</span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="bg-slate-950/60 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-400 block font-medium">● Oscilação / Alerta</span>
              <span className="text-base font-bold text-amber-300">{warningTowers.length}</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>

          <div className="bg-slate-950/60 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-red-400 block font-medium">● Offline / Queda</span>
              <span className="text-base font-bold text-red-400">{offlineTowers.length}</span>
            </div>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
        </div>
      </div>

      {/* Grid of Rural Transmission Towers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {towers.map(tower => {
          const towerClients = clients.filter(c => c.towerId === tower.id);
          const usagePercent = Math.min(Math.round((towerClients.length / (tower.capacity || 1)) * 100), 100);
          const isPinging = pingingTowerId === tower.id;
          const isOffline = tower.status === 'offline';
          const isWarning = tower.status === 'warning';
          const isOnline = tower.status === 'online';

          return (
            <div 
              key={tower.id} 
              className={`bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4 transition relative group ${
                isOffline
                  ? 'border-red-500/70 bg-gradient-to-b from-red-950/30 to-slate-900 ring-1 ring-red-500/40'
                  : isWarning
                  ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-slate-900'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white">{tower.name}</h3>
                    
                    {/* Live Ping Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center space-x-1 ${
                      isOffline
                        ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isOffline ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span>
                        {isOffline 
                          ? '● Offline (100% perda)' 
                          : isWarning 
                          ? `● Alerta (${tower.lastPingMs || '--'} ms)` 
                          : `● Online (${tower.lastPingMs || '--'} ms)`}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                    <span>{tower.location}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border ${
                  isOffline
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : isWarning
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-emerald-400'
                }`}>
                  <Radio className="w-5 h-5" />
                </div>
              </div>

              {/* TELEMETRIA DE PING & ESPECIFICAÇÕES DO ENLACE */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Tecnologia</span>
                  <span className="text-slate-200 font-semibold truncate block" title={tower.frequency}>
                    {tower.frequency || '5.8 GHz'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block font-sans">Gateway (Ping)</span>
                  <span className="text-cyan-400 font-bold">{tower.ipGateway || '10.50.1.1'}</span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block font-sans">Latência / Perda</span>
                  <span className={`font-bold ${
                    isOffline ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {tower.lastPingMs !== undefined ? `${tower.lastPingMs} ms` : '--'} 
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      ({tower.packetLossPercent !== undefined ? `${tower.packetLossPercent}%` : '0%'})
                    </span>
                  </span>
                </div>
              </div>

              {/* Error box if offline */}
              {isOffline && (
                <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-[11px] font-medium">Destino inalcançável (Sem resposta de ping)</span>
                  </div>
                  <button
                    onClick={() => setDiagnosticTower(tower)}
                    className="text-[10px] font-bold underline text-red-300 hover:text-white"
                  >
                    Ver Causa
                  </button>
                </div>
              )}

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ocupação do POP:</span>
                  <span className="font-mono text-white font-bold">
                    {towerClients.length} / {tower.capacity} clientes ({usagePercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Connected clients teaser & quick info */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{towerClients.filter(c => c.status === 'active').length} clientes ativos</span>
                </div>
                <div className="flex items-center space-x-1 text-[11px]">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Ping: {formatTimeAgo(tower.lastPingCheck)}</span>
                </div>
              </div>

              {/* ACTION TOOLBAR: PING, DIAGNÓSTICO, SIMULAR & EDIT */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  {/* Ping Test Button */}
                  <button
                    type="button"
                    onClick={() => handleTestPing(tower)}
                    disabled={isPinging}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50 shadow-sm"
                    title="Disparar teste de ping neste momento"
                  >
                    <Activity className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Pingando...' : 'Testar Ping'}</span>
                  </button>

                  {/* Diagnostic Modal Button */}
                  <button
                    type="button"
                    onClick={() => setDiagnosticTower(tower)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1 transition border border-slate-700"
                    title="Abrir console de diagnóstico ICMP e histórico"
                  >
                    <Terminal className="w-3 h-3 text-cyan-400" />
                    <span>Diagnóstico</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  {/* Test Outage Toggle */}
                  <button
                    type="button"
                    onClick={() => handleSimulateStatus(tower, isOffline ? 'online' : 'offline')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition border flex items-center space-x-1 ${
                      isOffline
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                    }`}
                    title={isOffline ? 'Restabelecer enlace normal' : 'Simular queda deste POP para testar aviso na tela'}
                  >
                    <Zap className="w-3 h-3" />
                    <span>{isOffline ? 'Restabelecer' : 'Simular Queda'}</span>
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(tower)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Editar dados da torre e POP"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(tower)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition"
                    title="Excluir torre e POP"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE DIAGNÓSTICO ICMP & TESTE DE ENLACE */}
      {diagnosticTower && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    <span>Diagnóstico de Ping & Enlace: {diagnosticTower.name}</span>
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    diagnosticTower.status === 'offline'
                      ? 'bg-red-500/20 text-red-400'
                      : diagnosticTower.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {diagnosticTower.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Gateway: <span className="font-mono text-cyan-400 font-bold">{diagnosticTower.ipGateway}</span> • Local: {diagnosticTower.location}
                </p>
              </div>

              <button onClick={() => setDiagnosticTower(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Latência Média</span>
                <span className="text-base font-bold text-white font-mono">
                  {diagnosticTower.lastPingMs !== undefined ? `${diagnosticTower.lastPingMs} ms` : '--'}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Mínima / Máxima</span>
                <span className="text-xs font-semibold text-slate-300 font-mono">
                  {diagnosticTower.minPingMs || '--'} / {diagnosticTower.maxPingMs || '--'} ms
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Perda de Pacotes</span>
                <span className={`text-base font-bold font-mono ${
                  diagnosticTower.packetLossPercent && diagnosticTower.packetLossPercent > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {diagnosticTower.packetLossPercent !== undefined ? `${diagnosticTower.packetLossPercent}%` : '0%'}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Último Teste</span>
                <span className="text-xs text-slate-300 font-mono truncate block">
                  {formatTimeAgo(diagnosticTower.lastPingCheck)}
                </span>
              </div>
            </div>

            {/* Simulated/Real ICMP Terminal Console */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Saída do Console de Ping (ICMP Tracer)</span>
                <button
                  onClick={() => copyRouterOsPingCmd(diagnosticTower.ipGateway)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Comando Copiado!' : 'Copiar comando RouterOS'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {diagnosticTower.status === 'offline' ? (
                  `PING ${diagnosticTower.ipGateway} (${diagnosticTower.ipGateway}) 56(84) bytes of data.
From 10.50.0.1 icmp_seq=1 Destination Host Unreachable
From 10.50.0.1 icmp_seq=2 Destination Host Unreachable

--- ${diagnosticTower.ipGateway} ping statistics ---
2 packets transmitted, 0 received, +2 errors, 100% packet loss, time 2000ms
Status: HOST INACESSÍVEL - O gateway do POP não respondeu.`
                ) : (
                  `PING ${diagnosticTower.ipGateway} (${diagnosticTower.ipGateway}) 56(84) bytes of data.
64 bytes from ${diagnosticTower.ipGateway}: icmp_seq=1 ttl=64 time=${(diagnosticTower.minPingMs || 10.2).toFixed(2)} ms
64 bytes from ${diagnosticTower.ipGateway}: icmp_seq=2 ttl=64 time=${(diagnosticTower.maxPingMs || 14.8).toFixed(2)} ms

--- ${diagnosticTower.ipGateway} ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms
rtt min/avg/max = ${(diagnosticTower.minPingMs || 10.2).toFixed(3)}/${(diagnosticTower.lastPingMs || 12.5).toFixed(3)}/${(diagnosticTower.maxPingMs || 14.8).toFixed(3)} ms`
                )}
              </div>
            </div>

            {/* Field Technician Troubleshooting Guide */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Checklist Técnico para Campo (Procedimento Operacional)</span>
              </span>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li><span className="font-semibold text-white">1. Alimentação Elétrica:</span> Verificar nobreak, banco de baterias ou fonte PoE 24V/48V da torre.</li>
                <li><span className="font-semibold text-white">2. Enlace de Rádio 5.8 GHz:</span> Verificar se as antenas transmissora e receptora sofreram desalinhamento por ventania.</li>
                <li><span className="font-semibold text-white">3. Porta e Cabeamento:</span> Testar cabo blindado RJ45 e porta switch/ethernet do MikroTik concentrador.</li>
                <li><span className="font-semibold text-white">4. Winbox CLI:</span> Executar <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-400">/tool ping {diagnosticTower.ipGateway}</code> direto do RouterOS.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSimulateStatus(diagnosticTower, 'offline')}
                  className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 rounded-lg text-xs font-semibold transition"
                >
                  Simular Queda (Offline)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateStatus(diagnosticTower, 'warning')}
                  className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold transition"
                >
                  Simular Oscilação
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateStatus(diagnosticTower, 'online')}
                  className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold transition"
                >
                  Simular Recuperação (Online)
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTestPing(diagnosticTower)}
                disabled={pingingTowerId === diagnosticTower.id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950"
              >
                <Activity className={`w-3.5 h-3.5 ${pingingTowerId === diagnosticTower.id ? 'animate-spin' : ''}`} />
                <span>Re-executar Teste de Ping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Tower */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Cadastrar Nova Torre / POP de Distribuição</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Torre / POP *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre Serra Azul ou POP Sede"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Localização Física / Ponto Estratégico *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Morro do Cruzeiro - Silo Leste"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">IP do Gateway (Host Ping) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 10.50.1.1"
                    value={ipGateway}
                    onChange={e => setIpGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacidade de Clientes</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tecnologia & Rádio Frequência</label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="5.8 GHz (AirMAX AC)">5.8 GHz (AirMAX AC)</option>
                  <option value="5.8 GHz (MikroTik NetMetal)">5.8 GHz (MikroTik NetMetal)</option>
                  <option value="5.8 GHz / Enlace PTP 1.2Gbps">5.8 GHz / Enlace PTP 1.2Gbps</option>
                  <option value="GPON / EPON 2.5G">GPON / EPON 2.5G (Fibra FTTH)</option>
                  <option value="2.4 GHz B/G/N Rural">2.4 GHz B/G/N Rural</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Coordenadas GPS (Lat, Long)</label>
                <input
                  type="text"
                  placeholder="-15.8000, -47.9000"
                  value={coordinates}
                  onChange={e => setCoordinates(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950"
                >
                  Salvar POP / Torre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Tower */}
      {editingTower && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Editar Dados do POP / Torre</span>
              </h3>
              <button onClick={() => setEditingTower(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Torre / POP *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Localização Física / Silo *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">IP do Gateway (Ping) *</label>
                  <input
                    type="text"
                    required
                    value={ipGateway}
                    onChange={e => setIpGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacidade de Clientes</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tecnologia & Banda</label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="5.8 GHz (AirMAX AC)">5.8 GHz (AirMAX AC)</option>
                  <option value="5.8 GHz (MikroTik NetMetal)">5.8 GHz (MikroTik NetMetal)</option>
                  <option value="5.8 GHz / Enlace PTP 1.2Gbps">5.8 GHz / Enlace PTP 1.2Gbps</option>
                  <option value="GPON / EPON 2.5G">GPON / EPON 2.5G (Fibra FTTH)</option>
                  <option value="2.4 GHz B/G/N Rural">2.4 GHz B/G/N Rural</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Status Operacional</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="online">Online (Operação Normal)</option>
                  <option value="warning">Alerta / Instabilidade</option>
                  <option value="offline">Offline / Inativo</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTower(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
