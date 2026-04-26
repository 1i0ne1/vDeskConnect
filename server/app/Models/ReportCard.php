<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportCard extends Model
{
    protected $fillable = [
        'school_id',
        'student_id',
        'term_id',
        'session_id',
        'overall_average',
        'overall_position',
        'total_students',
        'pdf_url',
        'generated_at',
        'published',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'published' => 'boolean',
        'overall_average' => 'float',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function term()
    {
        return $this->belongsTo(AcademicTerm::class, 'term_id');
    }

    public function session()
    {
        return $this->belongsTo(AcademicSession::class, 'session_id');
    }
}
