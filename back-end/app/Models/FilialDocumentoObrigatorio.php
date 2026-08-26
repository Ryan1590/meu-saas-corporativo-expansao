<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FilialDocumentoObrigatorio extends Model
{
    protected $table = 'filial_documentos_obrigatorios';

    protected $fillable = [
        'idfilial',
        'documento'
    ];
}
