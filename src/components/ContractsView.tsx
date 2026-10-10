import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  User,
  Calendar,
  Layers
} from 'lucide-react';
import { Contract } from '../types/index.js';

interface ContractsViewProps {
  contracts: Contract[];
  onOpenNewContract?: () => void;
}

export const ContractsView: React.FC<ContractsViewProps> = ({ contracts, onOpenNewContract }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = 
      c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientDocument.includes(searchTerm) ||
      c.planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar contrato, cliente, CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-300 p-2 text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="pendente_assinatura">Pendente Assinatura</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>

        <button
          onClick={onOpenNewContract}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Contrato</span>
        </button>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Nº Contrato</th>
                <th className="py-3 px-4">Cliente & Documento</th>
                <th className="py-3 px-4">Plano / Valor</th>
                <th className="py-3 px-4">Comodato de Equipamento</th>
                <th className="py-3 px-4">Fidelidade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                filteredContracts.map(c => (
                  <tr key={c.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                      {c.contractNumber}
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                        Início: {c.startDate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.clientName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{c.clientDocument}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{c.planName}</div>
                      <div className="text-[11px] text-emerald-600 font-bold">
                        R$ {c.monthlyValue.toFixed(2)}/mês
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 text-xs">
                        {c.equipmentComodato || 'Sem comodato vinculado'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700">
                        {c.loyaltyMonths} meses
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === 'ativo' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Ativo & Assinado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Pendente Assinatura
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert(`Visualizando minuta do contrato ${c.contractNumber} para ${c.clientName}`)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        Ver Termo PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
