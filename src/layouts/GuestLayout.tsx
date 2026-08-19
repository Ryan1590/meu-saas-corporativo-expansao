import React from 'react';
import { Shield, CheckCircle2, Lock, Sparkles, Key } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface GuestLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const GuestLayout: React.FC<GuestLayoutProps> = ({ children, title, subtitle }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-900 text-slate-100 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-900 to-slate-950" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Branding / Value Proposition Hero Column */}
        <div className="hidden lg:flex lg:col-span-6 flex-col text-left space-y-6 pr-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                CoreBase<span className="text-indigo-400">.io</span>
              </span>
              <span className="block text-xs text-indigo-200/80 font-medium">
                Enterprise SaaS Starter Kit
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Base corporativa pronta para escalar seus projetos.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Estrutura profissional com Laravel 11 Jetstream + Sanctum API, RBAC granular com controle de acesso por tela, trilha de auditoria e Design System completo em React & TypeScript.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Autenticação Jetstream com sessões seguras e tokens Sanctum</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Roles & Permissions modulares e validação no backend + frontend</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Código pronto com Migrations, Seeders, FormRequests e Policies</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Camada de proteção contra CSRF, XSS, Mass Assignment e Brute Force</span>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-md">
            <div className="mb-6 text-left">
              <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
              <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
