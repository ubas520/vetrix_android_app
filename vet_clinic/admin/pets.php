<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("admin");

function upload_pet_photo_admin($fieldName) {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) return [false, 'Please upload a pet picture.'];
    $allowed = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    $tmp = $_FILES[$fieldName]['tmp_name'];
    $mime = mime_content_type($tmp);
    if (!isset($allowed[$mime])) return [false, 'Pet picture must be JPG, PNG, or WEBP only.'];
    if ($_FILES[$fieldName]['size'] > 3 * 1024 * 1024) return [false, 'Pet picture must not exceed 3MB.'];
    $dir = __DIR__ . '/../uploads/pets';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $filename = 'pet_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($tmp, $dir . '/' . $filename)) return [false, 'Unable to save pet picture.'];
    return [true, 'uploads/pets/' . $filename];
}

function generate_pet_qr_if_missing($conn, $pet_id, $pet_name) {
    $check = $conn->prepare("SELECT id FROM qr_tokens WHERE pet_id=? AND status='active' LIMIT 1");
    $check->bind_param("i", $pet_id);
    $check->execute();
    if ($check->get_result()->num_rows > 0) return;
    $token = strtoupper(preg_replace('/[^A-Z0-9]/i','',$pet_name)) . "-QR-" . $pet_id . "-" . date("Y");
    $expires = date("Y-m-d H:i:s", strtotime("+1 year"));
    $qr = $conn->prepare("INSERT INTO qr_tokens(pet_id,token,expires_at,status) VALUES(?,?,?,'active')");
    $qr->bind_param("iss", $pet_id, $token, $expires);
    $qr->execute();
}

if($_SERVER['REQUEST_METHOD']==='POST'){
    verify_csrf_or_fail();
    $admin_id = current_user_id();

    if (isset($_POST['verify_pet'])) {
        $pet_id = (int)$_POST['pet_id'];
        $status = $_POST['verification_status'];
        $notes = trim($_POST['verification_notes'] ?? '');
        $allowed = ['approved','rejected','in_person_confirmation','pending'];
        if (!in_array($status, $allowed, true)) $status = 'pending';
        if (in_array($status, ['rejected','in_person_confirmation'], true) && $notes === '') {
            flash('error', 'Add an admin note explaining a rejection or in-person confirmation request.');
            redirect_to('admin/pets.php');
        }

        $pet = $conn->query("SELECT id,name,owner_id FROM pets WHERE id=$pet_id")->fetch_assoc();
        if ($pet) {
            $stmt = $conn->prepare("UPDATE pets SET verification_status=?, verification_notes=?, verified_by=?, verified_at=NOW(), last_updated_by=?, updated_at=NOW() WHERE id=?");
            $stmt->bind_param("ssiii", $status, $notes, $admin_id, $admin_id, $pet_id);
            $stmt->execute();
            if ($status === 'approved') generate_pet_qr_if_missing($conn, $pet_id, $pet['name']);
            $label = $status === 'in_person_confirmation' ? 'In-person confirmation required' : ucfirst($status);
            notify_user($conn, $pet['owner_id'], 'Pet Verification Update', 'Your pet '.$pet['name'].' status is now '.$label.'. '.$notes, 'record');
            log_action($conn, 'Admin updated pet verification', 'pet', $pet_id, 'Status: '.$status);
            flash('success','Pet verification status updated.');
        }
        redirect_to('admin/pets.php');
    }

    if (isset($_POST['add_pet'])) {
        $required = ['owner_id','name','species','breed','sex','birth_date','weight','color','allergies','critical_notes','notes'];
        foreach ($required as $field) {
            if (trim($_POST[$field] ?? '') === '') { flash('error','Please complete all pet details and upload a picture.'); redirect_to('admin/pets.php'); }
        }
        [$ok,$photo] = upload_pet_photo_admin('pet_photo');
        if (!$ok) { flash('error',$photo); redirect_to('admin/pets.php'); }
        $status = 'approved';
        $notes = 'Added and verified by clinic admin.';
        $stmt=$conn->prepare("INSERT INTO pets(owner_id,name,species,breed,sex,birth_date,weight,color,allergies,critical_notes,notes,pet_photo,verification_status,verification_notes,verified_by,verified_at,last_updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),?,NOW())");
        $weight=(float)$_POST['weight'];
        $owner=(int)$_POST['owner_id'];
        $stmt->bind_param("isssssdsssssssii", $owner,$_POST['name'],$_POST['species'],$_POST['breed'],$_POST['sex'],$_POST['birth_date'],$weight,$_POST['color'],$_POST['allergies'],$_POST['critical_notes'],$_POST['notes'],$photo,$status,$notes,$admin_id,$admin_id);
        $stmt->execute();
        $pet_id=$conn->insert_id;
        generate_pet_qr_if_missing($conn, $pet_id, $_POST['name']);
        log_action($conn,'Admin added approved pet profile','pet',$pet_id,'Walk-in pet added and approved.');
        notify_user($conn,$owner,'Pet Profile Added','The clinic added and approved a pet profile: '.$_POST['name'],'record');
        flash('success','Pet saved as approved and QR token generated.');
        redirect_to('admin/pets.php');
    }
}
$pet_filter = $_GET['verification'] ?? 'all';
$pet_search = trim($_GET['q'] ?? '');
$allowed_pet_filters = ['all','pending','in_person_confirmation','approved','rejected'];
if (!in_array($pet_filter, $allowed_pet_filters, true)) $pet_filter = 'all';
$pet_conditions = [];
if ($pet_filter !== 'all') {
    $pet_conditions[] = "p.verification_status='".$conn->real_escape_string($pet_filter)."'";
}
if ($pet_search !== '') {
    $safePetSearch = $conn->real_escape_string($pet_search);
    $pet_conditions[] = "(p.name LIKE '%$safePetSearch%' OR p.species LIKE '%$safePetSearch%' OR p.breed LIKE '%$safePetSearch%' OR p.color LIKE '%$safePetSearch%' OR p.notes LIKE '%$safePetSearch%' OR p.critical_notes LIKE '%$safePetSearch%' OR p.allergies LIKE '%$safePetSearch%' OR u.full_name LIKE '%$safePetSearch%')";
}
$pet_where = $pet_conditions ? 'WHERE '.implode(' AND ', $pet_conditions) : '';
$pet_search_param = $pet_search !== '' ? '&q='.urlencode($pet_search) : '';
$pet_all_search_param = $pet_search !== '' ? '?q='.urlencode($pet_search) : '';

