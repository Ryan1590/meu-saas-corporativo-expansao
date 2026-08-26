<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('filiais', function (Blueprint $table) {
            $table->id();
            $table->integer('idfilial')->unique();
            $table->string('filial');
            $table->string('uf')->nullable();
            $table->string('predio'); // proprio ou terceiro
            $table->string('metragem_quadrada');
            $table->string('tipo'); // loja, industria, cd, auto posto gazin
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('filiais');
    }
};
