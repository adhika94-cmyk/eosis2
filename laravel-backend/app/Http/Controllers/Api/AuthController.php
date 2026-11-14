<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Student;
use App\Models\TeacherStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // ==========================================
    // 1. SISWA / PEMILIH LOGIN
    // ==========================================
    public function studentLogin(Request $request): JsonResponse
    {
        $request->validate([
            'nisn' => 'required|string',
            'birthDate' => 'required|string',
        ]);

        $nisn = trim($request->input('nisn'));
        $birthDate = trim($request->input('birthDate'));

        $student = Student::where('nisn', $nisn)
            ->whereDate('birth_date', $birthDate)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'NISN atau Tanggal Lahir tidak cocok dengan Daftar Pemilih Tetap (DPT).',
            ], 404);
        }

        // Generate base64 session token
        $payload = base64_encode(json_encode(['prefix' => 'std', 'id' => $student->id, 'time' => time()]));
        $token = 'std_' . $payload;

        return response()->json([
            'success' => true,
            'token' => $token,
            'student' => [
                'id' => $student->id,
                'nisn' => $student->nisn,
                'name' => $student->name,
                'className' => $student->class_name,
                'gender' => $student->gender,
                'hasVoted' => (bool)$student->has_voted,
                'votedAt' => $student->voted_at ? $student->voted_at->toIso8601String() : null,
            ],
        ]);
    }

    public function studentMe(Request $request): JsonResponse
    {
        $student = $this->resolveStudentFromToken($request);
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Sesi siswa tidak valid.'], 401);
        }

        return response()->json([
            'success' => true,
            'student' => [
                'id' => $student->id,
                'nisn' => $student->nisn,
                'name' => $student->name,
                'className' => $student->class_name,
                'gender' => $student->gender,
                'hasVoted' => (bool)$student->has_voted,
                'votedAt' => $student->voted_at ? $student->voted_at->toIso8601String() : null,
            ],
        ]);
    }

    // ==========================================
    // 2. GURU & STAFF LOGIN
    // ==========================================
    public function staffLogin(Request $request): JsonResponse
    {
        $request->validate([
            'nip' => 'required|string',
            'birthYear' => 'required|string',
        ]);

        $nip = trim($request->input('nip'));
        $birthYear = trim($request->input('birthYear'));

        $staff = TeacherStaff::where('nip', $nip)
            ->where('birth_year', $birthYear)
            ->first();

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'NIP atau Tahun Lahir tidak cocok dengan data Guru & Staff.',
            ], 404);
        }

        $payload = base64_encode(json_encode(['prefix' => 'stf', 'id' => $staff->id, 'time' => time()]));
        $token = 'stf_' . $payload;

        return response()->json([
            'success' => true,
            'token' => $token,
            'staff' => [
                'id' => $staff->id,
                'nip' => $staff->nip,
                'name' => $staff->name,
                'role' => $staff->role,
                'birthYear' => $staff->birth_year,
                'gender' => $staff->gender,
                'hasVoted' => (bool)$staff->has_voted,
                'votedAt' => $staff->voted_at ? $staff->voted_at->toIso8601String() : null,
            ],
        ]);
    }

    public function staffMe(Request $request): JsonResponse
    {
        $staff = $this->resolveStaffFromToken($request);
        if (!$staff) {
            return response()->json(['success' => false, 'message' => 'Sesi guru/staff tidak valid.'], 401);
        }

        return response()->json([
            'success' => true,
            'staff' => [
                'id' => $staff->id,
                'nip' => $staff->nip,
                'name' => $staff->name,
                'role' => $staff->role,
                'birthYear' => $staff->birth_year,
                'gender' => $staff->gender,
                'hasVoted' => (bool)$staff->has_voted,
                'votedAt' => $staff->voted_at ? $staff->voted_at->toIso8601String() : null,
            ],
        ]);
    }

    // ==========================================
    // 3. ADMIN LOGIN
    // ==========================================
    public function adminLogin(Request $request): JsonResponse
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $username = trim($request->input('username'));
        $password = trim($request->input('password'));

        $admin = Admin::where('username', $username)->first();

        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Username atau password admin salah.'], 401);
        }

        // Support both bcrypt and sha256 for backward compatibility
        $isValid = Hash::check($password, $admin->password) || (hash('sha256', $password) === $admin->password);
        if (!$isValid) {
            return response()->json(['success' => false, 'message' => 'Username atau password admin salah.'], 401);
        }

        $payload = base64_encode(json_encode(['prefix' => 'adm', 'id' => $admin->id, 'time' => time()]));
        $token = 'adm_' . $payload;

        return response()->json([
            'success' => true,
            'token' => $token,
            'admin' => [
                'id' => $admin->id,
                'username' => $admin->username,
                'name' => $admin->name,
            ],
        ]);
    }

    public function adminMe(Request $request): JsonResponse
    {
        $admin = $this->resolveAdminFromToken($request);
        if (!$admin) {
            return response()->json(['success' => false, 'message' => 'Sesi admin tidak valid.'], 401);
        }

        return response()->json([
            'success' => true,
            'admin' => [
                'id' => $admin->id,
                'username' => $admin->username,
                'name' => $admin->name,
            ],
        ]);
    }

    // Helper token resolvers
    private function resolveStudentFromToken(Request $request): ?Student
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) return null;
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'std') return null;
        $decoded = json_decode(base64_decode($parts[1]), true);
        return isset($decoded['id']) ? Student::find($decoded['id']) : null;
    }

    private function resolveStaffFromToken(Request $request): ?TeacherStaff
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) return null;
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'stf') return null;
        $decoded = json_decode(base64_decode($parts[1]), true);
        return isset($decoded['id']) ? TeacherStaff::find($decoded['id']) : null;
    }

    private function resolveAdminFromToken(Request $request): ?Admin
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) return null;
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'adm') return null;
        $decoded = json_decode(base64_decode($parts[1]), true);
        return isset($decoded['id']) ? Admin::find($decoded['id']) : null;
    }
}
