import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  variant?: 'button' | 'segmented' | 'icon-only';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'button',
  className = '' 
}) => {
  const { theme, toggleTheme, setTheme, isLight } = useTheme();

  if (variant === 'segmented') {
    return (
      <div 
        className={`flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 select-none ${className}`}
        role="group"
        aria-label="Alternar tema do sistema"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
            isLight
              ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Modo Dia (Fundo Branco / Claro)"
        >
          <Sun className="w-3.5 h-3.5 fill-current" />
          <span>Dia</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
            !isLight
              ? 'bg-slate-900 text-amber-400 border border-slate-700/50 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          title="Modo Noite (Fundo Escuro)"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Noite</span>
        </button>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition border ${
          isLight
            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-amber-600'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
        } ${className}`}
        title={isLight ? 'Alternar para Modo Noite (Escuro)' : 'Alternar para Modo Dia (Claro / Branco)'}
        aria-label={isLight ? 'Ativar Modo Noite' : 'Ativar Modo Dia'}
      >
        {isLight ? (
          <Sun className="w-4 h-4 fill-amber-500 text-amber-500 animate-spin-slow" />
        ) : (
          <Moon className="w-4 h-4 text-amber-400" />
        )}
      </button>
    );
  }

  // Default 'button' variant with icon + label + indicator
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm border ${
        isLight
          ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-800'
          : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200'
      } ${className}`}
      title={isLight ? 'Clique para Modo Noite (Escuro)' : 'Clique para Modo Dia (Claro / Branco)'}
      aria-label="Alternar entre Modo Dia e Noite"
    >
      {isLight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>Dia</span>
          <span className="text-[10px] font-normal px-1 rounded bg-amber-500/20 text-amber-900 ml-0.5">☀️</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-amber-400" />
          <span>Noite</span>
          <span className="text-[10px] font-normal px-1 rounded bg-slate-900 text-amber-300 ml-0.5">🌙</span>
        </>
      )}
    </button>
  );
};
