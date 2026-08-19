import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Types for backend
interface Permission {
  id: string;
  name: string;
  label: string;
  module: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  label: string;
  description: string;
  isSystem?: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  roles: string[]; // Role IDs
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  emailVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'created' | 'updated' | 'deleted' | 'login' | 'logout' | 'status_changed' | 'password_reset' | 'permission_modified';
  module: 'auth' | 'users' | 'roles' | 'permissions' | 'settings' | 'system';
  description: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  createdAt: string;
}

interface ApiToken {
  id: string;
  userId: string;
  name: string;
  token: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  abilities: string[];
  createdAt: string;
}

// In-memory Database initialized with realistic seeders
const permissionsSeed: Permission[] = [
  // Dashboard
  { id: '1', name: 'dashboard.view', label: 'Visualizar Dashboard', module: 'dashboard', description: 'Acesso aos gráficos e métricas principais do sistema' },
  // Users
  { id: '2', name: 'users.view', label: 'Visualizar Usuários', module: 'users', description: 'Acesso à listagem e detalhes de usuários' },
  { id: '3', name: 'users.create', label: 'Criar Usuários', module: 'users', description: 'Permite cadastrar novos usuários no sistema' },
  { id: '4', name: 'users.edit', label: 'Editar Usuários', module: 'users', description: 'Permite editar dados de usuários existentes' },
  { id: '5', name: 'users.delete', label: 'Excluir Usuários', module: 'users', description: 'Permite remover usuários do sistema' },
  { id: '6', name: 'users.status', label: 'Alterar Status de Usuários', module: 'users', description: 'Permite ativar/desativar usuários' },
  // Roles
  { id: '7', name: 'roles.view', label: 'Visualizar Perfis', module: 'roles', description: 'Acesso à lista de perfis/cargos do sistema' },
  { id: '8', name: 'roles.create', label: 'Criar Perfis', module: 'roles', description: 'Permite cadastrar novos perfis com permissões' },
  { id: '9', name: 'roles.edit', label: 'Editar Perfis', module: 'roles', description: 'Permite editar perfis e suas permissões associadas' },
  { id: '10', name: 'roles.delete', label: 'Excluir Perfis', module: 'roles', description: 'Permite excluir perfis não-sistema' },
  // Permissions
  { id: '11', name: 'permissions.view', label: 'Visualizar Matriz de Permissões', module: 'permissions', description: 'Visualizar catálogo de permissões e controle de acesso' },
  // Reports
  { id: '12', name: 'reports.view', label: 'Visualizar Relatórios', module: 'reports', description: 'Acesso a relatórios executivos e operacionais' },
  // Logs
  { id: '13', name: 'logs.view', label: 'Visualizar Logs de Auditoria', module: 'logs', description: 'Consulta detalhada das atividades e trilha de auditoria' },
  // Settings
  { id: '14', name: 'settings.view', label: 'Visualizar Configurações', module: 'settings', description: 'Visualizar parâmetros e políticas do sistema' },
  { id: '15', name: 'settings.edit', label: 'Alterar Configurações', module: 'settings', description: 'Modificar parâmetros de segurança e regras de negócio' },
];

let rolesSeed: Role[] = [
  {
    id: 'role-admin',
    name: 'admin',
    label: 'Administrador',
    description: 'Acesso irrestrito a todos os módulos, configurações, auditoria e gestão de perfis.',
    isSystem: true,
    permissions: permissionsSeed.map((p) => p.name),
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'role-manager',
    name: 'manager',
    label: 'Gerente Operacional',
    description: 'Gestão de usuários, visualização de relatórios e logs operacionais.',
    isSystem: false,
    permissions: ['dashboard.view', 'users.view', 'users.create', 'users.edit', 'users.status', 'reports.view', 'logs.view'],
    createdAt: '2026-01-11T09:30:00.000Z',
    updatedAt: '2026-01-11T09:30:00.000Z',
  },
  {
    id: 'role-operator',
    name: 'operator',
    label: 'Operador',
    description: 'Acesso ao painel principal, consulta de usuários e relatórios básicos.',
    isSystem: false,
    permissions: ['dashboard.view', 'users.view', 'reports.view'],
    createdAt: '2026-01-12T10:15:00.000Z',
    updatedAt: '2026-01-12T10:15:00.000Z',
  },
  {
    id: 'role-auditor',
    name: 'auditor',
    label: 'Auditor de Segurança',
    description: 'Acesso somente leitura para conformidade, auditoria de logs e segurança.',
    isSystem: false,
    permissions: ['dashboard.view', 'logs.view', 'permissions.view'],
    createdAt: '2026-01-15T14:00:00.000Z',
    updatedAt: '2026-01-15T14:00:00.000Z',
  },
];

