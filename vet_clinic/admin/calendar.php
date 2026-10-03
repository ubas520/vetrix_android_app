<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

$month = $_GET['month'] ?? date('Y-m');
if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    $month = date('Y-m');
}

$start = $month . '-01';
$daysInMonth = (int) date('t', strtotime($start));
$firstWeekday = (int) date('w', strtotime($start));
$monthTitle = date('F Y', strtotime($start));
$prevMonth = date('Y-m', strtotime($start . ' -1 month'));
$nextMonth = date('Y-m', strtotime($start . ' +1 month'));
$monthStart = $month . '-01 00:00:00';
$monthEnd = date('Y-m-d 23:59:59', strtotime($start . ' +' . ($daysInMonth - 1) . ' days'));

$appointmentsByDate = [];
$counts = ['pending' => 0, 'approved' => 0, 'completed' => 0, 'cancelled' => 0];

$stmt = $conn->prepare("\n    SELECT a.*,\n           u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone,\n           p.name AS pet_name, p.species, p.breed, p.sex AS pet_sex,\n           v.full_name AS vet_name\n    FROM appointments a\n    JOIN users u ON a.owner_id = u.id\n    JOIN pets p ON a.pet_id = p.id\n    LEFT JOIN users v ON a.assigned_vet_id = v.id\n    WHERE (a.requested_date BETWEEN ? AND ?)\n       OR (a.scheduled_date BETWEEN ? AND ?)\n    ORDER BY COALESCE(a.scheduled_date, a.requested_date) ASC\n");
$stmt->bind_param("ssss", $monthStart, $monthEnd, $monthStart, $monthEnd);
$stmt->execute();
$rows = $stmt->get_result();
while ($r = $rows->fetch_assoc()) {
    $dateKey = date('Y-m-d', strtotime($r['scheduled_date'] ?: $r['requested_date']));
    $appointmentsByDate[$dateKey][] = $r;
    $statusKey = strtolower($r['status'] ?? 'pending');
    if (isset($counts[$statusKey])) {
        $counts[$statusKey]++;
    }
}
$totalAppointments = array_sum($counts);

function calendar_status_class($status) {
    $status = strtolower($status ?? 'pending');
    return in_array($status, ['pending', 'approved', 'completed', 'cancelled'], true) ? $status : 'pending';
}

function calendar_status_icon($status) {
    return [
        'pending' => '⌛',
        'approved' => 'A',
        'completed' => 'C',
        'cancelled' => '✕'
    ][calendar_status_class($status)] ?? '⌛';
}

$title='Appointment Calendar';
include "../includes/header.php";
include "../includes/navbar.php";
?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?><main class="content">
<section class="hero mb-4">
    <h1>Appointment Calendar</h1>
    <p>View clinic appointments in a clean monthly schedule. Click an appointment to see the full details.</p>
</section>

<section class="calendar-toolbar soft-card mb-4">
    <div>
        <span class="calendar-kicker">Clinic Schedule</span>
        <h2><?= e($monthTitle) ?></h2>
        <p><?= $totalAppointments ?> appointment<?= $totalAppointments == 1 ? '' : 's' ?> this month</p>
    </div>
    <form method="GET" class="calendar-month-form">
        <a class="btn btn-light" href="?month=<?= e($prevMonth) ?>">‹ Previous</a>
        <input class="form-control" type="month" name="month" value="<?=e($month)?>">
        <button class="btn btn-primary">View</button>
        <a class="btn btn-light" href="?month=<?= date('Y-m') ?>">Today</a>
        <a class="btn btn-light" href="?month=<?= e($nextMonth) ?>">Next ›</a>
    </form>
</section>

<section class="calendar-status-row mb-4">
    <span class="calendar-status-pill all">All <b><?= $totalAppointments ?></b></span>
    <span class="calendar-status-pill pending">Pending <b><?= $counts['pending'] ?></b></span>
    <span class="calendar-status-pill approved">Approved <b><?= $counts['approved'] ?></b></span>
    <span class="calendar-status-pill completed">Completed <b><?= $counts['completed'] ?></b></span>
    <span class="calendar-status-pill cancelled">Cancelled <b><?= $counts['cancelled'] ?></b></span>
</section>

