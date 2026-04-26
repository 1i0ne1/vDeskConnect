<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamAnswer extends Model
{
    protected $fillable = [
        'submission_id',
        'question_id',
        'answer_text',
        'selected_option',
        'file_url',
        'score'
    ];

    public function submission()
    {
        return $this->belongsTo(ExamSubmission::class, 'submission_id');
    }

    public function question()
    {
        return $this->belongsTo(ExamQuestion::class);
    }
}
