<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaWeightConfig extends Model
{
    use HasFactory;

    protected $table = 'ca_weight_config';

    protected $fillable = [
        'school_id',
        'grade_level_id',
        'subject_id',
        'term_id',
        'total_ca_percentage',
        'assignment_weight_percentage',
        'test_weight_percentage',
        'updated_by',
    ];

    protected $casts = [
        'total_ca_percentage' => 'integer',
        'assignment_weight_percentage' => 'integer',
        'test_weight_percentage' => 'integer',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function gradeLevel(): BelongsTo
    {
        return $this->belongsTo(GradeLevel::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class, 'term_id');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
