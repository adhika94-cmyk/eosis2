<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Candidate;
use App\Models\ClassItem;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\TeacherStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SettingController extends Controller
{
    public function getSettings(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $setting = SchoolSetting::firstOrCreate([], [
            'school_name' => 'SMP Negeri 2 Bogor',
            'school_address' => 'Jl. Pengadilan No.4, Pabaton, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16121',
            'election_period' => '2026/2027',
            'election_status' => 'open',
            'is_quick_count_public' => true,
        ]);

        return response()->json($setting);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $setting = SchoolSetting::firstOrCreate([]);

        $setting->update($request->only([
            'school_name',
            'school_address',
            'election_period',
            'election_status',
            'election_date',
            'election_end_date',
            'is_quick_count_public',
            'logo_url',
            'voting_rules',
        ]));

        return response()->json([
            'success' => true,
            'settings' => $setting,
        ]);
    }

    public function updateAdminCredentials(Request $request): JsonResponse
    {
        $admin = $this->ensureAdmin($request);

        $request->validate([
            'username' => 'sometimes|string|unique:admins,username,' . $admin->id . ',id',
            'name' => 'sometimes|string|max:255',
            'newPassword' => 'nullable|string|min:4',
            'currentPassword' => 'nullable|string',
        ]);

        if ($request->filled('username')) {
            $admin->username = trim($request->input('username'));
        }

        if ($request->filled('name')) {
            $admin->name = trim($request->input('name'));
        }

        if ($request->filled('newPassword')) {
            $admin->password = Hash::make($request->input('newPassword'));
        }

        $admin->save();

        return response()->json([
            'success' => true,
            'message' => 'Kredensial administrator berhasil diperbarui.',
            'admin' => [
                'id' => $admin->id,
                'username' => $admin->username,
                'name' => $admin->name,
            ],
        ]);
    }

    public function getStats(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $students = Student::all();
        $staffList = TeacherStaff::all();
        $candidates = Candidate::all();
        $classes = ClassItem::all();

        $totalStudents = $students->count();
        $votedStudents = $students->where('has_voted', true)->count();
        $notVotedStudents = $totalStudents - $votedStudents;

        $totalStaff = $staffList->count();
        $votedStaff = $staffList->where('has_voted', true)->count();
        $notVotedStaff = $totalStaff - $votedStaff;

        $totalVoters = $totalStudents + $totalStaff;
        $totalVoted = $votedStudents + $votedStaff;
        $notVotedCount = $totalVoters - $totalVoted;
        $participationRate = $totalVoters > 0 ? round(($totalVoted / $totalVoters) * 100, 1) : 0;

        $perClass = $classes->map(function ($c) use ($students) {
            $classStudents = $students->where('class_id', $c->id);
            $cTotal = $classStudents->count();
            $cVoted = $classStudents->where('has_voted', true)->count();
            $cRate = $cTotal > 0 ? round(($cVoted / $cTotal) * 100, 1) : 0;
            return [
                'classId' => $c->id,
                'className' => $c->name,
                'totalStudents' => $cTotal,
                'votedStudents' => $cVoted,
                'participationRate' => (string)$cRate,
            ];
        });

        return response()->json([
            'totalStudents' => $totalStudents,
            'votedStudents' => $votedStudents,
            'notVotedStudents' => $notVotedStudents,
            'totalStaff' => $totalStaff,
            'votedStaff' => $votedStaff,
            'notVotedStaff' => $notVotedStaff,
            'totalVoters' => $totalVoters,
            'totalVoted' => $totalVoted,
            'notVotedCount' => $notVotedCount,
            'totalClasses' => $classes->count(),
            'totalCandidates' => $candidates->count(),
            'participationRate' => (string)$participationRate,
            'perClass' => $perClass,
        ]);
    }

    public function resetAllVotes(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        Student::query()->update(['has_voted' => false, 'voted_at' => null]);
        TeacherStaff::query()->update(['has_voted' => false, 'voted_at' => null]);
        Candidate::query()->update(['votes_count' => 0]);

        return response()->json([
            'success' => true,
            'message' => 'Seluruh suara dan status pemilih berhasil direset.',
        ]);
    }

    private function ensureAdmin(Request $request): Admin
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) abort(401, 'Unauthorized');
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'adm') abort(401, 'Unauthorized');
        $decoded = json_decode(base64_decode($parts[1]), true);
        return Admin::findOrFail($decoded['id']);
    }
}
