<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\Exam;
use App\Models\ExamSubmission;
use App\Models\GradeLevel;
use App\Models\GradeScale;
use App\Models\ReportCard;
use App\Models\StudentGrade;
use App\Models\Subject;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
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

        // If student, only show their own grades
        if ($user->role === 'student') {
            $query->where('student_id', $user->id);
        }

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
            // Find subjects mapped to this grade level via the pivot table
            $mappedSubjectIds = DB::table('grade_level_subjects')
                ->where('grade_level_id', $gradeLevelId)
                ->where('school_id', $schoolId)
                ->pluck('subject_id');
            $subjectsQuery->whereIn('id', $mappedSubjectIds);
        }
        $subjects = $subjectsQuery->get();

        $school = $user->school;
        $config = $school->config;
        $caWeight = $config['ca_weight'] ?? 40;
        $examWeight = $config['exam_weight'] ?? 60;

        $processedCount = 0;

        foreach ($subjects as $subject) {
            $subjectScores = [];

            foreach ($students as $student) {
                // 1. CA Score — Scaled sum of all graded CA tests
                $caSubmissions = ExamSubmission::whereHas('exam', function($q) use ($subject, $gradeLevelId, $termId) {
                        $q->where('subject_id', $subject->id)
                          ->where('grade_level_id', $gradeLevelId)
                          ->where('term_id', $termId)
                          ->where('published', true)
                          ->where('is_ca_test', true);
                    })
                    ->where('student_id', $student->id)
                    ->where('status', 'graded')
                    ->with('exam')
                    ->get();

                $caObtained = 0;
                $caMaxPossible = 0;
                foreach ($caSubmissions as $sub) {
                    $caObtained += $sub->auto_score + ($sub->manual_score ?? 0);
                    $caMaxPossible += $sub->exam->total_marks ?? 0;
                }

                $caFinal = ($caMaxPossible > 0) ? ($caObtained / $caMaxPossible) * $caWeight : 0;

                // 2. Exam Score — Scaled highest graded FINAL exam
                $examSubmission = ExamSubmission::whereHas('exam', function($q) use ($subject, $gradeLevelId, $termId) {
                        $q->where('subject_id', $subject->id)
                          ->where('grade_level_id', $gradeLevelId)
                          ->where('term_id', $termId)
                          ->where('published', true)
                          ->where('is_ca_test', false);
                    })
                    ->where('student_id', $student->id)
                    ->where('status', 'graded')
                    ->with('exam')
                    ->orderBy('auto_score', 'desc')
                    ->first();

                $examObtained = 0;
                $examMaxPossible = 0;
                if ($examSubmission) {
                    $examObtained = $examSubmission->auto_score + ($examSubmission->manual_score ?? 0);
                    $examMaxPossible = $examSubmission->exam->total_marks ?? 0;
                }

                $examFinal = ($examMaxPossible > 0) ? ($examObtained / $examMaxPossible) * $examWeight : 0;

                $totalScore = round($caFinal + $examFinal, 2);
                
                $gradeInfo = $gradeScale->getGradeForScore($totalScore);

                $subjectScores[] = [
                    'student_id' => $student->id,
                    'ca_score' => round($caFinal, 2),
                    'exam_score' => round($examFinal, 2),
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

    /**
     * Compute overall positions for students in a class.
     */
    public function computeOverallResults(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'required|exists:grade_levels,id',
            'term_id' => 'required|exists:academic_terms,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $schoolId = $user->school_id;
        $gradeLevelId = $request->grade_level_id;
        $termId = $request->term_id;

        // 1. Fetch all student grades for this class and term
        $allGrades = StudentGrade::where('school_id', $schoolId)
            ->where('grade_level_id', $gradeLevelId)
            ->where('term_id', $termId)
            ->get();

        if ($allGrades->isEmpty()) {
            return response()->json(['message' => 'No grades found for this class/term. Compute subject grades first.'], 404);
        }

        // 2. Group by student and calculate average
        $studentTotals = [];
        foreach ($allGrades as $grade) {
            if (!isset($studentTotals[$grade->student_id])) {
                $studentTotals[$grade->student_id] = [
                    'student_id' => $grade->student_id,
                    'total_score' => 0,
                    'subjects_count' => 0,
                ];
            }
            $studentTotals[$grade->student_id]['total_score'] += $grade->total_score;
            $studentTotals[$grade->student_id]['subjects_count']++;
        }

        // Calculate averages
        $rankings = [];
        foreach ($studentTotals as $id => $data) {
            $rankings[] = [
                'student_id' => $id,
                'average' => $data['total_score'] / max(1, $data['subjects_count']),
                'total_score' => $data['total_score']
            ];
        }

        // 3. Sort by total_score (or average)
        usort($rankings, function($a, $b) {
            return $b['total_score'] <=> $a['total_score'];
        });

        // 4. Update or Create overall report card record (or just a ranking table?)
        // For now, let's just return the rankings or store them in a summary table if needed.
        // Actually, report_cards table is better for this.
        
        $term = AcademicTerm::findOrFail($termId);
        $sessionId = $term->session_id;

        foreach ($rankings as $index => $rank) {
            ReportCard::updateOrCreate(
                [
                    'school_id' => $schoolId,
                    'student_id' => $rank['student_id'],
                    'term_id' => $termId,
                ],
                [
                    'session_id' => $sessionId,
                    'overall_average' => $rank['average'],
                    'overall_position' => $index + 1,
                    'total_students' => count($rankings),
                ]
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully computed overall positions for " . count($rankings) . " students.",
            'rankings' => $rankings
        ]);
    }

    /**
     * Generate bulk Result PINs.
     */
    public function generatePins(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'count' => 'required|integer|min:1|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $schoolId = $user->school_id;
        $count = $request->count;
        $pins = [];

        for ($i = 0; $i < $count; $i++) {
            $pin = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 10));
            
            // Ensure uniqueness
            while (DB::table('result_pins')->where('pin', $pin)->exists()) {
                $pin = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 10));
            }

            $pins[] = [
                'school_id' => $schoolId,
                'pin' => $pin,
                'used' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('result_pins')->insert($pins);

        return response()->json([
            'status' => 'success',
            'message' => "Successfully generated $count result checking PINs."
        ]);
    }

    /**
     * List all generated PINs.
     */
    public function listPins(Request $request): JsonResponse
    {
        $user = $request->user();
        $pins = DB::table('result_pins')
            ->where('school_id', $user->school_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $pins
        ]);
    }

    /**
     * Public endpoint to check result using a PIN.
     */
    public function checkResult(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|string',
            'pin' => 'required|string',
            'term_id' => 'required|exists:academic_terms,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Find the PIN
        $pinRecord = DB::table('result_pins')
            ->where('pin', $request->pin)
            ->first();

        if (!$pinRecord) {
            return response()->json(['message' => 'Invalid PIN'], 404);
        }

        if ($pinRecord->used && $pinRecord->student_id != $request->student_id) {
            return response()->json(['message' => 'This PIN has already been used by another student'], 403);
        }

        // Find the student
        $student = User::where('id', $request->student_id)
            ->where('role', 'student')
            ->first();

        if (!$student) {
            return response()->json(['message' => 'Student not found'], 404);
        }

        // Mark PIN as used if not already
        if (!$pinRecord->used) {
            DB::table('result_pins')
                ->where('id', $pinRecord->id)
                ->update([
                    'used' => true,
                    'student_id' => $student->id,
                    'updated_at' => now()
                ]);
        }

        // Fetch grades
        $grades = StudentGrade::where('student_id', $student->id)
            ->where('term_id', $request->term_id)
            ->with(['subject', 'gradeLevel', 'term'])
            ->get();

        // Fetch report card
        $reportCard = ReportCard::where('student_id', $student->id)
            ->where('term_id', $request->term_id)
            ->first();

        return response()->json([
            'status' => 'success',
            'student' => $student->load('profile'),
            'data' => $grades,
            'reportCard' => $reportCard
        ]);
    }

    /**
     * Generate PDF Report Cards for a class and term.
     */
    public function generateReportCards(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'required|exists:grade_levels,id',
            'term_id' => 'required|exists:academic_terms,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $schoolId = $user->school_id;
        $gradeLevelId = $request->grade_level_id;
        $termId = $request->term_id;

        // Fetch report cards for this class/term
        $reportCards = ReportCard::where('school_id', $schoolId)
            ->where('term_id', $termId)
            ->whereHas('student.profile', function($q) use ($gradeLevelId) {
                $q->where('data->grade_level_id', $gradeLevelId);
            })
            ->with(['student.profile', 'term', 'session'])
            ->get();

        if ($reportCards->isEmpty()) {
            return response()->json(['message' => 'No report cards found. Compute overall results first.'], 404);
        }

        $term = AcademicTerm::find($termId);
        $gradeLevel = GradeLevel::find($gradeLevelId);
        $school = $user->school;

        $generatedCount = 0;
        foreach ($reportCards as $reportCard) {
            $student = $reportCard->student;
            
            // Get all subject grades for this student
            $grades = StudentGrade::where('student_id', $student->id)
                ->where('term_id', $termId)
                ->with('subject')
                ->get();

            $data = [
                'school' => $school,
                'student' => $student,
                'term' => $term,
                'session' => $reportCard->session,
                'gradeLevel' => $gradeLevel,
                'reportCard' => $reportCard,
                'grades' => $grades
            ];

            $pdf = Pdf::loadView('reports.report_card', $data);
            
            // Save PDF to storage
            $fileName = "report_card_{$student->id}_{$termId}.pdf";
            $filePath = "reports/{$schoolId}/{$termId}/{$fileName}";
            
            \Illuminate\Support\Facades\Storage::disk('public')->put($filePath, $pdf->output());
            
            $reportCard->update([
                'pdf_url' => "/storage/{$filePath}",
                'generated_at' => now(),
            ]);

            $generatedCount++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Successfully generated $generatedCount report cards."
        ]);
    }

    /**
     * List generated report cards.
     */
    public function listReportCards(Request $request): JsonResponse
    {
        $user = $request->user();
        $schoolId = $user->school_id;

        $query = ReportCard::where('school_id', $schoolId)
            ->with(['student.profile', 'term', 'session']);

        if ($request->filled('grade_level_id')) {
            $gradeLevelId = $request->grade_level_id;
            $query->whereHas('student.profile', function($q) use ($gradeLevelId) {
                $q->where('data->grade_level_id', $gradeLevelId);
            });
        }

        if ($request->filled('term_id')) {
            $query->where('term_id', $request->term_id);
        }

        $reportCards = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $reportCards
        ]);
    }
}
