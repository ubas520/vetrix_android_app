<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("client");
$uid = current_user_id();
ensure_pet_update_logs_table($conn);

function upload_pet_photo($fieldName) {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
        return [false, 'Please upload a clear pet picture.'];
    }
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $tmp = $_FILES[$fieldName]['tmp_name'];
    $mime = mime_content_type($tmp);
    if (!isset($allowed[$mime])) return [false, 'Pet picture must be JPG, PNG, or WEBP only.'];
    if ($_FILES[$fieldName]['size'] > 3 * 1024 * 1024) return [false, 'Pet picture must not exceed 3MB.'];
    $dir = __DIR__ . '/../uploads/pets';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $filename = 'pet_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($tmp, $dir . '/' . $filename)) return [false, 'Unable to save pet picture. Please try again.'];
    return [true, 'uploads/pets/' . $filename];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['add_pet'])) {
        $required = ['name','species','breed','sex','birth_date','weight','color','allergies','critical_notes','notes'];
        foreach ($required as $field) {
            if (trim($_POST[$field] ?? '') === '') {
                flash('error', 'Please complete all pet details before submitting for verification.');
                redirect_to('client/pets.php');
            }
        }
        [$ok, $photoResult] = upload_pet_photo('pet_photo');
        if (!$ok) { flash('error', $photoResult); redirect_to('client/pets.php'); }
        $status = 'pending';
        $stmt = $conn->prepare("INSERT INTO pets(owner_id,name,species,breed,sex,birth_date,weight,color,allergies,critical_notes,notes,pet_photo,verification_status,last_updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
        $weight = (float)$_POST['weight'];
        $stmt->bind_param("isssssdssssssi", $uid, $_POST['name'], $_POST['species'], $_POST['breed'], $_POST['sex'], $_POST['birth_date'], $weight, $_POST['color'], $_POST['allergies'], $_POST['critical_notes'], $_POST['notes'], $photoResult, $status, $uid);
        $stmt->execute();
        $pet_id = $conn->insert_id;
        log_action($conn, 'Client submitted pet for verification', 'pet', $pet_id, 'Pet profile is pending admin approval.');
        flash('success', 'Pet registration submitted. Please wait for admin verification before using this pet for appointments or QR records.');
        redirect_to('client/pets.php');
    }

    if (isset($_POST['update_pet'])) {
        $pet_id = (int)$_POST['pet_id'];
        $old = $conn->query("SELECT * FROM pets WHERE id=$pet_id AND owner_id=$uid")->fetch_assoc();
        if ($old) {
            $fields = ['name','species','breed','sex','birth_date','weight','color','allergies','critical_notes','notes'];
            foreach ($fields as $field) {
                $new = $_POST[$field] ?? '';
                $oldv = $old[$field] ?? '';
                if ((string)$new !== (string)$oldv) {
                    $stmt = $conn->prepare("INSERT INTO edit_requests(pet_id,client_id,field_name,old_value,new_value) VALUES(?,?,?,?,?)");
                    $stmt->bind_param("iisss", $pet_id, $uid, $field, $oldv, $new);
                    $stmt->execute();
                }
            }
            log_action($conn, 'Client submitted pet edit request', 'pet', $pet_id, 'Pet profile changes pending admin approval.');
            flash('success', 'Your changes were submitted for admin approval.');
        }
        redirect_to('client/pets.php');
    }
}
$title = "My Pets";
include "../includes/header.php";
include "../includes/navbar.php";
$total=$conn->query("SELECT COUNT(*) c FROM pets WHERE owner_id=$uid")->fetch_assoc()['c'];
$approved=$conn->query("SELECT COUNT(*) c FROM pets WHERE owner_id=$uid AND verification_status='approved'")->fetch_assoc()['c'];
$pending=$conn->query("SELECT COUNT(*) c FROM pets WHERE owner_id=$uid AND verification_status='pending'")->fetch_assoc()['c'];
$rejected=$conn->query("SELECT COUNT(*) c FROM pets WHERE owner_id=$uid AND verification_status='rejected'")->fetch_assoc()['c'];
?>
<div class="layout"><?php include "../includes/client_sidebar.php"; ?>
<main class="content">
<section class="hero client-hero-banner mb-4"><h1>My Pets</h1><p>Submit complete pet details and review your registered pets in a clean clinic-card layout.</p></section>
<?php if($m = flash('success')): ?><div class="alert alert-success"><?= e($m) ?></div><?php endif; ?>
<?php if($m = flash('error')): ?><div class="alert alert-danger"><?= e($m) ?></div><?php endif; ?>

