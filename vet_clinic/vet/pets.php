<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("veterinarian");
ensure_pet_update_logs_table($conn);
$uid = current_user_id();

function vet_upload_pet_photo($fieldName) {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) return [true, null];
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

function pretty_field_name($field) {
    $labels = [
        'name'=>'Name', 'species'=>'Pet Type', 'breed'=>'Breed', 'sex'=>'Sex', 'birth_date'=>'Birth Date',
        'weight'=>'Weight', 'color'=>'Color / Markings', 'allergies'=>'Allergies',
        'critical_notes'=>'Critical Notes', 'notes'=>'Behavior / Care Notes', 'pet_photo'=>'Pet Photo'
    ];
    return $labels[$field] ?? ucfirst(str_replace('_',' ', $field));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['vet_update_pet'])) {
    $pet_id = (int)($_POST['pet_id'] ?? 0);
    $stmt = $conn->prepare("SELECT p.*, u.full_name AS owner_name, u.email AS owner_email FROM pets p JOIN users u ON p.owner_id=u.id WHERE p.id=? LIMIT 1");
    $stmt->bind_param("i", $pet_id);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc();

    if (!$old) {
        flash('error', 'Pet record was not found.');
        redirect_to('vet/pets.php');
    }

    $fields = ['name','species','breed','sex','birth_date','weight','color','allergies','critical_notes','notes'];
    $data = [];
    foreach ($fields as $field) $data[$field] = trim($_POST[$field] ?? '');
    if ($data['weight'] !== '') $data['weight'] = number_format((float)$data['weight'], 2, '.', '');

    [$photoOk, $photoPath] = vet_upload_pet_photo('pet_photo');
    if (!$photoOk) {
        flash('error', $photoPath);
        redirect_to('vet/pets.php?edit='.$pet_id);
    }
    if ($photoPath) $data['pet_photo'] = $photoPath;

    $changed = [];
    $oldValues = [];
    $newValues = [];
    foreach ($data as $field => $newValue) {
        $oldValue = (string)($old[$field] ?? '');
        if ((string)$newValue !== $oldValue) {
            $changed[] = pretty_field_name($field);
            $oldValues[$field] = $oldValue;
            $newValues[$field] = $newValue;
        }
    }

    if (!$changed) {
        flash('success', 'No pet details were changed.');
        redirect_to('vet/pets.php?edit='.$pet_id);
    }

    $sql = "UPDATE pets SET name=?, species=?, breed=?, sex=?, birth_date=?, weight=?, color=?, allergies=?, critical_notes=?, notes=?";
    $types = "sssssdssss";
    $params = [$data['name'], $data['species'], $data['breed'], $data['sex'], $data['birth_date'], (float)$data['weight'], $data['color'], $data['allergies'], $data['critical_notes'], $data['notes']];
    if ($photoPath) {
        $sql .= ", pet_photo=?";
        $types .= "s";
        $params[] = $photoPath;
    }
    $sql .= ", last_updated_by=?, updated_at=NOW() WHERE id=?";
    $types .= "ii";
    $params[] = $uid;
    $params[] = $pet_id;

    $update = $conn->prepare($sql);
    $update->bind_param($types, ...$params);
    $update->execute();

    $vet = $conn->query("SELECT full_name,email,phone FROM users WHERE id=".(int)$uid)->fetch_assoc();
    $vetName = $vet['full_name'] ?? 'Veterinarian';
    $vetEmail = $vet['email'] ?? 'No email saved';
    $vetPhone = $vet['phone'] ?? 'No phone saved';
    $summary = 'Updated by '.$vetName.' ('.$vetEmail.') on '.date('M d, Y h:i A').'. Changed: '.implode(', ', $changed).'.';
    $oldJson = json_encode($oldValues, JSON_UNESCAPED_UNICODE);
    $newJson = json_encode($newValues, JSON_UNESCAPED_UNICODE);
    $log = $conn->prepare("INSERT INTO pet_update_logs(pet_id,updated_by,changes_summary,old_values,new_values) VALUES(?,?,?,?,?)");
    $log->bind_param("iisss", $pet_id, $uid, $summary, $oldJson, $newJson);
    $log->execute();

    $message = 'Dr./Vet '.$vetName.' edited the details of '.$old['name'].'. Changed fields: '.implode(', ', $changed).'. Vet details: '.$vetName.' | '.$vetEmail.' | '.$vetPhone.'.';
    notify_user($conn, (int)$old['owner_id'], 'Pet Details Updated by Vet', $message, 'record');
    log_action($conn, 'Veterinarian edited pet details', 'pet', $pet_id, $summary);

    flash('success', 'Pet details updated. The client was notified with your details for transparency.');
    redirect_to('vet/pets.php?edit='.$pet_id);
}

