import React, { useState } from 'react';
import {
  Code2,
  FolderTree,
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { laravelFiles, LaravelFile } from '../data/laravelCodebase';
import { Card, Badge } from '../components/design-system/Badge';
import { Button } from '../components/design-system/Button';
import { useToast } from '../context/ToastContext';

export const LaravelCodeViewer: React.FC = () => {
  const { success } = useToast();
  const [selectedFile, setSelectedFile] = useState<LaravelFile>(laravelFiles[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const categories = [
    { id: 'all', label: 'Todos os Arquivos' },
    { id: 'Controllers', label: 'Controllers' },
    { id: 'FormRequests', label: 'Form Requests' },
    { id: 'Models & Traits', label: 'Models & Traits' },
    { id: 'Policies & Gates', label: 'Policies & Gates' },
    { id: 'Migrations', label: 'Migrations (DB)' },
    { id: 'Seeders', label: 'Database Seeders' },
    { id: 'Resources', label: 'API Resources' },
    { id: 'Routes', label: 'Routes API' },
    { id: 'Config', label: 'Configurações' },
  ];

  const filteredFiles =
    selectedCategory === 'all'
      ? laravelFiles
      : laravelFiles.filter((f) => f.category === selectedCategory);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success(`Código de "${selectedFile.path}" copiado!`);
  };

  const handleDownloadAll = () => {
    const combined = laravelFiles
      .map((f) => `// ==========================================\n// FILE: ${f.path}\n// CATEGORY: ${f.category}\n// ==========================================\n\n${f.content}\n\n`)
      .join('\n');

    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'laravel11_enterprise_backend_starter.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Todos os arquivos do Laravel 11 foram exportados!');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Arquivos do Backend Laravel 11
            </h2>
            <Badge variant="indigo" size="sm">
              PSR-12 / Clean Architecture
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Código PHP puro pronto para copiar ou implantar na raiz de um projeto Laravel 11 com Jetstream + Sanctum
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadAll}
          >
            Exportar Todos (.TXT / ZIP)
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopy}
          >
            {copied ? 'Copiado!' : 'Copiar Arquivo Atual'}
          </Button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main File Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar File List */}
        <div className="lg:col-span-4 space-y-2">
          <Card title="Árvore de Arquivos Laravel" noPadding>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[560px] overflow-y-auto">
              {filteredFiles.map((file) => {
                const isSelected = selectedFile.id === file.id;
                return (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-l-3 border-indigo-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <FileCode
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-mono font-semibold truncate ${
                          isSelected
                            ? 'text-indigo-950 dark:text-indigo-200'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {file.path.split('/').pop()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {file.path}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="neutral" size="sm">
                          {file.category}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Code Content Box */}
        <div className="lg:col-span-8 space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>{selectedFile.path}</span>
                <Badge variant="indigo" size="sm">
                  {selectedFile.category}
                </Badge>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            {/* Description Banner */}
            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs text-slate-400">
              {selectedFile.description}
            </div>

            {/* Syntax Highlighted Code Viewer */}
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[480px] leading-relaxed select-all">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
