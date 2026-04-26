<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSubmission;
use App\Models\ExamAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ExamController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Exam::where('school_id', $user->school_id)
            ->with(['subject', 'gradeLevel', 'term']);

        if ($request->has('grade_level_id')) {
            $query->where('grade_level_id', $request->grade_level_id);
        }

        if ($request->has('term_id')) {
            $query->where('term_id', $request->term_id);
        }

        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('is_ca_test')) {
            $query->where('is_ca_test', $request->boolean('is_ca_test'));
        }

        $exams = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $exams
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $validator = Validator::make($request->all(), [
            'subject_id' => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'term_id' => 'required|exists:academic_terms,id',
            'title' => 'required|string|max:255',
            'type' => 'required|in:MCQ,Theory,Mixed',
            'duration_minutes' => 'required|integer|min:1',
            'start_at' => 'nullable|date',
            'end_at' => 'nullable|date|after_or_equal:start_at',
            'is_ca_test' => 'boolean',
            'week_number' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $exam = Exam::create(array_merge($request->all(), [
            'school_id' => $user->school_id,
            'published' => false
        ]));

        return response()->json([
            'status' => 'success',
            'message' => 'Exam created successfully',
            'data' => $exam
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $exam = Exam::where('school_id', $user->school_id)
            ->with(['questions', 'subject', 'gradeLevel', 'term'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $exam
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $exam = Exam::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'string|max:255',
            'type' => 'in:MCQ,Theory,Mixed',
            'duration_minutes' => 'integer|min:1',
            'start_at' => 'nullable|date',
            'end_at' => 'nullable|date|after_or_equal:start_at',
            'is_ca_test' => 'boolean',
            'week_number' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $exam->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Exam updated successfully',
            'data' => $exam
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $exam = Exam::where('school_id', $user->school_id)->findOrFail($id);
        $exam->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Exam deleted successfully'
        ]);
    }

    public function publish(Request $request, $id)
    {
        $user = $request->user();
        $exam = Exam::where('school_id', $user->school_id)->findOrFail($id);
        
        $exam->update(['published' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Exam published successfully',
            'data' => $exam
        ]);
    }

    public function syncQuestions(Request $request, $id)
    {
        $user = $request->user();
        $exam = Exam::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'questions' => 'required|array',
            'questions.*.type' => 'required|in:mcq,theory',
            'questions.*.question_text' => 'required|string',
            'questions.*.options' => 'nullable|array',
            'questions.*.correct_answer' => 'nullable|string',
            'questions.*.marks' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        DB::transaction(function () use ($exam, $request) {
            // Remove old questions
            $exam->questions()->delete();

            $totalMarks = 0;
            foreach ($request->questions as $qData) {
                $exam->questions()->create($qData);
                $totalMarks += $qData['marks'];
            }

            $exam->update(['total_marks' => $totalMarks]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Questions synced successfully',
            'data' => $exam->load('questions')
        ]);
    }

    public function submissions(Request $request, $id)
    {
        $user = $request->user();
        $exam = Exam::where('school_id', $user->school_id)->findOrFail($id);

        $submissions = ExamSubmission::where('exam_id', $exam->id)
            ->with(['student.profile'])
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $submissions
        ]);
    }

    public function submissionDetails(Request $request, $submissionId)
    {
        $user = $request->user();
        $submission = ExamSubmission::with(['exam.questions', 'student.profile', 'answers.question'])
            ->whereHas('exam', function($q) use ($user) {
                $q->where('school_id', $user->school_id);
            })
            ->findOrFail($submissionId);

        return response()->json([
            'status' => 'success',
            'data' => $submission
        ]);
    }

    public function gradeSubmission(Request $request, $submissionId)
    {
        $user = $request->user();
        $submission = ExamSubmission::whereHas('exam', function($q) use ($user) {
                $q->where('school_id', $user->school_id);
            })->findOrFail($submissionId);

        $validator = Validator::make($request->all(), [
            'answers' => 'required|array',
            'answers.*.id' => 'required|exists:exam_answers,id',
            'answers.*.score' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        DB::transaction(function () use ($submission, $request) {
            $manualScore = 0;
            foreach ($request->answers as $aData) {
                $answer = ExamAnswer::findOrFail($aData['id']);
                $answer->update(['score' => $aData['score']]);
                $manualScore += $aData['score'];
            }

            $submission->update([
                'manual_score' => $manualScore,
                'status' => 'graded'
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Submission graded successfully',
            'data' => $submission->load('answers')
        ]);
    }
}
