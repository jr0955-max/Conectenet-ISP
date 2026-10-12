import React from 'react';
import { X, CheckCircle2, Clock, AlertTriangle, QrCode, Printer, FileText } from 'lucide-react';
import { Carne, Invoice } from '../types/index.js';

interface CarneDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  carne: Carne | null;
  invoices: Invoice[];
  onPrintCarne: (carne: Carne) => void;
  onPayInvoice: (invoiceId: string) => Promise<any>;
}

export const CarneDetailsModal: React.FC<CarneDetailsModalProps> = ({
  isOpen,
  onClose,
  carne,
  invoices,
  onPrintCarne,
  onPayInvoice
}) => {
  if (!isOpen || !carne) return null;

  // Find all invoices linked to this carnê or client matching installment
  const carneInvoices = invoices.filter(inv => 
    inv.carneId === carne.id || 
    (inv.clientId === carne.clientId && !!inv.installment)
  ).slice(0, carne.totalInstallments);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white text-slate-800 rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>Carnê Nº {carne.id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                carne.status === 'em dia' ? 'bg-blue-600' : 'bg-red-600'
              }`}>
                {carne.status}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliente: <strong className="text-slate-800">{carne.clientName}</strong> • {carne.totalInstallments} parcelas • Criado em: {carne.createdAt}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPrintCarne(carne)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir (3 por Folha)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Parcelas Table */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Parcela</th>
                <th className="py-2.5 px-3">Vencimento</th>
                <th className="py-2.5 px-3">Mês Ref.</th>
                <th className="py-2.5 px-3">Valor</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carneInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    As parcelas deste carnê estão disponíveis para impressão ou consulta direta.
                  </td>
                </tr>
              ) : (
                carneInvoices.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {inv.installment || `${idx + 1}/${carne.totalInstallments}`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      {inv.dueDate}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {inv.referenceMonth}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {inv.status === 'paga' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Paga
                        </span>
                      ) : inv.status === 'atrasada' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Em atraso
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {inv.status !== 'paga' && (
                        <button
                          onClick={() => onPayInvoice(inv.id)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition"
                        >
                          Dar Baixa
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
