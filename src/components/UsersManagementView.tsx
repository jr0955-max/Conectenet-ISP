import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Key, 
  ShieldAlert, 
  Wrench, 
  DollarSign, 
  Crown,
  Clock,
  Mail,
  UserCheck
} from 'lucide-react';
import { User, UserRole } from '../types/index.js';

interface UsersManagementViewProps {
  currentUser: User | null;
  authToken: string | null;
  onRefresh: () => void;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  currentUser,
  authToken,
  onRefresh
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('tecnico');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [authToken]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            name,
            role,
            status,
            newPassword: password || undefined
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error);

        setFeedback({ message: `Operador ${name} atualizado com sucesso!`, type: 'success' });
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error);

        setFeedback({ message: `Novo operador ${name} criado com sucesso!`, type: 'success' });
      }

      setShowAddModal(false);
      setEditingUser(null);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Erro ao salvar operador', type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Deseja realmente remover o operador ${userName}?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);

      setFeedback({ message: `Operador removido com sucesso.`, type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Erro ao remover operador', type: 'error' });
    }
  };

  const getRoleBadge = (roleName: UserRole) => {
    switch (roleName) {
      case 'administrador':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Crown className="w-3 h-3 mr-1 text-purple-400" />
            Administrador
          </span>
        );
      case 'tecnico':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Wrench className="w-3 h-3 mr-1 text-cyan-400" />
            Técnico NOC
          </span>
        );
      case 'financeiro':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <DollarSign className="w-3 h-3 mr-1 text-emerald-400" />
            Financeiro
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Gestão de Usuários & Perfis de Acesso (RBAC)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle de permissões baseado em funções (Administrador, Técnico e Financeiro) com autenticação JWT.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setName('');
            setEmail('');
            setPassword('');
            setRole('tecnico');
            setStatus('active');
            setShowAddModal(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-emerald-950 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Operador</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/40 border-red-500/40 text-red-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* RBAC Permissions Matrix Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>Matriz de Permissões por Função</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Admin Role */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300 flex items-center">
                <Crown className="w-3.5 h-3.5 mr-1 text-purple-400" />
                Administrador
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-200 px-1.5 py-0.2 rounded font-mono">
                Total
              </span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li className="text-emerald-400">✓ Acesso Irrestrito a Todas as Áreas</li>
              <li className="text-emerald-400">✓ Comandos Winbox & MikroTik Terminal</li>
              <li className="text-emerald-400">✓ Emissão de Faturas & Baixa Pix</li>
              <li className="text-emerald-400">✓ Gerenciamento de Operadores & Senhas</li>
              <li className="text-emerald-400">✓ Configurações de Deploy Docker & Proxmox</li>
            </ul>
          </div>

          {/* Técnico Role */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center">
                <Wrench className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                Técnico NOC / Campo
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-200 px-1.5 py-0.2 rounded font-mono">
                Rede
              </span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li className="text-emerald-400">✓ Monitor /ppp active e Sinal Wireless</li>
              <li className="text-emerald-400">✓ Cadastrar Clientes & Secrets PPPoE</li>
              <li className="text-emerald-400">✓ Derrubar Sessões Ativas & Diagnóstico</li>
              <li className="text-emerald-400">✓ Gerenciar Torres e POPs Rurais</li>
              <li className="text-red-400">✗ Restrito de Ver Relatórios Financeiros</li>
            </ul>
          </div>

          {/* Financeiro Role */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center">
                <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Financeiro & Cobrança
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
                Faturamento
              </span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1">
              <li className="text-emerald-400">✓ Emissão de Faturas & Carnês</li>
              <li className="text-emerald-400">✓ Baixa Automática Pix e Webhooks</li>
              <li className="text-emerald-400">✓ Envio de Cobrança WhatsApp</li>
              <li className="text-emerald-400">✓ Bloqueio/Desbloqueio por Inadimplência</li>
              <li className="text-red-400">✗ Restrito de Comandos CLI MikroTik e Docker</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Operadores Cadastrados ({users.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Sessões gerenciadas via JWT
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Operador</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Perfil (Role)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Último Acesso</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        Você
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {u.email}
                  </td>
                  <td className="py-3.5 px-4">
                    {getRoleBadge(u.role)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'active' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setName(u.name);
                          setEmail(u.email);
                          setRole(u.role);
                          setStatus(u.status);
                          setPassword('');
                          setShowAddModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Editar operador ou alterar role"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 text-red-400 hover:text-red-300"
                          title="Remover operador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingUser ? `Editar Operador: ${editingUser.name}` : 'Cadastrar Novo Operador'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Perfil de Acesso (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="tecnico">Técnico NOC (Redes, PPPoE, MikroTik)</option>
                  <option value="financeiro">Financeiro (Faturas, Pix, Cobrança)</option>
                  <option value="administrador">Administrador (Controle Total)</option>
                </select>
              </div>

              {editingUser && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status da Conta</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo (Bloqueado de Acessar)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
