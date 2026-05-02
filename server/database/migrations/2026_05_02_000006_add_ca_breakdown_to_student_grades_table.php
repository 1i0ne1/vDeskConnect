<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_grades', function (Blueprint $table) {
            if (!Schema::hasColumn('student_grades', 'ca_assignment_score')) {
                $table->decimal('ca_assignment_score', 5, 2)->nullable()->after('ca_score');
            }
            if (!Schema::hasColumn('student_grades', 'ca_test_score')) {
                $table->decimal('ca_test_score', 5, 2)->nullable()->after('ca_assignment_score');
            }
        });
    }

    public function down(): void
    {
        Schema::table('student_grades', function (Blueprint $table) {
            $table->dropColumn(['ca_assignment_score', 'ca_test_score']);
        });
    }
};
