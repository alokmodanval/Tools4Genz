import { D1Database, projectReleaseRepository } from '../db/repository';
import { resolveAssetStorage, StorageBindings } from './assetStorage';

export interface PurchaseAvailabilityBindings extends StorageBindings {
  /** Test-fixture compatibility only. Never configure this in wrangler.toml. */
  PURCHASE_AVAILABILITY_BYPASS?: string;
}

export interface ProjectPurchaseAvailability {
  purchasable: boolean;
  status: 'available' | 'unavailable';
  reason: 'release_ready' | 'release_missing' | 'storage_unavailable' | 'asset_missing';
}

export async function resolveProjectPurchaseAvailability(
  db: D1Database,
  bindings: PurchaseAvailabilityBindings,
  projectId: string
): Promise<ProjectPurchaseAvailability> {
  if (bindings.PURCHASE_AVAILABILITY_BYPASS === 'test-only') {
    return { purchasable: true, status: 'available', reason: 'release_ready' };
  }

  const release = await projectReleaseRepository.findPublishedByProjectId(db, projectId);
  if (!release) {
    return { purchasable: false, status: 'unavailable', reason: 'release_missing' };
  }

  const provider = release.storage_provider === 'r2' ? 'r2' : 'kv';
  const storage = resolveAssetStorage(bindings, provider);
  if (!storage) {
    return { purchasable: false, status: 'unavailable', reason: 'storage_unavailable' };
  }

  try {
    if (!(await storage.exists(release.r2_key))) {
      return { purchasable: false, status: 'unavailable', reason: 'asset_missing' };
    }
  } catch {
    return { purchasable: false, status: 'unavailable', reason: 'storage_unavailable' };
  }

  return { purchasable: true, status: 'available', reason: 'release_ready' };
}
