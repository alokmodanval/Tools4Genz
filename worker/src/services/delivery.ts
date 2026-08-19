/**
 * Tools4Genz Digital Delivery Service (Phase 9)
 *
 * Handles secure preparation and retrieval of purchased project artifacts
 * stored in a private Cloudflare R2 bucket.
 */

import {
    D1Database,
    digitalDeliveryRepository,
    orderRepository,
    projectReleaseRepository,
} from '../db/repository';
import { DigitalDeliveryRow } from '../db/schema';
import {
    AssetStorageProviderName,
    ProjectAssetStorage,
    resolveAssetStorage,
    StorageBindings,
    StoredAsset,
} from './assetStorage';
export type { KVNamespace, R2Bucket, StorageBindings } from './assetStorage';

export type DeliveryStatus = 'pending' | 'ready' | 'failed';

export const DELIVERY_STATUS_PENDING: DeliveryStatus = 'pending';
export const DELIVERY_STATUS_READY: DeliveryStatus = 'ready';
export const DELIVERY_STATUS_FAILED: DeliveryStatus = 'failed';

const SAFE_DOWNLOAD_FILENAME_CHARS = /[^a-zA-Z0-9._-]/g;

/**
 * Generate a safe, deterministic private R2 object key for a project/order.
 * Built server-side from the authoritative order record.
 */
export function buildDeliveryKey(orderId: string, projectId: string): string {
    const safeProject = projectId.replace(SAFE_DOWNLOAD_FILENAME_CHARS, '-');
    return `projects/${safeProject}/${orderId}.zip`;
}

/**
 * Determine delivery status by checking whether the artifact actually
 * exists in the private R2 bucket. We never fabricate a downloadable
 * file. If the ZIP is not in R2 yet, the delivery is 'pending'.
 */
export async function resolveDeliveryStatusFromStorage(
    storage: ProjectAssetStorage | null,
    deliveryKey: string
): Promise<{ status: DeliveryStatus; fileSize: number | null; sha256: string | null }> {
    if (!storage) {
        return { status: DELIVERY_STATUS_PENDING, fileSize: null, sha256: null };
    }

    try {
        const metadata = await storage.head(deliveryKey);
        if (!metadata) {
            return { status: DELIVERY_STATUS_PENDING, fileSize: null, sha256: null };
        }
        return {
            status: DELIVERY_STATUS_READY,
            fileSize: metadata.size,
            sha256: metadata.sha256 || null,
        };
    } catch {
        console.error('[Delivery] Private asset metadata lookup failed');
        return { status: DELIVERY_STATUS_FAILED, fileSize: null, sha256: null };
    }
}

/**
 * Prepare (idempotently) a digital delivery record for a paid order.
 *
 * Flow:
 *   1. Re-read the order and require its authoritative D1 status to be paid.
 *   2. Reuse an existing delivery or create one pointing at the private R2 key.
 *   3. Resolve true artifact availability from R2 (pending | ready | failed).
 *   4. Link/refresh the delivery state on the order.
 *
 * NOTE: Creating a delivery does NOT mark an order paid. The caller
 * (webhook reconciliation) marks the order paid first.
 */
