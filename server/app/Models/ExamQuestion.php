<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamQuestion extends Model
{
    protected $fillable = [
        'exam_id',
        'type',
        'question_text',
        'options',
        'correct_answer',
        'marks'
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class);
    }
}
