<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $defaults = [
            'security.require_two_factor' => false,
            'security.password_expiration_days' => 90,
            'system.audit_retention_days' => 180,
        ];

        $stored = Setting::query()->get();
        $settings = $defaults;

        foreach ($stored as $item) {
            $settings[$item->key] = $this->decodeValue($item->value, $item->type);
        }

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $payload = $request->input('settings');

        if (!is_array($payload)) {
            $payload = $request->all();
        }

        foreach ($payload as $key => $value) {
            Setting::query()->updateOrCreate(
                ['key' => (string) $key],
                [
                    'value' => $this->encodeValue($value),
                    'type' => gettype($value),
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => __('Configurações atualizadas com sucesso.'),
            'data' => $payload,
        ]);
    }

    private function encodeValue(mixed $value): string
    {
        if (is_scalar($value) || $value === null) {
            return (string) $value;
        }

        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function decodeValue(?string $value, ?string $type): mixed
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer' => is_numeric($value) ? (int) $value : 0,
            'double' => is_numeric($value) ? (float) $value : 0.0,
            'array', 'object' => json_decode($value ?? 'null', true),
            default => $value,
        };
    }
}
