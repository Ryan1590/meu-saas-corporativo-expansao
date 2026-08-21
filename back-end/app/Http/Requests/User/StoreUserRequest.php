<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\User::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'data_nascimento' => ['nullable', 'date'],
            'avatar' => ['nullable', 'string'],
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
            'roles.required' => 'Selecione pelo menos um perfil para o usuário.',
            'roles.min' => 'Selecione pelo menos um perfil de acesso.',
        ];
    }
}
