<?php
require_once __DIR__.'/libs/phpqrcode/qrlib.php';
$id = intval($_GET['producto_id'] ?? 0);
if (!$id) {
    http_response_code(400);
    echo 'producto_id requerido';
    exit;
}
header('Content-Type: image/png');
QRcode::png((string)$id, false, QR_ECLEVEL_L, 4, 2);

