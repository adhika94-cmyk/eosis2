<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassItem extends Model
{
    protected $table = 'classes';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'grade',
    ];

    protected $casts = [
        'grade' => 'integer',
    ];

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'class_id', 'id');
    }
}
