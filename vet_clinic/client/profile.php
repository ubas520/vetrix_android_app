<?php
require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("client");
$uid=current_user_id();

if($_SERVER['REQUEST_METHOD']==='POST'){
    if(isset($_POST['update_profile'])){
        $stmt=$conn->prepare("UPDATE users SET full_name=?, phone=?, emergency_contact=?, address=? WHERE id=?");
        $stmt->bind_param("ssssi",$_POST['full_name'],$_POST['phone'],$_POST['emergency_contact'],$_POST['address'],$uid);
        $stmt->execute();
        $_SESSION['full_name']=$_POST['full_name'];
        log_action($conn,'Client updated profile','user',$uid,'Profile information updated.');
        flash('success','Profile updated.');
        redirect_to('client/profile.php');
    }
    if(isset($_POST['change_password'])){
        if(strlen($_POST['new_password'])<6){
            flash('error','Password must be at least 6 characters.');
        } elseif($_POST['new_password']!==$_POST['confirm_password']){
            flash('error','Passwords do not match.');
        } else {
            $hash=password_hash($_POST['new_password'], PASSWORD_DEFAULT);
            $stmt=$conn->prepare("UPDATE users SET password=? WHERE id=?");
            $stmt->bind_param("si",$hash,$uid);
            $stmt->execute();
            log_action($conn,'Client changed password','user',$uid,'Password updated.');
            flash('success','Password changed.');
        }
        redirect_to('client/profile.php');
    }
}
$user=$conn->query("SELECT * FROM users WHERE id=$uid")->fetch_assoc();
$title='My Profile'; include "../includes/header.php"; include "../includes/navbar.php";
?>
<div class="layout"><?php include "../includes/client_sidebar.php"; ?><main class="content">
<section class="hero client-hero-banner mb-4"><h1>My Profile</h1><p>Manage your contact information, emergency contact, address, and password.</p></section>
<?php if($m=flash('success')):?><div class="alert alert-success"><?=e($m)?></div><?php endif;?>
<?php if($m=flash('error')):?><div class="alert alert-danger"><?=e($m)?></div><?php endif;?>
<div class="profile-grid">
<div class="soft-card"><h3>Contact Information</h3><form method="POST">
<input type="hidden" name="update_profile" value="1">
<label class="small fw-bold">Full Name</label><input class="form-control mb-2" name="full_name" value="<?=e($user['full_name'])?>" required>
<label class="small fw-bold">Phone</label><input class="form-control mb-2" name="phone" value="<?=e($user['phone'])?>">
<label class="small fw-bold">Emergency Contact</label><input class="form-control mb-2" name="emergency_contact" value="<?=e($user['emergency_contact'] ?? '')?>" placeholder="Name / Phone">
<label class="small fw-bold">Address</label><input class="form-control mb-3" name="address" value="<?=e($user['address'])?>">
<button class="btn btn-primary w-100">Save Profile</button>
</form></div>
<div class="soft-card"><h3>Change Password</h3><form method="POST">
<input type="hidden" name="change_password" value="1">
<label class="small fw-bold">New Password</label><input class="form-control mb-2" type="password" name="new_password" required>
<label class="small fw-bold">Confirm Password</label><input class="form-control mb-3" type="password" name="confirm_password" required>
<button class="btn btn-primary w-100">Change Password</button>
</form></div>
</div>
</main></div><?php include "../includes/footer.php"; ?>
