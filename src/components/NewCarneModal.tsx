import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, Search, ChevronDown } from 'lucide-react';
import { Client, Plan } from '../types/index.js';

interface NewCarneModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  plans: Plan[];
  onCarneCreated: (newCarne: any) => void;
}

export const NewCarneModal: React.FC<NewCarneModalProps> = ({
  isOpen,
  onClose,
  clients,
  plans,
  onCarneCreated
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [firstDueDate, setFirstDueDate] = useState<string>('');
  const [installmentsCount, setInstallmentsCount] = useState<number>(12); // Quantidade de parcelas (padrão 12 ou configurável)
  const [description, setDescription] = useState<string>('Mensalidade de Internet - Carnê');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Default date: today's date formatted as YYYY-MM-DD
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setFirstDueDate(`${yyyy}-${mm}-${dd}`);
      
      setInstallmentsCount(12);
      setDescription('Mensalidade de Internet - Carnê');
      setClientSearch('');
      setIsDropdownOpen(false);

      if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id);
        setClientSearch(`${clients[0].name} - ${clients[0].document}`);
      }
    }
  }, [isOpen, clients]);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const plan = plans.find(p => p.id === selectedClient?.planId) || plans[0];
      const res = await fetch('/api/carnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          firstDueDate,
          installmentsCount: Number(installmentsCount) || 12,
          description,
          installmentAmount: plan ? plan.price : 89.90
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onCarneCreated(data.carne);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar carnê');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Modal Card conforme a imagem do usuário */}
      <div className="bg-white text-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header com título e X vermelho/cinza */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">
            Cadastrar Carnê
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

          {/* Linha com 2 Colunas: Data da Primeira Parcela e Parcelas */}
          <div className="grid grid-cols-2 gap-3">
            {/* Coluna 1: Data da Primeira Parcela */}
            <div>
              <label className="block text-slate-600 font-medium mb-1.5 text-xs">
                Data da Primeira Parcela
              </label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:outline-none focus:border-sky-500 shadow-xs"
                  required
                />
              </div>
            </div>

            {/* Coluna 2: Parcelas (LOCAL PARA ESCOLHER A QUANTIDADE DE PARCELAS!) */}
            <div>
              <label className="block text-slate-600 font-medium mb-1.5 text-xs">
                Parcelas
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-800 text-xs focus:outline-none focus:border-sky-500 shadow-xs font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ex: 12 parcelas (1/12 até 12/12)
              </span>
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
              placeholder="Mensalidade de Internet - Carnê"
              required
            />
          </div>

          {/* Botão de Envio: ✓ Cadastrar conforme a imagem */}
          <div className="pt-4 flex items-center justify-end">
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
