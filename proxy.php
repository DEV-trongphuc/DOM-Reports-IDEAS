<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Nếu request là OPTIONS (preflight CORS), trả về OK luôn
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// URL Odoo
$ODOO_URL = "https://erp.ideas.orissolution.com";

// Lấy dữ liệu từ request frontend
$inputJSON = file_get_contents("php://input");
$input = json_decode($inputJSON, true);

if (!isset($input["endpoint"]) || !isset($input["data"])) {
    echo json_encode(["error" => "Thiếu endpoint hoặc data!"]);
    exit();
}

// File để lưu session (cookies)
$cookieFile = __DIR__ . "/cookies.txt";

// Gửi request đến Odoo
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $ODOO_URL . $input["endpoint"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input["data"]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);

// Bypass lỗi session (lưu cookies)
curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieFile);
curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieFile);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Debug nếu có lỗi
if ($httpCode !== 200) {
    echo json_encode(["error" => "Lỗi HTTP: $httpCode", "response" => $response]);
    exit();
}

// Trả kết quả về frontend
echo $response;
?>