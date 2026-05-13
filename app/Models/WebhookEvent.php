<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    protected $fillable = [
        'user_id',
        'webhook_subscription_id',
        'shop_domain',
        'topic',
        'topic_enum',
        'group',
        'action',
        'webhook_id',
        'api_version',
        'triggered_at',
        'payload',
        'headers',
        'status',
        'attempts',
        'received_at',
        'processed_at',
        'failed_at',
        'error_message',
    ];

    protected $casts = [
        'payload' => 'array',
        'headers' => 'array',
        'triggered_at' => 'datetime',
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subscription()
    {
        return $this->belongsTo(WebhookSubscription::class, 'webhook_subscription_id');
    }
   public function attemptLogs()
{
    return $this->hasMany(WebhookEventAttempt::class);
}

public function jobLogs()
{
    return $this->hasMany(JobLog::class);
}
}