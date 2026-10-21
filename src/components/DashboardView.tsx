import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Activity, 
  DollarSign, 
  AlertTriangle, 
  Radio, 
  Cpu, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowUpRight, 
  ExternalLink, 
  MessageSquare, 
  Zap, 
  TrendingUp, 
  Clock, 
  HardDrive,
  Gauge,
  Wrench,
  FileText,
  Hexagon,
  Calendar
} from 'lucide-react';
import { SystemStats, Client, Invoice, Tower, MikrotikConfig, ServiceOrder, CompanySettings } from '../types/index.js';
import { RevenueProjectionChart } from './RevenueProjectionChart.js';

interface DashboardViewProps {
  stats: SystemStats | null;
  clients: Client[];
  invoices: Invoice[];
  towers: Tower[];
  serviceOrders?: ServiceOrder[];
  mikrotikConfig: MikrotikConfig | null;
  onOpenNewClient: () => void;
  onOpenNewOrder?: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onNavigateTab: (tab: string) => void;
  onSimulateWebhook: () => void;
  companySettings?: CompanySettings;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  clients,
  invoices,
  towers,
  serviceOrders = [],
  mikrotikConfig,
  onOpenNewClient,
  onOpenNewOrder,
  onSelectInvoice,
  onNavigateTab,
  onSimulateWebhook,
  companySettings
}) => {
  const blockedClients = clients.filter(c => c.status === 'blocked');
  const recentInvoices = invoices.slice(0, 5);
  const recentOrders = serviceOrders.slice(0, 4);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any clients are blocked */}
      {blockedClients.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-red-950/30 to-slate-900 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Atenção: {blockedClients.length} {blockedClients.length === 1 ? 'cliente bloqueado' : 'clientes bloqueados'} por inadimplência
              </h4>
              <p className="text-xs text-slate-400">
                Os acessos foram direcionados para o perfil <code className="text-amber-300 font-mono">profile=bloqueados</code> no MikroTik.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={onSimulateWebhook}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Simular Baixa Pix & Desbloqueio</span>
            </button>
            <button
              onClick={() => onNavigateTab('clients')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Ver Clientes
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ações Rápidas • {companySettings?.name || 'Gestão do Provedor'}
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('provedor')}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition"
          >
            Personalizar Nome & Logo →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={onOpenNewClient}
            className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Novo Cliente</span>
          </button>

          <button
            onClick={onOpenNewOrder ? onOpenNewOrder : () => onNavigateTab('service_orders')}
            className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold transition"
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span>Nova O.S.</span>
          </button>

          <button
            onClick={() => onNavigateTab('plans')}
            className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold transition"
          >
            <Gauge className="w-4 h-4 shrink-0" />
            <span>Novo Plano</span>
          </button>

          <button
            onClick={() => onNavigateTab('finance')}
            className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition"
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>Faturas / Pix</span>
          </button>

          <button
            onClick={() => onNavigateTab('mikrotik')}
            className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold transition"
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span>MikroTik RouterOS</span>
          </button>

          <button
            onClick={() => onNavigateTab('finance')}
            className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-bold transition"
          >
            <DollarSign className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Financeiro & Carnês</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Clientes */}
        <div 
          onClick={() => onNavigateTab('clients')}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-amber-500/40 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Clientes Cadastrados</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{stats?.totalClients || 0}</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              100% rurais
            </span>
          </div>
          <div className="mt-3 flex items-center space-x-3 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span className="flex items-center text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              {stats?.activeClients || 0} Ativos
            </span>
            <span className="flex items-center text-red-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
              {stats?.blockedClients || 0} Bloqueados
            </span>
          </div>
        </div>

        {/* Card 2: Conexões Ativas MikroTik (Clientes Online) */}
        <div 
          onClick={() => onNavigateTab('active_clients')}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-cyan-500/40 cursor-pointer transition shadow-sm group"
          title="Clique para listar todas as sessões e clientes online no MikroTik"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Online no MikroTik</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-cyan-400 tracking-tight flex items-center">
              {stats?.onlineSessions || 0}
              <span className="ml-2 text-xs font-normal text-slate-400">sessões PPPoE</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300">
              RouterOS
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span>Uptime do Roteador:</span>
            <span className="font-mono text-cyan-300">{mikrotikConfig?.uptime || '42d 18h'}</span>
          </div>
        </div>

        {/* Card 3: Faturamento Recebido */}
        <div 
          onClick={() => onNavigateTab('finance')}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-emerald-500/40 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Faturamento Recebido</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(stats?.monthlyRevenue || 0)}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Pix / Boletos</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span>A Receber no Mês:</span>
            <span className="text-slate-300 font-medium">{formatCurrency(stats?.pendingRevenue || 0)}</span>
          </div>
        </div>

        {/* Card 4: Ordens de Serviço & Suporte */}
        <div 
          onClick={() => onNavigateTab('service_orders')}
          className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-amber-500/40 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">O.S. em Aberto</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">
              {stats?.openTickets || 0}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
              Chamados
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span>Técnicos em Campo:</span>
            <span className="text-emerald-400 font-semibold">3 Ativos</span>
          </div>
        </div>
      </div>

      {/* Monthly Projected Revenue Chart (Recharts) */}
      <RevenueProjectionChart
        invoices={invoices}
        clients={clients}
        stats={stats}
        onNavigateFinance={() => onNavigateTab('finance')}
      />

      {/* Middle Row: MikroTik RouterOS Monitor & Recent Service Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RouterOS Live Telemetry Widget */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">MikroTik RouterOS - Telemetria em Tempo Real</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {mikrotikConfig?.routerModel || 'CCR1009-7G-1C-1S+'} • {mikrotikConfig?.routerOsVersion || 'v7.14'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('mikrotik')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
            >
              <span>Gerenciar Router</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-5">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Uso da CPU</span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-lg font-bold text-white font-mono">{mikrotikConfig?.cpuLoad || 8}%</span>
                <span className="text-[10px] text-emerald-400">Normal</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${mikrotikConfig?.cpuLoad || 8}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Memória Livre</span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-lg font-bold text-white font-mono">{mikrotikConfig?.freeMemoryMb || 942} MB</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Secrets Criadas</span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-lg font-bold text-white font-mono">{clients.length}</span>
                <span className="text-[10px] text-slate-400">/ppp secret</span>
              </div>
              <span className="text-[10px] text-emerald-400 block mt-2">100% Sincronizadas</span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Porta API</span>
              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-lg font-bold text-cyan-400 font-mono">{mikrotikConfig?.port || 8728}</span>
              </div>
              <span className="text-[10px] text-emerald-400 block mt-2">Socket Ativo</span>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                Regra de corte automático configurada: <span className="font-mono text-amber-300">profile=bloqueados</span>
              </span>
            </div>
            <span className="text-slate-400 hidden sm:inline">Desconexão forçada automática ativada</span>
          </div>
        </div>

        {/* Recent Service Orders Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Ordens de Serviço Recentes</h3>
              </div>
              <button
                onClick={() => onNavigateTab('service_orders')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1"
              >
                <span>Ver todas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {recentOrders.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nenhuma O.S. recente.</p>
              ) : (
                recentOrders.map(order => (
                  <div key={order.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 font-mono">{order.protocol}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        order.status === 'concluida' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate">{order.clientName}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{order.type.replace('_', ' ')}</span>
                      <span>{order.technicianName.split(' ')[0]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={onOpenNewOrder ? onOpenNewOrder : () => onNavigateTab('service_orders')}
            className="w-full mt-3 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            + Abrir Nova Chamada
          </button>
        </div>
      </div>

      {/* Bottom Row: Towers Overview & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transmission & Distribution Towers Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Torres & POPs de Transmissão</h3>
            </div>
            <button
              onClick={() => onNavigateTab('towers')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Ver todas ({towers.length})
            </button>
          </div>

          <div className="space-y-3 mt-4">
            {towers.map(tower => (
              <div key={tower.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">{tower.name}</h4>
                    <p className="text-[11px] text-slate-400">{tower.location}</p>
                  </div>
                  <span className="flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{tower.frequency}</span>
                  <span className="font-mono text-cyan-300 font-medium">{tower.activeClients} clientes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices & Billing Activity */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Faturas Recentes & Cobrança</h3>
            </div>
            <button
              onClick={() => onNavigateTab('finance')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
            >
              <span>Ver todas as faturas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Plano</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Nenhuma fatura registrada ainda.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-medium text-white">{invoice.clientName}</td>
                    <td className="py-3 px-3 text-slate-400">{invoice.planName}</td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-200">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{invoice.dueDate}</td>
                    <td className="py-3 px-3">
                      {invoice.status === 'paga' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Paga
                        </span>
                      )}
                      {invoice.status === 'pendente' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Pendente
                        </span>
                      )}
                      {invoice.status === 'atrasada' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                          Atrasada (Corte)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectInvoice(invoice)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium text-[11px] transition"
                      >
                        Ver Pix / Boleto
                      </button>
                    </td>
                  </tr>
                )))
              }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
