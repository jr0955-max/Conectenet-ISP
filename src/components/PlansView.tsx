import React, { useState } from 'react';
import { 
  Gauge, 
  Plus, 
  Wifi, 
  Radio, 
  ArrowUpDown, 
  DollarSign, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Terminal, 
  Users, 
  TrendingUp, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Plan, Client } from '../types/index.js';

interface PlansViewProps {
  plans: Plan[];
  clients: Client[];
  onOpenNewPlan: () => void;
  onEditPlan: (plan: Plan) => void;
  onDeletePlan: (planId: string) => void;
  onSyncAllPlans?: () => Promise<void> | void;
}

export const PlansView: React.FC<PlansViewProps> = ({
  plans,
  clients,
  onOpenNewPlan,
  onEditPlan,
  onDeletePlan,
  onSyncAllPlans
}) => {
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAll = async () => {
    if (!onSyncAllPlans) return;
    try {
      setIsSyncing(true);
      await onSyncAllPlans();
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getSubscribersCount = (planId: string) => {
    return clients.filter(c => c.planId === planId).length;
  };

  const getSubscribersRevenue = (plan: Plan) => {
    const count = getSubscribersCount(plan.id);
    return count * plan.price;
  };

  const copyRouterOsCommand = (plan: Plan) => {
    const cmd = `/ppp profile add name="${plan.profileName}" rate-limit="${plan.speedUp}M/${plan.speedDown}M" local-address=10.50.1.1 comment="${plan.name} - AgroISP"`;
    navigator.clipboard.writeText(cmd);
    setCopiedPlanId(plan.id);
    setTimeout(() => setCopiedPlanId(null), 2000);
  };

  const copyAllProfilesScript = () => {
    const script = `# Sincronização em lote de perfis de velocidade no MikroTik RouterOS\n` +
      plans.map(p => `/ppp profile add name="${p.profileName}" rate-limit="${p.speedUp}M/${p.speedDown}M" comment="${p.name}"`).join('\n');
    navigator.clipboard.writeText(script);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Planos de Internet & Velocidades
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ao cadastrar ou excluir um plano, o sistema sincroniza automaticamente os <strong>Profiles de Velocidade no MikroTik (/ppp profile)</strong> via API na porta 8728.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-2">
          {onSyncAllPlans && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition border border-emerald-500/40 disabled:opacity-50"
              title="Criar/atualizar todos os profiles de velocidade nas RBs MikroTik conectadas"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar no MikroTik (API)'}</span>
            </button>
          )}

          <button
            onClick={copyAllProfilesScript}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-700"
            title="Copiar comando de todos os perfis para colar no Terminal do Winbox"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Terminal className="w-4 h-4 text-cyan-400" />}
            <span>{copiedAll ? 'Copiados!' : 'Copiar Script Winbox'}</span>
          </button>

          <button
            onClick={onOpenNewPlan}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-950"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Plano de Internet</span>
          </button>
        </div>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map(plan => {
          const subscribers = getSubscribersCount(plan.id);
          const revenue = getSubscribersRevenue(plan);
          const isCopied = copiedPlanId === plan.id;

          return (
            <div 
              key={plan.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
            >
              {/* Header Card */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${
                      plan.technology === 'fibra'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    }`}>
                      {plan.technology === 'fibra' ? (
                        <>
                          <Wifi className="w-3 h-3 mr-1" />
                          Fibra Óptica (FTTH)
                        </>
                      ) : (
                        <>
                          <Radio className="w-3 h-3 mr-1" />
                          Rádio 5.8 GHz Wireless
                        </>
                      )}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {plan.name}
                    </h3>
                  </div>

                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400">
                    <Gauge className="w-5 h-5" />
                  </div>
                </div>

                {/* Price Display */}
                <div className="mt-3 flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-white font-mono tracking-tight">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-slate-400">/mês</span>
                </div>

                {/* Speed Details */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Download</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      ↓ {plan.speedDown} Mbps
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Upload</span>
                    <span className="font-mono text-cyan-400 font-bold text-sm">
                      ↑ {plan.speedUp} Mbps
                    </span>
                  </div>
                </div>

                {/* Profile Name & Description */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Profile MikroTik:</span>
                    <span className="font-mono text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {plan.profileName}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                      {plan.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Card: Stats & Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{subscribers} clientes ativos</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {formatCurrency(revenue)}/mês
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 pt-1">
                  <button
                    onClick={() => copyRouterOsCommand(plan)}
                    className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition flex items-center justify-center space-x-1"
                    title="Copiar comando /ppp profile para este plano"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copiado!' : 'Script CLI'}</span>
                  </button>

                  <button
                    onClick={() => onEditPlan(plan)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-lg text-xs transition"
                    title="Editar informações do plano"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeletePlan(plan.id)}
                    className="p-1.5 bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-lg text-xs transition border border-transparent hover:border-red-500/30"
                    title="Excluir plano"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
