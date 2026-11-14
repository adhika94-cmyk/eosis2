<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherStaff extends Model
{
    protected $table = 'teacher_staff';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nip',
        'name',
        'birth_year',
        'role',
        'gender',
        'has_voted',
        'voted_at',
    ];

    protected $casts = [
        'has_voted' => 'boolean',
        'voted_at' => 'datetime',
    ];
}
