<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("staff");

if(isset($_POST['update_status'])){
    $assigned_vet_id = ($_POST['assigned_vet_id'] ?? '') !== '' ? (int)$_POST['assigned_vet_id'] : null;
    $confirmation_code = trim($_POST['confirmation_code'] ?? '');
    if ($confirmation_code === '') $confirmation_code = 'APT-' . str_pad((string)$_POST['id'], 5, '0', STR_PAD_LEFT);
    $stmt=$conn->prepare("UPDATE appointments SET status=?, scheduled_date=?, assigned_vet_id=?, confirmation_code=?, admin_notes=? WHERE id=?");
    $stmt->bind_param("ssissi",$_POST['status'],$_POST['scheduled_date'],$assigned_vet_id,$confirmation_code,$_POST['admin_notes'],$_POST['id']);
    $stmt->execute();
    $titleN='Appointment Update';
    $msg='Your appointment status is now '.$_POST['status'];
    notify_user($conn,$_POST['owner_id'],$titleN,$msg,'appointment');
    log_action($conn,'Staff updated appointment','appointment',$_POST['id'],'Status changed to '.$_POST['status']);
    flash('success','Appointment updated and notification sent to the client.');
    redirect_to('staff/appointments.php');
}

$status_filter=$_GET['status'] ?? 'all';
$allowed=['all','pending','approved','completed','cancelled'];
if(!in_array($status_filter,$allowed,true)) $status_filter='all';
$where = $status_filter==='all' ? '' : "WHERE a.status='".$conn->real_escape_string($status_filter)."'";

$title="Appointments";
include "../includes/header.php";
include "../includes/navbar.php";
$counts=[];
foreach(['pending','approved','completed','cancelled'] as $s){
    $counts[$s]=$conn->query("SELECT COUNT(*) c FROM appointments WHERE status='$s'")->fetch_assoc()['c'];
}
$total=(int)$counts['pending']+(int)$counts['approved']+(int)$counts['completed']+(int)$counts['cancelled'];
$rows=$conn->query("SELECT a.*,u.full_name,u.phone,u.email,u.address,p.name pet_name,p.species,p.breed,v.full_name vet_name FROM appointments a JOIN users u ON a.owner_id=u.id JOIN pets p ON a.pet_id=p.id LEFT JOIN users v ON a.assigned_vet_id=v.id $where ORDER BY FIELD(a.status,'pending','approved','completed','cancelled'), a.requested_date ASC");
?>
<div class="layout"><?php include "../includes/staff_sidebar.php"; ?><main class="content">
<section class="hero staff-light-hero hero-friendly no-hero-bubbles mb-4">
    <div>
        <h1>Front Desk / Appointments</h1>
        <p>Review client requests, approve schedules, assign veterinarians, and send updates using the clean appointment summary design.</p>
    </div>
</section>
<?php if($m=flash('success')):?><div class="alert alert-success friendly-alert">✅ <?=e($m)?></div><?php endif;?>

<div class="reference-filter-bar">
    <a class="reference-filter-chip <?=$status_filter==='all'?'active':''?>" href="appointments.php">All <span class="count"><?=$total?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='pending'?'active':''?>" href="appointments.php?status=pending">Pending <span class="count"><?=$counts['pending']?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='approved'?'active':''?>" href="appointments.php?status=approved">Approved <span class="count"><?=$counts['approved']?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='completed'?'active':''?>" href="appointments.php?status=completed">Completed <span class="count"><?=$counts['completed']?></span></a>
    <a class="reference-filter-chip <?=$status_filter==='cancelled'?'active':''?>" href="appointments.php?status=cancelled">Cancelled <span class="count"><?=$counts['cancelled']?></span></a>
</div>

<div class="reference-list">
<?php if($rows->num_rows===0): ?>
    <div class="empty-state"><div class="empty-icon">📅</div><h3>No appointments found</h3><p class="text-muted">Try another status filter.</p></div>
