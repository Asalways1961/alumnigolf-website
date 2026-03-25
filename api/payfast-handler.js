/**
 * PayFast ITN Handler - Vercel Serverless Function
 * Location: /api/payfast-handler.js
 *
 * Receives PayFast Instant Transaction Notifications (ITN)
 * Verifies the signature and updates Supabase with payment status
 */

const crypto = require('crypto');

// =====================================================
// SUPABASE CONFIG
// =====================================================
const SUPABASE_URL = 'https://weztrzuxwycypheyiixr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenRyenV4d3ljeXBoZXlpaXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzYzMTYsImV4cCI6MjA4NzAxMjMxNn0.t6P20qa8QZAMxxi1K0HLRaVJtH7XOmBeL851-ewaAWA';

// =====================================================
// PAYFAST CONFIG - SANDBOX (Active account)
// =====================================================
const MERCHANT_ID  = '10047067';
const MERCHANT_KEY = 'wg5kkq77yo2m1';
const PASSPHRASE   = 'Soosalways1961';

// =====================================================
// UPDATE SUPABASE PLAYER RECORD
// =====================================================
async function updateSupabasePlayer(email, paymentStatus, paymentData) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/players?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          payment_status: paymentStatus,
          payment_method: 'payfast',
          payment_id:     paymentData.pf_payment_id || '',
          payment_amount: parseFloat(paymentData.amount_gross || 0),
          payment_date:   new Date().toISOString(),
          updated_at:     new Date().toISOString()
        })
      }
    );

    console.log('Supabase update status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Supabase update error:', error);
    return false;
  }
}

// =====================================================
// VERIFY PAYFAST SIGNATURE
// This matches exactly how PayFast builds the ITN signature
// =====================================================
function verifySignature(postData, receivedSignature) {
  // Remove the signature field from the data before rebuilding
  const data = { ...postData };
  delete data.signature;

  // Build the parameter string in the order PayFast sends it
  let paramString = '';
  for (const key in data) {
    if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      paramString += key + '=' + encodeURIComponent(data[key]).replace(/%20/g, '+') + '&';
    }
  }
  // Remove trailing &
  paramString = paramString.slice(0, -1);
  // Append passphrase
  paramString += '&passphrase=' + encodeURIComponent(PASSPHRASE).replace(/%20/g, '+');

  console.log('ITN signature string:', paramString);

  const computedSignature = crypto
    .createHash('md5')
    .update(paramString)
    .digest('hex');

  console.log('Received signature: ', receivedSignature);
  console.log('Computed signature: ', computedSignature);
  console.log('Signatures match:   ', receivedSignature === computedSignature);

  return receivedSignature === computedSignature;
}

// =====================================================
// MAIN HANDLER
// =====================================================
module.exports = async (req, res) => {

  // Only accept POST requests from PayFast
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const postData = req.body;

    console.log('PayFast ITN received:', JSON.stringify(postData, null, 2));

    // Pull the signature out of the posted data
    const receivedSignature = postData.signature;

    if (!receivedSignature) {
      console.error('No signature in ITN data');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify the signature
    const signatureValid = verifySignature(postData, receivedSignature);

    if (!signatureValid) {
      console.error('Signature mismatch — possible tampering');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Verify the merchant ID is ours
    if (postData.merchant_id !== MERCHANT_ID) {
      console.error('Merchant ID mismatch:', postData.merchant_id);
      return res.status(400).json({ error: 'Invalid merchant' });
    }

    // Get payment details
    const paymentStatus = postData.payment_status || 'failed';
    const amount        = parseFloat(postData.amount_gross || 0);
    const customStr     = postData.custom_str1 || '';
    const email         = postData.email_address || customStr.split('|')[0] || '';

    console.log('Payment details:', { email, paymentStatus, amount });

    if (!email) {
      console.error('No email found in ITN');
      return res.status(400).json({ error: 'Missing email' });
    }

    // Map PayFast status to our database status
    let dbStatus = 'unpaid';
    if (paymentStatus === 'COMPLETE') {
      dbStatus = 'paid';
    } else if (paymentStatus === 'PENDING') {
      dbStatus = 'pending_verification';
    } else if (paymentStatus === 'FAILED') {
      dbStatus = 'failed';
    }

    // Update Supabase
    const updated = await updateSupabasePlayer(email, dbStatus, postData);
    console.log('Supabase updated:', updated, '| Status set to:', dbStatus);

    // PayFast requires a 200 OK response — always return this
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Handler error:', error.message);
    // Still return 200 so PayFast does not keep retrying
    return res.status(200).send('OK');
  }
};
