<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CaWeightConfig;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CaWeightConfigController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = CaWeightConfig::where('school_id', $user->school_id)
            ->with(['gradeLevel', 'subject', 'term', 'updater:id,email']);

        if ($request->filled('grade_level_id')) {
            $query->where('grade_level_id', $request->grade_level_id);
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('term_id')) {
            $query->where('term_id', $request->term_id);
        }

        $configs = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $configs,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'grade_level_id' => 'required|exists:grade_levels,id',
            'subject_id' => 'required|exists:subjects,id',
            'term_id' => 'required|exists:academic_terms,id',
            'total_ca_percentage' => 'nullable|integer|min:0|max:100',
            'assignment_weight_percentage' => 'nullable|integer|min:0|max:100',
            'test_weight_percentage' => 'nullable|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $assignmentWeight = $request->assignment_weight_percentage ?? 50;
        $testWeight = $request->test_weight_percentage ?? 50;

        if ($assignmentWeight + $testWeight !== 100) {
            return response()->json([
                'status' => 'error',
                'message' => 'Assignment weight and test weight must sum to 100%',
            ], 422);
        }

        $config = CaWeightConfig::updateOrCreate(
            [
                'school_id' => $user->school_id,
                'grade_level_id' => $request->grade_level_id,
                'subject_id' => $request->subject_id,
                'term_id' => $request->term_id,
            ],
            [
                'total_ca_percentage' => $request->total_ca_percentage ?? 40,
                'assignment_weight_percentage' => $assignmentWeight,
                'test_weight_percentage' => $testWeight,
                'updated_by' => $user->id,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'CA weight configuration saved successfully',
            'data' => $config->load('gradeLevel', 'subject', 'term'),
        ], $config->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $config = CaWeightConfig::where('school_id', $user->school_id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'total_ca_percentage' => 'sometimes|integer|min:0|max:100',
            'assignment_weight_percentage' => 'sometimes|integer|min:0|max:100',
            'test_weight_percentage' => 'sometimes|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $assignmentWeight = $request->assignment_weight_percentage ?? $config->assignment_weight_percentage;
        $testWeight = $request->test_weight_percentage ?? $config->test_weight_percentage;

        if ($assignmentWeight + $testWeight !== 100) {
            return response()->json([
                'status' => 'error',
                'message' => 'Assignment weight and test weight must sum to 100%',
            ], 422);
        }

        $config->update([
            'total_ca_percentage' => $request->total_ca_percentage ?? $config->total_ca_percentage,
            'assignment_weight_percentage' => $assignmentWeight,
            'test_weight_percentage' => $testWeight,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'CA weight configuration updated successfully',
            'data' => $config->load('gradeLevel', 'subject', 'term'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        if ($user->isStudent()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $config = CaWeightConfig::where('school_id', $user->school_id)->findOrFail($id);
        $config->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'CA weight configuration deleted',
        ]);
    }
}
