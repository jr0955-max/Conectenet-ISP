import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Server, 
  HardDrive, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  Cpu,
  Zap,
  FolderGit2
} from 'lucide-react';

export const DeployGuideView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const oneLineCommand = `curl -fsSL https://raw.githubusercontent.com/provedor/isp-billing/main/provision.sh | sudo bash`;

  const dockerComposeContent = `version: '3.8'

services:
  isp-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: isp-telecom-billing
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MIKROTIK_HOST=192.168.88.1
      - MIKROTIK_PORT=8728
      - MIKROTIK_USER=admin_isp
      - MIKROTIK_PASSWORD=sua_senha_mikrotik_aqui
      - MIKROTIK_BLOCK_PROFILE=bloqueados
      - ASAAS_API_KEY=seu_token_asaas_aqui
      - MERCADOPAGO_ACCESS_TOKEN=seu_token_mp_aqui
      - PIX_KEY=28491029000183
      - PIX_KEY_TYPE=cnpj
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/stats"]
      interval: 15s
      timeout: 5s
      retries: 3
    networks:
      - isp_network

networks:
  isp_network:
    driver: bridge`;

  const proxmoxCommand = `# No console do Proxmox VE (PVE Node Shell):
# 1. Criar um container LXC Debian 12 com 1 vCPU e 1024MB RAM
# 2. Dentro do container LXC Debian, execute o provisionamento:
apt update && apt install -y curl git
curl -fsSL https://get.docker.com | sh
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git /opt/isp-telecom
cd /opt/isp-telecom
docker compose up -d --build`;

  const mikrotikApiRules = `# No Terminal do MikroTik RouterOS (Winbox):
# 1. Habilitar a porta da API
/ip service enable api
/ip service set api port=8728

# 2. Criar usuário e permissões restritas para o ISP Telecom Billing
/user group add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy
/user add name=admin_isp group=isp-api password="senha_super_segura" comment="ISP Billing API"

# 3. Criar perfil de corte para clientes inadimplentes
/ip pool add name=pool-bloqueados ranges=10.99.99.2-10.99.99.254
/ppp profile add name=bloqueados local-address=10.99.99.1 remote-address=pool-bloqueados rate-limit=128k/128k comment="Corte Inadimplencia"`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-950">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Guia de Implantação Rápida (Proxmox, VPS & Docker)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instalação do Sistema ISP em servidores locais de provedores via Proxmox LXC ou Docker com comandos prontos.
            </p>
          </div>
        </div>

        {/* 1-Line Command Box */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-mono text-xs text-emerald-400 overflow-x-auto w-full">
            <span className="text-slate-500">$</span>
            <span className="select-all whitespace-nowrap">{oneLineCommand}</span>
          </div>

          <button
            onClick={() => copyToClipboard(oneLineCommand, 'oneline')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1.5 shrink-0 shadow-md shadow-emerald-950"
          >
            {copiedKey === 'oneline' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'oneline' ? 'Copiado!' : 'Copiar Comando'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Docker Compose */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">1. Arquivo docker-compose.yml</h3>
            </div>
            <button
              onClick={() => copyToClipboard(dockerComposeContent, 'compose')}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              {copiedKey === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'compose' ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 h-64 overflow-y-auto whitespace-pre">
            {dockerComposeContent}
          </div>
          <p className="text-[11px] text-slate-400">
            Armazena dados no diretório local <code className="text-cyan-400 font-mono">./data</code> com persistência garantida.
          </p>
        </div>

        {/* Step 2: Proxmox LXC Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">2. Proxmox VE (LXC Debian / Ubuntu)</h3>
            </div>
            <button
              onClick={() => copyToClipboard(proxmoxCommand, 'proxmox')}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              {copiedKey === 'proxmox' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'proxmox' ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 h-64 overflow-y-auto whitespace-pre">
            {proxmoxCommand}
          </div>
          <p className="text-[11px] text-slate-400">
            Recomendado para servidores locais instalados na sede ou torre principal do provedor.
          </p>
        </div>
      </div>

      {/* Step 3: MikroTik RouterOS Configuration Rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">3. Regras de Liberação de API no MikroTik RouterOS</h3>
          </div>
          <button
            onClick={() => copyToClipboard(mikrotikApiRules, 'mikrotikRules')}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            {copiedKey === 'mikrotikRules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'mikrotikRules' ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 font-mono text-[11px] text-emerald-300 whitespace-pre overflow-x-auto">
          {mikrotikApiRules}
        </div>
      </div>

      {/* Step 4: Webhook Configuration for Asaas and Mercado Pago */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">4. Configuração de Webhook na Adquirente (Baixa Instantânea)</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Para que o desbloqueio do cliente ocorra no segundo em que o Pix for pago, cadastre as URLs de Webhook no painel da sua adquirente:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-500 block font-sans">Webhook Asaas:</span>
            <span className="text-emerald-400">https://seu-dominio.com.br/api/webhooks/asaas</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-sans">Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-500 block font-sans">Webhook Mercado Pago:</span>
            <span className="text-emerald-400">https://seu-dominio.com.br/api/webhooks/mercadopago</span>
            <span className="text-[10px] text-slate-400 block mt-1 font-sans">Eventos: Pagamentos (payment)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
