import { Client, Plan, Tower, Invoice, MikrotikConfig, MikrotikServer, GatewayConfig, AuditLog, SystemStats, User, ServiceOrder, Contract, Equipment, FiscalInvoice, CompanySettings, Carne } from '../src/types/index.js';
import { initialUsers } from './auth.js';

// Planos do Provedor de Internet (Fibra Óptica & Rádio Wireless)
export const initialPlans: Plan[] = [
  {
    id: 'plan-1',
    name: 'Plano Start 15M (Wireless 5.8GHz)',
    speedDown: 15,
    speedUp: 5,
    price: 89.90,
    technology: 'radio_5ghz',
    profileName: 'prof_15m_padrao',
    description: 'Conexão estável para residências e tarefas do dia a dia.'
  },
  {
    id: 'plan-2',
    name: 'Plano Turbo 30M (Wireless 5.8GHz)',
    speedDown: 30,
    speedUp: 10,
    price: 119.90,
    technology: 'radio_5ghz',
    profileName: 'prof_30m_ultra',
    description: 'Recomendado para streaming HD, jogos e home office com alta estabilidade.'
  },
  {
    id: 'plan-3',
    name: 'Plano Plus 60M (Wireless AC)',
    speedDown: 60,
    speedUp: 20,
    price: 139.90,
    technology: 'radio_5ghz',
    profileName: 'prof_60m_plus',
    description: 'Alta capacidade e estabilidade para múltiplos dispositivos conectados simultâneos.'
  },
  {
    id: 'plan-4',
    name: 'Fibra Óptica 150M Full Duplex',
    speedDown: 150,
    speedUp: 50,
    price: 149.90,
    technology: 'fibra',
    profileName: 'prof_150m_fibra',
    description: 'Conexão via fibra óptica com latência ultra baixa e downloads em alta velocidade.'
  },
  {
    id: 'plan-5',
    name: 'Fibra Óptica 300M Gamer & Home Office',
    speedDown: 300,
    speedUp: 100,
    price: 249.90,
    technology: 'fibra',
    profileName: 'prof_300m_corp',
    description: 'IP Fixo dinâmico e baixa latência para empresas, gamers e telemetria de alta demanda.'
  }
];

// Rural Transmission Towers (POPs & Repetidoras)
export const initialTowers: Tower[] = [
  {
    id: 'tower-1',
    name: 'Torre Serra Azul (Principal)',
    location: 'Morro do Cruzeiro - Altitude 980m',
    frequency: '5.8 GHz (AirMAX AC)',
    capacity: 120,
    activeClients: 0,
    status: 'online',
    coordinates: '-15.7892, -47.9255',
    ipGateway: '10.50.1.1'
  },
  {
    id: 'tower-2',
    name: 'POP Fazenda Boa Esperança',
    location: 'Silo Central - Setor Leste',
    frequency: '5.8 GHz (MikroTik NetMetal)',
    capacity: 80,
    activeClients: 0,
    status: 'online',
    coordinates: '-15.8211, -47.8842',
    ipGateway: '10.50.2.1'
  },
  {
    id: 'tower-3',
    name: 'Repetidora Morro das Pedras',
    location: 'Estrada Vicinal Km 24',
    frequency: '5.8 GHz / Enlace PTP 1.2Gbps',
    capacity: 60,
    activeClients: 0,
    status: 'online',
    coordinates: '-15.8540, -47.9620',
    ipGateway: '10.50.3.1'
  },
  {
    id: 'tower-4',
    name: 'OLT Central Vila Santa Maria',
    location: 'Distrito Central (Rede FTTH Fibra)',
    frequency: 'GPON / EPON 2.5G',
    capacity: 256,
    activeClients: 0,
    status: 'online',
    coordinates: '-15.7650, -47.9100',
    ipGateway: '10.50.4.1'
  }
];

// Clientes reais do Provedor (Inicialmente limpo para bancada e produção)
export const initialClients: Client[] = [];

