<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamSubmission extends Model
{
    protected $fillable = [
        'exam_id',
        'student_id',
        'started_at',
        'submitted_at',
        'auto_score',
        'manual_score',
        'status'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers()
    {
        return $this->hasMany(ExamAnswer::class, 'submission_id');
    }

    public function getTotalScoreAttribute()
    {
        return ($this->auto_score ?? 0) + ($this->manual_score ?? 0);
    }
}
