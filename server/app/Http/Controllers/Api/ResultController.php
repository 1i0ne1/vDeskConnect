<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\AcademicSession;
use App\Models\CaWeek;
use App\Models\Exam;
use App\Models\ExamSubmission;
use App\Models\GradeLevel;
use App\Models\GradeScale;
use App\Models\StudentGrade;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ResultController extends Controller
{
    /**
     * Get Gradebook data with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $schoolId = $user->school_id;

        $query = StudentGrade::where('school_id', $schoolId)
            ->with(['student.profile', 'subject', 'gradeLevel', 'term']);

        if ($request->filled('grade_level_id')) {
            $query->where('grade_level_id', $request->grade_level_id);
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('term_id')) {
            $query->where('term_id', $request->term_id);
        }

        $grades = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $grades
        ]);
    }

    /**
     * Compute grades for a specific class, subject, and term.
     */
    public function computeGrades(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'required|exists:grade_levels,id',
            'term_id' => 'required|exists:academic_terms,id',
            'subject_id' => 'nullable|exists:subjects,id', // If null, compute for all subjects in grade level
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $schoolId = $user->school_id;
        $gradeLevelId = $request->grade_level_id;
        $termId = $request->term_id;
        $subjectId = $request->subject_id;

        // Get default grade scale
        $gradeScale = GradeScale::where('school_id', $schoolId)->where('is_default', true)->first()
            ?? GradeScale::where('school_id', $schoolId)->first();

        if (!$gradeScale) {
            return response()->json(['message' => 'No grade scale defined for this school'], 400);
        }

        // Get students in this grade level (via profile)
        $students = User::where('school_id', $schoolId)
            ->where('role', 'student')
            ->whereHas('profile', function($q) use ($gradeLevelId) {
                $q->where('data->grade_level_id', $gradeLevelId);
            })->get();

        if ($students->isEmpty()) {
            return response()->json(['message' => 'No students found in this grade level'], 404);
        }

        // Get subjects to process
        $subjectsQuery = Subject::where('school_id', $schoolId);
        if ($subjectId) {
            $subjectsQuery->where('id', $subjectId);
        } else {
            // Find subjects mapped to this grade level
            $subjectsQuery->whereHas('gradeLevels', function($q) use ($gradeLevelId) {
                $q->where('grade_level_id', $gradeLevelId);
            });
        }
        $subjects = $subjectsQuery->get();

        $processedCount = 0;

        foreach ($subjects as $subject) {
            $subjectScores = [];

            foreach ($students as $student) {
                // 1. Aggregate CA Scores
                $caTotal = CaWeek::where('academic_term_id', $termId)
                    ->where('grade_level_id', $gradeLevelId)
                    ->where('subject_id', $subject->id)
                    ->where('student_id', $student->id)
                    ->sum('score');

                // 2. Get Exam Score (Highest published submission)
                $examScore = ExamSubmission::whereHas('exam', function($q) use ($subject, $gradeLevelId, $termId) {
                        $q->where('subject_id', $subject->id)
                          ->where('grade_level_id', $gradeLevelId)
                          ->where('term_id', $termId)
                          ->where('published', true);
                    })
                    ->where('student_id', $student->id)
                    ->where('status', 'graded')
                    ->max('score') ?? 0;

                $totalScore = $caTotal + $examScore;
                
                $gradeInfo = $gradeScale->getGradeForScore($totalScore);

                $subjectScores[] = [
                    'student_id' => $student->id,
                    'ca_score' => $caTotal,
                    'exam_score' => $examScore,
                    'total_score' => $totalScore,
                    'grade' => $gradeInfo['grade'] ?? 'F',
                    'remark' => $gradeInfo['remark'] ?? 'Fail',
                ];
            }

            // 3. Rank students in this subject
            usort($subjectScores, function($a, $b) {
                return $b['total_score'] <=> $a['total_score'];
            });

            foreach ($subjectScores as $index => $scoreData) {
                StudentGrade::updateOrCreate(
                    [
                        'school_id' => $schoolId,
                        'student_id' => $scoreData['student_id'],
                        'subject_id' => $subject->id,
                        'term_id' => $termId,
                    ],
                    [
                        'grade_level_id' => $gradeLevelId,
                        'ca_score' => $scoreData['ca_score'],
                        'exam_score' => $scoreData['exam_score'],
                        'total_score' => $scoreData['total_score'],
                        'grade' => $scoreData['grade'],
                        'remark' => $scoreData['remark'],
                        'position' => $index + 1,
                    ]
                );
            }
            $processedCount += count($subjectScores);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully computed $processedCount grades across " . count($subjects) . " subjects."
        ]);
    }
}
