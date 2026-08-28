<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\Role; // <-- Importação do Model Role
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use RuntimeException;

class UserService
{
    /**
     * Map frontend sort keys to database columns.
     */
    private const SORTABLE_COLUMNS = [
        'id' => 'id',
        'name' => 'name',
        'email' => 'email',
        'dataNascimento' => 'data_nascimento',
        'status' => 'status',
        'lastLoginAt' => 'last_login_at',
        'createdAt' => 'created_at',
        'updatedAt' => 'updated_at',
        'created_at' => 'created_at',
        'updated_at' => 'updated_at',
        'last_login_at' => 'last_login_at',
    ];

    public function getPaginatedUsers(
        ?string $search = null,
        ?string $status = null,
        ?string $role = null,
        string $sortColumn = 'created_at',
        string $sortDirection = 'desc',
        int $perPage = 10
    ): LengthAwarePaginator {
        $resolvedSortColumn = self::SORTABLE_COLUMNS[$sortColumn] ?? 'created_at';
        $resolvedSortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $currentUser = Auth::user();
        $isLoggedAdmin = $currentUser instanceof User && $currentUser->hasRole('admin');

        return User::query()
            ->with(['roles.permissions'])
            ->when(!$isLoggedAdmin, function ($query) {
                $query->whereDoesntHave('roles', function ($q) {
                    $q->where('name', 'admin');
                });
            })
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
            ->orderBy($resolvedSortColumn, $resolvedSortDirection)
            ->paginate($perPage);
    }

    public function createUser(array $data, ?User $creator = null): User
    {
        return DB::transaction(function () use ($data, $creator) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'data_nascimento' => $data['data_nascimento'] ?? null,
                'avatar' => $data['avatar'] ?? null,
                'password' => Hash::make(Str::password(40)),
                'status' => $data['status'] ?? 'active',
            ]);

            if (!empty($data['roles'])) {
                // 1. AQUI: Filtra a role admin se quem está cadastrando não for admin
                $currentUser = Auth::user();
                $isLoggedAdmin = $currentUser instanceof User && $currentUser->hasRole('admin');
                $rolesToSync = $data['roles'];

                if (!$isLoggedAdmin) {
                    $adminRoleId = Role::where('name', 'admin')->value('id');
                    $rolesToSync = array_filter($rolesToSync, fn ($id) => $id != $adminRoleId && $id !== 'admin');
                }

                $user->roles()->sync($rolesToSync);
            }

            ActivityLog::create([
                'user_id' => $creator?->id,
                'action' => 'created',
                'module' => 'users',
                'description' => "Usuário \"{$user->name}\" ({$user->email}) cadastrado com sucesso",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'details' => ['user_id' => $user->id, 'roles' => $data['roles'] ?? []],
            ]);

            if (!$this->sendPasswordResetLink($user)) {
                throw new RuntimeException('Não foi possível enviar o convite de definição de senha.');
            }
            return $user->load('roles.permissions');
        });
    }

    public function sendPasswordResetLink(User $user): bool
    {
        return Password::sendResetLink(['email' => $user->email]) === Password::RESET_LINK_SENT;
    }

    public function updateUser(User $user, array $data, ?User $updater = null): User
    {
        return DB::transaction(function () use ($user, $data, $updater) {
            $updateFields = [
                'name' => array_key_exists('name', $data) ? $data['name'] : $user->name,
                'email' => array_key_exists('email', $data) ? $data['email'] : $user->email,
                'data_nascimento' => array_key_exists('data_nascimento', $data) ? $data['data_nascimento'] : $user->data_nascimento,
                'avatar' => array_key_exists('avatar', $data) ? $data['avatar'] : $user->avatar,
                'status' => array_key_exists('status', $data) ? $data['status'] : $user->status,
            ];

            if (!empty($data['password'])) {
                $updateFields['password'] = Hash::make($data['password']);
            }

            $user->update($updateFields);

            if (isset($data['roles'])) {
                // 2. AQUI: Filtra a role admin se quem está editando não for admin
                $currentUser = Auth::user();
                $isLoggedAdmin = $currentUser instanceof User && $currentUser->hasRole('admin');
                $rolesToSync = $data['roles'];

                if (!$isLoggedAdmin) {
                    $adminRoleId = Role::where('name', 'admin')->value('id');
                    $rolesToSync = array_filter($rolesToSync, fn ($id) => $id != $adminRoleId && $id !== 'admin');
                }

                $user->roles()->sync($rolesToSync);
            }

            ActivityLog::create([
                'user_id' => $updater?->id,
                'action' => 'updated',
                'module' => 'users',
                'description' => "Dados do usuário \"{$user->name}\" atualizados",
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
            'description' => "Status do usuário \"{$user->name}\" alterado de {$old} para {$status}",
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
                'description' => "Usuário \"{$user->name}\" ({$user->email}) foi excluído",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            $user->delete();
        });
    }
}