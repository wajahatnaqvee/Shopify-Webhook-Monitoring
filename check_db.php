<?php
define("LARAVEL_START", microtime(true));
require __DIR__ . "/vendor/autoload.php";
$app = require_once __DIR__ . "/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;
$rows = DB::select("SELECT id, name, LENGTH(password) AS tlen, deleted_at FROM users");
foreach ($rows as $r) { echo "id={$r->id} name={$r->name} tlen={$r->tlen} del={$r->deleted_at}" . PHP_EOL; }
if (empty($rows)) { echo "NO USERS IN TABLE" . PHP_EOL; }
$c1 = DB::select("SELECT COUNT(*) AS c FROM webhook_subscriptions"); echo "subs=" . $c1[0]->c . PHP_EOL;
$c2 = DB::select("SELECT COUNT(*) AS c FROM webhook_events"); echo "events=" . $c2[0]->c . PHP_EOL;
$c3 = DB::select("SELECT COUNT(*) AS c FROM job_logs"); echo "job_logs=" . $c3[0]->c . PHP_EOL;