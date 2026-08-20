<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use App\Http\Resources\RoleResource;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'avatar' => $this->avatar ?: $this->profile_photo_url,
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
    