<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("staff");
ensure_pos_product_schema($conn);

require_once '../includes/product_orders.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf_or_fail();
    $conn->begin_transaction();
    try {
        $handled = (int) current_user_id();
        $client = ($_POST['client_id'] ?? '') !== '' ? (int) $_POST['client_id'] : null;
        $status = $_POST['payment_status'] ?? 'paid';
        if (!in_array($status, ['paid','pending','cancelled'], true)) throw new ProductOrderError('Invalid payment status.');
        $quantities = [];
        foreach (($_POST['item_id'] ?? []) as $index => $item) {
            $id = filter_var($item, FILTER_VALIDATE_INT);
            $qty = filter_var($_POST['quantity'][$index] ?? null, FILTER_VALIDATE_INT);
            if ($id < 1 || $qty < 1 || $qty > 999) throw new ProductOrderError('Invalid product quantity.');
            $quantities[$id] = ($quantities[$id] ?? 0) + $qty;
        }
        if (!$quantities) throw new ProductOrderError('Choose at least one product.');
        ksort($quantities, SORT_NUMERIC);
        $cart = []; $totalCentavos = 0;
        foreach ($quantities as $id => $qty) {
            $item = order_db($conn, 'SELECT * FROM inventory_items WHERE id=? FOR UPDATE', 'i', [$id])->get_result()->fetch_assoc();
            if (!$item || !in_array($item['status'], ['available','low_stock'], true) || $item['stock_qty'] < $qty) throw new ProductOrderError('Stock changed or was reserved by a mobile order. Refresh and review your cart.');
            $price = (int) round((float) $item['sale_price'] * 100);
            $totalCentavos += $price * $qty;
            $cart[] = [$id, $item['item_name'], $price / 100, $qty, $price * $qty / 100];
        }
        $total = $totalCentavos / 100;
        $notes = trim((string) ($_POST['notes'] ?? ''));
        $cash = (float) ($_POST['cash_received'] ?? 0);
        if ($cash > 0) {
            if ($status === 'paid' && $cash < $total) throw new ProductOrderError('Cash received is less than the sale total.');
            $notes .= '\nCash received: PHP ' . number_format($cash,2) . ' | Change: PHP ' . number_format(max(0,$cash-$total),2);
        }
        order_db($conn, 'INSERT INTO pos_transactions(client_id,handled_by,total_amount,payment_status,notes) VALUES(?,?,?,?,?)', 'iidss', [$client, $handled, $total, $status, $notes]);
        $transactionId = $conn->insert_id;
        foreach ($cart as $line) {
            order_db($conn, 'INSERT INTO pos_transaction_items(transaction_id,item_id,item_name,unit_price,quantity,line_total) VALUES(?,?,?,?,?,?)', 'iisdid', [$transactionId, ...$line]);
            if ($status !== 'cancelled') order_stock($conn, $line[0], $line[3], false, $handled, 'POS sale transaction #' . $transactionId);
        }
        log_action($conn, 'Processed POS product sale', 'pos_transaction', $transactionId, 'Amount: ' . $total);
        $conn->commit();
        flash('success', $status === 'cancelled' ? 'Cancelled sale recorded. Stock was unchanged.' : 'POS sale saved. Stock was deducted automatically.');
    } catch (Throwable $e) {
        $conn->rollback();
        if (!($e instanceof ProductOrderError)) error_log($e->getMessage());
        flash('error', $e instanceof ProductOrderError ? $e->getMessage() : 'The sale could not be saved. Refresh and try again.');
    }
    redirect_to('staff/pos.php');
}
$title='POS Cashier';
include "../includes/header.php";
include "../includes/navbar.php";
$rows=$conn->query("SELECT t.*,c.full_name client_name,h.full_name handled_by_name FROM pos_transactions t LEFT JOIN users c ON t.client_id=c.id LEFT JOIN users h ON t.handled_by=h.id ORDER BY t.transaction_date DESC LIMIT 20");
$products=$conn->query("SELECT * FROM inventory_items WHERE status!='inactive' ORDER BY category,item_name");
$categories=$conn->query("SELECT DISTINCT category FROM inventory_items WHERE status!='inactive' AND category IS NOT NULL AND category<>'' ORDER BY category");
?>
<div class="layout"><?php include "../includes/staff_sidebar.php"; ?>
<main class="content">
<section class="hero staff-light-hero admin-hero-banner mb-4"><h1>POS Cashier</h1><p>Click bought products to add them to the cart. Prices are controlled by Admin, so staff does not need to manually type amounts.</p></section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-warning"><?=e($m)?></div><?php endif;?>

