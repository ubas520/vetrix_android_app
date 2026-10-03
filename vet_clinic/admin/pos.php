<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");
ensure_pos_product_schema($conn);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['save_product'])) {
        $id = (int)($_POST['item_id'] ?? 0);
        $sku = trim($_POST['sku'] ?? '');
        $name = trim($_POST['item_name'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $price = (float)($_POST['sale_price'] ?? 0);
        $stock = max(0, (int)($_POST['stock_qty'] ?? 0));
        $unit = trim($_POST['unit'] ?? 'pcs');
        $reorder = max(0, (int)($_POST['reorder_level'] ?? 5));
        $status = $_POST['status'] ?? ($stock <= 0 ? 'out_of_stock' : ($stock <= $reorder ? 'low_stock' : 'available'));
        if ($status !== 'inactive') {
            $status = $stock <= 0 ? 'out_of_stock' : ($stock <= $reorder ? 'low_stock' : 'available');
        }

        if ($id > 0) {
            $stmt = $conn->prepare("UPDATE inventory_items SET sku=?, item_name=?, category=?, sale_price=?, stock_qty=?, unit=?, reorder_level=?, status=? WHERE id=?");
            $stmt->bind_param("sssdisisi", $sku, $name, $category, $price, $stock, $unit, $reorder, $status, $id);
            $stmt->execute();
            log_action($conn, 'Updated POS product', 'inventory_item', $id, 'Admin updated product price/stock for POS.');
            flash('success', 'POS product updated.');
        } else {
            $stmt = $conn->prepare("INSERT INTO inventory_items(sku,item_name,category,sale_price,stock_qty,unit,reorder_level,status) VALUES(?,?,?,?,?,?,?,?)");
            $stmt->bind_param("sssdisis", $sku, $name, $category, $price, $stock, $unit, $reorder, $status);
            $stmt->execute();
            log_action($conn, 'Added POS product', 'inventory_item', $conn->insert_id, 'Admin created product with POS price.');
            flash('success', 'POS product added.');
        }
        redirect_to('admin/pos.php');
    }

    if (isset($_POST['toggle_product'])) {
        $id = (int)$_POST['item_id'];
        $newStatus = $_POST['new_status'] === 'inactive' ? 'inactive' : 'available';
        $stmt = $conn->prepare("UPDATE inventory_items SET status=? WHERE id=?");
        $stmt->bind_param("si", $newStatus, $id);
        $stmt->execute();
        flash('success', $newStatus === 'inactive' ? 'Product archived from POS.' : 'Product restored to POS.');
        redirect_to('admin/pos.php');
    }
}

$title = 'POS Products and Reports';
include "../includes/header.php";
include "../includes/navbar.php";

$summary = $conn->query("SELECT
    COUNT(*) total_transactions,
    COALESCE(SUM(total_amount),0) total_sales,
    COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) paid_sales,
    COALESCE(SUM(CASE WHEN payment_status='pending' THEN total_amount ELSE 0 END),0) pending_sales
    FROM pos_transactions")->fetch_assoc();

$productSummary = $conn->query("SELECT COUNT(*) products, SUM(status!='inactive') active_products, SUM(status='low_stock') low_stock, SUM(status='out_of_stock') out_stock FROM inventory_items")->fetch_assoc();
$products = $conn->query("SELECT * FROM inventory_items ORDER BY status='inactive', item_name");
$rows = $conn->query("SELECT t.*, c.full_name client_name, h.full_name handled_by_name
    FROM pos_transactions t
    LEFT JOIN users c ON t.client_id=c.id
    LEFT JOIN users h ON t.handled_by=h.id
    ORDER BY t.transaction_date DESC, t.id DESC LIMIT 15");
?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
    <section class="hero mb-4">
        <div class="hero-text">
            <h1>POS Products and Reports</h1>
            <p>Admin manages product names, prices, stocks, and availability. Staff will only click products during checkout for faster cashier transactions.</p>
        </div>
    </section>

    <?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

    <div class="dashboard-metric-grid mb-4">
        <div class="dashboard-metric-card"><div class="dashboard-metric-icon">POS</div><div><div class="dashboard-metric-label">POS Products</div><div class="dashboard-metric-value"><?= (int)$productSummary['products'] ?></div></div></div>
        <div class="dashboard-metric-card"><div class="dashboard-metric-icon status-ok-token">ON</div><div><div class="dashboard-metric-label">Active Products</div><div class="dashboard-metric-value"><?= (int)$productSummary['active_products'] ?></div></div></div>
        <div class="dashboard-metric-card"><div class="dashboard-metric-icon">PHP</div><div><div class="dashboard-metric-label">Total Sales</div><div class="dashboard-metric-value">&#8369;<?= number_format((float)$summary['total_sales'],0) ?></div></div></div>
        <div class="dashboard-metric-card"><div class="dashboard-metric-icon">TXN</div><div><div class="dashboard-metric-label">Transactions</div><div class="dashboard-metric-value"><?= (int)$summary['total_transactions'] ?></div></div></div>
    </div>

    <div class="row g-4 mb-4">
        <div class="col-lg-4">
            <div class="soft-card pos-admin-product-card">
                <h3>Add POS Product</h3>
                <p class="text-muted">Products added here will appear as clickable cards in the Staff POS cashier screen.</p>
                <form method="POST" class="pos-product-form">
                    <input class="form-control" name="sku" placeholder="SKU / Code (optional)">
                    <input class="form-control" name="item_name" placeholder="Product name" required>
                    <input class="form-control" name="category" placeholder="Category, e.g. Medicine, Vaccine, Supply">
                    <input class="form-control" name="sale_price" type="number" step="0.01" min="0" placeholder="Selling price" required>
                    <input class="form-control" name="stock_qty" type="number" min="0" placeholder="Stock quantity" required>
                    <input class="form-control" name="unit" placeholder="Unit, e.g. pcs, bottle, dose" value="pcs">
                    <input class="form-control" name="reorder_level" type="number" min="0" value="5">
                    <button class="btn btn-primary w-100 rounded-pill" name="save_product">Save POS Product</button>
                </form>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="table-card">
                <div class="section-head mb-3"><div><h3>Product Price List</h3><p class="text-muted mb-0">Edit price/stock here so staff does not manually type product prices.</p></div></div>
                <div class="table-responsive">
                    <table class="table align-middle pos-product-table">
                        <tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Quick Edit</th><th></th></tr>
                        <?php if($products->num_rows===0): ?><tr><td colspan="6" class="text-center text-muted py-4">No POS products found yet.</td></tr><?php endif; ?>
                        <?php while($p=$products->fetch_assoc()): ?>
                        <tr>
                            <td><b><?=e($p['item_name'])?></b><br><small class="text-muted"><?=e(($p['sku'] ? $p['sku'].' • ' : '').($p['category'] ?: 'Uncategorized'))?></small></td>
                            <td>₱<?=number_format((float)$p['sale_price'],2)?></td>
                            <td><?=e($p['stock_qty'].' '.($p['unit'] ?: 'pcs'))?></td>
                            <td><?=badge($p['status'])?></td>
                            <td>
                                <form method="POST" class="pos-inline-edit">
                                    <input type="hidden" name="item_id" value="<?=$p['id']?>">
                                    <input type="hidden" name="sku" value="<?=e($p['sku'])?>">
                                    <input type="hidden" name="item_name" value="<?=e($p['item_name'])?>">
                                    <input type="hidden" name="category" value="<?=e($p['category'])?>">
                                    <input type="hidden" name="unit" value="<?=e($p['unit'])?>">
                                    <input type="hidden" name="reorder_level" value="<?=e($p['reorder_level'])?>">
                                    <input type="hidden" name="status" value="<?=e($p['status'])?>">
                                    <input class="form-control form-control-sm" name="sale_price" type="number" step="0.01" min="0" value="<?=e($p['sale_price'])?>">
                                    <input class="form-control form-control-sm" name="stock_qty" type="number" min="0" value="<?=e($p['stock_qty'])?>">
                                    <button class="btn btn-sm btn-primary rounded-pill" name="save_product">Update</button>
                                </form>
                            </td>
                            <td>
                                <form method="POST">
                                    <input type="hidden" name="item_id" value="<?=$p['id']?>">
                                    <input type="hidden" name="new_status" value="<?=$p['status']==='inactive'?'available':'inactive'?>">
                                    <button class="btn btn-sm btn-light rounded-pill" name="toggle_product"><?=$p['status']==='inactive'?'Restore':'Archive'?></button>
                                </form>
                            </td>
                        </tr>
                        <?php endwhile;?>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div class="table-card">
        <div class="section-head mb-3">
            <div><h3>Recent POS Transactions</h3><p class="text-muted mb-0">Review cashier sales recorded by the Staff side.</p></div>
            <a class="btn btn-light rounded-pill" href="reports.php">Open Full Reports</a>
        </div>
        <div class="table-responsive">
            <table class="table align-middle">
                <tr><th>Date</th><th>Client</th><th>Amount</th><th>Status</th><th>Handled By</th><th>Notes</th></tr>
                <?php if($rows->num_rows===0): ?><tr><td colspan="6" class="text-center text-muted py-4">No POS transactions found yet.</td></tr><?php endif; ?>
                <?php while($r=$rows->fetch_assoc()): ?>
                <tr>
                    <td><?=e(date('M d, Y', strtotime($r['transaction_date'])))?></td>
                    <td><?=e($r['client_name'] ?: 'Walk-in')?></td>
                    <td>₱<?=number_format((float)$r['total_amount'],2)?></td>
                    <td><?=badge($r['payment_status'])?></td>
                    <td><?=e($r['handled_by_name'] ?: 'Staff')?></td>
                    <td><?=e($r['notes'] ?: '-')?></td>
                </tr>
                <?php endwhile;?>
            </table>
        </div>
    </div>
</main></div>
<?php include "../includes/footer.php"; ?>
