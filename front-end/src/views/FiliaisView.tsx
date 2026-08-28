import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Plus,
  Filter,
  XCircle,
  Download,
  Edit2,
  Trash2,
  FolderCheck,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Filial } from '../types';
import { Table, Column, Pagination } from '../components/design-system/Table';
import { Button } from '../components/design-system/Button';
import { Input, Select } from '../components/design-system/Input';
import { Modal } from '../components/design-system/Modal';
import { ConfirmationDialog } from '../components/design-system/ConfirmationDialog';
import { Tabs } from '../components/design-system/Tabs';
import { Badge } from '../components/design-system/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eraser } from 'lucide-react';

interface FiliaisViewProps {
  onNavigate: (path: string) => void;
}

const UFS_BRASIL = [
  { value: '', label: 'Selecione a UF...' },
  { value: 'AC', label: 'AC - Acre' },
  { value: 'AL', label: 'AL - Alagoas' },
  { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' },
  { value: 'BA', label: 'BA - Bahia' },
  { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' },
  { value: 'ES', label: 'ES - Espírito Santo' },
  { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' },
  { value: 'MT', label: 'MT - Mato Grosso' },
  { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' },
  { value: 'PA', label: 'PA - Pará' },
  { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' },
  { value: 'PE', label: 'PE - Pernambuco' },
  { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' },
  { value: 'RN', label: 'RN - Rio Grande do Norte' },
  { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' },
  { value: 'RR', label: 'RR - Roraima' },
  { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' },
  { value: 'SE', label: 'SE - Sergipe' },
  { value: 'TO', label: 'TO - Tocantins' },
];


const getInitialPage = (): number => {
  const params = new URLSearchParams(window.location.search);
  const pageParam = Number(params.get('page'));
  return pageParam && !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
};

export const FiliaisView: React.FC<FiliaisViewProps> = ({ onNavigate }) => {
  const { can } = useAuth();
  const { success, error: toastError } = useToast();

  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  // Filters state
  const [filtroIdFilial, setFiltroIdFilial] = useState('');
  const [filtroFilial, setFiltroFilial] = useState('');
  const [filtroPredio, setFiltroPredio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Sorting & Pagination
  const [sortColumn, setSortColumn] = useState('idfilial');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Sincroniza a página caso a URL mude com o componente já montado
  useEffect(() => {
    const pageFromUrl = getInitialPage();
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, []);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('cadastro');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFilial, setSelectedFilial] = useState<Filial | null>(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    idfilial: '',
    filial: '',
    uf: '',
    predio: '',
    metragem_quadrada: '',
    tipo: '',
  });


  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchFiliais = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        sortColumn,
        sortDirection,
        page: currentPage.toString(),
        perPage: perPage.toString(),
      });

      if (filtroIdFilial) params.append('filtro_idfilial', filtroIdFilial);
      if (filtroFilial) params.append('filial', filtroFilial);
      if (filtroPredio) params.append('predio', filtroPredio);
      if (filtroTipo) params.append('tipo', filtroTipo);

      const res = await fetch(`/api/v1/filiais?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFiliais(json.data || []);
          if (json.meta) {
            setTotalPages(json.meta.lastPage || 1);
            setTotalItems(json.meta.total || 0);
          }
        }
      } else {
        toastError('Erro ao carregar lista de filiais.', 'Erro');
      }
    } catch (err) {
      console.error('Failed to fetch filiais', err);
      toastError('Erro ao se conectar ao servidor.', 'Erro');
    } finally {
      setIsLoading(false);
    }
  }, [
    sortColumn,
    sortDirection,
    currentPage,
    perPage,
    filtroIdFilial,
    filtroFilial,
    filtroPredio,
    filtroTipo,
    toastError,
  ]);

  useEffect(() => {
    fetchFiliais();
  }, [fetchFiliais]);

  const handleClearFilters = () => {
    setFiltroIdFilial('');
    setFiltroFilial('');
    setFiltroPredio('');
    setFiltroTipo('');
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams({
      export: 'csv',
    });
    if (token) params.append('token', token);
    if (filtroIdFilial) params.append('filtro_idfilial', filtroIdFilial);
    if (filtroFilial) params.append('filial', filtroFilial);
    if (filtroPredio) params.append('predio', filtroPredio);
    if (filtroTipo) params.append('tipo', filtroTipo);

    window.open(`/api/v1/filiais?${params.toString()}`, '_blank');
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };







  const handleCreateFilial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!formData.idfilial) errors.idfilial = 'ID da Filial é obrigatório';
    if (!formData.filial) errors.filial = 'Nome da Filial é obrigatório';
    if (!formData.uf) errors.uf = 'UF é obrigatória';
    if (!formData.predio) errors.predio = 'Prédio é obrigatório';
    if (!formData.metragem_quadrada) errors.metragem_quadrada = 'Metragem quadrada é obrigatória';
    if (!formData.tipo) errors.tipo = 'Tipo é obrigatório';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/filiais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idfilial: parseInt(formData.idfilial, 10),
          filial: formData.filial,
          uf: formData.uf,
          predio: formData.predio,
          metragem_quadrada: formData.metragem_quadrada,
          tipo: formData.tipo,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success('Filial cadastrada com sucesso!');
        setIsAddModalOpen(false);
        setFormData({
          idfilial: '',
          filial: '',
          uf: 'PR',
          predio: 'Próprio',
          metragem_quadrada: '',
          tipo: 'Loja',
        });
        fetchFiliais();
      } else {
        toastError(json.message || 'Erro ao cadastrar filial.', 'Atenção');
        if (json.errors) {
          const apiErrs: Record<string, string> = {};
          Object.keys(json.errors).forEach((k) => {
            apiErrs[k] = json.errors[k][0];
          });
          setFormErrors(apiErrs);
        }
      }
    } catch (err) {
      toastError('Erro de conexão com o servidor.', 'Erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toastError('Selecione um arquivo CSV para importar.', 'Atenção');
      return;
    }

    try {
      setIsImporting(true);
      const body = new FormData();
      body.append('planilha', importFile);

      const res = await fetch('/api/v1/filiais/import', {
        method: 'POST',
        body,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(json.message || 'Filiais importadas com sucesso!');
        setIsAddModalOpen(false);
        setImportFile(null);
        fetchFiliais();
      } else {
        toastError(json.message || 'Erro ao importar planilha.', 'Erro');
      }
    } catch (err) {
      toastError('Erro de conexão com o servidor ao importar planilha.', 'Erro');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenEdit = (filialItem: Filial) => {
    setSelectedFilial(filialItem);

    const rawUf = filialItem.uf ? filialItem.uf.trim().toUpperCase() : 'PR';
    const foundUf = UFS_BRASIL.find((u) => u.value === rawUf);
    const currentUf = foundUf ? foundUf.value : 'PR';

    let currentPredio = filialItem.predio || 'Próprio';
    if (
      currentPredio.toUpperCase().includes('ALUGADO') ||
      currentPredio.includes('/') ||
      (currentPredio.toUpperCase().includes('PRÓPRIO') && currentPredio.toUpperCase().includes('TERCEIRO'))
    ) {
      currentPredio = 'Próprio/Terceiro';
    } else if (currentPredio.toUpperCase().includes('TERCEIRO')) {
      currentPredio = 'Terceiro';
    } else {
      currentPredio = 'Próprio';
    }

    let currentTipo = filialItem.tipo || 'Loja';
    if (currentTipo.toLowerCase().includes('ind')) {
      currentTipo = 'Indústria';
    } else if (
      currentTipo.toLowerCase().includes('centr') ||
      currentTipo.toLowerCase().includes('cd')
    ) {
      currentTipo = 'Centro de Distribuição';
    } else if (currentTipo.toLowerCase().includes('posto')) {
      currentTipo = 'Auto Posto Gazin';
    } else {
      currentTipo = 'Loja';
    }

    setFormData({
      idfilial: filialItem.idfilial.toString(),
      filial: filialItem.filial || '',
      uf: currentUf,
      predio: currentPredio,
      metragem_quadrada: filialItem.metragem_quadrada ? filialItem.metragem_quadrada.toString() : '0',
      tipo: currentTipo,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleUpdateFilial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFilial) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/filiais/${selectedFilial.idfilial}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idfilial: parseInt(formData.idfilial, 10),
          filial: formData.filial,
          uf: formData.uf,
          predio: formData.predio,
          metragem_quadrada: formData.metragem_quadrada,
          tipo: formData.tipo,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success('Filial atualizada com sucesso!');
        setIsEditModalOpen(false);
        setSelectedFilial(null);
        fetchFiliais();
      } else {
        toastError(json.message || 'Erro ao atualizar filial.', 'Erro');
      }
    } catch (err) {
      toastError('Erro ao atualizar filial.', 'Erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFilial = async () => {
    if (!selectedFilial) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/filiais/${selectedFilial.idfilial}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success('Filial excluída com sucesso!');
        setIsDeleteDialogOpen(false);
        setSelectedFilial(null);
        fetchFiliais();
      } else {
        toastError(json.message || 'Erro ao excluir filial.', 'Erro');
      }
    } catch (err) {
      toastError('Erro de conexão ao excluir filial.', 'Erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMetragem = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
    if (isNaN(num)) return '0,00 m²';
    return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Filiais</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestão de filiais, metragens, prédios e documentação legal
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setFormData({
              idfilial: '',
              filial: '',
              uf: '',
              predio: '',
              metragem_quadrada: '',
              tipo: '',
            });
            setFormErrors({});
            setIsAddModalOpen(true);
          }}
          className="shadow-sm"
        >
          <Plus className="w-4 h-4 me-1.5" />
        </Button>
      </div>

      {/* Filter Card */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span>Filtros de Busca</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <Eraser className="w-3.5 h-3.5 me-1 text-slate-400" /> 
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-3.5 h-3.5 me-1 text-emerald-500" />
            </Button>
            <Button variant="primary" size="sm" onClick={fetchFiliais}>
              <Filter className="w-3.5 h-3.5 me-1" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              ID da Filial
            </label>
            <Input
              type="number"
              placeholder="Ex: 1001"
              value={filtroIdFilial}
              onChange={(e) => setFiltroIdFilial(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome da Filial
            </label>
            <Input
              type="text"
              placeholder="Ex: Douradina - PR"
              value={filtroFilial}
              onChange={(e) => setFiltroFilial(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Prédio
            </label>
            <Select
              value={filtroPredio}
              onChange={(e) => setFiltroPredio(e.target.value)}
              options={[
                { value: '', label: 'Todos os prédios' },
                { value: 'Próprio', label: 'Próprio' },
                { value: 'Terceiro', label: 'Terceiro' },
                { value: 'Próprio/Terceiro', label: 'Próprio / Alugado' },
              ]}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo
            </label>
            <Select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              options={[
                { value: '', label: 'Todos os tipos' },
                { value: 'Loja', label: 'Loja' },
                { value: 'Indústria', label: 'Indústria' },
                { value: 'Centro de Distribuição', label: 'Centro de Distribuição' },
                { value: 'Auto Posto Gazin', label: 'Auto Posto Gazin' },
              ]}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                  onClick={() => handleSort('idfilial')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>ID Filial</span>
                    {getSortIcon('idfilial')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                  onClick={() => handleSort('filial')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Filial</span>
                    {getSortIcon('filial')}
                  </div>
                </th>
                <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"onClick={() => handleSort('uf')}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>UF</span>
                    {getSortIcon('uf')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                  onClick={() => handleSort('predio')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Prédio</span>
                    {getSortIcon('predio')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                  onClick={() => handleSort('metragem_quadrada')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Metragem Quadrada</span>
                    {getSortIcon('metragem_quadrada')}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                  onClick={() => handleSort('tipo')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Tipo</span>
                    {getSortIcon('tipo')}
                  </div>
                </th>
                <th className="py-3 px-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Carregando filiais...</span>
                    </div>
                  </td>
                </tr>
              ) : filiais.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma filial encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filiais.map((item) => (
                  <tr key={item.idfilial} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                      {item.idfilial}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {item.filial}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                      {item.uf}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          item.predio === 'Próprio'
                            ? 'success'
                            : item.predio === 'Terceiro'
                            ? 'warning'
                            : 'indigo'
                        }
                        size="sm"
                      >
                        {item.predio}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                      {formatMetragem(item.metragem_quadrada)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="neutral" size="sm">
                        {item.tipo}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                     <button
                        onClick={() => onNavigate(`/filiais/documentos?idfilial=${item.idfilial}&page=${currentPage}`)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition-colors"
                        title="Gerenciar Documentos"
                      >
                        <FolderCheck className="w-4 h-4" />
                      </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                          title="Editar Filial"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFilial(item);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
                          title="Excluir Filial"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Mostrar</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {[5, 10, 20, 30, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>por página</span>
            <span className="ms-2 font-medium">
              ({totalItems} registros no total)
            </span>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            perPage={perPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal Nova Filial */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Nova Filial"
        size="md"
      >
        <div className="space-y-4">
          <Tabs
            tabs={[
              { id: 'cadastro', label: 'Cadastro Manual' },
              { id: 'importar', label: 'Importar Planilha' },
            ]}
            activeTab={activeModalTab}
            onChange={setActiveModalTab}
          />

          {activeModalTab === 'cadastro' ? (
            <form onSubmit={handleCreateFilial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ID da Filial *
                </label>
                <Input
                  type="number"
                  placeholder="ID da Filial"
                  value={formData.idfilial}
                  onChange={(e) => setFormData({ ...formData, idfilial: e.target.value })}
                  error={formErrors.idfilial}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Filial *
                </label>
                <Input
                  type="text"
                  placeholder="Nome da Filial"
                  value={formData.filial}
                  onChange={(e) => setFormData({ ...formData, filial: e.target.value })}
                  error={formErrors.filial}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UF *
                  </label>
                  <Select
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                    error={formErrors.uf}
                    options={UFS_BRASIL}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prédio *
                  </label>
                  <Select
                    value={formData.predio}
                    onChange={(e) => setFormData({ ...formData, predio: e.target.value })}
                    error={formErrors.predio}
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'Próprio', label: 'Próprio' },
                      { value: 'Terceiro', label: 'Terceiro' },
                      { value: 'Próprio/Terceiro', label: 'Próprio / Alugado' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Metragem Quadrada (m²) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Metragem Quadrada"
                    value={formData.metragem_quadrada}
                    onChange={(e) => setFormData({ ...formData, metragem_quadrada: e.target.value })}
                    error={formErrors.metragem_quadrada}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo *
                  </label>
                  <Select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    error={formErrors.tipo}
                    options={[
                      { value: '', label: 'Selecione...' },
                      { value: 'Loja', label: 'Loja' },
                      { value: 'Indústria', label: 'Indústria' },
                      { value: 'Centro de Distribuição', label: 'Centro de Distribuição' },
                      { value: 'Auto Posto Gazin', label: 'Auto Posto Gazin' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>
                  <Plus className="w-4 h-4 me-1.5" /> Cadastrar Filial
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleImportCsv} className="space-y-4">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Baixe o modelo de planilha CSV para garantir o formato de importação correto:
                </p>
                <a
                  href="/modelos/modelo_filiais.csv"
                  download
                  className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <FileSpreadsheet className="w-4 h-4 me-1.5" /> Baixar Modelo de Planilha CSV
                </a>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecione o arquivo CSV (.csv)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  A planilha deve conter as colunas: idfilial, filial, uf, predio, metragem_quadrada, tipo.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isLoading={isImporting}>
                  <Upload className="w-4 h-4 me-1.5" /> Importar Planilha
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal Editar Filial */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Filial - ID ${selectedFilial?.idfilial}`}
        size="md"
      >
        <form onSubmit={handleUpdateFilial} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ID da Filial *
            </label>
            <Input
              type="number"
              value={formData.idfilial}
              onChange={(e) => setFormData({ ...formData, idfilial: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Filial *
            </label>
            <Input
              type="text"
              value={formData.filial}
              onChange={(e) => setFormData({ ...formData, filial: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                UF *
              </label>
              <Select
                value={formData.uf}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value })}
                options={UFS_BRASIL}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prédio *
              </label>
              <Select
                value={formData.predio}
                onChange={(e) => setFormData({ ...formData, predio: e.target.value })}
                options={[
                  { value: 'Próprio', label: 'Próprio' },
                  { value: 'Terceiro', label: 'Terceiro' },
                  { value: 'Próprio/Terceiro', label: 'Próprio / Alugado' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Metragem Quadrada (m²) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.metragem_quadrada}
                onChange={(e) => setFormData({ ...formData, metragem_quadrada: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo *
              </label>
              <Select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                options={[
                  { value: 'Loja', label: 'Loja' },
                  { value: 'Indústria', label: 'Indústria' },
                  { value: 'Centro de Distribuição', label: 'Centro de Distribuição' },
                  { value: 'Auto Posto Gazin', label: 'Auto Posto Gazin' },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteFilial}
        title="Excluir Filial"
        message={`Tem certeza que deseja excluir a filial "${selectedFilial?.idfilial} - ${selectedFilial?.filial}"? Todos os documentos associados também serão excluídos.`}
        confirmText="Excluir"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
};
