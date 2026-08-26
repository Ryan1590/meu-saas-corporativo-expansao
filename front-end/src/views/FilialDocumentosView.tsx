import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderCheck,
  Building,
  Ruler,
  Download,
  ArrowLeft,
  Save,
  CheckSquare,
  Square,
  FileText,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Filial, FilialDocumento, DocumentoStatus, FilialDocumentosData } from '../types';
import { Button } from '../components/design-system/Button';
import { Badge } from '../components/design-system/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface FilialDocumentosViewProps {
  onNavigate: (path: string) => void;
}

interface CardConfig {
  titulo: string;
  tipo: string; // 'alvara-corpo-bombeiro' | 'alvara-funcionamento' | 'alvara-ambiental' | 'certificado-brigada'
  arquivoCampo: string;
  pathCampo: keyof FilialDocumento;
  vencimentoCampo: keyof FilialDocumento;
  keyStatus: string;
  dbDocKey: string; // 'alvara_corpo_bombeiro' etc.
}

const CARDS_CONFIG: CardConfig[] = [
  {
    titulo: 'Alvará Corpo de Bombeiro',
    tipo: 'alvara-corpo-bombeiro',
    arquivoCampo: 'alvara_corpo_bombeiro_arquivo',
    pathCampo: 'alvara_corpo_bombeiro_path',
    vencimentoCampo: 'alvara_corpo_bombeiro_vencimento',
    keyStatus: 'alvara_corpo_bombeiro',
    dbDocKey: 'alvara_corpo_bombeiro',
  },
  {
    titulo: 'Alvará de Funcionamento',
    tipo: 'alvara-funcionamento',
    arquivoCampo: 'alvara_funcionamento_arquivo',
    pathCampo: 'alvara_funcionamento_path',
    vencimentoCampo: 'alvara_funcionamento_vencimento',
    keyStatus: 'alvara_funcionamento',
    dbDocKey: 'alvara_funcionamento',
  },
  {
    titulo: 'Alvará Ambiental',
    tipo: 'alvara-ambiental',
    arquivoCampo: 'alvara_ambiental_arquivo',
    pathCampo: 'alvara_ambiental_path',
    vencimentoCampo: 'alvara_ambiental_vencimento',
    keyStatus: 'alvara_ambiental',
    dbDocKey: 'alvara_ambiental',
  },
  {
    titulo: 'Certificado de Brigada',
    tipo: 'certificado-brigada',
    arquivoCampo: 'certificado_brigada_arquivo',
    pathCampo: 'certificado_brigada_path',
    vencimentoCampo: 'certificado_brigada_vencimento',
    keyStatus: 'certificado_brigada',
    dbDocKey: 'certificado_brigada',
  },
];

