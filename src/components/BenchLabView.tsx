import React, { useState } from 'react';
import { 
  FlaskConical, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Copy, 
  Check, 
  UploadCloud, 
  RotateCcw, 
  ArrowRight, 
  Cpu, 
  Wifi, 
  Activity, 
  FileText, 
  HelpCircle,
  Zap,
  Cable
} from 'lucide-react';
import { MikrotikConfig, Client } from '../types/index.js';

interface BenchLabViewProps {
  config: MikrotikConfig | null;
  clients: Client[];
  onImportBatch: (rawText: string) => Promise<any>;
  onResetBench: () => Promise<any>;
  onTestConnection: (testData: { host: string; port: number; user: string }) => Promise<any>;
  onRefresh: () => void;
}

export const BenchLabView: React.FC<BenchLabViewProps> = ({
  config,
  clients,
  onImportBatch,
  onResetBench,
  onTestConnection,
  onRefresh
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Bench connection test
  const [benchIp, setBenchIp] = useState(config?.host || '192.168.88.1');
  const [benchPort, setBenchPort] = useState(config?.port || 8728);
  const [benchUser, setBenchUser] = useState(config?.user || 'admin_isp');
  const [testStatus, setTestStatus] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Script especial para rodar no MikroTik de bancada zerado
  const benchSetupScript = `# ==============================================================================
# SCRIPT DE BANCADA / LABORATÓRIO AGROISP PRO
# Cole no Terminal do Winbox do seu MikroTik de testes
# ==============================================================================

# 1. Habilitar a API do RouterOS (Porta 8728)
/ip service enable api
/ip service set api port=8728 address=0.0.0.0/0

# 2. Criar usuário e senha para o AgroISP Billing
/user group add name=isp-api policy=read,write,test,api,!ftp,!reboot,!policy
/user add name=${benchUser} group=isp-api password="senha_bancada_123" comment="AgroISP Lab API"

# 3. Criar pool de teste e perfis PPPoE
/ip pool add name=pool-clientes ranges=10.50.1.2-10.50.1.254
/ip pool add name=pool-bloqueados ranges=10.99.99.2-10.99.99.254

# Perfil Normal (Internet liberada)
/ppp profile add name=default local-address=10.50.1.1 remote-address=pool-clientes rate-limit=30M/30M dns-server=8.8.8.8

# Perfil de Bloqueio (Inadimplentes com velocidade restrita / aviso)
/ppp profile add name=bloqueados local-address=10.99.99.1 remote-address=pool-bloqueados rate-limit=128k/128k comment="Corte AgroISP"

# 4. Habilitar Servidor PPPoE na interface de testes (ex: ether2)
/interface pppoe-server server add service-name=pppoe-bancada interface=ether2 default-profile=default disabled=no
`;

  const copyScript = () => {
    navigator.clipboard.writeText(benchSetupScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await onTestConnection({ host: benchIp, port: Number(benchPort), user: benchUser });
      setTestStatus(res);
    } catch (err: any) {
      setTestStatus({ success: false, message: err.message || 'Falha ao conectar no MikroTik de bancada.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await onImportBatch(importText);
      setImportResult(res);
      setImportText('');
      onRefresh();
    } catch (err: any) {
      setImportResult({ error: err.message || 'Erro ao importar clientes' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Deseja restaurar os clientes e faturas padrão da simulação de bancada?')) return;
    setIsResetting(true);
    try {
      await onResetBench();
      onRefresh();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner: Modo Bancada Ativo */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/50 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-950">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Laboratório & Bancada de Testes MikroTik
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Ambiente Seguro Ativo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Você pode testar todas as funcionalidades do sistema agora mesmo com clientes simulados, faturas e baixa via Pix. Quando separar o MikroTik físico de bancada, basta seguir o roteiro abaixo antes de migrar os clientes reais.
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition shrink-0 border border-slate-700 disabled:opacity-50"
            title="Restaura a base de clientes e faturas fictícias de teste"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isResetting ? 'Restaurando...' : 'Restaurar Dados Lab'}</span>
          </button>
        </div>
      </div>

      {/* Roteiro Passo a Passo para o MikroTik que você vai separar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Cable className="w-5 h-5 text-cyan-400" />
            <span>Guia de 5 Minutos: Como Preparar seu MikroTik de Bancada</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Passo a passo simples para testar discagem PPPoE, bloqueio e corte sem encostar na rede de produção.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">PASSO 1</span>
              <Cpu className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="text-xs font-bold text-white">Separar o Roteador</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use qualquer modelo MikroTik sobressalente (hEX, hAP lite, RB750, RB3011, RB4011 ou CCR).
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">PASSO 2</span>
              <Cable className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="text-xs font-bold text-white">Conexão na Bancada</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ligue um cabo de rede da sua rede/PC na porta <strong>ether1</strong> ou <strong>ether2</strong> do MikroTik.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">PASSO 3</span>
              <Terminal className="w-4 h-4 text-slate-500" />
            </div>
            <h4 className="text-xs font-bold text-white">Rodar o Script Lab</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Abra o Winbox, clique em <strong>New Terminal</strong> e cole o script pronto abaixo.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">PASSO 4</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="text-xs font-bold text-white">Discagem & Teste Real</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Disque PPPoE pelo Windows ou roteador Wi-Fi de bancada e veja a conexão surgir em tempo real!
            </p>
          </div>
        </div>

        {/* Script Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                Script Rápido para Configurar o MikroTik de Bancada (Winbox Terminal)
              </span>
            </div>
            <button
              onClick={copyScript}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copiado!' : 'Copiar Script de Bancada'}</span>
            </button>
          </div>

          <div className="font-mono text-[11px] text-emerald-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 max-h-56 overflow-y-auto whitespace-pre select-all">
            {benchSetupScript}
          </div>
        </div>
      </div>

      {/* Teste de Conexão com o IP do MikroTik de Bancada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Server className="w-5 h-5 text-cyan-400" />
              <span>Conectar ao seu MikroTik de Bancada</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Informe o IP que você colocou no MikroTik de teste para conectar a API.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">IP do MikroTik de Bancada</label>
              <input
                type="text"
                value={benchIp}
                onChange={(e) => setBenchIp(e.target.value)}
                placeholder="192.168.88.1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Porta API</label>
              <input
                type="number"
                value={benchPort}
                onChange={(e) => setBenchPort(Number(e.target.value))}
                placeholder="8728"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-slate-300 font-medium mb-1">Usuário da API</label>
              <input
                type="text"
                value={benchUser}
                onChange={(e) => setBenchUser(e.target.value)}
                placeholder="admin_isp"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {testStatus && (
            <div className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
              testStatus.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}>
              {testStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{testStatus.message}</p>
                {testStatus.details && (
                  <p className="text-[10px] font-mono text-slate-300 mt-1">
                    {testStatus.details.model} • {testStatus.details.version}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Activity className="w-4 h-4" />
            <span>{isTesting ? 'Testando Conexão...' : 'Testar Conexão com MikroTik de Bancada'}</span>
          </button>
        </div>

        {/* Assistente de Migração em Lote (Importador de Clientes) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              <span>Importador de Clientes Reais (Quando for Migrar)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Depois dos testes de bancada, passe seus clientes colando o comando do MikroTik atual ou CSV.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <label className="block text-slate-300 font-medium">
              Cole o export do MikroTik (<code>/ppp secret export</code>) OU lista CSV:
            </label>
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Exemplo formato MikroTik:
add name="joao_rural" password="123" comment="Joao da Silva - Fazenda Sol"
add name="maria_agro" password="456" comment="Maria Santos - Km 8"

Ou formato CSV:
Nome, CPF, Telefone, Usuario PPPoE, Senha
Carlos Ferreira, 012.345.678-99, 61999998888, carlos_rural, 123456`}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500 placeholder-slate-600"
            />
          </div>

          {importResult && (
            <div className={`p-3 rounded-lg border text-xs ${
              importResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}>
              <p className="font-semibold">{importResult.message || importResult.error}</p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={isImporting || !importText.trim()}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md shadow-emerald-950"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isImporting ? 'Importando Clientes...' : 'Processar & Importar Clientes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
