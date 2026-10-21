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
  WifiOff,
  Radio, 
  MapPin, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Calendar,
  Lock,
  Unlock,
  Terminal,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { Client, Plan, Tower, Invoice, CompanySettings, MikrotikServer, ActiveSession } from '../types/index.js';

interface ClientsViewProps {
  clients: Client[];
  plans: Plan[];
  towers: Tower[];
  servers?: MikrotikServer[];
  activeSessions?: ActiveSession[];
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
  servers = [],
  activeSessions = [],
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'active' | 'blocked'>('all');
  const [serverFilter, setServerFilter] = useState<string>('all');
  const [towerFilter, setTowerFilter] = useState<string>('all');
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);

  const onlineCount = clients.filter(c => activeSessions.some(s => s.username === c.pppoeUsername)).length;
  const offlineCount = clients.length - onlineCount;
  const activeCount = clients.filter(c => c.status === 'active').length;
  const blockedCount = clients.filter(c => c.status === 'blocked').length;

  const handleExportAllSecrets = () => {
    if (clients.length === 0) return;
    const lines = [
      '# ============================================================================== #',
      '# EXPORTAÇÃO DE SECRETS PPPOE PARA MIKROTIK ROUTEROS (GERADO AUTOMATICAMENTE)   #',
      '# Cole este bloco no New Terminal do Winbox                                     #',
      '# ============================================================================== #',
      ''
    ];

    clients.forEach(c => {
      const plan = plans.find(p => p.id === c.planId);
      const profile = c.status === 'blocked' ? 'bloqueados' : (plan?.profileName || 'default');
      const comment = `${c.name} - ${c.ruralLocation}`;
      lines.push(
        `:if ([:len [/ppp secret find name="${c.pppoeUsername}"]] = 0) do={ /ppp secret add name="${c.pppoeUsername}" password="${c.pppoePassword}" profile="${profile}" service=pppoe comment="${comment}"${c.ipAddress ? ` remote-address=${c.ipAddress}` : ''} } else={ /ppp secret set [find name="${c.pppoeUsername}"] password="${c.pppoePassword}" profile="${profile}" comment="${comment}" }`
      );
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.document.includes(searchTerm) ||
      client.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.ruralLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm);

    const isOnline = activeSessions.some(s => s.username === client.pppoeUsername);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = client.status === 'active';
    else if (statusFilter === 'blocked') matchesStatus = client.status === 'blocked';
    else if (statusFilter === 'online') matchesStatus = isOnline;
    else if (statusFilter === 'offline') matchesStatus = !isOnline;

    const matchesTower = towerFilter === 'all' || client.towerId === towerFilter;
    const matchesServer = serverFilter === 'all' || client.serverId === serverFilter;

    return matchesSearch && matchesStatus && matchesTower && matchesServer;
  });

  const getPlanName = (planId: string) => {
    return plans.find(p => p.id === planId)?.name || 'Plano Personalizado';
  };

  const getTowerName = (towerId: string) => {
    return towers.find(t => t.id === towerId)?.name || 'Torre Principal';
  };

  const getServerName = (serverId?: string) => {
    if (!serverId) return servers[0]?.name || 'RB Sede (192.168.1.120)';
    const s = servers.find(item => item.id === serverId);
    return s ? `${s.name} (${s.host})` : 'RB Sede';
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

          <div className="flex items-center space-x-2 shrink-0">
            {clients.length > 0 && (
              <button
                onClick={handleExportAllSecrets}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs transition border border-slate-700"
                title="Copiar todos os comandos /ppp secret add dos clientes para colar no Terminal do Winbox"
              >
                {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{copiedBatch ? 'Script Copiado!' : 'Copiar Script MikroTik'}</span>
              </button>
            )}

            <button
              onClick={onOpenNewClient}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-950/40 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente & Assinante</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Buttons (Online / Offline / Ativos / Bloqueados) */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2 pt-1 border-t border-slate-800/80">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-500'
                : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Todos ({clients.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('online')}
            title="Clique para listar somente os clientes com conexão ativa agora no MikroTik"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950 font-bold ring-2 ring-emerald-400/30'
                : 'bg-slate-950/80 border border-slate-800 text-emerald-400 hover:text-white hover:bg-emerald-950/40 hover:border-emerald-600/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5" />
            <span>Clientes Online ({onlineCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('offline')}
            title="Clique para listar somente os clientes desconectados (sem sessão PPPoE)"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
              statusFilter === 'offline'
                ? 'bg-slate-600 text-white shadow-sm font-bold ring-2 ring-slate-400/30'
                : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Clientes Offline ({offlineCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'active'
                ? 'bg-teal-700 text-white shadow-sm ring-1 ring-teal-500'
                : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>Cadastros Ativos ({activeCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('blocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'blocked'
                ? 'bg-red-700 text-white shadow-sm ring-1 ring-red-500'
                : 'bg-slate-950/80 border border-slate-800 text-red-400 hover:text-red-300 hover:bg-red-950/30'
            }`}
          >
            <span>Bloqueados / Corte ({blockedCount})</span>
          </button>
        </div>

        {/* Filters and Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, PPPoE..."
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
              <option value="online">🟢 Clientes Online no MikroTik ({onlineCount})</option>
              <option value="offline">⚪ Clientes Offline / Desconectados ({offlineCount})</option>
              <option value="active">Somente Cadastros Ativos ({activeCount})</option>
              <option value="blocked">Bloqueados / Corte ({blockedCount})</option>
            </select>
          </div>

          {/* Servidor MikroTik Filter */}
          <div>
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition font-mono"
            >
              <option value="all">Todas as RBs MikroTik</option>
              {servers.map(srv => (
                <option key={srv.id} value={srv.id}>RB: {srv.name} ({srv.host})</option>
              ))}
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

                      {/* Location & Tower & Server */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center text-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1 shrink-0" />
                          <span className="truncate max-w-[200px] font-medium">{client.ruralLocation}</span>
                        </div>
                        <div className="text-[11px] text-cyan-400 flex items-center mt-0.5">
                          <Radio className="w-3 h-3 mr-1 shrink-0" />
                          <span className="truncate max-w-[190px]">{getTowerName(client.towerId)}</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 shrink-0 inline-block"></span>
                          <span className="truncate max-w-[210px]">{getServerName(client.serverId)}</span>
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

                      {/* Status & Real Connection */}
                      <td className="py-3.5 px-4 text-center">
                        {(() => {
                          const isOnline = activeSessions.some(s => s.username === client.pppoeUsername);
                          return (
                            <div className="space-y-1">
                              {/* PPPoE Real Physical Connection Badge */}
                              <div>
                                {isOnline ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                                    Online (PPP)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1" />
                                    Offline
                                  </span>
                                )}
                              </div>

                              {/* Cadastral / Billing Status */}
                              <div>
                                {isBlocked ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-400">
                                    <Lock className="w-2.5 h-2.5 mr-0.5" />
                                    Bloqueado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[9px] text-slate-400">
                                    <Unlock className="w-2.5 h-2.5 mr-0.5 text-emerald-400" />
                                    Ativo
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
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
                            title={isBlocked ? "Desbloquear no MikroTik (restaurar conexão e profile normal)" : "Bloquear no MikroTik (corte por inadimplência)"}
                            className={`p-1.5 rounded-lg border transition ${
                              isBlocked 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30' 
                                : 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                            }`}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                            ) : isBlocked ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <ShieldAlert className="w-4 h-4" />
                            )}
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

                          {/* MikroTik CLI Copy */}
                          <button
                            onClick={() => {
                              const plan = plans.find(p => p.id === client.planId);
                              const profile = client.status === 'blocked' ? 'bloqueados' : (plan?.profileName || 'default');
                              const comment = `${client.name} - ${client.ruralLocation}`;
                              const cmd = `:if ([:len [/ppp secret find name="${client.pppoeUsername}"]] = 0) do={ /ppp secret add name="${client.pppoeUsername}" password="${client.pppoePassword}" profile="${profile}" service=pppoe comment="${comment}"${client.ipAddress ? ` remote-address=${client.ipAddress}` : ''} } else={ /ppp secret set [find name="${client.pppoeUsername}"] password="${client.pppoePassword}" profile="${profile}" comment="${comment}" }`;
                              navigator.clipboard.writeText(cmd);
                              setCopiedClientId(client.id);
                              setTimeout(() => setCopiedClientId(null), 2000);
                            }}
                            title="Copiar comando MikroTik RouterOS (/ppp secret) para New Terminal no Winbox"
                            className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition"
                          >
                            {copiedClientId === client.id ? <Check className="w-4 h-4 text-emerald-300" /> : <Terminal className="w-4 h-4" />}
                          </button>

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