<form method="POST" id="posSaleForm"><?= csrf_field() ?>
<div class="pos-cashier-layout">
    <section class="soft-card pos-products-panel">
        <div class="section-head mb-3">
            <div><h3>Product Menu</h3><p class="text-muted mb-0">Search or filter, then click a product card to add it to cart.</p></div>
        </div>
        <div class="pos-toolbar mb-3">
            <input class="form-control" id="posProductSearch" type="search" placeholder="Search product name or category...">
            <select class="form-select" id="posCategoryFilter">
                <option value="all">All categories</option>
                <?php while($cat=$categories->fetch_assoc()): ?><option value="<?=e(strtolower($cat['category']))?>"><?=e($cat['category'])?></option><?php endwhile;?>
            </select>
        </div>
        <div class="pos-product-grid" id="posProductGrid">
            <?php if($products->num_rows===0): ?>
                <div class="empty-state">No active POS products yet. Ask admin to add products in Admin → POS Products.</div>
            <?php endif; ?>
            <?php while($p=$products->fetch_assoc()): $disabled=(int)$p['stock_qty']<=0; ?>
                <button type="button" class="pos-product-card <?=$disabled?'is-disabled':''?>" data-id="<?=$p['id']?>" data-name="<?=e($p['item_name'])?>" data-category="<?=e(strtolower($p['category'] ?: 'uncategorized'))?>" data-price="<?=e($p['sale_price'])?>" data-stock="<?=e($p['stock_qty'])?>" <?=$disabled?'disabled':''?>>
                    <span class="pos-product-icon">📦</span>
                    <span class="pos-product-name"><?=e($p['item_name'])?></span>
                    <span class="pos-product-meta"><?=e($p['category'] ?: 'Uncategorized')?> • Stock: <?=e($p['stock_qty'].' '.($p['unit'] ?: 'pcs'))?></span>
                    <strong>₱<?=number_format((float)$p['sale_price'],2)?></strong>
                    <small><?=$disabled?'Out of stock':'Click to add'?></small>
                </button>
            <?php endwhile;?>
        </div>
    </section>

    <aside class="soft-card pos-cart-panel">
        <h3>Cart Summary</h3>
        <label>Client</label>
        <select class="form-select mb-3" name="client_id"><option value="">Walk-in / No linked client</option><?php $clients=$conn->query("SELECT id,full_name FROM users WHERE role='client' ORDER BY full_name"); while($c=$clients->fetch_assoc()): ?><option value="<?=$c['id']?>"><?=e($c['full_name'])?></option><?php endwhile;?></select>
        <div id="posCartItems" class="pos-cart-items"><div class="text-muted py-3">No products selected yet.</div></div>
        <div id="posHiddenInputs"></div>
        <div class="pos-cart-total"><span>Total</span><strong id="posTotal">₱0.00</strong></div>
        <label>Cash Received</label>
        <input class="form-control mb-2" id="cashReceived" name="cash_received" type="number" min="0" step="0.01" placeholder="Optional">
        <div class="pos-change-row"><span>Change</span><b id="posChange">₱0.00</b></div>
        <label>Payment Status</label>
        <select class="form-select mb-2" name="payment_status"><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select>
        <label>Notes</label>
        <textarea class="form-control mb-3" name="notes" placeholder="Optional receipt note"></textarea>
        <button class="btn btn-primary w-100 rounded-pill" id="saveSaleBtn" disabled>Save Sale</button>
    </aside>