export const initialMikrotikServers: MikrotikServer[] = [
  {
    id: 'srv-1',
    name: 'Servidor Sede (RB Principal 192.168.1.120)',
    host: '192.168.1.120',
    port: 8728,
    user: 'admin_isp',
    password: '',
    interfaceName: 'ether2',
    defaultProfile: 'prof_15m_padrao',
    blockProfile: 'prof_corte_bloqueado',
    location: 'Sede Central (Porta 01 - WAN: 192.168.1.120)',
    isDefault: true,
    status: 'connected',
    routerModel: 'MikroTik RouterBOARD (RB)',
    routerOsVersion: 'RouterOS v7.14',
    uptime: '12d 04h',
    cpuLoad: 2,
    lastSync: new Date().toISOString()
  }
];

export const initialMikrotikConfig: MikrotikConfig = {
  host: '192.168.1.120',
  port: 8728, // Standard RouterOS API port
  user: 'admin_isp',
  blockProfile: 'prof_corte_bloqueado',
  defaultProfile: 'prof_15m_padrao',
  autoKickOnBlock: true,
  status: 'connected',
  isSimulated: false, // Bancada física ativa
  routerModel: 'MikroTik RouterOS (Bancada Física)',
  routerOsVersion: 'RouterOS v7.14',
  cpuLoad: 2,
  freeMemoryMb: 980,
  uptime: '0h 05m',
  lastSync: new Date().toISOString()
};

