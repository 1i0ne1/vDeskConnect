<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lecture extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'teacher_id',
        'grade_level_id',
        'subject_id',
        'section_id',
        'title',
        'description',
        'content',
        'scheduled_at',
        'duration_minutes',
        'status',
        'type',
        'is_online',
        'meeting_link',
        'async_available_after',
        'is_published',
        'created_by',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'async_available_after' => 'datetime',
        'is_online' => 'boolean',
        'is_published' => 'boolean',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function gradeLevel(): BelongsTo
    {
        return $this->belongsTo(GradeLevel::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(LectureResource::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function studentProgress(): HasMany
    {
        return $this->hasMany(StudentLectureProgress::class);
    }
}