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
        Schema::table('report_cards', function (Blueprint $table) {
            $table->float('overall_average')->nullable()->after('session_id');
            $table->integer('overall_position')->nullable()->after('overall_average');
            $table->integer('total_students')->nullable()->after('overall_position');
        });
    }

    public function down(): void
    {
        Schema::table('report_cards', function (Blueprint $table) {
            $table->dropColumn(['overall_average', 'overall_position', 'total_students']);
        });
    }
};
