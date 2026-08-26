import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Files,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  AlertCircle,
  BarChart2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Badge } from '../components/design-system/Badge';
import { Button } from '../components/design-system/Button';
import { Pagination } from '../components/design-system/Table';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface DashboardViewProps {
  onNavigate: (path: string) => void;
}

interface MetricaConfig {
  id: string;
  aba: 'estrutural' | 'documental';
  titulo: string;
  bgClass: string;
  keyVal: string;
  sufixo: string;
  isFormatDecimal?: boolean;
}

const METRICAS_CONFIG: MetricaConfig[] = [
  // --- ABA 1: INFRAESTRUTURA & UNIDADES ---
  { id: 'total_predios', aba: 'estrutural', titulo: 'Total Prédios (Unidades)', bgClass: 'bg-indigo-600 text-white', keyVal: 'totalFiliais', sufixo: 'unidades' },
  { id: 'predios_proprios', aba: 'estrutural', titulo: 'Prédios Próprios', bgClass: 'bg-slate-700 text-white', keyVal: 'totalPredioProprio', sufixo: 'qtd' },
  { id: 'predios_terceiros', aba: 'estrutural', titulo: 'Prédios Terceiros', bgClass: 'bg-slate-900 text-white', keyVal: 'totalPredioTerceiro', sufixo: 'qtd' },
  { id: 'proprio_terceiro', aba: 'estrutural', titulo: 'Próprio / Terceiro', bgClass: 'bg-indigo-500 text-white', keyVal: 'totalPredioProprioTerceiro', sufixo: 'qtd' },
  { id: 'industrias', aba: 'estrutural', titulo: 'Indústrias', bgClass: 'bg-sky-600 text-white', keyVal: 'totalIndustria', sufixo: 'unidades' },
  { id: 'm2_industrias', aba: 'estrutural', titulo: 'M² Total Indústrias', bgClass: 'bg-teal-600 text-white', keyVal: 'totalMetragemIndustria', sufixo: 'm²', isFormatDecimal: true },
  { id: 'lojas', aba: 'estrutural', titulo: 'Lojas', bgClass: 'bg-purple-600 text-white', keyVal: 'totalLojas', sufixo: 'unidades' },
  { id: 'm2_lojas', aba: 'estrutural', titulo: 'M² Total Lojas', bgClass: 'bg-cyan-600 text-white', keyVal: 'totalMetragemLojas', sufixo: 'm²', isFormatDecimal: true },
  { id: 'cds', aba: 'estrutural', titulo: 'CDs', bgClass: 'bg-orange-600 text-white', keyVal: 'totalCentroDistribuicao', sufixo: 'unidades' },
  { id: 'm2_cd', aba: 'estrutural', titulo: 'M² CD', bgClass: 'bg-amber-500 text-slate-900', keyVal: 'totalMetragemCD', sufixo: 'm²', isFormatDecimal: true },
  { id: 'm2_autoposto', aba: 'estrutural', titulo: 'M² Auto Posto', bgClass: 'bg-pink-600 text-white', keyVal: 'totalMetragemAutoPosto', sufixo: 'm²', isFormatDecimal: true },

  // --- ABA 2: REGULARIDADE & DOCUMENTOS ---
  { id: 'predios_ok', aba: 'documental', titulo: 'Prédios 100% OK', bgClass: 'bg-emerald-600 text-white', keyVal: 'filiaisOk', sufixo: 'em dia' },
  { id: 'filiais_vencidos', aba: 'documental', titulo: 'Filiais C/ Vencidos', bgClass: 'bg-rose-600 text-white', keyVal: 'filiaisVencidas', sufixo: 'ação necess.' },
  { id: 'filiais_vencendo', aba: 'documental', titulo: 'Vencendo (30d)', bgClass: 'bg-amber-500 text-slate-900', keyVal: 'filiaisVencendo', sufixo: 'atenção' },
  { id: 'total_documentos', aba: 'documental', titulo: 'Total Documentos', bgClass: 'bg-indigo-600 text-white', keyVal: 'totalDocumentos', sufixo: 'docs' },
  { id: 'regularidade_global', aba: 'documental', titulo: 'Regularidade Global', bgClass: 'bg-emerald-600 text-white', keyVal: 'taxaConformidade', sufixo: '%' },
  { id: 'doc_pendente', aba: 'documental', titulo: 'Doc. Pendente', bgClass: 'bg-slate-700 text-white', keyVal: 'totalFaltando', sufixo: 'pendentes' },
  { id: 'risco_critico', aba: 'documental', titulo: 'Risco Crítico (+7d)', bgClass: 'bg-rose-700 text-white', keyVal: 'filiaisRiscoCritico', sufixo: 'críticos' },
  { id: 'bombeiros', aba: 'documental', titulo: 'Bombeiros (Em Dia)', bgClass: 'bg-purple-600 text-white', keyVal: 'taxaBombeiros', sufixo: '%' },
  { id: 'funcionamento', aba: 'documental', titulo: 'Funcionamento', bgClass: 'bg-teal-600 text-white', keyVal: 'taxaFuncionamento', sufixo: '%' },
];

