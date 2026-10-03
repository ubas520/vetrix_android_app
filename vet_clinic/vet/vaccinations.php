<?php require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("veterinarian");
if($_SERVER['REQUEST_METHOD']==='POST'){$stmt=$conn->prepare("INSERT INTO vaccinations(pet_id,vaccine_name,date_given,next_due_date,administered_by,remarks) VALUES(?,?,?,?,?,?)");$stmt->bind_param("isssss",$_POST['pet_id'],$_POST['vaccine_name'],$_POST['date_given'],$_POST['next_due_date'],$_POST['administered_by'],$_POST['remarks']);$stmt->execute();flash('success','Vaccination saved.');redirect_to('vet/vaccinations.php');}
$vaccine_search = trim($_GET['q'] ?? '');
$vaccine_where = '';
if ($vaccine_search !== '') {
    $safeVaccineSearch = $conn->real_escape_string($vaccine_search);
    $vaccine_where = "WHERE p.name LIKE '%$safeVaccineSearch%' OR v.vaccine_name LIKE '%$safeVaccineSearch%' OR v.administered_by LIKE '%$safeVaccineSearch%' OR v.remarks LIKE '%$safeVaccineSearch%'";
}
$vaccineSummary = $conn->query("SELECT COUNT(*) total_vaccines, SUM(next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)) due_soon, SUM(next_due_date < CURDATE()) overdue, COUNT(DISTINCT pet_id) pets_vaccinated FROM vaccinations")->fetch_assoc();
$title="Vaccinations"; include "../includes/header.php"; include "../includes/navbar.php"; ?>
<div class="layout"><?php include "../includes/vet_sidebar.php"; ?>
<main class="content">
    <section class="hero admin-hero-banner mb-4"><h1>Vaccinations</h1><p>Save vaccination details, monitor dates given, and keep track of each pet's next due schedule.</p></section>

    <?php if($m=flash('success')):?>
        <div class="alert alert-success"><?=e($m)?></div>
    <?php endif;?>

    <section class="admin-summary-grid mb-4">
        <div class="admin-summary-card"><span>Total Vaccines</span><b><?= (int)($vaccineSummary['total_vaccines'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Due Soon</span><b><?= (int)($vaccineSummary['due_soon'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Overdue</span><b><?= (int)($vaccineSummary['overdue'] ?? 0) ?></b></div>
        <div class="admin-summary-card"><span>Pets Vaccinated</span><b><?= (int)($vaccineSummary['pets_vaccinated'] ?? 0) ?></b></div>
    </section>

    <div class="row g-4 align-items-start">
        <div class="col-lg-4">
            <div class="soft-card">
                <h3>Add Vaccine</h3>
                <form method="POST">
                    <label class="form-label fw-bold mb-1">Pet</label>
                    <select class="form-select" name="pet_id">
                        <?php $pets=$conn->query("SELECT id,name FROM pets WHERE verification_status='approved'"); while($p=$pets->fetch_assoc()): ?>
                            <option value="<?=$p['id']?>"><?=e($p['name'])?></option>
                        <?php endwhile;?>
                    </select>

                    <label class="form-label fw-bold mb-1">Vaccine Name</label>
                    <input class="form-control" name="vaccine_name" placeholder="Vaccine" required>

                    <label class="form-label fw-bold mb-1">Date Given</label>
                    <input class="form-control" type="date" name="date_given">
                    <div class="field-help">Use the calendar to select the actual date when the vaccine was administered.</div>

                    <label class="form-label fw-bold mb-1">Next Due Date</label>
                    <input class="form-control" type="date" name="next_due_date">
                    <div class="field-help">Use the calendar to select the next booster or follow-up vaccination date.</div>

                    <label class="form-label fw-bold mb-1">Administered By</label>
                    <input class="form-control" name="administered_by" placeholder="Administered by">

                    <label class="form-label fw-bold mb-1">Remarks</label>
                    <textarea class="form-control" name="remarks" placeholder="Remarks"></textarea>

                    <button class="btn btn-primary w-100 mt-2">Save</button>
                </form>
            </div>
        </div>
        <div class="col-lg-8">
            <div class="table-card">
                <div class="section-head mb-3">
                    <div>
                        <h3>Vaccination List</h3>
                        <p class="text-muted mb-0">Saved vaccination records with the date given and next due schedule.</p>
                    </div>
                </div>
                <form class="admin-list-search" method="GET" action="vaccinations.php">
                    <input class="form-control" type="search" name="q" value="<?=e($vaccine_search)?>" placeholder="Search pet, vaccine, administered by, remarks...">
                    <button class="btn btn-primary" type="submit">Search</button>
                    <a class="btn btn-light" href="vaccinations.php">Clear</a>
                </form>
                <?php $rows=$conn->query("SELECT v.*,p.name pet_name FROM vaccinations v JOIN pets p ON v.pet_id=p.id $vaccine_where ORDER BY next_due_date"); ?>
                <?php if($rows->num_rows===0): ?>
                    <div class="admin-empty-state">
                        <h3>No vaccination records found</h3>
                        <p>Try another search term or add a new vaccination.</p>
                    </div>
                <?php else: ?>
                    <div class="admin-card-list">
                        <?php while($r=$rows->fetch_assoc()): ?>
                            <?php
                            $dueLabel = 'Scheduled';
                            $dueClass = '';
                            if (!empty($r['next_due_date']) && $r['next_due_date'] < date('Y-m-d')) {
                                $dueLabel = 'Overdue';
                                $dueClass = 'is-priority';
                            } elseif (!empty($r['next_due_date']) && $r['next_due_date'] <= date('Y-m-d', strtotime('+14 days'))) {
                                $dueLabel = 'Due soon';
                                $dueClass = 'is-priority';
                            }
                            ?>
                            <article class="admin-review-card <?=$dueClass?>">
                                <div class="admin-review-main">
                                    <div class="admin-row-title">
                                        <h3><?=e($r['vaccine_name'])?></h3>
                                        <span class="badge text-bg-info"><?=e($dueLabel)?></span>
                                    </div>
                                    <p><?=e($r['remarks'] ?: 'No remarks saved.')?></p>
                                    <div class="admin-meta-row">
                                        <span>Pet: <?=e($r['pet_name'])?></span>
                                        <span>Date given: <?=e($r['date_given'] ?: 'N/A')?></span>
                                        <span>Next due: <?=e($r['next_due_date'] ?: 'N/A')?></span>
                                        <span>By: <?=e($r['administered_by'] ?: 'N/A')?></span>
                                    </div>
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
