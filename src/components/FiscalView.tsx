import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Plus, 
  FileCheck, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { FiscalInvoice } from '../types/index.js';

interface FiscalViewProps {
  fiscalInvoices: FiscalInvoice[];
}

export const FiscalView: React.FC<FiscalViewProps> = ({ fiscalInvoices }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = fiscalInvoices.filter(f => {
    return f.number.includes(searchTerm) ||
      f.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.clientDocument.includes(searchTerm) ||
      f.verificationCode.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-5">
      {/* Top Banner Info */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Módulo Fiscal de Telecomunicações (Convênio ICMS 115/03)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Emissão e escrituração de Notas Fiscais Modelo 21 (Serviços de Comunicação) e Modelo 22 (Telecomunicações).
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('Geração de arquivos de remessa do Convênio 115/03 para entrega na SEFAZ.')}
          className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-bold rounded-xl shadow-sm hover:bg-amber-50 transition shrink-0"
        >
          Gerar Arquivos SEFAZ (Mestre/Item)
        </button>
      </div>

      {/* Search Header */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número da nota, cliente, CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Fiscal Notes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Modelo / Número</th>
                <th className="py-3 px-4">Destinatário & CPF/CNPJ</th>
                <th className="py-3 px-4">Período / CFOP</th>
                <th className="py-3 px-4">Valor Total</th>
                <th className="py-3 px-4">Base / ICMS</th>
                <th className="py-3 px-4">Chave / Código</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Danfe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.map(f => (
                <tr key={f.id} className="hover:bg-amber-50/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    Mod {f.model} - Nº {f.number}
                    <span className="block text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                      Série {f.series} • {f.emissionDate}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{f.clientName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{f.clientDocument}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-700">{f.period}</span>
                    <span className="block text-[10px] text-slate-500">CFOP {f.cfop}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    R$ {f.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 font-mono text-[11px]">
                    R$ {f.icmsAmount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {f.verificationCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {f.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Imprimindo DANFE da Nota Fiscal ${f.number}`)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                    >
                      Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
