<?php
header("Content-Type: application/json");
require_once "../config/database.php";
require_once "../includes/functions.php";

$input = json_decode(file_get_contents("php://input"), true);
$message = trim($input["message"] ?? "");

if ($message === "") {
    echo json_encode(["answer" => "Please describe your pet symptoms.", "links" => []]);
    exit;
}

$petContext = "";
$words = preg_split('/\s+/', strtolower($message));
$pets = $conn->query("SELECT p.*,u.full_name FROM pets p JOIN users u ON p.owner_id=u.id");
while($p = $pets->fetch_assoc()) {
    if (str_contains(strtolower($message), strtolower($p['name']))) {
        $pet_id = (int)$p['id'];
        $breed = trim($p['breed'] ?? '') !== '' ? $p['breed'] : 'Not specified';
        $weight = trim((string)($p['weight'] ?? '')) !== '' ? $p['weight'] . ' kg' : 'Not specified';
        $allergies = trim($p['allergies'] ?? '') !== '' ? $p['allergies'] : 'None listed';
        $critical_notes = trim($p['critical_notes'] ?? '') !== '' ? $p['critical_notes'] : 'None listed';

        // Keep every detail on its own line so the chatbot remains readable when a pet name is entered.
        $petContext .= "<b>Pet context found:</b><br>";
        $petContext .= "• Name: " . e($p['name']) . "<br>";
        $petContext .= "• Species/Breed: " . e($p['species']) . " / " . e($breed) . "<br>";
        $petContext .= "• Age: " . e(pet_age($p['birth_date'])) . "<br>";
        $petContext .= "• Weight: " . e($weight) . "<br>";
        $petContext .= "• Allergies: " . e($allergies) . "<br>";
        $petContext .= "• Critical notes: " . e($critical_notes) . "<br>";

        $rec = $conn->query("SELECT * FROM medical_records WHERE pet_id=$pet_id ORDER BY visit_date DESC LIMIT 2");
        if ($rec && $rec->num_rows > 0) {
            $petContext .= "<br><b>Recent records:</b><br>";
            while($r=$rec->fetch_assoc()) {
                $symptoms = trim($r['symptoms'] ?? '') !== '' ? $r['symptoms'] : 'No symptoms listed';
                $diagnosis = trim($r['diagnosis'] ?? '') !== '' ? $r['diagnosis'] : 'No diagnosis listed';
                $treatment = trim($r['treatment'] ?? '') !== '' ? $r['treatment'] : 'No treatment listed';
                $petContext .= "• " . e($r['visit_date']) . " — Symptoms: " . e($symptoms) . "<br>";
                $petContext .= "  Diagnosis: " . e($diagnosis) . "<br>";
                $petContext .= "  Treatment: " . e($treatment) . "<br>";
            }
        }
        break;
    }
}

$query = urlencode($message . " veterinary dog cat pet symptoms");
$url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={$query}&format=json&pageSize=3";
$response = @file_get_contents($url);
$links = [];

if ($response !== false) {
    $data = json_decode($response, true);
    foreach (($data["resultList"]["result"] ?? []) as $item) {
        $title = $item["title"] ?? "Research article";
        $source = $item["source"] ?? "MED";
        $id = $item["id"] ?? "";
        if ($id) {
            $links[] = [
                "title" => $title,
                "url" => "https://europepmc.org/article/" . rawurlencode($source) . "/" . rawurlencode($id)
            ];
        }
    }
}

$lower = strtolower($message);
$advice = "Monitor your pet closely and contact the clinic if symptoms persist or worsen.";
$triage = "Low to moderate";
if (str_contains($lower, "blood") || str_contains($lower, "seizure") || str_contains($lower, "breath") || str_contains($lower, "poison") || str_contains($lower, "collapse")) {
    $triage = "Urgent";
    $advice = "This may be urgent. Contact a veterinarian or emergency clinic immediately.";
} elseif (str_contains($lower, "vomit") || str_contains($lower, "diarrhea") || str_contains($lower, "not eating") || str_contains($lower, "lethargic")) {
    $triage = "Moderate";
    $advice = "These symptoms can become serious if persistent. Offer clean water, avoid human medicine, and schedule a clinic visit if symptoms continue for more than 24 hours or worsen.";
}

$answer = "";
if ($petContext) $answer .= $petContext . "<br>";
$answer .= "<b>Triage level:</b> {$triage}<br><br><b>Follow-up questions:</b><br>• How long has this been happening?<br>• Is your pet still eating or drinking?<br>• Any blood, seizure, breathing issue, or collapse?<br>• What is your pet\'s age and weight?<br><br>
<b>General guidance:</b><br>
1. Record symptom start time, frequency, appetite, water intake, stool/urine changes, and energy level.<br>
2. Do not give human medicine unless prescribed by a veterinarian.<br>
3. {$advice}<br>
4. I searched veterinary biomedical literature and listed related research below.";

echo json_encode(["answer" => $answer, "links" => $links]);
?>
