<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()->with('permissions')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => RoleResource::collection($roles),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:roles,name'],
            'label' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $role = Role::query()->create([
            'name' => $validated['name'],
            'label' => $validated['label'],
            'description' => $validated['description'] ?? null,
            'is_system' => false,
        ]);

        $permissionIds = Permission::query()
            ->whereIn('name', $validated['permissions'] ?? [])
            ->pluck('id')
            ->all();

        $role->permissions()->sync($permissionIds);

        return response()->json([
            'success' => true,
            'message' => __('Perfil criado com sucesso.'),
            'data' => new RoleResource($role->load('permissions')),
        ], 201);
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new RoleResource($role->load('permissions')),
        ]);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:100',
                'alpha_dash',
                Rule::unique('roles', 'name')->ignore($role->id),
            ],
            'label' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        $role->fill([
            'name' => $validated['name'] ?? $role->name,
            'label' => $validated['label'] ?? $role->label,
            'description' => array_key_exists('description', $validated)
                ? $validated['description']
                : $role->description,
        ])->save();

        if (array_key_exists('permissions', $validated)) {
            $permissionIds = Permission::query()
                ->whereIn('name', $validated['permissions'])
                ->pluck('id')
                ->all();

            $role->permissions()->sync($permissionIds);
        }

        return response()->json([
            'success' => true,
            'message' => __('Perfil atualizado com sucesso.'),
            'data' => new RoleResource($role->load('permissions')),
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->is_system) {
            return response()->json([
                'success' => false,
                'message' => __('Perfis de sistema não podem ser removidos.'),
            ], 422);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => __('Perfil excluído com sucesso.'),
            'data' => null,
        ]);
    }
}
