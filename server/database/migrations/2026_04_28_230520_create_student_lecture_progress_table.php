<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_lecture_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('lecture_id')->constrained('lectures')->onDelete('cascade');
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->json('progress_data')->nullable(); // Store section-wise progress
            $table->timestamps();

            $table->unique(['student_id', 'lecture_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_lecture_progress');
    }
};
