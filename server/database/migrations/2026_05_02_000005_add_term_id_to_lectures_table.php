<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lectures', function (Blueprint $table) {
            if (!Schema::hasColumn('lectures', 'type')) {
                $table->string('type')->default('async')->after('status');
            }
            if (!Schema::hasColumn('lectures', 'content')) {
                $table->text('content')->nullable()->after('description');
            }
            if (!Schema::hasColumn('lectures', 'async_available_after')) {
                $table->dateTime('async_available_after')->nullable();
            }
            if (!Schema::hasColumn('lectures', 'is_published')) {
                $table->boolean('is_published')->default(false);
            }
            if (!Schema::hasColumn('lectures', 'term_id')) {
                $table->foreignId('term_id')->nullable()->after('grade_level_id')->constrained('academic_terms')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lectures', function (Blueprint $table) {
            $table->dropForeign(['term_id']);
            $table->dropColumn(['type', 'content', 'async_available_after', 'is_published', 'term_id']);
        });
    }
};
