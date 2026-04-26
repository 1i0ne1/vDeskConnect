<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    protected $fillable = [
        'school_id',
        'subject_id',
        'grade_level_id',
        'term_id',
        'title',
        'type',
        'duration_minutes',
        'start_at',
        'end_at',
        'published',
        'is_ca_test',
        'week_number',
        'total_marks'
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'published' => 'boolean',
        'is_ca_test' => 'boolean',
    ];

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }

    public function term()
    {
        return $this->belongsTo(AcademicTerm::class);
    }

    public function questions()
    {
        return $this->hasMany(ExamQuestion::class);
    }

    public function submissions()
    {
        return $this->hasMany(ExamSubmission::class);
    }

    public function scopeActive($query)
    {
        return $query->where('published', true)
                     ->where(function($q) {
                         $q->whereNull('start_at')
                           ->orWhere('start_at', '<=', now());
                     })
                     ->where(function($q) {
                         $q->whereNull('end_at')
                           ->orWhere('end_at', '>=', now());
                     });
    }
}
