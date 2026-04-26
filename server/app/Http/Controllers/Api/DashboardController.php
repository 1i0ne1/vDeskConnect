<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\GradeLevel;
use App\Models\Exam;
use App\Models\Lecture;
use App\Models\StudentGrade;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function getStats(Request $request)
    {
        $schoolId = $request->user()->school_id;

        // Basic Stats
        $stats = [
            [
                'label' => 'Total Classes',
                'value' => GradeLevel::where('school_id', $schoolId)->count(),
                'change' => '+0',
                'trend' => 'up',
                'icon' => 'BookOpen',
                'color' => 'bg-primary/10 text-primary'
            ],
            [
                'label' => 'Total Students',
                'value' => User::where('school_id', $schoolId)->where('role', 'student')->count(),
                'change' => '+0',
                'trend' => 'up',
                'icon' => 'GraduationCap',
                'color' => 'bg-success/10 text-success'
            ],
            [
                'label' => 'Total Teachers',
                'value' => User::where('school_id', $schoolId)->where('role', 'teacher')->count(),
                'change' => '+0',
                'trend' => 'up',
                'icon' => 'Users',
                'color' => 'bg-warning/10 text-warning'
            ],
            [
                'label' => 'Active Exams',
                'value' => Exam::where('school_id', $schoolId)->where('published', true)->count(),
                'change' => '+0',
                'trend' => 'up',
                'icon' => 'FileText',
                'color' => 'bg-info/10 text-info'
            ],
        ];

        // Student Performance (Top 5)
        $topStudents = StudentGrade::where('school_id', $schoolId)
            ->with(['student.profile', 'gradeLevel'])
            ->orderBy('total_score', 'desc')
            ->limit(5)
            ->get()
            ->map(function($grade) {
                $profile = $grade->student->profile;
                $data = is_string($profile->data) ? json_decode($profile->data, true) : $profile->data;
                return [
                    'name' => ($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''),
                    'grade' => $grade->grade ?? 'N/A',
                    'class' => $grade->gradeLevel->name ?? 'N/A',
                    'mastery' => round($grade->total_score) ?: 0
                ];
            });

        // Today's Schedule (Lectures)
        $today = Carbon::today();
        $schedule = Lecture::where('school_id', $schoolId)
            ->whereDate('scheduled_at', $today)
            ->orderBy('scheduled_at', 'asc')
            ->get()
            ->map(function($lecture) {
                return [
                    'time' => Carbon::parse($lecture->scheduled_at)->format('g:i a'),
                    'title' => $lecture->title,
                    'description' => Str::limit($lecture->description, 50),
                    'end' => Carbon::parse($lecture->scheduled_at)->addMinutes($lecture->duration_minutes)->format('g:i a')
                ];
            });

        return response()->json([
            'stats' => $stats,
            'topStudents' => $topStudents,
            'schedule' => $schedule
        ]);
    }
}
