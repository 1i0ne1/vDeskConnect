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
        Schema::table('textbooks', function (Blueprint $table) {
            $table->foreignId('subject_id')->nullable()->constrained()->onDelete('set null')->after('grade_level_id');
            $table->boolean('is_electronic')->default(true)->after('price');
            $table->string('file_url')->nullable()->change();
            $table->string('physical_form_url')->nullable()->after('file_url');
            $table->text('description')->nullable()->after('physical_form_url');
            $table->integer('stock_count')->nullable()->after('description');
        });

        Schema::table('marketplace_orders', function (Blueprint $table) {
            $table->foreignId('school_id')->after('id')->constrained()->onDelete('cascade');
            $table->timestamp('order_date')->useCurrent()->after('payment_ref');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('textbooks', function (Blueprint $table) {
            //
        });
    }
};
