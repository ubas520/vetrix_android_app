<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$site = realpath((string) getenv('VETRIX_DEPLOY_SITE'));
if (!$site || basename($site) !== 'vetrix') throw new RuntimeException('Expected the active vetrix site path.');
require $site . '/config/database.php';
require __DIR__ . '/../includes/product_orders.php';
foreach (['users','inventory_items','inventory_movements','notifications','audit_logs','pos_transactions','pos_transaction_items','pos_receipts'] as $table) {
    $row = order_db($conn, 'SELECT engine FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?', 's', [$table])->get_result()->fetch_assoc();
    if (!$row || strtolower($row['engine']) !== 'innodb') throw new RuntimeException('Expected transactional table: ' . $table);
}
if ((int) $conn->query('SELECT @@global.max_allowed_packet')->fetch_row()[0] < 8 * 1024 * 1024) {
    // New Apache connections inherit this immediately; no service restart is needed.
    if (!$conn->query('SET GLOBAL max_allowed_packet=8388608')) throw new RuntimeException($conn->error);
}
ensure_product_order_schema($conn);
echo "Additive product-order schema installed. Payment proof packet limit is at least 8 MB.\n";
echo order_payment_options($conn)['gcash']['enabled'] ? "Existing configured GCash recipient preserved.\n" : "Sample GCash recipient retained; pay-at-clinic checkout is available.\n";