<div class="row g-4">
<div class="col-lg-4"><div class="soft-card pet-form-card"><h3>Register My Pet</h3><form method="POST" enctype="multipart/form-data" class="pet-form-grid">
<input type="hidden" name="add_pet" value="1">
<div><label class="field-label" for="pet_name">Pet Name</label><input id="pet_name" class="form-control" name="name" placeholder="Enter pet name" required></div>
<div class="pet-form-row">
<div><label class="field-label" for="pet_species">Pet Type</label><select id="pet_species" class="form-select" name="species" required><option value="">Select type</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Other</option></select></div>
<div><label class="field-label" for="pet_sex">Sex</label><select id="pet_sex" class="form-select" name="sex" required><option value="">Select sex</option><option>Male</option><option>Female</option><option>Unknown</option></select></div>
</div>
<div><label class="field-label" for="pet_breed">Breed</label><input id="pet_breed" class="form-control" name="breed" placeholder="Enter breed or mixed breed" required></div>
<div class="pet-form-row">
<div><label class="field-label" for="add_pet_birth_date">Pet Birthdate</label><input id="add_pet_birth_date" class="form-control" type="date" name="birth_date" required></div>
<div><label class="field-label" for="pet_weight">Weight</label><input id="pet_weight" class="form-control" type="number" step="0.01" min="0" name="weight" placeholder="kg" required></div>
</div>
<div><label class="field-label" for="pet_color">Color / Markings</label><input id="pet_color" class="form-control" name="color" placeholder="Ex. Brown with white spots" required></div>
<div><label class="field-label" for="pet_allergies">Known Allergies</label><input id="pet_allergies" class="form-control" name="allergies" placeholder="Write none if not applicable" required></div>
<div><label class="field-label" for="pet_photo">Pet Picture</label><input id="pet_photo" class="form-control" type="file" name="pet_photo" accept="image/jpeg,image/png,image/webp" required><small class="text-muted">JPG, PNG, or WEBP. Max 3MB.</small></div>
<div><label class="field-label" for="pet_emergency_notes">Emergency Notes</label><textarea id="pet_emergency_notes" class="form-control" name="critical_notes" placeholder="Important notes for urgent care. Write none if not applicable." required></textarea></div>
<div><label class="field-label" for="pet_behavior_notes">Behavior / Habits / Food</label><textarea id="pet_behavior_notes" class="form-control" name="notes" placeholder="Behavior, food, or care notes" required></textarea></div>
<button class="btn btn-primary w-100">Submit for Verification</button></form></div></div>

<div class="col-lg-8">
    <div class="reference-filter-bar" id="clientPetsFilterBar">
        <button type="button" class="reference-filter-chip active" data-filter="all">All <span class="count"><?=$total?></span></button>
        <button type="button" class="reference-filter-chip" data-filter="approved">Approved <span class="count"><?=$approved?></span></button>
        <button type="button" class="reference-filter-chip" data-filter="pending">Pending <span class="count"><?=$pending?></span></button>
        <?php if((int)$rejected > 0): ?><button type="button" class="reference-filter-chip" data-filter="rejected">Rejected <span class="count"><?=$rejected?></span></button><?php endif; ?>
    </div>
    <div class="reference-list">
    <?php $rows = $conn->query("SELECT * FROM pets WHERE owner_id=$uid ORDER BY created_at DESC"); if($rows->num_rows===0): ?>
        <div class="empty-state soft-card"><h3>No pets registered yet</h3><p class="text-muted">Register your pet first, then wait for admin approval.</p></div>
    <?php endif; while($r = $rows->fetch_assoc()): ?>
        <?php $lastVetEdit = $conn->query("SELECT l.*,u.full_name,u.email,u.phone FROM pet_update_logs l JOIN users u ON l.updated_by=u.id WHERE l.pet_id=".(int)$r['id']." ORDER BY l.created_at DESC LIMIT 1")->fetch_assoc(); ?>
        <article class="reference-card client-pet-filter-item" data-pet-status="<?= e(strtolower($r['verification_status'])) ?>">
            <div class="reference-main">
                <div class="reference-icon"><?php if(!empty($r['pet_photo'])): ?><img src="<?= app_url(e($r['pet_photo'])) ?>" alt="Pet photo"><?php else: ?>🐾<?php endif; ?></div>
                <div>
                    <div class="reference-title-row"><h2><?= e($r['name']) ?></h2><?= badge($r['verification_status']) ?></div>
                    <p class="reference-subtitle"><?= e($r['species']) ?> · <?= e($r['breed']) ?> · Age: <?= e(pet_age($r['birth_date'])) ?></p>
                    <div class="reference-tags"><span class="reference-tag"><?=e($r['sex'])?></span><span class="reference-tag"><?=e($r['color'])?></span><span class="reference-tag"><?=e($r['weight'])?> kg</span></div>
                    <div class="reference-details">
                        <div class="reference-detail"><label>Allergies</label><strong><?= e($r['allergies']) ?></strong></div>
                        <div class="reference-detail"><label>Emergency Notes</label><strong><?= e($r['critical_notes']) ?></strong></div>
                        <div class="reference-detail"><label>Behavior / Habits</label><strong><?= e($r['notes']) ?></strong></div>
                        <div class="reference-detail"><label>Registered</label><strong><?= e(date('M d, Y', strtotime($r['created_at']))) ?></strong></div>
                    </div>
                </div>
            </div>
            <aside class="reference-summary">
                <h3>Pet Summary</h3>
                <p><b>Status:</b> <?= e(ucfirst($r['verification_status'])) ?></p>
                <?php if(!empty($lastVetEdit)): ?>
                    <div class="reference-note vet-transparency-note">
                        <b>Edited by Vet:</b> <?=e($lastVetEdit['full_name'])?><br>
                        <small><?=e($lastVetEdit['email'] ?: 'No email saved')?> · <?=e($lastVetEdit['phone'] ?: 'No phone saved')?></small><br>
                        <small><?=e(date('M d, Y h:i A', strtotime($lastVetEdit['created_at'])))?></small><br>
                        <span><?=e($lastVetEdit['changes_summary'])?></span>
                    </div>
                <?php endif; ?>
                <?php if($r['verification_status'] !== 'approved'): ?><p class="reference-note">Only approved pets can be used for appointments, QR, medical records, and vaccination records.</p><?php endif; ?>
                <?php if(!empty($r['verification_notes'])): ?><p><b>Clinic note:</b> <?= e($r['verification_notes']) ?></p><?php endif; ?>
                <details class="reference-manage">
                    <summary>Edit Pet Details</summary>
                    <form method="POST" class="reference-mini-form">
                        <input type="hidden" name="update_pet" value="1"><input type="hidden" name="pet_id" value="<?= $r['id'] ?>">
                        <input class="form-control" name="name" value="<?= e($r['name']) ?>" required>
                        <input class="form-control" name="species" value="<?= e($r['species']) ?>" required>
                        <input class="form-control" name="breed" value="<?= e($r['breed']) ?>" required>
                        <select class="form-select" name="sex" required><option <?= $r['sex']=='Male'?'selected':'' ?>>Male</option><option <?= $r['sex']=='Female'?'selected':'' ?>>Female</option><option <?= $r['sex']=='Unknown'?'selected':'' ?>>Unknown</option></select>
                        <input class="form-control" type="date" name="birth_date" value="<?= e($r['birth_date']) ?>" required>
                        <input class="form-control" type="number" step="0.01" name="weight" value="<?= e($r['weight']) ?>" required>
                        <input class="form-control" name="color" value="<?= e($r['color']) ?>" required>
                        <input class="form-control" name="allergies" value="<?= e($r['allergies']) ?>" required>
                        <textarea class="form-control" name="critical_notes" required><?= e($r['critical_notes']) ?></textarea>
                        <textarea class="form-control" name="notes" required><?= e($r['notes']) ?></textarea>
                        <button class="btn btn-primary rounded-pill">Request Changes</button>
                    </form>
                </details>
            </aside>
        </article>
    <?php endwhile; ?>
    </div>
    <div class="soft-card reference-empty-filter" id="clientPetsEmptyFilter" style="display:none;"><h3>No pets found for this filter</h3><p class="text-muted mb-0">Try selecting another pet status.</p></div>