$title = "Pets";
include "../includes/header.php";
include "../includes/navbar.php";
$total = $conn->query("SELECT COUNT(*) c FROM pets")->fetch_assoc()['c'];
$approved = $conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='approved'")->fetch_assoc()['c'];
$pending = $conn->query("SELECT COUNT(*) c FROM pets WHERE verification_status='pending'")->fetch_assoc()['c'];
$editId = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
$pet_search = trim($_GET['q'] ?? '');
$pet_where = '';
if ($pet_search !== '') {
    $safePetSearch = $conn->real_escape_string($pet_search);
    $pet_where = "WHERE p.name LIKE '%$safePetSearch%' OR p.species LIKE '%$safePetSearch%' OR p.breed LIKE '%$safePetSearch%' OR p.color LIKE '%$safePetSearch%' OR p.allergies LIKE '%$safePetSearch%' OR p.critical_notes LIKE '%$safePetSearch%' OR p.notes LIKE '%$safePetSearch%' OR u.full_name LIKE '%$safePetSearch%' OR u.email LIKE '%$safePetSearch%' OR u.phone LIKE '%$safePetSearch%'";
}
$rows = $conn->query("SELECT p.*,u.full_name owner_name,u.phone,u.email, updater.full_name updated_by_name, updater.role updated_by_role FROM pets p JOIN users u ON p.owner_id=u.id LEFT JOIN users updater ON p.last_updated_by=updater.id $pet_where ORDER BY p.updated_at DESC, p.created_at DESC");
?>
<div class="layout"><?php include "../includes/vet_sidebar.php"; ?>
<main class="content">
<section class="hero admin-hero-banner mb-4"><h1>Pets</h1><p>Main veterinarian pet directory. Edit important pet details, health notes, and owner-visible information with transparent client notifications.</p></section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>


<div class="reference-filter-bar" id="vetPetsFilterBar">
    <button type="button" class="reference-filter-chip active" data-filter="all">All Pets <span class="count"><?=$total?></span></button>
    <button type="button" class="reference-filter-chip" data-filter="approved">Approved <span class="count"><?=$approved?></span></button>
    <button type="button" class="reference-filter-chip" data-filter="pending">Pending <span class="count"><?=$pending?></span></button>
</div>

<form class="admin-list-search" method="GET" action="pets.php">
    <input class="form-control" type="search" name="q" value="<?=e($pet_search)?>" placeholder="Search pet, owner, species, breed, notes...">
    <button class="btn btn-primary" type="submit">Search</button>
    <a class="btn btn-light" href="pets.php">Clear</a>
</form>

