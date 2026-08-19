export interface LaravelFile {
  path: string;
  category: 'controller' | 'model' | 'policy' | 'request' | 'resource' | 'migration' | 'seeder' | 'routes' | 'test' | 'config';
  title: string;
  description: string;
  code: string;
}

export const laravelCodebase: LaravelFile[] = [
  {
    path: 'app/Http/Controllers/Api/UserController.php',
    category: 'controller',
    title: 'UserController.php',
    description: 'Controller REST com injeção de UserService, Policies, FormRequests e API Resources padronizados.',
    code: `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Http\\Requests\\User\\StoreUserRequest;
use App\\Http\\Requests\\User\\UpdateUserRequest;
use App\\Http\\Resources\\UserResource;
use App\\Models\\User;
use App\\Services\\UserService;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Http\\Resources\\Json\\AnonymousResourceCollection;

class UserController extends Controller
{
    protected UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
        $this->authorizeResource(User::class, 'user');
    }

    /**
     * Display a paginated listing of users with search, role and status filters.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $users = $this->userService->getPaginatedUsers(
            search: $request->query('search'),
            status: $request->query('status'),
            role: $request->query('role'),
            sortColumn: $request->query('sortColumn', 'created_at'),
            sortDirection: $request->query('sortDirection', 'desc'),
            perPage: (int) $request->query('perPage', 10)
        );

        return UserResource::collection($users);
    }

    /**
     * Store a newly created user in storage with role assignment & audit log.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser(
            data: $request->validated(),
            creator: $request->user()
        );

        return (new UserResource($user))
            ->additional([
                'success' => true,
                'message' => __('Usuário criado com sucesso.'),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified user details.
     */
    public function show(User $user): UserResource
    {
        $user->load(['roles.permissions']);
        return new UserResource($user);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $updatedUser = $this->userService->updateUser(
            user: $user,
            data: $request->validated(),
            updater: $request->user()
        );

        return (new UserResource($updatedUser))
            ->additional([
                'success' => true,
                'message' => __('Usuário atualizado com sucesso.'),
            ])
            ->response();
    }

    /**
     * Update user active status.
     */
    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $this->authorize('updateStatus', $user);

        $request->validate([
            'status' => ['required', 'string', 'in:active,inactive,suspended'],
        ]);

        $this->userService->changeStatus($user, $request->status, $request->user());

        return response()->json([
            'success' => true,
            'message' => __('Status do usuário atualizado com sucesso.'),
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->userService->deleteUser($user, $request->user());

        return response()->json([
            'success' => true,
            'message' => __('Usuário excluído com sucesso.'),
            'data' => null,
        ]);
    }
}
`,
  },
  {
    path: 'app/Models/User.php',
    category: 'model',
    title: 'User.php',
    description: 'Model User com Laravel Jetstream, Sanctum Two-Factor Authentication e Spatie/Custom RBAC.',
    code: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsToMany;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Database\\Eloquent\\SoftDeletes;
use Illuminate\\Foundation\\Auth\\User as Authenticatable;
use Illuminate\\Notifications\\Notifiable;
use Laravel\\Fortify\\TwoFactorAuthenticatable;
use Laravel\\Jetstream\\HasProfilePhoto;
use Laravel\\Sanctum\\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;
    use HasProfilePhoto;
    use Notifiable;
    use TwoFactorAuthenticatable;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'last_login_at',
        'last_login_ip',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_recovery_codes',
        'two_factor_secret',
    ];

    protected $appends = [
        'profile_photo_url',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user')->withTimestamps();
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function hasRole(string|array $roles): bool
    {
        if (is_string($roles)) {
            return $this->roles->contains('name', $roles);
        }

        return $this->roles->whereIn('name', $roles)->isNotEmpty();
    }

    public function hasPermission(string $permission): bool
    {
        // Administrador tem super-permissão total
        if ($this->hasRole('admin')) {
            return true;
        }

        return $this->roles->flatMap->permissions->contains('name', $permission);
    }

    public function getAllPermissions(): array
    {
        if ($this->hasRole('admin')) {
            return Permission::pluck('name')->toArray();
        }

        return $this->roles->flatMap->permissions->pluck('name')->unique()->values()->toArray();
    }
}
`,
  },
  {
    path: 'app/Policies/UserPolicy.php',
    category: 'policy',
    title: 'UserPolicy.php',
    description: 'Policy Laravel para autorização granular de todas as ações de usuários via Gates/Roles.',
    code: `<?php

namespace App\\Policies;

use App\\Models\\User;
use Illuminate\\Auth\\Access\\HandlesAuthorization;
use Illuminate\\Auth\\Access\\Response;

class UserPolicy
{
    use HandlesAuthorization;

    /**
     * Super-Admin bypass before all checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasPermission('users.view');
    }

    public function view(User $user, User $model): bool
    {
        return $user->hasPermission('users.view') || $user->id === $model->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('users.create');
    }

    public function update(User $user, User $model): bool
    {
        return $user->hasPermission('users.edit') || $user->id === $model->id;
    }

    public function updateStatus(User $user, User $model): Response
    {
        if (!$user->hasPermission('users.status')) {
            return Response::deny(__('Você não possui permissão para alterar o status de usuários.'));
        }

        if ($user->id === $model->id) {
            return Response::deny(__('Você não pode desativar seu próprio usuário.'));
        }

        return Response::allow();
    }

    public function delete(User $user, User $model): Response
    {
        if (!$user->hasPermission('users.delete')) {
            return Response::deny(__('Você não possui permissão para excluir usuários.'));
        }

        if ($user->id === $model->id) {
            return Response::deny(__('Você não pode excluir sua própria conta enquanto estiver conectado.'));
        }

        if ($model->hasRole('admin') && !$user->hasRole('admin')) {
            return Response::deny(__('Apenas administradores podem excluir outros administradores.'));
        }

        return Response::allow();
    }
}
`,
  },
  {
    path: 'app/Http/Requests/User/StoreUserRequest.php',
    category: 'request',
    title: 'StoreUserRequest.php',
    description: 'Form Request com validação estrita, mensagens customizadas e sanitização.',
    code: `<?php

namespace App\\Http\\Requests\\User;

use Illuminate\\Foundation\\Http\\FormRequest;
use Illuminate\\Validation\\Rules\\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \\App\\Models\\User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'status' => ['nullable', 'string', 'in:active,inactive,suspended'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'string', 'exists:roles,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome do usuário é obrigatório.',
            'name.min' => 'O nome deve ter no mínimo 3 caracteres.',
            'email.required' => 'O endereço de e-mail é obrigatório.',
            'email.unique' => 'Este e-mail já está cadastrado no sistema.',
            'password.required' => 'A senha de acesso é obrigatória.',
            'roles.required' => 'Selecione pelo menos um perfil para o usuário.',
            'roles.min' => 'Selecione pelo menos um perfil de acesso.',
        ];
    }
}
`,
  },
  {
    path: 'app/Http/Resources/UserResource.php',
    category: 'resource',
    title: 'UserResource.php',
    description: 'API Resource estruturado que encapsula dados de usuários e serializa permissões calculadas.',
    code: `<?php

namespace App\\Http\\Resources;

use Illuminate\\Http\\Request;
use Illuminate\\Http\\Resources\\Json\\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status ?? 'active',
            'avatar' => $this->profile_photo_url,
            'roles' => $this->roles->pluck('name'),
            'rolesDetails' => RoleResource::collection($this->whenLoaded('roles')),
            'permissions' => $this->getAllPermissions(),
            'twoFactorEnabled' => !is_null($this->two_factor_secret),
            'lastLoginAt' => $this->last_login_at?->toISOString(),
            'lastLoginIp' => $this->last_login_ip,
            'emailVerifiedAt' => $this->email_verified_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
`,
  },
  {
    path: 'app/Services/UserService.php',
    category: 'model',
    title: 'UserService.php',
    description: 'Camada de Serviço responsável pela regra de negócio, transações de banco e auditoria.',
    code: `<?php

namespace App\\Services;

use App\\Models\\ActivityLog;
use App\\Models\\User;
use Illuminate\\Contracts\\Pagination\\LengthAwarePaginator;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Hash;

class UserService
{
    public function getPaginatedUsers(
        ?string $search = null,
        ?string $status = null,
        ?string $role = null,
        string $sortColumn = 'created_at',
        string $sortDirection = 'desc',
        int $perPage = 10
    ): LengthAwarePaginator {
        return User::query()
            ->with(['roles.permissions'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($role && $role !== 'all', function ($q) use ($role) {
                $q->whereHas('roles', fn ($r) => $r->where('name', $role)->orWhere('id', $role));
            })
            ->orderBy($sortColumn, $sortDirection)
            ->paginate($perPage);
    }

    public function createUser(array $data, ?User $creator = null): User
    {
        return DB::transaction(function () use ($data, $creator) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'status' => $data['status'] ?? 'active',
            ]);

            if (!empty($data['roles'])) {
                $user->roles()->sync($data['roles']);
            }

            ActivityLog::create([
                'user_id' => $creator?->id,
                'action' => 'created',
                'module' => 'users',
                'description' => "Usuário \\"{$user->name}\\" ({$user->email}) cadastrado com sucesso",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'details' => ['user_id' => $user->id, 'roles' => $data['roles'] ?? []],
            ]);

            return $user->load('roles.permissions');
        });
    }

    public function updateUser(User $user, array $data, ?User $updater = null): User
    {
        return DB::transaction(function () use ($user, $data, $updater) {
            $updateFields = [
                'name' => $data['name'] ?? $user->name,
                'email' => $data['email'] ?? $user->email,
                'status' => $data['status'] ?? $user->status,
            ];

            if (!empty($data['password'])) {
                $updateFields['password'] = Hash::make($data['password']);
            }

            $user->update($updateFields);

            if (isset($data['roles'])) {
                $user->roles()->sync($data['roles']);
            }

            ActivityLog::create([
                'user_id' => $updater?->id,
                'action' => 'updated',
                'module' => 'users',
                'description' => "Dados do usuário \\"{$user->name}\\" atualizados",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            return $user->fresh(['roles.permissions']);
        });
    }

    public function changeStatus(User $user, string $status, ?User $actor = null): void
    {
        $old = $user->status;
        $user->update(['status' => $status]);

        ActivityLog::create([
            'user_id' => $actor?->id,
            'action' => 'status_changed',
            'module' => 'users',
            'description' => "Status do usuário \\"{$user->name}\\" alterado de {$old} para {$status}",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public function deleteUser(User $user, ?User $actor = null): void
    {
        DB::transaction(function () use ($user, $actor) {
            ActivityLog::create([
                'user_id' => $actor?->id,
                'action' => 'deleted',
                'module' => 'users',
                'description' => "Usuário \\"{$user->name}\\" ({$user->email}) foi excluído",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            $user->delete();
        });
    }
}
`,
  },
  {
    path: 'database/migrations/2026_01_01_000001_create_rbac_and_activity_tables.php',
    category: 'migration',
    title: 'create_rbac_and_activity_tables.php',
    description: 'Migration completa para tabelas de usuários, roles, permissions, pivots e logs de auditoria.',
    code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g. 'admin', 'manager'
            $table->string('label'); // e.g. 'Administrador'
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        // 2. Permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g. 'users.create'
            $table->string('label'); // e.g. 'Criar Usuários'
            $table->string('module'); // e.g. 'users'
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 3. Role-Permission pivot
        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        // 4. User-Role pivot
        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'role_id']);
            $table->timestamps();
        });

        // 5. Activity Logs table
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // created, updated, deleted, login, etc.
            $table->string('module'); // users, auth, roles, settings
            $table->text('description');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('details')->nullable();
            $table->timestamps();

            $table->index(['module', 'action']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
`,
  },
  {
    path: 'database/seeders/RbacDatabaseSeeder.php',
    category: 'seeder',
    title: 'RbacDatabaseSeeder.php',
    description: 'Seeder completo que provisiona perfis base, permissões modulares e o usuário administrador.',
    code: `<?php

namespace Database\\Seeders;

use App\\Models\\Permission;
use App\\Models\\Role;
use App\\Models\\User;
use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\Hash;

class RbacDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Cadastrar Permissões
        $permissions = [
            // Dashboard
            ['name' => 'dashboard.view', 'label' => 'Visualizar Dashboard', 'module' => 'dashboard'],
            // Usuários
            ['name' => 'users.view', 'label' => 'Visualizar Usuários', 'module' => 'users'],
            ['name' => 'users.create', 'label' => 'Criar Usuários', 'module' => 'users'],
            ['name' => 'users.edit', 'label' => 'Editar Usuários', 'module' => 'users'],
            ['name' => 'users.delete', 'label' => 'Excluir Usuários', 'module' => 'users'],
            ['name' => 'users.status', 'label' => 'Alterar Status de Usuários', 'module' => 'users'],
            // Perfis
            ['name' => 'roles.view', 'label' => 'Visualizar Perfis', 'module' => 'roles'],
            ['name' => 'roles.create', 'label' => 'Criar Perfis', 'module' => 'roles'],
            ['name' => 'roles.edit', 'label' => 'Editar Perfis', 'module' => 'roles'],
            ['name' => 'roles.delete', 'label' => 'Excluir Perfis', 'module' => 'roles'],
            // Matriz
            ['name' => 'permissions.view', 'label' => 'Visualizar Permissões', 'module' => 'permissions'],
            // Relatórios & Logs
            ['name' => 'reports.view', 'label' => 'Visualizar Relatórios', 'module' => 'reports'],
            ['name' => 'logs.view', 'label' => 'Visualizar Logs de Auditoria', 'module' => 'logs'],
            // Configurações
            ['name' => 'settings.view', 'label' => 'Visualizar Configurações', 'module' => 'settings'],
            ['name' => 'settings.edit', 'label' => 'Editar Configurações', 'module' => 'settings'],
        ];

        $createdPermissions = [];
        foreach ($permissions as $perm) {
            $createdPermissions[$perm['name']] = Permission::updateOrCreate(
                ['name' => $perm['name']],
                $perm
            );
        }

        // 2. Cadastrar Perfis
        $adminRole = Role::updateOrCreate(
            ['name' => 'admin'],
            [
                'label' => 'Administrador',
                'description' => 'Acesso irrestrito a todas as áreas e módulos.',
                'is_system' => true,
            ]
        );
        $adminRole->permissions()->sync(Permission::pluck('id'));

        $managerRole = Role::updateOrCreate(
            ['name' => 'manager'],
            [
                'label' => 'Gerente Operacional',
                'description' => 'Gerenciamento de usuários e consulta de relatórios.',
                'is_system' => false,
            ]
        );
        $managerRole->permissions()->sync(
            Permission::whereIn('name', [
                'dashboard.view',
                'users.view',
                'users.create',
                'users.edit',
                'users.status',
                'reports.view',
                'logs.view',
            ])->pluck('id')
        );

        $operatorRole = Role::updateOrCreate(
            ['name' => 'operator'],
            [
                'label' => 'Operador',
                'description' => 'Acesso operacional a dashboards e relatórios básicos.',
                'is_system' => false,
            ]
        );
        $operatorRole->permissions()->sync(
            Permission::whereIn('name', [
                'dashboard.view',
                'users.view',
                'reports.view',
            ])->pluck('id')
        );

        // 3. Cadastrar Administrador Inicial
        $adminUser = User::firstOrCreate(
            ['email' => env('INITIAL_ADMIN_EMAIL', 'admin@empresa.com')],
            [
                'name' => 'Administrador do Sistema',
                'password' => Hash::make(env('INITIAL_ADMIN_PASSWORD', 'Admin@2026!Secure')),
                'email_verified_at' => now(),
                'status' => 'active',
            ]
        );
        $adminUser->roles()->sync([$adminRole->id]);
    }
}
`,
  },
  {
    path: 'routes/api.php',
    category: 'routes',
    title: 'routes/api.php',
    description: 'Rotas da API protegidas por Sanctum, com versionamento e rate-limiting.',
    code: `<?php

use App\\Http\\Controllers\\Api\\ActivityLogController;
use App\\Http\\Controllers\\Api\\AuthController;
use App\\Http\\Controllers\\Api\\DashboardController;
use App\\Http\\Controllers\\Api\\PermissionController;
use App\\Http\\Controllers\\Api\\RoleController;
use App\\Http\\Controllers\\Api\\SettingController;
use App\\Http\\Controllers\\Api\\UserController;
use Illuminate\\Support\\Facades\\Route;

Route::prefix('v1')->group(function () {
    // Rotas públicas de autenticação
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    });

    // Rotas autenticadas protegidas por Sanctum
    Route::middleware(['auth:sanctum'])->group(function () {
        // Sessão do Usuário
        Route::get('/auth/user', [AuthController::class, 'user']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/sessions/terminate-others', [AuthController::class, 'terminateOtherSessions']);

        // Dashboard
        Route::get('/dashboard/metrics', [DashboardController::class, 'metrics']);

        // Gestão de Usuários
        Route::apiResource('users', UserController::class);
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);

        // Perfis e Permissões
        Route::apiResource('roles', RoleController::class);
        Route::get('/permissions', [PermissionController::class, 'index']);

        // Logs de Auditoria
        Route::get('/logs', [ActivityLogController::class, 'index']);

        // Configurações
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
    });
});
`,
  },
  {
    path: 'tests/Feature/UserManagementTest.php',
    category: 'test',
    title: 'UserManagementTest.php',
    description: 'Testes automatizados completos de autenticação, autorização de telas e CRUD de usuários.',
    code: `<?php

namespace Tests\\Feature;

use App\\Models\\Role;
use App\\Models\\User;
use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Laravel\\Sanctum\\Sanctum;
use Tests\\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\\Database\\Seeders\\RbacDatabaseSeeder::class);
    }

    public function test_unauthenticated_user_cannot_access_users_endpoint(): void
    {
        $response = $this->getJson('/api/v1/users');
        $response->assertStatus(401);
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::where('email', 'admin@empresa.com')->first();
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email', 'status', 'roles', 'permissions'],
                ],
                'meta' => ['currentPage', 'total'],
            ]);
    }

    public function test_operator_without_permission_cannot_create_user(): void
    {
        $operator = User::factory()->create();
        $operatorRole = Role::where('name', 'operator')->first();
        $operator->roles()->attach($operatorRole);

        Sanctum::actingAs($operator);

        $payload = [
            'name' => 'Novo Usuário Teste',
            'email' => 'novo@teste.com',
            'password' => 'SenhaForte@2026',
            'roles' => [$operatorRole->id],
        ];

        $response = $this->postJson('/api/v1/users', $payload);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_user_and_it_generates_audit_log(): void
    {
        $admin = User::where('email', 'admin@empresa.com')->first();
        $managerRole = Role::where('name', 'manager')->first();
        Sanctum::actingAs($admin);

        $payload = [
            'name' => 'João Gerente Teste',
            'email' => 'joao.gerente@teste.com',
            'password' => 'Pass@2026!Strong',
            'status' => 'active',
            'roles' => [$managerRole->id],
        ];

        $response = $this->postJson('/api/v1/users', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'João Gerente Teste');

        $this->assertDatabaseHas('users', ['email' => 'joao.gerente@teste.com']);
        $this->assertDatabaseHas('activity_logs', [
            'module' => 'users',
            'action' => 'created',
        ]);
    }

    public function test_user_cannot_delete_themselves(): void
    {
        $admin = User::where('email', 'admin@empresa.com')->first();
        Sanctum::actingAs($admin);

        $response = $this->deleteJson("/api/v1/users/{$admin->id}");

        $response->assertStatus(403);
    }
}
`,
  },
];

export const laravelFiles = laravelCodebase.map((f, idx) => ({
  id: `file-${idx}`,
  path: f.path,
  category: f.category.toUpperCase(),
  title: f.title,
  description: f.description,
  content: f.code,
}));