export const FilialDocumentosView: React.FC<FilialDocumentosViewProps> = ({ onNavigate }) => {
  const { success, error: toastError } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const idfilial = searchParams.get('idfilial') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FilialDocumentosData | null>(null);

  // Form State
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [vencimentos, setVencimentos] = useState<Record<string, string>>({});
  const [documentosObrigatorios, setDocumentosObrigatorios] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDocumentos = useCallback(async () => {
    if (!idfilial) {
      toastError('ID da Filial não informado.', 'Erro');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/filiais/${idfilial}/documentos`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          const docs: FilialDocumento = json.data.documentos || {};
          setVencimentos({
            alvara_corpo_bombeiro: docs.alvara_corpo_bombeiro_vencimento ? docs.alvara_corpo_bombeiro_vencimento.split('T')[0] : '',
            alvara_funcionamento: docs.alvara_funcionamento_vencimento ? docs.alvara_funcionamento_vencimento.split('T')[0] : '',
            alvara_ambiental: docs.alvara_ambiental_vencimento ? docs.alvara_ambiental_vencimento.split('T')[0] : '',
            certificado_brigada: docs.certificado_brigada_vencimento ? docs.certificado_brigada_vencimento.split('T')[0] : '',
          });
          setDocumentosObrigatorios(json.data.documentosObrigatorios || []);
        }
      } else {
        toastError('Erro ao carregar documentos da filial.', 'Erro');
      }
    } catch (err) {
      console.error('Failed to fetch documentos', err);
      toastError('Erro de conexão com o servidor.', 'Erro');
    } finally {
      setIsLoading(false);
    }
  }, [idfilial, toastError]);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  const handleToggleObrigatorio = (dbDocKey: string) => {
    if (documentosObrigatorios.includes(dbDocKey)) {
      setDocumentosObrigatorios(documentosObrigatorios.filter((d) => d !== dbDocKey));
    } else {
      setDocumentosObrigatorios([...documentosObrigatorios, dbDocKey]);
    }
  };

  const handleFileChange = (arquivoCampo: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [arquivoCampo]: file }));
  };

  const handleDateChange = (dbDocKey: string, val: string) => {
    setVencimentos((prev) => ({ ...prev, [dbDocKey]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idfilial) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();

      CARDS_CONFIG.forEach((card) => {
        const file = files[card.arquivoCampo];
        if (file) {
          formData.append(card.arquivoCampo, file);
        }
        const venc = vencimentos[card.dbDocKey];
        if (venc) {
          formData.append(`${card.dbDocKey}_vencimento`, venc);
        }
      });

      documentosObrigatorios.forEach((doc) => {
        formData.append('documentos_obrigatorios[]', doc);
      });

      const res = await fetch(`/api/v1/filiais/${idfilial}/documentos`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success('Documentos da filial atualizados com sucesso!');
        setFiles({});
        fetchDocumentos();
      } else {
        toastError(json.message || 'Erro ao salvar documentos.', 'Erro');
      }
    } catch (err) {
      toastError('Erro de conexão ao salvar documentos.', 'Erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMetragem = (val: number | string) => {
    const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(',', '.'));
    if (isNaN(num)) return '0,00 m²';
    return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
  };

  const isImageFile = (path?: string | null) => {
    if (!path) return false;
    const ext = path.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Carregando documentos da filial...
          </span>
        </div>
      </div>
    );
  }

  if (!data || !data.filial) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Filial não encontrada</h2>
        <Button variant="primary" onClick={() => onNavigate('/filiais')}>
          <ArrowLeft className="w-4 h-4 me-1.5" /> Voltar para Filiais
        </Button>
      </div>
    );
  }

  const { filial, documentos, statusDocumentos } = data;

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <FolderCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Documentos da Filial
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controle de licenças, alvarás e vencimentos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/v1/filiais/${filial.idfilial}/documentos/exportar?token=${encodeURIComponent(localStorage.getItem('auth_token') || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 me-1.5 text-emerald-500" /> Exportar Todos (ZIP)
          </a>

          <Button variant="outline" onClick={() => onNavigate('/filiais')}>
            <ArrowLeft className="w-4 h-4 me-1.5" /> Voltar
          </Button>
        </div>
      </div>

      {/* Selected Filial Info Card */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Filial Selecionada
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">{filial.idfilial}</span> - {filial.filial}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <strong>Prédio:</strong> {filial.predio}
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="neutral" size="sm">{filial.tipo}</Badge>
              </span>
              <span className="flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-slate-400" />
                <strong>Metragem:</strong> {formatMetragem(filial.metragem_quadrada)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Form & Cards */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CARDS_CONFIG.map((card) => {
            const path = documentos[card.pathCampo] as string | null | undefined;
            const hasArquivo = !!path;
            const status: DocumentoStatus = statusDocumentos[card.keyStatus] || {
              tipo: 'sem_data',
              texto: 'Sem vencimento informado',
            };
            const isObrigatorio = documentosObrigatorios.includes(card.dbDocKey);
            const vencimentoVal = vencimentos[card.dbDocKey] || '';

            return (
              <div
                key={card.tipo}
                className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {card.titulo}
                    </h3>

                    <div className="flex items-center gap-2">
                      {hasArquivo && (
                        <a
                          href={`/api/v1/filiais/${filial.idfilial}/documentos/exportar/${card.tipo}?token=${encodeURIComponent(localStorage.getItem('auth_token') || '')}`}
                          download
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Exportar documento individual"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {status.tipo === 'dentro_prazo' ? (
                        <Badge variant="success" size="sm" className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Dentro do prazo
                        </Badge>
                      ) : status.tipo === 'vencido' ? (
                        <Badge variant="danger" size="sm" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Vencido
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Sem data
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {status.texto}
                  </p>

                  {/* Documento Obrigatório Checkbox */}
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isObrigatorio}
                      onChange={() => handleToggleObrigatorio(card.dbDocKey)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Documento Obrigatório</span>
                  </label>

                  {/* Anexo Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Anexo (PDF, JPG, PNG, WEBP)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => handleFileChange(card.arquivoCampo, e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                    />

                    {hasArquivo && (
                      <div className="mt-3 space-y-2">
                        {isImageFile(path) && (
                          <a
                            href={`/api/v1/filiais/${filial.idfilial}/documentos/arquivo/${card.tipo}?token=${encodeURIComponent(localStorage.getItem('auth_token') || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={`/api/v1/filiais/${filial.idfilial}/documentos/arquivo/${card.tipo}?token=${encodeURIComponent(localStorage.getItem('auth_token') || '')}`}
                              alt={`Preview ${card.titulo}`}
                              className="w-full max-h-40 object-cover"
                            />
                          </a>
                        )}

                        <a
                          href={`/api/v1/filiais/${filial.idfilial}/documentos/arquivo/${card.tipo}?token=${encodeURIComponent(localStorage.getItem('auth_token') || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> Visualizar arquivo atual
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Expiration Date Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Data de Vencimento
                    </label>
                    <input
                      type="date"
                      value={vencimentoVal}
                      onChange={(e) => handleDateChange(card.dbDocKey, e.target.value)}
                      className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button variant="primary" type="submit" isLoading={isSubmitting} size="lg">
            <Save className="w-4 h-4 me-2" /> Salvar Documentos
          </Button>
        </div>
      </form>
    </div>
  );
};
