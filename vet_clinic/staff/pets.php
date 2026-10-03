<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("staff");

function upload_pet_photo_staff($fieldName) {
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

if($_SERVER['REQUEST_METHOD']==='POST'){
    $staff_id = current_user_id();
    $required = ['owner_id','name','species','breed','sex','birth_date','weight','color','allergies','critical_notes','notes'];
    foreach ($required as $field) {
        if (trim($_POST[$field] ?? '') === '') { flash('error','Please complete all pet details and upload a picture.'); redirect_to('staff/pets.php'); }
    }
    [$ok,$photo] = upload_pet_photo_staff('pet_photo');
    if (!$ok) { flash('error',$photo); redirect_to('staff/pets.php'); }
    $status = 'pending';
    $verification_notes = 'Submitted by staff. Waiting for admin verification.';
    $stmt=$conn->prepare("INSERT INTO pets(owner_id,name,species,breed,sex,birth_date,weight,color,allergies,critical_notes,notes,pet_photo,verification_status,verification_notes,last_updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
    $weight=(float)$_POST['weight'];
    $owner=(int)$_POST['owner_id'];
    $stmt->bind_param("isssssdsssssssi", $owner,$_POST['name'],$_POST['species'],$_POST['breed'],$_POST['sex'],$_POST['birth_date'],$weight,$_POST['color'],$_POST['allergies'],$_POST['critical_notes'],$_POST['notes'],$photo,$status,$verification_notes,$staff_id);
    $stmt->execute();
    $pet_id=$conn->insert_id;
    log_action($conn,'Staff submitted pet profile for admin verification','pet',$pet_id,'Pet added by staff and pending admin verification.');
    notify_user($conn,$owner,'Pet Profile Submitted','The clinic staff submitted a pet profile for '.$_POST['name'].'. Please wait for admin verification.','record');
    flash('success','Pet submitted. Admin verification is required before it becomes active.');
    redirect_to('staff/pets.php');
}
$title="Pets"; include "../includes/header.php"; include "../includes/navbar.php"; ?>
<div class="layout"><?php include "../includes/staff_sidebar.php"; ?><main class="content">
<section class="hero staff-light-hero admin-hero-banner mb-4"><h1>Pet Profiles</h1><p>Staff can submit walk-in pet details. Admin approval is required before the pet becomes active.</p></section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>
<div class="row">
<div class="col-lg-4"><div class="soft-card"><h3>Submit Walk-in Pet</h3><form method="POST" enctype="multipart/form-data">
<select class="form-select mb-2" name="owner_id" required><option value="">Owner</option><?php $owners=$conn->query("SELECT id,full_name FROM users WHERE role='client'"); while($o=$owners->fetch_assoc()): ?><option value="<?=$o['id']?>"><?=e($o['full_name'])?></option><?php endwhile;?></select>
<input class="form-control mb-2" name="name" placeholder="Pet name" required>
<select class="form-select mb-2" name="species" required><option value="">Pet type</option><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Other</option></select>
<input class="form-control mb-2" name="breed" placeholder="Breed" required>
<select class="form-select mb-2" name="sex" required><option value="">Sex</option><option>Male</option><option>Female</option><option>Unknown</option></select>
<input class="form-control mb-2" type="date" name="birth_date" required>
<input class="form-control mb-2" type="number" step="0.01" min="0" name="weight" placeholder="Weight kg" required>
<input class="form-control mb-2" name="color" placeholder="Color / markings" required>
<input class="form-control mb-2" name="allergies" placeholder="Allergies or none" required>
<input class="form-control mb-2" type="file" name="pet_photo" accept="image/jpeg,image/png,image/webp" required>
<textarea class="form-control mb-2" name="critical_notes" placeholder="Critical notes or none" required></textarea>
<textarea class="form-control mb-3" name="notes" placeholder="Owner notes" required></textarea>
<button class="btn btn-primary w-100">Submit for Admin Verification</button></form></div></div>
<div class="col-lg-8"><div class="table-card"><h3>All Pet Profiles</h3><table class="table align-middle"><tr><th>Pet</th><th>Owner</th><th>Details</th><th>Status</th><th>Notes</th></tr>
<?php $rows=$conn->query("SELECT p.*,u.full_name FROM pets p JOIN users u ON p.owner_id=u.id ORDER BY FIELD(p.verification_status,'pending','in_person_confirmation','rejected','approved'), p.created_at DESC"); while($r=$rows->fetch_assoc()): ?>
<tr><td><?php if(!empty($r['pet_photo'])): ?><img src="<?=app_url(e($r['pet_photo']))?>" style="width:62px;height:62px;object-fit:cover;border-radius:14px;display:block;margin-bottom:6px;"><?php endif; ?><b><?=e($r['name'])?></b><br><span class="small text-muted">Age: <?=e(pet_age($r['birth_date']))?></span></td><td><?=e($r['full_name'])?></td><td><?=e($r['species'])?> · <?=e($r['breed'])?><br><?=e($r['weight'])?> kg</td><td><?=badge($r['verification_status'])?></td><td><?=e($r['verification_notes'])?></td></tr>
<?php endwhile;?></table></div></div>
</div></main></div><?php include "../includes/footer.php"; ?>
