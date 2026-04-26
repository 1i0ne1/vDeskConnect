<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->boolean('is_ca_test')->default(false)->after('published');
            $table->integer('week_number')->nullable()->after('is_ca_test');
            $table->integer('total_marks')->default(0)->after('week_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn(['is_ca_test', 'week_number', 'total_marks']);
        });
    }
};
