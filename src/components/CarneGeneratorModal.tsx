import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Layers, 
  CheckCircle2, 
  Save, 
  Eye, 
  Scissors, 
  QrCode, 
  Building2, 
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Client, Plan, Invoice, CompanySettings, Carne } from '../types/index.js';

interface CarneGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  plans: Plan[];
  companySettings?: CompanySettings;
  onCarnesSaved?: (invoices: Invoice[]) => void;
  initialClientId?: string;
  targetCarne?: Carne | null;
  invoices?: Invoice[];
}

interface CarneSlip {
  installmentNumber: number;
  totalInstallments: number;
  label: string; // e.g. "01/12"
  referenceMonth: string; // e.g. "01/2026"
  dueDate: string; // e.g. "10/01/2026"
  amount: number;
  barcode: string;
  digitableLine: string;
  pixKey: string;
}

export const CarneGeneratorModal: React.FC<CarneGeneratorModalProps> = ({
  isOpen,
  onClose,
  clients,
  plans,
  companySettings,
  onCarnesSaved,
  initialClientId,
  targetCarne,
  invoices
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [installmentsCount, setInstallmentsCount] = useState<number>(12); // Padrão 12
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth() + 1);
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [dueDay, setDueDay] = useState<number>(10);
  const [installmentAmount, setInstallmentAmount] = useState<number>(89.90);
  const [instructions, setInstructions] = useState<string>(
    'Após o vencimento, cobrar juros de 1% a.m. e multa de 2%. Não receber após 30 dias do vencimento. Em caso de dúvidas, contate nosso suporte.'
  );
  const [viewMode, setViewMode] = useState<'config' | 'preview'>('preview');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);

      if (targetCarne) {
        // Se um carnê específico foi selecionado para visualização/impressão
        setSelectedClientId(targetCarne.clientId);
        setInstallmentsCount(targetCarne.totalInstallments); // Ex: 3 parcelas
        if (targetCarne.installmentAmount) {
          setInstallmentAmount(targetCarne.installmentAmount);
        }

        // Extrai dia, mês e ano do firstDueDate do carnê
        if (targetCarne.firstDueDate) {
          if (targetCarne.firstDueDate.includes('-')) {
            const parts = targetCarne.firstDueDate.split('-');
            if (parts.length === 3) {
              setStartYear(parseInt(parts[0], 10) || new Date().getFullYear());
              setStartMonth(parseInt(parts[1], 10) || new Date().getMonth() + 1);
              setDueDay(parseInt(parts[2], 10) || 10);
            }
          } else if (targetCarne.firstDueDate.includes('/')) {
            const parts = targetCarne.firstDueDate.split('/');
            if (parts.length === 3) {
              setDueDay(parseInt(parts[0], 10) || 10);
              setStartMonth(parseInt(parts[1], 10) || new Date().getMonth() + 1);
              setStartYear(parseInt(parts[2], 10) || new Date().getFullYear());
            }
          }
        }
      } else {
        const client = clients.find(c => c.id === initialClientId) || clients[0];
        if (client) {
          setSelectedClientId(client.id);
          const plan = plans.find(p => p.id === client.planId) || plans[0];
          setInstallmentAmount(plan ? plan.price : 89.90);
          setDueDay(client.dueDay || 10);
        }
      }
    }
  }, [isOpen, initialClientId, targetCarne, clients, plans]);

  const selectedClient = clients.find(c => c.id === selectedClientId) || 
    (targetCarne ? { id: targetCarne.clientId, name: targetCarne.clientName, document: targetCarne.clientDocument, address: 'Zona Rural', email: targetCarne.clientEmail || '' } as Client : null);
  const selectedPlan = selectedClient ? plans.find(p => p.id === selectedClient.planId) : null;

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const plan = plans.find(p => p.id === client.planId) || plans[0];
      setInstallmentAmount(plan ? plan.price : 89.90);
      setDueDay(client.dueDay || 10);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Generate the list of slips with strict numbering (1/N, 2/N, ..., N/N)
  const slips: CarneSlip[] = useMemo(() => {
    const list: CarneSlip[] = [];
    // Prioriza o total de parcelas do carnê selecionado (ex: 3)
    const count = targetCarne ? targetCarne.totalInstallments : Math.max(1, Math.min(36, installmentsCount));

    // Busca faturas já associadas ao carnê se disponíveis
    const matchingInvoices = (targetCarne && invoices)
      ? invoices.filter(inv => inv.carneId === targetCarne.id || (inv.clientId === targetCarne.clientId && !!inv.installment))
      : [];

    for (let i = 1; i <= count; i++) {
      const targetDate = new Date(startYear, (startMonth - 1) + (i - 1), 1);
      const mStr = String(targetDate.getMonth() + 1).padStart(2, '0');
      const yStr = String(targetDate.getFullYear());
      const refMonth = `${mStr}/${yStr}`;

      const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const actualDay = Math.min(dueDay, lastDay);
      const defaultFormattedDueDate = `${String(actualDay).padStart(2, '0')}/${mStr}/${yStr}`;

      // Formatação estrita solicitada: 1/3, 2/3, 3/3 (ou 1/12 se 12 parcelas)
      const label = `${i}/${count}`;

      // Fatura real correspondente (se existir)
      const existingInv = matchingInvoices[i - 1];

      let formattedDueDate = defaultFormattedDueDate;
      if (existingInv?.dueDate) {
        if (existingInv.dueDate.includes('-')) {
          const [y, m, d] = existingInv.dueDate.split('-');
          formattedDueDate = `${d}/${m}/${y}`;
        } else {
          formattedDueDate = existingInv.dueDate;
        }
      }

      const amount = existingInv?.amount ?? (targetCarne?.installmentAmount || installmentAmount);

      // Gerar linha digitável e código de barras realistas
      const baseNum = (1000 + i * 7).toString();
      const digitableLine = existingInv?.barcode 
        ? `${existingInv.barcode.slice(0, 5)}.${existingInv.barcode.slice(5, 10)} ${existingInv.barcode.slice(10, 15)}.${existingInv.barcode.slice(15, 21)} ${existingInv.barcode.slice(21, 26)}.${baseNum} 1 ${Math.floor(9000 + i * 11)}00000${Math.floor(amount * 100)}`
        : `23793.38128 60000.010204 12000.${baseNum} 1 ${Math.floor(9000 + i * 11)}00000${Math.floor(amount * 100)}`;
      const barcode = existingInv?.barcode || `23791${Math.floor(9000 + i * 11)}00000${Math.floor(amount * 100)}381286000001020412000${baseNum}`;

      list.push({
        installmentNumber: i,
        totalInstallments: count,
        label,
        referenceMonth: refMonth,
        dueDate: formattedDueDate,
        amount,
        barcode,
        digitableLine,
        pixKey: companySettings?.pixKey || 'pix@agroisp.com.br'
      });
    }

    return list;
  }, [targetCarne, invoices, installmentsCount, startMonth, startYear, dueDay, installmentAmount, companySettings]);

  // Group slips into pages of 3 slips each (3 por folha A4)
  const pages = useMemo(() => {
    const result: CarneSlip[][] = [];
    for (let i = 0; i < slips.length; i += 3) {
      result.push(slips.slice(i, i + 3));
    }
    return result;
  }, [slips]);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToSystem = async () => {
    if (!selectedClientId) return;
    setIsSaving(true);
    try {
      const payload = {
        clientId: selectedClientId,
        installmentsCount,
        startMonth: `${String(startMonth).padStart(2, '0')}/${startYear}`,
        dueDay,
        installmentAmount
      };

      const res = await fetch('/api/invoices/carne-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSavedSuccess(true);
      if (onCarnesSaved && data.invoices) {
        onCarnesSaved(data.invoices);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar carnê');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const companyName = companySettings?.name || 'AgroISP Pro Conectividade';
  const companyLegal = companySettings?.legalName || 'AgroISP Telecomunicações Rurais Ltda';
  const companyCnpj = companySettings?.cnpj || '12.345.678/0001-90';
  const companyPhone = companySettings?.phone || '(11) 98765-4321';
  const bankName = companySettings?.bankName || 'Sicoob / Banco do Brasil';
  const agencyAccount = `${companySettings?.agency || '1234-5'} / ${companySettings?.account || '98765-4'}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:h-auto print:overflow-visible">
      {/* Container Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-4 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:bg-white">
        
        {/* Header (Oculto na impressão) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{targetCarne ? `Carnê Nº ${targetCarne.id} - ${targetCarne.clientName}` : 'Gerador de Carnês de Mensalidade'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {slips.length} Parcela(s) • 3 por Folha A4
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {targetCarne 
                  ? `Carnê oficial com ${targetCarne.totalInstallments} parcelas (1/${targetCarne.totalInstallments} a ${targetCarne.totalInstallments}/${targetCarne.totalInstallments}) com código de barras e Pix instantâneo.`
                  : 'Gere e imprima carnês com quantidade personalizada, numeradas por parcela com código de barras e Pix.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {/* Alternar abas de tela */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 text-xs">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition ${
                  viewMode === 'preview'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar Folha</span>
              </button>
              <button
                onClick={() => setViewMode('config')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition ${
                  viewMode === 'config'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Ajustar Dados</span>
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-1.5 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas (Oculto na impressão) */}
        <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-300">
            <span>Cliente Selecionado: </span>
            <strong className="text-white">{selectedClient?.name || 'Selecione um cliente'}</strong>
            <span className="text-slate-500 mx-2">•</span>
            <span>Total: </span>
            <strong className="text-emerald-400 font-mono font-bold">{slips.length} parcelas de {formatCurrency(slips[0]?.amount || installmentAmount)}</strong>
            <span className="text-slate-500 mx-2">•</span>
            <span>Folhas A4: </span>
            <strong className="text-cyan-300 font-mono">{pages.length} folha(s)</strong>
          </div>

          <div className="flex items-center space-x-2">
            {targetCarne ? (
              <div className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Carnê #{targetCarne.id} Salvo</span>
              </div>
            ) : (
              <button
                onClick={handleSaveToSystem}
                disabled={isSaving || savedSuccess}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                title="Salva as parcelas como faturas a vencer no sistema"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Salvo no Sistema!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-cyan-400" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar no Sistema'}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-950"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Carnê ({slips.length}x)</span>
            </button>
          </div>
        </div>

        {/* PAINEL DE CONFIGURAÇÃO (se viewMode === 'config') */}
        {viewMode === 'config' && (
          <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4 print:hidden">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Configuração do Carnê de Mensalidades</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cliente */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cliente do Carnê *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — CPF: {c.document} ({c.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade de Parcelas (Costuma ser 12) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Quantidade de Parcelas *</span>
                  <span className="text-[10px] text-amber-400">Padrão: 12</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 12)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center space-x-1.5 mt-1.5">
                  {[6, 12, 18, 24].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallmentsCount(n)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        installmentsCount === n 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Mês de Início */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mês da 1ª Parcela (1/{installmentsCount}) *
                </label>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={1}>Janeiro (01)</option>
                  <option value={2}>Fevereiro (02)</option>
                  <option value={3}>Março (03)</option>
                  <option value={4}>Abril (04)</option>
                  <option value={5}>Maio (05)</option>
                  <option value={6}>Junho (06)</option>
                  <option value={7}>Julho (07)</option>
                  <option value={8}>Agosto (08)</option>
                  <option value={9}>Setembro (09)</option>
                  <option value={10}>Outubro (10)</option>
                  <option value={11}>Novembro (11)</option>
                  <option value={12}>Dezembro (12)</option>
                </select>
              </div>

              {/* Ano */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ano de Início *
                </label>
                <input
                  type="number"
                  value={startYear}
                  onChange={(e) => setStartYear(parseInt(e.target.value, 10) || 2026)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Dia de Vencimento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dia de Vencimento *
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Valor de Cada Parcela */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor da Parcela (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Instruções */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instruções do Caixa no Carnê
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewMode('preview')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <span>Aplicar e Visualizar Carnê</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÁREA DE IMPRESSÃO / FOLHAS A4 (EXATAMENTE 4 CARNÊS POR FOLHA A4) */}
        {/* ========================================================================= */}
        <div className="carne-print-area space-y-6 print:space-y-0 print:m-0">
          <div className="text-xs text-slate-400 flex items-center justify-between pb-1 print:hidden">
            <span className="flex items-center space-x-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Layout de Impressão A4 (3 carnês por página com linhas pontilhadas de corte)</span>
            </span>
            <span className="font-mono text-cyan-300">
              {slips.length} parcelas • {pages.length} folha(s) A4
            </span>
          </div>

          {pages.map((pageSlips, pageIndex) => (
            <div 
              key={`page-${pageIndex}`}
              className="a4-sheet bg-white text-slate-900 rounded-xl p-3 sm:p-5 shadow-xl border border-slate-300 print:shadow-none print:border-none print:rounded-none print:p-2 print:m-0 print:w-full print:page-break-after-always"
              style={{
                pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto',
                breakAfter: pageIndex < pages.length - 1 ? 'page' : 'auto'
              }}
            >
              {/* Indicador de Folha (Oculto na impressão) */}
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-200 mb-3 flex items-center justify-between print:hidden">
                <span>FOLHA A4 #{pageIndex + 1} DE {pages.length}</span>
                <span>3 CARNÊS POR PÁGINA (PARCELAS {pageSlips[0]?.label} ATÉ {pageSlips[pageSlips.length - 1]?.label})</span>
              </div>

              {/* Grid vertical dos 4 carnês na página A4 */}
              <div className="flex flex-col space-y-3 print:space-y-2">
                {pageSlips.map((slip, slipIndex) => (
                  <div key={slip.label} className="carnet-item relative">
                    {/* Linha de corte pontilhada (apenas entre carnês ou acima) */}
                    {slipIndex > 0 && (
                      <div className="relative my-2 print:my-1.5 flex items-center justify-center">
                        <div className="w-full border-t border-dashed border-slate-400"></div>
                        <span className="absolute bg-white px-2 text-[9px] font-mono text-slate-500 uppercase flex items-center space-x-1">
                          <Scissors className="w-3 h-3 text-slate-600 inline" />
                          <span>Corte Aqui</span>
                        </span>
                      </div>
                    )}

                    {/* Lâmina do Carnê (Canhoto à esquerda + Ficha à direita) */}
                    <div className="border-2 border-slate-800 rounded-lg overflow-hidden flex flex-col md:flex-row bg-white text-[10px] leading-tight">
                      
                      {/* 1. CANHOTO DO SACADO / RECIBO DO PAGADOR (Esquerda ~28% largura) */}
                      <div className="w-full md:w-[28%] border-b md:border-b-0 md:border-r-2 border-dashed border-slate-800 p-2.5 bg-slate-50 flex flex-col justify-between">
                        <div>
                          {/* Topo do Canhoto */}
                          <div className="border-b border-slate-300 pb-1 mb-1.5">
                            <div className="font-extrabold text-[11px] text-slate-900 tracking-tight uppercase truncate">
                              {companyName}
                            </div>
                            <div className="text-[9px] text-slate-600">
                              RECIBO DO PAGADOR
                            </div>
                          </div>

                          {/* Destaque da Parcela Solicitada: 1/12, 2/12 ... */}
                          <div className="bg-slate-900 text-white rounded p-1 mb-1.5 text-center">
                            <span className="text-[9px] uppercase tracking-wider block text-slate-300 font-semibold">
                              PARCELA
                            </span>
                            <span className="text-sm font-black font-mono tracking-tight text-amber-300">
                              {slip.label}
                            </span>
                          </div>

                          {/* Dados do Canhoto */}
                          <div className="space-y-1">
                            <div>
                              <span className="text-slate-500 font-bold block text-[8px] uppercase">Vencimento</span>
                              <span className="font-bold font-mono text-slate-900 text-[10px]">{slip.dueDate}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold block text-[8px] uppercase">Mês de Ref.</span>
                              <span className="font-bold font-mono text-slate-900 text-[10px]">{slip.referenceMonth}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 font-bold block text-[8px] uppercase">Valor do Documento</span>
                              <span className="font-extrabold font-mono text-slate-900 text-xs">{formatCurrency(slip.amount)}</span>
                            </div>
                            <div className="pt-0.5 border-t border-slate-200">
                              <span className="text-slate-500 font-bold block text-[8px] uppercase">Pagador</span>
                              <span className="font-bold text-slate-900 truncate block text-[9px]">{selectedClient?.name}</span>
                              <span className="font-mono text-slate-600 text-[8px]">{selectedClient?.document}</span>
                            </div>
                          </div>
                        </div>

                        {/* Rodapé do Canhoto com Autenticação Mecânica */}
                        <div className="pt-2 border-t border-slate-300 text-center text-[7px] text-slate-400 uppercase">
                          Autenticação Mecânica
                        </div>
                      </div>

                      {/* 2. FICHA DE COMPENSAÇÃO / LÂMINA DE PAGAMENTO (Direita ~72% largura) */}
                      <div className="w-full md:w-[72%] p-2.5 flex flex-col justify-between bg-white">
                        <div>
                          {/* Cabeçalho do Boleto com Linha Digitável */}
                          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1 mb-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-black text-xs text-slate-900 tracking-tight uppercase">
                                {bankName}
                              </span>
                              <span className="border-l border-slate-400 pl-1.5 font-bold font-mono text-[10px] text-slate-700">
                                001-9
                              </span>
                            </div>
                            <div className="font-mono font-bold text-[9px] sm:text-[10px] text-slate-900 tracking-wider">
                              {slip.digitableLine}
                            </div>
                          </div>

                          {/* Grid do Boleto / Carnê */}
                          <div className="grid grid-cols-4 gap-1 border border-slate-400 rounded p-1 mb-1 bg-slate-50/40">
                            <div className="col-span-3 border-r border-slate-300 pr-1">
                              <span className="text-[7px] font-bold text-slate-500 uppercase block">Local de Pagamento</span>
                              <span className="text-[9px] font-semibold text-slate-800 block truncate">
                                Pagável em qualquer banco, lotérica, app bancário ou via Pix
                              </span>
                            </div>
                            <div className="pl-1">
                              <span className="text-[7px] font-bold text-slate-500 uppercase block">Vencimento</span>
                              <span className="text-[11px] font-black font-mono text-slate-900 block">{slip.dueDate}</span>
                            </div>

                            <div className="col-span-3 border-r border-slate-300 pr-1 border-t border-slate-200 pt-0.5">
                              <span className="text-[7px] font-bold text-slate-500 uppercase block">Beneficiário</span>
                              <span className="text-[9px] font-bold text-slate-900 block truncate">
                                {companyLegal} • CNPJ: {companyCnpj}
                              </span>
                            </div>
                            <div className="pl-1 border-t border-slate-200 pt-0.5">
                              <span className="text-[7px] font-bold text-slate-500 uppercase block">Agência / Código</span>
                              <span className="text-[9px] font-mono font-semibold text-slate-900 block">{agencyAccount}</span>
                            </div>

                            <div className="border-t border-slate-200 pt-0.5">
                              <span className="text-[7px] font-bold text-slate-500 uppercase block">Data Doc.</span>
                              <span className="text-[8px] font-mono text-slate-800 block">{new Date().toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-0.5">
                              <span className="text-[7px] font-bold text-slate-500 uppercase block">Nº Documento</span>
                              <span className="text-[8px] font-mono text-slate-800 block">FAT-{slip.referenceMonth.replace('/', '')}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-0.5 bg-amber-50 rounded px-0.5">
                              <span className="text-[7px] font-black text-amber-800 uppercase block">PARCELA</span>
                              <span className="text-[10px] font-black font-mono text-amber-900 block">{slip.label}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-0.5 pl-1 bg-emerald-50 rounded px-0.5">
                              <span className="text-[7px] font-black text-emerald-800 uppercase block">Valor Documento</span>
                              <span className="text-[11px] font-black font-mono text-emerald-950 block">{formatCurrency(slip.amount)}</span>
                            </div>
                          </div>

                          {/* Instruções & Dados do Pagador com QR Code Pix */}
                          <div className="grid grid-cols-4 gap-2 mb-1">
                            <div className="col-span-3">
                              <div className="text-[8px] text-slate-600 bg-slate-100 rounded p-1 mb-1">
                                <span className="font-bold text-slate-800 block">Instruções aos caixas:</span>
                                <span>{instructions}</span>
                              </div>

                              <div className="text-[8px] text-slate-700 border-t border-slate-200 pt-0.5">
                                <span className="font-bold text-slate-900">Pagador: </span>
                                <span>{selectedClient?.name} • CPF: {selectedClient?.document}</span>
                                <div className="text-slate-500 text-[7px] truncate">
                                  Endereço: {selectedClient?.address || 'Zona Rural'} • Plano: {selectedPlan?.name || 'Internet Fibra/Rádio'}
                                </div>
                              </div>
                            </div>

                            {/* Mini QR Code Pix e Chave */}
                            <div className="col-span-1 border border-slate-300 rounded p-1 text-center bg-slate-50 flex flex-col items-center justify-center">
                              <QrCode className="w-9 h-9 text-slate-900" />
                              <span className="text-[7px] font-black uppercase text-slate-900 tracking-tight mt-0.5">
                                PAGUE COM PIX
                              </span>
                              <span className="text-[6px] font-mono text-slate-500 truncate max-w-full">
                                {companySettings?.pixKey ? 'Chave Cadastrada' : 'Pix Instantâneo'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Código de Barras estilizado em alta fidelidade */}
                        <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                          <div className="flex-1">
                            <div 
                              className="h-7 w-full flex items-stretch space-x-0.5 overflow-hidden"
                              title={`Código de Barras: ${slip.barcode}`}
                            >
                              {/* Barras geradas por CSS para nitidez perfeita em qualquer impressora */}
                              {[...Array(65)].map((_, barIdx) => {
                                const isWide = (barIdx * 7 + slip.installmentNumber) % 3 === 0;
                                const isHidden = (barIdx * 11) % 5 === 0;
                                return (
                                  <div
                                    key={barIdx}
                                    className={`bg-slate-950 ${isHidden ? 'opacity-0' : 'opacity-100'}`}
                                    style={{
                                      width: isWide ? '3px' : '1.5px',
                                      flexShrink: 0
                                    }}
                                  />
                                );
                              })}
                            </div>
                            <div className="text-[8px] font-mono text-slate-500 mt-0.5">
                              {slip.barcode}
                            </div>
                          </div>

                          <div className="text-right pl-2">
                            <span className="text-[9px] font-black font-mono text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                              {slip.label}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com botões de Fechar / Imprimir (Oculto na impressão) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 print:hidden">
          <div className="text-xs text-slate-400">
            Dica: Ao imprimir, selecione o papel <strong>A4</strong> e desmarque a opção <em>"Cabeçalhos e rodapés"</em> no diálogo de impressão.
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Fechar
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-emerald-950"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Carnê Agora (3 por Folha)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
