<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Candidate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminCandidateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $candidates = Candidate::orderBy('candidate_no', 'asc')->get();
        return response()->json($candidates);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $request->validate([
            'candidateNo' => 'required|integer|unique:candidates,candidate_no',
            'leaderName' => 'required|string|max:255',
            'viceLeaderName' => 'required|string|max:255',
            'leaderClass' => 'required|string|max:50',
            'viceLeaderClass' => 'required|string|max:50',
            'slogan' => 'required|string|max:255',
            'vision' => 'required|string',
            'mission' => 'required',
            'photoUrl' => 'nullable|string',
        ]);

        $mission = $request->input('mission');
        if (is_string($mission)) {
            $mission = array_filter(array_map('trim', explode("\n", $mission)));
        }

        $candidate = Candidate::create([
            'id' => 'cand-' . Str::random(8),
            'candidate_no' => $request->input('candidateNo'),
            'leader_name' => trim($request->input('leaderName')),
            'vice_leader_name' => trim($request->input('viceLeaderName')),
            'leader_class' => trim($request->input('leaderClass')),
            'vice_leader_class' => trim($request->input('viceLeaderClass')),
            'slogan' => trim($request->input('slogan')),
            'vision' => trim($request->input('vision')),
            'mission' => array_values($mission),
            'photo_url' => $request->input('photoUrl', ''),
            'votes_count' => 0,
        ]);

        return response()->json([
            'success' => true,
            'candidate' => $candidate,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $candidate = Candidate::findOrFail($id);

        $request->validate([
            'candidateNo' => 'sometimes|integer|unique:candidates,candidate_no,' . $candidate->id . ',id',
            'leaderName' => 'sometimes|string|max:255',
            'viceLeaderName' => 'sometimes|string|max:255',
            'leaderClass' => 'sometimes|string|max:50',
            'viceLeaderClass' => 'sometimes|string|max:50',
            'slogan' => 'sometimes|string|max:255',
            'vision' => 'sometimes|string',
            'mission' => 'sometimes',
            'photoUrl' => 'nullable|string',
        ]);

        if ($request->has('candidateNo')) $candidate->candidate_no = $request->input('candidateNo');
        if ($request->has('leaderName')) $candidate->leader_name = trim($request->input('leaderName'));
        if ($request->has('viceLeaderName')) $candidate->vice_leader_name = trim($request->input('viceLeaderName'));
        if ($request->has('leaderClass')) $candidate->leader_class = trim($request->input('leaderClass'));
        if ($request->has('viceLeaderClass')) $candidate->vice_leader_class = trim($request->input('viceLeaderClass'));
        if ($request->has('slogan')) $candidate->slogan = trim($request->input('slogan'));
        if ($request->has('vision')) $candidate->vision = trim($request->input('vision'));
        if ($request->has('photoUrl')) $candidate->photo_url = $request->input('photoUrl');

        if ($request->has('mission')) {
            $mission = $request->input('mission');
            if (is_string($mission)) {
                $mission = array_filter(array_map('trim', explode("\n", $mission)));
            }
            $candidate->mission = array_values($mission);
        }

        $candidate->save();

        return response()->json([
            'success' => true,
            'candidate' => $candidate,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->ensureAdmin($request);

        $candidate = Candidate::findOrFail($id);
        $candidate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kandidat berhasil dihapus.',
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
