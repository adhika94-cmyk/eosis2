<?php

use App\Http\Controllers\Api\AdminCandidateController;
use App\Http\Controllers\Api\AdminClassController;
use App\Http\Controllers\Api\AdminStaffController;
use App\Http\Controllers\Api\AdminStudentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QuickCountController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\VoteController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - eOSIS SMP Negeri 2 Bogor
|--------------------------------------------------------------------------
*/

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
Route::prefix('public')->group(function () {
    Route::get('/info', [QuickCountController::class, 'getPublicInfo']);
    Route::get('/quick-count', [QuickCountController::class, 'getQuickCount']);
});

// ==========================================
// 2. SISWA / PEMILIH ROUTES
// ==========================================
Route::prefix('student')->group(function () {
    Route::post('/login', [AuthController::class, 'studentLogin']);
    Route::get('/me', [AuthController::class, 'studentMe']);
    Route::post('/vote', [VoteController::class, 'castStudentVote']);
});

// ==========================================
// 3. GURU & STAFF ROUTES
// ==========================================
Route::prefix('staff')->group(function () {
    Route::post('/login', [AuthController::class, 'staffLogin']);
    Route::get('/me', [AuthController::class, 'staffMe']);
    Route::post('/vote', [VoteController::class, 'castStaffVote']);
});

// ==========================================
// 4. ADMIN ROUTES
// ==========================================
Route::prefix('admin')->group(function () {
    // Auth
    Route::post('/login', [AuthController::class, 'adminLogin']);
    Route::get('/me', [AuthController::class, 'adminMe']);

    // Dashboard & Stats
    Route::get('/stats', [SettingController::class, 'getStats']);
    Route::get('/settings', [SettingController::class, 'getSettings']);
    Route::put('/settings', [SettingController::class, 'updateSettings']);
    Route::put('/settings/credentials', [SettingController::class, 'updateAdminCredentials']);
    Route::post('/reset-all-votes', [SettingController::class, 'resetAllVotes']);

    // Classes CRUD
    Route::get('/classes', [AdminClassController::class, 'index']);
    Route::post('/classes', [AdminClassController::class, 'store']);
    Route::put('/classes/{id}', [AdminClassController::class, 'update']);
    Route::delete('/classes/{id}', [AdminClassController::class, 'destroy']);

    // Candidates CRUD
    Route::get('/candidates', [AdminCandidateController::class, 'index']);
    Route::post('/candidates', [AdminCandidateController::class, 'store']);
    Route::put('/candidates/{id}', [AdminCandidateController::class, 'update']);
    Route::delete('/candidates/{id}', [AdminCandidateController::class, 'destroy']);

    // Students DPT CRUD & Bulk Import
    Route::get('/students', [AdminStudentController::class, 'index']);
    Route::post('/students', [AdminStudentController::class, 'store']);
    Route::put('/students/{id}', [AdminStudentController::class, 'update']);
    Route::delete('/students/{id}', [AdminStudentController::class, 'destroy']);
    Route::post('/students/{id}/reset-vote', [AdminStudentController::class, 'resetVote']);
    Route::post('/students/reset-all-votes', [AdminStudentController::class, 'resetAllVotes']);
    Route::post('/students/delete-all', [AdminStudentController::class, 'deleteAll']);
    Route::post('/students/import-bulk', [AdminStudentController::class, 'bulkImport']);

    // Teachers & Staff CRUD
    Route::get('/staff', [AdminStaffController::class, 'index']);
    Route::post('/staff', [AdminStaffController::class, 'store']);
    Route::put('/staff/{id}', [AdminStaffController::class, 'update']);
    Route::delete('/staff/{id}', [AdminStaffController::class, 'destroy']);
    Route::post('/staff/{id}/reset-vote', [AdminStaffController::class, 'resetVote']);
    Route::post('/staff/reset-all-votes', [AdminStaffController::class, 'resetAllVotes']);
});
