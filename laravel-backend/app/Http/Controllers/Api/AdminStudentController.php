<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\ClassItem;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminStudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $query = Student::query();

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('nisn', 'like', "%{$s}%")
                  ->orWhere('class_name', 'like', "%{$s}%");
            });
        }

        if ($request->filled('classId') && $request->input('classId') !== 'all') {
            $query->where('class_id', $request->input('classId'));
        }

        if ($request->input('status') === 'voted') {
            $query->where('has_voted', true);
        } elseif ($request->input('status') === 'unvoted') {
            $query->where('has_voted', false);
        }

        $students = $query->orderBy('name', 'asc')->get()->map(function ($s) {
            return [
                'id' => $s->id,
                'nisn' => $s->nisn,
                'name' => $s->name,
                'birthDate' => $s->birth_date ? $s->birth_date->format('Y-m-d') : '',
                'classId' => $s->class_id,
                'className' => $s->class_name,
                'gender' => $s->gender,
                'hasVoted' => (bool)$s->has_voted,
                'votedAt' => $s->voted_at ? $s->voted_at->toIso8601String() : null,
            ];
        });

        return response()->json($students);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $request->validate([
            'nisn' => 'required|string|size:10|unique:students,nisn',
            'name' => 'required|string|max:255',
            'birthDate' => 'required|date',
            'classId' => 'required|string',
            'gender' => 'required|in:L,P',
        ]);

        $classItem = ClassItem::find($request->input('classId'));
        $className = $classItem ? $classItem->name : '7A';

        $student = Student::create([
            'id' => 'std-' . Str::random(10),
            'nisn' => trim($request->input('nisn')),
            'name' => trim($request->input('name')),
            'birth_date' => trim($request->input('birthDate')),
            'class_id' => $request->input('classId'),
            'class_name' => $className,
            'gender' => $request->input('gender'),
            'has_voted' => false,
            'voted_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'student' => $student,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $student = Student::findOrFail($id);

        $request->validate([
            'nisn' => 'sometimes|string|size:10|unique:students,nisn,' . $student->id . ',id',
            'name' => 'sometimes|string|max:255',
            'birthDate' => 'sometimes|date',
            'classId' => 'sometimes|string',
            'gender' => 'sometimes|in:L,P',
        ]);

        if ($request->filled('classId')) {
            $classItem = ClassItem::find($request->input('classId'));
            if ($classItem) {
                $student->class_id = $classItem->id;
                $student->class_name = $classItem->name;
            }
        }

        if ($request->filled('nisn')) $student->nisn = trim($request->input('nisn'));
        if ($request->filled('name')) $student->name = trim($request->input('name'));
        if ($request->filled('birthDate')) $student->birth_date = trim($request->input('birthDate'));
        if ($request->filled('gender')) $student->gender = $request->input('gender');

        $student->save();

        return response()->json([
            'success' => true,
            'student' => $student,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $student = Student::findOrFail($id);
        $student->delete();

        return response()->json([
            'success' => true,
            'message' => 'Siswa berhasil dihapus.',
        ]);
    }

    public function resetVote(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $student = Student::findOrFail($id);
        $student->has_voted = false;
        $student->voted_at = null;
        $student->save();

        return response()->json([
            'success' => true,
            'message' => 'Status hak suara siswa berhasil direset menjadi belum memilih.',
        ]);
    }

    public function resetAllVotes(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $count = Student::where('has_voted', true)->update([
            'has_voted' => false,
            'voted_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => "Berhasil mereset status {$count} siswa menjadi belum memilih.",
        ]);
    }

    /**
     * Hapus SELURUH data siswa dari DPT
     */
    public function deleteAll(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $count = Student::count();
        Student::truncate();

        return response()->json([
            'success' => true,
            'count' => $count,
            'message' => "Berhasil menghapus seluruh {$count} data siswa dari sistem.",
        ]);
    }

    /**
     * Import Siswa Massal (Unlimited Capacity)
     * Mendukung auto create kelas dan penanganan ribuan data per chunk
     */
    public function bulkImport(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $studentsData = $request->input('students', []);
        $autoCreateClass = $request->input('autoCreateClass', true);
        $updateExisting = (bool)$request->input('updateExisting', false);

        if (!is_array($studentsData)) {
            return response()->json([
                'success' => false,
                'message' => 'Format data siswa tidak valid, diharapkan berupa array.',
            ], 400);
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $newClassesCreated = [];
        $errors = [];

        // Cache existing classes
        $classes = ClassItem::all()->keyBy(function ($c) {
            return strtolower(trim($c->name));
        });

        // Helper detect grade
        $detectGrade = function ($name) {
            if (preg_match('/^(?:kelas\s*)?(?:vii|7)/i', $name)) return 7;
            if (preg_match('/^(?:kelas\s*)?(?:viii|8)/i', $name)) return 8;
            if (preg_match('/^(?:kelas\s*)?(?:ix|9)/i', $name)) return 9;
            return 7;
        };

        // Cache existing students NISN
        $existingStudents = Student::pluck('id', 'nisn')->toArray();

        DB::beginTransaction();
        try {
            foreach ($studentsData as $idx => $row) {
                $nisn = preg_replace('/\D/', '', (string)($row['nisn'] ?? ''));
                $name = trim((string)($row['name'] ?? ''));
                $className = trim((string)($row['className'] ?? '7A'));
                $birthDate = trim((string)($row['birthDate'] ?? '2011-01-01'));
                $gender = strtoupper(trim((string)($row['gender'] ?? 'L')));
                $gender = str_starts_with($gender, 'P') ? 'P' : 'L';

                if (empty($nisn) || empty($name)) {
                    $errors[] = "Baris " . ($idx + 1) . ": NISN atau nama kosong.";
                    $skipped++;
                    continue;
                }

                // Handle class
                $classKey = strtolower($className);
                if (!$classes->has($classKey)) {
                    if ($autoCreateClass) {
                        $newClass = ClassItem::create([
                            'id' => 'c-' . Str::slug($className) . '-' . Str::random(4),
                            'name' => $className,
                            'grade' => $detectGrade($className),
                        ]);
                        $classes->put($classKey, $newClass);
                        $newClassesCreated[] = $className;
                        $classId = $newClass->id;
                    } else {
                        $defaultClass = $classes->first();
                        $classId = $defaultClass ? $defaultClass->id : 'c-7a';
                    }
                } else {
                    $classId = $classes->get($classKey)->id;
                }

                if (isset($existingStudents[$nisn])) {
                    if ($updateExisting) {
                        Student::where('nisn', $nisn)->update([
                            'name' => $name,
                            'class_id' => $classId,
                            'class_name' => $className,
                            'birth_date' => $birthDate,
                            'gender' => $gender,
                        ]);
                        $updated++;
                    } else {
                        $skipped++;
                    }
                } else {
                    $newId = 'std-' . Str::random(12);
                    Student::create([
                        'id' => $newId,
                        'nisn' => $nisn,
                        'name' => $name,
                        'birth_date' => $birthDate,
                        'class_id' => $classId,
                        'class_name' => $className,
                        'gender' => $gender,
                        'has_voted' => false,
                        'voted_at' => null,
                    ]);
                    $existingStudents[$nisn] = $newId;
                    $imported++;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'totalProcessed' => count($studentsData),
                'imported' => $imported,
                'updated' => $updated,
                'skipped' => $skipped,
                'newClassesCreated' => array_unique($newClassesCreated),
                'errors' => array_slice($errors, 0, 10),
                'message' => "Berhasil mengimpor {$imported} siswa baru" .
                    ($updated > 0 ? ", memperbarui {$updated} siswa" : '') .
                    ($skipped > 0 ? ", dan {$skipped} data dilewati" : '') .
                    (count($newClassesCreated) > 0 ? ". Dibuat " . count($newClassesCreated) . " kelas baru otomatis." : '.'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengimpor data siswa: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function ensureAdmin(Request $request): Admin
    {
        $auth = $request->header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) {
            abort(401, 'Sesi administrator tidak ditemukan.');
        }
        $token = substr($auth, 7);
        $parts = explode('_', $token, 2);
        if (count($parts) < 2 || $parts[0] !== 'adm') {
            abort(401, 'Sesi administrator tidak valid.');
        }
        $decoded = json_decode(base64_decode($parts[1]), true);
        $admin = isset($decoded['id']) ? Admin::find($decoded['id']) : null;
        if (!$admin) {
            abort(401, 'Akun admin tidak cocok.');
        }
        return $admin;
    }
}