</div>
</div>

<div class="soft-card mt-4">
<div class="reference-section-title"><h2>Pending Pet Edit Requests</h2></div>
<table class="table"><tr><th>Pet</th><th>Field</th><th>New Value</th><th>Status</th></tr>
<?php $req=$conn->query("SELECT er.*,p.name pet_name FROM edit_requests er JOIN pets p ON er.pet_id=p.id WHERE er.client_id=$uid ORDER BY er.created_at DESC LIMIT 10"); if($req->num_rows==0): ?>
<tr><td colspan="4" class="text-muted">No pending edit requests.</td></tr>
<?php endif; while($rq=$req->fetch_assoc()): ?>
<tr><td><?=e($rq['pet_name'])?></td><td><?=e($rq['field_name'])?></td><td><?=e($rq['new_value'])?></td><td><?=badge($rq['status'])?></td></tr>
<?php endwhile; ?></table>
</div>

<script>
document.addEventListener('DOMContentLoaded', function(){
    const filterBar = document.getElementById('clientPetsFilterBar');
    const petCards = Array.from(document.querySelectorAll('.client-pet-filter-item[data-pet-status]'));
    const emptyState = document.getElementById('clientPetsEmptyFilter');
    if(!filterBar || !petCards.length) return;

    filterBar.addEventListener('click', function(event){
        const chip = event.target.closest('.reference-filter-chip');
        if(!chip) return;
        event.preventDefault();
        event.stopPropagation();

        const selected = (chip.dataset.filter || 'all').toLowerCase();
        filterBar.querySelectorAll('.reference-filter-chip').forEach(btn => btn.classList.remove('active'));
        chip.classList.add('active');

        let shown = 0;
        petCards.forEach(card => {
            const status = (card.dataset.petStatus || '').toLowerCase();
            const match = selected === 'all' || status === selected;
            card.style.display = match ? '' : 'none';
            if(!match){
                card.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open'));
            }
            if(match) shown++;
        });
        if(emptyState) emptyState.style.display = shown ? 'none' : '';
    });
});
</script>
</main></div><?php include "../includes/footer.php"; ?>
