export type UserRole = 'administrador' | 'tecnico' | 'financeiro';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
}

export interface Client {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  phone: string; // WhatsApp
  email: string;
  address: string;
  ruralLocation: string; // e.g. "Fazenda Boa Esperança - Km 14"
  towerId: string;
  planId: string;
  dueDay: number; // 5, 10, 15, 20, 25
  pppoeUsername: string;
  pppoePassword: string;
  ipAddress?: string;
  macAddress?: string;
  status: 'active' | 'blocked' | 'cancelled' | 'pending';
  signalDbm?: number; // e.g. -58 dBm for wireless clients
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  speedDown: number; // in Mbps
  speedUp: number; // in Mbps
  price: number;
  technology: 'radio_5ghz' | 'fibra' | 'radio_24ghz';
  profileName: string; // MikroTik PPP profile name
  description?: string;
}

export interface Tower {
  id: string;
  name: string;
  location: string;
  frequency: string;
  capacity: number;
  activeClients: number;
  status: 'online' | 'warning' | 'offline';
  coordinates: string;
  ipGateway: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  clientDocument: string;
  clientPhone: string;
  planName: string;
  amount: number;
  dueDate: string;
  status: 'paga' | 'pendente' | 'atrasada';
  barcode: string;
  pixCopyPaste: string;
  qrCodeDataUrl?: string;
  paymentDate?: string;
  gateway: 'asaas' | 'mercadopago' | 'efi';
  referenceMonth: string; // e.g. "10/2026"
  createdAt: string;
  installment?: string; // e.g. "01/12", "02/12"
  description?: string; // e.g. "Cobrança avulsa referente a mês em atraso"
  fineAmount?: number;
  interestAmount?: number;
  clientAddress?: string;
  carneId?: string;
}

export interface Carne {
  id: string; // e.g. "9358841"
  clientId: string;
  clientName: string;
  clientDocument: string;
  clientEmail?: string;
  gateway: string; // e.g. "Galax Pay" | "Asaas"
  status: 'em dia' | 'em atraso';
  totalInstallments: number; // e.g. 12
  paidInstallments: number; // e.g. 1
  firstDueDate: string; // YYYY-MM-DD
  installmentAmount: number;
  description: string;
  createdAt: string; // e.g. "10/10/26 20:11"
}

export interface ActiveSession {
  id: string;
  username: string;
  clientName: string;
  ipAddress: string;
  uptime: string;
  uptimeSeconds: number;
  rxBytes: number;
  txBytes: number;
  rxRateKbps: number;
  txRateKbps: number;
  callerId: string; // MAC Address
  service: string;
  interfaceName: string;
  signalDbm: number;
  towerName: string;
}

export interface MikrotikConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  blockProfile: string;
  defaultProfile: string;
  autoKickOnBlock: boolean;
  status: 'connected' | 'disconnected' | 'testing';
  isSimulated: boolean;
  routerModel: string;
  routerOsVersion: string;
  cpuLoad: number;
  freeMemoryMb: number;
  uptime: string;
  lastSync: string;
}

export interface GatewayConfig {
  provider: 'asaas' | 'mercadopago' | 'efi';
  apiKey: string;
  sandbox: boolean;
  pixKey: string;
  pixKeyType: 'cnpj' | 'cpf' | 'email' | 'telefone' | 'aleatoria';
  beneficiaryName: string;
  beneficiaryCity: string;
  webhookSecret?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  type: 'mikrotik' | 'payment' | 'client' | 'system';
  action: string;
  message: string;
  status: 'success' | 'warning' | 'error' | 'info';
  details?: string;
}

export interface SystemStats {
  totalClients: number;
  activeClients: number;
  blockedClients: number;
  pendingClients: number;
  onlineSessions: number;
  monthlyRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  totalInvoicesMonth: number;
  towersOnline: number;
  totalTowers: number;
  openTickets?: number;
  activeContracts?: number;
}

export interface ServiceOrder {
  id: string;
  protocol: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  address: string;
  type: 'instalacao' | 'manutencao' | 'troca_roteador' | 'sinal_fraco' | 'mudanca_endereco' | 'recolhimento';
  status: 'aberta' | 'em_deslocamento' | 'em_andamento' | 'concluida' | 'cancelada';
  priority: 'baixa' | 'normal' | 'alta' | 'urgente';
  technicianName: string;
  scheduledDate: string;
  description: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientId: string;
  clientName: string;
  clientDocument: string;
  planName: string;
  monthlyValue: number;
  status: 'ativo' | 'pendente_assinatura' | 'cancelado';
  startDate: string;
  loyaltyMonths: number;
  equipmentComodato?: string;
}

export interface Equipment {
  id: string;
  model: string;
  type: 'onu_fibra' | 'roteador_wifi' | 'radio_cpe' | 'switch' | 'fonte_poe';
  macAddress: string;
  serialNumber: string;
  status: 'disponivel' | 'comodato' | 'manutencao' | 'avariado';
  clientId?: string;
  clientName?: string;
  assignedDate?: string;
}

export interface FiscalInvoice {
  id: string;
  model: '21' | '22' | 'NF-e';
  number: string;
  series: string;
  clientName: string;
  clientDocument: string;
  period: string;
  cfop: string;
  totalAmount: number;
  icmsAmount: number;
  status: 'autorizada' | 'emitida' | 'cancelada';
  emissionDate: string;
  verificationCode: string;
}

export interface CompanySettings {
  name: string; // Nome fantasia do Provedor (exibido nos menus e topo)
  legalName: string; // Razão social do Provedor
  cnpj: string; // CNPJ / CPF
  logoUrl?: string; // Logomarca personalizada em Data URL base64 ou URL
  slogan?: string; // Slogan ou subtítulo
  phone: string; // Telefone / WhatsApp do Provedor
  email: string; // E-mail de atendimento
  website?: string; // Website do Provedor
  pixKey?: string; // Chave Pix para recebimento
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  };
  // Configurações do Boleto Bancário
  bankName: string; // Ex: "Banco do Brasil", "Sicoob", "Bradesco", "Itaú", "Sicredi", "Asaas"
  bankCode: string; // Ex: "001-9", "756-0", "237-2"
  agency: string; // Ex: "1234-5"
  account: string; // Ex: "98765-4"
  carteira: string; // Ex: "17", "09", "109"
  boletoInstructions: string; // Mensagem impressa no boleto
}
