<?php
if (!function_exists('vet_side_active')) {
    function vet_side_active($needle) {
        return strpos(str_replace('\\', '/', $_SERVER['SCRIPT_NAME']), $needle) !== false ? 'active' : '';
    }
}

$vetSections = [
    'Clinic' => [
        ['01', 'Dashboard', 'vet/dashboard.php', '/vet/dashboard.php'],
        ['02', 'Appointments', 'vet/appointments.php', '/vet/appointments.php'],
        ['03', 'Health Monitoring', 'vet/health_monitoring.php', '/vet/health_monitoring.php'],
    ],
    'Records' => [
        ['04', 'Pets', 'vet/pets.php', '/vet/pets.php'],
        ['05', 'Medical Records', 'vet/records.php', '/vet/records.php'],
        ['06', 'Vaccinations', 'vet/vaccinations.php', '/vet/vaccinations.php'],
        ['07', 'Consultations', 'vet/consultations.php', '/vet/consultations.php'],
    ],
];
?>
<aside class="sidebar app-sidebar admin-os-sidebar vet-os-sidebar" id="appSidebar">
    <a class="admin-os-brand" href="<?= app_url('vet/dashboard.php') ?>" aria-label="Vetrix veterinarian dashboard">
        <span class="admin-os-mark">V</span>
        <span><b>Vetrix</b><small>Veterinarian</small></span>
    </a>

    <nav class="admin-os-nav" aria-label="Veterinarian navigation">
        <?php foreach ($vetSections as $section => $links): ?>
            <div class="admin-os-section">
                <div class="admin-os-section-title"><?= e($section) ?></div>
                <?php foreach ($links as $link): ?>
                    <a class="<?= vet_side_active($link[3]) ?>" href="<?= app_url($link[2]) ?>">
                        <span><?= e($link[0]) ?></span><?= e($link[1]) ?>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
    </nav>

    <div class="admin-os-user">
        <div class="admin-os-avatar"><?= e(strtoupper(substr($_SESSION['full_name'] ?? 'V', 0, 1))) ?></div>
        <div><b><?= e($_SESSION['full_name'] ?? 'Veterinarian') ?></b><small>Veterinarian</small></div>
        <a href="<?= app_url('logout.php') ?>">Logout</a>
    </div>
</aside>
