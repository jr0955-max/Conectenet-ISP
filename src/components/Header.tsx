import React from 'react';
import { 
  Wifi, 
  Server, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  Play,
  Layers
} from 'lucide-react';
import { MikrotikConfig, SystemStats } from '../types/index.js';

interface HeaderProps {
  stats: SystemStats | null;
  mikrotikConfig: MikrotikConfig | null;
  onRefresh: () => void;
  onSimulateWebhook: () => void;
  isSimulatingWebhook: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  mikrotikConfig,
  onRefresh,
  onSimulateWebhook,
  isSimulatingWebhook,
  activeTab,
  setActiveTab
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'clients', label: 'Clientes & PPPoE', icon: 'Users', badge: stats?.totalClients },
    { id: 'mikrotik', label: 'MikroTik RouterOS', icon: 'Cpu', badge: stats?.onlineSessions },
    { id: 'finance', label: 'Financeiro & Pix', icon: 'Wallet' },
    { id: 'towers', label: 'Torres & POPs Rurais', icon: 'Radio' },
    { id: 'logs', label: 'Auditoria & Logs', icon: 'ScrollText' },
    { id: 'deploy', label: 'Deploy & Docker', icon: 'Terminal' }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner with ISP Brand & Live Telemetry */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Wifi className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white tracking-tight">ISP Telecom</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                  PRO v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400">Gestão ISP & Automação MikroTik</p>
            </div>
          </div>

          {/* RouterOS & Gateway Status Indicators */}
          <div className="hidden md:flex items-center space-x-4">
            {/* MikroTik Status Badge */}
            <div 
              onClick={() => setActiveTab('mikrotik')}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs cursor-pointer hover:bg-cyan-950/60 transition"
              title="MikroTik RouterOS Conectado na Bancada"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <div>
                <span className="text-cyan-400 font-semibold">RouterOS: </span>
                <span className="font-mono text-white font-medium">Conectado (API)</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <Server className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-400">MikroTik: </span>
                <span className="font-mono text-cyan-300 font-medium">
                  {mikrotikConfig?.host || '192.168.88.1'}:8728
                </span>
              </div>
            </div>

            {/* Gateway Status Badge */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-slate-400">Gateway: </span>
                <span className="font-medium text-emerald-300">Asaas / Pix Dinâmico</span>
              </div>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* Quick Webhook Simulate Button */}
            <button
              onClick={onSimulateWebhook}
              disabled={isSimulatingWebhook}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs transition shadow-md shadow-emerald-950 disabled:opacity-50"
              title="Testar baixa automática de pagamento via Webhook e desbloqueio imediato no MikroTik"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{isSimulatingWebhook ? 'Processando Webhook...' : 'Simular Baixa Pix'}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 overflow-x-auto py-2 no-scrollbar border-t border-slate-800/60">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      isActive
                        ? 'bg-emerald-500/30 text-emerald-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
