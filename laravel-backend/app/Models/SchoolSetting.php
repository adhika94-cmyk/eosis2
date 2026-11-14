<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolSetting extends Model
{
    protected $table = 'school_settings';

    protected $fillable = [
        'school_name',
        'school_address',
        'election_period',
        'election_status',
        'election_date',
        'election_end_date',
        'is_quick_count_public',
        'logo_url',
        'voting_rules',
    ];

    protected $casts = [
        'is_quick_count_public' => 'boolean',
        'election_date' => 'datetime',
        'election_end_date' => 'datetime',
    ];
}
