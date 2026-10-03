<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

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
    log_action($conn,'Admin updated appointment','appointment',$_POST['id'],'Status changed to '.$_POST['status']);
    flash('success','Appointment updated and notification sent to the client.');
    redirect_to('admin/appointments.php');
}

$status_filter=$_GET['status'] ?? 'all';
$appointment_search = trim($_GET['q'] ?? '');
$allowed=['all','pending','approved','completed','cancelled'];
if(!in_array($status_filter,$allowed,true)) $status_filter='all';
$appointment_conditions = [];
if($status_filter !== 'all') {
    $appointment_conditions[] = "a.status='".$conn->real_escape_string($status_filter)."'";
}
if($appointment_search !== '') {
    $safeAppointmentSearch = $conn->real_escape_string($appointment_search);
    $appointment_conditions[] = "(p.name LIKE '%$safeAppointmentSearch%' OR p.species LIKE '%$safeAppointmentSearch%' OR u.full_name LIKE '%$safeAppointmentSearch%' OR u.email LIKE '%$safeAppointmentSearch%' OR u.phone LIKE '%$safeAppointmentSearch%' OR u.address LIKE '%$safeAppointmentSearch%' OR a.reason LIKE '%$safeAppointmentSearch%' OR a.admin_notes LIKE '%$safeAppointmentSearch%' OR a.confirmation_code LIKE '%$safeAppointmentSearch%' OR v.full_name LIKE '%$safeAppointmentSearch%')";
}
$where = $appointment_conditions ? 'WHERE '.implode(' AND ', $appointment_conditions) : '';
$appointment_search_param = $appointment_search !== '' ? '&q='.urlencode($appointment_search) : '';
$appointment_all_search_param = $appointment_search !== '' ? '?q='.urlencode($appointment_search) : '';

$title="Appointments";
include "../includes/header.php";
include "../includes/navbar.php";
$counts=[];
$totalAppointments = (int)$conn->query("SELECT COUNT(*) c FROM appointments")->fetch_assoc()['c'];
foreach(['pending','approved','completed','cancelled'] as $s){
    $counts[$s]=(int)$conn->query("SELECT COUNT(*) c FROM appointments WHERE status='$s'")->fetch_assoc()['c'];
}
$rows=$conn->query("SELECT a.*,u.full_name,u.phone,u.email,u.address,p.name pet_name,p.species,v.full_name vet_name FROM appointments a JOIN users u ON a.owner_id=u.id JOIN pets p ON a.pet_id=p.id LEFT JOIN users v ON a.assigned_vet_id=v.id $where ORDER BY FIELD(a.status,'pending','approved','completed','cancelled'), a.requested_date ASC");
?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?><main class="content">
<section class="hero hero-friendly no-hero-bubbles mb-4">
    <div>
        <h1>Appointment Monitoring</h1>
        <p>Monitor appointment requests, approval status, clinic schedules, and veterinarian assignments using a clean card layout.</p>
    </div>
</section>
<?php if($m=flash('success')):?><div class="alert alert-success friendly-alert">Saved: <?=e($m)?></div><?php endif;?>