<div class="reference-list">
<?php if($rows->num_rows===0): ?><div class="soft-card"><h3>No pets found</h3><p class="text-muted">Try another status filter or search term.</p></div><?php endif; ?>
<?php while($p=$rows->fetch_assoc()): ?>
    <details class="reference-expand-card" data-status="<?=e(strtolower($p['verification_status'] ?? 'registered'))?>" <?=$editId===(int)$p['id']?'open':''?>>
        <summary class="reference-expand-summary">
            <div class="reference-icon reference-icon-sm"><?php if(!empty($p['pet_photo'])): ?><img src="<?=app_url(e($p['pet_photo']))?>" alt="Pet photo"><?php else: ?>PET<?php endif; ?></div>
            <div class="reference-expand-head">
                <div class="reference-title-row compact"><h2><?=e($p['name'])?></h2><?=badge($p['verification_status'] ?? 'registered')?></div>
                <p class="reference-subtitle mb-0">Owner: <?=e($p['owner_name'])?> &middot; <?=e($p['email'] ?? '')?></p>
            </div>
            <div class="reference-quick-meta"><span>Pet Info</span><strong><?=e($p['species'])?> &middot; <?=e($p['breed'] ?: 'Breed not set')?></strong></div>
            <div class="reference-quick-meta hide-sm"><span>Last Updated</span><strong><?=e(!empty($p['updated_at']) ? date('M d, Y', strtotime($p['updated_at'])) : 'Not updated')?></strong></div>
            <span class="reference-expand-pill">View / Edit</span>
        </summary>
        <div class="reference-expand-body">
            <div class="reference-expand-info">
                <div class="reference-tags"><span class="reference-tag"><?=e($p['species'])?></span><span class="reference-tag"><?=e($p['breed'] ?: 'Breed not set')?></span><span class="reference-tag">Age: <?=e(pet_age($p['birth_date']))?></span><span class="reference-tag"><?=e($p['weight'])?> kg</span></div>
                <div class="reference-details">
                    <div class="reference-detail"><label>Owner Contact</label><strong><?=e($p['phone'] ?: 'No phone saved')?></strong></div>
                    <div class="reference-detail"><label>Color / Markings</label><strong><?=e($p['color'] ?: 'Not specified')?></strong></div>
                    <div class="reference-detail"><label>Allergies</label><strong><?=e($p['allergies'] ?: 'No allergies saved.')?></strong></div>
                    <div class="reference-detail"><label>Critical Notes</label><strong><?=e($p['critical_notes'] ?: 'No critical notes.')?></strong></div>
                    <div class="reference-detail"><label>Behavior / Habits</label><strong><?=e($p['notes'] ?: 'No notes saved.')?></strong></div>
                    <div class="reference-detail"><label>Updated By</label><strong><?=e($p['updated_by_name'] ? $p['updated_by_name'].' ('.$p['updated_by_role'].')' : 'Not recorded')?></strong></div>
                </div>
            </div>
            <aside class="reference-summary">
                <h3>Edit Pet Details</h3>
                <p class="text-muted">After saving, the client will receive a notification showing the changed fields and the vet who edited the pet.</p>
                <form method="POST" enctype="multipart/form-data" class="reference-mini-form">
                    <input type="hidden" name="vet_update_pet" value="1"><input type="hidden" name="pet_id" value="<?=$p['id']?>">
                    <input class="form-control" name="name" value="<?=e($p['name'])?>" required>
                    <select class="form-select" name="species" required><option <?= $p['species']=='Dog'?'selected':'' ?>>Dog</option><option <?= $p['species']=='Cat'?'selected':'' ?>>Cat</option><option <?= $p['species']=='Rabbit'?'selected':'' ?>>Rabbit</option><option <?= $p['species']=='Bird'?'selected':'' ?>>Bird</option><option <?= $p['species']=='Other'?'selected':'' ?>>Other</option></select>
                    <input class="form-control" name="breed" value="<?=e($p['breed'])?>" required>
                    <select class="form-select" name="sex" required><option <?= $p['sex']=='Male'?'selected':'' ?>>Male</option><option <?= $p['sex']=='Female'?'selected':'' ?>>Female</option><option <?= $p['sex']=='Unknown'?'selected':'' ?>>Unknown</option></select>
                    <input class="form-control" type="date" name="birth_date" value="<?=e($p['birth_date'])?>" required>
                    <input class="form-control" type="number" step="0.01" min="0" name="weight" value="<?=e($p['weight'])?>" required>
                    <input class="form-control" name="color" value="<?=e($p['color'])?>" required>
                    <input class="form-control" name="allergies" value="<?=e($p['allergies'])?>" required>
                    <textarea class="form-control" name="critical_notes" required><?=e($p['critical_notes'])?></textarea>
                    <textarea class="form-control" name="notes" required><?=e($p['notes'])?></textarea>
                    <label class="form-label small text-muted mb-0">Replace pet photo optional</label><input class="form-control" type="file" name="pet_photo" accept="image/jpeg,image/png,image/webp">
                    <button class="btn btn-primary rounded-pill">Save and Notify Client</button>
                </form>
            </aside>
        </div>
    </details>
<?php endwhile; ?>
    <div class="soft-card reference-empty-filter" id="vetPetsEmptyFilter" style="display:none;"><h3>No pets found for this filter</h3><p class="text-muted">Try selecting another pet status.</p></div>
</div>
<script>
document.addEventListener('DOMContentLoaded', function(){
    const filterBar = document.getElementById('vetPetsFilterBar');
    const cards = Array.from(document.querySelectorAll('.reference-expand-card[data-status]'));
    const emptyState = document.getElementById('vetPetsEmptyFilter');
    if(!filterBar || !cards.length) return;
    filterBar.addEventListener('click', function(event){
        const chip = event.target.closest('.reference-filter-chip');
        if(!chip) return;
        event.preventDefault();
        const selected = (chip.dataset.filter || 'all').toLowerCase();
        filterBar.querySelectorAll('.reference-filter-chip').forEach(btn => btn.classList.remove('active'));
        chip.classList.add('active');
        let shown = 0;
        cards.forEach(card => {
            const status = (card.dataset.status || '').toLowerCase();
            const match = selected === 'all' || status === selected;
            card.style.display = match ? '' : 'none';
            if(!match) card.removeAttribute('open');
            if(match) shown++;
        });
        if(emptyState) emptyState.style.display = shown ? 'none' : '';
    });
});
</script>
</main></div><?php include "../includes/footer.php"; ?>
