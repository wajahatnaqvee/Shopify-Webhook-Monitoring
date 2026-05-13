<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEventAttempt extends Model
{
    protected $fillable = [
        'webhook_event_id',
        'attempt_number',
        'status',
        'trigger_type',
        'error_message',
        'started_at',
        'finished_at',
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