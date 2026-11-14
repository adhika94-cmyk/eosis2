<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\ClassItem;
use App\Models\SchoolSetting;
use App\Models\Student;
use App\Models\TeacherStaff;
use Illuminate\Http\JsonResponse;

class QuickCountController extends Controller
{
    public function getQuickCount(): JsonResponse
    {
        $setting = SchoolSetting::first();
        $candidates = Candidate::orderBy('candidate_no', 'asc')->get();

        $totalStudents = Student::count();
        $votedStudents = Student::where('has_voted', true)->count();

        $totalStaff = TeacherStaff::count();
        $votedStaff = TeacherStaff::where('has_voted', true)->count();

        $totalVoters = $totalStudents + $totalStaff;
        $totalVotes = (int)Candidate::sum('votes_count');
        $participationRate = $totalVoters > 0 ? round(($totalVotes / $totalVoters) * 100, 1) : 0;

        $candidateResults = $candidates->map(function ($c) use ($totalVotes) {
            $percentage = $totalVotes > 0 ? round(($c->votes_count / $totalVotes) * 100, 1) : 0;
            return [
                'id' => $c->id,
                'candidateNo' => $c->candidate_no,
                'leaderName' => $c->leader_name,
                'viceLeaderName' => $c->vice_leader_name,
                'leaderClass' => $c->leader_class,
                'viceLeaderClass' => $c->vice_leader_class,
                'slogan' => $c->slogan,
                'photoUrl' => $c->photo_url,
                'votesCount' => (int)$c->votes_count,
                'percentage' => (string)$percentage,
            ];
        });

        // Per class breakdown
        $classes = ClassItem::withCount(['students', 'students as voted_count' => function ($query) {
            $query->where('has_voted', true);
        }])->get();

        $classParticipation = $classes->map(function ($cls) {
            $total = $cls->students_count;
            $voted = $cls->voted_count;
            $pct = $total > 0 ? round(($voted / $total) * 100, 1) : 0;
            return [
                'className' => $cls->name,
                'total' => $total,
                'voted' => $voted,
                'percentage' => (string)$pct,
            ];
        });

        return response()->json([
            'totalVotes' => $totalVotes,
            'totalVoters' => $totalVoters,
            'totalStudents' => $totalStudents,
            'totalStaff' => $totalStaff,
            'votedStudents' => $votedStudents,
            'votedStaff' => $votedStaff,
            'participationRate' => (string)$participationRate,
            'electionStatus' => $setting ? $setting->election_status : 'open',
            'electionDate' => $setting && $setting->election_date ? $setting->election_date->toIso8601String() : null,
            'electionEndDate' => $setting && $setting->election_end_date ? $setting->election_end_date->toIso8601String() : null,
            'lastUpdated' => now()->toIso8601String(),
            'candidates' => $candidateResults,
            'classParticipation' => $classParticipation,
        ]);
    }

    public function getPublicInfo(): JsonResponse
    {
        $setting = SchoolSetting::first();
        $candidates = Candidate::orderBy('candidate_no', 'asc')->get()->map(function ($c) {
            return [
                'id' => $c->id,
                'candidateNo' => $c->candidate_no,
                'leaderName' => $c->leader_name,
                'viceLeaderName' => $c->vice_leader_name,
                'leaderClass' => $c->leader_class,
                'viceLeaderClass' => $c->vice_leader_class,
                'slogan' => $c->slogan,
                'vision' => $c->vision,
                'mission' => $c->mission,
                'photoUrl' => $c->photo_url,
            ];
        });

        $totalStudents = Student::count();
        $votedStudents = Student::where('has_voted', true)->count();
        $totalStaff = TeacherStaff::count();
        $votedStaff = TeacherStaff::where('has_voted', true)->count();
        $totalVoters = $totalStudents + $totalStaff;
        $totalVoted = $votedStudents + $votedStaff;
        $participationRate = $totalVoters > 0 ? round(($totalVoted / $totalVoters) * 100, 1) : 0;

        return response()->json([
            'settings' => [
                'id' => $setting ? (string)$setting->id : '1',
                'schoolName' => $setting ? $setting->school_name : 'SMP Negeri 2 Bogor',
                'schoolAddress' => $setting ? $setting->school_address : '',
                'electionPeriod' => $setting ? $setting->election_period : '2026/2027',
                'electionStatus' => $setting ? $setting->election_status : 'open',
                'electionDate' => $setting && $setting->election_date ? $setting->election_date->toIso8601String() : null,
                'electionEndDate' => $setting && $setting->election_end_date ? $setting->election_end_date->toIso8601String() : null,
                'isQuickCountPublic' => $setting ? (bool)$setting->is_quick_count_public : true,
                'logoUrl' => $setting ? $setting->logo_url : '',
                'votingRules' => $setting ? $setting->voting_rules : '',
            ],
            'candidates' => $candidates,
            'stats' => [
                'totalStudents' => $totalStudents,
                'votedStudents' => $votedStudents,
                'totalStaff' => $totalStaff,
                'votedStaff' => $votedStaff,
                'totalVoters' => $totalVoters,
                'totalVoted' => $totalVoted,
                'participationRate' => (string)$participationRate,
            ],
        ]);
    }
}
