<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\TeacherStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminStaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $query = TeacherStaff::query();

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('nip', 'like', "%{$s}%")
                  ->orWhere('role', 'like', "%{$s}%");
            });
        }

        if ($request->input('status') === 'voted') {
            $query->where('has_voted', true);
        } elseif ($request->input('status') === 'unvoted') {
            $query->where('has_voted', false);
        }

        $staffList = $query->orderBy('name', 'asc')->get()->map(function ($st) {
            return [
                'id' => $st->id,
                'nip' => $st->nip,
                'name' => $st->name,
                'birthYear' => $st->birth_year,
                'role' => $st->role,
                'gender' => $st->gender,
                'hasVoted' => (bool)$st->has_voted,
                'votedAt' => $st->voted_at ? $st->voted_at->toIso8601String() : null,
            ];
        });

        return response()->json($staffList);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $request->validate([
            'nip' => 'required|string|unique:teacher_staff,nip',
            'name' => 'required|string|max:255',
            'birthYear' => 'required|string|size:4',
            'role' => 'nullable|string|max:255',
            'gender' => 'required|in:L,P',
        ]);

        $staff = TeacherStaff::create([
            'id' => 'stf-' . Str::random(8),
            'nip' => trim($request->input('nip')),
            'name' => trim($request->input('name')),
            'birth_year' => trim($request->input('birthYear')),
            'role' => trim($request->input('role', 'Guru Mata Pelajaran')),
            'gender' => $request->input('gender'),
            'has_voted' => false,
            'voted_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'staff' => $staff,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $staff = TeacherStaff::findOrFail($id);

        $request->validate([
            'nip' => 'sometimes|string|unique:teacher_staff,nip,' . $staff->id . ',id',
            'name' => 'sometimes|string|max:255',
            'birthYear' => 'sometimes|string|size:4',
            'role' => 'sometimes|string|max:255',
            'gender' => 'sometimes|in:L,P',
        ]);

        if ($request->has('nip')) $staff->nip = trim($request->input('nip'));
        if ($request->has('name')) $staff->name = trim($request->input('name'));
        if ($request->has('birthYear')) $staff->birth_year = trim($request->input('birthYear'));
        if ($request->has('role')) $staff->role = trim($request->input('role'));
        if ($request->has('gender')) $staff->gender = $request->input('gender');

        $staff->save();

        return response()->json([
            'success' => true,
            'staff' => $staff,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $staff = TeacherStaff::findOrFail($id);
        $staff->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data guru/staff berhasil dihapus.',
        ]);
    }

    public function resetVote(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $staff = TeacherStaff::findOrFail($id);
        $staff->has_voted = false;
        $staff->voted_at = null;
        $staff->save();

        return response()->json([
            'success' => true,
            'message' => 'Status hak suara guru/staff berhasil direset menjadi belum memilih.',
        ]);
    }

    public function resetAllVotes(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $count = TeacherStaff::where('has_voted', true)->update([
            'has_voted' => false,
            'voted_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => "Berhasil mereset status {$count} guru/staff menjadi belum memilih.",
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
