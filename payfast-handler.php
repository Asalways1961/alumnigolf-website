<?php
/**
 * PayFast ITN Handler
 * Receives payment notifications from PayFast and updates Supabase
 */

// Get the posted data
$postData = $_POST;

// PayFast credentials (SANDBOX)
$merchantId = '10047067';
$merchantKey = 'wg5kkq77yo2m1';
$passphrase = 'Soosalways1961';

// Verify ITN signature
$signature = $postData['signature'] ?? '';
unset($postData['signature']);

// Build the signature string
$signatureString = '';
foreach ($postData as $key => $val) {
    if ($key != 'signature') {
        $signatureString .= $key . '=' . urlencode($val) . '&';
    }
}
$signatureString = rtrim($signatureString, '&');

// Add passphrase if set
if (!empty($passphrase)) {
    $signatureString .= '&passphrase=' . urlencode($passphrase);
}

// Create MD5 hash
$computedSignature = md5($signatureString);

// Log the notification (for debugging)
$logFile = __DIR__ . '/payfast-log.txt';
$logEntry = date('Y-m-d H:i:s') . " | " . $postData['m_payment_id'] . " | " . $postData['payment_status'] . " | Signature: " . ($computedSignature === $signature ? 'VALID' : 'INVALID') . "\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

// Verify signature
if ($computedSignature !== $signature) {
    http_response_code(400);
    echo "Invalid signature";
    exit;
}

// Verify amount (basic check)
$amount = floatval($postData['amount_gross'] ?? 0);
if ($amount <= 0) {
    http_response_code(400);
    echo "Invalid amount";
    exit;
}

// Get transaction details
$paymentId = $postData['pf_payment_id'] ?? null;
$customStr = $postData['custom_str1'] ?? '';
$paymentStatus = $postData['payment_status'] ?? 'failed';

// Extract email and amount type from custom string
// Format: "email|type" e.g., "user@example.com|single"
$parts = explode('|', $customStr);
$email = $parts[0] ?? null;
$paymentType = $parts[1] ?? 'single';

if (!$email) {
    http_response_code(400);
    echo "Missing email in custom string";
    exit;
}

// Connect to Supabase
require 'vendor/autoload.php';
use Supabase\Client as Supabase;
use Supabase\CreateClientOptions;

$options = new CreateClientOptions()
    ->setHeaders(['Authorization' => 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenRyenV4d3ljeXBoZXlpaXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzYzMTYsImV4cCI6MjA4NzAxMjMxNn0.t6P20qa8QZAMxxi1K0HLRaVJtH7XOmBeL851-ewaAWA']);

$client = new Supabase(
    'https://weztrzuxwycypheyiixr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenRyenV4d3ljeXBoZXlpaXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzYzMTYsImV4cCI6MjA4NzAxMjMxNn0.t6P20qa8QZAMxxi1K0HLRaVJtH7XOmBeL851-ewaAWA',
    $options
);

try {
    // Update player payment status in Supabase
    if ($paymentStatus === 'COMPLETE') {
        // Payment successful
        $response = $client->from('players')
            ->update([
                'payment_status' => 'paid',
                'payment_method' => 'payfast',
                'payment_id' => $paymentId,
                'payment_amount' => $amount,
                'payment_date' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ])
            ->eq('email', $email)
            ->execute();
    } elseif ($paymentStatus === 'PENDING') {
        // Payment pending
        $response = $client->from('players')
            ->update([
                'payment_status' => 'pending_verification',
                'payment_method' => 'payfast',
                'payment_id' => $paymentId,
                'payment_amount' => $amount,
                'updated_at' => date('Y-m-d H:i:s')
            ])
            ->eq('email', $email)
            ->execute();
    } else {
        // Payment failed
        $response = $client->from('players')
            ->update([
                'payment_status' => 'unpaid',
                'payment_method' => 'payfast',
                'payment_id' => $paymentId,
                'updated_at' => date('Y-m-d H:i:s')
            ])
            ->eq('email', $email)
            ->execute();
    }
    
    // Log successful update
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | Updated email: $email | Status: $paymentStatus\n", FILE_APPEND);
    
    http_response_code(200);
    echo "OK";
} catch (Exception $e) {
    // Log error
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo "Database error";
}
?>
