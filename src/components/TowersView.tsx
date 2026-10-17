import React, { useState } from 'react';
import { 
  Radio, 
  MapPin, 
  Plus, 
  Users, 
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Server,
  Wifi,
  Signal
} from 'lucide-react';
import { Tower, Client } from '../types/index.js';

interface TowersViewProps {
  towers: Tower[];
  clients: Client[];
  onAddTower: (tower: Partial<Tower>) => void;
  onEditTower?: (tower: Tower) => void;
  onDeleteTower?: (towerId: string) => void;
}

export const TowersView: React.FC<TowersViewProps> = ({
  towers,
  clients,
  onAddTower,
  onEditTower,
  onDeleteTower
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTower, setEditingTower] = useState<Tower | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [frequency, setFrequency] = useState('5.8 GHz (AirMAX AC)');
  const [capacity, setCapacity] = useState(100);
  const [ipGateway, setIpGateway] = useState('10.50.5.1');
  const [coordinates, setCoordinates] = useState('-15.8000, -47.9000');
  const [status, setStatus] = useState<'online' | 'warning' | 'offline'>('online');

  const handleOpenAdd = () => {
    setName('');
    setLocation('');
    setFrequency('5.8 GHz (AirMAX AC)');
    setCapacity(100);
    setIpGateway('10.50.5.1');
    setCoordinates('-15.8000, -47.9000');
    setStatus('online');
    setShowAddModal(true);
  };

  const handleOpenEdit = (tower: Tower) => {
    setEditingTower(tower);
    setName(tower.name);
    setLocation(tower.location);
    setFrequency(tower.frequency || '5.8 GHz (AirMAX AC)');
    setCapacity(tower.capacity || 100);
    setIpGateway(tower.ipGateway || '10.50.5.1');
    setCoordinates(tower.coordinates || '-15.8000, -47.9000');
    setStatus(tower.status || 'online');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;

    onAddTower({
      id: `tower-${Date.now()}`,
      name,
      location,
      frequency,
      capacity: Number(capacity),
      activeClients: 0,
      status,
      coordinates,
      ipGateway
    });

    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTower || !name || !location) return;

    if (onEditTower) {
      onEditTower({
        ...editingTower,
        name,
        location,
        frequency,
        capacity: Number(capacity),
        status,
        coordinates,
        ipGateway
      });
    }

    setEditingTower(null);
  };

  const handleDelete = (tower: Tower) => {
    const linkedClients = clients.filter(c => c.towerId === tower.id);
    if (linkedClients.length > 0) {
      alert(`Atenção: Existem ${linkedClients.length} clientes vinculados ao POP/Torre '${tower.name}'. Reatribua os clientes antes de excluir.`);
      return;
    }

    if (window.confirm(`Deseja realmente excluir a torre / POP '${tower.name}'? Esta ação é irreversível.`)) {
      if (onDeleteTower) {
        onDeleteTower(tower.id);
      }
    }
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
            Gestão de infraestrutura de enlaces de rádio 5.8 GHz, torres repetidoras e pontos de presença (POPs).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
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
          const usagePercent = Math.min(Math.round((towerClients.length / (tower.capacity || 1)) * 100), 100);

          return (
            <div key={tower.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition relative group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white">{tower.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      tower.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : tower.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {tower.status === 'online' ? '● Online' : tower.status === 'warning' ? '● Alerta' : '● Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
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
                  <span className="text-slate-200 font-semibold">{tower.frequency || '5.8 GHz'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-sans">Gateway / Roteador</span>
                  <span className="text-cyan-400">{tower.ipGateway || '10.50.5.1'}</span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ocupação do POP:</span>
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

              {/* Connected clients teaser & quick info */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{towerClients.filter(c => c.status === 'active').length} ativos</span>
                </div>
                <span className="text-emerald-400 font-medium">Sinal médio: -58 dBm</span>
              </div>

              {/* ACTION BUTTONS: EDIT & DELETE */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(tower)}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 text-xs font-semibold flex items-center space-x-1.5 transition"
                  title="Editar dados da torre e POP"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar POP / Torre</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(tower)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-semibold flex items-center space-x-1.5 transition"
                  title="Excluir torre e POP"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Tower */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Cadastrar Nova Torre / POP de Distribuição</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Torre / POP *</label>
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
                <label className="block text-slate-300 font-medium mb-1">Localização / Fazenda / Região *</label>
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
                  placeholder="Ex: 5.8 GHz (AirMAX AC) ou Fibra Óptica GPON"
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
                  <label className="block text-slate-300 font-medium mb-1">IP Gateway / Roteador</label>
                  <input
                    type="text"
                    value={ipGateway}
                    onChange={(e) => setIpGateway(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Status Operacional</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="online">Online (Operando normalmente)</option>
                  <option value="warning">Alerta (Em observação / manutenção)</option>
                  <option value="offline">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
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

      {/* Modal Edit Tower */}
      {editingTower && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>Editar POP / Torre: {editingTower.name}</span>
              </h3>
              <button onClick={() => setEditingTower(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome da Torre / POP *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Localização / Fazenda / Região *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Frequência / Tecnologia</label>
                <input
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacidade (Clientes)</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">IP Gateway / Roteador</label>
                  <input
                    type="text"
                    value={ipGateway}
                    onChange={(e) => setIpGateway(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Status Operacional</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="online">Online (Operando normalmente)</option>
                  <option value="warning">Alerta (Em observação / manutenção)</option>
                  <option value="offline">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTower(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 font-semibold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
