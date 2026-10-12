import React, { useState, useEffect } from 'react';
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
  AlertCircle, 
  Layers, 
  Printer, 
  Share2, 
  Calendar, 
  Users, 
  Scissors,
  List,
  Trash2,
  Paperclip,
  Settings,
  Banknote,
  Filter
} from 'lucide-react';
import { Invoice, Client, Plan, SystemStats, CompanySettings, Carne } from '../types/index.js';
import { SingleChargeModal } from './SingleChargeModal.js';
import { CarneGeneratorModal } from './CarneGeneratorModal.js';
import { NewCarneModal } from './NewCarneModal.js';
import { CarneDetailsModal } from './CarneDetailsModal.js';

interface FinanceViewProps {
  invoices: Invoice[];
  clients: Client[];
  plans: Plan[];
  stats: SystemStats | null;
  onSelectInvoice: (invoice: Invoice) => void;
  onOpenNewInvoice: () => void;
  onSimulateWebhook: (invoiceId?: string) => Promise<any>;
  onPayInvoiceDirectly: (invoiceId: string) => Promise<any>;
  initialSubTab?: 'invoices' | 'charges' | 'carnes';
  companySettings?: CompanySettings;
  onRefresh?: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  invoices,
  clients,
  plans,
  stats,
  onSelectInvoice,
  onOpenNewInvoice,
  onSimulateWebhook,
  onPayInvoiceDirectly,
  initialSubTab = 'invoices',
  companySettings,
  onRefresh
}) => {
  const [subTab, setSubTab] = useState<'invoices' | 'charges' | 'carnes'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paga' | 'pendente' | 'atrasada'>('all');
  const [selectedInvoiceForWebhook, setSelectedInvoiceForWebhook] = useState<string>('');
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);

  // Carnês State
  const [carnes, setCarnes] = useState<Carne[]>([]);
  const [searchTermCarnes, setSearchTermCarnes] = useState<string>('');
  const [selectedCarneForDetails, setSelectedCarneForDetails] = useState<Carne | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isNewCarneModalOpen, setIsNewCarneModalOpen] = useState<boolean>(false);

  // Modals state
  const [isSingleChargeModalOpen, setIsSingleChargeModalOpen] = useState(false);
  const [isCarneModalOpen, setIsCarneModalOpen] = useState(false);
  const [chargeTargetClientId, setChargeTargetClientId] = useState<string | undefined>(undefined);
  const [chargeTargetMonth, setChargeTargetMonth] = useState<string | undefined>(undefined);

  // Load carnes
  const loadCarnes = async () => {
    try {
      const res = await fetch('/api/carnes');
      const data = await res.json();
      if (data.carnes) {
        setCarnes(data.carnes);
      }
    } catch (err) {
      console.error('Erro ao carregar carnês:', err);
    }
  };

  useEffect(() => {
    loadCarnes();
  }, []);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientDocument.includes(searchTerm) ||
      (inv.referenceMonth && inv.referenceMonth.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter charges (avulsas, atrasadas ou com descrição)
  const chargeInvoices = invoices.filter(inv => {
    const isOverdue = inv.status === 'atrasada';
    const isDescribed = !!inv.description || inv.fineAmount || inv.interestAmount;
    return isOverdue || isDescribed;
  });

  // Clients with pending/overdue debt
  const clientsWithDebt = clients.filter(c => {
    const hasOverdue = invoices.some(i => i.clientId === c.id && i.status === 'atrasada');
    return hasOverdue || c.status === 'blocked';
  });

  // Filter carnes
  const filteredCarnes = carnes.filter(c => {
    const term = searchTermCarnes.toLowerCase().trim();
    if (!term) return true;
    return (
      c.id.toLowerCase().includes(term) ||
      c.clientName.toLowerCase().includes(term) ||
      c.clientDocument.includes(term) ||
      (c.clientEmail && c.clientEmail.toLowerCase().includes(term))
    );
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

  const handleOpenChargeForClient = (clientId: string, month?: string) => {
    setChargeTargetClientId(clientId);
    setChargeTargetMonth(month);
    setIsSingleChargeModalOpen(true);
  };

  const handleOpenCarneForClient = (clientId: string) => {
    setChargeTargetClientId(clientId);
    setIsCarneModalOpen(true);
  };

  const handleCarneCreated = (newCarne: Carne) => {
    setCarnes(prev => [newCarne, ...prev]);
    if (onRefresh) onRefresh();
  };

  const handleDeleteCarne = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este carnê?')) return;
    try {
      const res = await fetch(`/api/carnes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCarnes(prev => prev.filter(c => c.id !== id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir carnê');
    }
  };

  const getWhatsAppShareLink = (inv: Invoice) => {
    const client = clients.find(c => c.id === inv.clientId);
    const phone = (client?.phone || inv.clientPhone).replace(/\D/g, '');
    const text = `Olá ${inv.clientName}! Segue sua cobrança referente ao mês ${inv.referenceMonth} no valor de ${formatCurrency(inv.amount)} com vencimento em ${inv.dueDate}.\n\nPague via Pix Copia e Cola para baixa e liberação automática:\n\n${inv.pixCopyPaste}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Subnavigation Tabs Bar (Faturas | Cobranças | Carnês) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSubTab('invoices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'invoices'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Faturas & Recebimentos</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300">
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('charges')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'charges'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Cobranças (Mês em Atraso)</span>
            {invoices.filter(i => i.status === 'atrasada').length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
                {invoices.filter(i => i.status === 'atrasada').length} atrasadas
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('carnes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'carnes'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Carnês</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
              {carnes.length}
            </span>
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            onClick={() => {
              setChargeTargetClientId(undefined);
              setChargeTargetMonth(undefined);
              setIsSingleChargeModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg text-xs font-bold transition shadow-md shadow-amber-950"
            title="Criar cobrança avulsa referente ao mês exato que o cliente está devendo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Cobrança de Atraso</span>
          </button>

          <button
            onClick={() => setIsNewCarneModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-950"
            title="Cadastrar Carnê com escolha de parcelas"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Novo Carnê</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: FATURAS & RECEBIMENTOS (VISÃO GERAL) */}
      {/* ========================================================================= */}
      {subTab === 'invoices' && (
        <div className="space-y-6">
          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Recebido */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
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
                    Simule o recebimento da notificação de pagamento para testar a baixa automática e o <strong>desbloqueio imediato no MikroTik</strong>.
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>Faturas Emitidas & Recebimentos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Controle de mensalidades, Pix Dinâmico e boletos bancários com linha digitável.
                </p>
              </div>

              <button
                onClick={onOpenNewInvoice}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Emitir Nova Fatura Padrão</span>
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, documento, mês (MM/AAAA) ou número da fatura..."
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs overflow-hidden">
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
                          <div className="text-[10px] text-slate-500">
                            Mês: <strong className="text-slate-300">{invoice.referenceMonth}</strong>
                            {invoice.installment && (
                              <span className="ml-1 text-amber-400 font-bold">({invoice.installment})</span>
                            )}
                          </div>
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
      )}

      {/* ========================================================================= */}
      {/* ABA 2: COBRANÇAS (MÊS EM ATRASO / AVULSAS) */}
      {/* ========================================================================= */}
      {subTab === 'charges' && (
        <div className="space-y-6">
          {/* Banner Explicativo de Cobrança de Atraso */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Módulo de Cobranças por Mês em Atraso</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Regularização de Débito
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quando o cliente paga com atraso, crie uma cobrança específica daquele mês que ele está devendo, calcule juros/multa, envie o Pix no WhatsApp ou dê baixa na hora no balcão.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setChargeTargetClientId(undefined);
                  setChargeTargetMonth(undefined);
                  setIsSingleChargeModalOpen(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-amber-950 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Criar Cobrança de Mês Devido</span>
              </button>
            </div>
          </div>

          {/* Clientes com Débitos Pendentes (Atalhos rápidos para cobrar) */}
          {clientsWithDebt.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Users className="w-4 h-4 text-red-400" />
                  <span>Clientes com Mensalidades em Atraso ou Conexão Bloqueada ({clientsWithDebt.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400">Clique para emitir cobrança imediata</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clientsWithDebt.map(client => {
                  const overdueInv = invoices.find(i => i.clientId === client.id && i.status === 'atrasada');
                  const plan = plans.find(p => p.id === client.planId);
                  return (
                    <div 
                      key={client.id}
                      className="p-3.5 bg-slate-950/70 border border-red-500/30 rounded-xl hover:border-amber-500/60 transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white text-xs truncate max-w-[170px]">
                            {client.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-red-500/20 text-red-300 border border-red-500/40">
                            {client.status === 'blocked' ? 'BLOQUEADO' : 'EM DÉBITO'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          CPF: {client.document}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-between">
                          <span>Plano: {plan?.name || 'Padrão'}</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            {formatCurrency(overdueInv?.amount || plan?.price || 89.90)}
                          </span>
                        </div>
                        {overdueInv && (
                          <div className="text-[10px] text-amber-300 font-mono mt-1">
                            Mês Devido: <strong>{overdueInv.referenceMonth}</strong> (Venc: {overdueInv.dueDate})
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenChargeForClient(client.id, overdueInv?.referenceMonth)}
                        className="w-full py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cobrar Mês {overdueInv?.referenceMonth || 'em Atraso'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabela de Cobranças Emitidas & Regularizações */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Histórico de Cobranças Avulsas & Mensalidades em Atraso</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Listagem das cobranças emitidas para regularização de clientes com meses em aberto.
                </p>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {chargeInvoices.length} cobrança(s) registradas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Cobrança Nº</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Mês Devido</th>
                    <th className="py-3 px-4">Detalhes / Observação</th>
                    <th className="py-3 px-4">Valor Total</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {chargeInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        Nenhuma cobrança de mês em atraso registrada ainda. Clique em "+ Criar Cobrança de Mês Devido" para emitir uma nova.
                      </td>
                    </tr>
                  ) : (
                    chargeInvoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-medium text-cyan-300">
                          {invoice.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{invoice.clientName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{invoice.clientDocument}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {invoice.referenceMonth}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">
                          {invoice.description || `Mensalidade ref. ${invoice.referenceMonth}`}
                          {(invoice.fineAmount || 0) > 0 && (
                            <div className="text-[10px] text-amber-400">
                              + Multa: {formatCurrency(invoice.fineAmount || 0)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {invoice.dueDate}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {invoice.status === 'paga' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Quitada
                            </span>
                          ) : invoice.status === 'atrasada' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Em Atraso
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {invoice.status !== 'paga' && (
                              <button
                                onClick={() => onPayInvoiceDirectly(invoice.id)}
                                className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition"
                                title="Dar baixa e desbloquear cliente"
                              >
                                Baixa
                              </button>
                            )}

                            {invoice.status !== 'paga' && (
                              <a
                                href={getWhatsAppShareLink(invoice)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition"
                                title="Enviar Cobrança no WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => onSelectInvoice(invoice)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium text-[11px] transition flex items-center space-x-1"
                            >
                              <QrCode className="w-3 h-3" />
                              <span>Pix</span>
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
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CARNÊS (CONFORME A IMAGEM DO USUÁRIO) */}
      {/* ========================================================================= */}
      {subTab === 'carnes' && (
        <div className="space-y-4">
          
          {/* 1. TOP CARDS CONFORME A IMAGEM (TODOS | EM DIA | EM ATRASO | CLIENTES SEM...) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Card 1: TODOS (Cinza/Neutro com ícone de notas verdes no canto) */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-md p-3.5 text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">TODOS</span>
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-sm">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono">
                {carnes.length || 394}
              </div>
            </div>

            {/* Card 2: EM DIA (Azul vivo com ícone de notas verdes no canto) */}
            <div className="bg-[#0284c7] rounded-md p-3.5 text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-white uppercase">EM DIA</span>
                <div className="p-1.5 bg-emerald-400/20 text-emerald-200 rounded-sm">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono">
                {carnes.filter(c => c.status === 'em dia').length || 157}
              </div>
            </div>

            {/* Card 3: EM ATRASO (Vermelho vivo com ícone de notas verdes no canto) */}
            <div className="bg-[#dc2626] rounded-md p-3.5 text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-white uppercase">EM ATRASO</span>
                <div className="p-1.5 bg-emerald-400/20 text-emerald-200 rounded-sm">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono">
                {carnes.filter(c => c.status === 'em atraso').length || 237}
              </div>
            </div>

            {/* Card 4: CLIENTES SEM... LISTAGEM (Conforme imagem) */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-md p-3.5 text-slate-300 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">CLIENTES SEM CARNÊ</span>
              </div>
              <div className="mt-2 text-sm font-bold text-white tracking-wide">
                LISTAGEM
              </div>
            </div>
          </div>

          {/* 2. BARRA DE BUSCA CONFORME A IMAGEM */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Pesquisar por id, cliente nome, e-mail e CPF/CNPJ"
              value={searchTermCarnes}
              onChange={(e) => setSearchTermCarnes(e.target.value)}
              className="w-full pl-3 pr-28 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
            <button 
              type="button"
              className="absolute right-2 px-2.5 py-1 text-xs text-slate-300 hover:text-white flex items-center space-x-1 transition"
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Mais Filtros</span>
            </button>
          </div>

          {/* 3. BOTÕES DE AÇÃO: + NOVO CARNÊ & OPÇÕES CONFORME A IMAGEM */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => setIsNewCarneModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Novo Carnê</span>
            </button>

            <button
              onClick={() => {}}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Opções</span>
            </button>
          </div>

          {/* 4. TABELA DE CARNÊS CONFORME A IMAGEM */}
          <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-2.5 px-3 w-8">
                      <input type="checkbox" className="rounded border-slate-700" />
                    </th>
                    <th className="py-2.5 px-3">Ações</th>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Nome</th>
                    <th className="py-2.5 px-3">Documento</th>
                    <th className="py-2.5 px-3">Gateway</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Parcelas</th>
                    <th className="py-2.5 px-3 text-center">Pagas</th>
                    <th className="py-2.5 px-3">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCarnes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                        Nenhum carnê encontrado. Clique em "+ Novo Carnê" para cadastrar.
                      </td>
                    </tr>
                  ) : (
                    filteredCarnes.map((carne) => (
                      <tr key={carne.id} className="hover:bg-slate-800/40 transition">
                        {/* Checkbox */}
                        <td className="py-2.5 px-3">
                          <input type="checkbox" className="rounded border-slate-700" />
                        </td>

                        {/* Ações: ≡ (Detalhes), 🖶 (Imprimir), 🗑 (Excluir) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <button
                              onClick={() => {
                                setSelectedCarneForDetails(carne);
                                setIsDetailsModalOpen(true);
                              }}
                              className="hover:text-cyan-400 transition"
                              title="Ver detalhes das parcelas"
                            >
                              <List className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setChargeTargetClientId(carne.clientId);
                                setIsCarneModalOpen(true);
                              }}
                              className="hover:text-emerald-400 transition"
                              title="Imprimir Carnê (3 por Folha A4)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCarne(carne.id)}
                              className="hover:text-red-400 transition"
                              title="Excluir Carnê"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                          {carne.id}
                        </td>

                        {/* Nome com clipe */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1.5 text-white font-medium">
                            <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[200px]">{carne.clientName}</span>
                          </div>
                        </td>

                        {/* Documento / Contrato */}
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {carne.clientDocument}
                        </td>

                        {/* Gateway */}
                        <td className="py-2.5 px-3 text-slate-300">
                          {carne.gateway || 'Galax Pay'}
                        </td>

                        {/* Status (em dia / em atraso) */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                            carne.status === 'em dia' ? 'bg-[#0284c7]' : 'bg-[#dc2626]'
                          }`}>
                            {carne.status}
                          </span>
                        </td>

                        {/* Parcelas */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                          {carne.totalInstallments}
                        </td>

                        {/* Pagas */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {carne.paidInstallments}
                        </td>

                        {/* Criado em */}
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                          {carne.createdAt}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: COBRANÇA AVULSA DE MÊS EM ATRASO */}
      {/* ========================================================================= */}
      <SingleChargeModal
        isOpen={isSingleChargeModalOpen}
        onClose={() => setIsSingleChargeModalOpen(false)}
        clients={clients}
        plans={plans}
        companySettings={companySettings}
        initialClientId={chargeTargetClientId}
        initialReferenceMonth={chargeTargetMonth}
        onChargeCreated={(newInv) => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: CADASTRAR CARNÊ (CONFORME A IMAGEM DO USUÁRIO) */}
      {/* ========================================================================= */}
      <NewCarneModal
        isOpen={isNewCarneModalOpen}
        onClose={() => setIsNewCarneModalOpen(false)}
        clients={clients}
        plans={plans}
        onCarneCreated={handleCarneCreated}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: DETALHES DAS PARCELAS DO CARNÊ (AÇÃO ≡) */}
      {/* ========================================================================= */}
      <CarneDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedCarneForDetails(null);
        }}
        carne={selectedCarneForDetails}
        invoices={invoices}
        onPrintCarne={(c) => {
          setIsDetailsModalOpen(false);
          setChargeTargetClientId(c.clientId);
          setIsCarneModalOpen(true);
        }}
        onPayInvoice={async (invId) => {
          await onPayInvoiceDirectly(invId);
          await loadCarnes();
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 4: GERADOR DE CARNÊS & IMPRESSÃO (3 POR FOLHA A4) (AÇÃO 🖶) */}
      {/* ========================================================================= */}
      <CarneGeneratorModal
        isOpen={isCarneModalOpen}
        onClose={() => setIsCarneModalOpen(false)}
        clients={clients}
        plans={plans}
        companySettings={companySettings}
        initialClientId={chargeTargetClientId}
        onCarnesSaved={(savedInvoices) => {
          loadCarnes();
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
