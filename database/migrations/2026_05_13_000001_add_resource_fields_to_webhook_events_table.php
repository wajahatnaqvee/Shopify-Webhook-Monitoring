<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webhook_events', function (Blueprint $table) {
            $table->string('resource_type')->nullable()->after('error_message');
            $table->string('resource_id')->nullable()->after('resource_type');
            $table->string('resource_gid')->nullable()->after('resource_id');
            $table->string('resource_name')->nullable()->after('resource_gid');
            $table->string('resource_identifier')->nullable()->after('resource_name');

            // Index for related-events lookup: same shop + same resource
            $table->index(['shop_domain', 'resource_type', 'resource_id'], 'we_shop_resource_index');
        });
    }

    public function down(): void
    {
        Schema::table('webhook_events', function (Blueprint $table) {
            $table->dropIndex('we_shop_resource_index');
            $table->dropColumn([
                'resource_type',
                'resource_id',
                'resource_gid',
                'resource_name',
                'resource_identifier',
            ]);
        });
    }
};
