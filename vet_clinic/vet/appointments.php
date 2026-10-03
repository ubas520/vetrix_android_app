<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("veterinarian");
$uid = (int)current_user_id();

if (isset($_POST['mark_completed'])) {
    $appointment_id = (int)($_POST['appointment_id'] ?? 0);
    $stmt = $conn->prepare("SELECT a.*, p.name AS pet_name FROM appointments a JOIN pets p ON a.pet_id=p.id WHERE a.id=? AND (a.assigned_vet_id=? OR a.assigned_vet_id IS NULL) AND a.status='approved'");
    $stmt->bind_param("ii", $appointment_id, $uid);
    $stmt->execute();
    $appt = $stmt->get_result()->fetch_assoc();
    if ($appt) {
        $update = $conn->prepare("UPDATE appointments SET status='completed' WHERE id=?");
        $update->bind_param("i", $appointment_id);
        $update->execute();
        notify_user($conn, $appt['owner_id'], 'Appointment Completed', 'The appointment for ' . $appt['pet_name'] . ' has been marked completed by the veterinarian.', 'appointment');
        log_action($conn, 'Veterinarian marked appointment completed', 'appointment', $appointment_id, 'Appointment completed for ' . $appt['pet_name']);
        flash('success', 'Appointment marked as completed. You may now create a medical record.');
    }
    redirect_to('vet/appointments.php');
}

$status_filter=$_GET['status'] ?? 'all';
$appointment_search = trim($_GET['q'] ?? '');
$allowed=['all','pending','approved','completed'];
if(!in_array($status_filter,$allowed,true)) $status_filter='all';
$whereStatus = $status_filter==='all' ? "" : " AND a.status='".$conn->real_escape_string($status_filter)."'";
if ($appointment_search !== '') {
    $safeAppointmentSearch = $conn->real_escape_string($appointment_search);
    $whereStatus .= " AND (p.name LIKE '%$safeAppointmentSearch%' OR p.species LIKE '%$safeAppointmentSearch%' OR p.breed LIKE '%$safeAppointmentSearch%' OR u.full_name LIKE '%$safeAppointmentSearch%' OR u.email LIKE '%$safeAppointmentSearch%' OR u.phone LIKE '%$safeAppointmentSearch%' OR a.reason LIKE '%$safeAppointmentSearch%' OR a.confirmation_code LIKE '%$safeAppointmentSearch%' OR a.admin_notes LIKE '%$safeAppointmentSearch%')";
}
$appointment_search_param = $appointment_search !== '' ? '&q='.urlencode($appointment_search) : '';
$appointment_all_search_param = $appointment_search !== '' ? '?q='.urlencode($appointment_search) : '';

$title="Assigned Appointments";
include "../includes/header.php";
include "../includes/navbar.php";
$counts=[];
foreach(['pending','approved','completed'] as $s){
    $counts[$s]=$conn->query("SELECT COUNT(*) c FROM appointments a WHERE (a.assigned_vet_id=$uid OR a.assigned_vet_id IS NULL) AND a.status='$s'")->fetch_assoc()['c'];
}
$total=(int)$counts['pending']+(int)$counts['approved']+(int)$counts['completed'];
$rows=$conn->query("SELECT a.*,u.full_name,u.phone,u.email,p.name pet_name,p.species,p.breed,p.birth_date,p.critical_notes,p.allergies FROM appointments a JOIN users u ON a.owner_id=u.id JOIN pets p ON a.pet_id=p.id WHERE (a.assigned_vet_id=$uid OR a.assigned_vet_id IS NULL) AND a.status IN ('approved','pending','completed') $whereStatus ORDER BY FIELD(a.status,'approved','pending','completed'), COALESCE(a.scheduled_date,a.requested_date) ASC");
?>
<div class="layout"><?php include "../includes/vet_sidebar.php"; ?>
<main class="content">
<section class="hero admin-hero-banner mb-4"><h1>Assigned Appointments</h1><p>View assigned clinic visits in a clean appointment-card layout. Use the summary panel to check status, schedule, and available actions.</p></section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>

<div class="reference-filter-bar" id="vetAppointmentsFilterBar">
    <a class="reference-filter-chip <?=$status_filter==='all'?'active':''?>" href="appointments.php<?=$appointment_all_search_param?>">All <span class="count"><?=$total?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='pending'?'active':''?>" href="appointments.php?status=pending<?=$appointment_search_param?>">Pending <span class="count"><?=$counts['pending']?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='approved'?'active':''?>" href="appointments.php?status=approved<?=$appointment_search_param?>">Approved <span class="count"><?=$counts['approved']?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='completed'?'active':''?>" href="appointments.php?status=completed<?=$appointment_search_param?>">Completed <span class="count"><?=$counts['completed']?></span></a>
