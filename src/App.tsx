import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { TopBar } from './components/TopBar.js';
import { DashboardView } from './components/DashboardView.js';
import { ClientsView } from './components/ClientsView.js';
import { MikrotikView } from './components/MikrotikView.js';
import { FinanceView } from './components/FinanceView.js';
import { TowersView } from './components/TowersView.js';
import { AuditLogsView } from './components/AuditLogsView.js';
import { DeployGuideView } from './components/DeployGuideView.js';
import { PlansView } from './components/PlansView.js';
import { PlanModal } from './components/PlanModal.js';
import { UsersManagementView } from './components/UsersManagementView.js';
import { LoginModal } from './components/LoginModal.js';
import { RestrictedAccessView } from './components/RestrictedAccessView.js';
import { ClientModal } from './components/ClientModal.js';
import { InvoiceModal } from './components/InvoiceModal.js';
import { ServiceOrdersView } from './components/ServiceOrdersView.js';
import { ServiceOrderModal } from './components/ServiceOrderModal.js';
import { ContractsView } from './components/ContractsView.js';
import { InventoryView } from './components/InventoryView.js';
import { FiscalView } from './components/FiscalView.js';
import { CompanySettingsView } from './components/CompanySettingsView.js';
import { BoletoModal } from './components/BoletoModal.js';
import { 
  Client, 
  Plan, 
  Tower, 
  Invoice, 
  ActiveSession, 
  MikrotikConfig, 
  SystemStats, 
  AuditLog,
  User,
  UserRole,
  ServiceOrder,
  Contract,
  Equipment,
  FiscalInvoice,
  CompanySettings
} from './types/index.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Data State
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [mikrotikConfig, setMikrotikConfig] = useState<MikrotikConfig | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [fiscalInvoices, setFiscalInvoices] = useState<FiscalInvoice[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('isp_company_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      name: 'Meu Provedor Telecom',
      legalName: 'Provedor de Internet & Telecomunicações Ltda',
      cnpj: '28.491.029/0001-83',
      logoUrl: '',
      slogan: 'Ultra Banda Larga & Fibra Óptica',
      phone: '(61) 98765-4321',
      email: 'contato@meuprovedor.com.br',
      website: 'www.meuprovedor.com.br',
      address: {
        street: 'Av. das Telecomunicações',
        number: '500',
        complement: 'Edifício Central, Sala 201',
        neighborhood: 'Centro',
        city: 'Brasília',
        state: 'DF',
        cep: '70000-000'
      },
      bankName: 'Banco do Brasil S.A.',
      bankCode: '001-9',
      agency: '1234-5',
      account: '98765-4',
      carteira: '17',
      boletoInstructions: 'Sr. Caixa: Não receber após 30 dias de atraso. Cobrar multa de 2% e juros de 1% a.m. após o vencimento.'
    };
  });

  // Modals & Interactivity State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<ServiceOrder | null>(null);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Authentication & Session State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return sessionStorage.getItem('isp_jwt_token') || localStorage.getItem('isp_jwt_token') || localStorage.getItem('agroisp_jwt_token');
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('isp_user') || localStorage.getItem('isp_user') || localStorage.getItem('agroisp_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);

  const handleSavePlan = async (planData: Partial<Plan>) => {
    try {
      if (planToEdit) {
        const res = await fetch(`/api/plans/${planToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showNotification(`Plano '${planData.name}' atualizado com sucesso!`);
      } else {
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showNotification(`Novo plano '${planData.name}' cadastrado com sucesso!`);
      }

      setIsPlanModalOpen(false);
      setPlanToEdit(null);
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao salvar plano', 'error');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!window.confirm(`Deseja realmente excluir o plano '${plan?.name}'?`)) return;

    try {
      const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showNotification(data.message || 'Plano excluído com sucesso!');
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao excluir plano', 'error');
    }
  };

  const handleSaveOrder = async (orderData: Partial<ServiceOrder>) => {
    try {
      if (orderToEdit) {
        const res = await fetch(`/api/service-orders/${orderToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showNotification(`Ordem de serviço ${orderToEdit.protocol} atualizada com sucesso!`);
      } else {
        const res = await fetch('/api/service-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showNotification(`Nova Ordem de Serviço criada: ${data.serviceOrder?.protocol}`);
      }
      setIsOrderModalOpen(false);
      setOrderToEdit(null);
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao salvar Ordem de Serviço', 'error');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Deseja realmente excluir esta Ordem de Serviço?')) return;
    try {
      const res = await fetch(`/api/service-orders/${orderId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showNotification('Ordem de serviço excluída com sucesso.');
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao excluir O.S.', 'error');
    }
  };

  const handleLoginSuccess = (token: string, user: User, rememberMe: boolean = false) => {
    setAuthToken(token);
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem('isp_jwt_token', token);
      localStorage.setItem('isp_user', JSON.stringify(user));
      sessionStorage.removeItem('isp_jwt_token');
      sessionStorage.removeItem('isp_user');
    } else {
      sessionStorage.setItem('isp_jwt_token', token);
      sessionStorage.setItem('isp_user', JSON.stringify(user));
      localStorage.removeItem('isp_jwt_token');
      localStorage.removeItem('isp_user');
    }
    localStorage.removeItem('agroisp_jwt_token');
    localStorage.removeItem('agroisp_user');
    setIsLoginModalOpen(false);
    loadAllData();
    showNotification(`Bem-vindo, ${user.name}! Perfil [${user.role.toUpperCase()}] ativo.`);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    sessionStorage.clear();
    localStorage.removeItem('isp_jwt_token');
    localStorage.removeItem('isp_user');
    localStorage.removeItem('agroisp_jwt_token');
    localStorage.removeItem('agroisp_user');
    setIsSidebarOpenMobile(false);
    showNotification('Sessão encerrada com sucesso! O sistema foi fechado e bloqueado.', 'info');
  };

  const handleSwitchToAdmin = () => {
    const adminUser: User = {
      id: 'user-admin',
      name: 'Administrador Master',
      email: 'jr0955@gmail.com',
      role: 'administrador',
      status: 'active',
      createdAt: '2026-01-01'
    };
    handleLoginSuccess('admin_master_jwt_token', adminUser);
  };

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch all initial data
  const loadAllData = useCallback(async () => {
    try {
      const [statsRes, clientsRes, invoicesRes, activeRes, logsRes, ordersRes, contractsRes, eqRes, fiscalRes, settingsRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()).catch(() => ({})),
        fetch('/api/clients').then(r => r.json()).catch(() => ({})),
        fetch('/api/invoices').then(r => r.json()).catch(() => ({})),
        fetch('/api/mikrotik/active').then(r => r.json()).catch(() => ({})),
        fetch('/api/audit-logs').then(r => r.json()).catch(() => ({})),
        fetch('/api/service-orders').then(r => r.json()).catch(() => ({})),
        fetch('/api/contracts').then(r => r.json()).catch(() => ({})),
        fetch('/api/equipments').then(r => r.json()).catch(() => ({})),
        fetch('/api/fiscal-invoices').then(r => r.json()).catch(() => ({})),
        fetch('/api/company-settings').then(r => r.json()).catch(() => ({}))
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (statsRes.mikrotikConfig) setMikrotikConfig(statsRes.mikrotikConfig);
      if (clientsRes.clients) setClients(clientsRes.clients);
      if (clientsRes.plans) setPlans(clientsRes.plans);
      if (clientsRes.towers) setTowers(clientsRes.towers);
      if (invoicesRes.invoices) setInvoices(invoicesRes.invoices);
      if (activeRes.sessions) setActiveSessions(activeRes.sessions);
      if (logsRes.logs) setAuditLogs(logsRes.logs);
      if (ordersRes.serviceOrders) setServiceOrders(ordersRes.serviceOrders);
      if (contractsRes.contracts) setContracts(contractsRes.contracts);
      if (eqRes.equipments) setEquipments(eqRes.equipments);
      if (fiscalRes.fiscalInvoices) setFiscalInvoices(fiscalRes.fiscalInvoices);
      if (settingsRes.settings) {
        setCompanySettings(prev => ({
          ...prev,
          ...settingsRes.settings,
          // prioritize local logo if uploaded locally
          logoUrl: prev.logoUrl || settingsRes.settings.logoUrl
        }));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, []);

  const handleSaveCompanySettings = async (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    localStorage.setItem('isp_company_settings', JSON.stringify(newSettings));
    try {
      const res = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setCompanySettings(data.settings);
          localStorage.setItem('isp_company_settings', JSON.stringify(data.settings));
        }
      }
    } catch (err) {
      console.error('Failed to sync settings with server, saved locally:', err);
    }
    showNotification(`Dados de ${newSettings.name} e logomarca atualizados com sucesso!`);
  };

  useEffect(() => {
    loadAllData();

    // Auto-refresh active sessions and stats every 12 seconds
    const interval = setInterval(() => {
      fetch('/api/stats').then(r => r.json()).then(res => {
        if (res.stats) setStats(res.stats);
      }).catch(() => {});

      fetch('/api/mikrotik/active').then(r => r.json()).then(res => {
        if (res.sessions) setActiveSessions(res.sessions);
      }).catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, [loadAllData]);

  // Client CRUD Handlers
  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (clientToEdit) {
        const res = await fetch(`/api/clients/${clientToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showNotification(`Cliente '${clientData.name}' atualizado no MikroTik com sucesso!`);
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showNotification(`Novo cliente criado! Secret PPPoE provisionada no MikroTik.`);
      }

      setIsClientModalOpen(false);
      setClientToEdit(null);
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao salvar cliente', 'error');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!window.confirm(`Tem certeza que deseja remover ${client?.name || 'este cliente'} e sua Secret no MikroTik?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showNotification(`Cliente e Secret removidos com sucesso!`);
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao remover cliente', 'error');
    }
  };

  // Toggle Block / Unblock on MikroTik
  const handleToggleBlockClient = async (clientId: string) => {
    setIsActionLoading(clientId);
    try {
      const res = await fetch(`/api/clients/${clientId}/toggle-block`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showNotification(data.message, data.status === 'active' ? 'success' : 'info');
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao alterar status no MikroTik', 'error');
    } finally {
      setIsActionLoading(null);
    }
  };

  // Kick active session in MikroTik
  const handleDisconnectSession = async (username: string) => {
    try {
      const res = await fetch('/api/mikrotik/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      showNotification(data.message || `Sessão de ${username} desconectada.`);
      await loadAllData();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao derrubar sessão', 'error');
    }
  };

  // Simulate Webhook Payment (Asaas / Mercado Pago)
  const handleSimulateWebhook = async (invoiceId?: string) => {
    setIsSimulatingWebhook(true);
    try {
      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showNotification(
        data.message + (data.unblocked ? ' ⚡ Cliente desbloqueado automaticamente no MikroTik!' : ''),
        'success'
      );
      await loadAllData();

      // If viewing the modal for that invoice, update it
      if (selectedInvoice && data.invoice && selectedInvoice.id === data.invoice.id) {
        setSelectedInvoice(data.invoice);
      }

      return data;
    } catch (err: any) {
      showNotification(err.message || 'Erro na simulação do webhook', 'error');
      throw err;
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  // Pay invoice directly
  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showNotification(data.message, 'success');
      await loadAllData();

      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(prev => prev ? { ...prev, status: 'paga' } : null);
      }
      return data;
    } catch (err: any) {
      showNotification(err.message || 'Erro ao pagar fatura', 'error');
      throw err;
    }
  };

  // MikroTik Configuration & Test
  const handleTestMikrotik = async (testData: { host: string; port: number; user: string }) => {
    const res = await fetch('/api/mikrotik/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    const data = await res.json();
    await loadAllData();
    return data;
  };

  const handleUpdateMikrotikConfig = async (newConfig: Partial<MikrotikConfig>) => {
    const res = await fetch('/api/mikrotik/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    const data = await res.json();
    setMikrotikConfig(data.config);
    showNotification('Configurações salvas com sucesso!');
    await loadAllData();
  };

  const handleAddTower = (newTower: Partial<Tower>) => {
    setTowers(prev => [newTower as Tower, ...prev]);
    showNotification(`Torre '${newTower.name}' cadastrada com sucesso!`);
  };

  const handleImportBatch = async (rawText: string) => {
    const res = await fetch('/api/clients/import-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showNotification(data.message || `${data.added} clientes importados com sucesso!`, 'success');
    await loadAllData();
    return data;
  };

  const handleOpenNewInvoice = () => {
    if (clients.length === 0) return;
    const client = clients[0];
    const plan = plans.find(p => p.id === client.planId) || plans[0];
    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        amount: plan.price
      })
    })
      .then(r => r.json())
      .then(res => {
        showNotification(`Nova fatura gerada para ${client.name}!`);
        loadAllData();
        if (res.invoice) setSelectedInvoice(res.invoice);
      });
  };

  // Se o operador não estiver autenticado (ou após clicar em 'Sair'), fecha todo o sistema e bloqueia o acesso
  if (!currentUser || !authToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden select-none">
        {/* Glows de ambientação visual */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Global Notification */}
        {notification && (
          <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce">
            <div className={`px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                : notification.type === 'info'
                ? 'bg-amber-950/95 border-amber-500/50 text-amber-200'
                : 'bg-red-950/95 border-red-500/50 text-red-200'
            }`}>
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Tela de Login Fechada e Obrigatória */}
        <LoginModal
          isOpen={true}
          isEnforced={true}
          onClose={() => {}}
          onLoginSuccess={handleLoginSuccess}
          companySettings={companySettings}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div className={`px-4 py-3 rounded-xl border shadow-2xl text-xs font-semibold flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : notification.type === 'info'
              ? 'bg-amber-950/95 border-amber-500/50 text-amber-200'
              : 'bg-red-950/95 border-red-500/50 text-red-200'
          }`}>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Modern Sidebar (Desktop Fixed / Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        mikrotikConfig={mikrotikConfig}
        companySettings={companySettings}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onSimulateWebhook={() => handleSimulateWebhook()}
        isSimulatingWebhook={isSimulatingWebhook}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenNewClient={() => {
          setClientToEdit(null);
          setIsClientModalOpen(true);
        }}
        onOpenNewOrder={() => {
          setOrderToEdit(null);
          setIsOrderModalOpen(true);
        }}
        plansCount={plans.length}
      />

      {/* Main App Container (Shifted right on desktop by sidebar width) */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        {/* Top Bar with mobile toggle, breadcrumbs & quick actions */}
        <TopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsSidebarOpenMobile(true)}
          onOpenNewClient={() => {
            setClientToEdit(null);
            setIsClientModalOpen(true);
          }}
          onOpenNewOrder={() => {
            setOrderToEdit(null);
            setIsOrderModalOpen(true);
          }}
          onOpenNewPlan={() => {
            setPlanToEdit(null);
            setIsPlanModalOpen(true);
          }}
          onRefresh={loadAllData}
          onSimulateWebhook={() => handleSimulateWebhook()}
          isSimulatingWebhook={isSimulatingWebhook}
          mikrotikConfig={mikrotikConfig}
          stats={stats}
          onNavigateTab={(tab) => setActiveTab(tab)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          companySettings={companySettings}
        />

        {/* Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              clients={clients}
              invoices={invoices}
              towers={towers}
              serviceOrders={serviceOrders}
              mikrotikConfig={mikrotikConfig}
              onOpenNewClient={() => {
                setClientToEdit(null);
                setIsClientModalOpen(true);
              }}
              onOpenNewOrder={() => {
                setOrderToEdit(null);
                setIsOrderModalOpen(true);
              }}
              onSelectInvoice={(inv) => setSelectedInvoice(inv)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSimulateWebhook={() => handleSimulateWebhook()}
              companySettings={companySettings}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              plans={plans}
              towers={towers}
              invoices={invoices}
              onOpenNewClient={() => {
                setClientToEdit(null);
                setIsClientModalOpen(true);
              }}
              onEditClient={(client) => {
                setClientToEdit(client);
                setIsClientModalOpen(true);
              }}
              onDeleteClient={handleDeleteClient}
              onToggleBlockClient={handleToggleBlockClient}
              onSelectInvoice={(inv) => setSelectedInvoice(inv)}
              isActionLoading={isActionLoading}
              companySettings={companySettings}
            />
          )}

          {activeTab === 'plans' && (
            <PlansView
              plans={plans}
              clients={clients}
              onOpenNewPlan={() => {
                setPlanToEdit(null);
                setIsPlanModalOpen(true);
              }}
              onEditPlan={(plan) => {
                setPlanToEdit(plan);
                setIsPlanModalOpen(true);
              }}
              onDeletePlan={handleDeletePlan}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractsView
              contracts={contracts}
              onOpenNewContract={() => showNotification('Gerar nova minuta de contrato de adesão')}
            />
          )}

          {activeTab === 'service_orders' && (
            <ServiceOrdersView
              orders={serviceOrders}
              onOpenNewOrder={() => {
                setOrderToEdit(null);
                setIsOrderModalOpen(true);
              }}
              onEditOrder={(order) => {
                setOrderToEdit(order);
                setIsOrderModalOpen(true);
              }}
              onDeleteOrder={handleDeleteOrder}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              equipments={equipments}
              onOpenNewEquipment={() => showNotification('Cadastro de novo equipamento')}
            />
          )}

          {activeTab === 'fiscal' && (
            <FiscalView
              fiscalInvoices={fiscalInvoices}
            />
          )}

          {activeTab === 'mikrotik' && (
            currentUser?.role === 'financeiro' ? (
              <RestrictedAccessView
                requiredRoles={['administrador', 'tecnico']}
                currentRole={currentUser?.role}
                moduleName="MikroTik RouterOS (NOC)"
                onSwitchToAdmin={handleSwitchToAdmin}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            ) : (
              <MikrotikView
                config={mikrotikConfig}
                activeSessions={activeSessions}
                clients={clients}
                plans={plans}
                companySettings={companySettings}
                onDisconnectSession={handleDisconnectSession}
                onUpdateConfig={handleUpdateMikrotikConfig}
                onTestConnection={handleTestMikrotik}
                onRefresh={loadAllData}
              />
            )
          )}

          {(activeTab === 'finance' || activeTab === 'charges' || activeTab === 'carnes') && (
            currentUser?.role === 'tecnico' ? (
              <RestrictedAccessView
                requiredRoles={['administrador', 'financeiro']}
                currentRole={currentUser?.role}
                moduleName="Financeiro, Carnês & Pix"
                onSwitchToAdmin={handleSwitchToAdmin}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            ) : (
              <FinanceView
                invoices={invoices}
                clients={clients}
                plans={plans}
                stats={stats}
                onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                onOpenNewInvoice={handleOpenNewInvoice}
                onSimulateWebhook={handleSimulateWebhook}
                onPayInvoiceDirectly={handlePayInvoice}
                initialSubTab={activeTab === 'charges' ? 'charges' : activeTab === 'carnes' ? 'carnes' : 'invoices'}
                companySettings={companySettings}
                onRefresh={loadAllData}
              />
            )
          )}

          {activeTab === 'towers' && (
            <TowersView
              towers={towers}
              clients={clients}
              onAddTower={handleAddTower}
            />
          )}

          {activeTab === 'users' && (
            currentUser?.role !== 'administrador' ? (
              <RestrictedAccessView
                requiredRoles={['administrador']}
                currentRole={currentUser?.role}
                moduleName="Gestão de Usuários & RBAC"
                onSwitchToAdmin={handleSwitchToAdmin}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            ) : (
              <UsersManagementView
                currentUser={currentUser}
                authToken={authToken}
                onRefresh={loadAllData}
              />
            )
          )}

          {activeTab === 'logs' && (
            <AuditLogsView
              logs={auditLogs}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'deploy' && (
            currentUser?.role === 'financeiro' ? (
              <RestrictedAccessView
                requiredRoles={['administrador', 'tecnico']}
                currentRole={currentUser?.role}
                moduleName="Deploy & Infraestrutura de Servidores"
                onSwitchToAdmin={handleSwitchToAdmin}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            ) : (
              <DeployGuideView />
            )
          )}

          {activeTab === 'provedor' && (
            <CompanySettingsView
              settings={companySettings}
              mikrotikConfig={mikrotikConfig}
              onSave={handleSaveCompanySettings}
              onOpenBoletoPreview={() => {
                const sampleInv = invoices[0] || null;
                setSelectedInvoice(sampleInv);
              }}
              onRefreshData={loadAllData}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-xs text-slate-500 text-center px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              {companySettings.name} • Sistema de Gestão & Faturamento para Provedores (MikroTik RouterOS, O.S, Cobranças & Fibra)
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-amber-400 font-semibold">{companySettings.name}</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">Status: Operacional</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Service Order Add/Edit Modal */}
      <ServiceOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderToEdit(null);
        }}
        onSave={handleSaveOrder}
        orderToEdit={orderToEdit}
        clients={clients}
      />

      {/* Client Add/Edit Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setClientToEdit(null);
        }}
        onSave={handleSaveClient}
        clientToEdit={clientToEdit}
        plans={plans}
        towers={towers}
        onOpenNewPlan={() => {
          setPlanToEdit(null);
          setIsPlanModalOpen(true);
        }}
      />

      {/* Plan Add/Edit Modal */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setPlanToEdit(null);
        }}
        onSave={handleSavePlan}
        planToEdit={planToEdit}
      />

      {/* Boleto Bancário Oficial Febraban & Fatura Pix Modal */}
      <BoletoModal
        invoice={selectedInvoice}
        client={clients.find(c => c.id === selectedInvoice?.clientId)}
        companySettings={companySettings}
        onClose={() => setSelectedInvoice(null)}
        onPayInvoice={handlePayInvoice}
      />

      {/* Login / Register / Forgot Password Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        isEnforced={false}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        companySettings={companySettings}
      />
    </div>
  );
}