let usersSeed: User[] = [
  {
    id: 'usr-1',
    name: 'Carlos Eduardo Nogueira',
    email: 'admin@empresa.com',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    roles: ['role-admin'],
    lastLoginAt: '2026-08-19T14:30:00.000Z',
    lastLoginIp: '189.28.12.44',
    emailVerifiedAt: '2026-01-10T08:05:00.000Z',
    twoFactorEnabled: true,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-08-19T14:30:00.000Z',
  },
  {
    id: 'usr-2',
    name: 'Mariana Rios Albuquerque',
    email: 'gerente@empresa.com',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    roles: ['role-manager'],
    lastLoginAt: '2026-08-19T11:15:00.000Z',
    lastLoginIp: '177.105.88.23',
    emailVerifiedAt: '2026-01-11T09:35:00.000Z',
    twoFactorEnabled: false,
    createdAt: '2026-01-11T09:30:00.000Z',
    updatedAt: '2026-08-19T11:15:00.000Z',
  },
  {
    id: 'usr-3',
    name: 'Lucas Gabriel Silva',
    email: 'operador@empresa.com',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    roles: ['role-operator'],
    lastLoginAt: '2026-08-18T17:45:00.000Z',
    lastLoginIp: '191.240.11.90',
    emailVerifiedAt: '2026-01-12T10:20:00.000Z',
    twoFactorEnabled: false,
    createdAt: '2026-01-12T10:15:00.000Z',
    updatedAt: '2026-08-18T17:45:00.000Z',
  },
  {
    id: 'usr-4',
    name: 'Beatriz Vasconcelos Lima',
    email: 'auditor@empresa.com',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    roles: ['role-auditor'],
    lastLoginAt: '2026-08-19T09:10:00.000Z',
    lastLoginIp: '200.180.4.15',
    emailVerifiedAt: '2026-01-15T14:05:00.000Z',
    twoFactorEnabled: true,
    createdAt: '2026-01-15T14:00:00.000Z',
    updatedAt: '2026-08-19T09:10:00.000Z',
  },
  {
    id: 'usr-5',
    name: 'Rafael Mendes Peixoto',
    email: 'rafael@empresa.com',
    status: 'inactive',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    roles: ['role-operator'],
    lastLoginAt: '2026-07-22T16:00:00.000Z',
    lastLoginIp: '187.35.99.12',
    emailVerifiedAt: '2026-02-01T11:00:00.000Z',
    twoFactorEnabled: false,
    createdAt: '2026-02-01T11:00:00.000Z',
    updatedAt: '2026-07-22T16:00:00.000Z',
  },
  {
    id: 'usr-6',
    name: 'Juliana Castro Costa',
    email: 'juliana@empresa.com',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    roles: ['role-manager'],
    lastLoginAt: '2026-08-19T13:20:00.000Z',
    lastLoginIp: '179.182.204.6',
    emailVerifiedAt: '2026-03-10T14:00:00.000Z',
    twoFactorEnabled: false,
    createdAt: '2026-03-10T14:00:00.000Z',
    updatedAt: '2026-08-19T13:20:00.000Z',
  },
  {
    id: 'usr-7',
    name: 'Thiago Andrade Freitas',
    email: 'thiago@empresa.com',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    roles: ['role-operator'],
    lastLoginAt: '2026-08-19T08:50:00.000Z',
    lastLoginIp: '189.102.33.19',
    emailVerifiedAt: '2026-04-05T09:20:00.000Z',
    twoFactorEnabled: false,
    createdAt: '2026-04-05T09:20:00.000Z',
    updatedAt: '2026-08-19T08:50:00.000Z',
  },
];

