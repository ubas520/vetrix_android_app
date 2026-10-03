<?php
require_once "../config/database.php";
require_once "../includes/functions.php";
header('Content-Type: application/json');

if(!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'client'){
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'Please log in as a client first.']);
    exit;
}

$uid = current_user_id();

function count_for($conn, $sql, $types='', ...$params){
    $stmt = $conn->prepare($sql);
    if($types){ $stmt->bind_param($types, ...$params); }
    $stmt->execute();
    return (int)($stmt->get_result()->fetch_assoc()['c'] ?? 0);
}

$summary = [
    'pets' => count_for($conn, "SELECT COUNT(*) c FROM pets WHERE owner_id=? AND verification_status='approved'", 'i', $uid),
    'appointments' => count_for($conn, "SELECT COUNT(*) c FROM appointments WHERE owner_id=?", 'i', $uid),
    'pending' => count_for($conn, "SELECT COUNT(*) c FROM appointments WHERE owner_id=? AND status='pending'", 'i', $uid),
    'approved' => count_for($conn, "SELECT COUNT(*) c FROM appointments WHERE owner_id=? AND status='approved'", 'i', $uid),
    'unread' => count_for($conn, "SELECT COUNT(*) c FROM notifications WHERE user_id=? AND status='unread'", 'i', $uid),
    'records' => count_for($conn, "SELECT COUNT(*) c FROM medical_records mr JOIN pets p ON mr.pet_id=p.id WHERE p.owner_id=?", 'i', $uid),
];

$next = null;
$stmt = $conn->prepare("SELECT a.*, p.name pet_name FROM appointments a JOIN pets p ON a.pet_id=p.id WHERE a.owner_id=? AND a.status IN ('pending','approved') ORDER BY a.requested_date ASC LIMIT 1");
$stmt->bind_param('i', $uid);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
if($row){
    $next = [
        'pet' => $row['pet_name'],
        'status' => $row['status'],
        'requested_date' => date('M d, Y h:i A', strtotime($row['requested_date'])),
        'scheduled_date' => $row['scheduled_date'] ? date('M d, Y h:i A', strtotime($row['scheduled_date'])) : null,
        'reason' => $row['reason']
    ];
}

echo json_encode(['success'=>true,'summary'=>$summary,'next_appointment'=>$next]);