</div>
</form>

<div class="table-card pos-records-card mt-4"><h3>Recent Payment Records</h3><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Date</th><th>Client</th><th>Amount</th><th>Status</th><th>Handled By</th></tr></thead><tbody><?php while($r=$rows->fetch_assoc()): ?><tr><td><?=e($r['transaction_date'])?></td><td><?=e($r['client_name'] ?: 'Walk-in')?></td><td>₱<?=number_format((float)$r['total_amount'],2)?></td><td><?=badge($r['payment_status'])?></td><td><?=e($r['handled_by_name'])?></td></tr><?php endwhile;?></tbody></table></div></div>
</main></div>
<script>
(function(){
    const cart = new Map();
    const cards = document.querySelectorAll('.pos-product-card');
    const cartItems = document.getElementById('posCartItems');
    const hidden = document.getElementById('posHiddenInputs');
    const totalEl = document.getElementById('posTotal');
    const changeEl = document.getElementById('posChange');
    const cashInput = document.getElementById('cashReceived');
    const saveBtn = document.getElementById('saveSaleBtn');
    const search = document.getElementById('posProductSearch');
    const filter = document.getElementById('posCategoryFilter');
    const peso = new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'});

    function renderCart(){
        let total = 0;
        cartItems.innerHTML = '';
        hidden.innerHTML = '';
        if(cart.size === 0){
            cartItems.innerHTML = '<div class="text-muted py-3">No products selected yet.</div>';
            saveBtn.disabled = true;
        } else {
            saveBtn.disabled = false;
        }
        cart.forEach(item => {
            total += item.price * item.qty;
            const row = document.createElement('div');
            row.className = 'pos-cart-item';
            row.innerHTML = `<div><b>${item.name}</b><small>${peso.format(item.price)} each</small></div><div class="pos-qty-controls"><button type="button" data-act="minus" data-id="${item.id}">−</button><span>${item.qty}</span><button type="button" data-act="plus" data-id="${item.id}">+</button></div><strong>${peso.format(item.price * item.qty)}</strong>`;
            cartItems.appendChild(row);
            hidden.insertAdjacentHTML('beforeend', `<input type="hidden" name="item_id[]" value="${item.id}"><input type="hidden" name="quantity[]" value="${item.qty}">`);
        });
        totalEl.textContent = peso.format(total);
        const cash = parseFloat(cashInput.value || '0');
        changeEl.textContent = peso.format(Math.max(0, cash - total));
    }

    cards.forEach(card => card.addEventListener('click', () => {
        const id = card.dataset.id;
        const stock = parseInt(card.dataset.stock || '0',10);
        if(stock <= 0) return;
        const current = cart.get(id) || {id, name: card.dataset.name, price: parseFloat(card.dataset.price || '0'), qty:0, stock};
        if(current.qty < stock) current.qty++;
        cart.set(id,current);
        renderCart();
    }));

    cartItems.addEventListener('click', e => {
        const btn = e.target.closest('button[data-act]');
        if(!btn) return;
        const item = cart.get(btn.dataset.id);
        if(!item) return;
        if(btn.dataset.act === 'plus' && item.qty < item.stock) item.qty++;
        if(btn.dataset.act === 'minus') item.qty--;
        if(item.qty <= 0) cart.delete(item.id); else cart.set(item.id,item);
        renderCart();
    });

    function applyFilter(){
        const q = (search.value || '').toLowerCase();
        const c = filter.value;
        cards.forEach(card => {
            const matchesText = (card.dataset.name + ' ' + card.dataset.category).toLowerCase().includes(q);
            const matchesCat = c === 'all' || card.dataset.category === c;
            card.style.display = matchesText && matchesCat ? '' : 'none';
        });
    }
    search.addEventListener('input', applyFilter);
    filter.addEventListener('change', applyFilter);
    cashInput.addEventListener('input', renderCart);
    renderCart();
})();
</script>
<?php include "../includes/footer.php"; ?>
