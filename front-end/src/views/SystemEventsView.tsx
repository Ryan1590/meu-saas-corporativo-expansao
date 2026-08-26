import React, { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Activity,
  History,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Avatar } from '../components/design-system/Badge';
import { Skeleton } from '../components/design-system/Tabs';
import { DashboardMetrics } from '../types';
import { useAuth } from '../context/AuthContext';
import { ForbiddenShield } from './ForbiddenView';

export const SystemEventsView: React.FC<{ onNavigate: (path: string) => void }> = ({
  onNavigate,
}) => {
  const { user, hasRole } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = hasRole('admin') || user?.roles?.includes('admin') || user?.roles?.includes('role-admin');

  useEffect(() => {
    async function loadMetrics() {
      if (!isAdmin) return;
      try {
        setIsLoading(true);
        const res = await fetch('/api/v1/dashboard/system-events');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setMetrics(json.data);
          }
        }
      } catch (err) {
        console.error('Error loading system events:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <ForbiddenShield
        requiredPermission="admin"
        onGoBack={() => onNavigate('/dashboard')}
      />
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-80 rounded-xl" />
          <Skeleton className="lg:col-span-4 h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Eventos do Sistema</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Métricas executivas de usuários, acessos e auditoria global (Exclusivo Administrador)
            </p>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Total de Usuários
              </p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {metrics.totalUsers}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            +{metrics.usersGrowthPercentage}% novos registros
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Usuários Ativos
              </p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {metrics.activeUsers}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {metrics.activePercentage}% do total ativo
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Usuários Inativos
              </p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {metrics.inactiveUsers}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {metrics.totalUsers - metrics.activeUsers} pendentes
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                Perfis RBAC
              </p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                {metrics.totalRoles}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Perfis de acesso configurados
          </p>
        </div>
      </div>

      {/* CHART & ACTIVITY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                Cadastros nos Últimos Dias
              </h3>
              <p className="text-xs text-slate-400">
                Evolução no número de contas criadas
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.registrationsOverTime}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT ACTIVITIES */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Atividades Recentes
            </h3>
          </div>

          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {metrics.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Nenhuma atividade registrada
              </p>
            ) : (
              metrics.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Avatar name={act.userName || 'Sistema'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {act.userName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {act.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
