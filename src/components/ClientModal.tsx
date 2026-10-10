import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Key, 
  Radio, 
  MapPin, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  Plus,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Client, Plan, Tower } from '../types/index.js';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Partial<Client>) => Promise<void> | void;
  clientToEdit?: Client | null;
  plans: Plan[];
  towers: Tower[];
  onOpenNewPlan?: () => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientToEdit,
  plans,
  towers,
  onOpenNewPlan
}) => {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [ruralLocation, setRuralLocation] = useState('');
  const [towerId, setTowerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [dueDay, setDueDay] = useState(10);
  const [pppoeUsername, setPppoeUsername] = useState('');
  const [pppoePassword, setPppoePassword] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveTowers = towers.length > 0 ? towers : [
    { id: 'tower-1', name: 'Torre Serra Azul (Principal)', location: 'Serra do Cruzeiro', frequency: '5.8 GHz', capacity: 120, activeClients: 42, status: 'online' as const, coordinates: '-15.78, -47.92', ipGateway: '10.50.1.1' },
    { id: 'tower-2', name: 'POP Fazenda Boa Esperança', location: 'Silo Central', frequency: '5.8 GHz', capacity: 80, activeClients: 28, status: 'online' as const, coordinates: '-15.82, -47.88', ipGateway: '10.50.2.1' }
  ];

  const effectivePlans = plans.length > 0 ? plans : [
    { id: 'plan-1', name: 'Plano Turbo 15M (Wireless 5.8GHz)', speedDown: 15, speedUp: 5, price: 89.90, technology: 'radio_5ghz' as const, profileName: 'prof_15m_padrao' },
    { id: 'plan-2', name: 'Plano Ultra 30M (Wireless 5.8GHz)', speedDown: 30, speedUp: 10, price: 119.90, technology: 'radio_5ghz' as const, profileName: 'prof_30m_ultra' },
    { id: 'plan-4', name: 'Fibra Óptica 150M Full Duplex', speedDown: 150, speedUp: 50, price: 149.90, technology: 'fibra' as const, profileName: 'prof_150m_fibra' }
  ];

  useEffect(() => {
    setValidationError(null);
    setIsSubmitting(false);

    if (clientToEdit) {
      setName(clientToEdit.name);
      setDocument(clientToEdit.document);
      setPhone(clientToEdit.phone || '');
      setEmail(clientToEdit.email || '');
      setAddress(clientToEdit.address || '');
      setRuralLocation(clientToEdit.ruralLocation || '');
      setTowerId(clientToEdit.towerId || effectiveTowers[0]?.id || 'tower-1');
      setPlanId(clientToEdit.planId || effectivePlans[0]?.id || 'plan-2');
      setDueDay(clientToEdit.dueDay || 10);
      setPppoeUsername(clientToEdit.pppoeUsername || '');
      setPppoePassword(clientToEdit.pppoePassword || '');
      setIpAddress(clientToEdit.ipAddress || '');
      setMacAddress(clientToEdit.macAddress || '');
    } else {
      setName('');
      setDocument('');
      setPhone('');
      setEmail('');
      setAddress('');
      setRuralLocation('');
      setTowerId(effectiveTowers[0]?.id || 'tower-1');
      setPlanId(effectivePlans[0]?.id || 'plan-2');
      setDueDay(10);
      setPppoeUsername('');
      setPppoePassword('net@' + Math.floor(1000 + Math.random() * 9000));
      setIpAddress('');
      setMacAddress('');
    }
  }, [clientToEdit, isOpen, towers, plans]);

  // Auto-generate suggested PPPoE username from Name if not manually customized
  const handleNameChange = (val: string) => {
    setName(val);
    setValidationError(null);
    if (!clientToEdit) {
      const clean = val
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 16);
      if (clean && !pppoeUsername) {
        setPppoeUsername(clean);
      }
    }
  };

  // Quick fill sample data for fast testing in bench / lab mode
  const handleFillSample = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const sampleName = `Cliente Assinante Teste ${randomSuffix}`;
    setName(sampleName);
    setDocument(`${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}`);
    setPhone(`556199${Math.floor(1000000 + Math.random() * 8999999)}`);
    setEmail(`cliente${randomSuffix}@provedor.com.br`);
    setRuralLocation(`Bairro Primavera - Setor ${randomSuffix}`);
    setAddress(`Rua das Palmeiras, ${randomSuffix}`);
    setPppoeUsername(`cliente_${randomSuffix}`);
    setPppoePassword(`net${randomSuffix}`);
    setIpAddress(`10.50.1.${Math.floor(10 + Math.random() * 200)}`);
    setValidationError(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Por favor, informe o Nome Completo do cliente.');
      return;
    }
    if (!document.trim()) {
      setValidationError('Por favor, informe o CPF ou CNPJ do cliente.');
      return;
    }
    if (!pppoeUsername.trim()) {
      setValidationError('Por favor, defina o Usuário PPPoE para conexão no MikroTik.');
      return;
    }
    if (!pppoePassword.trim()) {
      setValidationError('Por favor, defina a Senha PPPoE para conexão no MikroTik.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        document: document.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        ruralLocation: ruralLocation.trim() || 'Zona Rural',
        towerId: towerId || effectiveTowers[0]?.id,
        planId: planId || effectivePlans[0]?.id,
        dueDay: Number(dueDay),
        pppoeUsername: pppoeUsername.trim(),
        pppoePassword: pppoePassword.trim(),
        ipAddress: ipAddress.trim() || undefined,
        macAddress: macAddress.trim() || undefined
      });
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao processar cadastro do cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {clientToEdit ? 'Editar Cliente & PPPoE' : 'Cadastrar Novo Cliente & Assinante'}
              </h3>
              <p className="text-xs text-slate-400">
                Os dados de login PPPoE serão provisionados automaticamente no MikroTik RouterOS (/ppp secret).
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bench Quick Fill Helper */}
        {!clientToEdit && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Fazendo teste de bancada no MikroTik?</span>
            </div>
            <button
              type="button"
              onClick={handleFillSample}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm shrink-0 flex items-center space-x-1"
            >
              <span>Preencher Exemplo</span>
            </button>
          </div>
        )}

        {/* Validation Error Alert */}
        {validationError && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Dados Pessoais */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
              <span>1. Dados Cadastrais</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nome Completo <span className="text-emerald-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: João da Silva Moreira"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  CPF ou CNPJ <span className="text-emerald-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={document}
                  onChange={(e) => {
                    setDocument(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Ex: 000.000.000-00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 5561999998888"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@fazenda.com.br"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Endereço & Torre */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="font-semibold text-slate-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
              <span>2. Endereço, Bairro & Torre / POP de Conexão</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Bairro / Região / Ponto de Referência</label>
                <input
                  type="text"
                  value={ruralLocation}
                  onChange={(e) => setRuralLocation(e.target.value)}
                  placeholder="Ex: Bairro Centro ou Setor Norte - Quadra 04"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Torre / POP de Conexão</label>
                <select
                  value={towerId}
                  onChange={(e) => setTowerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  {effectiveTowers.map(tower => (
                    <option key={tower.id} value={tower.id}>{tower.name} ({tower.frequency})</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Estrada Vicinal 3, Lote 45, Sede"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Plano & Vencimento */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
                <span>3. Plano de Internet & Faturamento</span>
              </h4>
              {onOpenNewPlan && (
                <button
                  type="button"
                  onClick={onOpenNewPlan}
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Cadastrar Novo Plano</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Plano Contratado</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  {effectivePlans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price.toFixed(2)} ({plan.speedDown}M)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dia do Vencimento</label>
                <select
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-mono transition"
                >
                  <option value={5}>Dia 05 de cada mês</option>
                  <option value={10}>Dia 10 de cada mês</option>
                  <option value={15}>Dia 15 de cada mês</option>
                  <option value={20}>Dia 20 de cada mês</option>
                  <option value={25}>Dia 25 de cada mês</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Credenciais MikroTik PPPoE */}
          <div className="space-y-3 pt-2 border-t border-slate-800 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <h4 className="font-semibold text-cyan-400 text-xs flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
              <Key className="w-3.5 h-3.5" />
              <span>4. Credenciais MikroTik RouterOS (/ppp secret)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Usuário PPPoE <span className="text-cyan-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pppoeUsername}
                  onChange={(e) => {
                    setPppoeUsername(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="usuario_pppoe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Senha PPPoE <span className="text-cyan-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pppoePassword}
                  onChange={(e) => {
                    setPppoePassword(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="senha123"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">IP Fixo (Opcional)</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Ex: 10.50.1.150 (vazio = pool)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">MAC Address / Caller-ID (Opcional)</label>
                <input
                  type="text"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  placeholder="00:11:22:33:44:55"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition shadow-md shadow-emerald-950 flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sincronizando MikroTik...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{clientToEdit ? 'Atualizar no MikroTik' : 'Criar Cliente & Secret'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
