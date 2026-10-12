import { Client, Plan, Tower, Invoice, MikrotikConfig, GatewayConfig, AuditLog, SystemStats, User, ServiceOrder, Contract, Equipment, FiscalInvoice, CompanySettings, Carne } from '../src/types/index.js';
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
    activeClients: 42,
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
    activeClients: 28,
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
    activeClients: 19,
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
    activeClients: 64,
    status: 'online',
    coordinates: '-15.7650, -47.9100',
    ipGateway: '10.50.4.1'
  }
];

// Realistic Rural ISP Clients
export const initialClients: Client[] = [
  {
    id: 'cli-001',
    name: 'Sebastião Moreira de Souza',
    document: '184.920.318-42',
    phone: '5561998412301',
    email: 'sebastiao.fazenda@gmail.com',
    address: 'Fazenda Três Barras, Gleba 04, Sede',
    ruralLocation: 'Região do Córrego Fundo - Km 12',
    towerId: 'tower-1',
    planId: 'plan-3',
    dueDay: 10,
    pppoeUsername: 'sebastiao_fazenda',
    pppoePassword: 'agro@pass123',
    ipAddress: '10.50.1.102',
    macAddress: 'DC:9F:DB:21:4A:11',
    status: 'active',
    signalDbm: -56,
    createdAt: '2026-02-15'
  },
  {
    id: 'cli-002',
    name: 'Agropecuária Vale Verde Ltda',
    document: '28.491.029/0001-83',
    phone: '5561981249910',
    email: 'contato@agrivaleverde.com.br',
    address: 'Rodovia Municipal km 8, Granja 2',
    ruralLocation: 'Complexo de Silos Vale Verde',
    towerId: 'tower-2',
    planId: 'plan-5',
    dueDay: 15,
    pppoeUsername: 'valeverde_agro',
    pppoePassword: 'pass@vale99',
    ipAddress: '10.50.2.200',
    macAddress: '48:8F:5A:9C:12:44',
    status: 'active',
    signalDbm: -51,
    createdAt: '2026-01-10'
  },
  {
    id: 'cli-003',
    name: 'Antônio Carlos Ferreira (Tonho)',
    document: '392.104.829-19',
    phone: '5561996521478',
    email: 'tonho.ferreira88@hotmail.com',
    address: 'Sítio Recanto das Emas, Lote 15',
    ruralLocation: 'Subida da Serra do Ouro',
    towerId: 'tower-1',
    planId: 'plan-2',
    dueDay: 5,
    pppoeUsername: 'tonho_sitio',
    pppoePassword: 'tonho1234',
    ipAddress: '10.50.1.115',
    macAddress: '24:A4:3C:D9:8E:2B',
    status: 'blocked', // Inadimplente, bloqueado no MikroTik
    signalDbm: -63,
    createdAt: '2026-03-01'
  },
  {
    id: 'cli-004',
    name: 'Maria Helena Duarte Santos',
    document: '512.839.201-94',
    phone: '5561991203344',
    email: 'helena.santos.agro@outlook.com',
    address: 'Chácara São José, Casa Principal',
    ruralLocation: 'Vicinal 4, próximo ao Laticínio',
    towerId: 'tower-3',
    planId: 'plan-1',
    dueDay: 10,
    pppoeUsername: 'mhelena_chacara',
    pppoePassword: 'chacara!2026',
    ipAddress: '10.50.3.45',
    macAddress: '70:A7:41:88:BF:19',
    status: 'active',
    signalDbm: -58,
    createdAt: '2026-04-12'
  },
  {
    id: 'cli-005',
    name: 'Cooperativa dos Produtores de Milho',
    document: '04.192.832/0001-55',
    phone: '5561984401928',
    email: 'ti@coopmilho.com.br',
    address: 'Avenida das Palmeiras, 450 - Vila Rural',
    ruralLocation: 'Vila Santa Maria (Distrito)',
    towerId: 'tower-4',
    planId: 'plan-4',
    dueDay: 20,
    pppoeUsername: 'coop_milho_ftth',
    pppoePassword: 'coop#fibra99',
    ipAddress: '10.50.4.10',
    macAddress: 'F4:8C:50:33:AA:90',
    status: 'active',
    createdAt: '2026-05-18'
  },
  {
    id: 'cli-006',
    name: 'José Benedito da Silva',
    document: '402.918.374-00',
    phone: '5561993448821',
    email: 'jose.benedito.rural@gmail.com',
    address: 'Assentamento Terra Nova, Parcela 32',
    ruralLocation: 'Estrada Velha do Mutum',
    towerId: 'tower-1',
    planId: 'plan-1',
    dueDay: 5,
    pppoeUsername: 'jose_assentamento',
    pppoePassword: 'terra#nova123',
    ipAddress: '10.50.1.180',
    macAddress: '00:27:22:9E:04:81',
    status: 'blocked',
    signalDbm: -67,
    createdAt: '2026-06-20'
  },
  {
    id: 'cli-007',
    name: 'Fazenda Estrela Guia (Piscicultura)',
    document: '19.823.109/0001-40',
    phone: '5561982001199',
    email: 'financeiro@estrelaguia.agr.br',
    address: 'Gleba Rio das Almas, Represa Nova',
    ruralLocation: 'Acesso Rio das Almas km 30',
    towerId: 'tower-2',
    planId: 'plan-3',
    dueDay: 25,
    pppoeUsername: 'estrelaguia_peixe',
    pppoePassword: 'peixe*agro7',
    ipAddress: '10.50.2.14',
    macAddress: 'B8:69:F4:11:09:55',
    status: 'active',
    signalDbm: -54,
    createdAt: '2026-07-01'
  }
];

