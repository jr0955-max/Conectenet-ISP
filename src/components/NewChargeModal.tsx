import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, Search, ChevronDown, DollarSign } from 'lucide-react';
import { Client, Plan } from '../types/index.js';

interface NewChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  plans: Plan[];
  onChargeCreated: (newInvoice: any) => void;
  initialClientId?: string;
  initialReferenceMonth?: string;
}

export const NewChargeModal: React.FC<NewChargeModalProps> = ({
  isOpen,
  onClose,
  clients,
  plans,
  onChargeCreated,
  initialClientId,
  initialReferenceMonth
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [referenceMonth, setReferenceMonth] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [amount, setAmount] = useState<number>(89.90);
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('Mensalidade de Internet - Cobrança');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [markAsPaidNow, setMarkAsPaidNow] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDueDate(`${yyyy}-${mm}-${dd}`);

      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStr = `${String(prevMonth.getMonth() + 1).padStart(2, '0')}/${prevMonth.getFullYear()}`;
      const defaultMonth = initialReferenceMonth || prevMonthStr;
      setReferenceMonth(defaultMonth);

      setDescription(`Mensalidade de Internet - Cobrança ${defaultMonth}`);
      setMarkAsPaidNow(false);
      setIsDropdownOpen(false);

      const targetClient = clients.find(c => c.id === initialClientId) || clients[0];
      if (targetClient) {
        setSelectedClientId(targetClient.id);
        setClientSearch(`${targetClient.name} - ${targetClient.document}`);
        const plan = plans.find(p => p.id === targetClient.planId) || plans[0];
        const price = plan ? plan.price : 89.90;
        setAmount(price);
        setFineAmount(Math.round(price * 0.02 * 100) / 100);
      }
    }
  }, [isOpen, initialClientId, initialReferenceMonth, clients, plans]);

  if (!isOpen) return null;

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.document.includes(clientSearch) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setClientSearch(`${client.name} - ${client.document}`);
    setIsDropdownOpen(false);
    const plan = plans.find(p => p.id === client.planId) || plans[0];
    const price = plan ? plan.price : 89.90;
    setAmount(price);
    setFineAmount(Math.round(price * 0.02 * 100) / 100);
  };

  const totalCalculated = Math.max(0, amount + fineAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clientId: selectedClientId,
        amount: totalCalculated,
        dueDate,
        referenceMonth,
        status: markAsPaidNow ? 'paga' : 'pendente',
        description,
        fineAmount
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onChargeCreated(data.invoice);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar cobrança');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Modal Card conforme o padrão da imagem */}
      <div className="bg-white text-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header com título e X vermelho */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Cadastrar Cobrança
          </h3>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition p-1 rounded-md"
            title="Fechar"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4 text-xs">
          
          {/* Campo 1: Cliente com busca e dropdown */}
          <div className="relative">
            <label className="block text-slate-600 font-medium mb-1.5 text-xs">
              Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full px-3 py-2 pr-8 border border-sky-400 rounded bg-white text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown de Clientes */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg z-20">
                {filteredClients.length === 0 ? (
                  <div className="p-3 text-slate-400 text-center">Nenhum cliente encontrado</div>
                ) : (
                  filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center justify-between border-b border-slate-100 last:border-b-0 ${
                        selectedClientId === c.id ? 'bg-sky-50 font-semibold text-sky-900' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2 shrink-0">{c.document}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Linha com 2 Colunas: Mês que está devendo e Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            {/* Coluna 1: Mês que está devendo */}
            <div>
              <label className="block text-slate-600 font-medium mb-1.5 text-xs">
                Mês que está devendo (Referência)
              </label>
              <select
                value={referenceMonth}
                onChange={(e) => {
                  setReferenceMonth(e.target.value);
                  setDescription(`Mensalidade de Internet - Cobrança ${e.target.value}`);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs font-mono focus:outline-none focus:border-sky-500 shadow-xs"
                required
              >
                {monthOptions.map(m => (
                  <option key={m} value={m}>Mês {m}</option>
                ))}
              </select>
            </div>

            {/* Coluna 2: Data de Vencimento */}
            <div>
              <label className="block text-slate-600 font-medium mb-1.5 text-xs">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:outline-none focus:border-sky-500 shadow-xs"
                required
              />
            </div>
          </div>

          {/* Linha com 2 Colunas: Valor Original e Multa/Juros */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1.5 text-xs">
                Valor da Mensalidade (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs font-mono font-bold focus:outline-none focus:border-sky-500 shadow-xs"
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1.5 text-xs">
                Multa / Juros por Atraso (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fineAmount}
                onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs font-mono focus:outline-none focus:border-sky-500 shadow-xs"
              />
            </div>
          </div>

          {/* Campo 3: Descrição */}
          <div>
            <label className="block text-slate-600 font-medium mb-1.5 text-xs">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:outline-none focus:border-sky-500 shadow-xs"
              placeholder="Mensalidade de Internet - Cobrança"
              required
            />
          </div>

          {/* Checkbox: Quitar no Balcão */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={markAsPaidNow}
                onChange={(e) => setMarkAsPaidNow(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Cliente pagando agora no balcão (dar baixa imediata e desbloquear no MikroTik)
              </span>
            </label>
          </div>

          {/* Botão de Envio: ✓ Cadastrar conforme a imagem */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-500">Total: </span>
              <span className="font-bold font-mono text-emerald-700 text-sm">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCalculated)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded text-xs font-semibold transition border border-transparent hover:border-emerald-200 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Cadastrando...' : 'Cadastrar'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
