<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("staff");

if($_SERVER['REQUEST_METHOD']==='POST'){
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
        log_action($conn,'Recorded inventory movement','inventory_item',$item,$type.' qty '.$qty);
        flash('success','Stock movement recorded.');
    }
    redirect_to('staff/inventory.php');
}

$title='Inventory Updates';
include "../includes/header.php";
include "../includes/navbar.php";
$items=$conn->query("SELECT * FROM inventory_items ORDER BY item_name");
$summary=$conn->query("SELECT COUNT(*) total_items, COALESCE(SUM(stock_qty),0) total_stock, SUM(status='low_stock') low_stock, SUM(status='out_of_stock') out_stock FROM inventory_items")->fetch_assoc();
?>
<div class="layout"><?php include "../includes/staff_sidebar.php"; ?>
<main class="content">
<section class="hero staff-light-hero admin-hero-banner mb-4"><h1>Inventory Updates</h1><p>Staff page for daily stock-in, stock-out, and low-stock checking. Product setup stays under Admin.</p></section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

<div class="dashboard-metric-grid mb-4">
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">📦</div>
        <div><div class="dashboard-metric-label">Inventory Items</div><div class="dashboard-metric-value"><?= (int)$summary['total_items'] ?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">🏷️</div>
        <div><div class="dashboard-metric-label">Total Stock</div><div class="dashboard-metric-value"><?= (int)$summary['total_stock'] ?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">⚠️</div>
        <div><div class="dashboard-metric-label">Low Stock Items</div><div class="dashboard-metric-value"><?= (int)$summary['low_stock'] ?></div></div>
    </div>
    <div class="dashboard-metric-card">
        <div class="dashboard-metric-icon">🚫</div>
        <div><div class="dashboard-metric-label">Out of Stock</div><div class="dashboard-metric-value"><?= (int)$summary['out_stock'] ?></div></div>
    </div>
</div>

<div class="row g-4">
    <div class="col-lg-4"><div class="soft-card"><h3>Record Stock Movement</h3>
        <form method="POST">
            <label>Item</label>
            <select class="form-select mb-2" name="item_id"><?php $move=$conn->query("SELECT id,item_name FROM inventory_items ORDER BY item_name"); while($i=$move->fetch_assoc()): ?><option value="<?=$i['id']?>"><?=e($i['item_name'])?></option><?php endwhile;?></select>
            <label>Movement</label>
            <select class="form-select mb-2" name="movement_type"><option value="stock_in">Stock In</option><option value="stock_out">Stock Out</option></select>
            <label>Quantity</label>
            <input class="form-control mb-2" name="quantity" type="number" min="1" required>
            <label>Remarks</label>
            <input class="form-control mb-3" name="remarks" placeholder="Example: sold item, restock, used in clinic">
            <button class="btn btn-primary w-100" name="move_stock">Record Movement</button>
        </form>
    </div></div>
    <div class="col-lg-8"><div class="table-card"><h3>Available Products and Supplies</h3><table class="table"><tr><th>Product</th><th>Category</th><th>Stock</th><th>Status</th></tr><?php while($r=$items->fetch_assoc()): ?><tr><td><?=e($r['item_name'])?></td><td><?=e($r['category'])?></td><td><?=e($r['stock_qty'].' '.$r['unit'])?></td><td><?=badge($r['status'])?></td></tr><?php endwhile;?></table></div></div>
</div>
</main></div><?php include "../includes/footer.php"; ?>
