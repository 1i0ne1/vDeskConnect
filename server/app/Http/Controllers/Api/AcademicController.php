<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicSession;
use App\Models\AcademicTerm;
use App\Models\CaWeek;
use App\Models\GradeScale;
use App\Models\GradeLevel;
use App\Models\Subject;
use App\Models\Department;
use App\Models\Section;
use App\Models\GradeLevelSubject;
use App\Models\TeacherSubject;
use App\Models\SchemeOfWork;
use App\Models\LessonNote;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AcademicController extends Controller
{
    // ==================== ACADEMIC SESSIONS ====================

    /**
     * List all academic sessions for the authenticated user's school.
     */
    public function sessionsIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $sessions = AcademicSession::where('school_id', $user->school_id)
            ->withCount('terms')
            ->orderBy('start_date', 'desc')
            ->get()
            ->map(function ($session) {
                return [
                    'id' => $session->id,
                    'name' => $session->name,
                    'start_date' => $session->start_date->format('Y-m-d'),
                    'end_date' => $session->end_date->format('Y-m-d'),
                    'active' => $session->active,
                    'terms_count' => $session->terms_count,
                    'created_at' => $session->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json(['sessions' => $sessions]);
    }

    /**
     * Create a new academic session.
     */
    public function createSession(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // If this session is set to active, deactivate all other sessions
        if ($request->active) {
            AcademicSession::where('school_id', $user->school_id)
                ->where('active', true)
                ->update(['active' => false]);
        }

        $session = AcademicSession::create([
            'school_id' => $user->school_id,
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'active' => $request->active ?? false,
        ]);

        return response()->json([
            'message' => 'Academic session created successfully',
            'session' => [
                'id' => $session->id,
                'name' => $session->name,
                'start_date' => $session->start_date->format('Y-m-d'),
                'end_date' => $session->end_date->format('Y-m-d'),
                'active' => $session->active,
            ],
        ], 201);
    }

    /**
     * Update an academic session.
     */
    public function updateSession(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $session = AcademicSession::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // If setting to active, deactivate others
        if ($request->has('active') && $request->active) {
            AcademicSession::where('school_id', $user->school_id)
                ->where('id', '!=', $id)
                ->where('active', true)
                ->update(['active' => false]);
        }

        $session->update($request->only(['name', 'start_date', 'end_date', 'active']));

        return response()->json([
            'message' => 'Academic session updated successfully',
            'session' => [
                'id' => $session->id,
                'name' => $session->name,
                'start_date' => $session->start_date->format('Y-m-d'),
                'end_date' => $session->end_date->format('Y-m-d'),
                'active' => $session->active,
            ],
        ]);
    }

    /**
     * Set a session as active.
     */
    public function setActiveSession(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        return DB::transaction(function () use ($user, $id) {
            // Deactivate all sessions
            AcademicSession::where('school_id', $user->school_id)
                ->where('active', true)
                ->update(['active' => false]);

            // Activate the requested session
            $session = AcademicSession::where('school_id', $user->school_id)
                ->findOrFail($id);
            $session->update(['active' => true]);

            return response()->json([
                'message' => 'Session set as active',
                'session' => [
                    'id' => $session->id,
                    'name' => $session->name,
                    'active' => $session->active,
                ],
            ]);
        });
    }

    /**
     * Delete an academic session (cascades to terms, ca_weeks, exams, etc.).
     */
    public function deleteSession(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $session = AcademicSession::where('school_id', $user->school_id)->findOrFail($id);

        // Prevent deleting if it's the only active session
        $activeCount = AcademicSession::where('school_id', $user->school_id)->where('active', true)->count();
        if ($session->active && $activeCount <= 1) {
            return response()->json([
                'message' => 'Cannot delete the only active session. Create another session and set it as active first.',
            ], 400);
        }

        $session->delete();

        return response()->json(['message' => 'Academic session and all associated data deleted successfully']);
    }

    // ==================== ACADEMIC TERMS ====================

    /**
     * List terms for the active session (no parameter needed).
     */
    public function termsIndexActive(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $activeSession = AcademicSession::where('school_id', $user->school_id)
                ->where('active', true)
                ->first();

            if (!$activeSession) {
                return response()->json(['terms' => []]);
            }

            $terms = AcademicTerm::where('school_id', $user->school_id)
                ->where('session_id', $activeSession->id)
                ->ordered()
                ->get()
                ->map(function ($term) {
                    return [
                        'id' => $term->id,
                        'session_id' => $term->session_id,
                        'name' => $term->name,
                        'start_date' => $term->start_date?->format('Y-m-d'),
                        'end_date' => $term->end_date?->format('Y-m-d'),
                        'order' => $term->order,
                        'weeks_count' => $term->weeks_count,
                    ];
                });

            return response()->json(['terms' => $terms]);
        } catch (\Exception $e) {
            \Log::error('termsIndexActive error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to load terms', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * List terms for a specific session.
     */
    public function termsIndex(Request $request, int $sessionId): JsonResponse
    {
        $user = $request->user();

        $terms = AcademicTerm::where('school_id', $user->school_id)
            ->where('session_id', $sessionId)
            ->ordered()
            ->get()
            ->map(function ($term) {
                return [
                    'id' => $term->id,
                    'session_id' => $term->session_id,
                    'name' => $term->name,
                    'start_date' => $term->start_date?->format('Y-m-d'),
                    'end_date' => $term->end_date?->format('Y-m-d'),
                    'order' => $term->order,
                    'weeks_count' => $term->weeks_count,
                    'created_at' => $term->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json(['terms' => $terms]);
    }

    /**
     * Create a new academic term.
     */
    public function createTerm(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => 'required|exists:academic_sessions,id',
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'order' => 'required|integer|min:1',
            'weeks_count' => 'required|integer|min:1|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Verify session belongs to user's school
        $session = AcademicSession::where('school_id', $user->school_id)
            ->findOrFail($request->session_id);

        $term = AcademicTerm::create([
            'school_id' => $user->school_id,
            'session_id' => $session->id,
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'order' => $request->order,
            'weeks_count' => $request->weeks_count,
        ]);

        return response()->json([
            'message' => 'Academic term created successfully',
            'term' => [
                'id' => $term->id,
                'session_id' => $term->session_id,
                'name' => $term->name,
                'start_date' => $term->start_date->format('Y-m-d'),
                'end_date' => $term->end_date->format('Y-m-d'),
                'order' => $term->order,
                'weeks_count' => $term->weeks_count,
            ],
        ], 201);
    }

    /**
     * Bulk create terms for a session.
     */
    public function bulkCreateTerms(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => 'required|exists:academic_sessions,id',
            'terms_count' => 'required|integer|min:1|max:4',
            'weeks_per_term' => 'required|integer|min:1|max:20',
            'term_prefix' => 'required|string|max:50', // e.g., "Term", "Trimester", "Semester"
            'start_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $session = AcademicSession::where('school_id', $user->school_id)
            ->findOrFail($request->session_id);

        // Check if terms already exist for this session
        $existingTerms = AcademicTerm::where('session_id', $session->id)->count();
        if ($existingTerms > 0) {
            return response()->json([
                'message' => 'Terms already exist for this session. Delete existing terms first.',
            ], 409);
        }

        return DB::transaction(function () use ($request, $session, $user) {
            $terms = [];
            $weeksPerTerm = $request->weeks_per_term;
            $startDate = \Carbon\Carbon::parse($request->start_date);

            for ($i = 1; $i <= $request->terms_count; $i++) {
                $termStart = $startDate->copy()->addWeeks(($i - 1) * $weeksPerTerm);
                $termEnd = $termStart->copy()->addWeeks($weeksPerTerm)->subDay();

                $term = AcademicTerm::create([
                    'school_id' => $user->school_id,
                    'session_id' => $session->id,
                    'name' => "{$request->term_prefix} {$i}",
                    'start_date' => $termStart->format('Y-m-d'),
                    'end_date' => $termEnd->format('Y-m-d'),
                    'order' => $i,
                    'weeks_count' => $weeksPerTerm,
                ]);

                $terms[] = [
                    'id' => $term->id,
                    'name' => $term->name,
                    'start_date' => $term->start_date->format('Y-m-d'),
                    'end_date' => $term->end_date->format('Y-m-d'),
                    'order' => $term->order,
                    'weeks_count' => $term->weeks_count,
                ];
            }

            return response()->json([
                'message' => "Created {$request->terms_count} terms successfully",
                'terms' => $terms,
            ], 201);
        });
    }

    /**
     * Update an academic term.
     */
    public function updateTerm(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $term = AcademicTerm::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'order' => 'sometimes|integer|min:1',
            'weeks_count' => 'sometimes|integer|min:1|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $term->update($request->only(['name', 'start_date', 'end_date', 'order', 'weeks_count']));

        return response()->json([
            'message' => 'Academic term updated successfully',
            'term' => [
                'id' => $term->id,
                'name' => $term->name,
                'start_date' => $term->start_date->format('Y-m-d'),
                'end_date' => $term->end_date->format('Y-m-d'),
                'order' => $term->order,
                'weeks_count' => $term->weeks_count,
            ],
        ]);
    }

    /**
     * Delete an academic term.
     */
    public function deleteTerm(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $term = AcademicTerm::where('school_id', $user->school_id)->findOrFail($id);

        $term->delete();

        return response()->json(['message' => 'Academic term deleted successfully']);
    }

    // ==================== CA WEEKS ====================

    /**
     * Get CA week configuration for a grade + subject + term.
     */
    public function caWeeksIndex(Request $request, int $termId, int $gradeLevelId, int $subjectId): JsonResponse
    {
        $user = $request->user();

        $caWeeks = CaWeek::where('school_id', $user->school_id)
            ->where('term_id', $termId)
            ->where('grade_level_id', $gradeLevelId)
            ->where('subject_id', $subjectId)
            ->ordered()
            ->get()
            ->map(function ($caWeek) {
                return [
                    'id' => $caWeek->id,
                    'week_number' => $caWeek->week_number,
                    'is_test_week' => $caWeek->is_test_week,
                    'is_exam_week' => $caWeek->is_exam_week,
                ];
            });

        return response()->json(['ca_weeks' => $caWeeks]);
    }

    /**
     * Set CA week configuration (bulk).
     */
    public function setCaWeeks(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'term_id' => 'required|exists:academic_terms,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'weeks_count' => 'required|integer|min:1|max:20',
            'test_weeks' => 'required|array', // Array of week numbers that are test weeks
            'test_weeks.*' => 'integer|min:1|max:20',
            'exam_week' => 'required|integer|min:1|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Verify all entities belong to user's school
        $term = AcademicTerm::where('school_id', $user->school_id)->findOrFail($request->term_id);
        $gradeLevel = GradeLevel::where('school_id', $user->school_id)->findOrFail($request->grade_level_id);
        $subject = Subject::where('school_id', $user->school_id)->findOrFail($request->subject_id);

        return DB::transaction(function () use ($request, $user, $term, $gradeLevel, $subject) {
            // Delete existing CA weeks for this combination
            CaWeek::where('school_id', $user->school_id)
                ->where('term_id', $term->id)
                ->where('grade_level_id', $gradeLevel->id)
                ->where('subject_id', $subject->id)
                ->delete();

            // Create new CA weeks
            $caWeeks = [];
            for ($week = 1; $week <= $request->weeks_count; $week++) {
                $caWeek = CaWeek::create([
                    'school_id' => $user->school_id,
                    'term_id' => $term->id,
                    'grade_level_id' => $gradeLevel->id,
                    'subject_id' => $subject->id,
                    'week_number' => $week,
                    'is_test_week' => in_array($week, $request->test_weeks),
                    'is_exam_week' => $week === $request->exam_week,
                ]);

                $caWeeks[] = [
                    'id' => $caWeek->id,
                    'week_number' => $caWeek->week_number,
                    'is_test_week' => $caWeek->is_test_week,
                    'is_exam_week' => $caWeek->is_exam_week,
                ];
            }

            $testWeeksStr = implode(', ', $request->test_weeks);

            return response()->json([
                'message' => "CA weeks configured. Tests at weeks: {$testWeeksStr}, Exam at week: {$request->exam_week}",
                'ca_weeks' => $caWeeks,
            ], 201);
        });
    }

    /**
     * Get CA summary for a grade + subject + term.
     */
    public function caWeeksSummary(Request $request, int $termId, int $gradeLevelId, int $subjectId): JsonResponse
    {
        $user = $request->user();

        $caWeeks = CaWeek::where('school_id', $user->school_id)
            ->where('term_id', $termId)
            ->where('grade_level_id', $gradeLevelId)
            ->where('subject_id', $subjectId)
            ->ordered()
            ->get();

        $testWeeks = $caWeeks->where('is_test_week', true)->pluck('week_number')->toArray();
        $examWeek = $caWeeks->firstWhere('is_exam_week', true);

        return response()->json([
            'summary' => [
                'test_weeks' => $testWeeks,
                'exam_week' => $examWeek ? $examWeek->week_number : null,
                'total_weeks' => $caWeeks->count(),
                'test_weeks_display' => $testWeeks ? implode(', ', $testWeeks) : 'None',
                'exam_week_display' => $examWeek ? "Week {$examWeek->week_number}" : 'Not set',
            ],
        ]);
    }

    // ==================== GRADE SCALES ====================

    /**
     * List all grade scales for the school.
     */
    public function gradeScalesIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $gradeScales = GradeScale::where('school_id', $user->school_id)
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get()
            ->map(function ($scale) {
                return [
                    'id' => $scale->id,
                    'name' => $scale->name,
                    'scale' => $scale->scale,
                    'is_default' => $scale->is_default,
                    'created_at' => $scale->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json(['grade_scales' => $gradeScales]);
    }

    /**
     * Create a new grade scale.
     */
    public function createGradeScale(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'scale' => 'required|array|min:1',
            'scale.*.min' => 'required|numeric|min:0|max:100',
            'scale.*.max' => 'required|numeric|min:0|max:100|gte:scale.*.min',
            'scale.*.remark' => 'required|string|max:50',
            'is_default' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // If setting as default, unset other defaults
        if ($request->is_default) {
            GradeScale::where('school_id', $user->school_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $gradeScale = GradeScale::create([
            'school_id' => $user->school_id,
            'name' => $request->name,
            'scale' => $request->scale,
            'is_default' => $request->is_default ?? false,
        ]);

        return response()->json([
            'message' => 'Grade scale created successfully',
            'grade_scale' => [
                'id' => $gradeScale->id,
                'name' => $gradeScale->name,
                'scale' => $gradeScale->scale,
                'is_default' => $gradeScale->is_default,
            ],
        ], 201);
    }

    /**
     * Update a grade scale.
     */
    public function updateGradeScale(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $gradeScale = GradeScale::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'scale' => 'sometimes|array|min:1',
            'scale.*.min' => 'required|numeric|min:0|max:100',
            'scale.*.max' => 'required|numeric|min:0|max:100|gte:scale.*.min',
            'scale.*.remark' => 'required|string|max:50',
            'is_default' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // If setting as default, unset other defaults
        if ($request->has('is_default') && $request->is_default) {
            GradeScale::where('school_id', $user->school_id)
                ->where('id', '!=', $id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $gradeScale->update($request->only(['name', 'scale', 'is_default']));

        return response()->json([
            'message' => 'Grade scale updated successfully',
            'grade_scale' => [
                'id' => $gradeScale->id,
                'name' => $gradeScale->name,
                'scale' => $gradeScale->scale,
                'is_default' => $gradeScale->is_default,
            ],
        ]);
    }

    /**
     * Set a grade scale as default.
     */
    public function setDefaultGradeScale(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        return DB::transaction(function () use ($user, $id) {
            GradeScale::where('school_id', $user->school_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);

            $gradeScale = GradeScale::where('school_id', $user->school_id)
                ->findOrFail($id);
            $gradeScale->update(['is_default' => true]);

            return response()->json([
                'message' => 'Default grade scale updated',
                'grade_scale' => [
                    'id' => $gradeScale->id,
                    'name' => $gradeScale->name,
                    'is_default' => $gradeScale->is_default,
                ],
            ]);
        });
    }

    /**
     * Delete a grade scale.
     */
    public function deleteGradeScale(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $gradeScale = GradeScale::where('school_id', $user->school_id)->findOrFail($id);

        if ($gradeScale->is_default) {
            return response()->json([
                'message' => 'Cannot delete the default grade scale. Set another scale as default first.',
            ], 400);
        }

        $gradeScale->delete();

        return response()->json(['message' => 'Grade scale deleted successfully']);
    }

    /**
     * Get preset grade scale templates (Nigerian WAEC, American GPA, French Baccalaureat).
     */
    public function getPresetTemplates(): JsonResponse
    {
        $templates = [
            'nigerian_waec' => [
                'name' => 'Nigerian WAEC',
                'scale' => [
                    'A' => ['min' => 70, 'max' => 100, 'remark' => 'Excellent'],
                    'B2' => ['min' => 65, 'max' => 69, 'remark' => 'Very Good'],
                    'B3' => ['min' => 60, 'max' => 64, 'remark' => 'Good'],
                    'C4' => ['min' => 55, 'max' => 59, 'remark' => 'Credit'],
                    'C5' => ['min' => 50, 'max' => 54, 'remark' => 'Credit'],
                    'C6' => ['min' => 45, 'max' => 49, 'remark' => 'Credit'],
                    'D7' => ['min' => 40, 'max' => 44, 'remark' => 'Pass'],
                    'E8' => ['min' => 35, 'max' => 39, 'remark' => 'Pass'],
                    'F9' => ['min' => 0, 'max' => 34, 'remark' => 'Fail'],
                ],
            ],
            'american_gpa' => [
                'name' => 'American GPA (4.0 Scale)',
                'scale' => [
                    'A' => ['min' => 90, 'max' => 100, 'remark' => 'Excellent', 'gpa' => 4.0],
                    'B' => ['min' => 80, 'max' => 89, 'remark' => 'Good', 'gpa' => 3.0],
                    'C' => ['min' => 70, 'max' => 79, 'remark' => 'Average', 'gpa' => 2.0],
                    'D' => ['min' => 60, 'max' => 69, 'remark' => 'Below Average', 'gpa' => 1.0],
                    'F' => ['min' => 0, 'max' => 59, 'remark' => 'Fail', 'gpa' => 0.0],
                ],
            ],
            'french_baccalaureat' => [
                'name' => 'French Baccalaureat (20-point scale)',
                'scale' => [
                    'Très Bien' => ['min' => 16, 'max' => 20, 'remark' => 'Very Good'],
                    'Bien' => ['min' => 14, 'max' => 15, 'remark' => 'Good'],
                    'Assez Bien' => ['min' => 12, 'max' => 13, 'remark' => 'Fairly Good'],
                    'Passable' => ['min' => 10, 'max' => 11, 'remark' => 'Pass'],
                    'Insuffisant' => ['min' => 0, 'max' => 9, 'remark' => 'Fail'],
                ],
            ],
            'percentage_standard' => [
                'name' => 'Standard Percentage',
                'scale' => [
                    'A' => ['min' => 70, 'max' => 100, 'remark' => 'Excellent'],
                    'B' => ['min' => 60, 'max' => 69, 'remark' => 'Good'],
                    'C' => ['min' => 50, 'max' => 59, 'remark' => 'Average'],
                    'D' => ['min' => 40, 'max' => 49, 'remark' => 'Below Average'],
                    'F' => ['min' => 0, 'max' => 39, 'remark' => 'Fail'],
                ],
            ],
        ];

        return response()->json(['templates' => $templates]);
    }

    // ==================== GRADE LEVELS ====================

    /**
     * List all grade levels for the school (with search, filter, and pagination).
     */
    public function gradeLevelsIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = GradeLevel::where('school_id', $user->school_id)
            ->with(['sections']);

        // Apply Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('short_name', 'ILIKE', "%{$search}%");
            });
        }

        // Apply Cycle Filter
        if ($request->filled('cycle')) {
            $query->where('cycle', $request->cycle);
        }

        $perPage = $request->input('per_page', 20);
        $paginated = $query->orderBy('order')->paginate($perPage);

        $gradeLevels = collect($paginated->items())->map(function ($gl) use ($user) {
            // Count students in this grade level
            $studentCount = \DB::table('profiles')
                ->join('users', 'profiles.user_id', '=', 'users.id')
                ->where('users.school_id', $user->school_id)
                ->where('users.role', 'student')
                ->where('users.deleted_at', null)
                ->where('profiles.data->grade_level_id', $gl->id)
                ->count();

            // Count teachers assigned to this grade (only not banned, not deleted)
            $teacherCount = \DB::table('teacher_subjects')
                ->join('users', 'teacher_subjects.teacher_id', '=', 'users.id')
                ->where('teacher_subjects.school_id', $user->school_id)
                ->where('teacher_subjects.grade_level_id', $gl->id)
                ->where('users.deleted_at', null)
                ->where('users.banned', false)
                ->distinct('teacher_subjects.teacher_id')
                ->count('teacher_subjects.teacher_id');

            // Count subjects assigned to this grade
            $subjectCount = GradeLevelSubject::where('school_id', $user->school_id)
                ->where('grade_level_id', $gl->id)
                ->count();

            return [
                'id' => $gl->id,
                'name' => $gl->name,
                'short_name' => $gl->short_name,
                'order' => $gl->order,
                'cycle' => $gl->cycle,
                'students_count' => $studentCount,
                'sections_count' => $gl->sections->count(),
                'subjects_count' => $subjectCount,
                'teachers_count' => $teacherCount,
            ];
        });

        return response()->json([
            'grade_levels' => $gradeLevels,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Get grade level detail with full stats.
     */
    public function gradeLevelDetail(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $gradeLevel = GradeLevel::where('school_id', $user->school_id)->findOrFail($id);

        // Students in this grade
        $students = \DB::table('profiles')
            ->join('users', 'profiles.user_id', '=', 'users.id')
            ->where('users.school_id', $user->school_id)
            ->where('users.role', 'student')
            ->where('users.deleted_at', null)
            ->where('profiles.data->grade_level_id', $id)
            ->select('users.id', 'users.email', 'profiles.data as profile_data')
            ->get()
            ->map(function ($s) {
                $data = is_string($s->profile_data) ? json_decode($s->profile_data, true) : (array) $s->profile_data;
                return [
                    'id' => $s->id,
                    'email' => $s->email,
                    'first_name' => $data['first_name'] ?? '',
                    'last_name' => $data['last_name'] ?? '',
                    'admission_number' => $data['admission_number'] ?? '',
                ];
            });

        // Sections in this grade
        $sections = Section::where('school_id', $user->school_id)
            ->where('grade_level_id', $id)
            ->get();

        // Subjects assigned to this grade
        $subjectMappings = GradeLevelSubject::where('school_id', $user->school_id)
            ->where('grade_level_id', $id)
            ->with(['subject', 'department'])
            ->get()
            ->map(function ($m) {
                return [
                    'id' => $m->id,
                    'subject_id' => $m->subject_id,
                    'subject_name' => $m->subject->name,
                    'subject_code' => $m->subject->code,
                    'subject_type' => $m->subject->type,
                    'is_compulsory' => $m->is_compulsory,
                    'department_name' => $m->department?->name,
                ];
            });

        // Teachers assigned to this grade
        $teacherAssignments = \DB::table('teacher_subjects')
            ->join('users', 'teacher_subjects.teacher_id', '=', 'users.id')
            ->leftJoin('profiles', 'users.id', '=', 'profiles.user_id')
            ->leftJoin('subjects', 'teacher_subjects.subject_id', '=', 'subjects.id')
            ->where('teacher_subjects.school_id', $user->school_id)
            ->where('teacher_subjects.grade_level_id', $id)
            ->where('users.deleted_at', null)
            ->select(
                'users.id as teacher_id',
                'users.email',
                'profiles.data as profile_data',
                'subjects.name as subject_name',
                'teacher_subjects.section_id'
            )
            ->get()
            ->groupBy('teacher_id')
            ->map(function ($assignments, $teacherId) {
                $first = $assignments->first();
                if (!$first) return null;
                $data = is_string($first->profile_data) ? json_decode($first->profile_data, true) : (array) $first->profile_data;
                return [
                    'teacher_id' => $teacherId,
                    'email' => $first->email ?? '',
                    'name' => ($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''),
                    'subjects' => $assignments->pluck('subject_name')->filter()->unique()->toArray(),
                    'section_id' => $first->section_id,
                ];
            })->filter()->values();

        // Terms for this school (get terms from active session, or all terms)
        $activeSession = AcademicSession::where('school_id', $user->school_id)
            ->where('active', true)
            ->first();
        
        $terms = [];
        if ($activeSession) {
            $terms = AcademicTerm::where('session_id', $activeSession->id)
                ->orderBy('order')
                ->get()
                ->map(function ($term) {
                    return [
                        'id' => $term->id,
                        'name' => $term->name,
                        'start_date' => $term->start_date,
                        'end_date' => $term->end_date,
                        'order' => $term->order,
                        'weeks_count' => $term->weeks_count,
                    ];
                });
        }

        return response()->json([
            'grade_level' => [
                'id' => $gradeLevel->id,
                'name' => $gradeLevel->name,
                'short_name' => $gradeLevel->short_name,
                'cycle' => $gradeLevel->cycle,
                'order' => $gradeLevel->order,
                'students_count' => $students->count(),
                'sections_count' => $sections->count(),
                'subjects_count' => $subjectMappings->count(),
                'teachers_count' => $teacherAssignments->count(),
            ],
            'students' => $students,
            'sections' => $sections,
            'subjects' => $subjectMappings,
            'teachers' => $teacherAssignments,
            'terms' => $terms,
        ]);
    }

    // ==================== SUBJECTS ====================

    /**
     * List all subjects for the school.
     */
    public function subjectsIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $subjects = Subject::where('school_id', $user->school_id)
            ->orderBy('name')
            ->get()
            ->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'type' => $subject->type,
                ];
            });

        return response()->json(['subjects' => $subjects]);
    }

    // ==================== PHASE 2: GRADE LEVELS CRUD ====================

    /**
     * Create a grade level.
     */
    public function createGradeLevel(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'short_name' => 'nullable|string|max:50',
            'order' => 'required|integer|min:1',
            'cycle' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $gradeLevel = GradeLevel::create([
            'school_id' => $user->school_id,
            'name' => $request->name,
            'short_name' => $request->short_name,
            'order' => $request->order,
            'cycle' => $request->cycle,
        ]);

        return response()->json([
            'message' => 'Grade level created successfully',
            'grade_level' => $gradeLevel,
        ], 201);
    }

    /**
     * Update a grade level.
     */
    public function updateGradeLevel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $gradeLevel = GradeLevel::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'short_name' => 'nullable|string|max:50',
            'order' => 'sometimes|integer|min:1',
            'cycle' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $gradeLevel->update($request->only(['name', 'short_name', 'order', 'cycle']));

        return response()->json([
            'message' => 'Grade level updated successfully',
            'grade_level' => $gradeLevel,
        ]);
    }

    /**
     * Delete a grade level.
     */
    public function deleteGradeLevel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $gradeLevel = GradeLevel::where('school_id', $user->school_id)->findOrFail($id);

        // Check if any students or sections are using this grade level
        if ($gradeLevel->sections()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete grade level with existing sections. Delete sections first.',
            ], 400);
        }

        $gradeLevel->delete();

        return response()->json(['message' => 'Grade level deleted successfully']);
    }

    /**
     * Bulk create grade levels (e.g., JSS1, JSS2, JSS3 all at once).
     */
    public function bulkCreateGradeLevels(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'prefix' => 'required|string|max:50', // e.g., "JSS"
            'start_order' => 'required|integer|min:1',
            'count' => 'required|integer|min:1|max:20',
            'cycle' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($request, $user) {
            $gradeLevels = [];
            for ($i = 0; $i < $request->count; $i++) {
                $order = $request->start_order + $i;
                $gradeLevel = GradeLevel::create([
                    'school_id' => $user->school_id,
                    'name' => "{$request->prefix} {$order}",
                    'short_name' => "{$request->prefix}{$order}",
                    'order' => $order,
                    'cycle' => $request->cycle,
                ]);
                $gradeLevels[] = $gradeLevel;
            }

            return response()->json([
                'message' => "Created {$request->count} grade levels",
                'grade_levels' => $gradeLevels,
            ], 201);
        });
    }

    // ==================== PHASE 2: SECTIONS CRUD ====================

    /**
     * List sections for a grade level.
     */
    public function sectionsIndex(Request $request, int $gradeLevelId): JsonResponse
    {
        $user = $request->user();

        $sections = Section::where('school_id', $user->school_id)
            ->where('grade_level_id', $gradeLevelId)
            ->get()
            ->map(function ($section) {
                return [
                    'id' => $section->id,
                    'grade_level_id' => $section->grade_level_id,
                    'name' => $section->name,
                    'room_number' => $section->room_number,
                    'capacity' => $section->capacity,
                ];
            });

        return response()->json(['sections' => $sections]);
    }

    /**
     * Create a section.
     */
    public function createSection(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'required|exists:grade_levels,id',
            'name' => 'required|string|max:50',
            'room_number' => 'nullable|string|max:50',
            'capacity' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $gradeLevel = GradeLevel::where('school_id', $user->school_id)
            ->findOrFail($request->grade_level_id);

        $section = Section::create([
            'school_id' => $user->school_id,
            'grade_level_id' => $gradeLevel->id,
            'name' => $request->name,
            'room_number' => $request->room_number,
            'capacity' => $request->capacity,
        ]);

        return response()->json([
            'message' => 'Section created successfully',
            'section' => $section,
        ], 201);
    }

    /**
     * Update a section.
     */
    public function updateSection(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $section = Section::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:50',
            'room_number' => 'nullable|string|max:50',
            'capacity' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $section->update($request->only(['name', 'room_number', 'capacity']));

        return response()->json([
            'message' => 'Section updated successfully',
            'section' => $section,
        ]);
    }

    /**
     * Delete a section.
     */
    public function deleteSection(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $section = Section::where('school_id', $user->school_id)->findOrFail($id);

        $section->delete();

        return response()->json(['message' => 'Section deleted successfully']);
    }

    // ==================== PHASE 2: DEPARTMENTS CRUD ====================

    /**
     * List all departments for the school.
     */
    public function departmentsIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $departments = Department::where('school_id', $user->school_id)
            ->orderBy('name')
            ->get()
            ->map(function ($dept) {
                return [
                    'id' => $dept->id,
                    'name' => $dept->name,
                    'code' => $dept->code,
                ];
            });

        return response()->json(['departments' => $departments]);
    }

    /**
     * Create a department.
     */
    public function createDepartment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $department = Department::create([
            'school_id' => $user->school_id,
            'name' => $request->name,
            'code' => $request->code,
        ]);

        return response()->json([
            'message' => 'Department created successfully',
            'department' => $department,
        ], 201);
    }

    /**
     * Update a department.
     */
    public function updateDepartment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $department = Department::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'code' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $department->update($request->only(['name', 'code']));

        return response()->json([
            'message' => 'Department updated successfully',
            'department' => $department,
        ]);
    }

    /**
     * Delete a department.
     */
    public function deleteDepartment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $department = Department::where('school_id', $user->school_id)->findOrFail($id);

        if ($department->subjects()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete department with assigned subjects. Reassign or delete subjects first.',
            ], 400);
        }

        $department->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }

    // ==================== PHASE 2: SUBJECTS CRUD ====================

    /**
     * Create a subject.
     */
    public function createSubject(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:20',
            'type' => 'required|in:core,elective,departmental',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $subject = Subject::create([
            'school_id' => $user->school_id,
            'name' => $request->name,
            'code' => $request->code,
            'type' => $request->type,
            'department_id' => $request->department_id,
        ]);

        return response()->json([
            'message' => 'Subject created successfully',
            'subject' => $subject,
        ], 201);
    }

    /**
     * Update a subject.
     */
    public function updateSubject(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $subject = Subject::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'code' => 'nullable|string|max:20',
            'type' => 'sometimes|in:core,elective,departmental',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $subject->update($request->only(['name', 'code', 'type', 'department_id']));

        return response()->json([
            'message' => 'Subject updated successfully',
            'subject' => $subject,
        ]);
    }

    /**
     * Delete a subject.
     */
    public function deleteSubject(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $subject = Subject::where('school_id', $user->school_id)->findOrFail($id);

        $subject->delete();

        return response()->json(['message' => 'Subject deleted successfully']);
    }

    // ==================== PHASE 2: SUBJECT-TO-GRADE MAPPINGS ====================

    /**
     * Get subjects assigned to a grade level.
     */
    public function gradeLevelSubjects(Request $request, int $gradeLevelId): JsonResponse
    {
        $user = $request->user();

        $mappings = GradeLevelSubject::where('school_id', $user->school_id)
            ->where('grade_level_id', $gradeLevelId)
            ->with(['subject', 'department'])
            ->get()
            ->map(function ($mapping) {
                return [
                    'id' => $mapping->id,
                    'subject_id' => $mapping->subject_id,
                    'subject_name' => $mapping->subject->name,
                    'subject_code' => $mapping->subject->code,
                    'subject_type' => $mapping->subject->type,
                    'is_compulsory' => $mapping->is_compulsory,
                    'department_id' => $mapping->department_id,
                    'department_name' => $mapping->department?->name,
                ];
            });

        return response()->json(['mappings' => $mappings]);
    }

    /**
     * Assign a subject to a grade level.
     */
    public function assignSubjectToGrade(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'is_compulsory' => 'boolean',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Check if already assigned
        $existing = GradeLevelSubject::where('school_id', $user->school_id)
            ->where('grade_level_id', $request->grade_level_id)
            ->where('subject_id', $request->subject_id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Subject is already assigned to this grade level.',
            ], 409);
        }

        $mapping = GradeLevelSubject::create([
            'school_id' => $user->school_id,
            'grade_level_id' => $request->grade_level_id,
            'subject_id' => $request->subject_id,
            'is_compulsory' => $request->is_compulsory ?? true,
            'department_id' => $request->department_id,
        ]);

        return response()->json([
            'message' => 'Subject assigned to grade level successfully',
            'mapping' => $mapping,
        ], 201);
    }

    /**
     * Bulk assign subjects to multiple grade levels.
     */
    public function bulkAssignSubjects(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_level_ids' => 'required|array|min:1',
            'grade_level_ids.*' => 'exists:grade_levels,id',
            'subject_ids' => 'required|array|min:1',
            'subject_ids.*' => 'exists:subjects,id',
            'is_compulsory' => 'boolean',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($request, $user) {
            $created = 0;
            foreach ($request->grade_level_ids as $gradeLevelId) {
                foreach ($request->subject_ids as $subjectId) {
                    // Skip if already assigned
                    $exists = GradeLevelSubject::where('school_id', $user->school_id)
                        ->where('grade_level_id', $gradeLevelId)
                        ->where('subject_id', $subjectId)
                        ->exists();
                    
                    if (!$exists) {
                        GradeLevelSubject::create([
                            'school_id' => $user->school_id,
                            'grade_level_id' => $gradeLevelId,
                            'subject_id' => $subjectId,
                            'is_compulsory' => $request->is_compulsory ?? true,
                            'department_id' => $request->department_id,
                        ]);
                        $created++;
                    }
                }
            }

            return response()->json([
                'message' => "Assigned {$created} subject(s) to " . count($request->grade_level_ids) . " grade level(s)",
                'created_count' => $created,
            ], 201);
        });
    }

    /**
     * Remove a subject from a grade level.
     */
    public function removeSubjectFromGrade(Request $request, int $mappingId): JsonResponse
    {
        $user = $request->user();
        $mapping = GradeLevelSubject::where('school_id', $user->school_id)->findOrFail($mappingId);

        $mapping->delete();

        return response()->json(['message' => 'Subject removed from grade level']);
    }

    /**
     * Delete CA week configuration for a specific grade + subject + term.
     */
    public function deleteCaWeeks(Request $request, int $termId, int $gradeLevelId, int $subjectId): JsonResponse
    {
        $user = $request->user();
        
        $deleted = CaWeek::where('school_id', $user->school_id)
            ->where('term_id', $termId)
            ->where('grade_level_id', $gradeLevelId)
            ->where('subject_id', $subjectId)
            ->delete();

        return response()->json(['message' => "CA configuration deleted successfully ($deleted records removed)"]);
    }

    // ==================== PHASE 4: TEACHER ASSIGNMENTS ====================

    /**
     * List all teachers available for assignment.
     */
    public function teachersIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $teachers = User::where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->with('profile')
            ->get()
            ->map(function ($teacher) {
                $data = $teacher->profile?->data ?? [];
                return [
                    'id' => $teacher->id,
                    'email' => $teacher->email,
                    'name' => ($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''),
                ];
            });

        return response()->json(['teachers' => $teachers]);
    }

    /**
     * Assign a teacher to a subject + grade level.
     */
    public function assignTeacher(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'teacher_id' => 'required|exists:users,id',
            'subject_id' => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'section_id' => 'nullable|exists:sections,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Verify teacher belongs to school
        $teacher = User::where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->findOrFail($request->teacher_id);

        $assignment = TeacherSubject::create([
            'school_id' => $user->school_id,
            'teacher_id' => $teacher->id,
            'subject_id' => $request->subject_id,
            'grade_level_id' => $request->grade_level_id,
            'section_id' => $request->section_id,
        ]);

        return response()->json([
            'message' => 'Teacher assigned successfully',
            'assignment' => $assignment,
        ], 201);
    }

    /**
     * Remove a teacher assignment.
     */
    public function removeTeacherAssignment(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $assignment = TeacherSubject::where('school_id', $user->school_id)->findOrFail($id);

        $assignment->delete();

        return response()->json(['message' => 'Teacher assignment removed']);
    }

    // ==================== PHASE 5: SCHEME OF WORK ====================

    /**
     * List all schemes of work for the authenticated user's school.
     */
    public function schemesIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = SchemeOfWork::forSchool($user->school_id)
            ->with(['subject', 'gradeLevel', 'term', 'creator']);

        // Apply filters
        if ($request->filled('grade_level_id')) {
            $query->forGrade($request->grade_level_id);
        }
        if ($request->filled('subject_id')) {
            $query->forSubject($request->subject_id);
        }
        if ($request->filled('term_id')) {
            $query->forTerm($request->term_id);
        }
        if ($request->filled('status')) {
            if ($request->status === 'published') {
                $query->published();
            } elseif ($request->status === 'draft') {
                $query->draft();
            }
        }

        $schemes = $query->orderBy('week_number')->get();

        return response()->json(['schemes' => $schemes]);
    }

    /**
     * Create a new scheme of work entry.
     */
    public function createScheme(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'term_id' => 'required|exists:academic_terms,id',
            'week_number' => 'required|integer|min:1|max:20',
            'topic' => 'required|string|max:255',
            'aspects' => 'nullable|array',
            'aspects.objectives' => 'nullable|string',
            'aspects.activities' => 'nullable|string',
            'aspects.resources' => 'nullable|string',
            'aspects.evaluation' => 'nullable|string',
            'status' => 'nullable|in:draft,published',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $scheme = SchemeOfWork::create([
            'school_id' => $user->school_id,
            'subject_id' => $request->subject_id,
            'grade_level_id' => $request->grade_level_id,
            'term_id' => $request->term_id,
            'week_number' => $request->week_number,
            'topic' => $request->topic,
            'aspects' => $request->aspects,
            'status' => $request->status ?? 'draft',
            'created_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Scheme of work created',
            'scheme' => $scheme->load(['subject', 'gradeLevel', 'term']),
        ], 201);
    }

    /**
     * Update a scheme of work entry.
     */
    public function updateScheme(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $scheme = SchemeOfWork::forSchool($user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'topic' => 'sometimes|string|max:255',
            'aspects' => 'nullable|array',
            'aspects.objectives' => 'nullable|string',
            'aspects.activities' => 'nullable|string',
            'aspects.resources' => 'nullable|string',
            'aspects.evaluation' => 'nullable|string',
            'status' => 'sometimes|in:draft,published',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $scheme->update($request->only(['topic', 'aspects', 'status']));

        return response()->json([
            'message' => 'Scheme of work updated',
            'scheme' => $scheme->fresh()->load(['subject', 'gradeLevel', 'term']),
        ]);
    }

    /**
     * Delete a scheme of work entry.
     */
    public function deleteScheme(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $scheme = SchemeOfWork::forSchool($user->school_id)->findOrFail($id);

        $scheme->delete();

        return response()->json(['message' => 'Scheme of work deleted']);
    }

    /**
     * Publish a scheme of work entry.
     */
    public function publishScheme(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $scheme = SchemeOfWork::forSchool($user->school_id)->findOrFail($id);

        $scheme->update(['status' => 'published']);

        return response()->json([
            'message' => 'Scheme of work published',
            'scheme' => $scheme->fresh()->load(['subject', 'gradeLevel', 'term']),
        ]);
    }

    /**
     * Bulk create scheme of work entries for a subject + grade + term.
     */
    public function bulkCreateSchemes(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'term_id' => 'required|exists:academic_terms,id',
            'weeks' => 'required|array|min:1',
            'weeks.*.week_number' => 'required|integer|min:1|max:20',
            'weeks.*.topic' => 'required|string|max:255',
            'weeks.*.aspects' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $created = [];
        foreach ($request->weeks as $weekData) {
            $scheme = SchemeOfWork::create([
                'school_id' => $user->school_id,
                'subject_id' => $request->subject_id,
                'grade_level_id' => $request->grade_level_id,
                'term_id' => $request->term_id,
                'week_number' => $weekData['week_number'],
                'topic' => $weekData['topic'],
                'aspects' => $weekData['aspects'] ?? null,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);
            $created[] = $scheme;
        }

        return response()->json([
            'message' => count($created) . ' scheme entries created',
            'schemes' => $created,
        ], 201);
    }

    /**
     * AI Scheme Generator - Production Ready.
     * Generates scheme of work aspects based on grade level, subject, term, and topics.
     */
    public function generateSchemeAI(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'scheme_id' => 'nullable|exists:schemes_of_work,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'term_id' => 'required|exists:academic_terms,id',
            'weeks' => 'required|array|min:1',
            'weeks.*' => 'required|integer|min:1|max:20',
            'topics' => 'nullable|array',
            'topics.*' => 'string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();

            // Fetch grade and subject info
            $gradeLevel = GradeLevel::findOrFail($request->grade_level_id);
            $subject = Subject::findOrFail($request->subject_id);
            $term = AcademicTerm::findOrFail($request->term_id);

            $aiService = new AiService();
            $generatedSchemes = [];
            $usedFallback = false;
            $fallbackReason = null;

            foreach ($request->weeks as $index => $weekNumber) {
                $topic = $request->topics[$index] ?? "Week {$weekNumber} Topic";

                // Generate aspects using AI service
                $schemeData = [
                    'topic' => $topic,
                    'week_number' => $weekNumber,
                    'term_name' => $term->name,
                    'objectives' => '',
                    'activities' => '',
                    'resources' => '',
                    'evaluation' => '',
                ];

                $gradeInfo = [
                    'name' => $gradeLevel->name,
                    'short_name' => $gradeLevel->short_name,
                    'cycle' => $gradeLevel->cycle ?? 'General',
                ];

                $subjectInfo = [
                    'name' => $subject->name,
                    'code' => $subject->code ?? $subject->name,
                    'type' => $subject->type ?? 'core',
                ];

                // Use the lesson note AI to generate scheme aspects
                $result = $aiService->generateLessonNote($schemeData, $gradeInfo, $subjectInfo, 30);

                // Track if fallback was used
                if (!empty($result['_used_fallback'])) {
                    $usedFallback = true;
                    $fallbackReason = $result['_fallback_reason'] ?? 'Unknown';
                }

                // Map lesson note aspects to scheme aspects
                $generatedSchemes[] = [
                    'week_number' => $weekNumber,
                    'topic' => $topic,
                    'aspects' => [
                        'objectives' => $result['aspects']['objective'] ?? '',
                        'activities' => $result['aspects']['content'] ?? '',
                        'resources' => $result['aspects']['materials'] ?? '',
                        'evaluation' => $result['aspects']['evaluation'] ?? '',
                    ],
                ];
            }

            // Determine source and message based on fallback status
            if ($usedFallback) {
                return response()->json([
                    'message' => 'AI unavailable — used smart template instead',
                    'schemes' => $generatedSchemes,
                    'source' => 'smart_template',
                    'ai_unavailable' => true,
                    'ai_reason' => $fallbackReason ?? 'AI API error',
                ], 207); // 207 Multi-Status: partial success
            }

            return response()->json([
                'message' => 'Scheme generated successfully with AI',
                'schemes' => $generatedSchemes,
                'source' => 'ai_api',
                'ai_unavailable' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('AI scheme generation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to generate scheme',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // ==================== PHASE 6: LESSON NOTES ====================

    /**
     * List all lesson notes for the authenticated user's school.
     */
    public function lessonNotesIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = LessonNote::forSchool($user->school_id)
            ->with(['scheme', 'teacher', 'gradeLevel', 'subject', 'term']);

        // Apply search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('topic', 'like', "%{$search}%")
                  ->orWhereHas('subject', function($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('gradeLevel', function($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('term', function($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Apply filters
        if ($request->filled('teacher_id')) {
            $query->forTeacher($request->teacher_id);
        }
        if ($request->filled('grade_level_id')) {
            $query->forGrade($request->grade_level_id);
        }
        if ($request->filled('subject_id')) {
            $query->forSubject($request->subject_id);
        }
        if ($request->filled('term_id')) {
            $query->forTerm($request->term_id);
        }
        if ($request->filled('status')) {
            if ($request->status === 'published') {
                $query->published();
            } elseif ($request->status === 'draft') {
                $query->draft();
            }
        }

        // Pagination
        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);
        $paginated = $query->ordered()->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'lesson_notes' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'has_more' => $paginated->hasMorePages(),
            ]
        ]);
    }

    /**
     * Create a new lesson note.
     */
    public function createLessonNote(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'scheme_id' => 'required|exists:schemes_of_work,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'term_id' => 'required|exists:academic_terms,id',
            'week_number' => 'required|integer|min:1|max:20',
            'topic' => 'required|string|max:255',
            'aspects' => 'nullable|array',
            'aspects.objective' => 'nullable|string',
            'aspects.content' => 'nullable|string',
            'aspects.methodology' => 'nullable|string',
            'aspects.evaluation' => 'nullable|string',
            'aspects.materials' => 'nullable|string',
            'contact_number' => 'nullable|integer|min:1',
            'status' => 'nullable|in:draft,published',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $note = LessonNote::create([
            'school_id' => $user->school_id,
            'scheme_id' => $request->scheme_id,
            'teacher_id' => $user->id,
            'grade_level_id' => $request->grade_level_id,
            'subject_id' => $request->subject_id,
            'term_id' => $request->term_id,
            'week_number' => $request->week_number,
            'topic' => $request->topic,
            'aspects' => $request->aspects,
            'contact_number' => $request->contact_number,
            'status' => $request->status ?? 'draft',
        ]);

        return response()->json([
            'message' => 'Lesson note created',
            'lesson_note' => $note->load(['scheme', 'teacher', 'gradeLevel', 'subject', 'term']),
        ], 201);
    }

    /**
     * Update a lesson note.
     */
    public function updateLessonNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $note = LessonNote::forSchool($user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'topic' => 'sometimes|string|max:255',
            'aspects' => 'nullable|array',
            'aspects.objective' => 'nullable|string',
            'aspects.content' => 'nullable|string',
            'aspects.methodology' => 'nullable|string',
            'aspects.evaluation' => 'nullable|string',
            'aspects.materials' => 'nullable|string',
            'contact_number' => 'nullable|integer|min:1',
            'status' => 'sometimes|in:draft,published',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $note->update($request->only(['topic', 'aspects', 'contact_number', 'status']));

        return response()->json([
            'message' => 'Lesson note updated',
            'lesson_note' => $note->fresh()->load(['scheme', 'teacher', 'gradeLevel', 'subject', 'term']),
        ]);
    }

    /**
     * Delete a lesson note.
     */
    public function deleteLessonNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $note = LessonNote::forSchool($user->school_id)->findOrFail($id);

        $note->delete();

        return response()->json(['message' => 'Lesson note deleted']);
    }

    /**
     * Publish a lesson note.
     */
    public function publishLessonNote(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $note = LessonNote::forSchool($user->school_id)->findOrFail($id);

        $note->update(['status' => 'published']);

        return response()->json([
            'message' => 'Lesson note published',
            'lesson_note' => $note->fresh()->load(['scheme', 'teacher', 'gradeLevel', 'subject', 'term']),
        ]);
    }

    /**
     * AI Lesson Note Generator - Production Ready.
     * Fetches scheme, grade, and subject data to generate contextual lesson notes.
     */
    public function generateLessonNoteAI(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'scheme_id' => 'required|exists:schemes_of_work,id',
            'target_audience_size' => 'nullable|integer|min:1|max:200',
            'topic_override' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();

            // Fetch scheme with all related data
            $scheme = SchemeOfWork::where('school_id', $user->school_id)
                ->with(['subject', 'gradeLevel', 'term'])
                ->findOrFail($request->scheme_id);

            // Use topic_override if provided, otherwise use scheme's topic
            $topic = $request->topic_override ?? $scheme->topic;

            // Prepare context data for AI
            $schemeData = [
                'id' => $scheme->id,
                'topic' => $topic, // Use overridden topic
                'week_number' => $scheme->week_number,
                'term_name' => $scheme->term?->name ?? 'Current Term',
                'objectives' => $scheme->aspects['objectives'] ?? '',
                'activities' => $scheme->aspects['activities'] ?? '',
                'resources' => $scheme->aspects['resources'] ?? '',
                'evaluation' => $scheme->aspects['evaluation'] ?? '',
            ];

            $gradeInfo = [
                'id' => $scheme->gradeLevel->id,
                'name' => $scheme->gradeLevel->name,
                'short_name' => $scheme->gradeLevel->short_name,
                'cycle' => $scheme->gradeLevel->cycle ?? 'General',
            ];

            $subjectInfo = [
                'id' => $scheme->subject->id,
                'name' => $scheme->subject->name,
                'code' => $scheme->subject->code ?? $scheme->subject->name,
                'type' => $scheme->subject->type ?? 'core',
            ];

            $audienceSize = $request->target_audience_size ?? 30;

            // Generate lesson note using AI service
            $aiService = new AiService();
            $lessonNote = $aiService->generateLessonNote($schemeData, $gradeInfo, $subjectInfo, $audienceSize);

            // Check if fallback was used
            $usedFallback = !empty($lessonNote['_used_fallback']);
            $fallbackReason = $lessonNote['_fallback_reason'] ?? null;
            // Clean up internal flags before sending to frontend
            unset($lessonNote['_used_fallback'], $lessonNote['_fallback_reason']);

            if ($usedFallback) {
                return response()->json([
                    'message' => 'AI unavailable — used smart template instead',
                    'lesson_note' => $lessonNote,
                    'source' => 'smart_template',
                    'ai_unavailable' => true,
                    'ai_reason' => $fallbackReason ?? 'AI API error',
                ], 207);
            }

            return response()->json([
                'message' => 'Lesson note generated successfully with AI',
                'lesson_note' => $lessonNote,
                'source' => 'ai_api',
                'ai_unavailable' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('AI lesson note generation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to generate lesson note',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * AI Lecture Generator.
     * Generates structured lecture content with multiple sections.
     */
    public function generateLectureAI(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'sections' => 'nullable|integer|min:2|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $sections = $request->sections ?? 5;

            $gradeLevel = GradeLevel::findOrFail($request->grade_level_id);
            $subject = Subject::findOrFail($request->subject_id);

            $aiService = new AiService();
            
            $lectureData = [
                'title' => $request->title,
                'description' => $request->description ?? '',
            ];

            $gradeInfo = [
                'name' => $gradeLevel->name,
                'short_name' => $gradeLevel->short_name,
                'cycle' => $gradeLevel->cycle ?? 'General',
            ];

            $subjectInfo = [
                'name' => $subject->name,
                'code' => $subject->code ?? $subject->name,
            ];

            $generatedLecture = $aiService->generateLecture($lectureData, $gradeInfo, $subjectInfo, $sections);

            $usedFallback = !empty($generatedLecture['_used_fallback']);
            $fallbackReason = $generatedLecture['_fallback_reason'] ?? null;

            unset($generatedLecture['_used_fallback'], $generatedLecture['_fallback_reason']);

            if ($usedFallback) {
                return response()->json([
                    'message' => 'AI unavailable — used smart template instead',
                    'lecture' => $generatedLecture,
                    'source' => 'smart_template',
                    'ai_unavailable' => true,
                    'ai_reason' => $fallbackReason ?? 'AI API error',
                ], 207);
            }

            return response()->json([
                'message' => 'Lecture generated successfully with AI',
                'lecture' => $generatedLecture,
                'source' => 'ai_api',
                'ai_unavailable' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('AI lecture generation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to generate lecture',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * AI Exam Generator.
     * Generates structured exam questions.
     */
    public function generateExamAI(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'topics' => 'required|array',
            'mcq_count' => 'nullable|integer|min:0|max:50',
            'theory_count' => 'nullable|integer|min:0|max:20',
            'difficulty' => 'nullable|in:easy,medium,hard',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $gradeLevel = GradeLevel::findOrFail($request->grade_level_id);
            $subject = Subject::findOrFail($request->subject_id);

            $gradeInfo = [
                'name' => $gradeLevel->name,
                'short_name' => $gradeLevel->short_name,
                'cycle' => $gradeLevel->cycle ?? 'General',
            ];

            $subjectInfo = [
                'name' => $subject->name,
                'code' => $subject->code ?? $subject->name,
            ];

            $aiService = new AiService();
            $generatedExam = $aiService->generateExam(
                $request->all(),
                $gradeInfo,
                $subjectInfo,
                $request->topics,
                [
                    'mcq_count' => $request->mcq_count ?? 10,
                    'theory_count' => $request->theory_count ?? 3,
                    'difficulty' => $request->difficulty ?? 'medium',
                ]
            );

            $usedFallback = !empty($generatedExam['_used_fallback']);
            $fallbackReason = $generatedExam['_fallback_reason'] ?? null;

            unset($generatedExam['_used_fallback'], $generatedExam['_fallback_reason']);

            if ($usedFallback) {
                return response()->json([
                    'message' => 'AI unavailable — used smart template instead',
                    'exam' => $generatedExam,
                    'source' => 'smart_template',
                    'ai_unavailable' => true,
                    'ai_reason' => $fallbackReason ?? 'AI API error',
                ], 207);
            }

            return response()->json([
                'message' => 'Exam generated successfully with AI',
                'exam' => $generatedExam,
                'source' => 'ai_api',
                'ai_unavailable' => false,
            ]);
        } catch (\Exception $e) {
            Log::error('AI exam generation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to generate exam',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}