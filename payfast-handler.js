/**
 * PayFast ITN Handler - Vercel Serverless Function
 * Location: /api/payfast-handler.js
 * 
 * This function receives PayFast Instant Transaction Notifications
 * and updates Supabase with payment status
 */

const crypto = require('crypto');

// Supabase config
const SUPABASE_URL = 'https://weztrzuxwycypheyiixr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenRyenV4d3ljeXBoZXlpaXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzYzMTYsImV4cCI6MjA4NzAxMjMxNn0.t6P20qa8QZAMxxi1K0HLRaVJtH7XOmBeL851-ewaAWA';

// PayFast config (SANDBOX)
const MERCHANT_ID = '10047067';
const MERCHANT_KEY = 'wg5kkq77yo2m1';
const PASSPHRASE = 'Soosalways1961';

// Helper function to make Supabase requests
async function updateSupabasePlayer(email, paymentStatus, paymentData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        payment_status: paymentStatus,
        payment_method: 'payfast',
        payment_id: paymentData.pf_payment_id,
        payment_amount: parseFloat(paymentData.amount_gross),
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    // Add filter for email
    const filterResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/players?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          payment_status: paymentStatus,
          payment_method: 'payfast',
          payment_id: paymentData.pf_payment_id,
          payment_amount: parseFloat(paymentData.amount_gross),
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    );

    return filterResponse.ok;
  } catch (error) {
    console.error('Supabase update error:', error);
    return false;
  }
}

// Main handler function
module.exports = async (req, res) => {
  // Only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const postData = req.body;

    // Log the notification
    console.log('PayFast ITN received:', {
      m_payment_id: postData.m_payment_id,
      payment_status: postData.payment_status,
      pf_payment_id: postData.pf_payment_id,
      amount_gross: postData.amount_gross
    });

    // Verify signature
    const signature = postData.signature;
    delete postData.signature;

    // Build signature string
    let signatureString = '';
    for (const [key, val] of Object.entries(postData)) {
      signatureString += `${key}=${encodeURIComponent(val)}&`;
    }
    signatureString = signatureString.slice(0, -1);

    // Add passphrase if set
    if (PASSPHRASE) {
      signatureString += `&passphrase=${encodeURIComponent(PASSPHRASE)}`;
    }

    // Create MD5 hash
    const computedSignature = crypto
      .createHash('md5')
      .update(signatureString)
      .digest('hex');

    console.log('Signature verification:', {
      received: signature,
      computed: computedSignature,
      match: signature === computedSignature
    });

    // Verify signature
    if (computedSignature !== signature) {
      console.error('Signature mismatch');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Verify amount
    const amount = parseFloat(postData.amount_gross || 0);
    if (amount <= 0) {
      console.error('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get transaction details
    const paymentStatus = postData.payment_status || 'failed';
    const customStr = postData.custom_str1 || '';

    // Extract email and type from custom string
    // Format: "email|type" e.g., "user@example.com|single"
    const [email, paymentType] = customStr.split('|');

    if (!email) {
      console.error('Missing email in custom string');
      return res.status(400).json({ error: 'Missing email' });
    }

    console.log('Processing payment:', {
      email,
      paymentType,
      status: paymentStatus,
      amount
    });

    // Map PayFast status to our status
    let updateStatus = 'unpaid';
    if (paymentStatus === 'COMPLETE') {
      updateStatus = 'paid';
    } else if (paymentStatus === 'PENDING') {
      updateStatus = 'pending_verification';
    }

    // Update Supabase
    const updated = await updateSupabasePlayer(email, updateStatus, postData);

    if (!updated) {
      console.warn('Supabase update returned false, but continuing');
    }

    // Log success
    console.log('Payment processed successfully:', {
      email,
      status: updateStatus,
      timestamp: new Date().toISOString()
    });

    // Return success
    return res.status(200).json({ 
      success: true,
      message: 'Payment processed',
      email,
      status: updateStatus
    });

  } catch (error) {
    console.error('Handler error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
