<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lecture;
use App\Models\LectureResource;
use App\Models\Attendance;
use App\Models\User;
use App\Models\StudentLectureProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LectureController extends Controller
{
    /**
     * List lectures for the authenticated user's school.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 20), 100);
        $search = $request->get('search');

        $query = Lecture::where('school_id', $user->school_id)
            ->with(['teacher:id,email', 'gradeLevel', 'subject', 'section'])
            ->orderBy('scheduled_at', 'desc');

        // Automatically filter by grade level for students
        if ($user->role === 'student') {
            $profileData = is_string($user->profile->data) ? json_decode($user->profile->data, true) : $user->profile->data;
            if (isset($profileData['grade_level_id'])) {
                $query->where('grade_level_id', $profileData['grade_level_id']);
            }
            // Students only see published lectures
            $query->where('is_published', true);
        }

        if ($search) {
            $search = strtolower(trim($search));
            $query->where(function ($q) use ($search) {
                $q->where(DB::raw('LOWER(title)'), 'like', "%{$search}%")
                  ->orWhere(DB::raw('LOWER(description)'), 'like', "%{$search}%");
                
                if (DB::getDriverName() !== 'sqlite') {
                    $q->orWhereHas('subject', function($sq) use ($search) {
                        $sq->where(DB::raw('LOWER(name)'), 'like', "%{$search}%");
                    })
                    ->orWhereHas('gradeLevel', function($gq) use ($search) {
                        $gq->where(DB::raw('LOWER(name)'), 'like', "%{$search}%");
                    });
                } else {
                    // SQLite simple like (usually case-insensitive by default or needs different syntax)
                    $q->orWhereHas('subject', function($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('gradeLevel', function($gq) use ($search) {
                        $gq->where('name', 'like', "%{$search}%");
                    });
                }
            });
        }

        // Filter by teacher
        if ($request->has('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
        }

        // Filter by grade level
        if ($request->has('grade_level_id')) {
            $query->where('grade_level_id', $request->grade_level_id);
        }

        // Filter by subject
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        // Filter by term
        if ($request->has('term_id')) {
            $query->whereHas('gradeLevel', function($q) use ($request) {
                // Actually, term is usually linked to the session/period. 
                // Let's check if the lecture has a term_id or needs one.
                // For now, let's assume it's filtered via search or direct if column exists.
            });
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->where('scheduled_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('scheduled_at', '<=', $request->date_to);
        }

        // Add counts for staff users
        if ($user->role !== 'student') {
            $query->withCount([
                'studentProgress as completed_count' => function($q) {
                    $q->where('is_completed', true);
                }
            ]);
            
            // To get total_students, we need a custom logic or a more complex query.
            // For now, let's just use withCount for progress.
        }

        // Filter by completion status (for students)
        if ($request->has('is_completed') && $user->role === 'student') {
            $isCompleted = filter_var($request->is_completed, FILTER_VALIDATE_BOOLEAN);
            if ($isCompleted) {
                $query->whereHas('studentProgress', function($q) use ($user) {
                    $q->where('student_id', $user->id)->where('is_completed', true);
                });
            } else {
                $query->whereDoesntHave('studentProgress', function($q) use ($user) {
                    $q->where('student_id', $user->id)->where('is_completed', true);
                });
            }
        }

        $lectures = $query->paginate($perPage);

        return response()->json($lectures);
    }

    /**
     * Get a single lecture with details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)
            ->with(['teacher.profile', 'gradeLevel', 'subject', 'section', 'creator.profile', 'resources', 'attendances.student.profile'])
            ->findOrFail($id);

        return response()->json(['lecture' => $lecture]);
    }

    /**
     * Create a new lecture.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'content' => 'nullable|string',
            'teacher_id' => 'required|exists:users,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'section_id' => 'nullable|exists:sections,id',
            'scheduled_at' => 'required|date',
            'duration_minutes' => 'nullable|integer|min:5|max:180',
            'type' => 'nullable|in:sync,async,hybrid',
            'is_online' => 'nullable|boolean',
            'meeting_link' => 'nullable|url',
            'async_available_after' => 'nullable|date',
            'is_published' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        if ($user->isStudent()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lecture = Lecture::create([
            'school_id' => $user->school_id,
            'title' => $request->title,
            'description' => $request->description,
            'content' => $request->content,
            'teacher_id' => $request->teacher_id,
            'grade_level_id' => $request->grade_level_id,
            'subject_id' => $request->subject_id,
            'section_id' => $request->section_id,
            'scheduled_at' => $request->scheduled_at,
            'duration_minutes' => $request->duration_minutes ?? 40,
            'type' => $request->type ?? 'async',
            'is_online' => $request->is_online ?? false,
            'meeting_link' => $request->meeting_link,
            'async_available_after' => $request->async_available_after,
            'is_published' => $request->is_published ?? false,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Lecture created successfully',
            'lecture' => $this->formatLecture($lecture),
        ], 201);
    }

    /**
     * Update a lecture.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'teacher_id' => 'sometimes|exists:users,id',
            'grade_level_id' => 'sometimes|exists:grade_levels,id',
            'subject_id' => 'sometimes|exists:subjects,id',
            'section_id' => 'nullable|exists:sections,id',
            'scheduled_at' => 'sometimes|date',
            'duration_minutes' => 'nullable|integer|min:5|max:180',
            'status' => 'nullable|in:scheduled,in_progress,completed,cancelled',
            'type' => 'nullable|in:sync,async,hybrid',
            'is_online' => 'nullable|boolean',
            'meeting_link' => 'nullable|url',
            'async_available_after' => 'nullable|date',
            'is_published' => 'nullable|boolean',
            'content' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Permission check
        if (!$user->canManage($lecture->teacher) && !$user->isSchoolAdmin() && $user->id !== $lecture->teacher_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        Log::info('Lecture update debug', [
            'lecture_id' => $id,
            'has_content' => $request->has('content'),
            'content_length' => $request->input('content') ? strlen($request->input('content')) : 0,
            'all_inputs' => $request->all(),
        ]);

        $lecture->update($request->only([
            'title', 'description', 'content', 'teacher_id', 'grade_level_id', 'subject_id',
            'section_id', 'scheduled_at', 'duration_minutes', 'status', 'type', 'is_online', 
            'meeting_link', 'async_available_after', 'is_published'
        ]));

        return response()->json([
            'message' => 'Lecture updated successfully',
            'lecture' => $this->formatLecture($lecture),
        ]);
    }

    /**
     * Delete a lecture.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if (!$user->canManage($lecture->teacher) && !$user->isSchoolAdmin() && $user->id !== $lecture->teacher_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lecture->delete();

        return response()->json(['message' => 'Lecture deleted successfully']);
    }

    /**
     * Mark lecture as in progress.
     */
    public function start(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if ($user->id !== $lecture->teacher_id && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lecture->update(['status' => 'in_progress']);

        return response()->json(['message' => 'Lecture started', 'lecture' => $this->formatLecture($lecture)]);
    }

    /**
     * Mark lecture as completed.
     */
    public function complete(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if ($user->id !== $lecture->teacher_id && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lecture->update(['status' => 'completed']);

        return response()->json(['message' => 'Lecture completed', 'lecture' => $this->formatLecture($lecture)]);
    }

    /**
     * Cancel lecture.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if ($user->id !== $lecture->teacher_id && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lecture->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Lecture cancelled', 'lecture' => $this->formatLecture($lecture)]);
    }

    /**
     * Publish async lecture.
     */
    public function publish(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if ($user->id !== $lecture->teacher_id && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $lecture->update(['is_published' => true]);

        return response()->json(['message' => 'Lecture published', 'lecture' => $this->formatLecture($lecture)]);
    }

    // ==================== RESOURCES ====================

    /**
     * Get lecture resources.
     */
    public function resources(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        $resources = $lecture->resources()->with('uploader:id,email')->get();

        return response()->json(['resources' => $resources]);
    }

    /**
     * Add resource to lecture.
     */
    public function addResource(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:pdf,video,link,image',
            'url' => 'required|url',
            'title' => 'required|string|max:255',
            'content_id' => 'nullable|integer|min:0',
            'order_index' => 'nullable|integer|min:0',
            'is_downloadable' => 'nullable',
            'is_savable' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $isDownloadable = $request->is_downloadable ? 
            in_array(strtolower($request->is_downloadable), ['on', 'true', '1', 'yes']) : false;
        $isSavable = $request->is_savable ? 
            in_array(strtolower($request->is_savable), ['on', 'true', '1', 'yes']) : false;

        $contentId = $request->content_id;
        if ($contentId === '' || $contentId === null || $contentId === 'all') {
            $contentId = null;
        }

        $resource = LectureResource::create([
            'lecture_id' => $lecture->id,
            'type' => $request->type,
            'url' => $request->url,
            'title' => $request->title,
            'uploaded_by' => $user->id,
            'content_id' => $contentId,
            'order_index' => $request->order_index ?? 0,
            'is_downloadable' => $isDownloadable,
            'is_savable' => $isSavable,
        ]);

        return response()->json(['message' => 'Resource added', 'resource' => $resource], 201);
    }

    /**
     * Upload file for lecture resource.
     */
    public function uploadResource(Request $request, int $id): JsonResponse
    {
        // Attempt to increase limits (works with built-in server, may not work with php-fpm)
        @ini_set('upload_max_filesize', '200M');
        @ini_set('post_max_size', '200M');
        @ini_set('memory_limit', '256M');
        
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        // Debug: Log incoming request details
        Log::info('Upload request debug', [
            'has_file' => $request->hasFile('file'),
            'all_keys' => $request->keys(),
            'content_type' => $request->header('Content-Type'),
            'file' => $request->file('file'),
            'php_upload_max_filesize' => ini_get('upload_max_filesize'),
            'php_post_max_size' => ini_get('post_max_size'),
            'php_memory_limit' => ini_get('memory_limit'),
        ]);

        $validator = Validator::make($request->all(), [
            'file' => 'file|max:102400',
            'title' => 'string|max:255',
            'type' => 'in:pdf,video,image',
            'content_id' => 'nullable',
            'order_index' => 'nullable|integer|min:0',
            'is_downloadable' => 'nullable',
            'is_savable' => 'nullable',
        ]);

        // Normalize content_id - if empty string, treat as null (entire lecture)
        $contentId = $request->input('content_id');
        Log::info('Upload content_id debug', [
            'raw_content_id' => $contentId,
            'type' => gettype($contentId),
            'all_inputs' => $request->all(),
        ]);
        if ($contentId === '' || $contentId === null || $contentId === 'all') {
            $contentId = null;
        } else {
            $contentId = (int)$contentId;
        }

        if ($validator->fails()) {
            Log::warning('Upload validation failed', [
                'errors' => $validator->errors()->toArray(),
                'file_object' => $request->file('file'),
                'file_is_valid' => $request->file('file') ? $request->file('file')->isValid() : 'no file',
                'file_error' => $request->file('file') ? $request->file('file')->getError() : 'no file',
                'file_error_message' => $request->file('file') ? $request->file('file')->getErrorMessage() : 'no file',
                'php_upload_max_filesize' => ini_get('upload_max_filesize'),
                'php_post_max_size' => ini_get('post_max_size'),
            ]);
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        // Handle chunked upload
        if ($request->has('chunk_index')) {
            $chunkIndex = (int) $request->input('chunk_index');
            $totalChunks = (int) $request->input('total_chunks');
            $identifier = $request->input('identifier');

            $file = $request->file('file');
            if (!$file || !$file->isValid()) {
                return response()->json(['message' => 'Invalid chunk'], 422);
            }

            $chunkPath = storage_path('app/public/chunks/' . $identifier);
            if (!file_exists($chunkPath)) {
                mkdir($chunkPath, 0755, true);
            }

            $file->move($chunkPath, $chunkIndex . '.part');

            if ($chunkIndex < $totalChunks - 1) {
                return response()->json(['message' => 'Chunk uploaded'], 200);
            }

            // Assemble chunks
            $extension = pathinfo($request->input('title', $identifier), PATHINFO_EXTENSION);
            if (!$extension) $extension = 'mp4'; // default to mp4 if unknown for videos
            $filename = time() . '_' . uniqid() . '.' . $extension;
            $finalPathDir = storage_path('app/public/lectures/' . $lecture->id);
            if (!file_exists($finalPathDir)) mkdir($finalPathDir, 0755, true);

            $finalPath = $finalPathDir . '/' . $filename;
            $finalFile = fopen($finalPath, 'wb');
            for ($i = 0; $i < $totalChunks; $i++) {
                $partPath = $chunkPath . '/' . $i . '.part';
                if (file_exists($partPath)) {
                    $partFile = fopen($partPath, 'rb');
                    stream_copy_to_stream($partFile, $finalFile);
                    fclose($partFile);
                    unlink($partPath);
                }
            }
            fclose($finalFile);
            rmdir($chunkPath);

            $url = asset('storage/lectures/' . $lecture->id . '/' . $filename);
            $type = $request->input('type');
        } else {
            // Standard single file upload
            if (!$request->hasFile('file') || !$request->file('file')->isValid()) {
                $file = $request->file('file');
                $errorMsg = $file ? $file->getErrorMessage() : 'No file provided';
                return response()->json(['message' => 'The file failed to upload: ' . $errorMsg, 'errors' => ['file' => [$errorMsg]]], 422);
            }

            $file = $request->file('file');
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            
            // Determine type from extension if not specified
            $type = $request->type;
            if ($extension === 'pdf') {
                $type = 'pdf';
            } elseif (in_array($extension, ['mp4', 'webm', 'mov', 'avi'])) {
                $type = 'video';
            } elseif (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                $type = 'image';
            }

            // Generate unique filename
            $filename = time() . '_' . uniqid() . '.' . $extension;
            
            // Store file
            $path = $file->storeAs('lectures/' . $lecture->id, $filename, 'public');
            $url = asset('storage/' . $path);
        }

        $isDownloadable = $request->is_downloadable ? 
            in_array(strtolower($request->is_downloadable), ['on', 'true', '1', 'yes']) : false;
        $isSavable = $request->is_savable ? 
            in_array(strtolower($request->is_savable), ['on', 'true', '1', 'yes']) : false;

        $contentId = $request->input('content_id');
        if ($contentId === '' || $contentId === null || $contentId === 'all') {
            $contentId = null;
        } else {
            $contentId = (int)$contentId;
        }

        Log::info('Upload content_id final', ['contentId' => $contentId, 'type' => gettype($contentId)]);

        $resource = LectureResource::create([
            'lecture_id' => $lecture->id,
            'type' => $type,
            'url' => $url,
            'title' => $request->title ?: ($request->has('chunk_index') ? $request->input('title', 'Video Resource') : $originalName),
            'uploaded_by' => $user->id,
            'content_id' => $contentId,
            'order_index' => $request->order_index ?? 0,
            'is_downloadable' => $isDownloadable,
            'is_savable' => $isSavable,
        ]);

        return response()->json(['message' => 'File uploaded', 'resource' => $resource], 201);
    }

    /**
     * Delete resource.
     */
    public function deleteResource(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $resource = LectureResource::whereHas('lecture', function ($q) use ($user) {
            $q->where('school_id', $user->school_id);
        })->findOrFail($id);

        $resource->delete();

        return response()->json(['message' => 'Resource deleted']);
    }

    // ==================== ATTENDANCE ====================

    /**
     * Get attendance for a lecture.
     */
    public function attendance(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        $attendance = $lecture->attendances()->with('student:id,email')->get();

        return response()->json(['attendance' => $attendance]);
    }

    /**
     * Mark attendance for students.
     */
    public function markAttendance(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if ($user->id !== $lecture->teacher_id && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'attendance' => 'required|array',
            'attendance.*.student_id' => 'required|exists:users,id',
            'attendance.*.status' => 'required|in:present,absent,late,excused',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        foreach ($request->attendance as $entry) {
            Attendance::updateOrCreate(
                ['lecture_id' => $lecture->id, 'student_id' => $entry['student_id']],
                ['status' => $entry['status'], 'checked_at' => now()]
            );
        }

        return response()->json(['message' => 'Attendance marked']);
    }

    // ==================== PROGRESS ====================

    /**
     * Get progress for a student on a lecture.
     */
    public function getProgress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $progress = StudentLectureProgress::where('student_id', $user->id)
            ->where('lecture_id', $id)
            ->first();

        return response()->json(['progress' => $progress]);
    }

    /**
     * Update progress/Mark as complete.
     */
    public function updateProgress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user->isStudent()) {
            return response()->json(['message' => 'Only students can track progress'], 403);
        }

        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'is_completed' => 'sometimes|boolean',
            'progress_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        if ($request->is_completed) {
            $pendingMandatory = \App\Models\LectureAssignment::where('lecture_id', $id)
                ->where('is_mandatory', true)
                ->where('status', 'published')
                ->whereDoesntHave('submissions', function ($q) use ($user) {
                    $q->where('student_id', $user->id);
                })
                ->count();

            if ($pendingMandatory > 0) {
                return response()->json([
                    'message' => 'Cannot complete lecture: ' . $pendingMandatory . ' mandatory assignment(s) not yet submitted',
                ], 400);
            }
        }

        $progress = StudentLectureProgress::updateOrCreate(
            ['student_id' => $user->id, 'lecture_id' => $id],
            [
                'is_completed' => $request->is_completed ?? false,
                'completed_at' => $request->is_completed ? now() : null,
                'progress_data' => $request->progress_data,
            ]
        );

        return response()->json(['message' => 'Progress updated', 'progress' => $progress]);
    }

    /**
     * Get overall progress report for a lecture (Admin/Teacher view).
     */
    public function getLectureProgressReport(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $lecture = Lecture::where('school_id', $user->school_id)->findOrFail($id);

        if (!$user->isSchoolAdmin() && $user->id !== $lecture->teacher_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progressRecords = StudentLectureProgress::where('lecture_id', $id)
            ->with(['student.profile'])
            ->get();

        return response()->json([
            'lecture_id' => $id,
            'total_students' => User::where('school_id', $user->school_id)
                ->where('role', 'student')
                ->whereHas('profile', function($q) use ($lecture) {
                    $q->where(DB::raw('data->>\'grade_level_id\''), $lecture->grade_level_id);
                })->count(),
            'completed_count' => $progressRecords->where('is_completed', true)->count(),
            'records' => $progressRecords
        ]);
    }

    private function formatLecture(Lecture $lecture): array
    {
        return [
            'id' => $lecture->id,
            'title' => $lecture->title,
            'description' => $lecture->description,
            'teacher_id' => $lecture->teacher_id,
            'teacher_name' => $lecture->teacher ? ($lecture->teacher->profile?->data['first_name'] . ' ' . $lecture->teacher->profile?->data['last_name']) : null,
            'grade_level_id' => $lecture->grade_level_id,
            'grade_level_name' => $lecture->gradeLevel?->name,
            'subject_id' => $lecture->subject_id,
            'subject_name' => $lecture->subject?->name,
            'section_id' => $lecture->section_id,
            'section_name' => $lecture->section?->name,
            'scheduled_at' => $lecture->scheduled_at,
            'duration_minutes' => $lecture->duration_minutes,
            'status' => $lecture->status,
            'type' => $lecture->type,
            'is_online' => $lecture->is_online,
            'meeting_link' => $lecture->meeting_link,
            'async_available_after' => $lecture->async_available_after,
            'is_published' => $lecture->is_published,
            'content' => $lecture->content,
            'created_at' => $lecture->created_at,
        ];
    }
}