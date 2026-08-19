/**
 * Tools4Genz Phase 9 — Digital Delivery Test Suite
 *
 * Tests:
 * 1.  Delivery creation after paid order
 * 2.  Delivery idempotency (no duplicate rows)
 * 3.  Unpaid order cannot download
 * 4.  Paid order with pending delivery cannot download
 * 5.  Ready delivery can download (R2 mocked)
 * 6.  Arbitrary R2 object key cannot be requested
 * 7.  Download count increments
 * 8.  Duplicate webhook does not duplicate delivery
 * 9.  Delivery preparation does not mark order paid
 * 10. Public order lookup does not expose internal delivery key
 * 11. Unknown order returns 404
 * 12. Wrong HTTP method returns 405
 * 13. Missing R2 object handled safely (reset to pending)
 * 14. Tampered project/order parameters rejected
 * 15. Pending delivery becomes ready after its R2 artifact is uploaded
 * 16. Preparation service rejects unpaid orders
 */

import worker from '../worker/src/index.ts';
import { prepareDelivery } from '../worker/src/services/delivery.ts';

// In-Memory D1 Mock supporting all tables including digital_deliveries
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
            digital_deliveries: [],
        };
        this.autoIncrement = {
            requests: 1,
            admin_users: 1,
            admin_sessions: 1,
            orders: 1,
            payment_webhook_events: 1,
            digital_deliveries: 1,
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

        // SELECT COUNT(*) FROM orders
        if (sql.includes('SELECT COUNT(*) as c FROM orders')) {
            return { results: [{ c: this.db.tables.orders.length }] };
        }
        // SELECT COUNT(*) FROM payment_webhook_events
        if (sql.includes('SELECT COUNT(*) as c FROM payment_webhook_events')) {
            return { results: [{ c: this.db.tables.payment_webhook_events.length }] };
        }

        // admin_projects lookup
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
                            delivery_status: row.delivery_status || null,
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

        // SELECT digital_deliveries
        if (sql.includes('FROM digital_deliveries')) {
            if (sql.includes('WHERE order_id = ?')) {
                const row = this.db.tables.digital_deliveries.find((d) => d.order_id === vals[0]);
                return { results: row ? [{ ...row }] : [] };
            }
            if (sql.includes('WHERE id = ?')) {
                const row = this.db.tables.digital_deliveries.find((d) => d.id === vals[0]);
                return { results: row ? [{ ...row }] : [] };
            }
            return { results: [...this.db.tables.digital_deliveries] };
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

        // UPDATE orders SET delivery_id = ?, ... (linkDelivery)
        if (sql.includes('UPDATE orders') && sql.includes('SET delivery_id = ?')) {
            const target = this.db.tables.orders.find((o) => o.order_id === vals[4]);
            if (target) {
                target.delivery_id = vals[0];
                target.delivery_status = vals[1];
                // delivery_project_id comes from a subquery — resolve manually
                const delivery = this.db.tables.digital_deliveries.find((d) => d.id === vals[0]);
                target.delivery_project_id = delivery ? delivery.project_id : null;
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

        // INSERT INTO digital_deliveries
        if (sql.includes('INSERT INTO digital_deliveries')) {
            const id = this.db.autoIncrement.digital_deliveries++;
            const row = {
                id,
                order_id: vals[0],
                project_id: vals[1],
                delivery_status: vals[2],
                delivery_key: vals[3],
                download_count: vals[4],
                last_download_at: vals[5],
                created_at: vals[6],
                updated_at: vals[7],
                file_size: vals[8],
                sha256: vals[9],
            };
            this.db.tables.digital_deliveries.push(row);
            return { meta: { changes: 1, last_row_id: id } };
        }

        // UPDATE digital_deliveries SET delivery_status = ?, ... (update)
        if (sql.includes('UPDATE digital_deliveries') && sql.includes('delivery_status = ?')) {
            const targetId = vals[vals.length - 1];
            const row = this.db.tables.digital_deliveries.find((d) => d.id === targetId);
            if (row) {
                // Find which fields were set
                const sets = sql.match(/set\s+([^\n]+?)(?:,\s*updated_at\s*=\s*\?)?\s*where id = \?/i);
                const setParts = (sets ? sets[1] : '').split(',').map((s) => s.trim());
                let valueIdx = 0;
                for (const part of setParts) {
                    if (part.startsWith('delivery_status')) { row.delivery_status = vals[valueIdx]; valueIdx++; }
                    else if (part.startsWith('file_size')) { row.file_size = vals[valueIdx]; valueIdx++; }
                    else if (part.startsWith('sha256')) { row.sha256 = vals[valueIdx]; valueIdx++; }
                }
                // updated_at is second-to-last bound value
                row.updated_at = vals[vals.length - 2];
                return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
        }

        // UPDATE digital_deliveries SET download_count = download_count + 1, ... (incrementDownloadCount)
        if (sql.includes('UPDATE digital_deliveries') && sql.includes('download_count')) {
            const targetId = vals[2];
            const row = this.db.tables.digital_deliveries.find((d) => d.id === targetId);
            if (row) {
                row.download_count += 1;
                row.last_download_at = vals[0];
                row.updated_at = vals[1];
                return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
        }

        return { meta: { changes: 0, last_row_id: 0 } };
    }
}

class MockR2Bucket {
    constructor(objects = {}) {
        this.objects = objects;
        this.headCalls = [];
        this.getCalls = [];
    }

    async head(key) {
        this.headCalls.push(key);
        return this.objects[key] ? { key, size: this.objects[key].size, checksums: { sha256: 'mock-sha256' } } : null;
    }

    async get(key) {
        this.getCalls.push(key);
        const obj = this.objects[key];
        if (!obj) return null;
        return {
            key,
            size: obj.size,
            httpEtag: 'mock-etag',
            etag: 'mock-etag',
            uploaded: new Date(),
            checksums: { sha256: 'mock-sha256' },
            body: new ReadableStream({
                start(controller) {
                    controller.enqueue(obj.body);
                    controller.close();
                },
            }),
        };
    }

    async put() {
        return { key: '', size: 0, httpEtag: '', etag: '' };
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
    console.log('🧪 Starting Tools4Genz Phase 9 Digital Delivery Test Suite...\n');

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

    // --- 1. Delivery creation after paid order ---
    console.log('--- 1. Order Creation & Delivery Preparation ---');

    const bucket = new MockR2Bucket();
    const env = {
        DB: db,
        ALLOWED_ORIGINS: 'http://localhost:5173,https://tools4genz.com',
        RAZORPAY_KEY_ID: TEST_KEY_ID,
        RAZORPAY_KEY_SECRET: TEST_KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        DIGITAL_DELIVERY_BUCKET: bucket,
        PURCHASE_AVAILABILITY_BYPASS: 'test-only',
    };

    // Create order via API
    const orderResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 'ml-sentiment-analyzer',
                customerName: 'Phase 9 Buyer',
                customerEmail: 'p9@example.com',
                customerPhone: '+919999999999',
            }),
        }),
        env
    );
    assert(orderResp.status === 201, 'Order created with HTTP 201');
    const orderData = (await orderResp.json()).data;
    const orderId = orderData.orderId;
    assert(orderId.startsWith('TG-ORD-'), 'Order ID has TG-ORD- prefix');

    // Seed R2 with the actual generated order ID so delivery becomes ready.
    bucket.objects[`projects/ml-sentiment-analyzer/${orderId}.zip`] = {
        size: 1024,
        body: new Uint8Array([80, 75, 3, 4]), // ZIP magic bytes
    };

    // Simulate payment via webhook (order.paid)
    const paymentPayload = {
        entity: 'event',
        event: 'order.paid',
        payload: {
            payment: {
                entity: {
                    id: 'pay_p9_001',
                    entity: 'payment',
                    amount: 399900,
                    currency: 'INR',
                    status: 'captured',
                    order_id: orderData.providerOrderId,
                },
            },
            order: {
                entity: {
                    id: orderData.providerOrderId,
                    entity: 'order',
                    amount: 399900,
                    currency: 'INR',
                },
            },
        },
        created_at: Math.floor(Date.now() / 1000),
    };
    const paymentBody = JSON.stringify(paymentPayload);
    const paymentSig = await generateWebhookSignature(paymentBody, TEST_WEBHOOK_SECRET);

    const webhookResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': paymentSig },
            body: paymentBody,
        }),
        env
    );
    assert(webhookResp.status === 200, 'Payment webhook acknowledged');

    const storedOrder = db.tables.orders.find((o) => o.order_id === orderId);
    assert(storedOrder.status === 'paid', 'Order marked paid after webhook');
    const deliveries = db.tables.digital_deliveries.filter((d) => d.order_id === orderId);
    assert(deliveries.length === 1, 'Exactly 1 delivery record created after payment');
    assert(deliveries[0].delivery_status === 'ready', 'Delivery status ready because R2 object exists');
    assert(deliveries[0].delivery_key === `projects/ml-sentiment-analyzer/${orderId}.zip`, 'Delivery key follows server-side pattern');
    assert(deliveries[0].download_count === 0, 'Initial download count is 0');
    assert(storedOrder.delivery_id === deliveries[0].id, 'Order linked to delivery_id');
    assert(storedOrder.delivery_status === 'ready', 'Order delivery_status linked');

    // --- 2. Delivery idempotency ---
    console.log('\n--- 2. Delivery Idempotency ---');
    const deliveryCountBefore = db.tables.digital_deliveries.length;

    // Simulate a second webhook event (different event id) for same order
    const duplicatePayload = {
        entity: 'event',
        event: 'payment.captured',
        payload: {
            payment: {
                entity: {
                    id: 'pay_p9_002',
                    entity: 'payment',
                    amount: 399900,
                    currency: 'INR',
                    status: 'captured',
                    order_id: orderData.providerOrderId,
                },
            },
            order: {
                entity: {
                    id: orderData.providerOrderId,
                    entity: 'order',
                    amount: 399900,
                    currency: 'INR',
                },
            },
        },
        created_at: Math.floor(Date.now() / 1000),
    };
    const dupBody = JSON.stringify(duplicatePayload);
    const dupSig = await generateWebhookSignature(dupBody, TEST_WEBHOOK_SECRET);
    await worker.fetch(
        new Request('https://api.tools4genz.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': dupSig },
            body: dupBody,
        }),
        env
    );
    const deliveryCountAfter = db.tables.digital_deliveries.length;
    assert(deliveryCountAfter === deliveryCountBefore, 'Repeated webhook did NOT create duplicate delivery rows');

    // --- 3. Unpaid order cannot download ---
    console.log('\n--- 3. Unpaid Order Download Rejected ---');
    const unpaidOrderResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 'ml-sentiment-analyzer',
                customerName: 'Unpaid Buyer',
                customerEmail: 'unpaid@example.com',
            }),
        }),
        env
    );
    const unpaidOrderData = (await unpaidOrderResp.json()).data;
    const unpaidDownloadResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${unpaidOrderData.orderId}/download`, {
            method: 'GET',
            headers: { Authorization: `Purchase ${unpaidOrderData.accessToken}` },
        }),
        env
    );
    assert(unpaidDownloadResp.status === 402, 'Unpaid order download returns HTTP 402 PAYMENT_REQUIRED');
    const unpaidJson = await unpaidDownloadResp.json();
    assert(unpaidJson.error.code === 'PAYMENT_REQUIRED', 'Error code is PAYMENT_REQUIRED');

    // --- 4. Paid order with pending delivery cannot download ---
    console.log('\n--- 4. Pending Delivery Download Rejected ---');
    const pendingOrderResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 'ml-sentiment-analyzer',
                customerName: 'Pending Buyer',
                customerEmail: 'pending@example.com',
            }),
        }),
        env
    );
    const pendingOrderData = (await pendingOrderResp.json()).data;

    // Mark paid via webhook (no matching R2 object -> pending)
    const pendingPayload = {
        entity: 'event',
        event: 'order.paid',
        payload: {
            payment: {
                entity: {
                    id: 'pay_p9_pending',
                    entity: 'payment',
                    amount: 399900,
                    currency: 'INR',
                    status: 'captured',
                    order_id: pendingOrderData.providerOrderId,
                },
            },
            order: {
                entity: {
                    id: pendingOrderData.providerOrderId,
                    entity: 'order',
                    amount: 399900,
                    currency: 'INR',
                },
            },
        },
        created_at: Math.floor(Date.now() / 1000),
    };
    const pendingBody = JSON.stringify(pendingPayload);
    const pendingSig = await generateWebhookSignature(pendingBody, TEST_WEBHOOK_SECRET);
    await worker.fetch(
        new Request('https://api.tools4genz.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': pendingSig },
            body: pendingBody,
        }),
        env
    );

    const pendingOrder = db.tables.orders.find((o) => o.order_id === pendingOrderData.orderId);
    assert(pendingOrder.status === 'paid', 'Pending-order payment confirmed');
    const pendingDelivery = db.tables.digital_deliveries.find((d) => d.order_id === pendingOrderData.orderId);
    assert(pendingDelivery && pendingDelivery.delivery_status === 'pending', 'Delivery is pending when R2 object missing');

    const pendingDownloadResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${pendingOrderData.orderId}/download`, {
            method: 'GET',
            headers: { Authorization: `Purchase ${pendingOrderData.accessToken}` },
        }),
        env
    );
    assert(pendingDownloadResp.status === 409, 'Pending delivery download returns HTTP 409 DELIVERY_NOT_READY');
    const pendingDownloadJson = await pendingDownloadResp.json();
    assert(pendingDownloadJson.error.code === 'DELIVERY_NOT_READY', 'Error code is DELIVERY_NOT_READY');

    // --- 5. Ready delivery can download ---
    console.log('\n--- 5. Ready Delivery Download ---');
    const readyDownloadResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${orderId}/download`, {
            method: 'GET',
            headers: { Authorization: `Purchase ${orderData.accessToken}` },
        }),
        env
    );
    assert(readyDownloadResp.status === 200, 'Ready delivery download returns HTTP 200');
    assert(readyDownloadResp.headers.get('Content-Type') === 'application/zip', 'Content-Type is application/zip');
    assert(readyDownloadResp.headers.get('Content-Disposition')?.includes('.zip'), 'Content-Disposition includes .zip filename');

    // --- 6. Arbitrary R2 object key cannot be requested ---
    console.log('\n--- 6. Arbitrary Object Key Not Allowed ---');
    const tamperedResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/TG-ORD-FAKE-9999/download`, {
            method: 'GET',
        }),
        env
    );
    assert(tamperedResp.status === 404, 'Download for unknown/forged order ID returns 404');
    const forgedKey = `projects/ml-sentiment-analyzer/${orderId}.zip`;
    const headCallsBeforeTamper = bucket.headCalls.length;
    const tamperedKeyResp = await worker.fetch(
        new Request(
            `https://api.tools4genz.com/api/orders/${pendingOrderData.orderId}/download?delivery_key=${encodeURIComponent(forgedKey)}`,
            {
                method: 'GET',
                headers: { Authorization: `Purchase ${pendingOrderData.accessToken}` },
            }
        ),
        env
    );
    assert(tamperedKeyResp.status === 409, 'Frontend-supplied R2 key cannot unlock another delivery');
    assert(
        bucket.headCalls[headCallsBeforeTamper] ===
            `projects/ml-sentiment-analyzer/${pendingOrderData.orderId}.zip`,
        'Worker ignores arbitrary key input and resolves the D1 delivery key'
    );

    // --- 7. Download count increments ---
    console.log('\n--- 7. Download Count Increments ---');
    const deliveryAfterDownload = db.tables.digital_deliveries.find((d) => d.order_id === orderId);
    assert(deliveryAfterDownload.download_count === 1, 'Download count incremented to 1');
    assert(deliveryAfterDownload.last_download_at !== null, 'last_download_at was set');

    // --- 8. Duplicate webhook does not duplicate delivery ---
    console.log('\n--- 8. Duplicate Webhook No Duplicate Delivery ---');
    const retryResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/webhooks/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': paymentSig },
            body: paymentBody,
        }),
        env
    );
    const retryJson = await retryResp.json();
    assert(retryJson.data.duplicate === true, 'Duplicate webhook acknowledged idempotently');
    const deliveriesAfterRetry = db.tables.digital_deliveries.filter((d) => d.order_id === orderId);
    assert(deliveriesAfterRetry.length === 1, 'Still exactly 1 delivery (no duplicate from retry)');

    // --- 9. Delivery does not mark order paid ---
    console.log('\n--- 9. Delivery Does NOT Mark Order Paid ---');
    const freshOrderResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 'ml-sentiment-analyzer',
                customerName: 'Fresh Buyer',
                customerEmail: 'fresh@example.com',
            }),
        }),
        env
    );
    const freshOrderData = (await freshOrderResp.json()).data;
    const freshOrder = db.tables.orders.find((o) => o.order_id === freshOrderData.orderId);
    assert(freshOrder.status === 'payment_pending', 'Fresh order stays payment_pending');
    assert(freshOrder.delivery_id === undefined || freshOrder.delivery_id === null, 'No delivery linked for unpaid fresh order');
    const unpaidPreparation = await prepareDelivery(db, freshOrderData.orderId, bucket);
    assert(unpaidPreparation === null, 'Preparation service rejects an unpaid order');
    assert(
        !db.tables.digital_deliveries.some((d) => d.order_id === freshOrderData.orderId),
        'Unpaid preparation attempt creates no delivery row'
    );

    // --- 10. Public order lookup does not expose internal delivery key ---
    console.log('\n--- 10. Public Order Lookup Safe Fields ---');
    const publicLookupResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${orderId}`, {
            method: 'GET',
            headers: { Authorization: `Purchase ${orderData.accessToken}` },
        }),
        env
    );
    const publicLookupJson = await publicLookupResp.json();
    const publicString = JSON.stringify(publicLookupJson);
    assert(publicLookupResp.status === 200, 'Public order lookup returns HTTP 200');
    assert(publicLookupJson.data.deliveryStatus === 'ready', 'Public lookup exposes deliveryStatus');
    assert(!publicString.includes('projects/ml-sentiment-analyzer/'), 'Public lookup does NOT expose R2 object key');
    assert(!publicString.includes(TEST_KEY_SECRET), 'Public lookup does NOT expose Razorpay key secret');
    assert(!publicString.includes(TEST_WEBHOOK_SECRET), 'Public lookup does NOT expose webhook secret');

    // --- 11. Unknown order returns 404 ---
    console.log('\n--- 11. Unknown Order 404 ---');
    const unknownOrderResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders/TG-ORD-NOPE/download', { method: 'GET' }),
        env
    );
    assert(unknownOrderResp.status === 404, 'Unknown order download returns 404');

    // --- 12. Wrong HTTP method returns 405 ---
    console.log('\n--- 12. Wrong HTTP Method 405 ---');
    const wrongMethodResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${orderId}/download`, { method: 'POST' }),
        env
    );
    assert(wrongMethodResp.status === 405, 'POST on download endpoint returns 405');

    // --- 13. Missing R2 object handled safely ---
    console.log('\n--- 13. Missing R2 Object Safe Fallback ---');
    const ghostDeliveryId = db.autoIncrement.digital_deliveries++;
    db.tables.digital_deliveries.push({
        id: ghostDeliveryId,
        order_id: 'TG-ORD-GHOST',
        project_id: 'ml-sentiment-analyzer',
        delivery_status: 'ready',
        delivery_key: 'projects/ml-sentiment-analyzer/TG-ORD-GHOST.zip',
        download_count: 0,
        last_download_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        file_size: 200,
        sha256: 'ghost-sha',
    });
    db.tables.orders.push({
        id: db.autoIncrement.orders++,
        order_id: 'TG-ORD-GHOST',
        project_id: 'ml-sentiment-analyzer',
        project_slug: 'ml-sentiment-analyzer',
        project_title: 'AI Text Sentiment Analyzer',
        customer_name: 'Ghost Buyer',
        customer_email: 'ghost@example.com',
        customer_phone: null,
        amount: 3999,
        currency: 'INR',
        status: 'paid',
        payment_provider: 'razorpay',
        provider_order_id: null,
        provider_payment_id: 'pay_ghost',
        provider_signature: 'sig',
        notes: null,
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        delivery_id: ghostDeliveryId,
        delivery_status: 'ready',
        access_token_hash: db.tables.orders.find((o) => o.order_id === orderId).access_token_hash,
        access_token_created_at: new Date().toISOString(),
    });

    const ghostResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders/TG-ORD-GHOST/download', {
            method: 'GET',
            headers: { Authorization: `Purchase ${orderData.accessToken}` },
        }),
        env
    );
    assert(ghostResp.status === 409, 'Missing R2 object returns HTTP 409 DELIVERY_NOT_READY');
    const ghostDelivery = db.tables.digital_deliveries.find((d) => d.id === ghostDeliveryId);
    assert(ghostDelivery.delivery_status === 'pending', 'Delivery was reset to pending after missing object');

    // --- 14. Tampered project/order parameters rejected ---
    console.log('\n--- 14. Tampered Parameters Rejected ---');
    const tamperedCreateResp = await worker.fetch(
        new Request('https://api.tools4genz.com/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: 'ml-sentiment-analyzer',
                customerName: 'Tamper Buyer',
                customerEmail: 'tamper@example.com',
                amount: 1,
                price: 1,
                currency: 'USD',
            }),
        }),
        env
    );
    const tamperedCreateJson = await tamperedCreateResp.json();
    assert(tamperedCreateResp.status === 201, 'Order created despite tamper attempt');
    assert(tamperedCreateJson.data.amount === 3999, 'Server-authoritative ₹3,999 price enforced (tampered amount ignored)');
    assert(tamperedCreateJson.data.currency === 'INR', 'Server-authoritative INR currency enforced (USD ignored)');

    // --- 15. Pending delivery is promoted after the real artifact appears ---
    console.log('\n--- 15. Pending Delivery Refreshes From R2 ---');
    bucket.objects[`projects/ml-sentiment-analyzer/${pendingOrderData.orderId}.zip`] = {
        size: 2048,
        body: new Uint8Array([80, 75, 3, 4]),
    };
    const refreshedStatusResp = await worker.fetch(
        new Request(`https://api.tools4genz.com/api/orders/${pendingOrderData.orderId}`, {
            method: 'GET',
            headers: { Authorization: `Purchase ${pendingOrderData.accessToken}` },
        }),
        env
    );
    const refreshedStatusJson = await refreshedStatusResp.json();
    const refreshedDelivery = db.tables.digital_deliveries.find(
        (d) => d.order_id === pendingOrderData.orderId
    );
    assert(refreshedStatusResp.status === 200, 'Paid order status refresh returns HTTP 200');
    assert(refreshedStatusJson.data.deliveryStatus === 'ready', 'Public status promotes delivery to ready');
    assert(refreshedDelivery.delivery_status === 'ready', 'D1 delivery status updated to ready');
    assert(refreshedDelivery.file_size === 2048, 'R2 artifact size recorded server-side');

    console.log(`\n🎉 Phase 9 Digital Delivery Test Suite Completed: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('\n💥 Phase 9 Digital Delivery Tests Failed:', err);
    process.exit(1);
});