const PADRAO_INICIAL_CARDS = [
  'total_predios',
  'predios_proprios',
  'predios_terceiros',
  'proprio_terceiro',
  'industrias',
  'm2_industrias',
  'lojas',
  'm2_lojas',
  'predios_ok',
  'filiais_vencidos',
  'filiais_vencendo',
  'total_documentos',
  'regularidade_global',
  'doc_pendente',
  'risco_critico',
  'bombeiros',
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { error: toastError } = useToast();

  const [abaAtiva, setAbaAtiva] = useState<'estrutural' | 'documental'>('estrutural');
  const [selecionados, setSelecionados] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dashboard_cards_visiveis');
      return saved ? JSON.parse(saved) : PADRAO_INICIAL_CARDS;
    } catch {
      return PADRAO_INICIAL_CARDS;
    }
  });

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination for tables
  const [pageVenc, setPageVenc] = useState(1);
  const [pageFalt, setPageFalt] = useState(1);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/dashboard/metrics?pageVenc=${pageVenc}&pageFalt=${pageFalt}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } else {
        toastError('Erro ao carregar dados do dashboard.', 'Erro');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
      toastError('Erro de conexão ao carregar o dashboard.', 'Erro');
    } finally {
      setIsLoading(false);
    }
  }, [pageVenc, pageFalt, toastError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleCard = (cardId: string) => {
    const ativosNaAba = METRICAS_CONFIG.filter(
      (m) => m.aba === abaAtiva && selecionados.includes(m.id)
    ).length;

    let newSelected: string[];
    if (selecionados.includes(cardId)) {
      newSelected = selecionados.filter((id) => id !== cardId);
    } else {
      if (ativosNaAba >= 8) {
        alert('Você já atingiu o limite máximo de 8 métricas exibidas para esta aba.');
        return;
      }
      newSelected = [...selecionados, cardId];
    }

    setSelecionados(newSelected);
    localStorage.setItem('dashboard_cards_visiveis', JSON.stringify(newSelected));
  };

  const handleExportVencimentos = () => {
    const token = localStorage.getItem('auth_token') || '';
    window.open(`/api/v1/dashboard/exportar/vencimentos?token=${encodeURIComponent(token)}`, '_blank');
  };

  const handleExportFaltando = () => {
    const token = localStorage.getItem('auth_token') || '';
    window.open(`/api/v1/dashboard/exportar/faltando?token=${encodeURIComponent(token)}`, '_blank');
  };

  const formatValor = (m: MetricaConfig) => {
    if (!data) return '0';
    const sourceObj = data[m.aba] || {};
    const rawVal = sourceObj[m.keyVal] ?? 0;

    if (m.isFormatDecimal) {
      return Number(rawVal).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return Number(rawVal).toLocaleString('pt-BR');
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Carregando Dashboard de Documentos & Filiais...
          </span>
        </div>
      </div>
    );
  }

  // Chart 1: Status Donut Chart Data
  const statusChartData = [
    { name: 'OK (em dia)', value: data.status?.ok || 0, color: '#10b981' },
    { name: 'Vence em breve (30d)', value: data.status?.vence || 0, color: '#f59e0b' },
    { name: 'Vencido (crítico)', value: data.status?.vencido || 0, color: '#ef4444' },
  ];

  // Chart 2: Documentos Vencidos por Tipo Bar Chart Data
  const porDocObj = data.porDocumento || {};
  const barChartData = [
    { name: 'Corpo Bombeiro', count: porDocObj['Alvará Corpo de Bombeiro'] || 0 },
    { name: 'Funcionamento', count: porDocObj['Alvará de Funcionamento'] || 0 },
    { name: 'Ambiental', count: porDocObj['Alvará Ambiental'] || 0 },
    { name: 'Brigada', count: porDocObj['Certificado de Brigada'] || 0 },
  ];

  const proximosVenc = data.proximosVencimentos?.data || [];
  const metaVenc = data.proximosVencimentos?.meta || { currentPage: 1, lastPage: 1, perPage: 5, total: 0 };

  const docsFaltando = data.faltando?.data || [];
  const metaFalt = data.faltando?.meta || { currentPage: 1, lastPage: 1, perPage: 5, total: 0 };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Dashboard de Documentos & Filiais
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visão consolidada de infraestrutura, regularidade documental e alertas de vencimento
            </p>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setAbaAtiva('estrutural')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              abaAtiva === 'estrutural'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Building className="w-4 h-4" /> Infraestrutura & Unidades
          </button>
          <button
            onClick={() => setAbaAtiva('documental')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              abaAtiva === 'documental'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Files className="w-4 h-4" /> Regularidade & Documentos
          </button>
        </div>

        {/* PAINEL DE SELEÇÃO DE MÉTRICAS */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h6 className="text-xs font-bold text-slate-800 dark:text-white">
              Selecione as métricas para exibir nesta aba (máx. 8):
            </h6>
            <span className="text-[11px] text-slate-400">
              {
                METRICAS_CONFIG.filter((m) => m.aba === abaAtiva && selecionados.includes(m.id))
                  .length
              } / 8 selecionadas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {METRICAS_CONFIG.filter((m) => m.aba === abaAtiva).map((m) => {
              const isChecked = selecionados.includes(m.id);
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none truncate hover:text-indigo-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCard(m.id)}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="truncate">{m.titulo}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* CARDS SELECIONADOS NA ABA ATIVA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICAS_CONFIG.filter((m) => m.aba === abaAtiva && selecionados.includes(m.id)).map(
            (m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl shadow-xs border border-white/10 ${m.bgClass} flex flex-col justify-between transition-transform hover:-translate-y-1`}
              >
                <div className="text-xs uppercase font-semibold tracking-wider opacity-90 mb-1">
                  {m.titulo}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-extrabold tracking-tight">
                    {formatValor(m)}
                  </span>
                  <span className="text-xs font-semibold opacity-80 me-1">{m.sufixo}</span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* GRÁFICOS (DOUGHNUT & BAR CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Status dos Documentos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            📌 Status dos Documentos
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Documentos Vencidos por Tipo */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
            📄 Documentos Vencidos por Tipo
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RechartsTooltip />
                <Bar dataKey="count" name="Qtd. Vencidos" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABELA 1: PRÓXIMOS VENCIMENTOS (Até 30 dias) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
               Próximos Vencimentos (Até 30 dias)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm">
              {metaVenc.total} registros
            </Badge>
            <Button variant="outline" size="sm" onClick={handleExportVencimentos}>
              <FileSpreadsheet className="w-3.5 h-3.5 me-1 text-emerald-500" /> Exportar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4 text-center">UF</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4 text-center">Vencimento</th>
                <th className="py-3 px-4 text-center">Dias</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {proximosVenc.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum vencimento nos próximos 30 dias.
                  </td>
                </tr>
              ) : (
                proximosVenc.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.idfilial} - {item.filial}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="indigo" size="sm">
                        {item.uf || 'PR'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {item.documento}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.vencimento ? item.vencimento.split('-').reverse().join('/') : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'Vencido' || item.dias < 0 ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {Math.abs(item.dias)} dias atrasado
                        </span>
                      ) : (
                        <span>{item.dias} dias</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'Vencido' ? (
                        <Badge variant="danger" size="sm">
                          Vencido
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          Vence em breve
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {metaVenc.lastPage > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Pagination
              currentPage={pageVenc}
              totalPages={metaVenc.lastPage}
              perPage={metaVenc.perPage}
              totalItems={metaVenc.total}
              onPageChange={setPageVenc}
            />
          </div>
        )}
      </div>

      {/* TABELA 2: DOCUMENTOS FALTANDO */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
               Filiais com Documentos Faltando
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm">
              {metaFalt.total} filiais
            </Badge>
            <Button variant="outline" size="sm" onClick={handleExportFaltando}>
              <FileSpreadsheet className="w-3.5 h-3.5 me-1 text-emerald-500" /> Exportar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Filial</th>
                <th className="py-3 px-4 text-center">UF</th>
                <th className="py-3 px-4">Documentos Pendentes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {docsFaltando.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    Nenhum documento faltando.
                  </td>
                </tr>
              ) : (
                docsFaltando.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {item.idfilial} - {item.filial}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="indigo" size="sm">
                        {item.uf || 'PR'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.documentos.map((doc: string, dIdx: number) => (
                          <Badge key={dIdx} variant="danger" size="sm">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {metaFalt.lastPage > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Pagination
              currentPage={pageFalt}
              totalPages={metaFalt.lastPage}
              perPage={metaFalt.perPage}
              totalItems={metaFalt.total}
              onPageChange={setPageFalt}
            />
          </div>
        )}
      </div>
    </div>
  );
};
