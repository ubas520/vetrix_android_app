<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
require_role("client");
$uid=current_user_id();
$title="Records";
include "../includes/header.php";
include "../includes/navbar.php";
$recordCount=$conn->query("SELECT COUNT(*) c FROM medical_records m JOIN pets p ON m.pet_id=p.id WHERE p.owner_id=$uid")->fetch_assoc()['c'];
$vacCount=$conn->query("SELECT COUNT(*) c FROM vaccinations v JOIN pets p ON v.pet_id=p.id WHERE p.owner_id=$uid")->fetch_assoc()['c'];
$totalRecordItems=(int)$recordCount+(int)$vacCount;
?>
<div class="layout"><?php include "../includes/client_sidebar.php";?><main class="content">
<section class="hero client-hero-banner mb-4"><h1>My Pet Records</h1><p>View your pet medical records and vaccination history in a compact card view. Click each record to show the full information.</p></section>

<div class="reference-filter-bar" id="clientRecordsFilterBar">
    <button type="button" class="reference-filter-chip active" data-filter="all">All Records <span class="count"><?=$totalRecordItems?></span></button>
    <button type="button" class="reference-filter-chip" data-filter="medical">Medical Records <span class="count"><?=$recordCount?></span></button>
    <button type="button" class="reference-filter-chip" data-filter="vaccination">Vaccinations <span class="count"><?=$vacCount?></span></button>
</div>

<?php
$records=$conn->query("SELECT m.*,p.name pet_name,p.species,p.breed,p.birth_date FROM medical_records m JOIN pets p ON m.pet_id=p.id WHERE p.owner_id=$uid ORDER BY visit_date DESC");
?>
<section class="client-record-filter-group" data-record-group="medical">
<div class="reference-section-title"><h2>Medical Records</h2></div>
<?php if($records->num_rows==0): ?>
<div class="empty-state mb-4">
    <div class="empty-icon">📋</div>
    <h2>No medical records yet</h2>
    <p class="text-muted">Your pet has vaccination data, but no official medical visit record has been added by the clinic yet.</p>
    <a href="appointments.php" class="btn btn-primary rounded-pill">Request Checkup</a>
</div>
<?php else: ?>
<div class="reference-list mb-4">
<?php while($r=$records->fetch_assoc()): ?>
    <details class="reference-expand-card">
        <summary class="reference-expand-summary">
            <div class="reference-icon reference-icon-sm">📋</div>
            <div class="reference-expand-head">
                <div class="reference-title-row compact"><h2><?=e($r['pet_name'])?></h2><span class="reference-tag">Medical Record</span></div>
                <p class="reference-subtitle mb-0"><?=e($r['species'])?> · <?=e($r['breed'] ?: 'Breed not set')?> · Age: <?=e(pet_age($r['birth_date']))?></p>
            </div>
            <div class="reference-quick-meta">
                <span>Visit Date</span>
                <strong><?=e(date('M d, Y', strtotime($r['visit_date'])))?></strong>
            </div>
            <div class="reference-quick-meta hide-sm">
                <span>Diagnosis</span>
                <strong><?=e($r['diagnosis'] ?: 'No diagnosis saved')?></strong>
            </div>
            <span class="reference-expand-pill">View details</span>
        </summary>
        <div class="reference-expand-body">
            <div class="reference-expand-info">
                <div class="reference-tags">
                    <span class="reference-tag">Clinic Visit</span>
                    <span class="reference-tag"><?=e($r['species'])?></span>
                    <span class="reference-tag"><?=e($r['breed'] ?: 'Breed not set')?></span>
                </div>
                <div class="reference-details">
                    <div class="reference-detail"><label>Symptoms</label><strong><?=e($r['symptoms'] ?: 'No symptoms saved')?></strong></div>
                    <div class="reference-detail"><label>Diagnosis</label><strong><?=e($r['diagnosis'] ?: 'No diagnosis saved')?></strong></div>
                    <div class="reference-detail"><label>Treatment</label><strong><?=e($r['treatment'] ?: 'No treatment saved')?></strong></div>
                    <div class="reference-detail"><label>Prescription</label><strong><?=e($r['prescription'] ?: 'No prescription saved')?></strong></div>
                </div>
            </div>
            <aside class="reference-summary">
                <h3>Record Summary</h3>
                <p><b>Pet:</b> <?=e($r['pet_name'])?></p>
                <p><b>Visit Date:</b> <?=e(date('M d, Y', strtotime($r['visit_date'])))?></p>
                <p><b>Diagnosis:</b> <?=e($r['diagnosis'] ?: 'No diagnosis saved')?></p>
                <p><b>Note:</b> Keep this record for future consultations and follow-up appointments.</p>
                <div class="reference-actions"><a class="btn btn-primary btn-sm rounded-pill" href="chatbot.php?pet=<?=urlencode($r['pet_name'])?>&q=<?=urlencode('Analyze '.$r['pet_name'].' with history: '.$r['symptoms'].' '.$r['diagnosis'])?>">Ask Vetrix about this pet</a></div>
            </aside>
        </div>
    </details>
