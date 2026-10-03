<?php
$navRole = $_SESSION['role'] ?? 'guest';
$homeLink = function_exists('dashboard_for_role') ? dashboard_for_role($navRole) : 'client/dashboard.php';
$bellLink = 'admin/notifications.php';
if ($navRole === 'client') {
    $bellLink = 'client/notifications.php';
} elseif ($navRole === 'veterinarian') {
    $bellLink = 'vet/appointments.php';
} elseif ($navRole === 'staff') {
    $bellLink = 'staff/notifications.php';
}
$notifCount = isset($conn) ? get_nav_notification_count($conn, $navRole, current_user_id()) : 0;
$notifLabel = $notifCount > 99 ? '99+' : (string) $notifCount;
?>
<nav class="topbar app-topbar">
    <div class="nav-left">
        <button class="menu-toggle" type="button" onclick="toggleSidebar()" aria-label="Open menu">&#9776;</button>
        <a class="brand brand-link" href="<?= app_url($homeLink) ?>">
            <span class="brand-mark">V</span>
            <span>Vetrix</span>
        </a>
    </div>
    <div class="topbar-right">
        <a class="notif-drawn-bell" href="<?= app_url($bellLink) ?>" aria-label="Notifications<?= $notifCount > 0 ? ' (' . $notifLabel . ' new)' : '' ?>" title="Notifications" style="width:42px;height:42px;min-width:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#4b5563;text-decoration:none;box-shadow:none;margin-right:2px;position:relative;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:23px;height:23px;display:block;overflow:visible;">
                <path d="M12 4.2c-2.5 0-4.5 2-4.5 4.5v4.9c0 .4-.16.78-.44 1.06l-.84.84c-.58.58-.17 1.58.66 1.58h10.24c.83 0 1.24-1 .66-1.58l-.84-.84a1.5 1.5 0 0 1-.44-1.06V8.7c0-2.5-2-4.5-4.5-4.5Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.9 18.35a2.1 2.1 0 0 0 4.2 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.5 4.35a1.55 1.55 0 0 1 3 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <?php if ($notifCount > 0): ?>
                <span class="notif-count-badge"><?= e($notifLabel) ?></span>
            <?php endif; ?>
        </a>
        <button class="btn btn-primary btn-sm rounded-pill quick-ai-top" type="button" onclick="toggleFloatingChat(true)">Vetrix</button>
        <span class="user-chip"><?= e($_SESSION['full_name'] ?? '') ?> &middot; <?= e(ucfirst($navRole)) ?></span>
        <?php if (!in_array($navRole, ['admin', 'veterinarian', 'staff', 'client'], true)): ?>
            <a class="btn btn-light btn-sm rounded-pill logout-btn" href="<?= app_url('logout.php') ?>">Logout</a>
        <?php endif; ?>
    </div>
</nav>
<?php if ($navRole === 'staff'): ?>
<div id="staffOrderNotice" role="status" class="alert mx-3 mt-2" style="background:#eaf3ff;color:#173d73;border:1px solid #c3d9f5" hidden>A product order has an update. <a style="color:#174cb0;text-decoration:underline" href="<?= app_url('staff/notifications.php') ?>">View notifications</a></div>
<script>
(() => {
    const bell = document.querySelector('.notif-drawn-bell');
    const notice = document.getElementById('staffOrderNotice');
    let latest = 0;
    let busy = false;
    async function pollOrders() {
        if (document.hidden || busy) return;
        busy = true;
        try {
            const response = await fetch(<?= json_encode(app_url('staff/order_updates.php')) ?>, {cache:'no-store'});
            if (!response.ok) return;
            const data = await response.json();
            let badge = bell.querySelector('.notif-count-badge');
            if (data.count > 0) {
                if (!badge) { badge = document.createElement('span'); badge.className = 'notif-count-badge'; bell.appendChild(badge); }
                badge.textContent = data.count > 99 ? '99+' : String(data.count);
            } else if (badge) badge.remove();
            bell.setAttribute('aria-label', 'Notifications (' + data.count + ' new)');
            if (data.latest_order_notification > latest) notice.hidden = false;
            latest = data.latest_order_notification;
        } catch (_) { /* Retry on the next interval. */ }
        finally { busy = false; }
    }
    pollOrders();
    setInterval(pollOrders, 15000);
    document.addEventListener('visibilitychange', pollOrders);
})();
</script>
<?php endif; ?>
<div class="sidebar-backdrop" onclick="toggleSidebar(false)"></div>
