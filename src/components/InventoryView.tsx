import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Cpu, 
  Radio, 
  Wifi, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { Equipment } from '../types/index.js';

interface InventoryViewProps {
  equipments: Equipment[];
  onOpenNewEquipment?: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ equipments, onOpenNewEquipment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = 
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.clientName && eq.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case 'disponivel':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Em Estoque</span>;
      case 'comodato':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Em Comodato</span>;
      case 'manutencao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Em Bancada</span>;
      case 'avariado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">Defeituoso</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Actions */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por modelo, MAC address, serial ou cliente..."
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
            <option value="disponivel">Disponíveis (Estoque)</option>
            <option value="comodato">Em Comodato (Cliente)</option>
            <option value="manutencao">Bancada / Teste</option>
          </select>
        </div>

        <button
          onClick={onOpenNewEquipment}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Equipamento</span>
        </button>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Modelo / Tipo</th>
                <th className="py-3 px-4">Endereço MAC</th>
                <th className="py-3 px-4">Número de Série</th>
                <th className="py-3 px-4">Vinculado a (Cliente)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Nenhum equipamento cadastrado.
                  </td>
                </tr>
              ) : (
                filteredEquipments.map(eq => (
                  <tr key={eq.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{eq.model}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{eq.type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {eq.macAddress}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {eq.serialNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      {eq.clientName ? (
                        <div>
                          <span className="font-semibold text-slate-900">{eq.clientName}</span>
                          <span className="block text-[10px] text-slate-400">Desde: {eq.assignedDate}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Disponível no Almoxarifado</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(eq.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert(`Gerenciando equipamento MAC: ${eq.macAddress}`)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        Editar
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
