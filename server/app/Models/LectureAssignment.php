<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LectureAssignment extends Model
{
    use HasFactory;

    protected $table = 'lecture_assignments';

    protected $fillable = [
        'school_id',
        'lecture_id',
        'title',
        'description',
        'type',
        'max_score',
        'due_at',
        'is_mandatory',
        'allow_late_submission',
        'status',
        'created_by',
    ];

    protected $casts = [
        'due_at' => 'datetime',
        'is_mandatory' => 'boolean',
        'allow_late_submission' => 'boolean',
        'max_score' => 'integer',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function lecture(): BelongsTo
    {
        return $this->belongsTo(Lecture::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(LectureAssignmentQuestion::class, 'assignment_id')->orderBy('order_index');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(LectureAssignmentSubmission::class, 'assignment_id');
    }
}
