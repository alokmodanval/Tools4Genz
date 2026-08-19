import { D1Database, projectReleaseRepository } from '../db/repository';
import { ProjectReleaseRow } from '../db/schema';
import {
  AssetStorageProviderName,
  resolveAssetStorage,
  StorageBindings,
} from './assetStorage';

// KV's hard value limit is 25 MiB. Keep one full MiB of safety margin.
export const MAX_PROJECT_RELEASE_BYTES = 24 * 1024 * 1024;
const SAFE_SEGMENT = /[^a-zA-Z0-9._-]/g;

export function buildProjectReleaseKey(projectId: string, version: string): string {
  const safeProject = projectId.replace(SAFE_SEGMENT, '-');
  const safeVersion = version.replace(SAFE_SEGMENT, '-');
  return `projects/${safeProject}/releases/${safeVersion}/release.zip`;
}

export async function computeReleaseSha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function saveProjectRelease(
  db: D1Database,
  bindings: StorageBindings,
  input: {
    projectId: string;
    version: string;
    filename: string;
    contentType: string;
    bytes: ArrayBuffer;
  },
  provider: AssetStorageProviderName = 'kv'
): Promise<ProjectReleaseRow | null> {
  const storage = resolveAssetStorage(bindings, provider);
  if (!storage) throw new Error(`${provider.toUpperCase()} project storage is not configured`);
  const storageKey = buildProjectReleaseKey(input.projectId, input.version);
  const sha256 = await computeReleaseSha256(input.bytes);
  await storage.put(storageKey, input.bytes, {
    size: input.bytes.byteLength,
    contentType: 'application/zip',
    contentDisposition: `attachment; filename="${input.filename}"`,
    projectId: input.projectId,
    version: input.version,
    sha256,
  });

  const now = new Date().toISOString();
  return projectReleaseRepository.saveAsset(db, {
    project_id: input.projectId,
    version: input.version,
    // Kept in the existing column for migration compatibility; application
    // code treats this as a provider-neutral internal storage key.
    r2_key: storageKey,
    filename: input.filename,
    content_type: 'application/zip',
    file_size: input.bytes.byteLength,
    sha256,
    status: 'ready',
    created_at: now,
    updated_at: now,
    published_at: null,
    storage_provider: provider,
  });
}
