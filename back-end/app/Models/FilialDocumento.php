<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FilialDocumento extends Model
{
    use HasFactory;

    protected $table = 'filial_documentos';

    protected $fillable = [
        'idfilial',
        'alvara_corpo_bombeiro_path',
        'alvara_corpo_bombeiro_vencimento',
        'alvara_funcionamento_path',
        'alvara_funcionamento_vencimento',
        'alvara_ambiental_path',
        'alvara_ambiental_vencimento',
        'certificado_brigada_path',
        'certificado_brigada_vencimento',
    ];

    protected $casts = [
        'alvara_corpo_bombeiro_vencimento' => 'date',
        'alvara_funcionamento_vencimento' => 'date',
        'alvara_ambiental_vencimento' => 'date',
        'certificado_brigada_vencimento' => 'date',
    ];

    public function filial()
    {
        return $this->belongsTo(Filiais::class, 'idfilial', 'idfilial');
    }
}