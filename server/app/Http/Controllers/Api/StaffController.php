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

class StaffController extends Controller
{
    /**
     * List all staff for the authenticated user's school.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 20), 100);
        $search = $request->get('search');

        $query = User::where('school_id', $user->school_id)
            ->whereIn('role', ['principal', 'admin_staff', 'receptionist'])
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

        $staff = $query->paginate($perPage);

        $staff->getCollection()->transform(function ($member) {
            return $this->formatStaffResponse($member);
        });

        return response()->json($staff);
    }

    /**
     * Create a new staff member.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'employee_number' => 'required|string|max:100',
            'role' => 'required|string|in:principal,admin_staff,receptionist',
            'designation' => 'nullable|string|max:255',
            'gender' => 'nullable|string|in:male,female,other',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'password' => 'nullable|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $authUser = $request->user();

        // Only School Admin or Principal can create staff
        if ($authUser->isSuperAdmin() || $authUser->isTeacher() || $authUser->isStudent()) {
            return response()->json(['message' => 'You do not have permission to create staff'], 403);
        }

        // Only School Admin can create Principals
        if ($request->role === 'principal' && !$authUser->isSchoolAdmin()) {
            return response()->json(['message' => 'Only School Admin can create Principals'], 403);
        }

        // Check if employee number already exists in profiles
        $existingEmployee = Profile::where('type', 'staff')
            ->where('data->employee_number', $request->employee_number)
            ->exists();
        if ($existingEmployee) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => ['employee_number' => ['This employee number already exists.']],
            ], 422);
        }

        // Receptionist must be assigned to Admin Staff (role stored as receptionist)
        $tempPassword = $request->password ?: 'Secret123!';

        return DB::transaction(function () use ($request, $tempPassword, $authUser) {
            $staff = User::create([
                'school_id' => $authUser->school_id,
                'email' => $request->email,
                'password' => Hash::make($tempPassword),
                'role' => $request->role,
                'verified' => true,
                'must_change_password' => true,
            ]);

            $profileData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'employee_number' => $request->employee_number,
                'designation' => $request->designation,
                'gender' => $request->gender,
                'phone' => $request->phone,
                'address' => $request->address,
            ];

            Profile::create([
                'user_id' => $staff->id,
                'type' => 'staff',
                'data' => $profileData,
            ]);

            return response()->json([
                'message' => 'Staff member created successfully',
                'staff' => $this->formatStaffResponse($staff),
                'temporary_password' => $request->password ? null : 'Secret123!',
            ], 201);
        });
    }

    /**
     * Update a staff member.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        $staff = User::where('school_id', $authUser->school_id)
            ->whereIn('role', ['principal', 'admin_staff', 'receptionist'])
            ->with('profile')
            ->findOrFail($id);

        // Permission check
        if (!$authUser->canManage($staff) && !$authUser->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Cannot upgrade a staff member to Principal unless School Admin
        if ($request->has('role') && $request->role === 'principal' && !$authUser->isSchoolAdmin()) {
            return response()->json(['message' => 'Only School Admin can assign Principal role'], 403);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'employee_number' => 'sometimes|string|max:100',
            'role' => 'sometimes|string|in:principal,admin_staff,receptionist',
            'designation' => 'nullable|string|max:255',
            'gender' => 'nullable|string|in:male,female,other',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'password' => 'nullable|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if employee number is being changed to one that already exists
        if ($request->has('employee_number')) {
            $existingEmployee = Profile::where('type', 'staff')
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
            $staff->email = $request->email;
        }
        if ($request->has('role')) {
            $staff->role = $request->role;
        }
        if ($request->has('password') && $request->password) {
            $staff->password = Hash::make($request->password);
        }
        $staff->save();

        if ($staff->profile) {
            $data = $staff->profile->data ?? [];
            $fields = ['first_name', 'last_name', 'employee_number', 'designation',
                       'gender', 'phone', 'address'];
            foreach ($fields as $field) {
                if ($request->has($field)) {
                    $data[$field] = $request[$field];
                }
            }
            $staff->profile->data = $data;
            $staff->profile->save();
        } else {
            $profileData = [
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'employee_number' => $request->employee_number,
                'designation' => $request->designation,
                'gender' => $request->gender,
                'phone' => $request->phone,
                'address' => $request->address,
            ];
            Profile::create([
                'user_id' => $staff->id,
                'type' => 'staff',
                'data' => $profileData,
            ]);
        }

        return response()->json([
            'message' => 'Staff member updated successfully',
            'staff' => $this->formatStaffResponse($staff),
        ]);
    }

    /**
     * Ban a staff member.
     */
    public function ban(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Reason is required', 'errors' => $validator->errors()], 422);
        }

        $authUser = $request->user();
        $staff = User::where('school_id', $authUser->school_id)
            ->whereIn('role', ['principal', 'admin_staff', 'receptionist'])
            ->findOrFail($id);

        if (!$authUser->canManage($staff)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $staff->banned = true;
        $staff->save();

        // Log ban in user_bans table
        DB::table('user_bans')->insert([
            'user_id' => $staff->id,
            'banned_by' => $authUser->id,
            'reason' => $request->reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Staff member banned successfully']);
    }

    /**
     * Delete a staff member.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Reason is required', 'errors' => $validator->errors()], 422);
        }

        $authUser = $request->user();
        $staff = User::where('school_id', $authUser->school_id)
            ->whereIn('role', ['principal', 'admin_staff', 'receptionist'])
            ->findOrFail($id);

        if (!$authUser->canManage($staff) && !$authUser->isSchoolAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Log deletion
        DB::table('user_bans')->insert([
            'user_id' => $staff->id,
            'banned_by' => $authUser->id,
            'reason' => $request->reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $staff->delete();

        return response()->json(['message' => 'Staff member deleted successfully']);
    }

    private function formatStaffResponse(User $staffMember): array
    {
        $data = $staffMember->profile?->data ?? [];
        return [
            'id' => $staffMember->id,
            'email' => $staffMember->email,
            'role' => $staffMember->role,
            'verified' => $staffMember->verified,
            'banned' => $staffMember->banned,
            'must_change_password' => $staffMember->must_change_password,
            'first_name' => $data['first_name'] ?? '',
            'last_name' => $data['last_name'] ?? '',
            'employee_number' => $data['employee_number'] ?? '',
            'designation' => $data['designation'] ?? null,
            'gender' => $data['gender'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'avatar_url' => $staffMember->profile?->avatar_url,
            'created_at' => $staffMember->created_at,
        ];
    }
}
