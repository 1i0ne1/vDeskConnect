<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lecture;
use App\Models\LectureAssignment;
use App\Models\LectureAssignmentQuestion;
use App\Models\LectureAssignmentSubmission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LectureAssignmentController extends Controller
{
    // ==================== ASSIGNMENTS ====================

    public function index(Request $request, int $lectureId): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($lectureId);

        $query = LectureAssignment::where('lecture_id', $lectureId)
            ->with(['creator:id,email', 'questions'])
            ->orderBy('created_at', 'desc');

        if ($user->isStudent()) {
            $query->where('status', 'published');
        }

        $assignments = $query->get();

        if ($user->isStudent()) {
            $assignments->each(function ($assignment) use ($user) {
                $assignment->my_submission = LectureAssignmentSubmission::where('assignment_id', $assignment->id)
                    ->where('student_id', $user->id)
                    ->first();
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $assignments,
        ]);
    }

    public function store(Request $request, int $lectureId): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($lectureId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'nullable|in:objective,theory,resource',
            'max_score' => 'nullable|integer|min:1|max:1000',
            'due_at' => 'nullable|date',
            'is_mandatory' => 'nullable|boolean',
            'allow_late_submission' => 'nullable|boolean',
            'status' => 'nullable|in:draft,published,closed',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $assignment = LectureAssignment::create([
            'school_id' => $user->school_id,
            'lecture_id' => $lectureId,
            'title' => $request->title,
            'description' => $request->description,
            'type' => $request->type ?? 'objective',
            'max_score' => $request->max_score ?? 100,
            'due_at' => $request->due_at,
            'is_mandatory' => $request->is_mandatory ?? true,
            'allow_late_submission' => $request->allow_late_submission ?? false,
            'status' => $request->status ?? 'draft',
            'created_by' => $user->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Assignment created successfully',
            'data' => $assignment->load('questions'),
        ], 201);
    }

    public function show(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $query = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->where('id', $assignmentId);

        if ($user->isStudent()) {
            $query->where('status', 'published');
        }

        $assignment = $query->with(['lecture', 'questions', 'creator:id,email'])->firstOrFail();

        if ($user->isStudent()) {
            $assignment->my_submission = LectureAssignmentSubmission::where('assignment_id', $assignmentId)
                ->where('student_id', $user->id)
                ->first();
        }

        return response()->json([
            'status' => 'success',
            'data' => $assignment,
        ]);
    }

    public function update(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:objective,theory,resource',
            'max_score' => 'sometimes|integer|min:1|max:1000',
            'due_at' => 'nullable|date',
            'is_mandatory' => 'sometimes|boolean',
            'allow_late_submission' => 'sometimes|boolean',
            'status' => 'sometimes|in:draft,published,closed',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $assignment->update($request->only([
            'title', 'description', 'type', 'max_score', 'due_at',
            'is_mandatory', 'allow_late_submission', 'status',
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Assignment updated successfully',
            'data' => $assignment->load('questions'),
        ]);
    }

    public function destroy(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $assignment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Assignment deleted successfully',
        ]);
    }

    public function publish(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $assignment->update(['status' => 'published']);

        return response()->json([
            'status' => 'success',
            'message' => 'Assignment published successfully',
            'data' => $assignment,
        ]);
    }

    public function close(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $assignment->update(['status' => 'closed']);

        return response()->json([
            'status' => 'success',
            'message' => 'Assignment closed successfully',
            'data' => $assignment,
        ]);
    }

    // ==================== QUESTIONS ====================

    public function getQuestions(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        $questions = $assignment->questions()->orderBy('order_index')->get();

        if ($user->isStudent()) {
            $questions = $questions->map(function ($q) {
                unset($q->correct_answer);
                return $q;
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $questions,
        ]);
    }

    public function addQuestion(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'question_type' => 'required|in:mcq,theory,fill_blank,true_false,file_upload',
            'question_text' => 'required|string',
            'options' => 'nullable|array',
            'correct_answer' => 'nullable',
            'max_points' => 'nullable|integer|min:1',
            'order_index' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $maxOrder = $assignment->questions()->max('order_index') ?? 0;

        $question = LectureAssignmentQuestion::create([
            'assignment_id' => $assignmentId,
            'question_type' => $request->question_type,
            'question_text' => $request->question_text,
            'options' => $request->options,
            'correct_answer' => $request->correct_answer,
            'max_points' => $request->max_points ?? 1,
            'order_index' => $request->order_index ?? ($maxOrder + 1),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Question added successfully',
            'data' => $question,
        ], 201);
    }

    public function updateQuestion(Request $request, int $assignmentId, int $questionId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        $question = LectureAssignmentQuestion::where('assignment_id', $assignmentId)->findOrFail($questionId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'question_type' => 'sometimes|in:mcq,theory,fill_blank,true_false,file_upload',
            'question_text' => 'sometimes|string',
            'options' => 'sometimes|array',
            'correct_answer' => 'nullable',
            'max_points' => 'sometimes|integer|min:1',
            'order_index' => 'sometimes|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $question->update($request->only([
            'question_type', 'question_text', 'options', 'correct_answer', 'max_points', 'order_index',
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Question updated successfully',
            'data' => $question,
        ]);
    }

    public function deleteQuestion(Request $request, int $assignmentId, int $questionId): JsonResponse
    {
        $user = $request->user();

        $question = LectureAssignmentQuestion::where('assignment_id', $assignmentId)->findOrFail($questionId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $question->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Question deleted successfully',
        ]);
    }

    public function syncQuestions(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'questions' => 'required|array',
            'questions.*.question_type' => 'required|in:mcq,theory,fill_blank,true_false,file_upload',
            'questions.*.question_text' => 'required|string',
            'questions.*.options' => 'nullable|array',
            'questions.*.correct_answer' => 'nullable',
            'questions.*.max_points' => 'nullable|integer|min:1',
            'questions.*.order_index' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        DB::transaction(function () use ($assignment, $request) {
            $assignment->questions()->delete();

            foreach ($request->questions as $index => $qData) {
                $assignment->questions()->create([
                    'question_type' => $qData['question_type'],
                    'question_text' => $qData['question_text'],
                    'options' => $qData['options'] ?? null,
                    'correct_answer' => $qData['correct_answer'] ?? null,
                    'max_points' => $qData['max_points'] ?? 1,
                    'order_index' => $qData['order_index'] ?? $index,
                ]);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Questions synced successfully',
            'data' => $assignment->load('questions'),
        ]);
    }

    // ==================== SUBMISSIONS ====================

    public function getSubmissions(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $perPage = min((int) $request->get('per_page', 20), 100);

        $submissions = LectureAssignmentSubmission::where('assignment_id', $assignmentId)
            ->with(['student.profile', 'grader:id,email'])
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $submissions->items(),
            'meta' => [
                'current_page' => $submissions->currentPage(),
                'last_page' => $submissions->lastPage(),
                'total' => $submissions->total(),
                'has_more' => $submissions->hasMorePages(),
            ],
        ]);
    }

    public function getMySubmission(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Only students can view their submissions'], 403);
        }

        $submission = LectureAssignmentSubmission::where('assignment_id', $assignmentId)
            ->where('student_id', $user->id)
            ->with(['assignment.questions'])
            ->first();

        return response()->json([
            'status' => 'success',
            'data' => $submission,
        ]);
    }

    public function submit(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Only students can submit assignments'], 403);
        }

        $assignment = LectureAssignment::where('school_id', $user->school_id)
            ->where('status', 'published')
            ->findOrFail($assignmentId);

        if ($assignment->due_at && now()->gt($assignment->due_at) && !$assignment->allow_late_submission) {
            return response()->json([
                'status' => 'error',
                'message' => 'This assignment is past its due date and does not allow late submissions',
            ], 400);
        }

        $existing = LectureAssignmentSubmission::where('assignment_id', $assignmentId)
            ->where('student_id', $user->id)
            ->first();

        $isLate = $assignment->due_at && now()->gt($assignment->due_at);

        $validator = Validator::make($request->all(), [
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:lecture_assignment_questions,id',
            'answers.*.answer_text' => 'nullable|string',
            'answers.*.selected_option' => 'nullable',
            'answers.*.uploaded_file_url' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $status = $isLate ? 'late' : 'submitted';

        if ($existing) {
            $existing->update([
                'answers' => $request->answers,
                'submitted_at' => now(),
                'status' => $status,
            ]);
            $submission = $existing;
        } else {
            $submission = LectureAssignmentSubmission::create([
                'assignment_id' => $assignmentId,
                'student_id' => $user->id,
                'answers' => $request->answers,
                'submitted_at' => now(),
                'status' => $status,
                'max_score' => $assignment->max_score,
            ]);
        }

        $this->performAutoGrade($submission, $assignment);

        return response()->json([
            'status' => 'success',
            'message' => 'Assignment submitted successfully',
            'data' => $submission,
        ], $existing ? 200 : 201);
    }

    public function gradeSubmission(Request $request, int $submissionId): JsonResponse
    {
        $user = $request->user();

        $submission = LectureAssignmentSubmission::whereHas('assignment', function ($q) use ($user) {
            $q->whereHas('lecture', function ($lq) use ($user) {
                $lq->where('school_id', $user->school_id);
            });
        })->findOrFail($submissionId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'score' => 'required|numeric|min:0|max:' . $submission->max_score,
            'feedback' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $submission->update([
            'score' => $request->score,
            'feedback' => $request->feedback,
            'graded_by' => $user->id,
            'graded_at' => now(),
            'status' => 'graded',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Submission graded successfully',
            'data' => $submission->load('assignment'),
        ]);
    }

    public function autoGrade(Request $request, int $assignmentId): JsonResponse
    {
        $user = $request->user();

        $assignment = LectureAssignment::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($assignmentId);

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $gradedCount = 0;
        $submissions = LectureAssignmentSubmission::where('assignment_id', $assignmentId)
            ->whereIn('status', ['submitted', 'late'])
            ->get();

        foreach ($submissions as $submission) {
            $this->performAutoGrade($submission, $assignment);
            $gradedCount++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Auto-grading completed for {$gradedCount} submissions",
            'graded_count' => $gradedCount,
        ]);
    }

    public function getSubmissionDetails(Request $request, int $submissionId): JsonResponse
    {
        $user = $request->user();

        $submission = LectureAssignmentSubmission::whereHas('assignment', function ($q) use ($user) {
            $q->whereHas('lecture', function ($lq) use ($user) {
                $lq->where('school_id', $user->school_id);
            });
        })->with(['assignment.questions', 'student.profile', 'grader:id,email'])
            ->findOrFail($submissionId);

        return response()->json([
            'status' => 'success',
            'data' => $submission,
        ]);
    }

    // ==================== LECTURE COMPLETION CHECK ====================

    public function checkMandatoryAssignments(Request $request, int $lectureId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Only students can check assignment status'], 403);
        }

        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($lectureId);

        $mandatoryAssignments = LectureAssignment::where('lecture_id', $lectureId)
            ->where('is_mandatory', true)
            ->where('status', 'published')
            ->withCount(['submissions' => function ($q) use ($user) {
                $q->where('student_id', $user->id);
            }])
            ->get();

        $pending = [];
        foreach ($mandatoryAssignments as $assignment) {
            if ($assignment->submissions_count === 0) {
                $pending[] = [
                    'id' => $assignment->id,
                    'title' => $assignment->title,
                    'type' => $assignment->type,
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'can_complete' => count($pending) === 0,
            'pending_assignments' => $pending,
            'total_mandatory' => $mandatoryAssignments->count(),
        ]);
    }

    // ==================== HELPER ====================

    private function performAutoGrade(LectureAssignmentSubmission $submission, LectureAssignment $assignment): float
    {
        $autoScore = 0;
        $totalAutoPoints = 0;
        $hasAutoQuestions = false;

        $answers = $submission->answers ?? [];
        $questions = $assignment->questions()->get()->keyBy('id');

        foreach ($answers as $answer) {
            $questionId = $answer['question_id'] ?? null;
            if (!$questionId || !$questions->has($questionId)) {
                continue;
            }

            $question = $questions->get($questionId);

            if (in_array($question->question_type, ['mcq', 'true_false', 'fill_blank'])) {
                $hasAutoQuestions = true;
                $totalAutoPoints += $question->max_points;

                $userAnswer = $answer['selected_option'] ?? $answer['answer_text'] ?? '';
                $correctAnswer = $question->correct_answer;

                if (is_array($correctAnswer)) {
                    $correctAnswer = $correctAnswer['text'] ?? $correctAnswer[0] ?? '';
                }

                if (strtolower(trim($userAnswer)) === strtolower(trim($correctAnswer))) {
                    $autoScore += $question->max_points;
                }
            }
        }

        if ($hasAutoQuestions && $totalAutoPoints > 0) {
            $normalizedScore = ($autoScore / $totalAutoPoints) * $submission->max_score;

            if (!$submission->score || $submission->status !== 'graded') {
                $submission->update([
                    'score' => round($normalizedScore, 2),
                ]);
            }

            return round($normalizedScore, 2);
        }

        return 0;
    }
}
