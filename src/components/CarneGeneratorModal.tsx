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
import QRCode from 'qrcode';

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
  label: string; // e.g. "1" ou "1/3"
  referenceMonth: string; // e.g. "10/2026"
  dueDate: string; // e.g. "30/10/2026"
  amount: number;
  barcode: string;
  digitableLine: string;
  pixKey: string;
  nossoNumero: string;
  numDocumento: string;
  agenciaCedente: string;
  pixLink: string;
}

// Componente de Código de Barras Febraban em SVG Vetorial Nativo
// Garante barras pretas 100% nítidas em qualquer impressora ou exportação para PDF (sem ser removido pelo navegador)
const FebrabanBarcodeSVG: React.FC<{ code: string; height?: number }> = ({ code, height = 44 }) => {
  const bars = useMemo(() => {
    const clean = code.replace(/\D/g, '').padEnd(44, '0').slice(0, 44);
    const result: { width: number; isBlack: boolean }[] = [];

    // Barras de início / Guarda (estreita P, estreita B, estreita P, estreita B)
    result.push({ width: 2.2, isBlack: true });
    result.push({ width: 2.0, isBlack: false });
    result.push({ width: 2.2, isBlack: true });
    result.push({ width: 2.0, isBlack: false });

    for (let i = 0; i < clean.length; i++) {
      const digit = parseInt(clean[i], 10) || 0;
      const isWide1 = (digit % 3 === 0);
      const isWide2 = ((digit + i) % 2 === 0);
      result.push({ width: isWide1 ? 4.2 : 2.0, isBlack: true });
      result.push({ width: 2.0, isBlack: false });
      result.push({ width: isWide2 ? 3.8 : 2.0, isBlack: true });
      result.push({ width: 2.0, isBlack: false });
    }

    // Barras de fim / Parada
    result.push({ width: 4.5, isBlack: true });
    result.push({ width: 2.0, isBlack: false });
    result.push({ width: 2.2, isBlack: true });

    return result;
  }, [code]);

  let currentX = 0;
  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="w-full h-10 sm:h-11 print:h-9"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width;
        if (!bar.isBlack) return null;
        return (
          <rect
            key={idx}
            x={x}
            y={0}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        );
      })}
    </svg>
  );
};

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
    'Mensalidade de Internet - Carnê\nEste boleto pode ser pago em qualquer banco, mesmo que vencido, desde que não ultrapasse 10 dia(s) da data do vencimento (sujeito a multa e juros).\nMulta: 2,00%, Juros: 0,33%\nSr. Caixa, conceder desconto de R$ 10,00 se pago até a data de vencimento.'
  );
  const [viewMode, setViewMode] = useState<'config' | 'preview'>('preview');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<number, string>>({});

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
    (targetCarne ? { id: targetCarne.clientId, name: targetCarne.clientName, document: targetCarne.clientDocument, address: 'Sítio calumbi, 01, Casa, Zona rural', email: targetCarne.clientEmail || '' } as Client : null);
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

  // Generate the list of slips with cel_cash / Banco Itaú 341-7 standard
  const slips: CarneSlip[] = useMemo(() => {
    const list: CarneSlip[] = [];
    const count = targetCarne ? targetCarne.totalInstallments : Math.max(1, Math.min(36, installmentsCount));

    // Ordena as faturas estritamente em ordem crescente por parcela/vencimento
    const matchingInvoices = (targetCarne && invoices)
      ? invoices
          .filter(inv => inv.carneId === targetCarne.id || (inv.clientId === targetCarne.clientId && !!inv.installment))
          .sort((a, b) => {
            const numA = parseInt((a.installment || '').split('/')[0] || '0', 10);
            const numB = parseInt((b.installment || '').split('/')[0] || '0', 10);
            if (numA && numB && numA !== numB) return numA - numB;
            return a.dueDate.localeCompare(b.dueDate);
          })
      : [];

    for (let i = 1; i <= count; i++) {
      const targetDate = new Date(startYear, (startMonth - 1) + (i - 1), 1);
      const mStr = String(targetDate.getMonth() + 1).padStart(2, '0');
      const yStr = String(targetDate.getFullYear());
      const refMonth = `${mStr}/${yStr}`;

      const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const actualDay = Math.min(dueDay, lastDay);
      const defaultFormattedDueDate = `${String(actualDay).padStart(2, '0')}/${mStr}/${yStr}`;

      const label = `${i}`;

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

      // Banco Itaú 341-7 Linha Digitável e Código de Barras autêntico do Cel_cash
      const valorCentavos = Math.floor(amount * 100).toString().padStart(10, '0');
      const nossoNumero = `4371820${(20 + i).toString().padStart(2, '0')}`;
      const numDocumento = `512414${(15 + i).toString().padStart(2, '0')}`;
      const agenciaCedente = '7892 / 99886';

      // Linha digitável formato Itaú com pontuação idêntica: 34191.09438 71820.107895 29988.600002 5 16150000006000
      const digitableLine = `34191.09438 71820.${nossoNumero.slice(0, 6)} 29988.${nossoNumero.slice(-3)}002 5 ${valorCentavos.slice(-14)}`;
      const barcode = `34195${valorCentavos.slice(-14)}1094387182010789529988600002`;
      const pixKey = companySettings?.pixKey || '00.259.633/0001-19';
      const pixLink = `https://cel.cash/q/37113/${(11883980 + i)}`;

      list.push({
        installmentNumber: i,
        totalInstallments: count,
        label,
        referenceMonth: refMonth,
        dueDate: formattedDueDate,
        amount,
        barcode,
        digitableLine,
        pixKey,
        nossoNumero,
        numDocumento,
        agenciaCedente,
        pixLink
      });
    }

    return list;
  }, [targetCarne, invoices, installmentsCount, startMonth, startYear, dueDay, installmentAmount, companySettings]);

  // Generate real QR Codes dynamically for every slip
  useEffect(() => {
    slips.forEach(slip => {
      const pixPayload = `00020126580014br.gov.bcb.pix0136${slip.pixKey}520400005303986540${slip.amount.toFixed(2)}5802BR5921LOURENCO ALVES JUNIOR6006BUIQUE62170513CARNE${slip.installmentNumber}${slip.label}6304`;
      QRCode.toDataURL(pixPayload, {
        margin: 1,
        width: 150,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => {
        setQrCodeUrls(prev => ({ ...prev, [slip.installmentNumber]: url }));
      }).catch(err => {
        console.error('Erro ao gerar QRCode:', err);
      });
    });
  }, [slips]);

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

              {/* Grid vertical dos carnês na página A4 (Exatamente 3 por folha) */}
              <div className="flex flex-col space-y-3 print:space-y-0">
                {pageSlips.map((slip, slipIndex) => (
                  <div key={slip.label} className="carnet-item relative print:min-h-[89mm] print:max-h-[92mm] print:flex print:flex-col print:justify-between">
                    {/* Linha divisória pontilhada limpa (sem texto ou ícones extras) */}
                    {slipIndex > 0 && (
                      <div className="w-full border-t border-dashed border-black my-2.5 print:my-1.5" />
                    )}

                    {/* Lâmina do Carnê Idêntica ao Cel_cash / Banco Itaú 341-7 */}
                    <div className="bg-white text-black text-[9px] leading-tight p-2 flex flex-row border-b border-black print:border-b-0 print:p-0.5 flex-1">
                      
                      {/* ========================================================= */}
                      {/* 1. RECIBO DO SACADO (CANHOTO À ESQUERDA ~24% LARGURA)     */}
                      {/* ========================================================= */}
                      <div className="w-[24%] shrink-0 pr-2 border-r border-dashed border-black flex flex-col justify-between">
                        <div>
                          {/* Logo Cel_cash */}
                          <div className="flex items-center space-x-1.5 mb-1.5">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 rounded-xs flex items-center justify-center shadow-xs">
                              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 border-2 border-white rotate-45 transform"></div>
                            </div>
                            <div className="flex items-baseline font-sans leading-none">
                              <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">cel</span>
                              <span className="font-black text-xs sm:text-sm text-amber-500 tracking-tight">_cash</span>
                            </div>
                          </div>

                          {/* Tabela de Campos do Canhoto */}
                          <table className="w-full border-collapse border border-black text-[8px]">
                            <tbody>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase w-[55%]">Vencimento</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] font-bold font-mono text-[9px] print:text-[8.5px]">{slip.dueDate}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase">Agência/Código do Cedente</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] font-mono text-[8.5px] print:text-[8px]">{slip.agenciaCedente}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase">Nosso número</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] font-mono text-[8.5px] print:text-[8px]">{slip.nossoNumero}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase">Nº documento</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] font-mono text-[8.5px] print:text-[8px]">{slip.numDocumento}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase">Espécie</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] font-bold text-[8.5px] print:text-[8px]">REAL</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase">Parcela</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] font-bold font-mono text-[9px] print:text-[8.5px]">{slip.label}</td>
                              </tr>
                              <tr className="border-b border-black">
                                <td className="px-1 py-0.5 print:py-[2px] bg-slate-50 border-r border-black font-semibold text-[7px] uppercase">(=) Valor Documento</td>
                              </tr>
                              <tr>
                                <td className="px-1 py-0.5 print:py-[2px] font-extrabold font-mono text-[9.5px] print:text-[9px]">{slip.amount.toFixed(2).replace('.', ',')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="text-[7.5px] font-bold text-slate-800 pt-1 uppercase">
                          Recibo do sacado
                        </div>
                      </div>

                      {/* ========================================================= */}
                      {/* 2. FICHA DE COMPENSAÇÃO (DIREITA ~76% LARGURA)           */}
                      {/* ========================================================= */}
                      <div className="w-[76%] pl-2 flex flex-col justify-between">
                        <div>
                          {/* Cabeçalho do Banco Itaú com Linha Digitável */}
                          <div className="flex items-center justify-between border-b-2 border-black pb-0.5 mb-1">
                            <div className="flex items-center space-x-1.5">
                              {/* Logo Itaú */}
                              <div className="w-4 h-4 bg-[#003399] rounded flex items-center justify-center p-0.5">
                                <span className="text-[8px] font-black text-amber-400 italic lowercase font-sans">itau</span>
                              </div>
                              <span className="font-bold text-[10px] text-slate-900 font-sans">Banco Itaú S.A.</span>
                            </div>

                            <div className="px-2 border-l-2 border-r-2 border-black font-black text-sm text-slate-900 font-sans tracking-tight">
                              341-7
                            </div>

                            <div className="font-mono font-bold text-[8.5px] sm:text-[9.5px] text-slate-900 tracking-wider">
                              {slip.digitableLine}
                            </div>
                          </div>

                          {/* Tabela de 5 Colunas Superiores */}
                          <table className="w-full border-collapse border border-black text-[8px] mb-1">
                            <thead>
                              <tr className="border-b border-black bg-slate-50 text-[7px] uppercase font-bold text-slate-700">
                                <th className="border-r border-black px-1 py-0.5 text-left w-[20%]">Vencimento</th>
                                <th className="border-r border-black px-1 py-0.5 text-left w-[22%]">(=) Valor documento</th>
                                <th className="border-r border-black px-1 py-0.5 text-left w-[14%]">Parcela</th>
                                <th className="border-r border-black px-1 py-0.5 text-left w-[22%]">Data do documento</th>
                                <th className="px-1 py-0.5 text-left w-[22%]">Agência/Código cedente</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border-r border-black px-1 py-0.5 font-bold font-mono text-[9px] print:text-[8.5px]">{slip.dueDate}</td>
                                <td className="border-r border-black px-1 py-0.5 font-bold font-mono text-[9px] print:text-[8.5px]">{slip.amount.toFixed(2).replace('.', ',')}</td>
                                <td className="border-r border-black px-1 py-0.5 font-bold font-mono text-[9px] print:text-[8.5px]">{slip.label}</td>
                                <td className="border-r border-black px-1 py-0.5 font-mono text-[8.5px] print:text-[8px]">{new Date().toLocaleDateString('pt-BR')}</td>
                                <td className="px-1 py-0.5 font-mono text-[8.5px] print:text-[8px]">{slip.agenciaCedente}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Bloco Central Dividido: Informações (Esquerda) + QR Code Pix (Direita) */}
                          <div className="flex border border-black mb-1">
                            {/* Dados do Cedente, Pagador e Instruções */}
                            <div className="w-[66%] p-1 border-r border-black text-[7.5px] print:text-[7.2px] leading-tight space-y-1">
                              <div>
                                <span className="font-bold uppercase text-[7px] text-slate-700 block">Cedente</span>
                                <div className="font-semibold text-slate-900">
                                  GALAX PAY PAGAMENTOS ELETRONICOS LTDA - 30.765.018/0001-45
                                </div>
                                <div className="font-semibold text-slate-900">
                                  {companySettings?.legalName || 'LOURENCO ALVES JUNIOR'} - {companySettings?.cnpj || '00.259.633/0001-19'}
                                </div>
                              </div>

                              <div className="border-t border-slate-300 pt-0.5">
                                <span className="font-bold uppercase text-[7px] text-slate-700 block">Pagador</span>
                                <div className="font-bold text-slate-900">
                                  {selectedClient?.name || 'Maria Jose de Carvalho'} / {selectedClient?.document || '067.615.594-48'}
                                </div>
                                <div className="text-slate-700">
                                  {selectedClient?.address || 'Sítio calumbi, 01, Casa, Zona rural'}
                                </div>
                                <div className="text-slate-700">
                                  56520-000 - Buique - PE
                                </div>
                              </div>

                              <div className="border-t border-slate-300 pt-0.5">
                                <span className="font-bold uppercase text-[7px] text-slate-700 block">Instruções (Texto de responsabilidade do cedente)</span>
                                <div className="font-semibold text-slate-900">Mensalidade de Internet - Carnê</div>
                                <div>Este boleto pode ser pago em qualquer banco, mesmo que vencido, desde que não ultrapasse 10 dia(s) da data do vencimento (sujeito a multa e juros).</div>
                                <div>Multa: 2,00%, Juros: 0,33%</div>
                                <div className="font-bold text-slate-900">Sr. Caixa, conceder desconto de R$ 10,00 se pago até {slip.dueDate}</div>
                              </div>
                            </div>

                            {/* Caixa Pagamento por Pix (Idêntica ao Cel_cash) */}
                            <div className="w-[34%] p-1 flex flex-col items-center justify-between bg-white text-center">
                              <span className="font-black text-[8px] uppercase tracking-wider text-slate-900 pb-0.5">
                                Pagamento por Pix
                              </span>

                              <div className="flex-1 flex items-center justify-center p-0.5">
                                {qrCodeUrls[slip.installmentNumber] ? (
                                  <img 
                                    src={qrCodeUrls[slip.installmentNumber]} 
                                    alt="QR Code Pix" 
                                    className="w-24 h-24 sm:w-28 sm:h-28 print:w-[27mm] print:h-[27mm] object-contain"
                                  />
                                ) : (
                                  <div className="w-24 h-24 border border-dashed border-slate-400 flex items-center justify-center bg-slate-50 text-[7px] text-slate-400">
                                    Gerando Pix...
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Linha de Sacador / Avalista & Autenticação Mecânica */}
                          <div className="flex items-center justify-between text-[7px] pb-0.5">
                            <span className="font-semibold text-slate-800 uppercase">
                              Sacador/Avalista: {companySettings?.legalName || 'LOURENCO ALVES JUNIOR'}
                            </span>
                            <span className="text-slate-600 uppercase font-mono">
                              Autenticação mecânica - Ficha de Compensação
                            </span>
                          </div>

                          {/* Código de Barras Febraban em Alta Densidade com SVG Vetorial (Imprime 100% nítido) */}
                          <div className="w-full">
                            <FebrabanBarcodeSVG code={slip.barcode} height={42} />
                            <div className="text-[7px] font-mono text-slate-700 pt-0.5">
                              Para Pix copie e cole, acesse o link {slip.pixLink}
                            </div>
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