<?php endif; ?>
<?php while($r=$rows->fetch_assoc()): $schedule=$r['scheduled_date'] ? $r['scheduled_date'] : $r['requested_date']; ?>
    <article class="reference-card status-<?=e($r['status'])?>">
        <div class="reference-main">
            <div class="reference-icon">📅</div>
            <div>
                <div class="reference-title-row"><h2><?=e($r['pet_name'])?></h2><?=badge($r['status'])?></div>
                <p class="reference-subtitle"><?=e($r['full_name'])?> · <?=e($r['email'] ?? '')?></p>
                <div class="reference-tags">
                    <span class="reference-tag">Pet Appointment</span>
                    <span class="reference-tag"><?=e($r['species'])?></span>
                    <span class="reference-tag"><?=e($r['vet_name'] ?: 'Veterinarian not assigned')?></span>
                </div>
                <div class="reference-details">
                    <div class="reference-detail"><label>Phone</label><strong><?=e($r['phone'] ?: 'No phone saved')?></strong></div>
                    <div class="reference-detail"><label>Owner address</label><strong><?=e($r['address'] ?: 'No address saved')?></strong></div>
                    <div class="reference-detail"><label>Requested date</label><strong><?=e(date('M d, Y h:i A', strtotime($r['requested_date'])))?></strong></div>
                    <div class="reference-detail"><label>Reason / Concern</label><strong><?=e($r['reason'])?></strong></div>
                </div>
            </div>
        </div>
        <aside class="reference-summary">
            <h3>Appointment Summary</h3>
            <p><b>Status:</b> <?=e(ucfirst($r['status']))?></p>
            <p><b>Schedule:</b> <?=e(date('M d, Y h:i A', strtotime($schedule)))?></p>
            <p><b>Veterinarian:</b> <?=e($r['vet_name'] ?: 'Not assigned')?></p>
            <p><b>Code:</b> <?=e($r['confirmation_code'] ?: 'Not generated')?></p>
            <p><b>Note:</b> <?=e($r['admin_notes'] ?: 'No note saved.')?></p>
            <details class="reference-manage">
                <summary>Manage Appointment</summary>
                <form method="POST" class="reference-mini-form">
                    <input type="hidden" name="id" value="<?=$r['id']?>">
                    <input type="hidden" name="owner_id" value="<?=$r['owner_id']?>">
                    <label>Status</label>
                    <select class="form-select" name="status">
                        <option value="pending" <?=$r['status']=='pending'?'selected':''?>>Pending - waiting</option>
                        <option value="approved" <?=$r['status']=='approved'?'selected':''?>>Approved - confirmed</option>
                        <option value="completed" <?=$r['status']=='completed'?'selected':''?>>Completed - visit done</option>
                        <option value="cancelled" <?=$r['status']=='cancelled'?'selected':''?>>Cancelled</option>
                    </select>
                    <label>Clinic schedule</label>
                    <input class="form-control" type="datetime-local" name="scheduled_date" value="<?= $r['scheduled_date'] ? date('Y-m-d\TH:i', strtotime($r['scheduled_date'])) : date('Y-m-d\TH:i', strtotime($r['requested_date'])) ?>">
                    <label>Assign veterinarian</label>
                    <select class="form-select" name="assigned_vet_id">
                        <option value="">Not assigned</option>
                        <?php $vets=$conn->query("SELECT id,full_name FROM users WHERE role='veterinarian' AND status='active' ORDER BY full_name"); while($v=$vets->fetch_assoc()): ?>
                            <option value="<?=$v['id']?>" <?=$r['assigned_vet_id']==$v['id']?'selected':''?>><?=e($v['full_name'])?></option>
                        <?php endwhile; ?>
                    </select>
                    <label>Appointment confirmation code</label>
                    <input class="form-control" name="confirmation_code" placeholder="Auto-generated if blank" value="<?=e($r['confirmation_code'])?>">
                    <label>Message / notes for client</label>
                    <input class="form-control" name="admin_notes" placeholder="Example: Please arrive 10 minutes early." value="<?=e($r['admin_notes'])?>">
                    <div class="reference-actions">
                        <button class="btn btn-primary rounded-pill" name="update_status">Save & Notify</button>
                        <?php if($r['status']==='completed'): ?><a class="btn btn-light rounded-pill" href="create_record_from_appointment.php?id=<?=$r['id']?>">Create Record</a><?php endif; ?>
                    </div>
                </form>
            </details>
        </aside>
    </article>
<?php endwhile;?>
</div>
</main></div><?php include "../includes/footer.php"; ?>
