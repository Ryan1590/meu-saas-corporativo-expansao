<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\FilialDocumentoObrigatorio;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Filiais extends Model
{
    use HasFactory;

    protected $table = 'filiais';

    protected $primaryKey = 'idfilial';

    protected $keyType = 'int';

    public $incrementing = false;

    protected $fillable = [
        'idfilial',
        'filial',
        'uf',
        'predio', //proprio ou terceiro
        'metragem_quadrada',
        'tipo', // loja, industria, cd, auto posto gazin
    ];



    protected function metragemQuadrada(): Attribute
    {
        return Attribute::make(
            get: function ($value, $attributes) {
                // Tenta pegar do $value ou direto do array de atributos do banco
                $val = $value ?? ($attributes['metragem_quadrada'] ?? null);

                if (is_null($val) || $val === '') {
                    return 0.0;
                }

                // Se for string com vírgula (ex: "100,30" ou "1.250,50")
                if (is_string($val)) {
                    // Se contiver vírgula, limpa os pontos de milhar e troca vírgula por ponto
                    if (str_contains($val, ',')) {
                        $val = str_replace('.', '', $val);
                        $val = str_replace(',', '.', $val);
                    }
                }

                return (float) $val;
            },

            set: fn ($value) => is_string($value)
                ? str_replace(['.', ','], ['', '.'], $value)
                : $value
        );
    }

    public function documentos()
    {
        return $this->hasOne(FilialDocumento::class, 'idfilial', 'idfilial');
    }

    public function documentosObrigatorios()
    {
        return $this->hasMany(
            FilialDocumentoObrigatorio::class,
            'idfilial',
            'idfilial'
        );
    }
}

