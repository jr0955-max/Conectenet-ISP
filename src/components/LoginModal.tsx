import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  Key, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Eye, 
  EyeOff,
  Crown
} from 'lucide-react';
import { User, UserRole, CompanySettings } from '../types/index.js';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: User, rememberMe?: boolean) => void;
  isEnforced?: boolean;
  companySettings?: CompanySettings;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isEnforced = false,
  companySettings
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Fields (Credenciais do Administrador Master)
  const [email, setEmail] = useState('jr0955@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('administrador');

  // Recovery Form
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Falha ao autenticar.');

      onLoginSuccess(data.token, data.user, rememberMe);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Falha ao cadastrar.');

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro no cadastro de operador.');
    } finally {
      setLoading(false);
    }
  };

  // Request password reset code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);

      setSuccessMessage(data.message);
      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
        setRecoveryCode(data.simulatedCode);
      }
      setResetStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao solicitar código.');
    } finally {
      setLoading(false);
    }
  };

  // Submit new password with reset code
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: recoveryCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);

      setSuccessMessage('Senha atualizada com sucesso! Entre com sua nova senha.');
      setTab('login');
      setPassword(newPassword);
      setResetStep(1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${isEnforced ? 'bg-slate-950' : 'bg-slate-950/85 backdrop-blur-md'} flex items-center justify-center p-4 overflow-y-auto`}>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-6 relative my-auto">
        {/* Close Button only if not enforced */}
        {!isEnforced && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          {companySettings?.logoUrl ? (
            <div className="flex items-center justify-center py-1">
              <img 
                src={companySettings.logoUrl} 
                alt={companySettings.name} 
                className="max-h-14 max-w-[220px] object-contain drop-shadow" 
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 mx-auto shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-white tracking-tight">
            {companySettings?.name || 'Sistema de Gestão ISP'}
          </h2>
          <p className="text-xs text-slate-400">
            {companySettings?.slogan || 'Autenticação Segura & Gestão de Acessos com JWT'}
          </p>

          {isEnforced && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-amber-400 font-medium">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Acesso Restrito: Identifique-se para entrar</span>
            </div>
          )}
        </div>

        {/* Tabs Switcher */}
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => { setTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
              tab === 'login' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
              tab === 'register' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cadastrar
          </button>
          <button
            onClick={() => { setTab('forgot'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
              tab === 'forgot' 
                ? 'bg-emerald-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recuperar
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === 'login' && (
          <div className="space-y-4">
            {/* Banner de Credenciais Master do Administrador */}
            <div className="p-3 bg-slate-950/90 border border-emerald-500/30 rounded-2xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Administrador Master (Acesso Total)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Todos os Privilégios
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                <div 
                  onClick={() => { setEmail('jr0955@gmail.com'); setPassword('admin123'); }}
                  className="bg-slate-900/90 hover:bg-slate-800/90 p-2 rounded-xl border border-slate-800 cursor-pointer transition"
                  title="Clique para preencher"
                >
                  <span className="text-slate-400 block text-[10px]">Usuário:</span>
                  <span className="text-white font-mono font-bold truncate block">jr0955@gmail.com</span>
                </div>
                <div 
                  onClick={() => { setEmail('jr0955@gmail.com'); setPassword('admin123'); }}
                  className="bg-slate-900/90 hover:bg-slate-800/90 p-2 rounded-xl border border-slate-800 cursor-pointer transition"
                  title="Clique para preencher"
                >
                  <span className="text-slate-400 block text-[10px]">Senha:</span>
                  <span className="text-emerald-300 font-mono font-bold">admin123</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Usuário ou E-mail do Operador</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jr0955@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Senha</label>
                  <button
                    type="button"
                    onClick={() => setTab('forgot')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Manter Conectado */}
              <div className="pt-0.5 pb-1">
                <label className="flex items-center space-x-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-[11px]">Manter conectado neste computador</span>
                </label>
                <p className="text-[10px] text-slate-500 pl-6">
                  Se desmarcado, ao fechar a aba/navegador sua sessão é encerrada por segurança.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50 mt-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Autenticando JWT...' : 'Acessar Sistema'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nome Completo</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do operador"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">E-mail Profissional</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operador@agroisp.com.br"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Perfil de Acesso (Role RBAC)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="tecnico">Técnico (Redes, PPPoE, MikroTik)</option>
                <option value="financeiro">Financeiro (Faturas, Pix, Cobrança)</option>
                <option value="administrador">Administrador (Controle Total)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 5 caracteres"
                  className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50 mt-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{loading ? 'Cadastrando...' : 'Cadastrar Operador'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {tab === 'forgot' && (
          <div className="space-y-4 text-xs">
            {resetStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-3.5">
                <p className="text-slate-400">
                  Informe o e-mail do operador para receber o código de 6 dígitos de redefinição de senha:
                </p>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail Cadastrado</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operador@agroisp.com.br"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>{loading ? 'Gerando Código...' : 'Solicitar Código de Redefinição'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-3.5">
                {simulatedCode && (
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs">
                    Código de teste gerado: <strong className="font-mono text-white text-sm">{simulatedCode}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Código de 6 dígitos</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 5 caracteres"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{loading ? 'Salvando...' : 'Redefinir e Salvar Senha'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
