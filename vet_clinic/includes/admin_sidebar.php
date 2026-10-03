<?php
$current = str_replace('\\', '/', $_SERVER['SCRIPT_NAME']);
if (!function_exists('side_active')) {
    function side_active($needle) {
        return strpos(str_replace('\\', '/', $_SERVER['SCRIPT_NAME']), $needle) !== false ? 'active' : '';
    }
}

$adminSections = [
    'Clinic' => [
        ['01', 'Dashboard', 'admin/dashboard.php', '/admin/dashboard.php'],
        ['02', 'Appointments', 'admin/appointments.php', '/admin/appointments.php'],
        ['03', 'Calendar', 'admin/calendar.php', '/admin/calendar.php'],
        ['04', 'Notifications', 'admin/notifications.php', '/admin/notifications.php'],
        ['05', 'Inventory', 'admin/inventory.php', '/admin/inventory.php'],
        ['06', 'POS', 'admin/pos.php', '/admin/pos.php'],
    ],
    'Records' => [
        ['07', 'Pets', 'admin/pets.php', '/admin/pets.php'],
        ['08', 'Clients', 'admin/clients.php', '/admin/clients.php'],
        ['09', 'Vaccinations', 'admin/vaccinations.php', '/admin/vaccinations.php'],
        ['10', 'QR Retrieval', 'admin/qr.php', '/admin/qr.php'],
        ['11', 'Pet Edits', 'admin/pet_edit_requests.php', '/admin/pet_edit_requests.php'],
    ],
    'Reports' => [
        ['12', 'Reports', 'admin/reports.php', '/admin/reports.php'],
        ['13', 'Export', 'admin/export.php', '/admin/export.php'],
        ['14', 'Feedback', 'admin/feedback.php', '/admin/feedback.php'],
    ],
    'System' => [
        ['15', 'Users', 'admin/users.php', '/admin/users.php'],
        ['16', 'Activity Logs', 'admin/activity_logs.php', '/admin/activity_logs.php'],
        ['17', 'Access Control', 'admin/access_control.php', '/admin/access_control.php'],
    ],
];
?>
<aside class="sidebar app-sidebar admin-os-sidebar" id="appSidebar">
    <a class="admin-os-brand" href="<?= app_url('admin/dashboard.php') ?>" aria-label="Vetrix admin dashboard">
        <span class="admin-os-mark">V</span>
        <span><b>Vetrix</b><small>Administrator</small></span>
    </a>

    <nav class="admin-os-nav" aria-label="Admin navigation">
        <?php foreach ($adminSections as $section => $links): ?>
            <div class="admin-os-section">
                <div class="admin-os-section-title"><?= e($section) ?></div>
                <?php foreach ($links as $link): ?>
                    <a class="<?= side_active($link[3]) ?>" href="<?= app_url($link[2]) ?>">
                        <span><?= e($link[0]) ?></span><?= e($link[1]) ?>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
    </nav>

    <div class="admin-os-user">
        <div class="admin-os-avatar"><?= e(strtoupper(substr($_SESSION['full_name'] ?? 'A', 0, 1))) ?></div>
        <div><b><?= e($_SESSION['full_name'] ?? 'Admin') ?></b><small>Clinic Administrator</small></div>
        <a href="<?= app_url('logout.php') ?>">Logout</a>
    </div>
</aside>
