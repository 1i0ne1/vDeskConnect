<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultPin extends Model
{
    protected $fillable = [
        'school_id',
        'pin',
        'student_id',
        'used',
        'expires_at',
    ];

    protected $casts = [
        'used' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
