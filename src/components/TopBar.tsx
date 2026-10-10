import React, { useState } from 'react';
import { 
  Menu, 
  Server, 
  CreditCard, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  FlaskConical, 
  Search, 
  ChevronRight, 
  ChevronDown,
  ShieldCheck, 
  Plus, 
  Crown, 
  Wrench, 
  DollarSign, 
  User as UserIcon, 
  LogOut, 
  LogIn,
  Bell,
  HelpCircle,
  FileText,
  Users,
  Gauge,
  Building2
} from 'lucide-react';
import { MikrotikConfig, SystemStats, User, CompanySettings } from '../types/index.js';

interface TopBarProps {
  activeTab: string;
  onOpenMobileMenu: () => void;
  onOpenNewClient: () => void;
  onOpenNewOrder?: () => void;
  onOpenNewPlan?: () => void;
  onRefresh: () => void;
  onSimulateWebhook: () => void;
  isSimulatingWebhook: boolean;
  mikrotikConfig: MikrotikConfig | null;
  stats: SystemStats | null;
  onNavigateTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  companySettings?: CompanySettings;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenNewClient,
  onOpenNewOrder,
  onOpenNewPlan,
  onRefresh,
  onSimulateWebhook,
  isSimulatingWebhook,
  mikrotikConfig,
  stats,
  onNavigateTab,
  currentUser,
  onLogout,
  onOpenLogin,
  companySettings
}) => {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { section: 'Painel Geral', title: 'Dashboard & Indicadores do Provedor' };
      case 'bench':
        return { section: 'Laboratório', title: 'Bancada de Testes & Preparação MikroTik' };
      case 'clients':
        return { section: 'Cadastros', title: 'Clientes & Automação PPPoE' };
      case 'plans':
        return { section: 'Cadastros', title: 'Planos de Internet & Velocidades' };
      case 'contracts':
        return { section: 'Cadastros', title: 'Contratos de Adesão & Termos' };
      case 'towers':
        return { section: 'Cadastros', title: 'Torres & POPs de Transmissão e Fibra' };
      case 'service_orders':
        return { section: 'Atendimento & O.S.', title: 'Ordens de Serviço & Chamados Técnicos' };
      case 'finance':
        return { section: 'Financeiro', title: 'Faturamento, Mensalidades & Pix Dinâmico' };
      case 'fiscal':
        return { section: 'Fiscal', title: 'Notas Fiscais de Telecomunicações (Mod 21/22)' };
      case 'inventory':
        return { section: 'Estoque', title: 'Equipamentos & Roteadores em Comodato' };
      case 'mikrotik':
        return { section: 'Rede & Provedor', title: 'MikroTik RouterOS (Active Sessions & Secrets)' };
      case 'provedor':
        return { section: 'Configurações', title: 'Identidade Visual, Logo & Boletos Bancários' };
      case 'users':
        return { section: 'Configurações', title: 'Operadores & Permissões (RBAC)' };
      case 'logs':
        return { section: 'Configurações', title: 'Logs de Auditoria & Conexões' };
      case 'deploy':
        return { section: 'Configurações', title: 'Implantação Proxmox, VPS & Docker' };
      default:
        return { section: companySettings?.name || 'Provedor Telecom', title: 'Painel de Controle' };
    }
  };

  const { section, title } = getTabTitle(activeTab);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle, Breadcrumb & Page Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium">
            <span>{section}</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-amber-400 font-semibold">{activeTab.toUpperCase()}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none mt-0.5">
            {title}
          </h1>
        </div>
      </div>

      {/* Center Search Bar (Hidden on Mobile) */}
      <div className="hidden lg:flex items-center max-w-xs w-full mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar no sistema (cliente, IP, O.S)..."
            onClick={() => onNavigateTab('clients')}
            className="w-full text-xs rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500/50 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Right: Quick Actions, Telemetry & User Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-950/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Novo</span>
            <ChevronDown className="w-3 h-3 text-slate-950" />
          </button>

          {isQuickAddOpen && (
            <div 
              onMouseLeave={() => setIsQuickAddOpen(false)}
              className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-fade-in"
            >
              <button
                onClick={() => {
                  onOpenNewClient();
                  setIsQuickAddOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center space-x-2"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Novo Cliente & Assinante</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenNewOrder) onOpenNewOrder();
                  setIsQuickAddOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center space-x-2"
              >
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Nova Ordem de Serviço</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenNewPlan) onOpenNewPlan();
                  setIsQuickAddOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center space-x-2"
              >
                <Gauge className="w-4 h-4 text-amber-400" />
                <span>Novo Plano de Internet</span>
              </button>

              <button
                onClick={() => {
                  onNavigateTab('provedor');
                  setIsQuickAddOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-300 hover:bg-slate-800 hover:text-amber-400 flex items-center space-x-2 border-t border-slate-800 mt-1"
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Dados do Provedor & Logo</span>
              </button>
            </div>
          )}
        </div>

        {/* MikroTik Status Badge */}
        <div 
          onClick={() => onNavigateTab('mikrotik')}
          className="hidden sm:flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition"
          title="MikroTik RouterOS API Port 8728"
        >
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-cyan-300 text-[11px]">
            {mikrotikConfig?.host || '192.168.88.1'}
          </span>
        </div>

        {/* Quick Webhook Trigger */}
        <button
          onClick={onSimulateWebhook}
          disabled={isSimulatingWebhook}
          className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-semibold text-xs transition disabled:opacity-50"
          title="Simular recebimento de Webhook Pix e baixa imediata no MikroTik"
        >
          <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{isSimulatingWebhook ? 'Baixando...' : 'Baixa Pix'}</span>
        </button>

        {/* Notifications Icon with count */}
        <button
          onClick={() => onNavigateTab('service_orders')}
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Notificações e Ordens de Serviço abertas"
        >
          <Bell className="w-4 h-4" />
          {stats?.blockedClients ? (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          ) : null}
        </button>

        {/* Refresh Data */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Recarregar Dados"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* User Profile Header Dropdown */}
        <div className="relative">
          {currentUser ? (
            <div 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 pl-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs group-hover:border-amber-400 transition">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                  {currentUser.name.split(' ')[0]}
                </p>
                <span className="text-[10px] text-amber-400 capitalize block leading-tight">
                  {currentUser.role}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              <LogIn className="w-4 h-4" />
            </button>
          )}

          {isUserMenuOpen && currentUser && (
            <div 
              onMouseLeave={() => setIsUserMenuOpen(false)}
              className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-fade-in"
            >
              <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                <p className="text-xs font-bold text-white">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                <span className="mt-1 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {currentUser.role.toUpperCase()}
                </span>
              </div>

              <button
                onClick={() => {
                  onNavigateTab('users');
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center space-x-2"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Gestão de Operadores</span>
              </button>

              <button
                onClick={() => {
                  onLogout();
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-slate-800 flex items-center space-x-2 mt-1 border-t border-slate-800 pt-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair da Conta</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
