<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LectureAssignmentSubmission extends Model
{
    use HasFactory;

    protected $table = 'lecture_assignment_submissions';

    protected $fillable = [
        'assignment_id',
        'student_id',
        'answers',
        'submitted_at',
        'status',
        'score',
        'max_score',
        'feedback',
        'graded_by',
        'graded_at',
    ];

    protected $casts = [
        'answers' => 'array',
        'submitted_at' => 'datetime',
        'graded_at' => 'datetime',
        'score' => 'decimal:2',
        'max_score' => 'integer',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(LectureAssignment::class, 'assignment_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function grader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }
}
