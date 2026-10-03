<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$_SERVER['SCRIPT_NAME'] = '/vetrix/staff/qr.php';
require_once __DIR__ . '/../includes/functions.php';
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QR camera test</title></head>
<body style="margin:24px;font-family:Arial;max-width:620px">
<h1>QR Pet Retrieval</h1>
<?php require __DIR__ . '/../includes/qr_camera.php'; ?>
<form method="post" id="qrTokenForm"><?= csrf_field() ?><label>QR token <input name="token" required></label><button>Retrieve record</button></form>
</body></html>
<?php session_destroy(); ?>
