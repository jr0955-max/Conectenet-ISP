import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  QrCode, 
  FileText, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Printer, 
  Download 
} from 'lucide-react';
import { Invoice } from '../types/index.js';

interface InvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPayInvoice: (invoiceId: string) => Promise<any>;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  onClose,
  onPayInvoice
}) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      await onPayInvoice(invoice.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateWhatsAppLink = () => {
    const text = `Olá ${invoice.clientName}! Segue sua fatura de internet AgroISP (${invoice.planName}) no valor de ${formatCurrency(invoice.amount)}, vencimento ${invoice.dueDate}. Pague via Pix Copia e Cola para baixa e desbloqueio imediato no MikroTik:\n\n${invoice.pixCopyPaste}`;
    const cleanPhone = invoice.clientPhone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Fatura de Internet • {invoice.id}
              </h3>
              <p className="text-xs text-slate-400">
                Mês de Referência: {invoice.referenceMonth}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Status Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-2">
            {invoice.status === 'paga' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {invoice.status === 'pendente' && <Clock className="w-5 h-5 text-blue-400" />}
            {invoice.status === 'atrasada' && <AlertTriangle className="w-5 h-5 text-red-400" />}
            <div>
              <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                Status: {invoice.status === 'paga' ? 'Paga (Quitada)' : invoice.status === 'pendente' ? 'Aguardando Pagamento' : 'Atrasada (Bloqueado)'}
              </span>
              <span className="text-[11px] text-slate-400">
                {invoice.status === 'paga' 
                  ? `Liquidado em ${invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('pt-BR') : 'Hoje'}` 
                  : `Vence em ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Valor da Fatura</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {formatCurrency(invoice.amount)}
            </span>
          </div>
        </div>

        {/* Client & Plan Info */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div>
            <span className="text-[11px] text-slate-500 block">Sacado (Cliente)</span>
            <span className="font-semibold text-white">{invoice.clientName}</span>
            <span className="text-slate-400 block font-mono text-[10px]">{invoice.clientDocument}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Plano Contratado</span>
            <span className="font-semibold text-white">{invoice.planName}</span>
            <span className="text-slate-400 block text-[10px]">Gateway: {invoice.gateway.toUpperCase()}</span>
          </div>
        </div>

        {/* Pix Dynamic Section */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Pix com Baixa Instantânea
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Desbloqueio em 3 segundos
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* QR Code Container */}
            <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-md">
              {invoice.qrCodeDataUrl ? (
                <img src={invoice.qrCodeDataUrl} alt="QR Code Pix" className="w-32 h-32" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-slate-800 text-[10px] text-center">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Pix Copy and Paste String */}
            <div className="flex-1 w-full space-y-2">
              <label className="block text-[11px] text-slate-400 font-medium">
                Código Pix Copia e Cola:
              </label>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-slate-300 break-all select-all max-h-18 overflow-y-auto">
                {invoice.pixCopyPaste}
              </div>
              <button
                onClick={copyPix}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow"
              >
                {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPix ? 'Copiado para a área de transferência!' : 'Copiar Código Pix'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bank Slip Barcode */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Boleto Bancário (Linha Digitável):</span>
            <button
              onClick={copyBarcode}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[11px]"
            >
              {copiedBarcode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedBarcode ? 'Copiado' : 'Copiar Linha'}</span>
            </button>
          </div>
          <div className="font-mono text-[11px] text-slate-200 select-all p-2 bg-slate-900 rounded border border-slate-800">
            {invoice.barcode}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          {invoice.clientPhone ? (
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Enviar no WhatsApp</span>
            </a>
          ) : (
            <div></div>
          )}

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {invoice.status !== 'paga' && (
              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{isProcessing ? 'Dando Baixa...' : 'Simular Baixa Automática & Desbloqueio'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