</div>

<form class="admin-list-search" method="GET" action="appointments.php">
    <?php if($status_filter !== 'all'): ?><input type="hidden" name="status" value="<?=e($status_filter)?>"><?php endif; ?>
    <input class="form-control" type="search" name="q" value="<?=e($appointment_search)?>" placeholder="Search pet, owner, phone, concern, or code...">
    <button class="btn btn-primary" type="submit">Search</button>
    <a class="btn btn-light" href="appointments.php<?= $status_filter !== 'all' ? '?status='.urlencode($status_filter) : '' ?>">Clear</a>
</form>

<div class="reference-list">
<?php if($rows->num_rows===0): ?><div class="soft-card"><h3>No assigned appointments</h3><p class="text-muted">Try another status filter or search term.</p></div><?php endif; ?>
<?php while($r=$rows->fetch_assoc()): $schedule=$r['scheduled_date'] ? $r['scheduled_date'] : $r['requested_date']; ?>
    <details class="reference-expand-card status-<?=e($r['status'])?>">
        <summary class="reference-expand-summary">
            <div class="reference-icon reference-icon-sm">APT</div>
            <div class="reference-expand-head">
                <div class="reference-title-row compact"><h2><?=e($r['pet_name'])?></h2><?=badge($r['status'])?></div>
                <p class="reference-subtitle mb-0"><?=e($r['full_name'])?> &middot; <?=e($r['email'] ?? '')?></p>
            </div>
            <div class="reference-quick-meta">
                <span>Schedule</span>
                <strong><?=e(date('M d, Y h:i A', strtotime($schedule)))?></strong>
            </div>
            <div class="reference-quick-meta hide-sm">
                <span>Concern</span>
                <strong><?=e($r['reason'])?></strong>
            </div>
            <span class="reference-expand-pill">View details</span>
        </summary>
        <div class="reference-expand-body">
            <div class="reference-expand-info">
                <div class="reference-tags">
                    <span class="reference-tag">Pet Appointment</span>
                    <span class="reference-tag"><?=e($r['species'])?></span>
                    <span class="reference-tag"><?=e($r['breed'] ?: 'Breed not set')?></span>
                </div>
                <div class="reference-details">
                    <div class="reference-detail"><label>Phone</label><strong><?=e($r['phone'] ?: 'No phone saved')?></strong></div>
                    <div class="reference-detail"><label>Pet age</label><strong><?=e(pet_age($r['birth_date']))?></strong></div>
                    <div class="reference-detail"><label>Requested date</label><strong><?=e(date('M d, Y h:i A', strtotime($r['requested_date'])))?></strong></div>
                    <div class="reference-detail"><label>Reason / Concern</label><strong><?=e($r['reason'])?></strong></div>
                </div>
            </div>
            <aside class="reference-summary">
                <h3>Appointment Summary</h3>
                <p><b>Status:</b> <?=e(ucfirst($r['status']))?></p>
                <p><b>Schedule:</b> <?=e(date('M d, Y h:i A', strtotime($schedule)))?></p>
                <p><b>Code:</b> <?=e($r['confirmation_code'] ?: 'Not generated')?></p>
                <p><b>Allergies:</b> <?=e($r['allergies'] ?: 'No allergies saved')?></p>
                <p><b>Note:</b> <?=e($r['admin_notes'] ?: ($r['critical_notes'] ?: 'No notes saved.'))?></p>
                <div class="reference-actions">
                    <?php if($r['status']==='approved'): ?>
                        <form method="POST" class="m-0">
                            <input type="hidden" name="appointment_id" value="<?=$r['id']?>">
                            <button class="btn btn-success rounded-pill" name="mark_completed">Mark Completed</button>
                        </form>
                        <a class="btn btn-light rounded-pill" href="records.php">Open Records</a>
                    <?php elseif($r['status']==='completed'): ?>
                        <a class="btn btn-primary rounded-pill" href="create_record_from_appointment.php?id=<?=$r['id']?>">Create Medical Record</a>
                        <a class="btn btn-light rounded-pill" href="records.php">View Records</a>
                    <?php else: ?>
                        <span class="badge text-bg-warning">Waiting for admin approval/schedule</span>
                    <?php endif; ?>
                </div>
            </aside>
        </div>
    </details>
<?php endwhile; ?>
</div>
</main></div><?php include "../includes/footer.php"; ?>
