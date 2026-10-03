<?php
require_once '../config/database.php'; require_once '../includes/functions.php'; require_role('staff');
require_once '../includes/product_orders.php'; ensure_product_order_schema($conn);
$uid = (int) current_user_id();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf_or_fail();
    order_db($conn, "UPDATE notifications SET status='read' WHERE user_id=?", 'i', [$uid]);
    redirect_to('staff/notifications.php');
}
$rows = order_db($conn, 'SELECT n.*,p.order_id FROM notifications n LEFT JOIN product_order_notifications p ON p.notification_id=n.id WHERE n.user_id=? ORDER BY n.id DESC LIMIT 100', 'i', [$uid])->get_result();
$title = 'Staff Notifications'; include '../includes/header.php'; include '../includes/navbar.php';
?>
<div class="layout"><?php include '../includes/staff_sidebar.php'; ?><main class="content"><section class="hero staff-light-hero admin-hero-banner mb-4"><h1>Notifications</h1><p>Mobile product orders, payment proof submissions, and clinic updates.</p><a class="btn btn-primary" href="product_orders.php">Product orders</a> <a class="btn btn-outline-primary" href="appointments.php?status=pending">Pending appointments</a> <a class="btn btn-outline-primary" href="pets.php">Pet requests</a></section>
<form method="POST" class="mb-3"><?= csrf_field() ?><button class="btn btn-light">Mark all as read</button></form>
<?php if (!$rows->num_rows): ?><div class="soft-card">No notifications yet.</div><?php endif; ?>
<?php while ($row = $rows->fetch_assoc()): ?><article class="soft-card mb-3"><h3><?= e($row['title']) ?> <?= badge($row['status']) ?></h3><p><?= e($row['message']) ?></p><small><?= e($row['created_at']) ?></small><?php if ($row['order_id']): ?> · <a href="product_orders.php?id=<?= (int) $row['order_id'] ?>">Open order #<?= (int) $row['order_id'] ?></a><?php endif; ?></article><?php endwhile; ?>
</main></div><?php include '../includes/footer.php'; ?>
