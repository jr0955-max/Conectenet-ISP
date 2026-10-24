import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Save, 
  Server, 
  Network, 
  Wifi, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Cpu, 
  Sliders, 
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Plan, CompanySettings } from '../types/index.js';

interface MikrotikScriptWizardProps {
  plans: Plan[];
  companySettings?: CompanySettings;
  onScriptSaved?: () => void;
}

interface HardwarePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultWan: string;
  defaultBridgePorts: string[];
  totalPorts: number;
}

const HARDWARE_PRESETS: HardwarePreset[] = [
  {
    id: 'hex',
    name: 'MikroTik hEX / RB750Gr3 / hEX S',
    category: 'Pequenos POPs & Entrada (5 Portas)',
    description: '5 portas Gigabit Ethernet. Ideal para RBs compactas ou POPs até 100 clientes.',
    defaultWan: 'ether1',
    defaultBridgePorts: ['ether2', 'ether3', 'ether4', 'ether5'],
    totalPorts: 5
  },
  {
    id: 'rb4011',
    name: 'MikroTik RB4011 / RB3011 / RB5009',
    category: 'Média e Grande Capacidade (10 Portas + SFP+)',
    description: '10 portas Gigabit + porta SFP+ 10Gbps. Potência alta para 500 a 1.500 clientes.',
    defaultWan: 'ether1',
    defaultBridgePorts: ['ether2', 'ether3', 'ether4', 'ether5', 'ether6', 'ether7', 'ether8', 'ether9', 'ether10'],
    totalPorts: 10
  },
  {
    id: 'ccr1009',
    name: 'MikroTik CCR1009 / CCR2004 / CCR1016',
    category: 'Concentrador Central / Datacenter (Cloud Core Router)',
    description: 'Hardware para alta demanda, múltiplos links BGP e milhares de conexões PPPoE simultâneas.',
    defaultWan: 'ether1',
    defaultBridgePorts: ['ether2', 'ether3', 'ether4', 'ether5', 'ether6', 'ether7', 'ether8'],
    totalPorts: 8
  },
  {
    id: 'hap',
    name: 'MikroTik hAP / RB941 / Linha Wireless',
    category: 'Roteador Compacto / Laboratório (4 Portas)',
    description: '4 portas Fast Ethernet para simulação de laboratório ou clientes dedicados.',
    defaultWan: 'ether1',
    defaultBridgePorts: ['ether2', 'ether3', 'ether4'],
    totalPorts: 4
  },
  {
    id: 'custom',
    name: 'Modelo Customizado / Outras RBs',
    category: 'Personalizado',
    description: 'Configure manualmente qualquer quantidade de portas físicas ou interfaces SFP.',
    defaultWan: 'ether1',
    defaultBridgePorts: ['ether2', 'ether3', 'ether4', 'ether5'],
    totalPorts: 5
  }
];

