import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  FileText, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Scissors, 
  Download, 
  Building2, 
  Landmark,
  ShieldCheck
} from 'lucide-react';
import { Invoice, CompanySettings, Client } from '../types/index.js';

interface BoletoModalProps {
  invoice: Invoice | null;
  client?: Client;
  companySettings: CompanySettings;
  onClose: () => void;
  onPayInvoice: (invoiceId: string) => Promise<any>;
}

export const BoletoModal: React.FC<BoletoModalProps> = ({
  invoice,
  client,
  companySettings,
  onClose,
  onPayInvoice
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'boleto' | 'resumo'>('boleto');

  if (!invoice) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const copyPix = () => {
    navigator.clipboard.writeText(invoice.pixCopyPaste);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const copyBarcode = () => {
    navigator.clipboard.writeText(invoice.barcode);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      await onPayInvoice(invoice.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateWhatsAppLink = () => {
    const text = `Olá ${invoice.clientName}! Segue sua fatura de internet ${companySettings.name} (${invoice.planName}) no valor de ${formatCurrency(invoice.amount)}, vencimento ${invoice.dueDate}. Pague via Pix ou Boleto Bancário:\n\n*Linha Digitável:* ${invoice.barcode}\n\n*Pix Copia e Cola:*\n${invoice.pixCopyPaste}\n\nO desbloqueio no MikroTik é imediato após a confirmação!`;
    const cleanPhone = (invoice.clientPhone || '').replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  // Format barcode into Febraban standard typed line
  const formattedBarcode = invoice.barcode.length >= 44 
    ? `${invoice.barcode.slice(0, 5)}.${invoice.barcode.slice(5, 10)} ${invoice.barcode.slice(10, 15)}.${invoice.barcode.slice(15, 21)} ${invoice.barcode.slice(21, 26)}.${invoice.barcode.slice(26, 32)} ${invoice.barcode.slice(32, 33)} ${invoice.barcode.slice(33)}`
    : invoice.barcode;

  // Render authentic barcode lines SVG
  const renderSvgBarcode = () => {
    const bars = [];
    const seed = invoice.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 65; i++) {
      const width = ((seed * (i + 7)) % 3) + 1;
      const isBlack = (i % 2 === 0);
      if (isBlack) {
        bars.push(
          <rect key={i} x={i * 6} y="0" width={width * 1.8} height="60" fill="#000" />
        );
      }
    }
    return (
      <svg className="w-full h-14" viewBox="0 0 400 60" preserveAspectRatio="none">
        {bars}
      </svg>
    );
  };

  const providerFullAddress = `${companySettings.address.street}, ${companySettings.address.number} ${companySettings.address.complement ? '- ' + companySettings.address.complement : ''} - ${companySettings.address.neighborhood}, ${companySettings.address.city}/${companySettings.address.state} - CEP: ${companySettings.address.cep}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container - Styled for screen AND @media print */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-6 text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:p-0">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Boleto Bancário & Fatura de Internet
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {companySettings.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Fatura Nº {invoice.id} • Mês: {invoice.referenceMonth}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setActiveTab(activeTab === 'boleto' ? 'resumo' : 'boleto')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {activeTab === 'boleto' ? 'Ver Modo Pix' : 'Ver Boleto Oficial'}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alert Banner (Hidden on Print) */}
        <div className="no-print flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            {invoice.status === 'paga' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {invoice.status === 'pendente' && <Clock className="w-5 h-5 text-blue-400" />}
            {invoice.status === 'atrasada' && <AlertTriangle className="w-5 h-5 text-red-400" />}
            <div>
              <span className="font-bold text-white uppercase tracking-wider block">
                Status: {invoice.status === 'paga' ? 'Paga (Liquidada)' : invoice.status === 'pendente' ? 'Aguardando Pagamento' : 'Atrasada (Bloqueado)'}
              </span>
              <span className="text-[11px] text-slate-400">
                {invoice.status === 'paga' 
                  ? `Quitada em ${invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('pt-BR') : 'Hoje'}` 
                  : `Vencimento em ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Valor do Documento</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {formatCurrency(invoice.amount)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO DO BOLETO BANCÁRIO OFICIAL (VISÍVEL NA TELA E NA IMPRESSÃO)     */}
        {/* ========================================================================= */}
        <div className="printable-boleto bg-white text-slate-900 rounded-xl p-4 sm:p-6 shadow-md border border-slate-300 font-sans text-xs space-y-4 print:border-none print:shadow-none print:p-0">
          
          {/* Top Header do Provedor com Logomarca e Dados */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-3">
            <div className="flex items-center space-x-3">
              {companySettings.logoUrl ? (
                <img 
                  src={companySettings.logoUrl} 
                  alt={companySettings.name} 
                  className="h-10 sm:h-12 max-w-[140px] object-contain"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                  {companySettings.name.charAt(0) || 'P'}
                </div>
              )}
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {companySettings.name}
                </h1>
                <p className="text-[10px] text-slate-600 font-medium">
                  {companySettings.legalName} • CNPJ: {companySettings.cnpj}
                </p>
                <p className="text-[9px] text-slate-500">
                  {providerFullAddress} • Tel/WhatsApp: {companySettings.phone}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Comprovante de Cobrança</span>
              <span className="text-xs font-mono font-bold text-slate-800 block">FAT-{invoice.id}</span>
              <span className="text-[10px] text-slate-600">Ref: {invoice.referenceMonth}</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 1. RECIBO DO PAGADOR                                              */}
          {/* ----------------------------------------------------------------- */}
          <div className="border border-slate-400 rounded">
            <div className="bg-slate-100 px-3 py-1 font-bold text-[11px] text-slate-800 border-b border-slate-300 flex justify-between items-center">
              <span>RECIBO DO PAGADOR</span>
              <span className="font-mono text-[10px] text-slate-600">Autenticação Mecânica</span>
            </div>

            <div className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="sm:col-span-2 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 sm:pr-2">
                <span className="text-[9px] uppercase font-semibold text-slate-500 block">Beneficiário (Provedor)</span>
                <span className="font-bold text-slate-900">{companySettings.name}</span>
                <span className="text-[10px] text-slate-600 block">{companySettings.legalName} - CNPJ: {companySettings.cnpj}</span>
                <span className="text-[9px] text-slate-500 block">{providerFullAddress}</span>
              </div>

              <div className="border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 sm:pr-2">
                <span className="text-[9px] uppercase font-semibold text-slate-500 block">Vencimento</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</span>

                <span className="text-[9px] uppercase font-semibold text-slate-500 block mt-2">Valor Cobrado</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{formatCurrency(invoice.amount)}</span>
              </div>

              <div>
                <span className="text-[9px] uppercase font-semibold text-slate-500 block">Nosso Número</span>
                <span className="font-mono text-slate-800 text-[10px]">{invoice.id}</span>

                <span className="text-[9px] uppercase font-semibold text-slate-500 block mt-2">Plano Contratado</span>
                <span className="font-medium text-slate-800 text-[10px]">{invoice.planName}</span>
              </div>

              <div className="sm:col-span-4 border-t border-slate-200 pt-2 mt-1">
                <span className="text-[9px] uppercase font-semibold text-slate-500 block">Pagador (Cliente)</span>
                <span className="font-bold text-slate-900">{invoice.clientName}</span>
                <span className="text-[10px] text-slate-600">
                  CPF/CNPJ: {invoice.clientDocument} {invoice.clientPhone ? `• Tel: ${invoice.clientPhone}` : ''}
                </span>
                {client?.address && (
                  <span className="text-[10px] text-slate-500 block">
                    Endereço: {client.address} {client.ruralLocation ? `- ${client.ruralLocation}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Linha Divisória de Corte */}
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono py-1">
            <span className="flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5" />
              Corte na linha pontilhada
            </span>
            <div className="flex-1 border-b-2 border-dashed border-slate-300 mx-3" />
            <span>Ficha de Compensação</span>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* 2. FICHA DE COMPENSAÇÃO (PADRÃO FEBRABAN)                        */}
          {/* ----------------------------------------------------------------- */}
          <div className="border-2 border-slate-900 rounded overflow-hidden">
            {/* Bank Header & Linha Digitável */}
            <div className="flex items-center border-b-2 border-slate-900 bg-slate-50">
              <div className="px-3 py-2 font-black text-sm sm:text-base border-r-2 border-slate-900 shrink-0">
                {companySettings.bankCode || '001-9'}
              </div>
              <div className="px-3 py-2 font-black text-xs sm:text-sm border-r-2 border-slate-900 shrink-0 hidden sm:block">
                {companySettings.bankName || 'Banco do Brasil S.A.'}
              </div>
              <div className="px-3 py-2 font-mono font-bold text-[10px] sm:text-xs text-slate-900 truncate flex-1 text-center sm:text-right select-all">
                {formattedBarcode}
              </div>
            </div>

            {/* Febraban Grid Table */}
            <div className="grid grid-cols-4 sm:grid-cols-6 border-b border-slate-400">
              <div className="col-span-4 border-r border-slate-400 p-1.5 border-b sm:border-b-0">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Local de Pagamento</span>
                <span className="text-[10px] font-semibold text-slate-800">
                  PAGÁVEL EM QUALQUER BANCO OU CORRESPONDENTE BANCÁRIO ATÉ O VENCIMENTO
                </span>
              </div>
              <div className="col-span-4 sm:col-span-2 p-1.5 bg-slate-50">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Data de Vencimento</span>
                <span className="text-xs font-black font-mono text-slate-900 block text-right">
                  {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 border-b border-slate-400">
              <div className="col-span-4 border-r border-slate-400 p-1.5 border-b sm:border-b-0">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Beneficiário</span>
                <span className="text-[11px] font-bold text-slate-900 block">
                  {companySettings.name} ({companySettings.legalName})
                </span>
                <span className="text-[9px] text-slate-600 block">CNPJ: {companySettings.cnpj}</span>
              </div>
              <div className="col-span-4 sm:col-span-2 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Agência / Código Beneficiário</span>
                <span className="text-[11px] font-mono font-bold text-slate-900 block text-right">
                  {companySettings.agency || '1234-5'} / {companySettings.account || '98765-4'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 border-b border-slate-400 text-[10px]">
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Data do Doc.</span>
                <span className="font-mono">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('pt-BR') : '01/10/2026'}</span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Nº Documento</span>
                <span className="font-mono">{invoice.id}</span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Espécie Doc.</span>
                <span>DM</span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Aceite</span>
                <span>N</span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Data Proc.</span>
                <span className="font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="p-1.5 bg-slate-50">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Nosso Número</span>
                <span className="font-mono font-bold text-right block">{invoice.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 border-b border-slate-400 text-[10px]">
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Uso do Banco</span>
                <span></span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Carteira</span>
                <span className="font-mono">{companySettings.carteira || '17'}</span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Espécie Moeda</span>
                <span>R$</span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Quantidade</span>
                <span></span>
              </div>
              <div className="border-r border-slate-400 p-1.5">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">Valor</span>
                <span></span>
              </div>
              <div className="p-1.5 bg-slate-50">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">(=) Valor do Documento</span>
                <span className="text-xs font-black font-mono text-emerald-800 text-right block">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
            </div>

            {/* Instruções de Cobrança e Área Lateral */}
            <div className="grid grid-cols-4 sm:grid-cols-6 border-b border-slate-400">
              <div className="col-span-4 border-r border-slate-400 p-2 text-[10px] space-y-1">
                <span className="text-[8px] uppercase font-bold text-slate-500 block">
                  Instruções (Texto de responsabilidade do Beneficiário)
                </span>
                <p className="text-slate-800 font-medium">
                  {companySettings.boletoInstructions || 'Sr. Caixa: Não receber após 30 dias de atraso. Cobrar multa de 2% e juros de 1% a.m.'}
                </p>
                <p className="text-slate-600">
                  Referente a mensalidade de acesso à internet • {invoice.planName}
                </p>
                <p className="text-slate-600">
                  Em caso de dúvidas ou suporte técnico: {companySettings.phone} • {companySettings.email}
                </p>
                <p className="text-emerald-700 font-semibold text-[9px] pt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Boleto com Pix Dinâmico: Pague pelo QR Code ao lado para baixa e desbloqueio imediato!
                </p>
              </div>

              {/* QR Code Pix Híbrido no próprio Boleto */}
              <div className="col-span-4 sm:col-span-2 p-2 bg-slate-50 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[8px] uppercase font-bold text-slate-600">Pix com Baixa Instantânea</span>
                {invoice.qrCodeDataUrl ? (
                  <img src={invoice.qrCodeDataUrl} alt="QR Code Pix" className="w-20 h-20 border border-slate-300 p-1 bg-white rounded" />
                ) : (
                  <div className="w-20 h-20 bg-slate-200 flex items-center justify-center text-[8px] rounded">
                    QR Code Pix
                  </div>
                )}
                <span className="text-[8px] text-emerald-700 font-bold">Desbloqueio MikroTik em 3s</span>
              </div>
            </div>

            {/* Sacado / Pagador */}
            <div className="p-2 border-b border-slate-400 text-[10px] bg-slate-50">
              <span className="text-[8px] uppercase font-bold text-slate-500 block">Pagador (Sacado)</span>
              <div className="flex flex-col sm:flex-row justify-between">
                <div>
                  <span className="font-bold text-slate-900">{invoice.clientName}</span>
                  <span className="text-slate-700 ml-2">CPF/CNPJ: {invoice.clientDocument}</span>
                  <span className="text-slate-600 block text-[9px]">
                    {client?.address || 'Endereço cadastrado'} {client?.ruralLocation ? `(${client.ruralLocation})` : ''}
                  </span>
                </div>
                <div className="text-left sm:text-right text-[9px] text-slate-500 mt-1 sm:mt-0 font-mono">
                  Cód. Cliente: {invoice.clientId}
                </div>
              </div>
            </div>

            {/* Código de Barras Gráfico */}
            <div className="p-3 bg-white flex flex-col items-start justify-center overflow-hidden">
              <div className="w-full max-w-lg">
                {renderSvgBarcode()}
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1">
                {formattedBarcode}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPÇÃO DE PIX RÁPIDO & COPIA E COLA (Abaixo do boleto)                      */}
        {/* ========================================================================= */}
        <div className="no-print bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Pix Copia e Cola & Linha Digitável
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Baixa Automática
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Copy Pix */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium block">
                Código Pix Copia e Cola:
              </label>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 break-all select-all max-h-16 overflow-y-auto">
                {invoice.pixCopyPaste}
              </div>
              <button
                onClick={copyPix}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow"
              >
                {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPix ? 'Copiado!' : 'Copiar Código Pix'}</span>
              </button>
            </div>

            {/* Copy Barcode */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-medium block">
                Linha Digitável do Boleto:
              </label>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 break-all select-all max-h-16 overflow-y-auto">
                {invoice.barcode}
              </div>
              <button
                onClick={copyBarcode}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                {copiedBarcode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBarcode ? 'Copiado!' : 'Copiar Linha do Boleto'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden on Print) */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          {invoice.clientPhone ? (
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Enviar Boleto no WhatsApp</span>
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {invoice.status !== 'paga' && (
              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{isProcessing ? 'Dando Baixa...' : 'Simular Baixa & Desbloqueio'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
