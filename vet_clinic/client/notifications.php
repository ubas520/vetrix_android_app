<?php require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("client");$uid=current_user_id();
$due=$conn->query("SELECT v.*,p.name pet_name FROM vaccinations v JOIN pets p ON v.pet_id=p.id WHERE p.owner_id=$uid AND v.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)");
while($d=$due->fetch_assoc()){
    $titleN='Vaccination Due Soon';
    $msg=$d['pet_name'].' needs '.$d['vaccine_name'].' by '.$d['next_due_date'].'.';
    $exists=$conn->prepare("SELECT id FROM notifications WHERE user_id=? AND title=? AND message=?");
    $exists->bind_param("iss",$uid,$titleN,$msg);$exists->execute();
    if(!$exists->get_result()->fetch_assoc()) notify_user($conn,$uid,$titleN,$msg,'vaccine');
}
$conn->query("UPDATE notifications SET status='read' WHERE user_id=$uid");
$title="Notifications"; include "../includes/header.php"; include "../includes/navbar.php";?>
<div class="layout"><?php include "../includes/client_sidebar.php";?><main class="content"><section class="hero client-hero-banner mb-4"><h1>Notifications</h1><p>Appointment updates, vaccine reminders, and record alerts appear here.</p></section>
<div class="bounded-record-list">
<?php $rows=$conn->query("SELECT * FROM notifications WHERE user_id=$uid ORDER BY created_at DESC");while($r=$rows->fetch_assoc()):?><div class="soft-card mb-3"><h3><?=e($r['title'])?> <?=badge($r['type'])?></h3><p><?=e($r['message'])?></p><small class="text-muted"><?=e($r['created_at'])?></small></div><?php endwhile;?>
</div>
</main></div><?php include "../includes/footer.php";?>
