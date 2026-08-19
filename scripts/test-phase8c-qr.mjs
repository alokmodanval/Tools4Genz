/**
 * Tools4Genz Phase 8C — Dynamic UPI QR Payment Test Suite
 *
 * Tests:
 * 1.  Create order with server-authoritative price
 * 2.  Validate amount cannot be tampered by frontend
 * 3.  Generate Dynamic UPI QR for the exact order amount
 * 4.  QR amount is locked (server-authoritative), never frontend-supplied
 * 5.  QR idempotency (repeated request returns the same active QR)
 * 6.  Invalid/already-paid order states are rejected
 * 7.  Webhook reconciliation of a QR-direct payment (notes.order_id fallback)
 * 8.  Duplicate QR webhook is idempotent
 * 9.  Invalid order / project / QR is rejected
 * 10. Secrets (key secret / webhook secret) never appear in API responses
 */

import worker from '../worker/src/index.ts';

// In-Memory D1 Mock supporting orders + payment_webhook_events + QR fields
class InMemoryD1 {
    constructor() {
        this.tables = {
            requests: [],
            admin_users: [],
            admin_sessions: [],
            admin_tools: [],
            admin_projects: [],
            admin_services: [],
            admin_categories: [],
            orders: [],
            payment_webhook_events: [],
        };
        this.autoIncrement = {
            requests: 1,
            admin_users: 1,
            admin_sessions: 1,
            orders: 1,
            payment_webhook_events: 1,
        };
    }

    prepare(sql) {
        return new InMemoryPreparedStatement(this, sql.trim());
    }

    async batch(statements) {
        const results = [];
        for (const stmt of statements) {
            results.push(await stmt.run());
        }
        return results;
    }
}

class InMemoryPreparedStatement {
    constructor(db, sql) {
        this.db = db;
        this.sql = sql;
        this.boundValues = [];
    }

    bind(...values) {
        this.boundValues = values;
        return this;
    }

    async first() {
        const res = await this.all();
        return res.results && res.results.length > 0 ? res.results[0] : null;
    }

    async all() {
        const sql = this.sql;
        const vals = this.boundValues;

        // SELECT COUNT / admin_projects
        if (sql.includes('SELECT COUNT(*) as c FROM orders')) {
            return { results: [{ c: this.db.tables.orders.length }] };
        }
        if (sql.startsWith('SELECT * FROM admin_projects WHERE id = ?')) {
            const match = this.db.tables.admin_projects.find((p) => p.id === vals[0]);
            return { results: match ? [{ ...match }] : [] };
        }

        // SELECT orders
        if (sql.includes('FROM orders')) {
            if (sql.includes('WHERE order_id = ?')) {
                const row = this.db.tables.orders.find((o) => o.order_id === vals[0]);
                return { results: row ? [{ ...row }] : [] };
            }
            if (sql.includes('WHERE provider_order_id = ?')) {
                const row = this.db.tables.orders.find((o) => o.provider_order_id === vals[0]);
                return { results: row ? [{ ...row }] : [] };
            }
            if (sql.includes('WHERE qr_id = ?')) {
                const row = this.db.tables.orders.find((o) => o.qr_id === vals[0]);
                return { results: row ? [{ ...row }] : [] };
            }
            // Public lookup projection
            if (sql.includes('order_id, project_id, project_slug')) {
                const row = this.db.tables.orders.find((o) => o.order_id === vals[0]);
                if (!row) return { results: [] };
                return {
                    results: [
                        {
                            order_id: row.order_id,
                            project_id: row.project_id,
                            project_slug: row.project_slug,
                            project_title: row.project_title,
                            amount: row.amount,
                            currency: row.currency,
                            status: row.status,
                            payment_provider: row.payment_provider,
                            provider_payment_id: row.provider_payment_id,
                            paid_at: row.paid_at,
                            created_at: row.created_at,
                        },
                    ],
                };
            }
            return { results: [...this.db.tables.orders] };
        }

        // SELECT payment_webhook_events
        if (sql.includes('FROM payment_webhook_events')) {
            if (sql.includes('WHERE event_id = ?')) {
                const row = this.db.tables.payment_webhook_events.find((e) => e.event_id === vals[0]);
                return { results: row ? [{ ...row }] : [] };
            }
            return { results: [...this.db.tables.payment_webhook_events] };
        }

        return { results: [] };
    }