<div class="modern-calendar">
    <div class="calendar-weekday">SUN</div>
    <div class="calendar-weekday">MON</div>
    <div class="calendar-weekday">TUE</div>
    <div class="calendar-weekday">WED</div>
    <div class="calendar-weekday">THU</div>
    <div class="calendar-weekday">FRI</div>
    <div class="calendar-weekday">SAT</div>

    <?php for($blank = 0; $blank < $firstWeekday; $blank++): ?>
        <div class="modern-calendar-day muted"></div>
    <?php endfor; ?>

    <?php for($d=1; $d<=$daysInMonth; $d++):
        $date = $month . '-' . str_pad($d, 2, '0', STR_PAD_LEFT);
        $dayAppointments = $appointmentsByDate[$date] ?? [];
        $isToday = $date === date('Y-m-d');
    ?>
    <div class="modern-calendar-day <?= $isToday ? 'today' : '' ?>">
        <div class="modern-calendar-date">
            <span><?= $d ?></span>
            <?php if ($isToday): ?><small>Today</small><?php endif; ?>
        </div>
        <div class="modern-calendar-events">
            <?php foreach($dayAppointments as $r):
                $statusClass = calendar_status_class($r['status']);
                $timeLabel = date('g:ia', strtotime($r['scheduled_date'] ?: $r['requested_date']));
                $modalId = 'appointmentDetails' . (int)$r['id'];
            ?>
            <button type="button" class="calendar-event calendar-event-<?= e($statusClass) ?>" onclick="openAppointmentDetails('<?= e($modalId) ?>')">
                <span><?= calendar_status_icon($r['status']) ?></span>
                <strong><?= e($timeLabel) ?></strong>
                <em><?= e($r['pet_name']) ?></em>
            </button>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endfor; ?>
</div>

<?php foreach($appointmentsByDate as $date => $items): foreach($items as $r):
    $statusClass = calendar_status_class($r['status']);
    $modalId = 'appointmentDetails' . (int)$r['id'];
?>
<div class="appointment-modal-backdrop" id="<?= e($modalId) ?>" onclick="closeAppointmentDetails(event, '<?= e($modalId) ?>')">
    <section class="appointment-modal-card" role="dialog" aria-modal="true" aria-labelledby="<?= e($modalId) ?>Title">
        <button class="appointment-modal-close" type="button" onclick="closeAppointmentDetails(null, '<?= e($modalId) ?>')">×</button>
        <div class="appointment-modal-head">
            <div>
                <span class="calendar-status-pill <?= e($statusClass) ?>"><?= calendar_status_icon($r['status']) ?> <?= e(ucfirst($r['status'])) ?></span>
                <h2 id="<?= e($modalId) ?>Title"><?= e($r['pet_name']) ?> Appointment</h2>
                <p><?= e($r['reason'] ?: 'No reason provided.') ?></p>
            </div>
        </div>
        <div class="appointment-detail-grid">
            <div class="appointment-detail-box"><small>Owner</small><b><?= e($r['owner_name']) ?></b><span><?= e($r['owner_phone'] ?: 'No phone') ?></span><span><?= e($r['owner_email'] ?: 'No email') ?></span></div>
            <div class="appointment-detail-box"><small>Pet</small><b><?= e($r['pet_name']) ?></b><span><?= e($r['species'] ?: 'No species') ?><?= $r['breed'] ? ' • ' . e($r['breed']) : '' ?></span><span><?= e($r['pet_sex'] ?: 'No sex') ?></span></div>
            <div class="appointment-detail-box"><small>Requested Date</small><b><?= e(date('M d, Y', strtotime($r['requested_date']))) ?></b><span><?= e(date('g:i A', strtotime($r['requested_date']))) ?></span></div>
            <div class="appointment-detail-box"><small>Clinic Schedule</small><b><?= $r['scheduled_date'] ? e(date('M d, Y', strtotime($r['scheduled_date']))) : 'Not scheduled' ?></b><span><?= $r['scheduled_date'] ? e(date('g:i A', strtotime($r['scheduled_date']))) : 'Waiting for admin schedule' ?></span></div>
            <div class="appointment-detail-box"><small>Assigned Veterinarian</small><b><?= e($r['vet_name'] ?: 'Not assigned') ?></b><span>Vet assigned by admin</span></div>
            <div class="appointment-detail-box"><small>Confirmation Code</small><b><?= e($r['confirmation_code'] ?: 'Not generated') ?></b><span>Given after approval/schedule</span></div>
        </div>
        <div class="appointment-detail-note">
            <small>Admin Notes</small>
            <p><?= e($r['admin_notes'] ?: 'No admin notes yet.') ?></p>
        </div>
        <div class="appointment-modal-actions">
            <a class="btn btn-primary" href="appointments.php">Manage Appointment</a>
            <button class="btn btn-light" type="button" onclick="closeAppointmentDetails(null, '<?= e($modalId) ?>')">Close</button>
        </div>
    </section>
</div>
<?php endforeach; endforeach; ?>

<script>
function openAppointmentDetails(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('show');
    document.body.classList.add('modal-open-lite');
}
function closeAppointmentDetails(event, id) {
    if (event && event.target.id !== id) return;
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('show');
    if (!document.querySelector('.appointment-modal-backdrop.show')) {
        document.body.classList.remove('modal-open-lite');
    }
}
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.appointment-modal-backdrop.show').forEach(function(modal) {
            modal.classList.remove('show');
        });
        document.body.classList.remove('modal-open-lite');
    }
});
</script>
</main></div><?php include "../includes/footer.php"; ?>
