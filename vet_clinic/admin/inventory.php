<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");
ensure_pos_product_schema($conn);

if($_SERVER['REQUEST_METHOD']==='POST'){
    if(isset($_POST['save_item'])){
        $stock=(int)$_POST['stock_qty'];
        $reorder=(int)$_POST['reorder_level'];
        $status = $stock<=0 ? 'out_of_stock' : ($stock <= $reorder ? 'low_stock' : 'available');
        $price=(float)($_POST['sale_price'] ?? 0);
        $sku=trim($_POST['sku'] ?? '');
        $stmt=$conn->prepare("INSERT INTO inventory_items(sku,item_name,category,sale_price,stock_qty,unit,reorder_level,status) VALUES(?,?,?,?,?,?,?,?)");
        $stmt->bind_param("sssdisis",$sku,$_POST['item_name'],$_POST['category'],$price,$stock,$_POST['unit'],$reorder,$status);
        $stmt->execute();
        log_action($conn,'Added inventory item','inventory_item',$conn->insert_id,'Admin created product/stock item.');
        flash('success','Inventory item saved.');
    }
    if(isset($_POST['move_stock'])){
        $qty=(int)$_POST['quantity'];
        $type=$_POST['movement_type'];
        $item=(int)$_POST['item_id'];
        $delta = $type==='stock_in' ? $qty : -$qty;
        $conn->query("UPDATE inventory_items SET stock_qty=GREATEST(0,stock_qty+($delta)) WHERE id=$item");
        $conn->query("UPDATE inventory_items SET status=CASE WHEN stock_qty<=0 THEN 'out_of_stock' WHEN stock_qty<=reorder_level THEN 'low_stock' ELSE 'available' END WHERE id=$item");
        $stmt=$conn->prepare("INSERT INTO inventory_movements(item_id,movement_type,quantity,remarks,created_by) VALUES(?,?,?,?,?)");
        $by=current_user_id();
        $remarks=$_POST['remarks'] ?? '';
        $stmt->bind_param("isisi",$item,$type,$qty,$remarks,$by);
        $stmt->execute();
        log_action($conn,'Admin adjusted inventory movement','inventory_item',$item,$type.' qty '.$qty);
        flash('success','Stock movement recorded.');
    }
    redirect_to('admin/inventory.php');
}

$title='Inventory Management';
include "../includes/header.php";
include "../includes/navbar.php";
$items=$conn->query("SELECT * FROM inventory_items ORDER BY item_name");
$summary=$conn->query("SELECT COUNT(*) total_items, COALESCE(SUM(stock_qty),0) total_stock, SUM(status='low_stock') low_stock, SUM(status='out_of_stock') out_stock FROM inventory_items")->fetch_assoc();
?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?>
<main class="content">
<section class="hero mb-4">
    <div class="hero-text">
        <h1>Inventory Management</h1>
        <p>Live overview of products, supply levels, low-stock alerts, and inventory adjustments for the clinic.</p>
    </div>
</section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

<div class="row mb-4">
    <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon">IT</div><div><div class="text-muted">Items</div><div class="stat-value"><?= (int)$summary['total_items'] ?></div></div></div></div></div>
    <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon">ST</div><div><div class="text-muted">Total Stock</div><div class="stat-value"><?= (int)$summary['total_stock'] ?></div></div></div></div></div>
    <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon status-warn-token">LOW</div><div><div class="text-muted">Low Stock</div><div class="stat-value"><?= (int)$summary['low_stock'] ?></div></div></div></div></div>
    <div class="col-md"><div class="stat-card"><div class="kpi-mini"><div class="kpi-icon status-bad-token">OUT</div><div><div class="text-muted">Out of Stock</div><div class="stat-value"><?= (int)$summary['out_stock'] ?></div></div></div></div></div>
</div>

<div class="row g-4">
    <div class="col-lg-4">
        <div class="soft-card mb-4">
            <h3>Add Product / Supply</h3>
            <p class="text-muted">Create a new inventory item for medicines, clinic supplies, or products sold in the clinic.</p>
            <form method="POST">
                <input class="form-control" name="sku" placeholder="SKU / Code (optional)">
                <input class="form-control" name="item_name" placeholder="Product / item" required>
                <input class="form-control" name="category" placeholder="Category">
                <input class="form-control" name="sale_price" type="number" step="0.01" min="0" placeholder="Selling price for POS" required>
                <input class="form-control" name="stock_qty" type="number" placeholder="Stock level" required>
                <input class="form-control" name="unit" placeholder="Unit">
                <input class="form-control" name="reorder_level" type="number" value="5">
                <button class="btn btn-primary w-100 rounded-pill" name="save_item">Save Product</button>
            </form>
        </div>

        <div class="soft-card">
            <h3>Admin Stock Adjustment</h3>
            <p class="text-muted">Record stock-in and stock-out changes for monitoring and audit purposes.</p>
            <form method="POST">
                <select class="form-select" name="item_id">
                    <?php $move=$conn->query("SELECT id,item_name FROM inventory_items ORDER BY item_name"); while($i=$move->fetch_assoc()): ?>
                        <option value="<?=$i['id']?>"><?=e($i['item_name'])?></option>
                    <?php endwhile;?>
                </select>
                <select class="form-select" name="movement_type">
                    <option value="stock_in">Stock In</option>
                    <option value="stock_out">Stock Out</option>
                </select>
                <input class="form-control" name="quantity" type="number" min="1" placeholder="Quantity" required>
                <input class="form-control" name="remarks" placeholder="Remarks">
                <button class="btn btn-primary w-100 rounded-pill" name="move_stock">Record Adjustment</button>
            </form>
        </div>
    </div>

    <div class="col-lg-8">
        <div class="table-card">
            <div class="section-head mb-3">
                <div>
                    <h3>Products and Stock Levels</h3>
                    <p class="text-muted mb-0">Use this table to monitor available items, reorder levels, and current stock status.</p>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table align-middle">
                    <tr><th>Product</th><th>Category</th><th>POS Price</th><th>Stock</th><th>Reorder Level</th><th>Status</th></tr>
                    <?php if($items->num_rows===0): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4">No inventory items found yet.</td></tr>
                    <?php endif; ?>
                    <?php while($r=$items->fetch_assoc()): ?>
                        <tr>
                            <td><?=e($r['item_name'])?></td>
                            <td><?=e($r['category'])?></td>
                            <td>₱<?=number_format((float)($r['sale_price'] ?? 0),2)?></td>
                            <td><?=e($r['stock_qty'].' '.$r['unit'])?></td>
                            <td><?=e($r['reorder_level'])?></td>
                            <td><?=badge($r['status'])?></td>
                        </tr>
                    <?php endwhile;?>
                </table>
            </div>
        </div>
    </div>
</div>
</main></div><?php include "../includes/footer.php"; ?>