    async run() {
        const sql = this.sql;
        const vals = this.boundValues;

        // INSERT INTO orders
        if (sql.includes('INSERT INTO orders')) {
            const id = this.db.autoIncrement.orders++;
            const row = {
                id,
                order_id: vals[0],
                project_id: vals[1],
                project_slug: vals[2],
                project_title: vals[3],
                customer_name: vals[4],
                customer_email: vals[5],
                customer_phone: vals[6],
                amount: vals[7],
                currency: vals[8],
                status: vals[9],
                payment_provider: vals[10],
                provider_order_id: vals[11],
                provider_payment_id: vals[12],
                provider_signature: vals[13],
                notes: vals[14],
                paid_at: vals[15],
                created_at: vals[16],
                updated_at: vals[17],
                access_token_hash: vals[18] || null,
                access_token_created_at: vals[19] || null,
            };
            this.db.tables.orders.push(row);
            return { meta: { changes: 1, last_row_id: id } };
        }

        // UPDATE orders SET provider_order_id = ?, status = ?, updated_at = ? WHERE order_id = ?
        if (sql.includes('UPDATE orders') && sql.includes('SET provider_order_id = ?')) {
            const target = this.db.tables.orders.find((o) => o.order_id === vals[3]);
            if (target) {
                target.provider_order_id = vals[0];
                target.status = vals[1];
                target.updated_at = vals[2];
                return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
        }

        // UPDATE orders SET status = 'paid', ... (markPaid)
        if (sql.includes('UPDATE orders') && sql.includes("SET status = 'paid'")) {
            const target = this.db.tables.orders.find((o) => o.order_id === vals[4]);
            if (target) {
                target.status = 'paid';
                target.provider_payment_id = vals[0];
                target.provider_signature = vals[1];
                target.paid_at = vals[2];
                target.updated_at = vals[3];
                return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
        }

        // UPDATE orders SET qr_id = ?, qr_image_url = ?, ... (updateQrDetails)
        if (sql.includes('UPDATE orders') && sql.includes('SET qr_id = ?')) {
            const target = this.db.tables.orders.find((o) => o.order_id === vals[6]);
            if (target) {
                target.qr_id = vals[0];
                target.qr_image_url = vals[1];
                target.qr_status = vals[2];
                target.qr_close_by = vals[3];
                target.qr_created_at = vals[4];
                if (target.status === 'created') target.status = 'payment_pending';
                target.updated_at = vals[5];
                return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
        }

        // UPDATE orders SET status = ?, notes = COALESCE(?, notes), ... (updateStatus)
        if (sql.includes('UPDATE orders') && sql.includes('SET status = ?')) {
            const target = this.db.tables.orders.find((o) => o.order_id === vals[3]);
            if (target) {
                target.status = vals[0];
                if (vals[1]) target.notes = vals[1];
                target.updated_at = vals[2];
                return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
        }

        // INSERT INTO payment_webhook_events
        if (sql.includes('INSERT INTO payment_webhook_events')) {
            const id = this.db.autoIncrement.payment_webhook_events++;
            const row = {
                id,
                provider: vals[0],
                event_id: vals[1],
                event_type: vals[2],
                provider_order_id: vals[3],
                provider_payment_id: vals[4],
                order_id: vals[5],
                amount: vals[6],
                currency: vals[7],
                payload_hash: vals[8],
                processed_status: vals[9],
                processing_error: vals[10],
                received_at: vals[11],
                processed_at: vals[12],
                created_at: vals[13],
            };
            this.db.tables.payment_webhook_events.push(row);
            return { meta: { changes: 1, last_row_id: id } };
        }

        // UPDATE payment_webhook_events
        if (sql.includes('UPDATE payment_webhook_events')) {
            const eventId = vals[6];
            const row = this.db.tables.payment_webhook_events.find((e) => e.event_id === eventId);
            if (row) {
                row.processed_status = vals[0];
                if (vals[1] !== null) row.processing_error = vals[1];
                row.processed_at = vals[2];
                if (vals[3] !== null) row.order_id = vals[3];
                if (vals[4] !== null) row.provider_order_id = vals[4];
                if (vals[5] !== null) row.provider_payment_id = vals[5];
                return { meta: { changes: 1, last_row_id: row.id } };
            }
            return { meta: { changes: 0, last_row_id: 0 } };
        }

        return { meta: { changes: 0, last_row_id: 0 } };
    }
}

async function generateWebhookSignature(bodyText, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
    return Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

async function runTests() {
    console.log('🧪 Starting Tools4Genz Phase 8C QR Test Suite...\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAIL: ${message}`);
            failed++;
            throw new Error(message);
        } else {
            console.log(`✅ PASS: ${message}`);
            passed++;
        }
    }

    const db = new InMemoryD1();
    const TEST_KEY_ID = 'rzp_test_placeholder_key';
    const TEST_KEY_SECRET = 'rzp_sec_SHOULD_NEVER_LEAK';
    const TEST_WEBHOOK_SECRET = 'whsec_SHOULD_NEVER_LEAK';
    const env = {
        DB: db,
        ALLOWED_ORIGINS: 'http://localhost:5173,https://tools4genz.com',
        RAZORPAY_KEY_ID: TEST_KEY_ID,
        RAZORPAY_KEY_SECRET: TEST_KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        PURCHASE_AVAILABILITY_BYPASS: 'test-only',
    };

    // Helper: create order via public API
    async function createOrder(projectId = 'ml-sentiment-analyzer', extra = {}) {
        const resp = await worker.fetch(
            new Request('https://api.tools4genz.com/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    customerName: 'QR Test Buyer',
                    customerEmail: 'qr-buyer@example.com',
                    customerPhone: '+919999999999',
                    ...extra,
                }),
            }),
            env
        );
        return { resp, data: (await resp.json())?.data };
    }

    // --- 1. Server-Authoritative Price & Tamper Resistance ---
    console.log('--- 1. Order Creation & Price Integrity ---');

    const tamperResp = await createOrder('ml-sentiment-analyzer', { amount: 1, price: 1, currency: 'USD' });
    assert(tamperResp.resp.status === 201, 'QR order created with HTTP 201');
    assert(tamperResp.data.amount === 3999, 'Server authoritative price ₹3999 (ignored frontend amount:1)');
    assert(tamperResp.data.currency === 'INR', 'Server authoritative currency INR (ignored USD)');
    assert(tamperResp.data.orderId.startsWith('TG-ORD-'), 'Order ID has TG-ORD- prefix');
    const orderId = tamperResp.data.orderId;

    // --- 2. QR Creation with Locked Amount ---
    console.log('\n--- 2. Dynamic UPI QR Generation (Simulated Test Mode) ---');

    const qrResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${orderId}/payment/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        env
    );
    assert(qrResp.status === 201, 'QR generation returns HTTP 201');
    const qrData = (await qrResp.json()).data;
    assert(qrData.qrId && qrData.qrId.startsWith('qr_sim_'), 'Simulated QR id assigned (qr_sim_ prefix)');
    assert(qrData.imageUrl && qrData.imageUrl.startsWith('https://rzp.io/'), 'Razorpay-hosted QR image URL returned');
    assert(qrData.amount === 3999, 'QR amount locked to server order amount (₹3,999)');
    assert(qrData.currency === 'INR', 'QR currency is INR');
    assert(typeof qrData.expiresAt === 'string' && qrData.expiresAt.length > 0, 'QR has expiry timestamp');

