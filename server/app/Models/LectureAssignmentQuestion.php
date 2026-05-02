<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LectureAssignmentQuestion extends Model
{
    use HasFactory;

    protected $table = 'lecture_assignment_questions';

    protected $fillable = [
        'assignment_id',
        'question_type',
        'question_text',
        'options',
        'correct_answer',
        'max_points',
        'order_index',
    ];

    protected $casts = [
        'options' => 'array',
        'max_points' => 'integer',
        'order_index' => 'integer',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(LectureAssignment::class, 'assignment_id');
    }
}
