<?php
if (!function_exists('staff_side_active')) {
    function staff_side_active($needle) {
        return strpos(str_replace('\\', '/', $_SERVER['SCRIPT_NAME']), $needle) !== false ? 'active' : '';
    }
}

$staffSections = [
    'Front Desk' => [
        ['01', 'Dashboard', 'staff/dashboard.php', '/staff/dashboard.php'],
        ['02', 'Appointments', 'staff/appointments.php', '/staff/appointments.php'],
        ['03', 'Client Assistance', 'staff/clients.php', '/staff/clients.php'],
    ],
    'Clinic Flow' => [
        ['04', 'Pet Encoding', 'staff/pets.php', '/staff/pets.php'],
        ['05', 'POS Cashier', 'staff/pos.php', '/staff/pos.php'],
        ['06', 'Product Orders', 'staff/product_orders.php', '/staff/product_orders.php'],
        ['07', 'Notifications', 'staff/notifications.php', '/staff/notifications.php'],
        ['08', 'Payment Settings', 'staff/payment_settings.php', '/staff/payment_settings.php'],
        ['09', 'Inventory Updates', 'staff/inventory.php', '/staff/inventory.php'],
        ['10', 'QR Scan Access', 'staff/qr.php', '/staff/qr.php'],
    ],
];
?>
<aside class="sidebar app-sidebar admin-os-sidebar staff-os-sidebar" id="appSidebar">
    <a class="admin-os-brand" href="<?= app_url('staff/dashboard.php') ?>" aria-label="Vetrix staff dashboard">
        <span class="admin-os-mark">V</span>
        <span><b>Vetrix</b><small>Staff Operations</small></span>
    </a>

    <nav class="admin-os-nav" aria-label="Staff navigation">
        <?php foreach ($staffSections as $section => $links): ?>
            <div class="admin-os-section">
                <div class="admin-os-section-title"><?= e($section) ?></div>
                <?php foreach ($links as $link): ?>
                    <a class="<?= staff_side_active($link[3]) ?>" href="<?= app_url($link[2]) ?>">
                        <span><?= e($link[0]) ?></span><?= e($link[1]) ?>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
    </nav>

    <div class="admin-os-user">
        <div class="admin-os-avatar"><?= e(strtoupper(substr($_SESSION['full_name'] ?? 'S', 0, 1))) ?></div>
        <div><b><?= e($_SESSION['full_name'] ?? 'Staff') ?></b><small>Front Desk Staff</small></div>
        <a href="<?= app_url('logout.php') ?>">Logout</a>
    </div>
</aside>
