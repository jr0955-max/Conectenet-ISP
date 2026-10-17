import React, { useState, useEffect } from 'react';
import { X, Gauge, Zap, Radio, Wifi, DollarSign, Terminal, ShieldCheck } from 'lucide-react';
import { Plan } from '../types/index.js';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: Partial<Plan>) => void;
  planToEdit?: Plan | null;
}

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  planToEdit
}) => {
  const [name, setName] = useState('');
  const [speedDown, setSpeedDown] = useState<number>(30);
  const [speedUp, setSpeedUp] = useState<number>(10);
  const [price, setPrice] = useState<number>(119.90);
  const [technology, setTechnology] = useState<'radio_5ghz' | 'fibra' | 'radio_24ghz'>('radio_5ghz');
  const [profileName, setProfileName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name);
      setSpeedDown(planToEdit.speedDown);
      setSpeedUp(planToEdit.speedUp);
      setPrice(planToEdit.price);
      setTechnology(planToEdit.technology);
      setProfileName(planToEdit.profileName);
      setDescription(planToEdit.description || '');
    } else {
      setName('');
      setSpeedDown(30);
      setSpeedUp(10);
      setPrice(119.90);
      setTechnology('radio_5ghz');
      setProfileName('prof_30m_agro');
      setDescription('');
    }
  }, [planToEdit, isOpen]);

  // Auto-generate suggested profile name when name or speed changes
  const handleSpeedChange = (down: number) => {
    setSpeedDown(down);
    setSpeedUp(Math.round(down / 3) || 5);
    if (!planToEdit && !profileName) {
      setProfileName(`prof_${down}m_${technology === 'fibra' ? 'fibra' : 'turbo'}`);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!planToEdit) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
      if (clean) setProfileName(`prof_${clean}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !speedDown || !price) return;

    onSave({
      name,
      speedDown: Number(speedDown),
      speedUp: Number(speedUp),
      price: Number(price),
      technology,
      profileName: profileName || `prof_${speedDown}m`,
      description
    });
  };

  // Preview generated MikroTik command
  const previewRouterOsCommand = `/ppp profile add name="${profileName || 'prof_plano'}" rate-limit="${speedUp}M/${speedDown}M" comment="${name} - AgroISP"`;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {planToEdit ? 'Editar Plano de Internet' : 'Cadastrar Novo Plano de Internet'}
              </h3>
              <p className="text-xs text-slate-400">
                O perfil correspondente (PPP Profile) será sincronizado com o MikroTik RouterOS.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome Comercial do Plano *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Ultra Fibra 300M ou Rádio Turbo 50M"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Download (Mbps) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    value={speedDown}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-mono text-xs">Mbps</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Upload (Mbps) *</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    value={speedUp}
                    onChange={(e) => setSpeedUp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-500 font-mono text-xs">Mbps</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Valor Mensal (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 text-xs">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tecnologia da Rede</label>
                <select
                  value={technology}
                  onChange={(e) => setTechnology(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="radio_5ghz">Rádio 5.8 GHz (AirMAX / Cambium)</option>
                  <option value="fibra">Fibra Óptica (FTTH / GPON)</option>
                  <option value="radio_24ghz">Rádio 2.4 GHz</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Nome do Perfil no MikroTik RouterOS (PPP Profile)
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: prof_50m_agro"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Nome do profile que será configurado no MikroTik para aplicar o limite de banda via <code>rate-limit</code>.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Descrição / Observações (Opcional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Recomendado para sedes de fazendas, telemetria e câmeras."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* MikroTik Command Preview */}
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5 text-xs">
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Provisionamento Automático no MikroTik (/ppp profile):</span>
              </span>
              <div className="font-mono text-[10px] text-emerald-300 break-all select-all bg-slate-900 p-2 rounded border border-slate-800">
                {previewRouterOsCommand}
              </div>
              <p className="text-[10px] text-slate-400">
                Ao clicar em salvar, este profile com rate-limit <strong>{speedUp}M/{speedDown}M</strong> será enviado diretamente para as RBs MikroTik conectadas via porta 8728.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-md shadow-emerald-950"
            >
              {planToEdit ? 'Atualizar Plano' : 'Salvar Plano de Internet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
