<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Textbook extends Model
{
    protected $table = 'textbooks';

    protected $fillable = [
        'school_id',
        'title',
        'grade_level_id',
        'subject_id',
        'price',
        'is_electronic',
        'file_url',
        'physical_form_url',
        'description',
        'stock_count',
        'available',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_electronic' => 'boolean',
        'available' => 'boolean',
        'stock_count' => 'integer',
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

    public function orders(): HasMany
    {
        return $this->hasMany(MarketplaceOrder::class);
    }

    public function scopeForSchool($query, $schoolId)
    {
        return $query->where('school_id', $schoolId);
    }

    public function scopeAvailable($query)
    {
        return $query->where('available', true);
    }
}
