<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentEnrollment;
use App\Models\AcademicSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class EnrollmentController extends Controller
{
    /**
     * Get enrollment history for a specific student.
     */
    public function index(Request $request, int $studentId): JsonResponse
    {
        $user = $request->user();
        
        // Ensure student belongs to the same school
        $student = User::where('school_id', $user->school_id)
            ->where('role', 'student')
            ->findOrFail($studentId);

        $enrollments = StudentEnrollment::where('student_id', $studentId)
            ->with(['gradeLevel', 'section', 'session'])
            ->orderBy('enrollment_date', 'desc')
            ->get();

        return response()->json($enrollments);
    }

    /**
     * Enroll a student in a grade level and section.
     */
    public function enroll(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->isStudent() || $user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:users,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'section_id' => 'nullable|exists:sections,id',
            'session_id' => 'nullable|exists:academic_sessions,id',
            'enrollment_date' => 'required|date',
            'status' => 'nullable|string|in:active,graduated,withdrawn,transferred',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $schoolId = $user->school_id;
        $studentId = $request->student_id;
        
        // Use current active session if not provided
        $sessionId = $request->session_id ?? AcademicSession::where('school_id', $schoolId)->where('active', true)->value('id');

        if (!$sessionId) {
            return response()->json(['message' => 'No active academic session found for this school'], 400);
        }

        return DB::transaction(function () use ($request, $schoolId, $studentId, $sessionId) {
            // Deactivate existing active enrollments for this student (if enrolling in a new one)
            if ($request->status === 'active' || !$request->status) {
                StudentEnrollment::where('student_id', $studentId)
                    ->where('status', 'active')
                    ->update(['status' => 'transferred']); // Or a more appropriate status
            }

            $enrollment = StudentEnrollment::create([
                'school_id' => $schoolId,
                'student_id' => $studentId,
                'grade_level_id' => $request->grade_level_id,
                'section_id' => $request->section_id,
                'session_id' => $sessionId,
                'enrollment_date' => $request->enrollment_date,
                'status' => $request->status ?? 'active',
            ]);

            // Sync student's primary profile data (Admission number stays, but grade changes)
            $student = User::find($studentId);
            $profile = $student->profile;
            $profileData = $profile->data;
            $profileData['grade_level_id'] = $request->grade_level_id;
            $profileData['section_id'] = $request->section_id;
            $profile->update(['data' => $profileData]);

            return response()->json([
                'message' => 'Student enrolled successfully',
                'enrollment' => $enrollment->load(['gradeLevel', 'section', 'session'])
            ], 201);
        });
    }

    /**
     * Update an enrollment record.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user->isStudent() || $user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $enrollment = StudentEnrollment::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'sometimes|exists:grade_levels,id',
            'section_id' => 'nullable|exists:sections,id',
            'session_id' => 'sometimes|exists:academic_sessions,id',
            'enrollment_date' => 'sometimes|date',
            'status' => 'sometimes|string|in:active,graduated,withdrawn,transferred',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request, $enrollment) {
            $enrollment->update($request->all());

            // If this is the active enrollment, update the profile too
            if ($enrollment->status === 'active') {
                $student = $enrollment->student;
                $profile = $student->profile;
                $profileData = $profile->data;
                
                if ($request->has('grade_level_id')) $profileData['grade_level_id'] = $request->grade_level_id;
                if ($request->has('section_id')) $profileData['section_id'] = $request->section_id;
                
                $profile->update(['data' => $profileData]);
            }

            return response()->json([
                'message' => 'Enrollment updated successfully',
                'enrollment' => $enrollment->load(['gradeLevel', 'section', 'session'])
            ]);
        });
    }

    /**
     * Delete an enrollment record.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $enrollment = StudentEnrollment::where('school_id', $user->school_id)->findOrFail($id);
        $enrollment->delete();

        return response()->json(['message' => 'Enrollment record deleted']);
    }
}
