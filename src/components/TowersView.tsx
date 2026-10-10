import React, { useState } from 'react';
import { 
  Radio, 
  Wifi, 
  MapPin, 
  Activity, 
  Plus, 
  Server, 
  Users, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { Tower, Client } from '../types/index.js';

interface TowersViewProps {
  towers: Tower[];
  clients: Client[];
  onAddTower: (tower: Partial<Tower>) => void;
}

export const TowersView: React.FC<TowersViewProps> = ({
  towers,
  clients,
  onAddTower
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [frequency, setFrequency] = useState('5.8 GHz (AirMAX AC)');
  const [capacity, setCapacity] = useState(100);
  const [ipGateway, setIpGateway] = useState('10.50.5.1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;

    onAddTower({
      id: `tower-${Date.now()}`,
      name,
      location,
      frequency,
      capacity: Number(capacity),
      activeClients: 0,
      status: 'online',
      coordinates: '-15.8000, -47.9000',
      ipGateway
    });

    setName('');
    setLocation('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>Torres de Transmissão & POPs Rurais</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Infraestrutura de enlaces de rádio 5.8 GHz e OLTs de fibra óptica atendendo produtores rurais e fazendas.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo POP / Torre</span>
        </button>
      </div>

      {/* Grid of Rural Transmission Towers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {towers.map(tower => {
          const towerClients = clients.filter(c => c.towerId === tower.id);
          const usagePercent = Math.min(Math.round((towerClients.length / tower.capacity) * 100), 100);

          return (
            <div key={tower.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{tower.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Online
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    <span>{tower.location}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400">
                  <Radio className="w-6 h-6" />
                </div>
              </div>

              {/* Specs & IP */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono">
                <div>
                  <span className="text-[11px] text-slate-500 block font-sans">Tecnologia / Banda</span>
                  <span className="text-slate-200 font-semibold">{tower.frequency}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-sans">Gateway / Roteador</span>
                  <span className="text-cyan-400">{tower.ipGateway}</span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ocupação da Torre:</span>
                  <span className="font-mono text-white font-bold">
                    {towerClients.length} / {tower.capacity} clientes ({usagePercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Connected clients teaser */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{towerClients.filter(c => c.status === 'active').length} ativos</span>
                </div>
                <span className="text-emerald-400 font-medium">Sinal médio: -58 dBm</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Tower */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Cadastrar Nova Torre / POP de Distribuição</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Torre</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre Serra do Cipó"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Localização / Altitude</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Morro das Araras - Altitude 850m"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Frequência / Tecnologia</label>
                <input
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacidade (Clientes)</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">IP Gateway</label>
                  <input
                    type="text"
                    value={ipGateway}
                    onChange={(e) => setIpGateway(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold"
                >
                  Salvar Torre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
