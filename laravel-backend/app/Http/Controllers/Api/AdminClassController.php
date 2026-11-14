<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\ClassItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $classes = ClassItem::orderBy('grade', 'asc')->orderBy('name', 'asc')->get();
        return response()->json($classes);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $request->validate([
            'name' => 'required|string|unique:classes,name',
            'grade' => 'required|integer|min:7|max:9',
        ]);

        $name = trim($request->input('name'));
        $classItem = ClassItem::create([
            'id' => 'c-' . Str::slug($name) . '-' . Str::random(4),
            'name' => $name,
            'grade' => $request->input('grade'),
        ]);

        return response()->json([
            'success' => true,
            'classItem' => $classItem,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $classItem = ClassItem::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|unique:classes,name,' . $classItem->id . ',id',
            'grade' => 'sometimes|integer|min:7|max:9',
        ]);

        if ($request->has('name')) $classItem->name = trim($request->input('name'));
        if ($request->has('grade')) $classItem->grade = $request->input('grade');

        $classItem->save();

        return response()->json([
            'success' => true,
            'classItem' => $classItem,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $classItem = ClassItem::withCount('students')->findOrFail($id);

        if ($classItem->students_count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Tidak dapat menghapus kelas karena masih ada {$classItem->students_count} siswa di dalamnya.",
            ], 400);
        }

        $classItem->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kelas berhasil dihapus.',
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
