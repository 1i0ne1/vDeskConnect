<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lecture_assignment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained('lecture_assignments')->onDelete('cascade');
            $table->string('question_type'); // mcq, theory, fill_blank, true_false, file_upload
            $table->text('question_text');
            $table->json('options')->nullable(); // for MCQ: [{ text, is_correct }]
            $table->text('correct_answer')->nullable(); // for auto-gradable types
            $table->integer('max_points')->default(1);
            $table->integer('order_index')->default(0);
            $table->timestamps();

            $table->index('assignment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lecture_assignment_questions');
    }
};