$title="Pets"; include "../includes/header.php"; include "../includes/navbar.php"; ?>
<div class="layout"><?php include "../includes/admin_sidebar.php"; ?><main class="content">
<section class="hero admin-hero-banner mb-4"><h1>Pet Profiles</h1><p>Review client pet registrations. Only approved pets become active for appointments, QR, records, and vaccinations.</p></section>

<style>
/* Page-safe filter pill styling: prevents browser cache or link defaults from making filters look like blue text links */
.admin-filter-pills{
    display:flex !important;
    flex-wrap:wrap !important;
    gap:10px !important;
    margin:0 0 18px !important;
    align-items:center !important;
}
a.admin-filter-pill,
a.admin-filter-pill:visited{
    display:inline-flex !important;
    align-items:center !important;
    gap:7px !important;
    text-decoration:none !important;
    background:#fff !important;
    border:1px solid #dbeafe !important;
    color:#1e293b !important;
    border-radius:999px !important;
    padding:10px 14px !important;
    font-weight:900 !important;
    line-height:1 !important;
    box-shadow:0 10px 24px rgba(15,23,42,.05) !important;
    transition:.18s ease !important;
}
a.admin-filter-pill:hover{
    transform:translateY(-1px) !important;
    border-color:#bfdbfe !important;
    color:#1d4ed8 !important;
    text-decoration:none !important;
}
a.admin-filter-pill b{
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    background:#eff6ff !important;
    color:#1d4ed8 !important;
    border-radius:999px !important;
    padding:3px 8px !important;
    min-width:24px !important;
    font-size:.82rem !important;
    margin-left:2px !important;
}
a.admin-filter-pill.active,
a.admin-filter-pill.active:visited{
    background:#2563eb !important;
    color:#fff !important;
    border-color:#2563eb !important;
}
a.admin-filter-pill.active b{
    background:rgba(255,255,255,.18) !important;
    color:#fff !important;
}
.pet-list-header,.user-list-header{margin-bottom:14px !important;}
@media(max-width:540px){
    a.admin-filter-pill{width:100% !important;justify-content:space-between !important;}
}
</style>

