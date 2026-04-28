<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TeacherController extends Controller
{
    /**
     * List all teachers for the authenticated user's school.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 20), 100);
        $search = $request->get('search');

        $query = User::where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->with(['profile', 'school'])
            ->orderBy('created_at', 'desc');

        if ($search) {
            $search = strtolower(trim($search));
            $query->where(function ($q) use ($search) {
                $q->where(DB::raw('LOWER(email)'), 'like', "%{$search}%");
                $q->orWhereHas('profile', function ($pq) use ($search) {
                    $pq->where(DB::raw('LOWER(data->>\'first_name\')'), 'like', "%{$search}%");
                    $pq->orWhere(DB::raw('LOWER(data->>\'last_name\')'), 'like', "%{$search}%");
                    $pq->orWhere(DB::raw('LOWER(data->>\'employee_number\')'), 'like', "%{$search}%");
                });
            });
        }

        $teachers = $query->paginate($perPage);

        $teachers->getCollection()->transform(function ($teacher) {
            return $this->formatTeacherResponse($teacher);
        });

        return response()->json($teachers);
    }

    /**
     * Create a new teacher.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'employee_number' => 'required|string|max:100',
            'gender' => 'nullable|string|in:male,female,other',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
            'qualification' => 'nullable|string|max:255',
            'date_joined' => 'nullable|date',
            'password' => 'nullable|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        if ($user->isSuperAdmin() || $user->isStudent()) {
            return response()->json(['message' => 'You do not have permission to create teachers'], 403);
        }

        // Check if employee number already exists in profiles
        $existingEmployee = Profile::where('type', 'teacher')
            ->where('data->employee_number', $request->employee_number)
            ->exists();
        if ($existingEmployee) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['employee_number' => ['This employee number already exists.']],
            ], 422);
        }

        $tempPassword = $request->password ?: 'Secret123!';

        return DB::transaction(function () use ($request, $tempPassword, $user) {
            $teacher = User::create([
                'school_id' => $user->school_id,
                'email' => $request->email,
                'password' => Hash::make($tempPassword),
                'role' => 'teacher',
                'verified' => true,
                'must_change_password' => true,
            ]);

            $profileData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'employee_number' => $request->employee_number,
                'gender' => $request->gender,
                'phone' => $request->phone,
                'address' => $request->address,
                'subject_ids' => $request->subject_ids ?? [],
                'qualification' => $request->qualification,
                'date_joined' => $request->date_joined,
            ];

            Profile::create([
                'user_id' => $teacher->id,
                'type' => 'teacher',
                'data' => $profileData,
            ]);

            return response()->json([
                'message' => 'Teacher created successfully',
                'teacher' => $this->formatTeacherResponse($teacher),
                'temporary_password' => $request->password ? null : 'Secret123!',
            ], 201);
        });
    }

    /**
     * Update a teacher.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $teacher = User::where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->with('profile')
            ->findOrFail($id);

        if (!$user->canManage($teacher) && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'employee_number' => 'sometimes|string|max:100',
            'gender' => 'nullable|string|in:male,female,other',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
            'qualification' => 'nullable|string|max:255',
            'date_joined' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if employee number is being changed to one that already exists
        if ($request->has('employee_number')) {
            $existingEmployee = Profile::where('type', 'teacher')
                ->where('data->employee_number', $request->employee_number)
                ->whereNot('user_id', $id)
                ->exists();
            if ($existingEmployee) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['employee_number' => ['This employee number already exists.']],
                ], 422);
            }
        }

        if ($request->has('email')) {
            $teacher->email = $request->email;
        }
        $teacher->save();

        if ($teacher->profile) {
            $data = $teacher->profile->data ?? [];
            $fields = ['first_name', 'last_name', 'employee_number', 'gender',
                      'phone', 'address', 'subject_ids', 'qualification', 'date_joined'];
            foreach ($fields as $field) {
                if ($request->has($field)) {
                    $data[$field] = $request[$field];
                }
            }
            $teacher->profile->data = $data;
            $teacher->profile->save();
        } else {
            $profileData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'employee_number' => $request->employee_number,
                'gender' => $request->gender,
                'phone' => $request->phone,
                'address' => $request->address,
                'subject_ids' => $request->subject_ids ?? [],
                'qualification' => $request->qualification,
                'date_joined' => $request->date_joined,
            ];
            Profile::create([
                'user_id' => $teacher->id,
                'type' => 'teacher',
                'data' => $profileData,
            ]);
        }

        return response()->json([
            'message' => 'Teacher updated successfully',
            'teacher' => $this->formatTeacherResponse($teacher),
        ]);
    }

    /**
     * Ban a teacher.
     */
    public function ban(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Reason is required', 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $teacher = User::where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->findOrFail($id);

        if (!$user->canManage($teacher)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $teacher->banned = true;
        $teacher->save();

        // Clear teacher grade/subject assignments
        DB::table('teacher_subjects')
            ->where('teacher_id', $teacher->id)
            ->delete();

        DB::table('user_bans')->insert([
            'user_id' => $teacher->id,
            'banned_by' => $user->id,
            'reason' => $request->reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Teacher banned successfully']);
    }

    /**
     * Delete a teacher.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Reason is required', 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $teacher = User::where('school_id', $user->school_id)
            ->where('role', 'teacher')
            ->findOrFail($id);

        if (!$user->canManage($teacher) && !$user->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Clear teacher grade/subject assignments
        DB::table('teacher_subjects')
            ->where('teacher_id', $teacher->id)
            ->delete();

        DB::table('user_bans')->insert([
            'user_id' => $teacher->id,
            'banned_by' => $user->id,
            'reason' => $request->reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $teacher->delete();

        return response()->json(['message' => 'Teacher deleted successfully']);
    }

    private function formatTeacherResponse(User $teacher): array
    {
        $data = $teacher->profile?->data ?? [];
        return [
            'id' => $teacher->id,
            'email' => $teacher->email,
            'role' => $teacher->role,
            'verified' => $teacher->verified,
            'banned' => $teacher->banned,
            'must_change_password' => $teacher->must_change_password,
            'first_name' => $data['first_name'] ?? '',
            'last_name' => $data['last_name'] ?? '',
            'employee_number' => $data['employee_number'] ?? '',
            'gender' => $data['gender'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'subject_ids' => $data['subject_ids'] ?? [],
            'qualification' => $data['qualification'] ?? null,
            'date_joined' => $data['date_joined'] ?? null,
            'avatar_url' => $teacher->profile?->avatar_url,
            'created_at' => $teacher->created_at,
        ];
    }
}
