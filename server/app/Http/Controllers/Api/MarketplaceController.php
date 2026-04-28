<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Textbook;
use App\Models\MarketplaceOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MarketplaceController extends Controller
{
    /**
     * List all textbooks for the school.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 20), 100);
        $search = $request->get('search');
        $gradeId = $request->get('grade_level_id');
        $availableOnly = $request->boolean('available_only', false);

        $query = Textbook::where('school_id', $user->school_id)
            ->with(['gradeLevel', 'subject'])
            ->orderBy('created_at', 'desc');

        if ($search) {
            $search = strtolower(trim($search));
            $query->where(function ($q) use ($search) {
                $q->where(DB::raw('LOWER(title)'), 'like', "%{$search}%");
                $q->orWhere(DB::raw('LOWER(description)'), 'like', "%{$search}%");
            });
        }

        if ($gradeId) {
            $query->where('grade_level_id', $gradeId);
        }

        if ($availableOnly) {
            $query->available();
        }

        // Students only see books for their grade if they aren't explicitly searching/filtering otherwise
        if ($user->isStudent() && !$gradeId && !$search) {
            $studentProfile = $user->profile?->data;
            if (isset($studentProfile['grade_level_id'])) {
                $query->where('grade_level_id', $studentProfile['grade_level_id']);
            }
        }

        $books = $query->paginate($perPage);

        return response()->json($books);
    }

    /**
     * Store a new textbook.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->isStudent() || $user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'price' => 'required|numeric|min:0',
            'is_electronic' => 'boolean',
            'file_url' => 'nullable|string|max:1000',
            'physical_form_url' => 'nullable|string|max:1000',
            'description' => 'nullable|string',
            'stock_count' => 'nullable|integer|min:0',
            'available' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $book = Textbook::create(array_merge($request->all(), [
            'school_id' => $user->school_id
        ]));

        return response()->json([
            'message' => 'Textbook added successfully',
            'book' => $book->load(['gradeLevel', 'subject'])
        ], 201);
    }

    /**
     * Update a textbook.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user->isStudent() || $user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $book = Textbook::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'grade_level_id' => 'sometimes|required|exists:grade_levels,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'price' => 'sometimes|required|numeric|min:0',
            'is_electronic' => 'boolean',
            'file_url' => 'nullable|string|max:1000',
            'physical_form_url' => 'nullable|string|max:1000',
            'description' => 'nullable|string',
            'stock_count' => 'nullable|integer|min:0',
            'available' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $book->update($request->all());

        return response()->json([
            'message' => 'Textbook updated successfully',
            'book' => $book->load(['gradeLevel', 'subject'])
        ]);
    }

    /**
     * Remove a textbook.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user->isStudent() || $user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $book = Textbook::where('school_id', $user->school_id)->findOrFail($id);
        $book->delete();

        return response()->json(['message' => 'Textbook deleted successfully']);
    }

    /**
     * Place an order for a textbook.
     */
    public function placeOrder(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isStudent()) {
            return response()->json(['message' => 'Only students can place orders'], 403);
        }

        $validator = Validator::make($request->all(), [
            'textbook_id' => 'required|exists:textbooks,id',
            'payment_ref' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $book = Textbook::where('school_id', $user->school_id)->findOrFail($request->textbook_id);

        if (!$book->available) {
            return response()->json(['message' => 'This book is currently unavailable'], 422);
        }

        if (!$book->is_electronic && $book->stock_count !== null && $book->stock_count <= 0) {
            return response()->json(['message' => 'Out of stock'], 422);
        }

        return DB::transaction(function () use ($user, $book, $request) {
            $order = MarketplaceOrder::create([
                'school_id' => $user->school_id,
                'student_id' => $user->id,
                'textbook_id' => $book->id,
                'amount' => $book->price,
                'status' => 'pending',
                'payment_ref' => $request->payment_ref,
                'order_date' => now(),
            ]);

            if (!$book->is_electronic && $book->stock_count !== null) {
                $book->decrement('stock_count');
            }

            return response()->json([
                'message' => 'Order placed successfully',
                'order' => $order->load('textbook')
            ], 201);
        });
    }

    /**
     * List all orders (filtered by student if student).
     */
    public function orders(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int) $request->get('per_page', 20), 100);
        $status = $request->get('status');

        $query = MarketplaceOrder::where('school_id', $user->school_id)
            ->with(['student.profile', 'textbook'])
            ->orderBy('order_date', 'desc');

        if ($user->isStudent()) {
            $query->where('student_id', $user->id);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $orders = $query->paginate($perPage);

        return response()->json($orders);
    }

    /**
     * Update order status.
     */
    public function updateOrderStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if ($user->isStudent() || $user->isTeacher()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $order = MarketplaceOrder::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pending,paid,delivered,refunded,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $order->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Order status updated',
            'order' => $order->load(['student.profile', 'textbook'])
        ]);
    }
}
