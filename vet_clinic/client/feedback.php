<?php require_once "../config/database.php"; require_once "../includes/functions.php"; require_role("client");$uid=current_user_id();if($_SERVER['REQUEST_METHOD']==='POST'){$stmt=$conn->prepare("INSERT INTO feedback(user_id,rating,comment) VALUES(?,?,?)");$stmt->bind_param("iis",$uid,$_POST['rating'],$_POST['comment']);$stmt->execute();flash('success','Feedback submitted.');redirect_to('client/feedback.php');}$title="Feedback"; include "../includes/header.php"; include "../includes/navbar.php";?>
<div class="layout"><?php include "../includes/client_sidebar.php";?>
<main class="content">
    <section class="hero client-hero-banner mb-4">
        <h1>Feedback</h1>
        <p>Share your rating and comments so the clinic can improve the service and client experience.</p>
    </section>

    <?php if($m=flash('success')):?><div class="alert alert-success friendly-alert">✅ <?=e($m)?></div><?php endif;?>

    <div class="soft-card">
        <div class="card-title-row"><h3>Submit Feedback</h3><span>Client response</span></div>
        <p class="text-muted">Choose a rating and write a short comment about your clinic experience.</p>
        <form method="POST" class="friendly-form">
            <label>Rating</label>
            <select class="form-select mb-3" name="rating">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Average</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Bad</option>
            </select>
            <label>Comment</label>
            <textarea class="form-control mb-3" name="comment" placeholder="Write your comment here" required></textarea>
            <button class="btn btn-primary">Submit Feedback</button>
        </form>
    </div>
</main>
</div><?php include "../includes/footer.php";?>
