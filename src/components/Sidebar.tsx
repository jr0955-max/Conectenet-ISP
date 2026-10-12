import React, { useState } from 'react';
import { 
  Wifi, 
  LayoutDashboard, 
  FlaskConical, 
  Users, 
  Cpu, 
  Wallet, 
  Radio, 
  ScrollText, 
  Terminal, 
  Zap, 
  Server, 
  ShieldCheck, 
  X,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Activity,
  LogOut,
  LogIn,
  Crown,
  Wrench,
  DollarSign,
  Gauge,
  FileText,
  Package,
  Receipt,
  Headphones,
  Hexagon,
  Layers,
  Building2,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { MikrotikConfig, SystemStats, User, CompanySettings } from '../types/index.js';
import { useTheme } from '../context/ThemeContext.js';


interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: SystemStats | null;
  mikrotikConfig: MikrotikConfig | null;
  companySettings?: CompanySettings;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSimulateWebhook: () => void;
  isSimulatingWebhook: boolean;
  currentUser: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenNewClient: () => void;
  onOpenNewOrder?: () => void;
  plansCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  mikrotikConfig,
  companySettings,
  isOpenMobile,
  onCloseMobile,
  onSimulateWebhook,
  isSimulatingWebhook,
  currentUser,
  onLogout,
  onOpenLogin,
  onOpenNewClient,
  onOpenNewOrder,
  plansCount
}) => {
  const isTecnico = currentUser?.role === 'tecnico';
  const isFinanceiro = currentUser?.role === 'financeiro';
  const isAdmin = currentUser?.role === 'administrador';
  const { theme, toggleTheme } = useTheme();

  // Manage open/collapsed state of accordion menu sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cadastros: true,
    financeiro: true,
    rede: true,
    atendimento: true,
    fiscal: false,
    estoque: false,
    sistema: false
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const getRoleIcon = () => {
    switch (currentUser?.role) {
      case 'administrador':
        return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case 'tecnico':
        return <Wrench className="w-3.5 h-3.5 text-blue-500" />;
      case 'financeiro':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Custom Provider Brand Logo */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div 
              onClick={() => handleTabClick('dashboard')}
              className="flex items-center space-x-2.5 cursor-pointer group min-w-0 flex-1 mr-2"
            >
              <div className="relative flex items-center justify-center shrink-0">
                {companySettings?.logoUrl ? (
                  <img 
                    src={companySettings.logoUrl} 
                    alt={companySettings.name} 
                    className="h-9 max-w-[70px] object-contain rounded"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-amber-400 text-sm">
                      {companySettings?.name ? companySettings.name.charAt(0) : 'P'}
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="font-extrabold text-sm text-white tracking-tight truncate">
                    {companySettings?.name || 'Provedor Telecom'}
                  </span>
                </div>
                <p className="text-[10px] text-amber-400 font-medium truncate uppercase tracking-wider">
                  {companySettings?.slogan || 'ISP & TELECOM'}
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Accordion Sections */}
          <nav className="p-3 space-y-1.5">
            {/* PAINEL GERAL */}
            <div className="space-y-0.5">
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>Painel / Dashboard</span>
                </div>
              </button>

              <button
                onClick={() => handleTabClick('bench')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  activeTab === 'bench'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <FlaskConical className={`w-4 h-4 ${activeTab === 'bench' ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>Bancada & Lab</span>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LAB
                </span>
              </button>
            </div>

            {/* CADASTROS ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('cadastros')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cadastros</span>
                </span>
                {openSections.cadastros ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.cadastros && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('clients')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'clients'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Clientes & PPPoE</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                      {stats?.totalClients || '0'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabClick('plans')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'plans'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Planos & Velocidades</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                      {plansCount !== undefined ? plansCount : '5'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabClick('contracts')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'contracts'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Contratos & Termos</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                      {stats?.activeContracts || '4'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabClick('towers')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'towers'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Torres & POPs Rurais</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                      {stats?.totalTowers || '4'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* FINANCEIRO ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('financeiro')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Financeiro</span>
                </span>
                {openSections.financeiro ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.financeiro && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('finance')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'finance'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Faturas & Recebimentos</span>
                    {isTecnico && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-amber-500/20 text-amber-300">
                        Restrito
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleTabClick('charges')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'charges'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Cobranças</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-amber-500/20 text-amber-300">
                      Avulsa
                    </span>
                  </button>

                  <button
                    onClick={() => handleTabClick('carnes')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'carnes'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Carnês</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-emerald-500/20 text-emerald-300">
                      12x
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* REDE & PROVEDOR ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('rede')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rede & Provedor</span>
                </span>
                {openSections.rede ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.rede && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('mikrotik')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'mikrotik'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>MikroTik RouterOS</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {stats?.onlineSessions || '0'} online
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* ATENDIMENTO & O.S. ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('atendimento')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Atendimento & O.S.</span>
                </span>
                {openSections.atendimento ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.atendimento && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('service_orders')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'service_orders'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Ordens de Serviço</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {stats?.openTickets || '3'} abertas
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* FISCAL & NOTAS ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('fiscal')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fiscal & Notas</span>
                </span>
                {openSections.fiscal ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.fiscal && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('fiscal')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'fiscal'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Notas Mod 21/22</span>
                  </button>
                </div>
              )}
            </div>

            {/* ESTOQUE & COMODATO ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('estoque')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estoque & Comodato</span>
                </span>
                {openSections.estoque ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.estoque && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('inventory')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'inventory'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Equipamentos & Roteadores</span>
                  </button>
                </div>
              )}
            </div>

            {/* SISTEMA & CONFIGURAÇÕES ACCORDION */}
            <div className="pt-2">
              <button
                onClick={() => toggleSection('sistema')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 tracking-wider uppercase transition"
              >
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Configurações</span>
                </span>
                {openSections.sistema ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {openSections.sistema && (
                <div className="mt-1 space-y-0.5 pl-2 border-l border-slate-800 ml-3">
                  <button
                    onClick={() => handleTabClick('provedor')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'provedor'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="flex items-center space-x-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Meu Provedor & Logo</span>
                    </span>
                    <span className="px-1.5 py-0.2 text-[9px] rounded bg-amber-500/20 text-amber-300">
                      Boletos
                    </span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleTabClick('users')}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeTab === 'users'
                          ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span>Operadores & RBAC</span>
                      <span className="px-1.5 py-0.2 text-[9px] rounded bg-purple-500/20 text-purple-300">
                        Admin
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => handleTabClick('logs')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeTab === 'logs'
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span>Auditoria & Logs</span>
                  </button>

                  {/* Aparência: Modo Dia e Noite no menu Configurações */}
                  <div className="pt-1 mt-1 border-t border-slate-800/60">
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition group"
                      title={theme === 'light' ? 'Mudar para Modo Noite (Escuro)' : 'Mudar para Modo Dia (Claro)'}
                    >
                      <span className="flex items-center space-x-2">
                        {theme === 'light' ? (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>Aparência</span>
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center space-x-1 ${
                        theme === 'light' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        <span>{theme === 'light' ? '☀️ Dia' : '🌙 Noite'}</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Bottom Section: RouterOS Live Status & Operator Widget */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          {/* Router Card */}
          <div 
            onClick={() => handleTabClick('bench')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-sm space-y-1"
          >
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 font-medium text-slate-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>MikroTik Lab</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400">
                {mikrotikConfig?.host || '192.168.88.1'}:8728
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>CPU: {mikrotikConfig?.cpuLoad || 8}%</span>
              <span className="text-emerald-400 font-semibold">{stats?.onlineSessions || 0} conexões</span>
            </div>
          </div>

          {/* User Profile & Role Card */}
          {currentUser ? (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    {getRoleIcon()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {currentUser.name}
                    </p>
                    <span className="text-[10px] text-amber-400 capitalize flex items-center">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                  title="Sair da conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-100 rounded-lg text-[11px] font-bold transition"
                title="Encerrar sessão e bloquear acesso ao sistema"
              >
                <LogOut className="w-3 h-3 text-red-400" />
                <span>Sair e Bloquear Sistema</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Fazer Login</span>
            </button>
          )}

          {/* Quick Simulate Button */}
          <button
            onClick={onSimulateWebhook}
            disabled={isSimulatingWebhook}
            className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-bold transition shadow-md shadow-amber-950/20 disabled:opacity-50"
            title="Testar baixa automática de pagamento via Webhook e desbloqueio imediato no MikroTik"
          >
            <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>{isSimulatingWebhook ? 'Processando...' : 'Simular Baixa Pix'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
