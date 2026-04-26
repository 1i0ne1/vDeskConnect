<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentGrade extends Model
{
    protected $fillable = [
        'school_id',
        'student_id',
        'grade_level_id',
        'subject_id',
        'term_id',
        'ca_score',
        'exam_score',
        'total_score',
        'grade',
        'position',
        'remark',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function gradeLevel()
    {
        return $this->belongsTo(GradeLevel::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function term()
    {
        return $this->belongsTo(AcademicTerm::class, 'term_id');
    }
}
