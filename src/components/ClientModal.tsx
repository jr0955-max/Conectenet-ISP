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
  CheckCircle2,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { Client, Plan, Tower, MikrotikServer } from '../types/index.js';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Partial<Client>) => Promise<void> | void;
  clientToEdit?: Client | null;
  plans: Plan[];
  towers: Tower[];
  servers?: MikrotikServer[];
  onOpenNewPlan?: () => void;
  onOpenNewServer?: () => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clientToEdit,
  plans,
  towers,
  servers = [],
  onOpenNewPlan,
  onOpenNewServer
}) => {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [ruralLocation, setRuralLocation] = useState('');
  const [serverId, setServerId] = useState('');
  const [towerId, setTowerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [dueDay, setDueDay] = useState(10);
  const [pppoeUsername, setPppoeUsername] = useState('');
  const [pppoePassword, setPppoePassword] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const effectiveServers: MikrotikServer[] = servers.length > 0 ? servers : [
    {
      id: 'srv-1',
      name: 'Servidor Sede (RB Principal 192.168.1.120)',
      host: '192.168.1.120',
      port: 8728,
      user: 'admin_isp',
      interfaceName: 'ether2',
      defaultProfile: 'prof_15m_padrao',
      blockProfile: 'prof_corte_bloqueado',
      location: 'Sede Central (Porta 01 - WAN)',
      isDefault: true,
      status: 'connected'
    }
  ];

  const effectiveTowers = towers.length > 0 ? towers : [
    { id: 'tower-1', name: 'Torre Serra Azul (Principal)', location: 'Serra do Cruzeiro', frequency: '5.8 GHz', capacity: 120, activeClients: 42, status: 'online' as const, coordinates: '-15.78, -47.92', ipGateway: '10.50.1.1' },
    { id: 'tower-2', name: 'POP Fazenda Boa Esperança', location: 'Silo Central', frequency: '5.8 GHz', capacity: 80, activeClients: 28, status: 'online' as const, coordinates: '-15.82, -47.88', ipGateway: '10.50.2.1' },
    { id: 'tower-3', name: 'Repetidora Morro das Pedras', location: 'Estrada Vicinal Km 24', frequency: '5.8 GHz / Enlace PTP', capacity: 60, activeClients: 15, status: 'online' as const, coordinates: '-15.85, -47.96', ipGateway: '10.50.3.1' },
    { id: 'tower-4', name: 'OLT Central Vila Santa Maria', location: 'Distrito Central (Fibra FTTH)', frequency: 'GPON / EPON 2.5G', capacity: 256, activeClients: 85, status: 'online' as const, coordinates: '-15.76, -47.91', ipGateway: '10.50.4.1' }
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
      setServerId(clientToEdit.serverId || effectiveServers.find(s => s.isDefault)?.id || effectiveServers[0]?.id || 'srv-1');
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
      setServerId(effectiveServers.find(s => s.isDefault)?.id || effectiveServers[0]?.id || 'srv-1');
      setTowerId(effectiveTowers[0]?.id || 'tower-1');
      setPlanId(effectivePlans[0]?.id || 'plan-2');
      setDueDay(10);
      setPppoeUsername('');
      setPppoePassword('net@' + Math.floor(1000 + Math.random() * 9000));
      setIpAddress('');
      setMacAddress('');
    }
  }, [clientToEdit, isOpen, towers, plans, servers]);

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
        serverId: serverId || effectiveServers[0]?.id,
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

          {/* Section 2: Servidor MikroTik & Torre / POP (Rede em Bridge) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="font-semibold text-slate-300 text-xs flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Servidor MikroTik & Ponto de Conexão (Rede em Bridge)</span>
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md inline-block w-fit">
                Bridge: Servidor + Torre por Localidade
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Servidor MikroTik Concentrador PPPoE */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium text-xs">
                    Servidor MikroTik (Concentrador PPPoE) <span className="text-emerald-400">*</span>
                  </label>
                  {onOpenNewServer && (
                    <button
                      type="button"
                      onClick={onOpenNewServer}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cadastrar RB</span>
                    </button>
                  )}
                </div>
                <select
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/40 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition font-mono text-xs"
                >
                  {effectiveServers.map(srv => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({srv.host})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  RB onde o Secret PPPoE será criado automaticamente via API RouterOS.
                </p>
              </div>

              {/* Torre / POP de Conexão */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 text-xs">
                  Torre / Ponto de Acesso (Bridge / POP)
                </label>
                <select
                  value={towerId}
                  onChange={(e) => setTowerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition text-xs"
                >
                  {effectiveTowers.map(tower => (
                    <option key={tower.id} value={tower.id}>{tower.name} ({tower.frequency})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Torre / AP ou repetidora que atende o cliente na rede em bridge.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 text-xs">Bairro / Região / Localidade</label>
                <input
                  type="text"
                  value={ruralLocation}
                  onChange={(e) => setRuralLocation(e.target.value)}
                  placeholder="Ex: Bairro Centro ou Fazenda Boa Esperança"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 text-xs">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Estrada Vicinal 3, Lote 45, Sede"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition text-xs"
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

          {/* RouterOS CLI Live Preview */}
          {pppoeUsername && (
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>
                    Comando MikroTik [{effectiveServers.find(s => s.id === serverId)?.name || 'RB Concentrador'} - {effectiveServers.find(s => s.id === serverId)?.host || '192.168.1.120'}]
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const prof = effectivePlans.find(p => p.id === planId)?.profileName || 'default';
                    const cmd = `/ppp secret add name="${pppoeUsername}" password="${pppoePassword}" profile="${prof}" service=pppoe comment="${name || 'Cliente'} - ${ruralLocation || 'Zona Rural'}"${ipAddress ? ` remote-address=${ipAddress}` : ''}${macAddress ? ` caller-id=${macAddress}` : ''}`;
                    navigator.clipboard.writeText(cmd);
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center space-x-1 transition text-[10px]"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Copiado!' : 'Copiar para Winbox'}</span>
                </button>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-emerald-300 break-all select-all text-[10px] leading-relaxed">
                {`/ppp secret add name="${pppoeUsername}" password="${pppoePassword}" profile="${effectivePlans.find(p => p.id === planId)?.profileName || 'default'}" service=pppoe comment="${name || 'Cliente'} - ${ruralLocation || 'Zona Rural'}"${ipAddress ? ` remote-address=${ipAddress}` : ''}${macAddress ? ` caller-id=${macAddress}` : ''}`}
              </div>
              <p className="text-[10px] text-emerald-400 font-sans flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Ao salvar, este comando será enviado <strong>automaticamente via API (Porta 8728)</strong> para o MikroTik <strong>{effectiveServers.find(s => s.id === serverId)?.host || '192.168.1.120'}</strong> e o login será criado na hora!
                </span>
              </p>
            </div>
          )}

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