export async function prepareDelivery(
    db: D1Database,
    orderId: string,
    bindings: StorageBindings
): Promise<DigitalDeliveryRow | null> {
    try {
        // Re-read the complete order from D1. Callers cannot authorize delivery
        // or select an artifact by supplying project/payment state themselves.
        const order = await orderRepository.findByOrderId(db, orderId);
        if (!order || order.status !== 'paid') {
            return null;
        }

        const existing = await digitalDeliveryRepository.findByOrderId(db, order.order_id);
        if (existing) {
            const publishedRelease = await projectReleaseRepository.findPublishedByProjectId(
                db,
                order.project_id
            );
            if (!existing.release_id && existing.delivery_status !== DELIVERY_STATUS_READY && publishedRelease) {
                await digitalDeliveryRepository.update(db, existing.id, {
                    release_id: publishedRelease.id,
                    delivery_key: publishedRelease.r2_key,
                });
                existing.release_id = publishedRelease.id;
                existing.delivery_key = publishedRelease.r2_key;
            }

            const source = await resolveDeliverySource(db, existing);
            if (!source) {
                await digitalDeliveryRepository.update(db, existing.id, {
                    delivery_status: DELIVERY_STATUS_PENDING,
                    file_size: null,
                    sha256: null,
                });
                await orderRepository.linkDelivery(
                    db,
                    order.order_id,
                    existing.id,
                    DELIVERY_STATUS_PENDING
                );
                return digitalDeliveryRepository.findById(db, existing.id);
            }

            const resolved = await resolveDeliveryStatusFromStorage(
                resolveAssetStorage(bindings, source.provider),
                source.key
            );
            await digitalDeliveryRepository.update(db, existing.id, {
                delivery_status: resolved.status,
                file_size: resolved.fileSize,
                sha256: resolved.sha256,
            });
            await orderRepository.linkDelivery(db, order.order_id, existing.id, resolved.status);
            return digitalDeliveryRepository.findById(db, existing.id);
        }

        const release = await projectReleaseRepository.findPublishedByProjectId(db, order.project_id);
        const deliveryKey = release?.r2_key || buildDeliveryKey(order.order_id, order.project_id);
        const now = new Date().toISOString();

        let deliveryId: number;
        try {
            deliveryId = await digitalDeliveryRepository.create(db, {
                order_id: order.order_id,
                project_id: order.project_id,
                delivery_status: DELIVERY_STATUS_PENDING,
                delivery_key: deliveryKey,
                download_count: 0,
                last_download_at: null,
                created_at: now,
                updated_at: now,
                file_size: null,
                sha256: null,
                release_id: release?.id || null,
            });
        } catch (createError) {
            // The unique order_id index is the final concurrency guard. If two
            // confirmed events race, reuse the row committed by the winner.
            const racedDelivery = await digitalDeliveryRepository.findByOrderId(db, order.order_id);
            if (racedDelivery) {
                return prepareDelivery(db, order.order_id, bindings);
            }
            throw createError;
        }

        const provider = release?.storage_provider === 'kv' ? 'kv' : 'r2';
        const resolved = await resolveDeliveryStatusFromStorage(
            resolveAssetStorage(bindings, provider),
            deliveryKey
        );
        await digitalDeliveryRepository.update(db, deliveryId, {
            delivery_status: resolved.status,
            file_size: resolved.fileSize,
            sha256: resolved.sha256,
        });

        await orderRepository.linkDelivery(db, order.order_id, deliveryId, resolved.status);

        const delivery = await digitalDeliveryRepository.findById(db, deliveryId);
        return delivery;
    } catch {
        console.error(`[Delivery] Preparation failed for order ${orderId}`);
        return null;
    }
}

/** Resolve a trusted release key, retaining legacy Phase 9 deliveries. */
export async function resolveDeliverySource(
    db: D1Database,
    delivery: DigitalDeliveryRow
): Promise<{ key: string; provider: AssetStorageProviderName } | null> {
    if (!delivery.release_id) return { key: delivery.delivery_key, provider: 'r2' };
    const release = await projectReleaseRepository.findById(db, delivery.release_id);
    if (!release || release.project_id !== delivery.project_id) return null;
    if (release.storage_provider !== 'kv' && release.storage_provider !== 'r2') return null;
    return { key: release.r2_key, provider: release.storage_provider };
}

/**
 * Load the R2 object for a ready delivery.
 * Returns null if the object is missing or the bucket is unavailable.
 */
export async function loadDeliveryObject(
    storage: ProjectAssetStorage | null,
    deliveryKey: string
): Promise<StoredAsset | null> {
    if (!storage) {
        return null;
    }
    try {
        return await storage.get(deliveryKey);
    } catch {
        console.error('[Delivery] Private asset load failed');
        return null;
    }
}

/**
 * Build a safe Content-Disposition filename from the project title.
 */
export function buildDownloadFilename(projectId: string, projectTitle: string): string {
    const safePart = (projectTitle || projectId)
        .replace(SAFE_DOWNLOAD_FILENAME_CHARS, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
    return `${safePart || 'project'}.zip`;
}
