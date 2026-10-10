import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, User, MapPin, AlertCircle, Phone, FileText } from 'lucide-react';
import { ServiceOrder, Client } from '../types/index.js';

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<ServiceOrder>) => Promise<void>;
  orderToEdit: ServiceOrder | null;
  clients: Client[];
}

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  orderToEdit,
  clients
}) => {
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<ServiceOrder['type']>('instalacao');
  const [priority, setPriority] = useState<ServiceOrder['priority']>('normal');
  const [status, setStatus] = useState<ServiceOrder['status']>('aberta');
  const [technicianName, setTechnicianName] = useState('Lucas Ferreira (Técnico Campo)');
  const [scheduledDate, setScheduledDate] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderToEdit) {
      setClientId(orderToEdit.clientId);
      setClientName(orderToEdit.clientName);
      setClientPhone(orderToEdit.clientPhone);
      setAddress(orderToEdit.address);
      setType(orderToEdit.type);
      setPriority(orderToEdit.priority);
      setStatus(orderToEdit.status);
      setTechnicianName(orderToEdit.technicianName);
      setScheduledDate(orderToEdit.scheduledDate);
      setDescription(orderToEdit.description);
      setResolutionNotes(orderToEdit.resolutionNotes || '');
    } else {
      const defaultClient = clients[0];
      setClientId(defaultClient?.id || '');
      setClientName(defaultClient?.name || '');
      setClientPhone(defaultClient?.phone || '');
      setAddress(defaultClient?.address || '');
      setType('instalacao');
      setPriority('normal');
      setStatus('aberta');
      setTechnicianName('Lucas Ferreira (Técnico Campo)');
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      setScheduledDate(`${tomorrow} 09:00`);
      setDescription('');
      setResolutionNotes('');
    }
    setError(null);
  }, [orderToEdit, clients, isOpen]);

  const handleSelectClient = (cId: string) => {
    setClientId(cId);
    const found = clients.find(c => c.id === cId);
    if (found) {
      setClientName(found.name);
      setClientPhone(found.phone);
      setAddress(`${found.address} - ${found.ruralLocation}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) {
      setError('Selecione ou informe o cliente');
      return;
    }
    if (!description) {
      setError('Preencha a descrição do chamado/serviço.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave({
        clientId,
        clientName,
        clientPhone,
        address,
        type,
        priority,
        status,
        technicianName,
        scheduledDate,
        description,
        resolutionNotes
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar Ordem de Serviço');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {orderToEdit ? `Editar O.S. ${orderToEdit.protocol}` : 'Nova Ordem de Serviço (O.S.)'}
              </h3>
              <p className="text-xs text-amber-100">Agendamento e despacho técnico de campo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vincular a Cliente Cadastrado
            </label>
            <select
              value={clientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900"
            >
              <option value="">-- Cliente Avulso / Não cadastrado --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.pppoeUsername}) - {c.ruralLocation}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Cliente</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço & Localização do Assinante</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço, rua, número, bairro ou ponto de referência"
                className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Tipo e Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de O.S.</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="instalacao">Instalação Nova</option>
                <option value="sinal_fraco">Sinal Fraco / Oscilação</option>
                <option value="manutencao">Manutenção Óptica/Rádio</option>
                <option value="troca_roteador">Troca de Roteador / Fonte</option>
                <option value="mudanca_endereco">Mudança de Endereço</option>
                <option value="recolhimento">Recolhimento de Comodato</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status da O.S.</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="aberta">Aberta</option>
                <option value="em_deslocamento">Em Deslocamento</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Técnico e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Técnico Responsável</label>
              <select
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
              >
                <option value="Lucas Ferreira (Técnico Campo)">Lucas Ferreira (Técnico Campo)</option>
                <option value="Marcos Vinícius (Redes & Rádio)">Marcos Vinícius (Redes & Rádio)</option>
                <option value="Rodrigo Antunes (Fibra Óptica)">Rodrigo Antunes (Fibra Óptica)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data / Hora Agendada</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  placeholder="AAAA-MM-DD HH:MM"
                  className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição / Reclamação</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema ou detalhes do serviço a executar..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Parecer de Conclusão */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parecer Técnico / Solução (opcional se não concluída)
            </label>
            <textarea
              rows={2}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Observações do técnico após o atendimento..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {isSaving ? 'Gravando...' : (orderToEdit ? 'Salvar Alterações' : 'Criar Ordem de Serviço')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