    // Secret leak check
    const qrJson = JSON.stringify(qrData);
    assert(!qrJson.includes(TEST_KEY_SECRET), 'QR response does NOT contain the Razorpay key secret');
    assert(!qrJson.includes(TEST_WEBHOOK_SECRET), 'QR response does NOT contain the webhook secret');

    // --- 3. QR Idempotency ---
    console.log('\n--- 3. QR Idempotency ---');
    const dupQrResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${orderId}/payment/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        env
    );
    assert(dupQrResp.status === 200, 'Re-requesting active QR returns HTTP 200');
    const dupQrData = (await dupQrResp.json()).data;
    assert(dupQrData.qrId === qrData.qrId, 'Same active QR id is returned idempotently');
    assert(dupQrData.amount === 3999, 'Idempotent QR amount stays locked to ₹3,999');

    // --- 4. Simulated QR Payment Webhook (notes.order_id fallback) ---
    console.log('\n--- 4. QR Payment Webhook Reconciliation ---');
    const qrPaymentPayload = {
        entity: 'event',
        event: 'payment.captured',
        payload: {
            payment: {
                entity: {
                    id: 'pay_qr_test_001',
                    entity: 'payment',
                    amount: 399900,
                    currency: 'INR',
                    status: 'captured',
                    order_id: null, // UPI QR direct payments have NO Razorpay Order
                    qr_code_id: qrData.qrId,
                    notes: {
                        order_id: orderId, // Our internal TG-ORD reference
                        project_id: 'ml-sentiment-analyzer',
                    },
                },
            },
            qr_code: {
                entity: {
                    id: qrData.qrId,
                    entity: 'qr_code',
                    name: `Tools4Genz Order ${orderId}`,
                    usage: 'single_use',
                    type: 'upi_qr',
                    payment_amount: 399900,
                    status: 'active',
                    notes: {
                        order_id: orderId,
                        project_id: 'ml-sentiment-analyzer',
                    },
                },
            },
        },
        created_at: Math.floor(Date.now() / 1000),
    };
    const qrPaymentBody = JSON.stringify(qrPaymentPayload);
    const qrPaymentSig = await generateWebhookSignature(qrPaymentBody, TEST_WEBHOOK_SECRET);

    const webhookResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': qrPaymentSig },
            body: qrPaymentBody,
        }),
        env
    );
    assert(webhookResp.status === 200, 'QR webhook returns HTTP 200');
    const updatedOrder = db.tables.orders.find((o) => o.order_id === orderId);
    assert(updatedOrder.status === 'paid', 'QR direct payment marked order as paid');
    assert(updatedOrder.provider_payment_id === 'pay_qr_test_001', 'QR payment provider payment ID recorded');

    // --- 5. Duplicate QR Webhook Idempotency ---
    console.log('\n--- 5. Duplicate QR Webhook Idempotency ---');
    const dupWebhookResp = await worker.fetch(
        new Request('https://api.tools4gen.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': qrPaymentSig },
            body: qrPaymentBody,
        }),
        env
    );
    assert(dupWebhookResp.status === 200, 'Duplicate QR webhook returns HTTP 200');
    const dupWebhookJson = await dupWebhookResp.json();
    assert(dupWebhookJson.data.duplicate === true, 'Duplicate QR webhook acknowledged idempotently');

    // --- 6. Security: Secrets never appear anywhere in the public API ---
    console.log('\n--- 6. Secrets Never Leak ---');
    const publicOrderResp = await worker.fetch(
        new Request(`https://localhost/api/orders/${orderId}`, {
            method: 'GET',
            headers: { Authorization: `Purchase ${tamperResp.data.accessToken}` },
        }),
        env
    );
    const publicOrderJson = await publicOrderResp.json();
    const publicString = JSON.stringify(publicOrderJson);
    assert(!publicString.includes(TEST_KEY_SECRET), 'Public order lookup excludes key secret');
    assert(!publicString.includes(TEST_WEBHOOK_SECRET), 'Public order lookup excludes webhook secret');
    assert(publicOrderJson.data.qrId === undefined, 'Public order lookup does not expose raw QR id');

    // --- 7. Edge Cases & Rejections ---
    console.log('\n--- 7. Edge Cases & Rejections ---');

    // Unknown order QR
    const unknownQrResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders/TG-ORD-NOPE/payment/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        env
    );
    assert(unknownQrResp.status === 404, 'QR for unknown order returns HTTP 404');

    // Invalid project rejected at order creation
    const badProject = await createOrder('not-a-real-project');
    assert(badProject.resp.status === 404, 'Order for invalid project returns HTTP 404');

    // Already-paid order rejects new QR (idempotent safe)
    const alreadyPaidResp = await worker.fetch(
        new Request(`https://api.local/api/orders/${orderId}/payment/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        env
    );
    assert(alreadyPaidResp.status === 400, 'QR request on already-paid order returns HTTP 400 ALREADY_PAID');

    // GET /api/orders/:orderId/payment/qr should be 405
    const methodNotAllowed = await worker.fetch(
        new Request(`https://api.local/api/orders/${orderId}/payment/qr`, { method: 'GET' }),
        env
    );
    assert(methodNotAllowed.status === 405, 'GET on QR endpoint returns HTTP 405 Method Not Allowed');

    // --- 8. Real Razorpay API Path (mocked fetch) ---
    console.log('\n--- 8. Razorpay QR API Request/Response (Mocked Fetch) ---');

    // Create a fresh order for the real-API-path test
    const realApiOrderResp = await createOrder('ml-sentiment-analyzer');
    const realApiOrderId = realApiOrderResp.data.orderId;

    // Use a real-looking test key so isRealMerchantKey is true and the
    // worker actually calls the Razorpay API (which we intercept).
    const realKeyEnv = {
        ...env,
        RAZORPAY_KEY_ID: 'rzp_test_realKeyForMock',
        RAZORPAY_KEY_SECRET: 'rzp_sec_realSecretForMock',
    };

    // Capture the outgoing Razorpay QR request body
    let capturedQrRequestBody = null;
    const originalFetch = globalThis.fetch;

    // Mock 1: Successful QR creation
    globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('api.razorpay.com/v1/payments/qr_codes')) {
            capturedQrRequestBody = JSON.parse(init.body);
            return new Response(
                JSON.stringify({
                    id: 'qr_mock_success_001',
                    entity: 'qr_code',
                    name: 'Tools4Genz Order',
                    usage: 'single_use',
                    type: 'upi_qr',
                    image_url: 'https://rzp.io/i/mock_success_001',
                    payment_amount: 399900,
                    status: 'active',
                    fixed_amount: true,
                    close_by: Math.floor(Date.now() / 1000) + 900,
                    notes: { order_id: realApiOrderId, project_id: 'ml-sentiment-analyzer' },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return originalFetch(input, init);
    };

    const realQrResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${realApiOrderId}/payment/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        realKeyEnv
    );
    assert(realQrResp.status === 201, 'Real API path QR creation returns HTTP 201');
    const realQrData = (await realQrResp.json()).data;
    assert(realQrData.qrId === 'qr_mock_success_001', 'Razorpay QR id stored from API response');
    assert(realQrData.imageUrl === 'https://rzp.io/i/mock_success_001', 'Razorpay QR image URL stored from API response');
    assert(realQrData.amount === 3999, 'QR amount remains server-authoritative ₹3,999');

    // Verify the outgoing request body
    assert(capturedQrRequestBody !== null, 'Razorpay QR API was actually called');
    assert(capturedQrRequestBody.payment_amount === 399900, 'INR ₹3,999 correctly converted to 399900 paise');
    assert(capturedQrRequestBody.fixed_amount === true, 'fixed_amount: true requested from Razorpay');
    assert(capturedQrRequestBody.usage === 'single_use', 'single_use QR requested from Razorpay');
    assert(capturedQrRequestBody.type === 'upi_qr', 'upi_qr type requested from Razorpay');
    assert(capturedQrRequestBody.notes.order_id === realApiOrderId, 'Internal order reference attached to QR notes');

    // Verify D1 stored the QR metadata
    const storedOrder = db.tables.orders.find((o) => o.order_id === realApiOrderId);
    assert(storedOrder.qr_id === 'qr_mock_success_001', 'D1 stores qr_id from Razorpay response');
    assert(storedOrder.qr_image_url === 'https://rzp.io/i/mock_success_001', 'D1 stores qr_image_url from Razorpay response');
    assert(storedOrder.qr_status === 'active', 'D1 stores qr_status as active');
    assert(storedOrder.status === 'payment_pending', 'Order NOT marked paid merely because QR was created');

    // Mock 2: FEATURE_NOT_ENABLED failure
    // Use a FRESH order (the previous one already has an active QR stored,
    // which would short-circuit to the idempotent 200 path).
    const disabledOrderResp = await createOrder('ml-sentiment-analyzer');
    const disabledOrderId = disabledOrderResp.data.orderId;

    globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('api.razorpay.com/v1/payments/qr_codes')) {
            return new Response(
                JSON.stringify({
                    error: {
                        code: 'BAD_REQUEST_ERROR',
                        description: 'Dynamic UPI QR is not enabled on this merchant account',
                    },
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return originalFetch(input, init);
    };

    const disabledQrResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${disabledOrderId}/payment/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        realKeyEnv
    );
    assert(disabledQrResp.status === 400, 'Dynamic QR disabled returns HTTP 400');
    const disabledQrJson = await disabledQrResp.json();
    assert(disabledQrJson.error.code === 'FEATURE_NOT_ENABLED', 'Error code is FEATURE_NOT_ENABLED');
    assert(
        disabledQrJson.error.message.includes('not enabled'),
        'Clean user-facing message returned (no fake QR)'
    );

    // Restore real fetch
    globalThis.fetch = originalFetch;

    // --- 9. Wrong-Amount QR Webhook Does NOT Mark Order Paid ---
    console.log('\n--- 9. Wrong-Amount QR Webhook Rejection ---');

    // Create a fresh order for wrong-amount test
    const wrongAmtOrderResp = await createOrder('ml-sentiment-analyzer');
    const wrongAmtOrderId = wrongAmtOrderResp.data.orderId;

    // Seed a QR for this order (simulated path)
    await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${wrongAmtOrderId}/payment/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }),
        env
    );
    const wrongAmtOrder = db.tables.orders.find((o) => o.order_id === wrongAmtOrderId);

    // Webhook claims only ₹1 (100 paise) instead of ₹3,999 (399900 paise)
    const wrongAmountPayload = {
        entity: 'event',
        event: 'payment.captured',
        payload: {
            payment: {
                entity: {
                    id: 'pay_qr_wrong_amount_001',
                    entity: 'payment',
                    amount: 100,
                    currency: 'INR',
                    status: 'captured',
                    order_id: null,
                    qr_code_id: wrongAmtOrder.qr_id,
                    notes: { order_id: wrongAmtOrderId, project_id: 'ml-sentiment-analyzer' },
                },
            },
            qr_code: {
                entity: {
                    id: wrongAmtOrder.qr_id,
                    entity: 'qr_code',
                    usage: 'single_use',
                    type: 'upi_qr',
                    payment_amount: 100,
                    status: 'active',
                    notes: { order_id: wrongAmtOrderId, project_id: 'ml-sentiment-analyzer' },
                },
            },
        },
        created_at: Math.floor(Date.now() / 1000),
    };
    const wrongAmountBody = JSON.stringify(wrongAmountPayload);
    const wrongAmountSig = await generateWebhookSignature(wrongAmountBody, TEST_WEBHOOK_SECRET);

    const wrongAmountWebhookResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': wrongAmountSig },
            body: wrongAmountBody,
        }),
        env
    );
    assert(wrongAmountWebhookResp.status === 200, 'Wrong-amount QR webhook safely acknowledged with HTTP 200');
    const wrongAmountOrderAfter = db.tables.orders.find((o) => o.order_id === wrongAmtOrderId);
    assert(
        wrongAmountOrderAfter.status === 'payment_pending',
        'Order with wrong QR payment amount is NOT marked paid'
    );

    console.log(`\n🎉 Phase 8C QR Test Suite Completed: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('\n💥 Phase 8C QR Tests Failed:', err);
    process.exit(1);
});
