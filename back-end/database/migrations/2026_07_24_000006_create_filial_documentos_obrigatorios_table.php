<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filial_documentos_obrigatorios', function (Blueprint $table) {
            $table->id();
            $table->integer('idfilial');
            $table->enum('documento', [
                'alvara_corpo_bombeiro',
                'alvara_funcionamento',
                'alvara_ambiental',
                'certificado_brigada'
            ]);
            $table->timestamps();

            $table->unique(['idfilial', 'documento']);
            $table->foreign('idfilial')->references('idfilial')->on('filiais')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('filial_documentos_obrigatorios');
    }
};
