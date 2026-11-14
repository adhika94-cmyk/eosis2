<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\TeacherStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VoteController extends Controller
{
    /**
     * Siswa memberikan suara
     * Menggunakan DB Transaction + lockForUpdate() (Pessimistic Locking)
     * Prinsip Luber Jurdil: Pilihan kandidat rahasia dan TIDAK DISIMPAN bersamaan dengan ID siswa.
     */
    public function castStudentVote(Request $request): JsonResponse
    {
        $student = $this->resolveStudent($request);
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Sesi pemilih tidak valid atau telah berakhir.'], 401);
        }

        $request->validate([
            'candidateId' => 'required|string',
        ]);

        $candidateId = $request->input('candidateId');

        // Check election status
        $setting = SchoolSetting::first();
        if ($setting && $setting->election_status !== 'open') {
            return response()->json([
                'success' => false,
                'message' => 'Pemilihan saat ini sedang ditutup atau dijeda oleh panitia.',
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Lock row siswa untuk mencegah double-vote dari multiple tab / refresh paralel
            $lockedStudent = Student::where('id', $student->id)->lockForUpdate()->first();
            if (!$lockedStudent) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Data siswa tidak ditemukan.'], 404);
            }

            if ($lockedStudent->has_voted) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Anda sudah menggunakan hak suara Anda sebelumnya.'], 400);
            }

            // Lock row kandidat dan increment perolehan suara
            $lockedCandidate = Candidate::where('id', $candidateId)->lockForUpdate()->first();
            if (!$lockedCandidate) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Kandidat yang dipilih tidak valid.'], 404);
            }

            // 1. Catat status siswa sudah memilih (TANPA mencatat pilihan kandidat)
            $lockedStudent->has_voted = true;
            $lockedStudent->voted_at = now();
            $lockedStudent->save();

            // 2. Tambah total suara kandidat secara anonim
            $lockedCandidate->increment('votes_count');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Suara Anda berhasil dicatat, terima kasih telah berpartisipasi',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem saat menyimpan suara: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Guru & Staff memberikan suara
     */
    public function castStaffVote(Request $request): JsonResponse
    {
        $staff = $this->resolveStaff($request);
        if (!$staff) {
            return response()->json(['success' => false, 'message' => 'Sesi pemilih guru/staff tidak valid.'], 401);
        }

        $request->validate([
            'candidateId' => 'required|string',
        ]);

        $candidateId = $request->input('candidateId');

        $setting = SchoolSetting::first();
        if ($setting && $setting->election_status !== 'open') {
            return response()->json([
                'success' => false,
                'message' => 'Pemilihan saat ini sedang ditutup atau dijeda oleh panitia.',
            ], 400);
        }

        try {
            DB::beginTransaction();

            $lockedStaff = TeacherStaff::where('id', $staff->id)->lockForUpdate()->first();
            if (!$lockedStaff) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Data guru/staff tidak ditemukan.'], 404);
            }

            if ($lockedStaff->has_voted) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Anda sudah menggunakan hak suara Anda sebelumnya.'], 400);
            }

            $lockedCandidate = Candidate::where('id', $candidateId)->lockForUpdate()->first();
            if (!$lockedCandidate) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Kandidat yang dipilih tidak valid.'], 404);
            }

            $lockedStaff->has_voted = true;
            $lockedStaff->voted_at = now();
            $lockedStaff->save();

            $lockedCandidate->increment('votes_count');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Suara Anda berhasil dicatat, terima kasih telah berpartisipasi',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function resolveStudent(Request $request): ?Student
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) return null;
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'std') return null;
        $decoded = json_decode(base64_decode($parts[1]), true);
        return isset($decoded['id']) ? Student::find($decoded['id']) : null;
    }

    private function resolveStaff(Request $request): ?TeacherStaff
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) return null;
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'stf') return null;
        $decoded = json_decode(base64_decode($parts[1]), true);
        return isset($decoded['id']) ? TeacherStaff::find($decoded['id']) : null;
    }
}
