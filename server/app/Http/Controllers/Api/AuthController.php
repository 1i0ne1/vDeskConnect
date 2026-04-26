<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\School;
use App\Models\Profile;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use App\Mail\AdminRegistrationVerifyEmail;

class AuthController extends Controller
{
    /**
     * Send email verification code for school registration.
     * Stores the code in a temporary cache/pending table and emails it.
     */
    public function sendVerification(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'first_name' => 'required|string|max:255',
            'school_name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if email is already registered
        if (User::where('email', $request->email)->exists()) {
            return response()->json([
                'message' => 'This email is already registered',
                'errors' => ['email' => ['An account with this email already exists']],
            ], 422);
        }

        // Generate 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store in cache for 10 minutes
        $cacheKey = 'verification_code_' . md5($request->email);
        cache()->put($cacheKey, [
            'code' => $code,
            'first_name' => $request->first_name,
            'school_name' => $request->school_name,
            'email' => $request->email,
        ], now()->addMinutes(10));

        // Send email
        try {
            Mail::to($request->email)->send(new AdminRegistrationVerifyEmail($code));
        } catch (\Exception $e) {
            // Log error but still return success for dev purposes
            \Log::error('Failed to send verification email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Verification code sent successfully',
            'expires_in' => 600,
        ]);
    }

    /**
     * Verify email code and mark email as verified.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cacheKey = 'verification_code_' . md5($request->email);
        $data = cache()->get($cacheKey);

        if (!$data || $data['code'] !== $request->code) {
            return response()->json([
                'message' => 'Invalid or expired verification code',
            ], 400);
        }

        // Mark as verified in cache
        $data['verified'] = true;
        cache()->put($cacheKey, $data, now()->addMinutes(10));

        return response()->json([
            'message' => 'Email verified successfully',
            'verified' => true,
        ]);
    }

    /**
     * Register a new School Admin + School (public endpoint).
     */
    public function registerAdmin(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'school_name' => 'required|string|max:255',
            'country' => 'required|string|max:2',
            'timezone' => 'required|string|max:100',
            'currency' => 'required|string|max:10',
            'admin_first_name' => 'required|string|max:255',
            'admin_last_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check email verification
        $cacheKey = 'verification_code_' . md5($request->admin_email);
        $verificationData = cache()->get($cacheKey);

        if (!$verificationData || !($verificationData['verified'] ?? false)) {
            return response()->json([
                'message' => 'Please verify your email before completing registration',
                'verified' => false,
            ], 403);
        }

        return DB::transaction(function () use ($request, $cacheKey) {
            // Create school
            $school = School::create([
                'name' => $request->school_name,
                'country' => $request->country,
                'timezone' => $request->timezone,
                'currency' => $request->currency,
                'active' => true,
            ]);

            // Create admin user
            $user = User::create([
                'school_id' => $school->id,
                'email' => $request->admin_email,
                'password' => Hash::make($request->password),
                'role' => 'admin',
                'verified' => true,
                'must_change_password' => false,
            ]);

            // Create admin profile
            Profile::create([
                'user_id' => $user->id,
                'type' => 'admin',
                'data' => [
                    'first_name' => $request->admin_first_name,
                    'last_name' => $request->admin_last_name,
                ],
            ]);

            // Create 14-day free trial subscription
            Subscription::create([
                'school_id' => $school->id,
                'plan_id' => 'trial',
                'starts_at' => now(),
                'expires_at' => now()->addDays(14),
                'status' => 'trial',
            ]);

            // Clean up verification cache
            cache()->forget($cacheKey);

            return response()->json([
                'message' => 'School registered successfully. 14-day free trial activated.',
                'school' => [
                    'id' => $school->id,
                    'name' => $school->name,
                    'trial_ends_at' => $school->subscriptions()->first()->expires_at,
                ],
            ], 201);
        });
    }

    /**
     * Login user.
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Check if user exists and is banned BEFORE attempting auth
        $checkUser = User::where('email', $request->email)->first();

        // Also check for soft-deleted (banned/deleted) users
        if (!$checkUser) {
            $checkUser = User::withTrashed()->where('email', $request->email)->first();
        }

        if ($checkUser && $checkUser->banned) {
            $banRecord = \App\Models\UserBan::where('user_id', $checkUser->id)
                ->where('action_type', 'ban')
                ->latest()
                ->first();

            return response()->json([
                'message' => 'Account banned',
                'banned' => true,
                'reason' => $banRecord?->reason ?? 'Your account has been banned by the administrator.',
            ], 403);
        }

        // Check if user was soft-deleted
        if ($checkUser && $checkUser->trashed()) {
            $banRecord = \App\Models\UserBan::where('user_id', $checkUser->id)
                ->where('action_type', 'delete')
                ->latest()
                ->first();

            return response()->json([
                'message' => 'Account deleted',
                'banned' => true,
                'reason' => $banRecord?->reason ?? 'Your account has been deleted by the administrator.',
            ], 403);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        $user = Auth::user();
        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'verified' => $user->verified,
                'must_change_password' => $user->must_change_password,
                'school_id' => $user->school_id,
            ],
        ]);
    }

    /**
     * Change password (for first-login mandatory change or regular change).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
            'must_change_password' => false,
        ]);

        return response()->json(['message' => 'Password changed successfully']);
    }

    /**
     * Get current authenticated user.
     */
    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('profile', 'school'),
        ]);
    }

    /**
     * Logout user.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Send password reset link.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Password reset link sent']);
        }

        return response()->json([
            'message' => 'Unable to send reset link',
            'errors' => ['email' => [__($status)]],
        ], 422);
    }

    /**
     * Reset password.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'must_change_password' => false,
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successful']);
        }

        return response()->json([
            'message' => 'Unable to reset password',
            'errors' => ['email' => [__($status)]],
        ], 422);
    }
}