// Builds a minimal deployment against a snapshot of the active XAMPP site.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = path.resolve(__dirname, '..');
const stage = path.resolve(source, '../.tmp/xampp-purchase-deploy');
const baseline = path.join(stage, 'site-before');
const payload = path.join(stage, 'payload');
const manifest = [];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function write(file, value) {
    const original = path.join(baseline, file);
    const target = path.join(payload, file);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.writeFileSync(target, value);
    manifest.push({path:file, before:fs.existsSync(original) ? hash(fs.readFileSync(original)) : null, after:hash(value)});
}
function patch(file, transform) {
    const original = fs.readFileSync(path.join(baseline, file), 'utf8');
    const result = transform(original);
    if (result === original) throw new Error('No patch applied: ' + file);
    write(file, result);
}
function replace(text, before, after) {
    if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) throw new Error('Expected exactly one patch anchor: ' + before.slice(0,80));
    return text.replace(before, after);
}
for (const file of ['includes/product_orders.php','includes/product_order_pos_checkout.php','migrations/product_orders.sql','config/payments.php','config/payments.local.example.php','api/mobile/v1/orders.php','staff/order_proof.php','staff/order_updates.php','assets/js/product-order-notifications.js','assets/css/product-orders.css']) {
    write(file, fs.readFileSync(path.join(source, file)));
}
for (const file of ['staff/product_orders.php','staff/payment_settings.php']) {
    let text = fs.readFileSync(path.join(source,file),'utf8');
    text = replace(text, '<main class="content">', '<main class="content product-orders-page" id="mainContent">');
    text = text.replaceAll('hero staff-light-hero admin-hero-banner mb-4','page-heading product-orders-heading');
    text = text.replaceAll('soft-card','surface-card');
    text = replace(text, '<div class="layout">', '<link rel="stylesheet" href="<?= e(app_url(\'assets/css/product-orders.css\')) ?>?v=<?= filemtime(__DIR__ . \'/../assets/css/product-orders.css\') ?>">\n<div class="layout">');
    write(file, text);
}
patch('api/mobile/v1/bootstrap.php', text => {
    text = replace(text, '$products = [];', "require_once __DIR__ . '/../../../includes/product_orders.php';\nensure_product_order_schema($conn);\n$products = [];");
    return replace(text, "    'products' => $products,", "    'products' => $products,\n    'orders' => order_list($conn, $userId),\n    'payment_options' => order_payment_options($conn),");
});
for (const file of ['includes/functions.php','assets/js/app.js']) {
    patch(file, text => replace(text, "'edit_request_id','notification_id','token'", "'edit_request_id','notification_id','order_id','token'"));
}
patch('includes/staff_sidebar.php', text => replace(text,
    "        ['cart', 'Point of Sale', 'staff/pos.php', '/staff/pos.php'],",
    "        ['package', 'Product Orders', 'staff/product_orders.php', '/staff/product_orders.php'],\n        ['cart', 'Point of Sale', 'staff/pos.php', '/staff/pos.php'],\n        ['coins', 'GCash Settings', 'staff/payment_settings.php', '/staff/payment_settings.php'],"));
patch('includes/footer.php', text => replace(text, '</body>', "<?php if (($_SESSION['role'] ?? '') === 'staff'): ?><script src=\"<?= e(app_url('assets/js/product-order-notifications.js')) ?>?v=<?= filemtime(__DIR__ . '/../assets/js/product-order-notifications.js') ?>\"></script><?php endif; ?>\n</body>"));
patch('staff/pos.php', text => {
    const start = text.indexOf("if($_SERVER['REQUEST_METHOD']==='POST')");
    const end = text.indexOf("$title='Point of Sale';", start);
    if (start < 0 || end < start) throw new Error('POS handler anchors changed');
    const handler = `require_once '../includes/product_order_pos_checkout.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf_or_fail();
    try {
        if (($_POST['payment_method'] ?? '') === 'qr' && !clinic_payment_qr_path()) throw new ProductOrderError('QR payment is not configured yet. Ask an administrator to upload the clinic payment QR.', 422);
        $sale = product_order_pos_checkout($conn, (int) current_user_id(), $_POST);
        flash('success', $sale['status'] === 'cancelled' ? 'Cancelled sale recorded. Stock was not deducted.' : 'POS sale saved. Available stock was updated.');
        if ($sale['status'] === 'paid') redirect_to('staff/receipt.php?transaction_id=' . $sale['id'] . '&from=pos');
    } catch (ProductOrderError $e) { flash('error', $e->getMessage()); }
    catch (Throwable $e) { error_log($e->getMessage()); flash('error', 'The sale could not be saved. Refresh and try again.'); }
    redirect_to('staff/pos.php');
}

`;
    return text.slice(0, start) + handler + text.slice(end);
});
fs.writeFileSync(path.join(stage,'deployment-manifest.json'), JSON.stringify(manifest,null,2));
const preview = path.join(stage, 'preview');
fs.cpSync(baseline, preview, {recursive:true});
for (const file of manifest) fs.copyFileSync(path.join(payload,file.path), (()=>{const dest=path.join(preview,file.path);fs.mkdirSync(path.dirname(dest),{recursive:true});return dest;})());
console.log(`Built ${manifest.length} deployment files; ${manifest.filter(f=>f.before).length} existing files changed. Preview uses the current website layout.`);
