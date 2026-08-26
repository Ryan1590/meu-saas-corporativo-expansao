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
                $val = $value ?? ($attributes['metragem_quadrada'] ?? null);

                if (is_null($val) || $val === '') {
                    return 0.0;
                }

                if (is_numeric($val)) {
                    return (float) $val;
                }

                if (is_string($val)) {
                    $val = trim($val);
                    if (str_contains($val, ',') && str_contains($val, '.')) {
                        if (strrpos($val, ',') > strrpos($val, '.')) {
                            $val = str_replace('.', '', $val);
                            $val = str_replace(',', '.', $val);
                        } else {
                            $val = str_replace(',', '', $val);
                        }
                    } elseif (str_contains($val, ',')) {
                        $val = str_replace(',', '.', $val);
                    } elseif (preg_match('/^\d{1,3}\.\d{3}$/', $val)) {
                        $val = str_replace('.', '', $val);
                    }
                }

                return (float) $val;
            },

            set: fn ($value) => is_string($value)
                ? (str_contains($value, ',') ? str_replace(['.', ','], ['', '.'], $value) : $value)
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

