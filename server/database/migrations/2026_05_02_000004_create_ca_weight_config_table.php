<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ca_weight_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->onDelete('cascade');
            $table->foreignId('grade_level_id')->constrained()->onDelete('cascade');
            $table->foreignId('subject_id')->constrained()->onDelete('cascade');
            $table->foreignId('term_id')->constrained('academic_terms')->onDelete('cascade');
            $table->integer('total_ca_percentage')->default(40); // e.g., 40% of final grade
            $table->integer('assignment_weight_percentage')->default(50); // % of CA from assignments (0-100)
            $table->integer('test_weight_percentage')->default(50); // % of CA from tests (0-100)
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->unique(['school_id', 'grade_level_id', 'subject_id', 'term_id']);
            $table->index(['school_id', 'grade_level_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ca_weight_config');
    }
};