let logsSeed: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'usr-1',
    userName: 'Carlos Eduardo Nogueira',
    userEmail: 'admin@empresa.com',
    action: 'login',
    module: 'auth',
    description: 'Autenticação bem-sucedida via credenciais (Sanctum Token emitido)',
    ipAddress: '189.28.12.44',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    details: { auth_method: 'password', remember: true },
    createdAt: '2026-08-19T14:30:00.000Z',
  },
  {
    id: 'log-2',
    userId: 'usr-1',
    userName: 'Carlos Eduardo Nogueira',
    userEmail: 'admin@empresa.com',
    action: 'status_changed',
    module: 'users',
    description: 'Status do usuário "Rafael Mendes Peixoto" alterado para "inativo"',
    ipAddress: '189.28.12.44',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    details: { target_user_id: 'usr-5', old_status: 'active', new_status: 'inactive' },
    createdAt: '2026-08-19T13:45:00.000Z',
  },
  {
    id: 'log-3',
    userId: 'usr-2',
    userName: 'Mariana Rios Albuquerque',
    userEmail: 'gerente@empresa.com',
    action: 'created',
    module: 'users',
    description: 'Novo usuário "Thiago Andrade Freitas" cadastrado com perfil Operador',
    ipAddress: '177.105.88.23',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
    details: { created_user_id: 'usr-7', role: 'operator' },
    createdAt: '2026-08-19T11:18:00.000Z',
  },
  {
    id: 'log-4',
    userId: 'usr-1',
    userName: 'Carlos Eduardo Nogueira',
    userEmail: 'admin@empresa.com',
    action: 'permission_modified',
    module: 'roles',
    description: 'Permissões do perfil "Gerente Operacional" atualizadas',
    ipAddress: '189.28.12.44',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { role_id: 'role-manager', added: ['logs.view'] },
    createdAt: '2026-08-18T16:20:00.000Z',
  },
  {
    id: 'log-5',
    userId: 'usr-4',
    userName: 'Beatriz Vasconcelos Lima',
    userEmail: 'auditor@empresa.com',
    action: 'login',
    module: 'auth',
    description: 'Autenticação de auditoria efetuada com validação 2FA',
    ipAddress: '200.180.4.15',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    details: { two_factor: 'verified' },
    createdAt: '2026-08-19T09:10:00.000Z',
  },
];

let systemSettings = {
  appName: 'Enterprise SaaS Core',
  companyName: 'TechCorp Solutions Brasil',
  supportEmail: 'suporte@empresa.com',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'DD/MM/YYYY HH:mm',
  sessionLifetimeMinutes: 120,
  passwordMinLength: 8,
  requireSpecialChars: true,
  requireTwoFactorForAdmins: true,
  enableAuditLogging: true,
  rateLimitPerMinute: 60,
};

let apiTokens: ApiToken[] = [
  {
    id: 'tok-1',
    userId: 'usr-1',
    name: 'CI/CD Deployment Token',
    token: 'sct_live_89f3a98e21ba3e18a9314c99a0082b',
    lastUsedAt: '2026-08-19T12:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
    abilities: ['*'],
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'tok-2',
    userId: 'usr-1',
    name: 'Mobile App Readonly Token',
    token: 'sct_live_55a29cc811e9f4a7c63190ab7110e5',
    lastUsedAt: '2026-08-19T14:10:00.000Z',
    expiresAt: null,
    abilities: ['users.view', 'reports.view'],
    createdAt: '2026-02-15T15:30:00.000Z',
  },
];

// Current active authenticated user ID (default to admin)
let currentAuthUserId = 'usr-1';

// Helper to resolve user with detailed roles and permissions
function resolveUser(user: User) {
  const userRoles = rolesSeed.filter((r) => user.roles.includes(r.id));
  const permissionsSet = new Set<string>();
  userRoles.forEach((r) => {
    r.permissions.forEach((p) => permissionsSet.add(p));
  });
  return {
    ...user,
    rolesDetails: userRoles,
    permissions: Array.from(permissionsSet),
  };
}

// Helper to record audit log
function recordLog(
  userId: string,
  action: ActivityLog['action'],
  module: ActivityLog['module'],
  description: string,
  details?: Record<string, any>,
  req?: Request
) {
  const user = usersSeed.find((u) => u.id === userId);
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    userId: userId || 'system',
    userName: user ? user.name : 'Sistema / Convidado',
    userEmail: user ? user.email : 'system@empresa.com',
    action,
    module,
    description,
    ipAddress: req?.ip || '189.28.12.44',
    userAgent: req?.headers['user-agent'] || 'Mozilla/5.0 Enterprise Browser',
    details,
    createdAt: new Date().toISOString(),
  };
  logsSeed.unshift(newLog);
  if (logsSeed.length > 200) logsSeed.pop();
  return newLog;
}

