<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Candidate extends Model
{
    protected $table = 'candidates';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'candidate_no',
        'leader_name',
        'vice_leader_name',
        'leader_class',
        'vice_leader_class',
        'slogan',
        'vision',
        'mission',
        'photo_url',
        'votes_count',
    ];

    protected $casts = [
        'candidate_no' => 'integer',
        'votes_count' => 'integer',
        'mission' => 'array',
    ];
}
