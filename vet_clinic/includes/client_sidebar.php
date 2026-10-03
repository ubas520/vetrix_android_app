<?php
$current = str_replace('\\', '/', $_SERVER['SCRIPT_NAME']);
if (!function_exists('side_active')) {
    function side_active($needle) {
        return strpos(str_replace('\\', '/', $_SERVER['SCRIPT_NAME']), $needle) !== false ? 'active' : '';
    }
}

$clientSections = [
    'Portal' => [
        ['01', 'Dashboard', 'client/dashboard.php', '/client/dashboard.php'],
        ['02', 'Profile', 'client/profile.php', '/client/profile.php'],
        ['03', 'Notifications', 'client/notifications.php', '/client/notifications.php'],
    ],
    'Pet Care' => [
        ['04', 'My Pets', 'client/pets.php', '/client/pets.php'],
        ['05', 'Records', 'client/records.php', '/client/records.php'],
        ['06', 'Appointments', 'client/appointments.php', '/client/appointments.php'],
    ],
    'Tools' => [
        ['07', 'Download QR', 'client/download_app.php', '/client/download_app.php'],
        ['08', 'Pet QR Code', 'client/qr.php', '/client/qr.php'],
        ['09', 'Feedback', 'client/feedback.php', '/client/feedback.php'],
    ],
];
?>
<aside class="sidebar app-sidebar admin-os-sidebar client-os-sidebar" id="appSidebar">
    <a class="admin-os-brand" href="<?= app_url('client/dashboard.php') ?>" aria-label="Vetrix client dashboard">
        <span class="admin-os-mark">V</span>
        <span><b>Vetrix</b><small>Client Portal</small></span>
    </a>

    <nav class="admin-os-nav" aria-label="Client navigation">
        <?php foreach ($clientSections as $section => $links): ?>
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
        <div class="admin-os-avatar"><?= e(strtoupper(substr($_SESSION['full_name'] ?? 'C', 0, 1))) ?></div>
        <div><b><?= e($_SESSION['full_name'] ?? 'Client') ?></b><small>Client Account</small></div>
        <a href="<?= app_url('logout.php') ?>">Logout</a>
    </div>
</aside>