// Helper to build standardized API response
function successResponse<T>(res: Response, data: T, message?: string, meta?: any, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
}

function errorResponse(res: Response, message: string, errors?: Record<string, string[]>, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors || {},
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log all API requests for audit
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Powered-By', 'Laravel-Jetstream-Sanctum-Compatible-API');
    next();
  });

  // ==========================================
  // AUTHENTICATION & JETSTREAM / SANCTUM APIS
  // ==========================================

  // POST /api/v1/auth/login
  app.post('/api/v1/auth/login', (req: Request, res: Response) => {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Campos obrigatórios não preenchidos.', {
        email: !email ? ['O campo e-mail é obrigatório.'] : [],
        password: !password ? ['O campo senha é obrigatório.'] : [],
      }, 422);
    }

    const user = usersSeed.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return errorResponse(res, 'As credenciais fornecidas não conferem com nossos registros.', {
        email: ['E-mail ou senha incorretos.'],
      }, 422);
    }

    if (user.status !== 'active') {
      return errorResponse(res, 'Esta conta está inativa ou bloqueada. Contate o administrador.', {}, 403);
    }

    currentAuthUserId = user.id;
    user.lastLoginAt = new Date().toISOString();
    user.lastLoginIp = req.ip || '189.28.12.44';

    recordLog(user.id, 'login', 'auth', `Usuário ${user.name} efetuou login no sistema`, { remember: !!remember }, req);

    const token = `sanctum_tok_${Math.random().toString(36).substring(2)}${Date.now()}`;
    const fullUser = resolveUser(user);

    return successResponse(res, {
      user: fullUser,
      token,
      tokenType: 'Bearer',
      expiresIn: remember ? '30 days' : '2 hours',
    }, 'Login realizado com sucesso.');
  });

  // POST /api/v1/auth/register
  app.post('/api/v1/auth/register', (req: Request, res: Response) => {
    const { name, email, password, passwordConfirmation } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Erro de validação nos dados enviados.', {
        name: !name ? ['O campo nome é obrigatório.'] : [],
        email: !email ? ['O campo e-mail é obrigatório.'] : [],
        password: !password ? ['O campo senha é obrigatório.'] : [],
      }, 422);
    }

    if (password !== passwordConfirmation) {
      return errorResponse(res, 'A confirmação de senha não confere.', {
        passwordConfirmation: ['A confirmação de senha não coincide.'],
      }, 422);
    }

    if (usersSeed.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return errorResponse(res, 'Este e-mail já está em uso.', {
        email: ['O e-mail informado já possui cadastro.'],
      }, 422);
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      status: 'active',
      roles: ['role-operator'], // default role
      lastLoginAt: new Date().toISOString(),
      lastLoginIp: req.ip || '189.28.12.44',
      emailVerifiedAt: null,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usersSeed.unshift(newUser);
    currentAuthUserId = newUser.id;

    recordLog(newUser.id, 'created', 'auth', `Novo usuário ${newUser.name} registrado via auto-cadastro`, {}, req);

    const fullUser = resolveUser(newUser);
    const token = `sanctum_tok_${Math.random().toString(36).substring(2)}${Date.now()}`;

    return successResponse(res, {
      user: fullUser,
      token,
      tokenType: 'Bearer',
    }, 'Conta criada com sucesso.', undefined, 201);
  });

  // GET /api/v1/auth/user
  app.get('/api/v1/auth/user', (req: Request, res: Response) => {
    const user = usersSeed.find((u) => u.id === currentAuthUserId) || usersSeed[0];
    const fullUser = resolveUser(user);
    return successResponse(res, fullUser);
  });

  // PUT /api/v1/auth/profile (Update current logged-in user profile & avatar)
  app.put('/api/v1/auth/profile', (req: Request, res: Response) => {
    const userIndex = usersSeed.findIndex((u) => u.id === currentAuthUserId);
    if (userIndex === -1) {
      return errorResponse(res, 'Usuário autenticado não encontrado.', {}, 404);
    }

    const { name, email, avatar, twoFactorEnabled } = req.body;
    const user = usersSeed[userIndex];

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = usersSeed.some(
        (u) => u.id !== user.id && u.email.toLowerCase() === email.toLowerCase()
      );
      if (emailExists) {
        return errorResponse(res, 'Este e-mail já está sendo utilizado por outro usuário.', {
          email: ['O e-mail já existe no sistema.'],
        }, 422);
      }
    }

    const updatedUser: User = {
      ...user,
      name: name !== undefined ? name : user.name,
      email: email !== undefined ? email : user.email,
      avatar: avatar !== undefined ? avatar : user.avatar,
      twoFactorEnabled: twoFactorEnabled !== undefined ? twoFactorEnabled : user.twoFactorEnabled,
      updatedAt: new Date().toISOString(),
    };

    usersSeed[userIndex] = updatedUser;

    recordLog(
      updatedUser.id,
      'updated',
      'auth',
      `Perfil do usuário "${updatedUser.name}" atualizado (Jetstream Profile)`,
      { avatarChanged: avatar !== undefined },
      req
    );

    return successResponse(res, resolveUser(updatedUser), 'Perfil atualizado com sucesso.');
  });

  // POST /api/v1/auth/switch-demo-user (Allows quickly testing RBAC matrix in preview)
  app.post('/api/v1/auth/switch-demo-user', (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = usersSeed.find((u) => u.id === userId);
    if (!user) {
      return errorResponse(res, 'Usuário de demonstração não encontrado.', {}, 404);
    }
    currentAuthUserId = user.id;
    recordLog(user.id, 'login', 'auth', `Alternado para usuário demo "${user.name}" (${user.email})`, {}, req);
    const fullUser = resolveUser(user);
    return successResponse(res, fullUser, `Perfil alterado para ${user.name}`);
  });

  // POST /api/v1/auth/logout
  app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
    const user = usersSeed.find((u) => u.id === currentAuthUserId);
    if (user) {
      recordLog(user.id, 'logout', 'auth', `Usuário ${user.name} efetuou logout`, {}, req);
    }
    return successResponse(res, null, 'Sessão encerrada com sucesso.');
  });

  // POST /api/v1/auth/sessions/terminate-others
  app.post('/api/v1/auth/sessions/terminate-others', (req: Request, res: Response) => {
    const user = usersSeed.find((u) => u.id === currentAuthUserId);
    if (user) {
      recordLog(user.id, 'status_changed', 'auth', `Usuário encerrou todas as outras sessões ativas`, {}, req);
    }
    return successResponse(res, null, 'Todas as outras sessões foram desconectadas.');
  });

  // ==========================================
  // USERS CRUD & MANAGEMENT APIS
  // ==========================================

  // GET /api/v1/users (with search, status filter, role filter, sort & pagination)
  app.get('/api/v1/users', (req: Request, res: Response) => {
    const {
      search = '',
      status = '',
      role = '',
      sortColumn = 'createdAt',
      sortDirection = 'desc',
      page = '1',
      perPage = '10',
    } = req.query as Record<string, string>;

    let filtered = usersSeed.map((u) => resolveUser(u));

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (status && status !== 'all') {
      filtered = filtered.filter((u) => u.status === status);
    }

    // Role filter
    if (role && role !== 'all') {
      filtered = filtered.filter((u) => u.roles.includes(role) || u.rolesDetails?.some((r) => r.name === role));
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      let valA = a[sortColumn] ?? '';
      let valB = b[sortColumn] ?? '';
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(perPage, 10) || 10;
    const total = filtered.length;
    const lastPage = Math.ceil(total / perPageNum) || 1;
    const from = (pageNum - 1) * perPageNum;
    const to = from + perPageNum;
    const paginated = filtered.slice(from, to);

    return successResponse(res, paginated, undefined, {
      currentPage: pageNum,
      lastPage,
      perPage: perPageNum,
      total,
      from: total > 0 ? from + 1 : 0,
      to: Math.min(to, total),
    });
  });

  // GET /api/v1/users/:id
  app.get('/api/v1/users/:id', (req: Request, res: Response) => {
    const user = usersSeed.find((u) => u.id === req.params.id);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado.', {}, 404);
    }
    return successResponse(res, resolveUser(user));
  });

  // POST /api/v1/users
  app.post('/api/v1/users', (req: Request, res: Response) => {
    const { name, email, roles, status = 'active', password, avatar } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Dados inválidos.', {
        name: !name ? ['O nome do usuário é obrigatório.'] : [],
        email: !email ? ['O e-mail é obrigatório.'] : [],
      }, 422);
    }

    if (usersSeed.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return errorResponse(res, 'Já existe um usuário com este e-mail.', {
        email: ['Este e-mail já está cadastrado.'],
      }, 422);
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      avatar: avatar || undefined,
      status: status || 'active',
      roles: Array.isArray(roles) && roles.length > 0 ? roles : ['role-operator'],
      lastLoginAt: null,
      lastLoginIp: null,
      emailVerifiedAt: new Date().toISOString(),
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    usersSeed.unshift(newUser);

    recordLog(
      currentAuthUserId,
      'created',
      'users',
      `Usuário "${newUser.name}" (${newUser.email}) cadastrado`,
      { user_id: newUser.id, roles: newUser.roles, hasAvatar: !!avatar },
      req
    );

    return successResponse(res, resolveUser(newUser), 'Usuário criado com sucesso.', undefined, 201);
  });

  // PUT /api/v1/users/:id
  app.put('/api/v1/users/:id', (req: Request, res: Response) => {
    const index = usersSeed.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 'Usuário não encontrado.', {}, 404);
    }

    const { name, email, roles, status, avatar } = req.body;

    if (email) {
      const emailExists = usersSeed.some(
        (u) => u.id !== req.params.id && u.email.toLowerCase() === email.toLowerCase()
      );
      if (emailExists) {
        return errorResponse(res, 'Este e-mail já está sendo utilizado por outro usuário.', {
          email: ['O e-mail já existe no sistema.'],
        }, 422);
      }
    }

    const existing = usersSeed[index];
    const updated: User = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      email: email !== undefined ? email : existing.email,
      avatar: avatar !== undefined ? avatar : existing.avatar,
      roles: Array.isArray(roles) ? roles : existing.roles,
      status: status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    usersSeed[index] = updated;

    recordLog(
      currentAuthUserId,
      'updated',
      'users',
      `Dados do usuário "${updated.name}" atualizados`,
      { user_id: updated.id, changes: req.body },
      req
    );

    return successResponse(res, resolveUser(updated), 'Usuário atualizado com sucesso.');
  });

  // PATCH /api/v1/users/:id/status
  app.patch('/api/v1/users/:id/status', (req: Request, res: Response) => {
    const user = usersSeed.find((u) => u.id === req.params.id);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado.', {}, 404);
    }

    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return errorResponse(res, 'Status inválido.', {}, 422);
    }

    const oldStatus = user.status;
    user.status = status;
    user.updatedAt = new Date().toISOString();

    recordLog(
      currentAuthUserId,
      'status_changed',
      'users',
      `Status do usuário "${user.name}" alterado de "${oldStatus}" para "${status}"`,
      { oldStatus, status },
      req
    );

    return successResponse(res, resolveUser(user), `Status alterado para ${status}.`);
  });

  // POST /api/v1/users/:id/reset-password
  app.post('/api/v1/users/:id/reset-password', (req: Request, res: Response) => {
    const user = usersSeed.find((u) => u.id === req.params.id);
    if (!user) {
      return errorResponse(res, 'Usuário não encontrado.', {}, 404);
    }

    recordLog(
      currentAuthUserId,
      'password_reset',
      'users',
      `Senha do usuário "${user.name}" foi redefinida pelo administrador`,
      { user_id: user.id },
      req
    );

    return successResponse(res, null, `Instruções de redefinição de senha enviadas para ${user.email}.`);
  });

  // DELETE /api/v1/users/:id
  app.delete('/api/v1/users/:id', (req: Request, res: Response) => {
    const index = usersSeed.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 'Usuário não encontrado.', {}, 404);
    }

    const user = usersSeed[index];

    // Safety policy check: prevent deleting oneself
    if (user.id === currentAuthUserId) {
      return errorResponse(res, 'Você não pode excluir sua própria conta enquanto estiver conectado.', {}, 403);
    }

    usersSeed.splice(index, 1);

    recordLog(
      currentAuthUserId,
      'deleted',
      'users',
      `Usuário "${user.name}" (${user.email}) foi excluído`,
      { deleted_user_id: user.id },
      req
    );

    return successResponse(res, null, 'Usuário excluído com sucesso.');
  });

  // ==========================================
  // ROLES & PERMISSIONS APIS
  // ==========================================

  // GET /api/v1/roles
  app.get('/api/v1/roles', (req: Request, res: Response) => {
    const enrichedRoles = rolesSeed.map((r) => ({
      ...r,
      usersCount: usersSeed.filter((u) => u.roles.includes(r.id) || u.roles.includes(r.name)).length,
    }));
    return successResponse(res, enrichedRoles);
  });

  // POST /api/v1/roles
  app.post('/api/v1/roles', (req: Request, res: Response) => {
    const { name, label, description, permissions } = req.body;

    if (!name || !label) {
      return errorResponse(res, 'Nome e identificador do perfil são obrigatórios.', {
        label: !label ? ['O nome do perfil é obrigatório.'] : [],
        name: !name ? ['O identificador técnico do perfil é obrigatório.'] : [],
      }, 422);
    }

    const cleanName = name.toLowerCase().replace(/\s+/g, '_');
    if (rolesSeed.some((r) => r.name === cleanName)) {
      return errorResponse(res, 'Já existe um perfil com esse identificador.', {
        name: ['Identificador já em uso.'],
      }, 422);
    }

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: cleanName,
      label,
      description: description || '',
      isSystem: false,
      permissions: Array.isArray(permissions) ? permissions : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rolesSeed.push(newRole);

    recordLog(
      currentAuthUserId,
      'created',
      'roles',
      `Perfil "${newRole.label}" criado com ${newRole.permissions.length} permissões`,
      { role_id: newRole.id },
      req
    );

    return successResponse(res, newRole, 'Perfil criado com sucesso.', undefined, 201);
  });

  // PUT /api/v1/roles/:id
  app.put('/api/v1/roles/:id', (req: Request, res: Response) => {
    const role = rolesSeed.find((r) => r.id === req.params.id);
    if (!role) {
      return errorResponse(res, 'Perfil não encontrado.', {}, 404);
    }

    const { label, description, permissions } = req.body;

    role.label = label || role.label;
    role.description = description !== undefined ? description : role.description;
    if (Array.isArray(permissions)) {
      role.permissions = permissions;
    }
    role.updatedAt = new Date().toISOString();

    recordLog(
      currentAuthUserId,
      'permission_modified',
      'roles',
      `Permissões do perfil "${role.label}" foram alteradas`,
      { role_id: role.id, permissions_count: role.permissions.length },
      req
    );

    return successResponse(res, role, 'Perfil atualizado com sucesso.');
  });

  // DELETE /api/v1/roles/:id
  app.delete('/api/v1/roles/:id', (req: Request, res: Response) => {
    const index = rolesSeed.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 'Perfil não encontrado.', {}, 404);
    }

    const role = rolesSeed[index];
    if (role.isSystem) {
      return errorResponse(res, 'Perfis nativos do sistema não podem ser excluídos.', {}, 403);
    }

    rolesSeed.splice(index, 1);

    recordLog(
      currentAuthUserId,
      'deleted',
      'roles',
      `Perfil "${role.label}" foi excluído`,
      { role_id: role.id },
      req
    );

    return successResponse(res, null, 'Perfil excluído com sucesso.');
  });

  // GET /api/v1/permissions
  app.get('/api/v1/permissions', (req: Request, res: Response) => {
    return successResponse(res, permissionsSeed);
  });

  // ==========================================
  // AUDIT LOGS APIS
  // ==========================================

  // GET /api/v1/logs
  app.get('/api/v1/logs', (req: Request, res: Response) => {
    const {
      module = '',
      action = '',
      search = '',
      page = '1',
      perPage = '15',
    } = req.query as Record<string, string>;

    let filtered = [...logsSeed];

    if (module && module !== 'all') {
      filtered = filtered.filter((l) => l.module === module);
    }

    if (action && action !== 'all') {
      filtered = filtered.filter((l) => l.action === action);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.userEmail.toLowerCase().includes(q) ||
          l.ipAddress.includes(q)
      );
    }

    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(perPage, 10) || 15;
    const total = filtered.length;
    const lastPage = Math.ceil(total / perPageNum) || 1;
    const from = (pageNum - 1) * perPageNum;
    const to = from + perPageNum;

    return successResponse(res, filtered.slice(from, to), undefined, {
      currentPage: pageNum,
      lastPage,
      perPage: perPageNum,
      total,
      from: total > 0 ? from + 1 : 0,
      to: Math.min(to, total),
    });
  });

  // ==========================================
  // DASHBOARD METRICS API
  // ==========================================

  // GET /api/v1/dashboard/metrics
  app.get('/api/v1/dashboard/metrics', (req: Request, res: Response) => {
    const totalUsers = usersSeed.length;
    const activeUsers = usersSeed.filter((u) => u.status === 'active').length;
    const inactiveUsers = usersSeed.filter((u) => u.status === 'inactive').length;
    const totalRoles = rolesSeed.length;
    const activePercentage = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    const registrationsOverTime = [
      { date: 'Jan', users: 12, active: 10 },
      { date: 'Fev', users: 18, active: 15 },
      { date: 'Mar', users: 25, active: 22 },
      { date: 'Abr', users: 34, active: 30 },
      { date: 'Mai', users: 48, active: 42 },
      { date: 'Jun', users: 59, active: 53 },
      { date: 'Jul', users: 71, active: 65 },
      { date: 'Ago', users: 84, active: 78 },
    ];

    const usersByRole = rolesSeed.map((r, idx) => {
      const count = usersSeed.filter((u) => u.roles.includes(r.id) || u.roles.includes(r.name)).length;
      const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];
      return {
        role: r.label,
        count,
        color: colors[idx % colors.length],
      };
    });

    const activityByModule = [
      { module: 'Autenticação', count: logsSeed.filter((l) => l.module === 'auth').length },
      { module: 'Usuários', count: logsSeed.filter((l) => l.module === 'users').length },
      { module: 'Perfis/RBAC', count: logsSeed.filter((l) => l.module === 'roles').length },
      { module: 'Configurações', count: logsSeed.filter((l) => l.module === 'settings').length },
    ];

    return successResponse(res, {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRoles,
      recentLoginsCount: logsSeed.filter((l) => l.action === 'login').length,
      usersGrowthPercentage: 24.8,
      activePercentage,
      registrationsOverTime,
      usersByRole,
      activityByModule,
      recentUsers: usersSeed.slice(0, 5).map((u) => resolveUser(u)),
      recentActivities: logsSeed.slice(0, 6),
    });
  });

  // ==========================================
  // SETTINGS & API TOKENS APIS
  // ==========================================

  app.get('/api/v1/settings', (req: Request, res: Response) => {
    return successResponse(res, systemSettings);
  });

  app.put('/api/v1/settings', (req: Request, res: Response) => {
    systemSettings = { ...systemSettings, ...req.body };
    recordLog(
      currentAuthUserId,
      'updated',
      'settings',
      'Parâmetros gerais de segurança e sistema atualizados',
      req.body,
      req
    );
    return successResponse(res, systemSettings, 'Configurações atualizadas com sucesso.');
  });

  app.get('/api/v1/api-tokens', (req: Request, res: Response) => {
    return successResponse(res, apiTokens);
  });

  app.post('/api/v1/api-tokens', (req: Request, res: Response) => {
    const { name, abilities } = req.body;
    if (!name) {
      return errorResponse(res, 'Nome do token é obrigatório.', { name: ['O nome do token é obrigatório.'] }, 422);
    }
    const newToken: ApiToken = {
      id: `tok-${Date.now()}`,
      userId: currentAuthUserId,
      name,
      token: `sct_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      lastUsedAt: null,
      expiresAt: null,
      abilities: Array.isArray(abilities) ? abilities : ['*'],
      createdAt: new Date().toISOString(),
    };
    apiTokens.push(newToken);
    recordLog(currentAuthUserId, 'created', 'settings', `Novo token de API "${name}" gerado via Sanctum`, {}, req);
    return successResponse(res, newToken, 'Token de API gerado com sucesso.', undefined, 201);
  });

  app.delete('/api/v1/api-tokens/:id', (req: Request, res: Response) => {
    const index = apiTokens.findIndex((t) => t.id === req.params.id);
    if (index !== -1) {
      const tok = apiTokens[index];
      apiTokens.splice(index, 1);
      recordLog(currentAuthUserId, 'deleted', 'settings', `Token de API "${tok.name}" revogado`, {}, req);
    }
    return successResponse(res, null, 'Token revogado com sucesso.');
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      framework: 'Laravel 11 Jetstream + Sanctum Compatible Engine',
      environment: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
    });
  });

  // Vite middleware for development or Static bundle for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Enterprise SaaS Core dev server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
