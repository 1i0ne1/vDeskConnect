<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UiIllustrationController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\AcademicController;
use App\Http\Controllers\Api\LectureController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes — vDeskConnect v3.0
|--------------------------------------------------------------------------
*/

// Public UI Illustrations (must be outside auth middleware)
Route::prefix('ui')->group(function () {
    Route::get('/illustrations', [UiIllustrationController::class, 'index']);
    Route::get('/illustrations/active/{section}', [UiIllustrationController::class, 'bySection']);
});

// Auth routes (public)
Route::prefix('auth')->group(function () {
    Route::post('/send-verification', [AuthController::class, 'sendVerification']);
    Route::post('/verify', [AuthController::class, 'verifyEmail']);
    Route::post('/register-admin', [AuthController::class, 'registerAdmin']);
    Route::post('/register', [AuthController::class, 'register']); // internal, with invite code
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/change-password', [AuthController::class, 'changePassword']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);

    // UI Illustrations management (Super Admin only)
    Route::prefix('ui')->group(function () {
        Route::post('/illustrations/packs', [UiIllustrationController::class, 'uploadPack']);
        Route::put('/illustrations/packs/{packName}/activate', [UiIllustrationController::class, 'activatePack']);
        Route::get('/illustrations/packs', [UiIllustrationController::class, 'listPacks']);
        Route::delete('/illustrations/packs/{packName}', [UiIllustrationController::class, 'deletePack']);
    });

    // Students management
    Route::prefix('students')->group(function () {
        Route::get('/', [StudentController::class, 'index']);
        Route::post('/', [StudentController::class, 'store']);
        Route::put('/{id}', [StudentController::class, 'update']);
        Route::post('/{id}/ban', [StudentController::class, 'ban']);
        Route::delete('/{id}', [StudentController::class, 'destroy']);
    });

    // Teachers management
    Route::prefix('teachers')->group(function () {
        Route::get('/', [TeacherController::class, 'index']);
        Route::post('/', [TeacherController::class, 'store']);
        Route::put('/{id}', [TeacherController::class, 'update']);
        Route::post('/{id}/ban', [TeacherController::class, 'ban']);
        Route::delete('/{id}', [TeacherController::class, 'destroy']);
    });

    // Staff management (Principal, Admin Staff, Receptionist)
    Route::prefix('staff')->group(function () {
        Route::get('/', [StaffController::class, 'index']);
        Route::post('/', [StaffController::class, 'store']);
        Route::put('/{id}', [StaffController::class, 'update']);
        Route::post('/{id}/ban', [StaffController::class, 'ban']);
        Route::delete('/{id}', [StaffController::class, 'destroy']);
    });

    // Academic Management (Phase 1)
    Route::prefix('academic')->group(function () {
        // Academic Sessions
        Route::prefix('sessions')->group(function () {
            Route::get('/', [AcademicController::class, 'sessionsIndex']);
            Route::post('/', [AcademicController::class, 'createSession']);
            Route::put('/{id}', [AcademicController::class, 'updateSession']);
            Route::delete('/{id}', [AcademicController::class, 'deleteSession']);
            Route::put('/{id}/set-active', [AcademicController::class, 'setActiveSession']);
        });

        // Academic Terms
        Route::prefix('terms')->group(function () {
            Route::get('/', [AcademicController::class, 'termsIndexActive']); // returns terms for active session
            Route::get('/session/{sessionId}', [AcademicController::class, 'termsIndex']);
            Route::post('/', [AcademicController::class, 'createTerm']);
            Route::post('/bulk', [AcademicController::class, 'bulkCreateTerms']);
            Route::put('/{id}', [AcademicController::class, 'updateTerm']);
            Route::delete('/{id}', [AcademicController::class, 'deleteTerm']);
        });

        // CA Weeks
        Route::prefix('ca-weeks')->group(function () {
            Route::get('/term/{termId}/grade/{gradeLevelId}/subject/{subjectId}', [AcademicController::class, 'caWeeksIndex']);
            Route::get('/term/{termId}/grade/{gradeLevelId}/subject/{subjectId}/summary', [AcademicController::class, 'caWeeksSummary']);
            Route::post('/', [AcademicController::class, 'setCaWeeks']);
            Route::delete('/term/{termId}/grade/{gradeLevelId}/subject/{subjectId}', [AcademicController::class, 'deleteCaWeeks']);
        });

        // Grade Scales
        Route::prefix('grade-scales')->group(function () {
            Route::get('/', [AcademicController::class, 'gradeScalesIndex']);
            Route::post('/', [AcademicController::class, 'createGradeScale']);
            Route::put('/{id}', [AcademicController::class, 'updateGradeScale']);
            Route::put('/{id}/set-default', [AcademicController::class, 'setDefaultGradeScale']);
            Route::delete('/{id}', [AcademicController::class, 'deleteGradeScale']);
            Route::get('/templates', [AcademicController::class, 'getPresetTemplates']);
        });

        // Grade Levels
        Route::get('grade-levels', [AcademicController::class, 'gradeLevelsIndex']);
        Route::get('grade-levels/{id}', [AcademicController::class, 'gradeLevelDetail']);
        Route::post('grade-levels', [AcademicController::class, 'createGradeLevel']);
        Route::put('grade-levels/{id}', [AcademicController::class, 'updateGradeLevel']);
        Route::delete('grade-levels/{id}', [AcademicController::class, 'deleteGradeLevel']);
        Route::post('grade-levels/bulk', [AcademicController::class, 'bulkCreateGradeLevels']);

        // Sections
        Route::get('sections', [AcademicController::class, 'sectionsIndex']);
        Route::get('grade-levels/{gradeLevelId}/sections', [AcademicController::class, 'sectionsIndex']);
        Route::post('sections', [AcademicController::class, 'createSection']);
        Route::put('sections/{id}', [AcademicController::class, 'updateSection']);
        Route::delete('sections/{id}', [AcademicController::class, 'deleteSection']);

        // Departments
        Route::get('departments', [AcademicController::class, 'departmentsIndex']);
        Route::post('departments', [AcademicController::class, 'createDepartment']);
        Route::put('departments/{id}', [AcademicController::class, 'updateDepartment']);
        Route::delete('departments/{id}', [AcademicController::class, 'deleteDepartment']);

        // Subjects
        Route::get('subjects', [AcademicController::class, 'subjectsIndex']);
        Route::post('subjects', [AcademicController::class, 'createSubject']);
        Route::put('subjects/{id}', [AcademicController::class, 'updateSubject']);
        Route::delete('subjects/{id}', [AcademicController::class, 'deleteSubject']);

        // Subject-to-Grade Mappings
        Route::get('grade-levels/{gradeLevelId}/subjects', [AcademicController::class, 'gradeLevelSubjects']);
        Route::post('subject-mappings', [AcademicController::class, 'assignSubjectToGrade']);
        Route::post('subject-mappings/bulk', [AcademicController::class, 'bulkAssignSubjects']);
        Route::delete('subject-mappings/{id}', [AcademicController::class, 'removeSubjectFromGrade']);

        // Teacher Assignments (Phase 4)
        Route::get('teachers', [AcademicController::class, 'teachersIndex']);
        Route::post('teacher-assignments', [AcademicController::class, 'assignTeacher']);
        Route::delete('teacher-assignments/{id}', [AcademicController::class, 'removeTeacherAssignment']);

        // Scheme of Work (Phase 5)
        Route::get('schemes', [AcademicController::class, 'schemesIndex']);
        Route::post('schemes', [AcademicController::class, 'createScheme']);
        Route::put('schemes/{id}', [AcademicController::class, 'updateScheme']);
        Route::delete('schemes/{id}', [AcademicController::class, 'deleteScheme']);
        Route::put('schemes/{id}/publish', [AcademicController::class, 'publishScheme']);
        Route::post('schemes/bulk-create', [AcademicController::class, 'bulkCreateSchemes']);

        // Lesson Notes (Phase 6)
        Route::get('lesson-notes', [AcademicController::class, 'lessonNotesIndex']);
        Route::post('lesson-notes', [AcademicController::class, 'createLessonNote']);
        Route::put('lesson-notes/{id}', [AcademicController::class, 'updateLessonNote']);
        Route::delete('lesson-notes/{id}', [AcademicController::class, 'deleteLessonNote']);
        Route::put('lesson-notes/{id}/publish', [AcademicController::class, 'publishLessonNote']);

        // School Config
        Route::get('config', [AcademicController::class, 'getSchoolConfig']);
        Route::put('config', [AcademicController::class, 'updateSchoolConfig']);
    });

    // AI Endpoints (outside academic group)
    Route::prefix('ai')->group(function () {
        Route::post('scheme-of-work', [AcademicController::class, 'generateSchemeAI']);
        Route::post('lesson-note', [AcademicController::class, 'generateLessonNoteAI']);
    });

    // Lectures (Phase 7)
    Route::prefix('lectures')->group(function () {
        Route::get('/', [LectureController::class, 'index']);
        Route::post('/', [LectureController::class, 'store']);
        Route::get('/{id}', [LectureController::class, 'show']);
        Route::put('/{id}', [LectureController::class, 'update']);
        Route::delete('/{id}', [LectureController::class, 'destroy']);
        Route::put('/{id}/start', [LectureController::class, 'start']);
        Route::put('/{id}/complete', [LectureController::class, 'complete']);
        Route::put('/{id}/cancel', [LectureController::class, 'cancel']);
        Route::put('/{id}/publish', [LectureController::class, 'publish']);
        Route::get('/{id}/resources', [LectureController::class, 'resources']);
        Route::post('/{id}/resources/upload', [LectureController::class, 'uploadResource']);
        Route::post('/{id}/resources', [LectureController::class, 'addResource']);
        Route::delete('/resources/{id}', [LectureController::class, 'deleteResource']);
        Route::get('/{id}/attendance', [LectureController::class, 'attendance']);
        Route::post('/{id}/attendance', [LectureController::class, 'markAttendance']);
    });

    // AI Lecture Generator
    Route::prefix('ai')->group(function () {
        Route::post('lecture', [AcademicController::class, 'generateLectureAI']);
        Route::post('exam', [AcademicController::class, 'generateExamAI']);
    });

    // Exams (Phase 8)
    Route::prefix('exams')->group(function () {
        Route::get('/', [ExamController::class, 'index']);
        Route::post('/', [ExamController::class, 'store']);
        Route::get('/{id}', [ExamController::class, 'show']);
        Route::put('/{id}', [ExamController::class, 'update']);
        Route::delete('/{id}', [ExamController::class, 'destroy']);
        Route::put('/{id}/publish', [ExamController::class, 'publish']);
        Route::post('/{id}/questions', [ExamController::class, 'syncQuestions']);
        Route::get('/{id}/submissions', [ExamController::class, 'submissions']);
        Route::get('/submissions/{submissionId}', [ExamController::class, 'submissionDetails']);
        Route::post('/submissions/{submissionId}/grade', [ExamController::class, 'gradeSubmission']);
    });

    // Results & Reports (Phase 9)
    Route::prefix('results')->group(function () {
        Route::get('/grades', [ResultController::class, 'index']);
        Route::post('/grades/compute', [ResultController::class, 'computeGrades']);
        Route::post('/overall/compute', [ResultController::class, 'computeOverallResults']);
        Route::get('/report-cards', [ResultController::class, 'listReportCards']);
        Route::post('/report-cards/generate', [ResultController::class, 'generateReportCards']);
        Route::get('/report-cards/download-zip', [ResultController::class, 'downloadZip']);
        Route::get('/pins', [ResultController::class, 'listPins']);
        Route::post('/pins/generate', [ResultController::class, 'generatePins']);
        Route::post('/check', [ResultController::class, 'checkResult']);
    });
});
