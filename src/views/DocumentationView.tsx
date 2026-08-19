import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Shield,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  Server,
  Monitor,
  Code2,
  Lock,
} from 'lucide-react';
import { Card, Badge } from '../components/design-system/Badge';
import { Button } from '../components/design-system/Button';
import { Tabs } from '../components/design-system/Tabs';
import { useToast } from '../context/ToastContext';

export const DocumentationView: React.FC = () => {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
    success('Instruções copiadas para a área de transferência!');
  };

  const setupCommands = `# 1. Instalar novo projeto Laravel 11
composer create-project laravel/laravel meu-saas-enterprise

# 2. Entrar no diretório
cd meu-saas-enterprise

# 3. Instalar Jetstream com Sanctum
composer require laravel/jetstream
php artisan jetstream:install api

# 4. Configurar banco de dados no .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=saas_enterprise
DB_USERNAME=root
DB_PASSWORD=secret

# 5. Executar as Migrations e Seeders do Starter Kit
php artisan migrate:fresh --seed

# 6. Iniciar o Servidor de Desenvolvimento
php artisan serve`;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Documentação de Arquitetura & Guia de Instalação
          </h2>
          <Badge variant="indigo" size="sm">
            Manual Técnico
          </Badge>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Guia completo para entender e implantar o starter kit em seus novos projetos SaaS
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'overview', label: '1. Visão Geral & Arquitetura' },
          { id: 'setup', label: '2. Passo a Passo de Instalação' },
          { id: 'rbac', label: '3. Arquitetura de Permissões (RBAC)' },
          { id: 'security', label: '4. Checklist de Segurança' },
        ]}
      />

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card title="Pilares da Arquitetura">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  <Server className="w-4 h-4" />
                  <span>Backend Laravel 11</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Estruturado com Clean Architecture, Controllers organizados, Form Requests para validação estrita, Eloquent ORM, API Resources para formatação de dados e Laravel Sanctum para emissão de tokens.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  <Monitor className="w-4 h-4" />
                  <span>Frontend React + Next.js</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Design System completo sem bibliotecas externas pesadas, Tailwind CSS com tema escuro nativo, animações em Motion, e tratamento robusto de erros 401, 403, 422 e 500.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>RBAC & Segurança</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Controle de acesso por Tela e por Ação. Usuários possuem múltiplos Perfis (Roles) que agregam Permissões granulares. Verificações feitas no backend via Laravel Policies/Gates.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: SETUP */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <Card
            title="Comandos para Inicializar o Backend Laravel"
            action={
              <Button
                variant="secondary"
                size="xs"
                leftIcon={copiedSection === 'setup' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                onClick={() => copyToClipboard(setupCommands, 'setup')}
              >
                {copiedSection === 'setup' ? 'Copiado!' : 'Copiar Comandos'}
              </Button>
            }
          >
            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {setupCommands}
            </pre>
          </Card>
        </div>
      )}

      {/* TAB: RBAC */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          <Card title="Como Funciona o Controle de Acesso por Tela">
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
              <p>
                O sistema adota um padrão de autorização em <strong>5 Camadas</strong> para garantir que nenhum usuário não autorizado consiga executar operações ou visualizar telas protegidas:
              </p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Camada 1: Menu Dinâmico (Sidebar)</strong> — As rotas são filtradas na renderização do menu. Se o usuário não possui a permissão requerida, o item é ocultado da interface.
                </li>
                <li>
                  <strong>Camada 2: Proteção de Rotas (Router Shield)</strong> — Se o usuário digitar a URL manualmente na barra de endereços (ex: <code>/users</code>), o roteador valida <code>canAccessRoute()</code> e exibe o <strong>ForbiddenShield (403)</strong>.
                </li>
                <li>
                  <strong>Camada 3: Validação no Backend (Laravel Policies)</strong> — O backend nunca confia no frontend. Toda requisição passa por <code>$this-&gt;authorize('create', User::class)</code> ou <code>Gate::authorize('users.create')</code>.
                </li>
                <li>
                  <strong>Camada 4: Resposta Padronizada da API</strong> — O Laravel retorna HTTP 403 Forbidden com envelope JSON estruturado: <code>&#123; success: false, message: '...' &#125;</code>.
                </li>
                <li>
                  <strong>Camada 5: Trilha de Auditoria (Logs)</strong> — Tentativas de acesso ou operações bem-sucedidas são registradas no banco na tabela <code>audit_logs</code> com IP, timestamp e payload.
                </li>
              </ol>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card title="Checklist de Segurança Implementado">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {[
                { title: 'Sanctum Tokens com Hash SHA-256', desc: 'Tokens armazenados com hash seguro no banco de dados' },
                { title: 'Proteção contra CSRF e CORS estrito', desc: 'Middleware CSRF ativo em requisições de sessão web' },
                { title: 'Form Requests com Validação Forte', desc: 'Sanitização de strings e validação de senhas com regras rígidas' },
                { title: 'Prevenção de Mass Assignment', desc: 'Propriedade $fillable explícita em todos os Models Eloquent' },
                { title: 'Rate Limiting contra Força Bruta', desc: 'Limite de 5 tentativas por minuto em endpoints de autenticação' },
                { title: 'Trilha de Auditoria Forense', desc: 'Registro de IP, User-Agent, ação e metadados JSON em cada mutação' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
