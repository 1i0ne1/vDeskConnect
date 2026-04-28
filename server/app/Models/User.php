<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'school_id',
        'email',
        'password',
        'role',
        'verified',
        'must_change_password',
        'last_login_at',
        'banned',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'must_change_password' => 'boolean',
        'banned' => 'boolean',
        'last_login_at' => 'datetime',
        'email_verified_at' => 'datetime',
    ];

    /**
     * Role hierarchy ranks (higher number = higher authority).
     */
    public static function roleRank(string $role): int
    {
        return match ($role) {
            'super_admin' => 0,
            'admin' => 1,
            'principal' => 2,
            'admin_staff' => 3,
            'receptionist' => 3,
            'teacher' => 4,
            'student' => 5,
            default => 99,
        };
    }

    /**
     * Check if this user can ban/delete the target user.
     */
    public function canManage(User $target): bool
    {
        // Super admin cannot manage school users
        if ($this->isSuperAdmin()) return false;
        // Cannot manage self
        if ($this->id === $target->id) return false;
        // Can only manage users with a lower rank (higher number)
        return self::roleRank($this->role) < self::roleRank($target->role);
    }

    public function isSuperAdmin(): bool { return $this->role === 'super_admin'; }
    public function isSchoolAdmin(): bool { return $this->role === 'admin'; }
    public function isPrincipal(): bool { return $this->role === 'principal'; }
    public function isAdminStaff(): bool { return in_array($this->role, ['admin_staff', 'receptionist']); }
    public function isReceptionist(): bool { return $this->role === 'receptionist'; }
    public function isTeacher(): bool { return $this->role === 'teacher'; }
    public function isStudent(): bool { return $this->role === 'student'; }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function studentProgress(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(StudentLectureProgress::class, 'student_id');
    }
}
