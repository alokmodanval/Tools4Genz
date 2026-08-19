/**
 * Tools4Genz Phase 8C — Production QR Smoke Test
 *
 * Verifies against the deployed Cloudflare Worker:
 * 1. POST /api/orders  -> creates order with authoritative price
 * 2. POST /api/orders/:id/payment/qr -> returns Razorpay-hosted QR (real keys if configured)
 * 3. Ensures secrets are never leaked
 */

const API = 'https://tools4genz-api.alokmodanwal940.workers.dev';

async function main() {
    console.log('🧪 Phase 8C Production QR Smoke Test\n');

    // 1. Create order (server-authoritative price)
    const createResp = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: 'ml-sentiment-analyzer',
            customerName: 'Prod QR Test',
            customerEmail: 'prod-qr@example.com',
        }),
    });
    const createJson = await createResp.json();
    console.log(`Create order status: ${createResp.status}`);
    if (!createResp.ok) {
        console.error('Order create failed:', JSON.stringify(createJson, null, 2));
        process.exit(1);
    }
    const { orderId, amount, providerOrderId, keyId } = createJson.data;
    console.log(`  orderId: ${orderId}`);
    console.log(`  amount (INR): ${amount}`);
    console.log(`  providerOrderId: ${providerOrderId}`);
    console.log(`  keyId: ${keyId}`);

    // 2. Request QR
    const qrResp = await fetch(`${API}/api/orders/${orderId}/payment/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const qrJson = await qrResp.json();
    console.log(`\nQR request status: ${qrResp.status}`);
    if (!qrResp.ok) {
        console.error('QR request failed:', JSON.stringify(qrJson, null, 2));
        process.exit(1);
    }
    const qr = qrJson.data;
    console.log(`  qrId: ${qr.qrId}`);
    console.log(`  imageUrl: ${qr.imageUrl}`);
    console.log(`  amount: ${qr.amount} ${qr.currency}`);
    console.log(`  expiresAt: ${qr.expiresAt}`);

    // 3. Secret leak checks
    const raw = JSON.stringify(qrJson);
    const redFlags = [
        'rzp_live_',
        'rzp_test_',
        'whsec_',
        'key_secret',
        'secret',
        'password',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
    ].filter((s) => raw.toLowerCase().includes(s));

    if (redFlags.length > 0) {
        console.error('\n❌ SECRET LEAK DETECTED:', redFlags);
        process.exit(1);
    }

    console.log('\n✅ No secrets leaked in QR response');
    console.log('✅ Production QR smoke test passed');
    console.log('\nNote: To complete a real payment, scan the QR with a UPI test app or use the Razorpay Dashboard.');
}

main().catch((err) => {
    console.error('Production QR smoke test failed:', err);
    process.exit(1);
});