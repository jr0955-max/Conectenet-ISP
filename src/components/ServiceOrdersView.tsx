import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  Phone,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { ServiceOrder } from '../types/index.js';

interface ServiceOrdersViewProps {
  orders: ServiceOrder[];
  onOpenNewOrder: () => void;
  onEditOrder: (order: ServiceOrder) => void;
  onDeleteOrder: (id: string) => void;
}

export const ServiceOrdersView: React.FC<ServiceOrdersViewProps> = ({
  orders,
  onOpenNewOrder,
  onEditOrder,
  onDeleteOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.technicianName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'aberta':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Aberta</span>;
      case 'em_deslocamento':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Em Deslocamento</span>;
      case 'em_andamento':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Em Andamento</span>;
      case 'concluida':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Concluída</span>;
      case 'cancelada':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Cancelada</span>;
    }
  };

  const getPriorityBadge = (priority: ServiceOrder['priority']) => {
    switch (priority) {
      case 'urgente':
        return <span className="text-red-600 font-bold text-xs flex items-center space-x-1"><AlertTriangle className="w-3.5 h-3.5" /><span>Urgente</span></span>;
      case 'alta':
        return <span className="text-amber-600 font-bold text-xs">Alta</span>;
      case 'normal':
        return <span className="text-slate-600 text-xs">Normal</span>;
      case 'baixa':
        return <span className="text-slate-400 text-xs">Baixa</span>;
    }
  };

  const getTypeLabel = (type: ServiceOrder['type']) => {
    switch (type) {
      case 'instalacao': return 'Instalação Nova';
      case 'sinal_fraco': return 'Sinal Fraco / Rádio';
      case 'manutencao': return 'Manutenção Óptica';
      case 'troca_roteador': return 'Troca de Roteador';
      case 'mudanca_endereco': return 'Mudança de Endereço';
      case 'recolhimento': return 'Recolhimento Comodato';
    }
  };

  const stats = {
    total: orders.length,
    open: orders.filter(o => o.status === 'aberta' || o.status === 'em_deslocamento' || o.status === 'em_andamento').length,
    completed: orders.filter(o => o.status === 'concluida').length,
    urgent: orders.filter(o => o.priority === 'urgente' && o.status !== 'concluida').length
  };

  return (
    <div className="space-y-5">
      {/* Top Banner KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total de O.S.</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">O.S. Pendentes</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{stats.open}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Concluídas</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{stats.completed}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-red-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">Urgentes</p>
            <p className="text-xl font-bold text-red-700 mt-0.5">{stats.urgent}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Header & Search */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por protocolo, cliente, técnico, localidade..."
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
            <option value="aberta">Abertas</option>
            <option value="em_deslocamento">Em Deslocamento</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluídas</option>
          </select>
        </div>

        <button
          onClick={onOpenNewOrder}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Ordem de Serviço</span>
        </button>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Protocolo</th>
                <th className="py-3 px-4">Cliente & Local</th>
                <th className="py-3 px-4">Tipo & Descrição</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Técnico / Agendado</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhuma Ordem de Serviço encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {order.protocol}
                      <span className="block text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                        {order.createdAt}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{order.clientName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{order.address}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-amber-900">{getTypeLabel(order.type)}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{order.description}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getPriorityBadge(order.priority)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{order.technicianName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{order.scheduledDate}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEditOrder(order)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Excluir O.S."
                        >
                          ✕
                        </button>
                      </div>
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