<style>
.appt-monitor{background:rgba(255,255,255,.92);border:1px solid rgba(191,219,254,.92);border-radius:28px;padding:18px 18px 20px;box-shadow:0 18px 44px rgba(15,23,42,.06)}
.appt-monitor-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}
.appt-monitor-head h2{font-size:1.95rem;line-height:1.06;letter-spacing:-.03em;font-weight:950;color:#0f172a;margin:0 0 6px}
.appt-monitor-head p{margin:0;color:#64748b;font-size:1rem;line-height:1.45}
.appt-summary-pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.appt-summary-pills span{background:#f8fbff;border:1px solid #dbeafe;color:#475569;border-radius:999px;padding:10px 14px;font-size:.82rem;white-space:nowrap}
.appt-summary-pills b{font-size:.96rem;color:#0f172a;margin-right:6px}
.appt-filter-row{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 14px}
.appt-filter{display:inline-flex;align-items:center;gap:9px;text-decoration:none;background:#fff;border:1px solid #dbeafe;color:#1e293b;border-radius:999px;padding:10px 16px;font-weight:900;box-shadow:0 10px 24px rgba(15,23,42,.04)}
.appt-filter b{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:1px 8px;font-size:.82rem}
.appt-filter.active{background:#2563eb;color:#fff}
.appt-filter.active b{background:rgba(255,255,255,.16);color:#fff}
.appt-list{display:grid;gap:16px}
.appt-record{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px;border:1px solid #dbeafe;border-radius:26px;background:linear-gradient(180deg,#fff,#fbfdff);padding:16px 18px;box-shadow:0 12px 28px rgba(15,23,42,.04)}
.appt-main{display:grid;grid-template-columns:76px minmax(0,1fr);gap:14px;align-items:flex-start}
.appt-avatar{width:76px;height:76px;border-radius:22px;background:linear-gradient(135deg,#dbeafe,#eff6ff);border:1px solid #bfdbfe;display:grid;place-items:center;font-size:34px;color:#2563eb}
.appt-name-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.appt-name-row h3{font-size:1.34rem;line-height:1.1;letter-spacing:-.02em;font-weight:950;color:#0f172a;margin:0}
.appt-meta{color:#64748b;font-size:.95rem;margin:0 0 10px;overflow-wrap:anywhere}
.appt-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.appt-chip{display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;padding:6px 11px;font-size:.79rem;font-weight:850}
.appt-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px;margin-top:4px}
.appt-details div{min-width:0}
.appt-details b,.appt-details span{display:block;color:#0f172a;font-size:.97rem;overflow-wrap:anywhere}
.appt-details small{display:block;color:#475569;font-size:.78rem;font-weight:900;margin-bottom:1px}
.appt-side{background:#f8fbff;border:1px solid #dbeafe;border-radius:22px;padding:16px 16px 14px;display:flex;flex-direction:column;justify-content:space-between}
.appt-side h4{font-size:1.12rem;font-weight:950;color:#0f172a;margin:0 0 10px}
.appt-side-list{display:grid;gap:8px}
.appt-side-list div{color:#475569;font-size:.96rem;line-height:1.38}
.appt-side-list b{color:#0f172a}
.appt-side-actions{margin-top:14px}
.appt-side-actions button{border:0;background:none;color:#1d4ed8;font-size:.98rem;font-weight:900;padding:0}
.appt-empty{border:1px dashed #bfdbfe;border-radius:24px;padding:30px;text-align:center;color:#64748b;background:#f8fbff}

.appt-modal{display:none;position:fixed;inset:0;background:rgba(15,23,42,.56);z-index:9999;padding:24px;overflow:auto}
.appt-modal.show{display:flex;align-items:flex-start;justify-content:center}
.appt-modal-card{width:min(980px,100%);background:#fff;border-radius:28px;border:1px solid #dbeafe;box-shadow:0 30px 80px rgba(15,23,42,.28);overflow:hidden}
.appt-modal-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:20px 22px;background:linear-gradient(135deg,#eff6ff,#ecfeff);border-bottom:1px solid #dbeafe}
.appt-modal-head h3{margin:0;font-weight:950;color:#0f172a}.appt-modal-head p{margin:4px 0 0;color:#64748b}
.appt-close{border:0;background:#fff;color:#0f172a;width:40px;height:40px;border-radius:14px;font-size:24px;line-height:1;box-shadow:0 8px 18px rgba(15,23,42,.08)}
.appt-modal-body{padding:20px 22px;display:grid;grid-template-columns:1fr 360px;gap:18px}
.appt-modal-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.appt-box{background:#f8fbff;border:1px solid #e0f2fe;border-radius:18px;padding:12px}.appt-box small{display:block;color:#64748b;font-weight:850;margin-bottom:3px}.appt-box b,.appt-box span{display:block;color:#0f172a;overflow-wrap:anywhere}.appt-box.full{grid-column:1/-1}
.appt-update{background:#f8fbff;border:1px solid #e0f2fe;border-radius:22px;padding:14px;display:grid;gap:10px;align-content:start}
.appt-update .form-label{font-size:.78rem;font-weight:850;color:#475569;margin:0 0 4px}
.appt-update .form-control,.appt-update .form-select{border-radius:15px;border-color:#dbeafe;background:#fff}
.appt-update textarea{min-height:92px;resize:vertical}.appt-update .btn{border-radius:999px;font-weight:900}
.appt-note{background:#fff;border:1px dashed #bfdbfe;border-radius:16px;padding:10px;color:#475569;font-size:.88rem}
@media(max-width:1080px){.appt-record{grid-template-columns:1fr}.appt-side{order:2}.appt-summary-pills{justify-content:flex-start;margin-top:6px}.appt-monitor-head{display:block}.appt-modal-body{grid-template-columns:1fr}}
@media(max-width:640px){.appt-monitor{padding:16px}.appt-monitor-head h2{font-size:1.6rem}.appt-main{grid-template-columns:1fr}.appt-avatar{margin-bottom:4px}.appt-details,.appt-modal-details{grid-template-columns:1fr}.appt-modal{padding:10px}.appt-modal-head,.appt-modal-body{padding:16px}}
</style>

<div class="appt-monitor">
    <div class="appt-monitor-head">
        <div>
            <h2>Appointments and Scheduling</h2>
            <p>Monitor client appointment requests, approval status, clinic schedule, veterinarian assignment, and confirmation details using a clean card layout.</p>
        </div>
        <div class="appt-summary-pills">
            <span><b><?=$totalAppointments?></b>Total</span>
            <span><b><?=$counts['pending']?></b>Pending</span>
            <span><b><?=$counts['approved']?></b>Approved</span>
            <span><b><?=$counts['completed']?></b>Completed</span>
            <span><b><?=$counts['cancelled']?></b>Cancelled</span>
        </div>
    </div>

    <div class="appt-filter-row">
        <a class="appt-filter <?=$status_filter==='all'?'active':''?>" href="appointments.php<?=$appointment_all_search_param?>">All <b><?=$totalAppointments?></b></a>
        <a class="appt-filter <?=$status_filter==='pending'?'active':''?>" href="appointments.php?status=pending<?=$appointment_search_param?>">Pending <b><?=$counts['pending']?></b></a>
        <a class="appt-filter <?=$status_filter==='approved'?'active':''?>" href="appointments.php?status=approved<?=$appointment_search_param?>">Approved <b><?=$counts['approved']?></b></a>
        <a class="appt-filter <?=$status_filter==='completed'?'active':''?>" href="appointments.php?status=completed<?=$appointment_search_param?>">Completed <b><?=$counts['completed']?></b></a>
        <a class="appt-filter <?=$status_filter==='cancelled'?'active':''?>" href="appointments.php?status=cancelled<?=$appointment_search_param?>">Cancelled <b><?=$counts['cancelled']?></b></a>
    </div>

    <form class="admin-list-search" method="GET" action="appointments.php">
        <?php if($status_filter !== 'all'): ?><input type="hidden" name="status" value="<?=e($status_filter)?>"><?php endif; ?>
        <input class="form-control" type="search" name="q" value="<?=e($appointment_search)?>" placeholder="Search pet, owner, phone, concern, vet, code...">
        <button class="btn btn-primary" type="submit">Search</button>
        <a class="btn btn-light" href="appointments.php<?= $status_filter !== 'all' ? '?status='.urlencode($status_filter) : '' ?>">Clear</a>
    </form>

    <?php if($rows->num_rows===0): ?>
        <div class="appt-empty"><h3>No appointments found</h3><p>Try another status filter or search term.</p></div>
    <?php else: ?>
    <div class="appt-list">
        <?php while($r=$rows->fetch_assoc()): ?>
            <?php $modalId='apptDetails'.(int)$r['id']; ?>
            <article class="appt-record">
                <div class="appt-main">
                    <div class="appt-avatar">APT</div>
                    <div>
                        <div class="appt-name-row">
                            <h3><?=e($r['pet_name'])?></h3>
                            <?=badge($r['status'])?>
                        </div>
                        <p class="appt-meta"><?=e($r['full_name'])?><?php if(!empty($r['email'])): ?> &middot; <?=e($r['email'])?><?php endif; ?></p>
                        <div class="appt-chip-row">
                            <span class="appt-chip">Pet Appointment</span>
                            <span class="appt-chip"><?=e($r['species'])?></span>
                            <span class="appt-chip">Veterinarian <?= $r['assigned_vet_id'] ? 'assigned' : 'not assigned' ?></span>
                        </div>
                        <div class="appt-details">
                            <div>
                                <small>Phone</small>
                                <b><?=e($r['phone'] ?: 'No phone saved')?></b>
                            </div>
                            <div>
                                <small>Owner address</small>
                                <b><?=e($r['address'] ?: 'No address saved')?></b>
                            </div>
                            <div>
                                <small>Requested date</small>
                                <b><?=e(date('M d, Y h:i A', strtotime($r['requested_date'])))?></b>
                            </div>
                            <div>
                                <small>Reason / Concern</small>
                                <span><?=e($r['reason'] ?: 'No reason provided')?></span>
                            </div>
                        </div>
                    </div>
                </div>

                <aside class="appt-side">
                    <div>
                        <h4>Appointment Summary</h4>
                        <div class="appt-side-list">
                            <div><b>Status:</b> <?=ucfirst(e($r['status']))?></div>
                            <div><b>Schedule:</b> <?= $r['scheduled_date'] ? e(date('M d, Y h:i A', strtotime($r['scheduled_date']))) : 'Not scheduled' ?></div>
                            <div><b>Veterinarian:</b> <?=e($r['vet_name'] ?: 'Not assigned')?></div>
                            <div><b>Code:</b> <?=e($r['confirmation_code'] ?: 'Not generated')?></div>
                            <div><b>Note:</b> <?=e($r['admin_notes'] ?: 'No note yet')?></div>
                        </div>
                    </div>
                    <div class="appt-side-actions">
                        <button type="button" onclick="openApptModal('<?=$modalId?>')">Manage Appointment</button>
                    </div>
                </aside>
            </article>

            <div class="appt-modal" id="<?=$modalId?>" aria-hidden="true">
                <div class="appt-modal-card" role="dialog" aria-modal="true" aria-labelledby="<?=$modalId?>Title">
                    <div class="appt-modal-head">
                        <div>
                            <h3 id="<?=$modalId?>Title"><?=e($r['pet_name'])?> Appointment</h3>
                            <p>Full appointment details and admin update panel.</p>
                        </div>
                        <button type="button" class="appt-close" onclick="closeApptModal('<?=$modalId?>')">×</button>
                    </div>
                    <div class="appt-modal-body">
                        <section>
                            <div class="appt-modal-details">
                                <div class="appt-box"><small>Status</small><span><?=badge($r['status'])?></span></div>
                                <div class="appt-box"><small>Pet</small><b><?=e($r['pet_name'])?> &middot; <?=e($r['species'])?></b></div>
                                <div class="appt-box"><small>Owner</small><b><?=e($r['full_name'])?></b></div>
                                <div class="appt-box"><small>Phone</small><b><?=e($r['phone'] ?: 'No phone saved')?></b></div>
                                <div class="appt-box"><small>Requested date</small><b><?=e(date('M d, Y h:i A', strtotime($r['requested_date'])))?></b></div>
                                <div class="appt-box"><small>Clinic schedule</small><b><?= $r['scheduled_date'] ? e(date('M d, Y h:i A', strtotime($r['scheduled_date']))) : 'Not scheduled' ?></b></div>
                                <div class="appt-box"><small>Assigned veterinarian</small><b><?=e($r['vet_name'] ?: 'Not assigned')?></b></div>
                                <div class="appt-box"><small>Confirmation code</small><b><?=e($r['confirmation_code'] ?: 'Not generated')?></b></div>
                                <div class="appt-box full"><small>Reason / Concern</small><span><?=e($r['reason'] ?: 'No reason provided.')?></span></div>
                                <div class="appt-box full"><small>Current admin note</small><span><?=e($r['admin_notes'] ?: 'No admin note yet.')?></span></div>
                            </div>
                        </section>

                        <form method="POST" class="appt-update">
                            <input type="hidden" name="id" value="<?=$r['id']?>">
                            <input type="hidden" name="owner_id" value="<?=$r['owner_id']?>">
                            <div class="appt-note">Update the appointment here. The client will receive a notification after saving.</div>
                            <div>
                                <label class="form-label">Status</label>
                                <select class="form-select" name="status">
                                    <option value="pending" <?=$r['status']=='pending'?'selected':''?>>Pending - waiting</option>
                                    <option value="approved" <?=$r['status']=='approved'?'selected':''?>>Approved - confirmed</option>
                                    <option value="completed" <?=$r['status']=='completed'?'selected':''?>>Completed - visit done</option>
                                    <option value="cancelled" <?=$r['status']=='cancelled'?'selected':''?>>Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label">Clinic schedule</label>
                                <input class="form-control" type="datetime-local" name="scheduled_date" value="<?= $r['scheduled_date'] ? date('Y-m-d\TH:i', strtotime($r['scheduled_date'])) : date('Y-m-d\TH:i', strtotime($r['requested_date'])) ?>">
                            </div>
                            <div>
                                <label class="form-label">Assign veterinarian</label>
                                <select class="form-select" name="assigned_vet_id">
                                    <option value="">Not assigned</option>
                                    <?php $vets=$conn->query("SELECT id,full_name FROM users WHERE role='veterinarian' AND status='active' ORDER BY full_name"); while($v=$vets->fetch_assoc()): ?>
                                        <option value="<?=$v['id']?>" <?=$r['assigned_vet_id']==$v['id']?'selected':''?>><?=e($v['full_name'])?></option>
                                    <?php endwhile; ?>
                                </select>
                            </div>
                            <div>
                                <label class="form-label">Confirmation code</label>
                                <input class="form-control" name="confirmation_code" placeholder="Auto-generated if blank" value="<?=e($r['confirmation_code'])?>">
                            </div>
                            <div>
                                <label class="form-label">Message / notes for client</label>
                                <textarea class="form-control" name="admin_notes" placeholder="Example: Please arrive 10 minutes early."><?=e($r['admin_notes'])?></textarea>
                            </div>
                            <button class="btn btn-primary" name="update_status">Save & Notify</button>
                        </form>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
    </div>
    <?php endif; ?>
</div>

<script>
function openApptModal(id){
    const modal=document.getElementById(id);
    if(!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
}
function closeApptModal(id){
    const modal=document.getElementById(id);
    if(!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
}
document.addEventListener('click',function(e){
    if(e.target.classList && e.target.classList.contains('appt-modal')) closeApptModal(e.target.id);
});
document.addEventListener('keydown',function(e){
    if(e.key==='Escape') document.querySelectorAll('.appt-modal.show').forEach(m=>closeApptModal(m.id));
});
</script>
</main></div><?php include "../includes/footer.php"; ?>