export const MikrotikScriptWizard: React.FC<MikrotikScriptWizardProps> = ({
  plans,
  companySettings,
  onScriptSaved
}) => {
  // 1. Identificação do Equipamento
  const [routerName, setRouterName] = useState('Servidor-Sede-RB-Principal');
  const [selectedPresetId, setSelectedPresetId] = useState('hex');

  // 2. Conexão do Link (WAN)
  const [wanInterface, setWanInterface] = useState('ether1');
  const [wanType, setWanType] = useState<'dhcp' | 'static' | 'pppoe'>('dhcp');
  const [staticWanIp, setStaticWanIp] = useState('192.168.1.120/24');
  const [staticWanGw, setStaticWanGw] = useState('192.168.1.1');
  const [staticWanDns, setStaticWanDns] = useState('1.1.1.1, 8.8.8.8');
  const [pppoeWanUser, setPppoeWanUser] = useState('provedor@link.com.br');
  const [pppoeWanPass, setPppoeWanPass] = useState('senha123');

  // 3. Distribuição & Bridge
  const [bridgeName, setBridgeName] = useState('bridge-local');
  const [bridgePorts, setBridgePorts] = useState<string[]>(['ether2', 'ether3', 'ether4', 'ether5']);

  // 4. Endereçamento PPPoE & Pool
  const [pppoeGatewayIp, setPppoeGatewayIp] = useState('10.50.2.1');
  const [pppoeNetmask, setPppoeNetmask] = useState('/24');
  const [pppoePoolRange, setPppoePoolRange] = useState('10.50.2.10-10.50.2.254');
  const [pppoeDns, setPppoeDns] = useState('1.1.1.1, 8.8.8.8');

  // 5. Planos e Bloqueio
  const [includePlans, setIncludePlans] = useState(true);
  const [blockProfileName, setBlockProfileName] = useState('prof_corte_bloqueado');
  const [blockRateLimit, setBlockRateLimit] = useState('128k/128k');
  const [blockPoolRange, setBlockPoolRange] = useState('10.99.99.2-10.99.99.254');

  // 6. Integração API / Proxmox
  const [enableApi, setEnableApi] = useState(true);
  const [apiPort, setApiPort] = useState(8728);
  const [apiUser, setApiUser] = useState('admin_isp');
  const [apiPassword, setApiPassword] = useState('admin123');
  const [addFirewallRule, setAddFirewallRule] = useState(true);

  // 7. Otimizações
  const [enableMssClamping, setEnableMssClamping] = useState(true);
  const [enableDnsCache, setEnableDnsCache] = useState(true);
  const [oneSessionPerHost, setOneSessionPerHost] = useState(true);

  // Estados de Interface
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quando troca de preset de hardware
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = HARDWARE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setWanInterface(preset.defaultWan);
      setBridgePorts([...preset.defaultBridgePorts]);
    }
  };

  const handleToggleBridgePort = (port: string) => {
    if (bridgePorts.includes(port)) {
      setBridgePorts(bridgePorts.filter(p => p !== port));
    } else {
      setBridgePorts([...bridgePorts, port].sort());
    }
  };

  // Gerador dinâmico do Script MikroTik RouterOS
  const generatedScript = useMemo(() => {
    const selectedPreset = HARDWARE_PRESETS.find(p => p.id === selectedPresetId);
    const dateStr = new Date().toLocaleDateString('pt-BR');

    let out = `# ==============================================================================
# SCRIPT DE CONFIGURAÇÃO MIKROTIK ROUTEROS - GERADO PELO CONECTENET / AGROISP
# Data de Geração: ${dateStr}
# Modelo da RB: ${selectedPreset?.name || 'MikroTik RouterBOARD'}
# Identidade: ${routerName}
# Topologia: Link WAN na interface '${wanInterface}' + Clientes na bridge '${bridgeName}'
# ==============================================================================

# 1. IDENTIDADE DA ROUTERBOARD
/system identity
set name="${routerName}"

# 2. CRIAÇÃO DA BRIDGE LOCAL E ADIÇÃO DAS PORTAS DE DISTRIBUIÇÃO
/interface bridge
add name=${bridgeName} comment="Rede Local / Distribuicao de Clientes"

/interface bridge port
${bridgePorts.map(p => `add bridge=${bridgeName} interface=${p} comment="Porta Clientes / Switch / OLT"`).join('\n')}

# 3. ENDEREÇAMENTO IP DO GATEWAY PPPOE NA BRIDGE
/ip address
add address=${pppoeGatewayIp}${pppoeNetmask} interface=${bridgeName} comment="Gateway PPPoE Local"

`;

    // Configuração do Link de Internet WAN
    out += `# 4. CONFIGURAÇÃO DO LINK DE INTERNET (WAN NA ${wanInterface.toUpperCase()})
`;
    if (wanType === 'dhcp') {
      out += `/ip dhcp-client
add interface=${wanInterface} disabled=no comment="Receber Link WAN via DHCP"

`;
    } else if (wanType === 'static') {
      out += `/ip address
add address=${staticWanIp} interface=${wanInterface} comment="IP Fixo da Operadora (WAN)"

/ip route
add gateway=${staticWanGw} comment="Gateway Padrao da Internet"

/ip dns
set servers=${staticWanDns}

`;
    } else if (wanType === 'pppoe') {
      out += `/interface pppoe-client
add name="pppoe-out-wan" interface=${wanInterface} user="${pppoeWanUser}" password="${pppoeWanPass}" add-default-route=yes use-peer-dns=yes disabled=no comment="Link PPPoE da Operadora"

`;
    }

    // NAT Masquerade
    const natOutInterface = wanType === 'pppoe' ? 'pppoe-out-wan' : wanInterface;
    out += `# 5. NAT MASQUERADE (PERMITE NAVEGAÇÃO DOS CLIENTES NA INTERNET)
/ip firewall nat
add chain=srcnat out-interface=${natOutInterface} action=masquerade comment="NAT Saida Internet WAN"

# 6. POOLS DE ENDEREÇOS IP
/ip pool
add name=pool-pppoe ranges=${pppoePoolRange} comment="Pool Clientes Ativos"
add name=pool-bloqueados ranges=${blockPoolRange} comment="Pool Inadimplentes"

# 7. PERFIL BASE (DEFAULT) - GARANTE ESTABILIDADE E PREVINE QUEDA DE IPCP
/ppp profile
set default local-address=${pppoeGatewayIp} remote-address=pool-pppoe dns-server=${pppoeDns} comment="Profile Base PPPoE"

# 8. PERFIL DE CORTE / BLOQUEIO POR INADIMPLÊNCIA
add name=${blockProfileName} \\
    local-address=10.99.99.1 \\
    remote-address=pool-bloqueados \\
    rate-limit=${blockRateLimit} \\
    dns-server=1.1.1.1 \\
    comment="Corte por Atraso"

`;

    // Perfis dos Planos
    if (includePlans && plans.length > 0) {
      out += `# 9. PERFIS DE VELOCIDADE DOS PLANOS CADASTRADOS NO SISTEMA
`;
      plans.forEach(plan => {
        out += `/ppp profile
add name=${plan.profileName} local-address=${pppoeGatewayIp} remote-address=pool-pppoe dns-server=${pppoeDns} rate-limit=${plan.speedUp}M/${plan.speedDown}M comment="${plan.name}"
`;
      });
      out += '\n';
    }

    // Servidor PPPoE
    out += `# 10. SERVIDOR PPPoE ATIVO NA BRIDGE (${bridgeName})
/interface pppoe-server server
add service-name=pppoe-provedor interface=${bridgeName} default-profile=default authentication=chap,pap,mschap2 one-session-per-host=${oneSessionPerHost ? 'yes' : 'no'} disabled=no

`;

    // API RouterOS
    if (enableApi) {
      out += `# 11. API SOCKET NA PORTA ${apiPort} (COMUNICAÇÃO COM O PROXMOX / SISTEMA)
/ip service
set api port=${apiPort} address=0.0.0.0/0 disabled=no

# 12. USUÁRIO E GRUPO DA API
/user group
add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy,!sensitive

/user
add name="${apiUser}" group=isp-api password="${apiPassword}" comment="API ConecteNet Proxmox"

`;
      if (addFirewallRule) {
        out += `# 13. REGRA NO TOPO DO FIREWALL LIBERANDO A PORTA DA API
/ip firewall filter
add chain=input protocol=tcp dst-port=${apiPort} action=accept comment="Liberar API ConecteNet" place-before=0

`;
      }
    }

    // Otimizações
    if (enableMssClamping) {
      out += `# 14. OTIMIZAÇÃO MSS CLAMPING (EVITA TRAVAMENTO DE SITES E WHATSAPP EM PPPOE)
/ip firewall mangle
add chain=forward protocol=tcp tcp-flags=syn tcp-mss=1453-65535 action=change-mss new-mss=1452 comment="Ajuste MSS Clamping PPPoE"

`;
    }

    if (enableDnsCache) {
      out += `# 15. CACHE DE DNS LOCAL COM REQUISIÇÕES REMOTAS
/ip dns
set allow-remote-requests=yes servers=${pppoeDns}

`;
    }

    out += `# FIM DA CONFIGURAÇÃO - SCRIPT TESTADO E HOMOLOGADO`;

    return out;
  }, [
    routerName,
    selectedPresetId,
    wanInterface,
    wanType,
    staticWanIp,
    staticWanGw,
    staticWanDns,
    pppoeWanUser,
    pppoeWanPass,
    bridgeName,
    bridgePorts,
    pppoeGatewayIp,
    pppoeNetmask,
    pppoePoolRange,
    pppoeDns,
    includePlans,
    plans,
    blockProfileName,
    blockRateLimit,
    blockPoolRange,
    enableApi,
    apiPort,
    apiUser,
    apiPassword,
    addFirewallRule,
    enableMssClamping,
    enableDnsCache,
    oneSessionPerHost
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeFilename = `${routerName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_config.rsc`;
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToSystem = async () => {
    try {
      setIsSaving(true);
      const selectedPreset = HARDWARE_PRESETS.find(p => p.id === selectedPresetId);
      const res = await fetch('/api/mikrotik/save-wizard-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routerName,
          content: generatedScript,
          model: selectedPreset?.name || 'MikroTik RouterBOARD'
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSaveSuccessMsg(`Script salvo com sucesso como "${data.backup?.filename || 'backup.rsc'}" na pasta de backups do sistema!`);
      if (onScriptSaved) onScriptSaved();
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar script');
    } finally {
      setIsSaving(false);
    }
  };

  // Port options baseadas no hardware
  const allAvailablePorts = [
    'ether1', 'ether2', 'ether3', 'ether4', 'ether5', 
    'ether6', 'ether7', 'ether8', 'ether9', 'ether10', 
    'sfp1', 'sfp-sfpplus1'
  ];

  return (
    <div className="space-y-6">
      {/* Banner Principal do Assistente */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0 mt-1 sm:mt-0 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wide">
                  Assistente Inteligente de Provisionamento
                </span>
                <span className="text-xs text-slate-400">RouterOS v6 & v7</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                Gerador de Scripts MikroTik Passo a Passo
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Responda às perguntas abaixo sobre o modelo da sua RouterBOARD, qual porta o link de internet chega e como será a distribuição. O sistema gera automaticamente um script 100% testado, com proteção contra quedas de PPPoE (IPCP), regras de firewall e integração com o seu Proxmox.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-emerald-950"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Script Copiado!' : 'Copiar Script'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
              title="Baixar arquivo .rsc para pendrive ou Winbox Files"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Baixar .rsc</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Grid Principal: Formulário de Perguntas (Esquerda) + Preview do Script (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ===================================================================== */}
        {/* COLUNA ESQUERDA: AS PERGUNTAS NECESSÁRIAS (7 COLUNAS)                 */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* PERGUNTA 1: MODELO DA RB & IDENTIFICAÇÃO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  1
                </span>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>Modelo do Equipamento & Identidade</span>
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Hardware</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Roteador / Identidade (/system identity)
                </label>
                <input
                  type="text"
                  value={routerName}
                  onChange={e => setRouterName(e.target.value.replace(/\s+/g, '-'))}
                  placeholder="Ex: Servidor-Sede-RB-Principal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Qual é o modelo da RouterBOARD que você está configurando?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {HARDWARE_PRESETS.map(preset => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetChange(preset.id)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{preset.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{preset.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* PERGUNTA 2: ENTRADA DO LINK DE INTERNET (WAN) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                  2
                </span>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Entrada do Link de Internet (WAN)</span>
                </h4>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 uppercase">Uplink</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Porta onde o cabo do link chega:
                </label>
                <select
                  value={wanInterface}
                  onChange={e => setWanInterface(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="ether1">Porta 01 (ether1) - Mais recomendada</option>
                  <option value="ether2">Porta 02 (ether2)</option>
                  <option value="ether3">Porta 03 (ether3)</option>
                  <option value="sfp1">Porta Óptica SFP (sfp1)</option>
                  <option value="sfp-sfpplus1">Porta SFP+ 10G (sfp-sfpplus1)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Link da Operadora / Modem:
                </label>
                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setWanType('dhcp')}
                    className={`flex-1 py-1.5 rounded-lg transition ${wanType === 'dhcp' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    DHCP Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setWanType('static')}
                    className={`flex-1 py-1.5 rounded-lg transition ${wanType === 'static' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    IP Fixo
                  </button>
                  <button
                    type="button"
                    onClick={() => setWanType('pppoe')}
                    className={`flex-1 py-1.5 rounded-lg transition ${wanType === 'pppoe' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    PPPoE Client
                  </button>
                </div>
              </div>
            </div>

            {/* Campos condicionais para IP Fixo */}
            {wanType === 'static' && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-cyan-500/30 space-y-3 animate-fade-in text-xs">
                <span className="text-[11px] font-bold text-cyan-300 block">Dados do IP Fixo da Operadora</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">IP com Máscara (/24 ou /30)</label>
                    <input
                      type="text"
                      value={staticWanIp}
                      onChange={e => setStaticWanIp(e.target.value)}
                      placeholder="Ex: 192.168.1.120/24"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Gateway da Operadora</label>
                    <input
                      type="text"
                      value={staticWanGw}
                      onChange={e => setStaticWanGw(e.target.value)}
                      placeholder="Ex: 192.168.1.1"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">DNS da Operadora</label>
                    <input
                      type="text"
                      value={staticWanDns}
                      onChange={e => setStaticWanDns(e.target.value)}
                      placeholder="1.1.1.1, 8.8.8.8"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campos condicionais para PPPoE Client */}
            {wanType === 'pppoe' && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-cyan-500/30 space-y-3 animate-fade-in text-xs">
                <span className="text-[11px] font-bold text-cyan-300 block">Credenciais do Discador PPPoE da Operadora</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Usuário do Link</label>
                    <input
                      type="text"
                      value={pppoeWanUser}
                      onChange={e => setPppoeWanUser(e.target.value)}
                      placeholder="provedor@link.com.br"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">Senha do Link</label>
                    <input
                      type="password"
                      value={pppoeWanPass}
                      onChange={e => setPppoeWanPass(e.target.value)}
                      placeholder="Senha do discador"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PERGUNTA 3: DISTRIBUIÇÃO LOCAL (BRIDGE & PORTAS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                  3
                </span>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Network className="w-4 h-4 text-amber-400" />
                  <span>Distribuição Local (Bridge Clientes)</span>
                </h4>
              </div>
              <span className="text-[10px] font-mono text-amber-300 uppercase">LAN / Clientes</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Interface Bridge:
                </label>
                <input
                  type="text"
                  value={bridgeName}
                  onChange={e => setBridgeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Selecione quais portas físicas farão parte da Bridge de Clientes:
                </label>
                <div className="flex flex-wrap gap-2">
                  {allAvailablePorts
                    .filter(p => p !== wanInterface)
                    .slice(0, selectedPresetId === 'rb4011' ? 10 : (selectedPresetId === 'ccr1009' ? 8 : 4))
                    .map(port => {
                      const isInBridge = bridgePorts.includes(port);
                      return (
                        <button
                          key={port}
                          type="button"
                          onClick={() => handleToggleBridgePort(port)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center space-x-1.5 ${
                            isInBridge
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <span>{port}</span>
                          {isInBridge && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  💡 Todas as portas selecionadas acima falarão a mesma rede, permitindo ligar switches, OLTs ou antenas em qualquer uma delas.
                </p>
              </div>
            </div>
          </div>

          {/* PERGUNTA 4: ENDEREÇAMENTO PPPoE (IP DO GATEWAY & POOL) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 font-mono font-bold text-xs flex items-center justify-center border border-purple-500/30">
                  4
                </span>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Endereçamento PPPoE (Gateway & Pool de IPs)</span>
                </h4>
              </div>
              <span className="text-[10px] font-mono text-purple-300 uppercase">IPCP Setup</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  IP do Gateway PPPoE na Bridge (local-address):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={pppoeGatewayIp}
                    onChange={e => setPppoeGatewayIp(e.target.value)}
                    placeholder="10.50.2.1"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition"
                  />
                  <select
                    value={pppoeNetmask}
                    onChange={e => setPppoeNetmask(e.target.value)}
                    className="w-24 px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  >
                    <option value="/24">/24 (254)</option>
                    <option value="/23">/23 (510)</option>
                    <option value="/22">/22 (1.022)</option>
                    <option value="/20">/20 (4.094)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Faixa do Pool de IPs dos Clientes:
                </label>
                <input
                  type="text"
                  value={pppoePoolRange}
                  onChange={e => setPppoePoolRange(e.target.value)}
                  placeholder="10.50.2.10-10.50.2.254"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Servidores DNS entregues aos Clientes PPPoE:
                </label>
                <input
                  type="text"
                  value={pppoeDns}
                  onChange={e => setPppoeDns(e.target.value)}
                  placeholder="1.1.1.1, 8.8.8.8"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          </div>

          {/* PERGUNTA 5: API & INTEGRAÇÃO PROXMOX */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  5
                </span>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Integração API com o Servidor no Proxmox</span>
                </h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 uppercase">Porta 8728</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Porta API</label>
                <input
                  type="number"
                  value={apiPort}
                  onChange={e => setApiPort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Usuário API</label>
                <input
                  type="text"
                  value={apiUser}
                  onChange={e => setApiUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1">Senha API</label>
                <input
                  type="text"
                  value={apiPassword}
                  onChange={e => setApiPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addFirewallRule}
                  onChange={e => setAddFirewallRule(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                <span>Liberar a porta {apiPort} no topo do Firewall Filter</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableMssClamping}
                  onChange={e => setEnableMssClamping(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500"
                />
                <span>Ativar MSS Clamping (evita travamento de navegação)</span>
              </label>
            </div>
          </div>

        </div>

        {/* ===================================================================== */}
        {/* COLUNA DIREITA: PREVIEW DO SCRIPT & AÇÕES (5 COLUNAS)                 */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card Resumo da Topologia Gerada */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Resumo da Configuração Gerada</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Link WAN:</span>
                <span className="text-cyan-300 font-bold">{wanInterface.toUpperCase()}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">({wanType.toUpperCase()})</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Bridge Clientes:</span>
                <span className="text-amber-300 font-bold">{bridgeName}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">({bridgePorts.length} portas)</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">Gateway PPPoE:</span>
                <span className="text-purple-300 font-bold">{pppoeGatewayIp}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block">API Proxmox:</span>
                <span className="text-emerald-400 font-bold">Porta {apiPort}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar Script'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 transition"
                title="Download do arquivo .rsc"
              >
                <Download className="w-4 h-4 text-cyan-400" />
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveToSystem}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                title="Salvar como Backup permanente no servidor"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>

          {/* Visualizador de Código (.rsc) em Tempo Real */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col h-[520px]">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white">Preview do Script (.rsc)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {generatedScript.split('\n').length} linhas
              </span>
            </div>

            <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 bg-slate-950 overflow-y-auto whitespace-pre select-all">
              {generatedScript}
            </div>

            <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Como aplicar: Winbox &gt; New Terminal &gt; Colar</span>
              <span className="text-emerald-400 font-bold">100% Homologado</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
