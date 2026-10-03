<?php require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("veterinarian");
if($_SERVER['REQUEST_METHOD']==='POST'){$stmt=$conn->prepare("INSERT INTO medical_records(pet_id,veterinarian,visit_date,diagnosis,treatment,prescription,notes) VALUES(?,?,?,?,?,?,?)");$stmt->bind_param("issssss",$_POST['pet_id'],$_POST['veterinarian'],$_POST['visit_date'],$_POST['diagnosis'],$_POST['treatment'],$_POST['prescription'],$_POST['notes']);$stmt->execute();$rid=$conn->insert_id; $owner=$conn->query("SELECT owner_id,name FROM pets WHERE id=".(int)$_POST['pet_id'])->fetch_assoc(); if($owner){ notify_user($conn,$owner['owner_id'],'Medical Record Added','A new medical record was added for '.$owner['name'].'.','record'); } log_action($conn,'Veterinarian added medical record','medical_record',$rid,'Manual record entry.'); flash('success','Record saved.');redirect_to('vet/records.php');}
$record_search = trim($_GET['q'] ?? '');
$record_where = '';
if ($record_search !== '') {
    $safeRecordSearch = $conn->real_escape_string($record_search);
    $record_where = "WHERE p.name LIKE '%$safeRecordSearch%' OR m.veterinarian LIKE '%$safeRecordSearch%' OR m.diagnosis LIKE '%$safeRecordSearch%' OR m.treatment LIKE '%$safeRecordSearch%' OR m.prescription LIKE '%$safeRecordSearch%' OR m.notes LIKE '%$safeRecordSearch%'";
}
$recordSummary = $conn->query("SELECT COUNT(*) total_records, SUM(visit_date=CURDATE()) today_records, COUNT(DISTINCT pet_id) pets_with_records FROM medical_records")->fetch_assoc();
$title="Medical Records"; include "../includes/header.php"; include "../includes/navbar.php"; ?>
<div class="layout"><?php include "../includes/vet_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4"><h1>Medical Records</h1><p>Store consultation details, diagnosis, treatment, and use the calendar to record the actual visit date.</p></section>

    <?php if($m=flash('success')):?>
        <div class="alert alert-success"><?=e($m)?></div>
    <?php endif;?>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Records</span><b><?= (int)($recordSummary['total_records'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Today</span><b><?= (int)($recordSummary['today_records'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Pets With Records</span><b><?= (int)($recordSummary['pets_with_records'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Visible Results</span><b><?= (int)$conn->query("SELECT COUNT(*) c FROM medical_records m JOIN pets p ON m.pet_id=p.id $record_where")->fetch_assoc()['c'] ?></b></div>
    </section>

    <div class="row g-4 align-items-start">
        <div class="col-lg-4">
            <div class="soft-card">
                <h3>Add Record</h3>
                <form method="POST">
                    <label class="form-label fw-bold mb-1">Pet</label>
                    <select class="form-select" name="pet_id">
                        <?php $pets=$conn->query("SELECT id,name FROM pets WHERE verification_status='approved'"); while($p=$pets->fetch_assoc()): ?>
                            <option value="<?=$p['id']?>"><?=e($p['name'])?></option>
                        <?php endwhile;?>
                    </select>

                    <label class="form-label fw-bold mb-1">Veterinarian</label>
                    <input class="form-control" name="veterinarian" placeholder="Veterinarian">

                    <label class="form-label fw-bold mb-1">Visit Date</label>
                    <input class="form-control" type="date" name="visit_date" required>
                    <div class="field-help">Use the calendar to select the actual consultation, check-up, or treatment date.</div>

                    <label class="form-label fw-bold mb-1">Diagnosis</label>
                    <textarea class="form-control" name="diagnosis" placeholder="Diagnosis"></textarea>

                    <label class="form-label fw-bold mb-1">Treatment</label>
                    <textarea class="form-control" name="treatment" placeholder="Treatment"></textarea>

                    <label class="form-label fw-bold mb-1">Prescription</label>
                    <textarea class="form-control" name="prescription" placeholder="Prescription"></textarea>

                    <label class="form-label fw-bold mb-1">Notes</label>
                    <textarea class="form-control" name="notes" placeholder="Notes"></textarea>

                    <button class="btn btn-primary w-100 mt-2">Save</button>
                </form>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="table-card">
                <div class="section-head mb-3">
                    <div>
                        <h3>Medical Record List</h3>
                        <p class="text-muted mb-0">Recently saved records with diagnosis and treatment details.</p>
                    </div>
                </div>
                <form class="admin-list-search" method="GET" action="records.php">
                    <input class="form-control" type="search" name="q" value="<?=e($record_search)?>" placeholder="Search pet, veterinarian, diagnosis, treatment...">
                    <button class="btn btn-primary" type="submit">Search</button>
                    <a class="btn btn-light" href="records.php">Clear</a>
                </form>
                <?php $rows=$conn->query("SELECT m.*,p.name pet_name FROM medical_records m JOIN pets p ON m.pet_id=p.id $record_where ORDER BY visit_date DESC"); ?>
                <?php if($rows->num_rows===0): ?>
                    <div class="admin-empty-state">
                        <h3>No medical records found</h3>
                        <p>Try another search term or add a new record.</p>
                    </div>
                <?php else: ?>
                    <div class="admin-card-list">
                        <?php while($r=$rows->fetch_assoc()): ?>
                            <article class="admin-review-card">
                                <div class="admin-review-main">
                                    <div class="admin-row-title">
                                        <h3><?=e($r['pet_name'])?></h3>
                                        <span><?=e($r['visit_date'] ?: 'No date')?></span>
                                    </div>
                                    <p><?=e($r['diagnosis'] ?: 'No diagnosis saved.')?></p>
                                    <div class="admin-compare-grid">
                                        <div><span>Treatment</span><p><?=e($r['treatment'] ?: 'No treatment saved.')?></p></div>
                                        <div><span>Prescription</span><p><?=e($r['prescription'] ?: 'No prescription saved.')?></p></div>
                                    </div>
                                    <?php if(!empty($r['notes'])): ?><div class="admin-note-box"><?=e($r['notes'])?></div><?php endif; ?>
                                </div>
                            </article>
                        <?php endwhile;?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</main>
</div>
<?php include "../includes/footer.php"; ?>