export const initialMikrotikConfig: MikrotikConfig = {
  host: '192.168.88.1',
  port: 8728, // Standard RouterOS API port
  user: 'admin_isp',
  blockProfile: 'bloqueados',
  defaultProfile: 'default',
  autoKickOnBlock: true,
  status: 'connected',
  isSimulated: true, // Seamless dual mode
  routerModel: 'MikroTik CCR1009-7G-1C-1S+ (Cloud Core Router)',
  routerOsVersion: 'RouterOS v7.14.3',
  cpuLoad: 8,
  freeMemoryMb: 942,
  uptime: '42d 18h 33m',
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

export const initialServiceOrders: ServiceOrder[] = [
  {
    id: 'os-101',
    protocol: 'OS-2026-0841',
    clientId: 'cli-001',
    clientName: 'Sebastião Moreira de Souza',
    clientPhone: '5561998412301',
    address: 'Fazenda Três Barras, Gleba 04 - Região do Córrego Fundo',
    type: 'sinal_fraco',
    status: 'em_andamento',
    priority: 'alta',
    technicianName: 'Lucas Ferreira (Técnico Campo)',
    scheduledDate: '2026-10-10 14:00',
    description: 'Cliente relata oscilação de sinal. Verificar alinhamento da antena AirMAX 5.8GHz.',
    createdAt: '2026-10-09'
  },
  {
    id: 'os-102',
    protocol: 'OS-2026-0842',
    clientId: 'cli-003',
    clientName: 'Hamilton Silveira (Fazenda Sol Nascente)',
    clientPhone: '5561991004455',
    address: 'KM 18 da Estrada do Açude, Gleba B',
    type: 'instalacao',
    status: 'aberta',
    priority: 'normal',
    technicianName: 'Marcos Vinícius',
    scheduledDate: '2026-10-11 09:30',
    description: 'Instalação nova de kit rural 60M (Rádio AC 5.8GHz + Roteador Gigabit).',
    createdAt: '2026-10-09'
  },
  {
    id: 'os-103',
    protocol: 'OS-2026-0839',
    clientId: 'cli-005',
    clientName: 'Cooperativa Agrícola do Vale',
    clientPhone: '5561999881122',
    address: 'Avenida das Palmeiras, 450 - Vila Rural',
    type: 'manutencao',
    status: 'concluida',
    priority: 'urgente',
    technicianName: 'Lucas Ferreira (Técnico Campo)',
    scheduledDate: '2026-10-08 11:00',
    description: 'Troca de conector óptico SC-APC na caixa de emenda (CEO 03).',
    resolutionNotes: 'Conector substituído, sinal óptico estabilizado em -19.4 dBm. Link OK.',
    createdAt: '2026-10-08'
  },
  {
    id: 'os-104',
    protocol: 'OS-2026-0840',
    clientId: 'cli-006',
    clientName: 'José Benedito da Silva',
    clientPhone: '5561993448821',
    address: 'Assentamento Terra Nova, Parcela 32',
    type: 'troca_roteador',
    status: 'em_deslocamento',
    priority: 'normal',
    technicianName: 'Rodrigo Antunes',
    scheduledDate: '2026-10-10 16:30',
    description: 'Fonte POE queimada após descarga atmosférica. Substituir por fonte 24V Gigabit.',
    createdAt: '2026-10-09'
  }
];

export const initialContracts: Contract[] = [
  {
    id: 'cnt-001',
    contractNumber: 'CTR-2026-0012',
    clientId: 'cli-001',
    clientName: 'Sebastião Moreira de Souza',
    clientDocument: '184.920.318-42',
    planName: 'Fazenda Conectada 60M',
    monthlyValue: 159.90,
    status: 'ativo',
    startDate: '2026-02-15',
    loyaltyMonths: 12,
    equipmentComodato: 'Antena LiteBeam 5AC + Roteador AC1200'
  },
  {
    id: 'cnt-002',
    contractNumber: 'CTR-2026-0013',
    clientId: 'cli-002',
    clientName: 'Agropecuária Vale Verde Ltda',
    clientDocument: '28.491.029/0001-83',
    planName: 'Fibra Agro Corporativo 300M',
    monthlyValue: 249.90,
    status: 'ativo',
    startDate: '2026-03-01',
    loyaltyMonths: 24,
    equipmentComodato: 'ONU Bridge GPON + Roteador Wi-Fi 6 AX3000'
  },
  {
    id: 'cnt-003',
    contractNumber: 'CTR-2026-0014',
    clientId: 'cli-003',
    clientName: 'Hamilton Silveira (Fazenda Sol Nascente)',
    clientDocument: '319.482.019-55',
    planName: 'Plano Turbo 30M (Wireless)',
    monthlyValue: 119.90,
    status: 'ativo',
    startDate: '2026-03-10',
    loyaltyMonths: 12,
    equipmentComodato: 'Antena NanoBeam 5AC Gen2'
  },
  {
    id: 'cnt-004',
    contractNumber: 'CTR-2026-0015',
    clientId: 'cli-004',
    clientName: 'Dona Maria de Lourdes Pires',
    clientDocument: '512.394.810-77',
    planName: 'Plano Start 15M (Wireless 5.8GHz)',
    monthlyValue: 89.90,
    status: 'pendente_assinatura',
    startDate: '2026-04-12',
    loyaltyMonths: 12,
    equipmentComodato: 'CPE AirGrid M5 23dBi'
  }
];

export const initialEquipments: Equipment[] = [
  {
    id: 'eq-001',
    model: 'Ubiquiti LiteBeam 5AC Gen2',
    type: 'radio_cpe',
    macAddress: 'DC:9F:DB:21:4A:11',
    serialNumber: 'UBNT-LBE-2026-991',
    status: 'comodato',
    clientId: 'cli-001',
    clientName: 'Sebastião Moreira de Souza',
    assignedDate: '2026-02-15'
  },
  {
    id: 'eq-002',
    model: 'ONU Huawei EG8145V5 Dual Band Wi-Fi',
    type: 'onu_fibra',
    macAddress: '48:57:02:DF:31:88',
    serialNumber: 'HWTC-2026-8812',
    status: 'comodato',
    clientId: 'cli-002',
    clientName: 'Agropecuária Vale Verde Ltda',
    assignedDate: '2026-03-01'
  },
  {
    id: 'eq-003',
    model: 'Roteador TP-Link Archer C6 AC1200 Gigabit',
    type: 'roteador_wifi',
    macAddress: '98:48:27:11:AB:CC',
    serialNumber: 'TPL-C6-2026-554',
    status: 'disponivel'
  },
  {
    id: 'eq-004',
    model: 'MikroTik Cloud Router Switch CRS326-24G-2S+RM',
    type: 'switch',
    macAddress: 'CC:2D:E0:99:88:77',
    serialNumber: 'MK-CRS-2026-001',
    status: 'disponivel'
  },
  {
    id: 'eq-005',
    model: 'Fonte POE Gigabit 24V 0.5A Ubiquiti',
    type: 'fonte_poe',
    macAddress: 'POE-24-12W-G',
    serialNumber: 'POE-2026-1144',
    status: 'disponivel'
  }
];

export const initialFiscalInvoices: FiscalInvoice[] = [
  {
    id: 'fisc-001',
    model: '21',
    number: '000001842',
    series: 'U',
    clientName: 'Sebastião Moreira de Souza',
    clientDocument: '184.920.318-42',
    period: '09/2026',
    cfop: '5.303',
    totalAmount: 159.90,
    icmsAmount: 15.99,
    status: 'autorizada',
    emissionDate: '2026-09-10',
    verificationCode: 'A9B2-4C18-99EF'
  },
  {
    id: 'fisc-002',
    model: '21',
    number: '000001843',
    series: 'U',
    clientName: 'Agropecuária Vale Verde Ltda',
    clientDocument: '28.491.029/0001-83',
    period: '09/2026',
    cfop: '5.303',
    totalAmount: 249.90,
    icmsAmount: 24.99,
    status: 'autorizada',
    emissionDate: '2026-09-15',
    verificationCode: 'F81C-0022-77EA'
  },
  {
    id: 'fisc-003',
    model: '22',
    number: '000000412',
    series: '1',
    clientName: 'Hamilton Silveira (Fazenda Sol Nascente)',
    clientDocument: '319.482.019-55',
    period: '09/2026',
    cfop: '5.303',
    totalAmount: 119.90,
    icmsAmount: 11.99,
    status: 'autorizada',
    emissionDate: '2026-09-10',
    verificationCode: 'B3E1-7789-22CA'
  }
];

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
    // Generate realistic multi-month invoices (last 5 months + current month)
    const now = new Date();
    
    for (let m = 5; m >= 0; m--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const targetMonthStr = `${String(targetDate.getMonth() + 1).padStart(2, '0')}/${targetDate.getFullYear()}`;
      const isCurrentMonth = m === 0;

      this.clients.forEach((client, idx) => {
        const plan = this.plans.find(p => p.id === client.planId) || this.plans[0];
        const isBlocked = client.status === 'blocked';
        const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), client.dueDay);

        let status: 'paga' | 'pendente' | 'atrasada';
        let paymentDate: string | undefined;

        if (isCurrentMonth) {
          status = isBlocked ? 'atrasada' : (idx % 2 === 0 ? 'paga' : 'pendente');
          if (status === 'paga') {
            paymentDate = new Date(dueDate.getTime() - 86400000).toISOString().split('T')[0];
          }
        } else {
          if (isBlocked && m === 1) {
            status = 'atrasada';
          } else {
            status = 'paga';
            paymentDate = new Date(dueDate.getTime() - 86400000).toISOString().split('T')[0];
          }
        }

        const invoiceId = `FAT-${targetDate.getFullYear()}${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(idx + 1).padStart(4, '0')}`;

        // Realistic Pix EMV string format
        const pixCopyPaste = `00020126580014br.gov.bcb.pix0136${this.gatewayConfig.pixKey}520400005303986540${plan.price.toFixed(2)}5802BR5925${this.gatewayConfig.beneficiaryName.slice(0, 25)}6008BRASILIA62070503***6304D1A4`;
        const barcode = `23793.38128 60000.010204 12000.123456 1 ${Math.floor(9000 + Math.random() * 1000)}00000${Math.floor(plan.price * 100)}`;

        this.invoices.push({
          id: invoiceId,
          clientId: client.id,
          clientName: client.name,
          clientDocument: client.document,
          clientPhone: client.phone,
          planName: plan.name,
          amount: plan.price,
          dueDate: dueDate.toISOString().split('T')[0],
          status,
          barcode,
          pixCopyPaste,
          paymentDate,
          gateway: 'asaas',
          referenceMonth: targetMonthStr,
          createdAt: new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString()
        });
      });
    }
  }

  private seedCarnes() {
    const seedList = [
      { id: '9358841', clientIdx: 0, status: 'em dia' as const, paid: 0, date: '10/10/26 20:11' },
      { id: '9358661', clientIdx: 1, status: 'em dia' as const, paid: 1, date: '10/10/26 19:49' },
      { id: '9356161', clientIdx: 2, status: 'em dia' as const, paid: 0, date: '10/10/26 10:50' },
      { id: '9264301', clientIdx: 3, status: 'em atraso' as const, paid: 1, date: '02/10/26 20:03' },
      { id: '9264201', clientIdx: 4, status: 'em dia' as const, paid: 1, date: '02/10/26 19:54' },
      { id: '9214981', clientIdx: 5, status: 'em dia' as const, paid: 1, date: '29/09/26 21:13' },
      { id: '9214961', clientIdx: 6, status: 'em dia' as const, paid: 1, date: '29/09/26 21:12' },
      { id: '9214921', clientIdx: 0, status: 'em dia' as const, paid: 1, date: '29/09/26 21:10' },
      { id: '9214861', clientIdx: 1, status: 'em dia' as const, paid: 0, date: '29/09/26 21:07' },
      { id: '9090681', clientIdx: 2, status: 'em atraso' as const, paid: 0, date: '17/09/26 20:53' },
      { id: '9090181', clientIdx: 3, status: 'em dia' as const, paid: 1, date: '17/09/26 20:26' },
      { id: '9033861', clientIdx: 4, status: 'em dia' as const, paid: 1, date: '12/09/26 20:39' },
    ];

    seedList.forEach((item) => {
      const client = this.clients[item.clientIdx % this.clients.length] || this.clients[0];
      const plan = this.plans.find(p => p.id === client.planId) || this.plans[0];

      this.carnes.push({
        id: item.id,
        clientId: client.id,
        clientName: client.name,
        clientDocument: client.document,
        clientEmail: client.email,
        gateway: 'Galax Pay',
        status: item.status,
        totalInstallments: 12,
        paidInstallments: item.paid,
        firstDueDate: `2026-10-${String(client.dueDay || 10).padStart(2, '0')}`,
        installmentAmount: plan.price,
        description: 'Mensalidade de Internet - Carnê',
        createdAt: item.date
      });
    });
  }

  private seedAuditLogs() {
    this.auditLogs = [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        type: 'system',
        action: 'BOOT_SYSTEM',
        message: 'Servidor AgroISP Pro inicializado com sucesso em alta disponibilidade.',
        status: 'success'
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        type: 'mikrotik',
        action: 'MIKROTIK_CONNECT',
        message: 'Conexão API estabelecida com MikroTik CCR1009 (192.168.88.1:8728).',
        status: 'success'
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        type: 'mikrotik',
        action: 'PPP_SECRET_SYNC',
        message: 'Sincronização em lote de 7 Secrets PPPoE realizada com sucesso no RouterOS.',
        status: 'success'
      },
      {
        id: 'log-4',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        type: 'payment',
        action: 'WEBHOOK_RECEIVED',
        message: 'Webhook Asaas: Pagamento Pix recebido para fatura de Sebastião Moreira (R$ 159,90).',
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
    this.clients = [...initialClients];
    this.plans = [...initialPlans];
    this.towers = [...initialTowers];
    this.serviceOrders = [...initialServiceOrders];
    this.contracts = [...initialContracts];
    this.equipments = [...initialEquipments];
    this.fiscalInvoices = [...initialFiscalInvoices];
    this.invoices = [];
    this.seedInvoices();
    this.addAuditLog({
      type: 'system',
      action: 'RESET_BENCH',
      message: 'Ambiente de bancada restaurado para os dados de teste padrão.',
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
