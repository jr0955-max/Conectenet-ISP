import React, { useState } from 'react';
import { 
  ScrollText, 
  Server, 
  CreditCard, 
  Users, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search,
  Filter
} from 'lucide-react';
import { AuditLog } from '../types/index.js';

interface AuditLogsViewProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filterType === 'all' || log.type === filterType;
    const matchesSearch = 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'mikrotik':
        return <Server className="w-4 h-4 text-cyan-400" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'client':
        return <Users className="w-4 h-4 text-purple-400" />;
      default:
        return <Settings className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-emerald-400" />
            <span>Auditoria & Logs de Operação do Provedor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Rastreabilidade completa de comandos executados no MikroTik, webhooks de pagamento recebidos e alterações.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por comando, cliente ou ação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex space-x-2 w-full sm:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
            >
              <option value="all">Todos os Tipos ({logs.length})</option>
              <option value="mikrotik">Comandos MikroTik</option>
              <option value="payment">Webhooks & Pagamentos</option>
              <option value="client">Clientes & PPPoE</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table / Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-800/60 text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhum registro de auditoria encontrado.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-800/40 transition flex items-start space-x-3.5">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                  {getLogIcon(log.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white uppercase text-[11px] tracking-wide">
                        {log.action}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        log.status === 'success' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                      <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <p className="text-slate-300 mt-1 text-xs leading-relaxed font-sans">
                    {log.message}
                  </p>

                  {log.details && (
                    <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[10px] text-slate-400">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
