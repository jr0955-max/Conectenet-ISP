import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Zap, 
  QrCode, 
  Copy, 
  Check, 
  Printer, 
  Share2, 
  Percent, 
  AlertCircle 
} from 'lucide-react';
import { Client, Plan, Invoice, CompanySettings } from '../types/index.js';

interface SingleChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  plans: Plan[];
  companySettings?: CompanySettings;
  onChargeCreated: (newInvoice: Invoice) => void;
  initialClientId?: string;
  initialReferenceMonth?: string;
}

export const SingleChargeModal: React.FC<SingleChargeModalProps> = ({
  isOpen,
  onClose,
  clients,
  plans,
  companySettings,
  onChargeCreated,
  initialClientId,
  initialReferenceMonth
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [referenceMonth, setReferenceMonth] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [markAsPaidNow, setMarkAsPaidNow] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [copiedPix, setCopiedPix] = useState<boolean>(false);

  // Month options generator for past 12 months + current
  const monthOptions = React.useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const yStr = d.getFullYear();
      list.push(`${mStr}/${yStr}`);
    }
    return list;
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCreatedInvoice(null);
      setCopiedPix(false);
      
      const client = clients.find(c => c.id === initialClientId) || clients[0];
      if (client) {
        setSelectedClientId(client.id);
        const plan = plans.find(p => p.id === client.planId) || plans[0];
        const price = plan ? plan.price : 89.90;
        setBaseAmount(price);
        
        // Default to previous month if overdue, or initial
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = `${String(prevMonth.getMonth() + 1).padStart(2, '0')}/${prevMonth.getFullYear()}`;
        const refM = initialReferenceMonth || prevMonthStr;
        setReferenceMonth(refM);

        // Due date default to today or in 3 days
        const todayStr = now.toISOString().split('T')[0];
        setDueDate(todayStr);

        // Pre-fill suggested 2% fine + 1% interest if overdue
        const suggestedFine = Math.round(price * 0.02 * 100) / 100;
        setFineAmount(suggestedFine);
        setInterestAmount(1.00);
        setDiscountAmount(0);
        setDescription(`Cobrança de mensalidade em atraso ref. ao mês ${refM}`);
        setMarkAsPaidNow(false);
      }
    }
  }, [isOpen, initialClientId, initialReferenceMonth, clients, plans]);

  // Update base amount when client changes
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const plan = plans.find(p => p.id === client.planId) || plans[0];
      const price = plan ? plan.price : 89.90;
      setBaseAmount(price);
      const suggestedFine = Math.round(price * 0.02 * 100) / 100;
      setFineAmount(suggestedFine);
      setDescription(`Cobrança de mensalidade em atraso ref. ao mês ${referenceMonth}`);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedPlan = selectedClient ? plans.find(p => p.id === selectedClient.planId) : null;

  const totalAmount = Math.max(0, baseAmount + fineAmount + interestAmount - discountAmount);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        clientId: selectedClientId,
        amount: totalAmount,
        dueDate,
        referenceMonth,
        status: markAsPaidNow ? 'paga' : 'pendente',
        description,
        fineAmount,
        interestAmount
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setCreatedInvoice(data.invoice);
      onChargeCreated(data.invoice);
    } catch (err: any) {
      alert(err.message || 'Erro ao emitir cobrança');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPix = () => {
    if (!createdInvoice) return;
    navigator.clipboard.writeText(createdInvoice.pixCopyPaste);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const getWhatsAppLink = () => {
    if (!createdInvoice || !selectedClient) return '';
    const text = `Olá, *${selectedClient.name}*! Segue a cobrança da sua mensalidade de internet em atraso ref. ao mês *${createdInvoice.referenceMonth}* no valor de *${formatCurrency(createdInvoice.amount)}* com vencimento em *${createdInvoice.dueDate}*.\n\nPara pagar agora via Pix com baixa e liberação automática:\n\n${createdInvoice.pixCopyPaste}`;
    const cleanPhone = selectedClient.phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Emitir Cobrança de Mês em Atraso
              </h3>
              <p className="text-xs text-slate-400">
                Gere uma cobrança avulsa referente ao mês exato que o cliente está devendo com juros e multa.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If invoice was just created, show instant success & payment actions */}
        {createdInvoice ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Cobrança {createdInvoice.id} gerada com sucesso!</span>
              </div>
              <p className="text-xs text-slate-300">
                Cliente: <strong className="text-white">{createdInvoice.clientName}</strong> | 
                Mês Devido: <strong className="text-white font-mono">{createdInvoice.referenceMonth}</strong> | 
                Valor Total: <strong className="text-emerald-300 font-mono text-sm">{formatCurrency(createdInvoice.amount)}</strong>
              </p>
              {createdInvoice.status === 'paga' ? (
                <div className="p-2.5 bg-emerald-500/20 rounded-lg text-xs text-emerald-200 flex items-center space-x-2 border border-emerald-500/30">
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span><strong>Baixa imediata confirmada:</strong> Mensalidade liquidada no balcão e sinal/desbloqueio MikroTik atualizado!</span>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-500/10 rounded-lg text-xs text-blue-200 flex items-center space-x-2 border border-blue-500/20">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Cobrança aguardando pagamento. Envie o Pix copia-e-cola ou link WhatsApp para o cliente.</span>
                </div>
              )}
            </div>

            {/* Pix & WhatsApp Quick Sharing */}
            {createdInvoice.status !== 'paga' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Pix Copia e Cola para Pagamento Rápido</span>
                  </span>
                  <button
                    onClick={copyPix}
                    className="flex items-center space-x-1 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition"
                  >
                    {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar Pix'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-300 break-all select-all border border-slate-800">
                  {createdInvoice.pixCopyPaste}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Linha Digitável / Boleto: <span className="text-slate-200">{createdInvoice.barcode}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-800">
              {createdInvoice.status !== 'paga' && selectedClient && (
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar Cobrança via WhatsApp</span>
                </a>
              )}
              <button
                onClick={() => {
                  setCreatedInvoice(null);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Form for Creating Single Overdue Charge */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Client */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cliente em Atraso *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  {clients.map(c => {
                    const plan = plans.find(p => p.id === c.planId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} — CPF: {c.document} ({c.status === 'blocked' ? 'BLOQUEADO' : 'ATIVO'}) - Plano: {plan?.name || 'Padrão'}
                      </option>
                    );
                  })}
                </select>
                {selectedClient && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Plano: <strong className="text-cyan-300">{selectedPlan?.name}</strong></span>
                    <span>Vencimento padrão: <strong className="text-white">Dia {selectedClient.dueDay}</strong></span>
                    <span className={selectedClient.status === 'blocked' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      Status: {selectedClient.status === 'blocked' ? 'Bloqueado por Inadimplência' : 'Conexão Ativa'}
                    </span>
                  </div>
                )}
              </div>

              {/* Month Owing (Mês que está devendo) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mês que está devendo (Referência) *
                </label>
                <div className="relative">
                  <select
                    value={referenceMonth}
                    onChange={(e) => {
                      setReferenceMonth(e.target.value);
                      setDescription(`Cobrança de mensalidade em atraso ref. ao mês ${e.target.value}`);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  >
                    {monthOptions.map(m => (
                      <option key={m} value={m}>Mês {m}</option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Selecione o mês do débito pendente do cliente
                </span>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Data de Vencimento desta Cobrança *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Prazo para quitação da cobrança gerada
                </span>
              </div>

              {/* Base Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor Original da Mensalidade (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Multa por Atraso */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Multa por Atraso (R$)</span>
                  <span className="text-[10px] text-slate-400">Sugestão: 2%</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Juros de Mora */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Juros de Mora / Encargos (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Desconto */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Desconto Concedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description / Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo / Observação da Cobrança
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Cobrança referente à fatura em atraso do mês 05/2026 negociada no balcão"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Total Calculation Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Valor Total da Cobrança</span>
                <span className="text-xs text-slate-500">
                  Original: {formatCurrency(baseAmount)} + Multa: {formatCurrency(fineAmount)} + Juros: {formatCurrency(interestAmount)} - Desconto: {formatCurrency(discountAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Option to pay immediately at the desk */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsPaidNow}
                  onChange={(e) => setMarkAsPaidNow(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Cliente está pagando agora no balcão (Dar baixa imediata)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Se marcado, a cobrança já será registrada como <strong>Paga</strong> e a conexão no MikroTik será desbloqueada na hora.
                  </span>
                </div>
              </label>
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalAmount <= 0}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-950/40 disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Emitindo...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{markAsPaidNow ? 'Dar Baixa & Quitar Cobrança' : 'Emitir Cobrança Avulsa'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
