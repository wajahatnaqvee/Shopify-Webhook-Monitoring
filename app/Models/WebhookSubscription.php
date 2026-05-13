<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookSubscription extends Model
{
    protected $fillable = [
        'user_id',
        'shop_domain',
        'shopify_subscription_id',
        'group',
        'action',
        'title',
        'topic_enum',
        'topic_header',
        'endpoint_url',
        'format',
        'filter',
        'include_fields',
        'metafield_namespaces',
        'required_scope',
        'supported',
        'unsupported_reason',
        'status',
        'last_synced_at',
        'last_error',
    ];

    protected $casts = [
        'include_fields'        => 'array',
        'metafield_namespaces'  => 'array',
        'supported'             => 'boolean',
        'last_synced_at'        => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