<?php endwhile; ?>
</div>
<?php endif; ?>
</section>

<section class="client-record-filter-group" data-record-group="vaccination">
<div class="reference-section-title"><h2>Vaccinations</h2></div>
<div class="reference-list">
<?php $vacs=$conn->query("SELECT v.*,p.name pet_name,p.species,p.breed FROM vaccinations v JOIN pets p ON v.pet_id=p.id WHERE p.owner_id=$uid ORDER BY v.next_due_date"); if($vacs->num_rows==0): ?>
    <div class="soft-card"><p class="text-muted mb-0">No vaccination records yet.</p></div>
<?php endif; while($r=$vacs->fetch_assoc()): ?>
    <details class="reference-expand-card">
        <summary class="reference-expand-summary">
            <div class="reference-icon reference-icon-sm">💉</div>
            <div class="reference-expand-head">
                <div class="reference-title-row compact"><h2><?=e($r['pet_name'])?></h2><span class="reference-tag"><?=e($r['vaccine_name'])?></span></div>
                <p class="reference-subtitle mb-0"><?=e($r['species'])?> · <?=e($r['breed'] ?: 'Breed not set')?></p>
            </div>
            <div class="reference-quick-meta">
                <span>Date Given</span>
                <strong><?=e(!empty($r['date_given']) ? date('M d, Y', strtotime($r['date_given'])) : 'Not set')?></strong>
            </div>
            <div class="reference-quick-meta hide-sm">
                <span>Next Due</span>
                <strong><?=e(!empty($r['next_due_date']) ? date('M d, Y', strtotime($r['next_due_date'])) : 'Not set')?></strong>
            </div>
            <span class="reference-expand-pill">View details</span>
        </summary>
        <div class="reference-expand-body">
            <div class="reference-expand-info">
                <div class="reference-tags">
                    <span class="reference-tag">Vaccination</span>
                    <span class="reference-tag"><?=e($r['species'])?></span>
                    <span class="reference-tag"><?=e($r['breed'] ?: 'Breed not set')?></span>
                </div>
                <div class="reference-details">
                    <div class="reference-detail"><label>Vaccine Name</label><strong><?=e($r['vaccine_name'])?></strong></div>
                    <div class="reference-detail"><label>Date Given</label><strong><?=e(!empty($r['date_given']) ? date('M d, Y', strtotime($r['date_given'])) : 'Not set')?></strong></div>
                    <div class="reference-detail"><label>Next Due</label><strong><?=e(!empty($r['next_due_date']) ? date('M d, Y', strtotime($r['next_due_date'])) : 'Not set')?></strong></div>
                    <div class="reference-detail"><label>Reminder</label><strong>Schedule a follow-up before the next due date.</strong></div>
                </div>
            </div>
            <aside class="reference-summary">
                <h3>Vaccination Summary</h3>
                <p><b>Pet:</b> <?=e($r['pet_name'])?></p>
                <p><b>Vaccine:</b> <?=e($r['vaccine_name'])?></p>
                <p><b>Next Due:</b> <?=e(!empty($r['next_due_date']) ? date('M d, Y', strtotime($r['next_due_date'])) : 'Not set')?></p>
                <p><b>Note:</b> Use the next due date as your guide for follow-up vaccination scheduling.</p>
            </aside>
        </div>
    </details>
<?php endwhile; ?>
</div>
</section>
<div class="soft-card reference-empty-filter" id="clientRecordsEmptyFilter" style="display:none;"><h3>No records found for this filter</h3><p class="text-muted mb-0">Try selecting another record type.</p></div>
<script>
document.addEventListener('DOMContentLoaded', function(){
    const filterBar = document.getElementById('clientRecordsFilterBar');
    const groups = Array.from(document.querySelectorAll('.client-record-filter-group[data-record-group]'));
    const emptyState = document.getElementById('clientRecordsEmptyFilter');
    if(!filterBar || !groups.length) return;

    filterBar.addEventListener('click', function(event){
        const chip = event.target.closest('.reference-filter-chip');
        if(!chip) return;
        event.preventDefault();
        event.stopPropagation();

        const selected = (chip.dataset.filter || 'all').toLowerCase();
        filterBar.querySelectorAll('.reference-filter-chip').forEach(btn => btn.classList.remove('active'));
        chip.classList.add('active');

        let shown = 0;
        groups.forEach(group => {
            const groupType = (group.dataset.recordGroup || '').toLowerCase();
            const match = selected === 'all' || groupType === selected;
            group.style.display = match ? '' : 'none';
            if(!match){
                group.querySelectorAll('details[open]').forEach(item => item.removeAttribute('open'));
            }
            if(match && group.querySelector('.reference-expand-card, .soft-card, .empty-state')) shown++;
        });
        if(emptyState) emptyState.style.display = shown ? 'none' : '';
    });
});
</script>
</main></div><?php include "../includes/footer.php";?>
