<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobLog extends Model
{
    protected $fillable = [
        'webhook_event_id',
        'job_name',
        'queue_name',
        'status',
        'attempt',
        'started_at',
        'finished_at',
        'duration_ms',
        'exception_class',
        'error_message',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function webhookEvent()
    {
        return $this->belongsTo(WebhookEvent::class);
    }
}