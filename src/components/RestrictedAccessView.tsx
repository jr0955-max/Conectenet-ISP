import React from 'react';
import { ShieldAlert, ArrowRight, UserCheck, Lock } from 'lucide-react';
import { User, UserRole } from '../types/index.js';

interface RestrictedAccessViewProps {
  requiredRoles: UserRole[];
  currentRole?: UserRole;
  moduleName: string;
  onSwitchToAdmin: () => void;
  onOpenLogin: () => void;
}

export const RestrictedAccessView: React.FC<RestrictedAccessViewProps> = ({
  requiredRoles,
  currentRole,
  moduleName,
  onSwitchToAdmin,
  onOpenLogin
}) => {
  return (
    <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-5 shadow-2xl">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
        <Lock className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white tracking-wide">
          Acesso Restrito: {moduleName}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Esta área exige perfil com permissão de{' '}
          <strong className="text-emerald-400 uppercase">
            {requiredRoles.join(' ou ')}
          </strong>.
          <br />
          Seu perfil atual de operador é{' '}
          <strong className="text-amber-400 uppercase font-mono">
            [{currentRole || 'Visitante'}]
          </strong>.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-left space-y-1.5 font-mono">
        <div className="flex justify-between">
          <span>Módulo Solicitado:</span>
          <span className="text-white font-bold">{moduleName}</span>
        </div>
        <div className="flex justify-between">
          <span>Permissões Aceitas:</span>
          <span className="text-emerald-400 font-bold">{requiredRoles.join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span>Seu Perfil Atual:</span>
          <span className="text-amber-400 font-bold">{currentRole}</span>
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onSwitchToAdmin}
          className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-950 flex items-center justify-center space-x-1.5"
        >
          <UserCheck className="w-4 h-4" />
          <span>Alternar para Administrador (Demo)</span>
        </button>

        <button
          onClick={onOpenLogin}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
        >
          Entrar com Outra Conta
        </button>
      </div>
    </div>
  );
};