export const initialCompanySettings: CompanySettings = {
  name: 'Meu Provedor Telecom',
  legalName: 'Provedor de Telecomunicações & Internet Ltda',
  cnpj: '28.491.029/0001-83',
  logoUrl: '',
  slogan: 'Ultra Banda Larga & Fibra Óptica de Alta Velocidade',
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

export const initialGatewayConfig: GatewayConfig = {
  provider: 'asaas',
  apiKey: '$aact_YTU1YjM0MzM...mock_isp_billing_token',
  sandbox: true,
  pixKey: '28.491.029/0001-83',
  pixKeyType: 'cnpj',
  beneficiaryName: 'MEU PROVEDOR TELECOMUNICACOES LTDA',
  beneficiaryCity: 'BRASILIA',
  webhookSecret: 'whsec_isp_webhook_secret_key'
};

export const initialServiceOrders: ServiceOrder[] = [];
export const initialContracts: Contract[] = [];
export const initialEquipments: Equipment[] = [];
export const initialFiscalInvoices: FiscalInvoice[] = [];

// In-Memory Database store
class DatabaseStore {
  public users: User[] = [...initialUsers];
  public clients: Client[] = [...initialClients];
  public plans: Plan[] = [...initialPlans];
  public towers: Tower[] = [...initialTowers];
  public invoices: Invoice[] = [];
  public serviceOrders: ServiceOrder[] = [...initialServiceOrders];
  public contracts: Contract[] = [...initialContracts];
  public equipments: Equipment[] = [...initialEquipments];
  public fiscalInvoices: FiscalInvoice[] = [...initialFiscalInvoices];
  public mikrotikConfig: MikrotikConfig = { ...initialMikrotikConfig };
  public servers: MikrotikServer[] = [...initialMikrotikServers];
  public gatewayConfig: GatewayConfig = { ...initialGatewayConfig };
  public companySettings: CompanySettings = { ...initialCompanySettings };
  public auditLogs: AuditLog[] = [];
  public carnes: Carne[] = [];

  constructor() {
    this.seedInvoices();
    this.seedCarnes();
    this.seedAuditLogs();
  }

  private seedInvoices() {
    if (this.clients.length === 0) return;
  }

  private seedCarnes() {
    if (this.clients.length === 0) return;
  }

  private seedAuditLogs() {
    this.auditLogs = [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        type: 'system',
        action: 'BOOT_SYSTEM',
        message: 'Servidor AgroISP Pro inicializado. Sistema limpo pronto para conexão no MikroTik de bancada e cadastro de clientes.',
        status: 'success'
      }
    ];
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
    return log;
  }

  public importClients(rawClients: Partial<Client>[]): { added: number; errors: string[] } {
    let added = 0;
    const errors: string[] = [];

    for (const c of rawClients) {
      if (!c.name || !c.pppoeUsername) {
        errors.push(`Cliente ignorado por falta de nome ou usuário PPPoE: ${c.name || 'Sem nome'}`);
        continue;
      }

      // Check if username already exists
      if (this.clients.some(existing => existing.pppoeUsername === c.pppoeUsername)) {
        errors.push(`Usuário PPPoE '${c.pppoeUsername}' já existe.`);
        continue;
      }

      const plan = this.plans.find(p => p.id === c.planId) || this.plans[0];
      const tower = this.towers.find(t => t.id === c.towerId) || this.towers[0];

      const newClient: Client = {
        id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: c.name,
        document: c.document || '000.000.000-00',
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || 'Zona Rural',
        ruralLocation: c.ruralLocation || 'Setor Rural',
        towerId: tower.id,
        planId: plan.id,
        dueDay: c.dueDay || 10,
        pppoeUsername: c.pppoeUsername,
        pppoePassword: c.pppoePassword || '123456',
        ipAddress: c.ipAddress,
        macAddress: c.macAddress,
        status: (c.status as any) || 'active',
        signalDbm: c.signalDbm || -56,
        createdAt: new Date().toISOString().split('T')[0]
      };

      this.clients.unshift(newClient);
      added++;
    }

    if (added > 0) {
      this.addAuditLog({
        type: 'client',
        action: 'BATCH_IMPORT',
        message: `Importação em lote de ${added} clientes concluída com sucesso para bancada/produção.`,
        status: 'success'
      });
    }

    return { added, errors };
  }

  public resetToSampleData() {
    this.clients = [];
    this.invoices = [];
    this.carnes = [];
    this.serviceOrders = [];
    this.contracts = [];
    this.equipments = [];
    this.fiscalInvoices = [];
    this.towers.forEach(t => t.activeClients = 0);
    this.addAuditLog({
      type: 'system',
      action: 'CLEAR_DATA',
      message: 'Todos os clientes de modelos e boletos de exemplo foram removidos. Sistema limpo.',
      status: 'info'
    });
  }

  public getStats(): SystemStats {
    const totalClients = this.clients.length;
    const activeClients = this.clients.filter(c => c.status === 'active').length;
    const blockedClients = this.clients.filter(c => c.status === 'blocked').length;
    const pendingClients = this.clients.filter(c => c.status === 'pending' || c.status === 'cancelled').length;

    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const currentMonthInvoices = this.invoices.filter(i => !i.referenceMonth || i.referenceMonth === currentMonth);

    const monthlyRevenue = currentMonthInvoices
      .filter(i => i.status === 'paga')
      .reduce((sum, i) => sum + i.amount, 0);

    const pendingRevenue = currentMonthInvoices
      .filter(i => i.status === 'pendente')
      .reduce((sum, i) => sum + i.amount, 0);

    const overdueRevenue = currentMonthInvoices
      .filter(i => i.status === 'atrasada')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalTowers = this.towers.length;
    const towersOnline = this.towers.filter(t => t.status === 'online').length;
    const openTickets = this.serviceOrders.filter(o => o.status !== 'concluida' && o.status !== 'cancelada').length;
    const activeContracts = this.contracts.filter(c => c.status === 'ativo').length;

    return {
      totalClients,
      activeClients,
      blockedClients,
      pendingClients,
      onlineSessions: activeClients, // active connected sessions
      monthlyRevenue,
      pendingRevenue,
      overdueRevenue,
      totalInvoicesMonth: this.invoices.length,
      towersOnline,
      totalTowers,
      openTickets,
      activeContracts
    };
  }
}

export const db = new DatabaseStore();