<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>
<?php
$summary = ['pending'=>0,'in_person_confirmation'=>0,'approved'=>0,'rejected'=>0];
$sumResult = $conn->query("SELECT verification_status, COUNT(*) AS total FROM pets GROUP BY verification_status");
while($sr = $sumResult->fetch_assoc()){
    $key = $sr['verification_status'] ?: 'pending';
    if(isset($summary[$key])) $summary[$key] = (int)$sr['total'];
}
?>
<div class="pet-admin-shell">
    <aside class="pet-admin-form-card">
        <div class="pet-section-heading">
            <span class="pet-icon">➕</span>
            <div>
                <h3>Add Walk-in Pet</h3>
                <p>Clinic-added pets are saved as approved after admin entry.</p>
            </div>
        </div>
        <form method="POST" enctype="multipart/form-data" class="pet-walkin-form">
            <?= csrf_field() ?>
            <input type="hidden" name="add_pet" value="1">
            <label class="form-label">Owner</label>
            <select class="form-select" name="owner_id" required>
                <option value="">Select owner</option>
                <?php $owners=$conn->query("SELECT id,full_name FROM users WHERE role='client' ORDER BY full_name ASC"); while($o=$owners->fetch_assoc()): ?>
                    <option value="<?=$o['id']?>"><?=e($o['full_name'])?></option>
                <?php endwhile;?>
            </select>
            <div class="pet-two-col">
                <div><label class="form-label">Pet name</label><input class="form-control" name="name" placeholder="Pet name" required></div>
                <div><label class="form-label">Type</label><select class="form-select" name="species" required><option value="">Pet type</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Other</option></select></div>
            </div>
            <div class="pet-two-col">
                <div><label class="form-label">Breed</label><input class="form-control" name="breed" placeholder="Breed" required></div>
                <div><label class="form-label">Sex</label><select class="form-select" name="sex" required><option value="">Sex</option><option>Male</option><option>Female</option><option>Unknown</option></select></div>
            </div>
            <div class="pet-two-col">
                <div><label class="form-label">Birth date</label><input class="form-control" type="date" name="birth_date" required></div>
                <div><label class="form-label">Weight</label><input class="form-control" type="number" step="0.01" min="0" name="weight" placeholder="kg" required></div>
            </div>
            <label class="form-label">Color / markings</label><input class="form-control" name="color" placeholder="Color / markings" required>
            <label class="form-label">Allergies</label><input class="form-control" name="allergies" placeholder="Allergies or none" required>
            <label class="form-label">Pet picture</label><input class="form-control" type="file" name="pet_photo" accept="image/jpeg,image/png,image/webp" required>
            <label class="form-label">Critical notes</label><textarea class="form-control" name="critical_notes" placeholder="Critical notes or none" required></textarea>
            <label class="form-label">Owner notes</label><textarea class="form-control" name="notes" placeholder="Owner notes" required></textarea>
            <button class="btn btn-primary w-100 mt-2">Save Approved Pet</button>
        </form>
    </aside>

    <section class="pet-admin-list-card">
        <div class="pet-list-header">
            <div>
                <h3>All Pet Profiles</h3>
                <p>Review and update verification status without broken table alignment.</p>
            </div>
            <div class="pet-status-summary">
                <span><b><?=array_sum($summary)?></b> Total</span>
                <span><b><?=$summary['pending']?></b> Pending</span>
                <span><b><?=$summary['in_person_confirmation']?></b> In-person</span>
                <span><b><?=$summary['approved']?></b> Approved</span>
                <span><b><?=$summary['rejected']?></b> Rejected</span>
            </div>
        </div>

        <div class="admin-filter-pills pet-filter-pills">
            <a class="admin-filter-pill <?=$pet_filter==='all'?'active':''?>" href="pets.php<?=$pet_all_search_param?>">All <b><?=array_sum($summary)?></b></a>
            <a class="admin-filter-pill <?=$pet_filter==='pending'?'active':''?>" href="pets.php?verification=pending<?=$pet_search_param?>">Pending <b><?=$summary['pending']?></b></a>
            <a class="admin-filter-pill <?=$pet_filter==='in_person_confirmation'?'active':''?>" href="pets.php?verification=in_person_confirmation<?=$pet_search_param?>">In-person <b><?=$summary['in_person_confirmation']?></b></a>
            <a class="admin-filter-pill <?=$pet_filter==='approved'?'active':''?>" href="pets.php?verification=approved<?=$pet_search_param?>">Approved <b><?=$summary['approved']?></b></a>
            <a class="admin-filter-pill <?=$pet_filter==='rejected'?'active':''?>" href="pets.php?verification=rejected<?=$pet_search_param?>">Rejected <b><?=$summary['rejected']?></b></a>
        </div>

        <form class="admin-list-search" method="GET" action="pets.php">
            <?php if($pet_filter !== 'all'): ?><input type="hidden" name="verification" value="<?=e($pet_filter)?>"><?php endif; ?>
            <input class="form-control" type="search" name="q" value="<?=e($pet_search)?>" placeholder="Search pet, owner, species, breed, notes...">
            <button class="btn btn-primary" type="submit">Search</button>
            <a class="btn btn-light" href="pets.php<?= $pet_filter !== 'all' ? '?verification='.urlencode($pet_filter) : '' ?>">Clear</a>
        </form>

        <div class="pet-card-list">
        <?php $rows=$conn->query("SELECT p.*,u.full_name FROM pets p JOIN users u ON p.owner_id=u.id $pet_where ORDER BY FIELD(p.verification_status,'pending','in_person_confirmation','rejected','approved'), p.created_at DESC"); if($rows->num_rows===0): ?>
            <div class="admin-empty-card">No pet profiles found for this filter or search.</div>
        <?php endif; while($r=$rows->fetch_assoc()): ?>
            <article class="pet-review-card">
                <div class="pet-main-info">
                    <div class="pet-photo-wrap">
                        <?php if(!empty($r['pet_photo'])): ?>
                            <img src="<?=app_url(e($r['pet_photo']))?>" alt="Pet photo">
                        <?php else: ?>
                            <span>PET</span>
                        <?php endif; ?>
                    </div>
                    <div class="pet-title-block">
                        <div class="pet-name-row">
                            <h4><?=e($r['name'])?></h4>
                            <?=badge($r['verification_status'])?>
                        </div>
                        <p class="pet-owner">Owner: <b><?=e($r['full_name'])?></b></p>
                        <div class="pet-detail-chips">
                            <span><?=e($r['species'])?></span>
                            <span><?=e($r['breed'])?></span>
                            <span><?=e($r['sex'])?></span>
                            <span><?=e(pet_age($r['birth_date']))?></span>
                            <span><?=e($r['weight'])?> kg</span>
                        </div>
                        <div class="pet-mini-details">
                            <p><b>Color:</b> <?=e($r['color'])?></p>
                            <p><b>Allergies:</b> <?=e($r['allergies'])?></p>
                            <p><b>Critical notes:</b> <?=e($r['critical_notes'])?></p>
                        </div>
                    </div>
                </div>

                <form method="POST" class="pet-verification-panel">
                    <?= csrf_field() ?>
                    <input type="hidden" name="verify_pet" value="1">
                    <input type="hidden" name="pet_id" value="<?=$r['id']?>">
                    <label class="form-label">Verification status</label>
                    <select class="form-select form-select-sm" name="verification_status">
                        <option value="pending" <?=$r['verification_status']=='pending'?'selected':''?>>Pending</option>
                        <option value="approved" <?=$r['verification_status']=='approved'?'selected':''?>>Approved</option>
                        <option value="rejected" <?=$r['verification_status']=='rejected'?'selected':''?>>Rejected</option>
                        <option value="in_person_confirmation" <?=$r['verification_status']=='in_person_confirmation'?'selected':''?>>In-person Confirmation</option>
                    </select>
                    <label class="form-label">Admin note</label>
                    <textarea class="form-control form-control-sm" name="verification_notes" placeholder="Type admin note here"><?=e($r['verification_notes'])?></textarea>
                    <div class="pet-action-row">
                        <button class="btn btn-sm btn-primary">Update</button>
                        <?php if($r['verification_status']==='approved'): ?>
                            <a class="btn btn-sm btn-outline-primary" href="report_pet.php?pet_id=<?=$r['id']?>">PDF Report</a>
                        <?php else: ?>
                            <span class="pet-report-note">PDF after approval</span>
                        <?php endif; ?>
                    </div>
                </form>
            </article>
        <?php endwhile;?>
        </div>
    </section>
</div></main></div><?php include "../includes/footer.php"; ?>
