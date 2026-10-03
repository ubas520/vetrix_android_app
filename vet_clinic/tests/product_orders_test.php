<?php
// Isolated integration test: creates a randomly named database, never uses clinic data.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../includes/product_orders.php';
$conn = new mysqli(getenv('VETRIX_DB_HOST') ?: 'localhost', getenv('VETRIX_DB_USER') ?: 'root', getenv('VETRIX_DB_PASSWORD') ?: '');
if (($argv[1] ?? '') === '--race-worker') {
    if (!preg_match('/^vetrix_orders_test_[a-f0-9]{10}$/', $argv[2] ?? '')) exit(2);
    $conn->select_db($argv[2]); $conn->set_charset('utf8mb4');
    $input = ['request_key'=>bin2hex(random_bytes(16)), 'payment_method'=>'clinic', 'items'=>[['product_id'=>(int)$argv[4], 'quantity'=>1, 'unit_price_centavos'=>1234]]];
    try { order_create($conn, (int)$argv[3], $input); echo 'created'; }
    catch (ProductOrderError $e) { echo 'rejected:' . $e->getCode(); }
    exit;
}
$db = 'vetrix_orders_test_' . bin2hex(random_bytes(5));
$conn->query("CREATE DATABASE `$db` CHARACTER SET utf8mb4");
$conn->select_db($db); $conn->set_charset('utf8mb4');
$checks = 0;
$keep = in_array('--keep', $argv, true);
function expect($condition, string $label): void { global $checks; if (!$condition) throw new RuntimeException('FAIL: ' . $label); $checks++; }
function rejects(callable $action, int $code, string $label): void {
    try { $action(); } catch (ProductOrderError $e) { expect($e->getCode() === $code, $label . ' status'); return; }
    throw new RuntimeException('FAIL: ' . $label . ' was accepted');
}
function scalar(mysqli $conn, string $sql) { return $conn->query($sql)->fetch_row()[0]; }
function payload(int $qty = 2, string $method = 'clinic', int $price = 12550): array {
    return ['request_key' => bin2hex(random_bytes(16)), 'payment_method' => $method, 'items' => [['product_id'=>1,'quantity'=>$qty,'unit_price_centavos'=>$price]], 'total_amount'=>0.01];
}
try {
    $base = file_get_contents(__DIR__ . '/../database.sql');
    $base = preg_replace('/^CREATE DATABASE[^;]+;\s*USE[^;]+;/', '', $base);
    $conn->multi_query($base);
    do { if ($r = $conn->store_result()) $r->free(); } while ($conn->more_results() && $conn->next_result());
    $modern = in_array('--live-schema', $argv, true);
    if ($modern) {
        $schemaFile = getenv('VETRIX_TEST_SCHEMA');
        if ($schemaFile) {
            // Import schema only from the live backup, then seed synthetic fixture data.
            // Never load INSERT statements or account data from that backup.
            preg_match_all('/CREATE TABLE `[^`]+`[\s\S]*?;/', file_get_contents($schemaFile), $tables);
            if (count($tables[0]) < 10) throw new RuntimeException('Expected a schema dump.');
            $conn->query('SET FOREIGN_KEY_CHECKS=0');
            foreach ($tables[0] as $ddl) {
                preg_match('/CREATE TABLE (`[^`]+`)/', $ddl, $name);
                $conn->query('DROP TABLE IF EXISTS ' . $name[1]);
                $conn->query(preg_replace('/ AUTO_INCREMENT=\d+/', '', $ddl));
            }
            preg_match_all('/INSERT INTO[\s\S]*?;/', $base, $seedInserts);
            foreach ($seedInserts[0] as $insert) $conn->query($insert);
            $conn->query('SET FOREIGN_KEY_CHECKS=1');
        } else {
        $conn->query("ALTER TABLE users ADD failed_login_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0, ADD locked_until DATETIME NULL, ADD deleted_at DATETIME NULL, ADD last_login_at DATETIME NULL");
        $conn->query("ALTER TABLE notifications ADD action_url VARCHAR(255) NULL, ADD created_by INT NULL, ADD updated_at DATETIME NULL");
        $conn->query("ALTER TABLE pos_transactions ADD payment_method ENUM('cash','qr') NOT NULL DEFAULT 'cash'");
        $conn->query("CREATE TABLE pos_receipts(id INT AUTO_INCREMENT PRIMARY KEY,transaction_id INT NOT NULL UNIQUE,receipt_number VARCHAR(40) NOT NULL UNIQUE,generated_by INT NULL,generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,paper_width_mm SMALLINT DEFAULT 80,FOREIGN KEY(transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE) ENGINE=InnoDB");
        }
    }
    $conn->query("UPDATE users SET status='active',otp_verified_at=NOW()");
    order_db($conn, 'UPDATE users SET password=?', 's', [password_hash('OrderTest123!', PASSWORD_DEFAULT)]);
    $conn->query("UPDATE inventory_items SET stock_qty=20,status='available',sale_price=125.50 WHERE id=1");
    ensure_product_order_schema($conn);
    expect(!order_payment_options($conn)['gcash']['enabled'], 'sample GCash is disabled');
    rejects(fn() => order_create($conn,4,payload(1,'gcash')),409,'unconfigured GCash');
    $input = payload(); $order = order_create($conn,4,$input); $id = $order['id'];
    expect($order['total_amount'] === 251.0, 'server price overrides client total');
    expect((int) scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1') === 18, 'stock reserved');
    $noticeCount = (int) scalar($conn,'SELECT COUNT(*) FROM product_order_notifications');
    expect($noticeCount === 2, 'client and staff notified atomically');
    expect(order_create($conn,4,$input)['id'] === $id, 'duplicate checkout returns original order');
    expect((int) scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1') === 18, 'duplicate does not deduct stock');
    expect((int) scalar($conn,'SELECT COUNT(*) FROM product_order_notifications') === $noticeCount, 'duplicate does not notify again');
    $changed = $input; $changed['items'][0]['quantity']=1;
    rejects(fn()=>order_create($conn,4,$changed),409,'same key changed cart');
    rejects(fn()=>order_get($conn,$id,5),404,'another client cannot view');
    rejects(fn()=>order_update($conn,5,$id,'cancel'),404,'another client cannot cancel');
    rejects(fn()=>order_update($conn,4,$id,'verify'),403,'client cannot verify');
    rejects(fn()=>order_create($conn,4,payload(19)),409,'oversell refused');
    rejects(fn()=>order_create($conn,4,payload(1,'clinic',1)),409,'changed price refused');
    foreach ([0,-1,1.5,100] as $qty) { $bad=payload(); $bad['items'][0]['quantity']=$qty; rejects(fn()=>order_create($conn,4,$bad),422,'bad quantity'); }
    $bad=payload(); $bad['items'][]=$bad['items'][0]; rejects(fn()=>order_create($conn,4,$bad),422,'duplicate product');
    $before=(int)scalar($conn,'SELECT COUNT(*) FROM product_orders');
    expect($before===1,'failed orders roll back');
    order_update($conn,4,$id,'cancel');
    expect((int) scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1')===20,'cancellation restores stock');
    rejects(fn()=>order_update($conn,4,$id,'cancel'),409,'double cancellation refused');
    $cash=order_create($conn,4,payload(2)); $cashId=$cash['id'];
    order_update($conn,3,$cashId,'ready',[],true);
    rejects(fn()=>order_update($conn,3,$cashId,'complete',['cash_received'=>100,'confirmed'=>'yes'],true),422,'underpayment refused');
    $sale=order_update($conn,3,$cashId,'complete',['cash_received'=>300,'confirmed'=>'yes'],true);
    expect($sale['status']==='completed' && $sale['payment_status']==='paid','cash collection completes paid order');
    expect((int)scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1')===18,'payment does not deduct twice');
    expect((int)scalar($conn,'SELECT COUNT(*) FROM pos_transaction_items WHERE transaction_id='.(int)$sale['transaction_id'])===1,'POS line items recorded');
    rejects(fn()=>order_update($conn,3,$cashId,'complete',['cash_received'=>300,'confirmed'=>'yes'],true),409,'double collection refused');
    // Dummy test recipient in this disposable database only; never used to transfer money.
    $conn->query("INSERT INTO product_payment_settings VALUES(1,'TEST ONLY - NO TRANSFERS','09000000000',3,NOW())");
    $gcash=order_create($conn,4,payload(1,'gcash')); $gid=$gcash['id'];
    $conn->query("UPDATE product_payment_settings SET gcash_name='Changed test account'");
    expect(order_get($conn,$gid)['gcash_name']==='TEST ONLY - NO TRANSFERS','recipient is fixed per order');
    rejects(fn()=>order_update($conn,3,$gid,'ready',[],true),409,'unpaid GCash cannot be ready');
    $image=base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6B9kAAAAASUVORK5CYII=');
    $review=order_save_proof($conn,4,$gid,'1234567890123',$image,'image/png');
    expect($review['payment_status']==='under_review','proof does not mark paid');
    $proofId=(int)$review['proof']['id'];
    expect(order_save_proof($conn,4,$gid,'1234567890123',$image,'image/png')['proof']['id']===$review['proof']['id'],'proof retry idempotent');
    rejects(fn()=>order_update($conn,4,$gid,'cancel'),409,'cannot cancel during verification');
    rejects(fn()=>order_update($conn,3,$gid,'verify',['proof_id'=>$proofId],true),422,'verification requires confirmation');
    rejects(fn()=>order_update($conn,3,$gid,'reject',['proof_id'=>$proofId],true),422,'rejection requires reason');
    order_update($conn,3,$gid,'reject',['proof_id'=>$proofId,'note'=>'Reference not visible'],true);
    $corrected=order_save_proof($conn,4,$gid,'1234567890123',$image.'updated screenshot','image/png');
    expect((int)$corrected['proof']['id']!==$proofId,'corrected proof keeps history and same reference');
    rejects(fn()=>order_update($conn,3,$gid,'verify',['proof_id'=>$proofId,'confirmed'=>'yes'],true),409,'stale proof review refused');
    $paid=order_update($conn,3,$gid,'verify',['proof_id'=>(int)$corrected['proof']['id'],'confirmed'=>'yes'],true);
    expect($paid['payment_status']==='paid' && $paid['transaction_id']!==null,'verified GCash records POS payment');
    rejects(fn()=>order_update($conn,3,$gid,'cancel',[],true),409,'paid order cannot cancel without refund flow');
    $other=order_create($conn,5,payload(1,'gcash'));
    rejects(fn()=>order_save_proof($conn,5,$other['id'],'1234567890123',$image.'other','image/png'),409,'reference cannot fund two orders');
    order_update($conn,3,$gid,'ready',[],true); order_update($conn,3,$gid,'complete',[],true);
    expect((int)scalar($conn,"SELECT COUNT(*) FROM pos_transactions WHERE notes LIKE 'Product order #$gid /%'")===1,'exactly one POS payment for GCash');
    order_update($conn,5,$other['id'],'cancel');
    if ($modern) {
        expect(scalar($conn,"SELECT action_url FROM notifications WHERE user_id=3 AND title='New product order #$gid'") === 'staff/product_orders.php?order_id=' . $gid, 'staff bell links to exact order');
        expect(scalar($conn,'SELECT payment_method FROM pos_transactions WHERE id='.(int)$paid['transaction_id']) === 'qr', 'GCash uses electronic receipt method');
        expect(scalar($conn,'SELECT payment_method FROM pos_transactions WHERE id='.(int)$sale['transaction_id']) === 'cash', 'clinic pickup uses cash receipt method');
        expect(str_contains(scalar($conn,'SELECT notes FROM pos_transactions WHERE id='.(int)$sale['transaction_id']), 'Change: ₱49.00'), 'cash change saved for receipt');
        expect((int)scalar($conn,'SELECT COUNT(*) FROM pos_receipts') === 2, 'both mobile payment methods generate receipts');
        require_once __DIR__ . '/../includes/product_order_pos_checkout.php';
        $stockBefore = (int)scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1');
        $posInput = ['item_id'=>[1],'quantity'=>[$stockBefore+1],'payment_method'=>'cash','payment_status'=>'paid','cash_received'=>10000];
        rejects(fn()=>product_order_pos_checkout($conn,3,$posInput),409,'POS respects reserved mobile stock');
        $posInput['quantity']=[1]; $posSale=product_order_pos_checkout($conn,3,$posInput);
        expect((int)scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1') === $stockBefore-1, 'counter sale deducts available stock once');
        expect((int)scalar($conn,'SELECT COUNT(*) FROM pos_receipts WHERE transaction_id='.$posSale['id']) === 1, 'counter sale preserves receipt');
        $posInput['payment_status']='cancelled'; product_order_pos_checkout($conn,3,$posInput);
        expect((int)scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=1') === $stockBefore-1, 'cancelled counter sale does not consume stock');
    }
    // Keep a proof awaiting review for optional browser checks.
    $demo=order_create($conn,4,payload(1,'gcash'));
    order_save_proof($conn,4,$demo['id'],'9999999999999',$image,'image/png');
    // Two separate PHP workers compete for the final unit in real InnoDB transactions.
    $conn->query("INSERT INTO inventory_items(item_name,sale_price,stock_qty,status) VALUES('Concurrency test product',12.34,1,'available')");
    $raceItem = $conn->insert_id;
    $conn->begin_transaction();
    order_db($conn, 'SELECT id FROM inventory_items WHERE id=? FOR UPDATE', 'i', [$raceItem]);
    $workers = [];
    foreach ([4,5] as $actor) {
        $process = proc_open([PHP_BINARY, __FILE__, '--race-worker', $db, (string)$actor, (string)$raceItem], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes, null, null, ['bypass_shell'=>true,'create_no_window'=>true]);
        if (!is_resource($process)) throw new RuntimeException('Could not start concurrency worker');
        fclose($pipes[0]); $workers[] = [$process,$pipes];
    }
    usleep(200000); $conn->commit();
    $outcomes=[];
    foreach ($workers as [$process,$pipes]) {
        $outcomes[]=stream_get_contents($pipes[1]);
        $errors=stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        expect(proc_close($process)===0 && $errors==='', 'concurrent worker completed');
    }
    sort($outcomes);
    expect($outcomes===['created','rejected:409'], 'only one concurrent client buys the last unit');
    expect((int)scalar($conn,'SELECT stock_qty FROM inventory_items WHERE id=' . $raceItem)===0, 'concurrent stock never negative');
    require __DIR__ . '/payment_accounts_cases.php';
    echo "PASS: $checks product-order integration checks.\n";
    if ($keep) echo json_encode(['database'=>$db,'client_email'=>'client@vetclinic.test','staff_email'=>'staff@vetclinic.test','password'=>'OrderTest123!','demo_order'=>$demo['id']]) . "\n";
} finally {
    if (!$keep) $conn->query("DROP DATABASE `$db`");
    $conn->close();
}
