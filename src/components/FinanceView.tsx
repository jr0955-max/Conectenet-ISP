import React, { useState } from 'react';
import { 
  DollarSign, 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Plus, 
  Zap, 
  FileText, 
  ArrowUpRight, 
  Send, 
  QrCode, 
  Check, 
  Copy,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Invoice, Client, Plan, SystemStats } from '../types/index.js';

interface FinanceViewProps {
  invoices: Invoice[];
  clients: Client[];
  plans: Plan[];
  stats: SystemStats | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenNewInvoice: () => void;
  onSimulateWebhook: (invoiceId?: string) => Promise<any>;
  onPayInvoiceDirectly: (invoiceId: string) => Promise<any>;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  invoices,
  clients,
  plans,
  stats,
  onSelectInvoice,
  onOpenNewInvoice,
  onSimulateWebhook,
  onPayInvoiceDirectly
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paga' | 'pendente' | 'atrasada'>('all');
  const [selectedInvoiceForWebhook, setSelectedInvoiceForWebhook] = useState<string>('');
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientDocument.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleTriggerWebhook = async () => {
    setIsProcessingWebhook(true);
    setWebhookResult(null);
    try {
      const res = await onSimulateWebhook(selectedInvoiceForWebhook || undefined);
      setWebhookResult(res);
    } catch (err: any) {
      setWebhookResult({ error: err.message || 'Falha ao processar webhook' });
    } finally {
      setIsProcessingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recebido */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Recebido no Mês</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              {formatCurrency(stats?.monthlyRevenue || 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {invoices.filter(i => i.status === 'paga').length} faturas liquidadas via Pix / Boleto
          </div>
        </div>

        {/* A Vencer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">A Receber (A Vencer)</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono tracking-tight">
              {formatCurrency(stats?.pendingRevenue || 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {invoices.filter(i => i.status === 'pendente').length} faturas aguardando pagamento
          </div>
        </div>

        {/* Inadimplente / Atrasado */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Em Atraso (Corte Ativo)</span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-red-400 font-mono tracking-tight">
              {formatCurrency(stats?.overdueRevenue || 0)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {invoices.filter(i => i.status === 'atrasada').length} faturas com regras de bloqueio aplicadas
          </div>
        </div>
      </div>

      {/* Webhook Simulator Section (Key Feature for ISP Automation) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/30 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-md shadow-emerald-950">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Simulador de Webhook de Pagamento Instantâneo</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Asaas / Mercado Pago
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simule o recebimento da notificação de pagamento da adquirente para testar a baixa automática e o <strong>desbloqueio imediato no MikroTik</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedInvoiceForWebhook}
              onChange={(e) => setSelectedInvoiceForWebhook(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 max-w-[240px]"
            >
              <option value="">Automático (Fatura Atrasada)</option>
              {invoices.filter(i => i.status !== 'paga').map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} - {inv.clientName.split(' ')[0]} ({formatCurrency(inv.amount)})
                </option>
              ))}
            </select>

            <button
              onClick={handleTriggerWebhook}
              disabled={isProcessingWebhook}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg transition shadow-md shadow-emerald-950 disabled:opacity-50 flex items-center space-x-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isProcessingWebhook ? 'Disparando...' : 'Disparar Webhook Pix'}</span>
            </button>
          </div>
        </div>

        {/* Webhook Response Preview */}
        {webhookResult && (
          <div className={`p-4 rounded-xl border text-xs font-mono transition ${
            webhookResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-white">
                  {webhookResult.message}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Status 200 OK</span>
            </div>

            {webhookResult.unblocked && (
              <div className="mt-2 p-2 bg-emerald-500/10 rounded border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>
                  <strong>Ação MikroTik Executada:</strong> /ppp secret set profile=default &amp; /ppp active remove. Conexão restaurada com sucesso!
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoices List Header & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Faturas Emitidas & Carnês</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Controle de cobranças mensais, Pix Dinâmico e boletos bancários com linha digitável.
            </p>
          </div>

          <button
            onClick={onOpenNewInvoice}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Emitir Nova Fatura</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento ou número da fatura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todos os Status ({invoices.length})</option>
              <option value="paga">Pagas ({invoices.filter(i => i.status === 'paga').length})</option>
              <option value="pendente">Pendentes ({invoices.filter(i => i.status === 'pendente').length})</option>
              <option value="atrasada">Atrasadas / Corte ({invoices.filter(i => i.status === 'atrasada').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Fatura Nº</th>
                <th className="py-3 px-4">Cliente / CPF</th>
                <th className="py-3 px-4">Plano Contratado</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Vencimento</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-cyan-300">
                      {invoice.id}
                      <div className="text-[10px] text-slate-500">Mês: {invoice.referenceMonth}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{invoice.clientName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{invoice.clientDocument}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {invoice.planName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {invoice.dueDate}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {invoice.status === 'paga' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Paga
                        </span>
                      )}
                      {invoice.status === 'pendente' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          A Vencer
                        </span>
                      )}
                      {invoice.status === 'atrasada' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Atrasada
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {invoice.status !== 'paga' && (
                          <button
                            onClick={() => onPayInvoiceDirectly(invoice.id)}
                            className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                            title="Dar baixa manual nesta fatura"
                          >
                            Dar Baixa
                          </button>
                        )}
                        <button
                          onClick={() => onSelectInvoice(invoice)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium text-[11px] transition flex items-center space-x-1"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Ver Pix</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
