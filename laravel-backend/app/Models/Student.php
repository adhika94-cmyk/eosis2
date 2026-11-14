<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Student extends Model
{
    protected $table = 'students';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'nisn',
        'name',
        'birth_date',
        'class_id',
        'class_name',
        'gender',
        'has_voted',
        'voted_at',
    ];

    protected $casts = [
        'has_voted' => 'boolean',
        'birth_date' => 'date:Y-m-d',
        'voted_at' => 'datetime',
    ];

    public function classItem(): BelongsTo
    {
        return $this->belongsTo(ClassItem::class, 'class_id', 'id');
    }
}
