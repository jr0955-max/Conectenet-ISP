import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Download, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  FileText, 
  Copy, 
  Check, 
  Settings, 
  HardDrive, 
  ShieldCheck, 
  Play, 
  FolderDown,
  X,
  Calendar,
  Layers,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { RbBackup, RbBackupConfig, MikrotikServer } from '../types/index.js';

interface RbBackupsViewProps {
  servers: MikrotikServer[];
  onRefreshParent?: () => void;
}

export const RbBackupsView: React.FC<RbBackupsViewProps> = ({ servers, onRefreshParent }) => {
  const [backups, setBackups] = useState<RbBackup[]>([]);
  const [config, setConfig] = useState<RbBackupConfig>({
    autoBackupEnabled: true,
    frequencyHours: 24,
    retentionCount: 15
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [selectedServerFilter, setSelectedServerFilter] = useState<string>('all');
  const [targetServerForBackup, setTargetServerForBackup] = useState<string>('');
  
  // Modal viewer state
  const [viewingBackup, setViewingBackup] = useState<RbBackup | null>(null);
  const [backupContent, setBackupContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const url = selectedServerFilter && selectedServerFilter !== 'all'
        ? `/api/mikrotik/backups?serverId=${selectedServerFilter}`
        : '/api/mikrotik/backups';
      const res = await fetch(url);
      const data = await res.json();
      if (data.backups) {
        setBackups(data.backups);
      }
      if (data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Erro ao carregar backups de RBs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [selectedServerFilter]);

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setActionSuccessMessage(null);
      const res = await fetch('/api/mikrotik/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: targetServerForBackup || undefined,
          triggeredBy: 'manual'
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setActionSuccessMessage(data.message || 'Snapshot de configurações (.rsc) gerado e salvo com sucesso!');
      await fetchBackups();
      if (onRefreshParent) onRefreshParent();
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar backup da RB');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/mikrotik/backups/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActionSuccessMessage('Configuração de agendamento automático salva com sucesso!');
      setShowConfigPanel(false);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configuração de backup');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeleteBackup = async (id: string, filename: string) => {
    if (!confirm(`Deseja realmente excluir o arquivo de backup '${filename}'?\n\nEsta ação removerá o arquivo do armazenamento local do backend.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/mikrotik/backups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBackups(prev => prev.filter(b => b.id !== id));
      setActionSuccessMessage(`Arquivo '${filename}' excluído com sucesso.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir backup');
    }
  };

  const handleOpenViewModal = async (backup: RbBackup) => {
    setViewingBackup(backup);
    setBackupContent('');
    setIsLoadingContent(true);
    setCopiedCode(false);
    try {
      const res = await fetch(`/api/mikrotik/backups/${backup.id}/content`);
      const data = await res.json();
      if (data.content) {
        setBackupContent(data.content);
      } else {
        setBackupContent('# Não foi possível ler o arquivo no disco.');
      }
    } catch (err: any) {
      setBackupContent(`# Erro ao carregar arquivo: ${err.message}`);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleCopyCode = () => {
    if (!backupContent) return;
    navigator.clipboard.writeText(backupContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Calculations
  const totalSizeBytes = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
  const formattedTotalSize = totalSizeBytes > 1024 * 1024 
    ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não executado ainda';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* SUCCESS NOTIFICATION */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center justify-between shadow-lg shadow-emerald-950/50 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP OVERVIEW BANNER */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400 shrink-0 shadow-inner">
            <Archive className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="text-lg font-bold text-white">Snapshots & Backups Automáticos das RBs (.rsc)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                MikroTik RouterOS Script
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                config.autoBackupEnabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {config.autoBackupEnabled ? `Auto Backup: A cada ${config.frequencyHours}h` : 'Auto Backup: Pausado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Geração de arquivos <span className="font-mono text-indigo-300">.rsc</span> completos contendo 
              identidade, pools de IP, perfis de velocidade (/ppp profile), credenciais PPPoE (/ppp secret), queues simples e regras de firewall.
              Arquivos são salvos na pasta persistente <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">/data/rb_backups/</span> do backend.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
          <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border ${
              showConfigPanel
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>{showConfigPanel ? 'Ocultar Parâmetros' : 'Agendamento & Retenção'}</span>
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950 flex items-center space-x-2 disabled:opacity-50"
          >
            {isCreatingBackup ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gerando Snapshot...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Gerar Snapshot Agora (.rsc)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* METRIC STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Backups */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center space-x-3 shadow-md">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{backups.length}</div>
            <div className="text-xs text-slate-400">Snapshots Armazenados</div>
          </div>
        </div>

        {/* Card 2: Disk Size */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center space-x-3 shadow-md">
          <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{formattedTotalSize}</div>
            <div className="text-xs text-slate-400">Em /data/rb_backups/</div>
          </div>
        </div>

        {/* Card 3: Last Auto Backup */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center space-x-3 shadow-md">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white truncate max-w-[170px]">
              {formatDate(config.lastAutoBackup)}
            </div>
            <div className="text-xs text-slate-400">Último Automático</div>
          </div>
        </div>

        {/* Card 4: Next Scheduled */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center space-x-3 shadow-md">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white truncate max-w-[170px]">
              {config.autoBackupEnabled ? formatDate(config.nextScheduledBackup) : 'Agendador Desativado'}
            </div>
            <div className="text-xs text-slate-400">Próximo Agendado</div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE CONFIGURATION PANEL */}
      {showConfigPanel && (
        <form onSubmit={handleSaveConfig} className="p-5 bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">Configuração do Agendador de Backup Automático</h4>
            </div>
            <span className="text-[11px] text-slate-400">Salvo automaticamente em disco com rotação</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auto Backup Toggle */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Status da Automação</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoBackupEnabled}
                  onChange={e => setConfig(prev => ({ ...prev, autoBackupEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-medium text-slate-300">
                  {config.autoBackupEnabled ? 'Backup Periódico Ativo' : 'Pausado'}
                </span>
              </label>
              <p className="text-[11px] text-slate-400">
                O cron do backend verifica a cada 15 min se o intervalo foi atingido.
              </p>
            </div>

            {/* Frequency selector */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Frequência de Execução</label>
              <select
                value={config.frequencyHours}
                onChange={e => setConfig(prev => ({ ...prev, frequencyHours: Number(e.target.value) }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={6}>A cada 6 horas (4x por dia)</option>
                <option value={12}>A cada 12 horas (2x por dia)</option>
                <option value={24}>A cada 24 horas (Diário - Recomendado)</option>
                <option value={48}>A cada 48 horas (A cada 2 dias)</option>
                <option value={168}>Semanalmente (A cada 7 dias)</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Gera snapshot de todas as RBs cadastradas no intervalo selecionado.
              </p>
            </div>

            {/* Retention selector */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Retenção de Arquivos (Rotação)</label>
              <select
                value={config.retentionCount}
                onChange={e => setConfig(prev => ({ ...prev, retentionCount: Number(e.target.value) }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>Manter últimos 5 snapshots por RB</option>
                <option value={10}>Manter últimos 10 snapshots por RB</option>
                <option value={15}>Manter últimos 15 snapshots por RB (Padrão)</option>
                <option value={30}>Manter últimos 30 snapshots por RB</option>
                <option value={60}>Manter últimos 60 snapshots por RB</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Snapshots mais antigos são excluídos automaticamente do disco.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Diretório de destino: <code className="text-slate-300">/data/rb_backups/</code></span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowConfigPanel(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {isSavingConfig ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FILTER & CREATION BAR */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Server className="w-4 h-4 text-slate-500" />
            <span>Filtrar por Concentrador:</span>
          </div>

          <select
            value={selectedServerFilter}
            onChange={e => setSelectedServerFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas as RBs ({backups.length} snapshots)</option>
            {servers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.host})
              </option>
            ))}
          </select>

          {/* Quick backup selector */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-700">
            <span className="text-xs text-slate-400">Alvo do Snapshot:</span>
            <select
              value={targetServerForBackup}
              onChange={e => setTargetServerForBackup(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todas as RBs Cadastradas</option>
              {servers.map(s => (
                <option key={s.id} value={s.id}>
                  Somente: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchBackups}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition flex items-center space-x-1.5 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* BACKUPS LIST TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-white">Snapshots Salvos em Disco</h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-400 font-mono">
              {backups.length} arquivo(s)
            </span>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Formato: <span className="font-mono text-slate-400">/export (.rsc)</span> pronto para restauração
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm">Carregando snapshots de backup do backend...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/50 text-slate-500">
              <Archive className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-white">Nenhum snapshot de backup gerado ainda</h5>
              <p className="text-xs text-slate-500 max-w-md">
                Clique no botão abaixo para gerar o primeiro snapshot <span className="font-mono text-slate-400">.rsc</span> das configurações das suas RBs cadastradas.
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Gerar Primeiro Snapshot (.rsc)</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Arquivo / Snapshot</th>
                  <th className="py-3 px-4 font-semibold">Concentrador (RB)</th>
                  <th className="py-3 px-4 font-semibold">Data / Hora</th>
                  <th className="py-3 px-4 font-semibold">Gatilho</th>
                  <th className="py-3 px-4 font-semibold">Tamanho / Linhas</th>
                  <th className="py-3 px-4 font-semibold">Conteúdo Exportado</th>
                  <th className="py-3 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {backups.map(backup => {
                  const sizeKb = (backup.sizeBytes / 1024).toFixed(1);
                  return (
                    <tr key={backup.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-white block truncate max-w-[220px]" title={backup.filename}>
                              {backup.filename}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {backup.routerModel || 'MikroTik'} • {backup.routerOsVersion || 'v7.x'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{backup.serverName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{backup.serverHost}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {formatDate(backup.createdAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        {backup.triggeredBy === 'automatic' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center space-x-1 w-max">
                            <Clock className="w-3 h-3" />
                            <span>Automático</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1 w-max">
                            <Play className="w-3 h-3" />
                            <span>Manual</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-200">{sizeKb} KB</span>
                        <span className="text-[10px] text-slate-500 block">{backup.linesCount} linhas .rsc</span>
                      </td>

                      <td className="py-3.5 px-4">
                        {backup.summary ? (
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              {backup.summary.secretsCount} secrets
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              {backup.summary.profilesCount} profiles
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              {backup.summary.queuesCount} queues
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Snapshot padrão</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Modal */}
                          <button
                            onClick={() => handleOpenViewModal(backup)}
                            title="Visualizar script .rsc"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download directly */}
                          <a
                            href={`/api/mikrotik/backups/${backup.id}/download`}
                            download={backup.filename}
                            title="Baixar arquivo .rsc para o computador"
                            className="p-1.5 bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 rounded-lg transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteBackup(backup.id, backup.filename)}
                            title="Excluir arquivo de backup"
                            className="p-1.5 bg-slate-800 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HOW TO RESTORE GUIDE */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span>Como restaurar o arquivo .rsc no MikroTik RouterOS:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-300 block">Opção 1: Winbox (Arrastar e Importar)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Baixe o arquivo <code className="text-indigo-300">.rsc</code>.<br />
              2. No Winbox, abra o menu <code className="text-white">Files</code> e arraste o arquivo.<br />
              3. Abra o <code className="text-white">New Terminal</code> e execute:
            </p>
            <code className="block bg-slate-900 p-1.5 rounded text-[11px] font-mono text-emerald-400">
              /import file=nome_do_arquivo.rsc verbose=yes
            </code>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-300 block">Opção 2: Terminal Direto (Colar Script)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Clique no botão <code className="text-indigo-300">👁️ Visualizar</code> ao lado do backup.<br />
              2. Clique em <code className="text-white">Copiar Script Completo</code>.<br />
              3. Cole diretamente no Terminal do MikroTik RouterOS ou na aba <code className="text-white">Terminal CLI</code> do AgroISP.
            </p>
          </div>
        </div>
      </div>

      {/* CODE VIEWER MODAL */}
      {viewingBackup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-scaleIn">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{viewingBackup.filename}</h3>
                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <span>{viewingBackup.serverName} ({viewingBackup.serverHost})</span>
                    <span>•</span>
                    <span>{(viewingBackup.sizeBytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{viewingBackup.linesCount} linhas</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Script</span>
                    </>
                  )}
                </button>

                <a
                  href={`/api/mikrotik/backups/${viewingBackup.id}/download`}
                  download={viewingBackup.filename}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar .rsc</span>
                </a>

                <button
                  onClick={() => setViewingBackup(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Monospace Code */}
            <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300 space-y-1 selection:bg-indigo-500 selection:text-white">
              {isLoadingContent ? (
                <div className="p-8 text-center text-slate-500 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Carregando arquivo .rsc do disco...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all leading-relaxed">
                  {backupContent}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono text-slate-500">{viewingBackup.filePath}</span>
              <button
                onClick={() => setViewingBackup(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
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
