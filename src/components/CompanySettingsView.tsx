import React, { useState } from 'react';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  CheckCircle2, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Landmark, 
  Sparkles, 
  Save, 
  Eye, 
  RefreshCw,
  QrCode,
  ShieldCheck,
  Zap,
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { CompanySettings, MikrotikConfig } from '../types/index.js';
import { SystemBackupCard } from './SystemBackupCard.js';
import { ThemeToggle } from './ThemeToggle.js';


interface CompanySettingsViewProps {
  settings: CompanySettings;
  mikrotikConfig?: MikrotikConfig | null;
  onSave: (updated: CompanySettings) => Promise<void>;
  onOpenBoletoPreview?: () => void;
  onRefreshData?: () => void;
}

// Preset logos for quick 1-click preview
const PRESET_LOGOS = [
  {
    name: 'Conecta Fibra',
    slogan: 'Ultra Velocidade & Conexão Estável',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%230f172a"/><circle cx="35" cy="30" r="18" fill="%230284c7"/><path d="M25 35 Q35 15 45 35" stroke="white" stroke-width="3" fill="none"/><circle cx="35" cy="22" r="3" fill="%2338bdf8"/><text x="65" y="32" font-family="sans-serif" font-weight="bold" font-size="18" fill="white">CONECTA</text><text x="65" y="47" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2338bdf8">FIBRA TELECOM</text></svg>'
  },
  {
    name: 'Turbo Net ISP',
    slogan: 'Internet Fibra Óptica 100% Pura',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%230f172a"/><polygon points="25,42 35,18 42,30 50,16 40,42" fill="%23f59e0b"/><text x="65" y="32" font-family="sans-serif" font-weight="bold" font-size="18" fill="white">TURBO NET</text><text x="65" y="47" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23f59e0b">ULTRA BANDA LARGA</text></svg>'
  },
  {
    name: 'Alfa Telecom',
    slogan: 'Conectando Você ao Futuro',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%230f172a"/><circle cx="35" cy="30" r="18" fill="%2310b981"/><path d="M28 38 L35 20 L42 38 M30 33 L40 33" stroke="white" stroke-width="3" fill="none"/><text x="65" y="32" font-family="sans-serif" font-weight="bold" font-size="18" fill="white">ALFA</text><text x="65" y="47" font-family="sans-serif" font-weight="bold" font-size="12" fill="%2310b981">TELECOMUNICAÇÕES</text></svg>'
  },
  {
    name: 'Infinity Fibra',
    slogan: 'A Melhor Experiência de Navegação',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%230f172a"/><path d="M24 30 C24 24 30 24 35 30 C40 36 46 36 46 30 C46 24 40 24 35 30 C30 36 24 36 24 30 Z" stroke="%238b5cf6" stroke-width="3.5" fill="none"/><text x="65" y="32" font-family="sans-serif" font-weight="bold" font-size="17" fill="white">INFINITY</text><text x="65" y="47" font-family="sans-serif" font-weight="bold" font-size="11" fill="%23a78bfa">FIBRA ÓPTICA</text></svg>'
  }
];

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  settings,
  mikrotikConfig,
  onSave,
  onOpenBoletoPreview,
  onRefreshData
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData(prev => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setFormData(prev => ({ ...prev, logoUrl: urlInput.trim() }));
    setUrlInput('');
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: '' }));
  };

  const handleSelectPreset = (preset: typeof PRESET_LOGOS[0]) => {
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      legalName: `${preset.name.toUpperCase()} SERVIÇOS DE TELECOMUNICAÇÕES LTDA`,
      slogan: preset.slogan,
      logoUrl: preset.svg
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Identidade Visual & Dados do Provedor
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  White-label & Boletos
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure o nome oficial, logomarca e dados cadastrais da sua empresa. Todas as alterações são sincronizadas imediatamente no menu e nos boletos bancários gerados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {onOpenBoletoPreview && (
              <button
                type="button"
                onClick={onOpenBoletoPreview}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Prévia do Boleto</span>
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Salvo com Sucesso!</span>
                </>
              ) : isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>Salvar Dados do Provedor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Cards (How it appears in Header, Sidebar and Boleto) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preview: Sidebar Brand */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300">Como aparece no Menu Lateral</span>
            <span className="text-[10px] text-amber-400 font-mono">Sidebar</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center space-x-3">
            {formData.logoUrl ? (
              <img 
                src={formData.logoUrl} 
                alt="Logo do Provedor" 
                className="h-9 max-w-[90px] object-contain rounded"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shadow">
                {formData.name.charAt(0) || 'P'}
              </div>
            )}
            <div className="truncate">
              <div className="text-sm font-bold text-white truncate">{formData.name || 'Nome do Provedor'}</div>
              <div className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase truncate">
                {formData.slogan || 'ISP & TELECOM'}
              </div>
            </div>
          </div>
        </div>

        {/* Preview: TopBar Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300">Como aparece no Topo</span>
            <span className="text-[10px] text-amber-400 font-mono">TopBar</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Logo" 
                  className="h-7 max-w-[60px] object-contain rounded"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {formData.name.charAt(0) || 'P'}
                </div>
              )}
              <span className="text-xs font-bold text-white truncate">{formData.name || 'Provedor Telecom'}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              MikroTik Online
            </span>
          </div>
        </div>

        {/* Preview: Header do Boleto Bancário */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-semibold text-slate-300">Como aparece no Boleto Bancário</span>
            <span className="text-[10px] text-emerald-400 font-mono">Boleto Impresso</span>
          </div>
          <div className="p-3 bg-white text-slate-900 rounded-lg border border-slate-300 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Logo" 
                  className="h-7 max-w-[70px] object-contain"
                />
              ) : (
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  {formData.name.charAt(0) || 'P'}
                </div>
              )}
              <div className="truncate">
                <span className="text-xs font-bold text-slate-900 block truncate">{formData.name}</span>
                <span className="text-[9px] text-slate-500 block font-mono">{formData.cnpj}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 block font-mono">{formData.bankCode}</span>
              <span className="text-[10px] font-bold text-emerald-700">R$ 89,90</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 0: Tema e Cores (Modo Dia e Noite) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Aparência do Sistema • Modo Dia & Modo Noite</h3>
              <p className="text-xs text-slate-400">
                Alterne entre fundo branco/claro de alto contraste ou tema escuro moderno. Salvo automaticamente no seu navegador.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <ThemeToggle variant="segmented" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Logomarca Oficial */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <ImageIcon className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">1. Logomarca do Provedor</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Visual Logo Canvas */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-3 relative group">
              {formData.logoUrl ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-slate-800 max-h-32 flex items-center justify-center">
                    <img 
                      src={formData.logoUrl} 
                      alt="Logomarca do Provedor" 
                      className="max-h-24 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Logo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Upload className="w-7 h-7 text-amber-400" />
                  </div>
                  <p className="text-xs font-medium text-slate-300">
                    Nenhuma logomarca personalizada
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Envie um arquivo PNG, JPG ou SVG com fundo transparente para melhor resultado no cabeçalho e nos boletos.
                  </p>
                </div>
              )}
            </div>

            {/* Upload Options & Direct URL */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fazer Upload de Imagem do seu Computador / Dispositivo
                </label>
                <label className="flex items-center justify-center w-full px-4 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/40 rounded-xl cursor-pointer transition text-xs font-semibold text-slate-200 space-x-2">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Selecionar Arquivo de Imagem (PNG, JPG, SVG, WebP)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ou informar URL direta da imagem da Logo
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://exemplo.com.br/minha-logomarca.png"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Aplicar URL
                  </button>
                </div>
              </div>

              {/* Fast Presets */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Escolha rápida de logomarcas profissionais prontas (1 clique):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_LOGOS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition flex flex-col items-center text-center space-y-1.5"
                    >
                      <img src={preset.svg} alt={preset.name} className="h-6 object-contain" />
                      <span className="text-[10px] font-semibold text-slate-300 truncate w-full">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Dados Cadastrais do Provedor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">2. Nome e Dados Oficiais do Provedor</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Fantasia do Provedor *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Minha Net Telecom"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-semibold"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Nome exibido em todo o sistema e no topo do boleto</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Razão Social da Empresa *
              </label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="Ex: Minha Net Provedor de Internet Ltda"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Nome jurídico como Beneficiário no boleto</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CNPJ / CPF do Provedor *
              </label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="Ex: 28.491.029/0001-83"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Impresso no campo Beneficiário do boleto</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Slogan / Subtítulo
              </label>
              <input
                type="text"
                value={formData.slogan || ''}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                placeholder="Ex: Ultra Fibra Óptica & Conectividade"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telefone / WhatsApp de Suporte
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: (61) 98765-4321"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                E-mail de Contato
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: contato@minhanet.com.br"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Endereço do Provedor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">3. Endereço da Sede do Provedor</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Logradouro / Rua / Avenida
              </label>
              <input
                type="text"
                value={formData.address?.street || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, street: e.target.value } 
                })}
                placeholder="Ex: Av. Brasil"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Número
              </label>
              <input
                type="text"
                value={formData.address?.number || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, number: e.target.value } 
                })}
                placeholder="Ex: 500"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={formData.address?.neighborhood || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, neighborhood: e.target.value } 
                })}
                placeholder="Ex: Centro"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cidade
              </label>
              <input
                type="text"
                value={formData.address?.city || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, city: e.target.value } 
                })}
                placeholder="Ex: Brasília"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                value={formData.address?.state || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, state: e.target.value.toUpperCase() } 
                })}
                placeholder="Ex: DF"
                maxLength={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CEP
              </label>
              <input
                type="text"
                value={formData.address?.cep || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  address: { ...formData.address, cep: e.target.value } 
                })}
                placeholder="Ex: 70000-000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Configurações do Boleto Bancário */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Landmark className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">4. Dados Bancários & Emissão de Boletos</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Banco Emissor do Boleto
              </label>
              <select
                value={formData.bankName}
                onChange={(e) => {
                  const bName = e.target.value;
                  let bCode = '001-9';
                  if (bName.includes('Bradesco')) bCode = '237-2';
                  else if (bName.includes('Itaú')) bCode = '341-7';
                  else if (bName.includes('Santander')) bCode = '033-7';
                  else if (bName.includes('Sicoob')) bCode = '756-0';
                  else if (bName.includes('Sicredi')) bCode = '748-X';
                  else if (bName.includes('Asaas')) bCode = '461-8';
                  else if (bName.includes('Inter')) bCode = '077-9';
                  setFormData({ ...formData, bankName: bName, bankCode: bCode });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Banco do Brasil S.A.">001-9 • Banco do Brasil</option>
                <option value="Banco Bradesco S.A.">237-2 • Banco Bradesco</option>
                <option value="Itaú Unibanco S.A.">341-7 • Itaú Unibanco</option>
                <option value="Banco Santander (Brasil) S.A.">033-7 • Banco Santander</option>
                <option value="Bancoob / Sicoob">756-0 • Bancoob / Sicoob</option>
                <option value="Sicredi">748-X • Sicredi</option>
                <option value="Asaas Gestão Financeira">461-8 • Asaas IP S.A.</option>
                <option value="Banco Inter S.A.">077-9 • Banco Inter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Código do Banco
              </label>
              <input
                type="text"
                value={formData.bankCode}
                onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Agência / Código Beneficiário
              </label>
              <input
                type="text"
                value={formData.agency}
                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                placeholder="Ex: 1234-5"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Carteira
              </label>
              <input
                type="text"
                value={formData.carteira}
                onChange={(e) => setFormData({ ...formData, carteira: e.target.value })}
                placeholder="Ex: 17 ou 09"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instruções / Mensagem impressa no Boleto Bancário
              </label>
              <textarea
                rows={2}
                value={formData.boletoInstructions}
                onChange={(e) => setFormData({ ...formData, boletoInstructions: e.target.value })}
                placeholder="Ex: Sr. Caixa: Não receber após 30 dias de atraso. Cobrar multa de 2% e juros de 1% a.m."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              Dados do Provedor e Logomarca salvos com sucesso!
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center space-x-2 shadow-lg shadow-amber-500/25 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Atualizando Sistema...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-950" />
                <span>Salvar e Atualizar em Todo o Sistema</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Exportação & Backup do Sistema (JSON & Google Drive) */}
      <SystemBackupCard
        companySettings={formData}
        mikrotikConfig={mikrotikConfig}
        onRefreshData={onRefreshData}
      />
    </div>
  );
};
