<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filial_documentos', function (Blueprint $table) {
            $table->id();
            $table->integer('idfilial')->unique();
            $table->string('alvara_corpo_bombeiro_path')->nullable();
            $table->date('alvara_corpo_bombeiro_vencimento')->nullable();
            $table->string('alvara_funcionamento_path')->nullable();
            $table->date('alvara_funcionamento_vencimento')->nullable();
            $table->string('alvara_ambiental_path')->nullable();
            $table->date('alvara_ambiental_vencimento')->nullable();
            $table->string('certificado_brigada_path')->nullable();
            $table->date('certificado_brigada_vencimento')->nullable();
            $table->timestamps();

            $table->foreign('idfilial')->references('idfilial')->on('filiais')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('filial_documentos');
    }
};
