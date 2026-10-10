import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  ShieldAlert, 
  ShieldCheck, 
  MessageCircle, 
  Edit2, 
  Trash2, 
  FileText, 
  Wifi, 
  Radio, 
  MapPin, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Calendar,
  Lock,
  Unlock
} from 'lucide-react';
import { Client, Plan, Tower, Invoice, CompanySettings } from '../types/index.js';

interface ClientsViewProps {
  clients: Client[];
  plans: Plan[];
  towers: Tower[];
  invoices: Invoice[];
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onToggleBlockClient: (clientId: string) => void;
  onSelectInvoice: (invoice: Invoice) => void;
  isActionLoading: string | null;
  companySettings?: CompanySettings;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  plans,
  towers,
  invoices,
  onOpenNewClient,
  onEditClient,
  onDeleteClient,
  onToggleBlockClient,
  onSelectInvoice,
  isActionLoading,
  companySettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [towerFilter, setTowerFilter] = useState<string>('all');

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.document.includes(searchTerm) ||
      client.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.ruralLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesTower = towerFilter === 'all' || client.towerId === towerFilter;

    return matchesSearch && matchesStatus && matchesTower;
  });

  const getPlanName = (planId: string) => {
    return plans.find(p => p.id === planId)?.name || 'Plano Personalizado';
  };

  const getTowerName = (towerId: string) => {
    return towers.find(t => t.id === towerId)?.name || 'Torre Principal';
  };

  const getClientLatestInvoice = (clientId: string) => {
    return invoices.find(inv => inv.clientId === clientId);
  };

  const generateWhatsAppLink = (client: Client) => {
    const inv = getClientLatestInvoice(client.id);
    const plan = plans.find(p => p.id === client.planId);
    const providerName = companySettings?.name || 'seu provedor de internet';
    let message = '';

    if (client.status === 'blocked') {
      message = `Olá ${client.name}! Notamos uma pendência na fatura do seu plano de internet (${plan?.name || 'Banda Larga'}) da ${providerName}. Para desbloquear seu acesso instantaneamente no MikroTik, utilize o Pix Copia e Cola: ${inv?.pixCopyPaste || `Chave Pix CNPJ: ${companySettings?.cnpj || '28.491.029/0001-83'}`}. O desbloqueio é automático após o pagamento!`;
    } else {
      message = `Olá ${client.name}! Segue sua fatura de internet da ${providerName} referente ao plano ${plan?.name || 'Banda Larga'}. Vencimento: dia ${client.dueDay}. Pague com Pix ou Boleto com baixa instantânea!`;
    }

    const cleanPhone = client.phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">Cadastro de Clientes & PPPoE</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gerencie cadastros, credenciais do MikroTik RouterOS e status de conexão dos assinantes.
            </p>
          </div>

          <button
            onClick={onOpenNewClient}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-950/40 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente & Assinante</span>
          </button>
        </div>

        {/* Filters and Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, PPPoE ou endereço/bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todos os Status ({clients.length})</option>
              <option value="active">Somente Ativos ({clients.filter(c => c.status === 'active').length})</option>
              <option value="blocked">Bloqueados / Corte ({clients.filter(c => c.status === 'blocked').length})</option>
            </select>
          </div>

          {/* Tower Filter */}
          <div>
            <select
              value={towerFilter}
              onChange={(e) => setTowerFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="all">Todas as Torres / POPs</option>
              {towers.map(tower => (
                <option key={tower.id} value={tower.id}>{tower.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Cliente / Documento</th>
                <th className="py-3 px-4">Endereço / Bairro / Torre</th>
                <th className="py-3 px-4">Credenciais PPPoE</th>
                <th className="py-3 px-4">Plano / Venc.</th>
                <th className="py-3 px-4 text-center">Status / Sinal</th>
                <th className="py-3 px-4 text-right">Ações no MikroTik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-emerald-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-slate-300 font-semibold text-sm">Nenhum cliente encontrado</p>
                        <p className="text-slate-500 text-xs mt-0.5">Cadastre um novo assinante para provisionar no MikroTik.</p>
                      </div>
                      <button
                        onClick={onOpenNewClient}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-950 inline-flex items-center space-x-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar Novo Assinante</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => {
                  const inv = getClientLatestInvoice(client.id);
                  const isBlocked = client.status === 'blocked';
                  const isLoading = isActionLoading === client.id;

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & Document */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{client.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                          <span>{client.document}</span>
                          {client.phone && (
                            <span className="text-slate-500">• {client.phone}</span>
                          )}
                        </div>
                      </td>

                      {/* Location & Tower */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1 shrink-0" />
                          <span className="truncate max-w-[200px]">{client.ruralLocation}</span>
                        </div>
                        <div className="text-[11px] text-cyan-400 flex items-center mt-0.5">
                          <Radio className="w-3 h-3 mr-1" />
                          <span>{getTowerName(client.towerId)}</span>
                        </div>
                      </td>

                      {/* PPPoE Credentials */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-cyan-300 font-medium flex items-center space-x-1">
                          <Key className="w-3 h-3 text-cyan-400" />
                          <span>{client.pppoeUsername}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          IP: <span className="text-slate-300">{client.ipAddress || 'Dinâmico'}</span>
                        </div>
                      </td>

                      {/* Plan & Due Day */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{getPlanName(client.planId)}</div>
                        <div className="text-[11px] text-slate-400 flex items-center mt-0.5">
                          <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                          <span>Vencimento: dia {client.dueDay}</span>
                        </div>
                      </td>

                      {/* Status & Wireless Signal */}
                      <td className="py-3.5 px-4 text-center">
                        <div>
                          {isBlocked ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                              <Lock className="w-3 h-3 mr-1" />
                              Bloqueado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Unlock className="w-3 h-3 mr-1" />
                              Ativo
                            </span>
                          )}
                        </div>
                        {client.signalDbm && (
                          <div className="text-[10px] font-mono mt-1 text-slate-400">
                            Sinal: <span className={client.signalDbm > -60 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                              {client.signalDbm} dBm
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Toggle Block in MikroTik */}
                          <button
                            onClick={() => onToggleBlockClient(client.id)}
                            disabled={isLoading}
                            title={isBlocked ? "Desbloquear no MikroTik (restaurar conexão)" : "Bloquear no MikroTik (inadimplência)"}
                            className={`p-1.5 rounded-lg border transition ${
                              isBlocked 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30' 
                                : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                            }`}
                          >
                            {isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                          </button>

                          {/* WhatsApp Direct */}
                          {client.phone && (
                            <a
                              href={generateWhatsAppLink(client)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Enviar cobrança ou mensagem via WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* Invoice / Pix */}
                          {inv && (
                            <button
                              onClick={() => onSelectInvoice(inv)}
                              title="Visualizar fatura e QR Code Pix"
                              className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onEditClient(client)}
                            title="Editar dados do cliente"
                            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteClient(client.id)}
                            title="Remover cliente e Secret do MikroTik"
                            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-red-400 hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
