export type AssetStorageProviderName = 'kv' | 'r2';

export interface AssetMetadata {
  size: number;
  contentType: string;
  contentDisposition?: string;
  sha256?: string;
  projectId?: string;
  version?: string;
}

export interface StoredAsset {
  body: ArrayBuffer | ReadableStream<Uint8Array>;
  size: number;
  metadata: AssetMetadata;
}

export interface ProjectAssetStorage {
  readonly provider: AssetStorageProviderName;
  put(key: string, data: ArrayBuffer, metadata: AssetMetadata): Promise<void>;
  get(key: string): Promise<StoredAsset | null>;
  head(key: string): Promise<AssetMetadata | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface KVNamespace {
  put(key: string, value: ArrayBuffer, options?: { metadata?: AssetMetadata }): Promise<void>;
  getWithMetadata<T>(
    key: string,
    options: { type: 'arrayBuffer' }
  ): Promise<{ value: ArrayBuffer | null; metadata: T | null }>;
  delete(key: string): Promise<void>;
}

export interface R2Object {
  key: string;
  size: number;
  httpEtag: string;
  checksums?: Record<string, string | ArrayBuffer | undefined>;
  uploaded: Date;
  etag: string;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream<Uint8Array> | null;
}

export interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
    options?: { httpMetadata?: Record<string, string>; customMetadata?: Record<string, string> }
  ): Promise<R2Object>;
  delete?(key: string): Promise<void>;
}

export interface StorageBindings {
  PROJECT_ASSETS?: KVNamespace;
  DIGITAL_DELIVERY_BUCKET?: R2Bucket;
}

class KVProjectAssetStorage implements ProjectAssetStorage {
  readonly provider = 'kv' as const;
  constructor(private readonly namespace: KVNamespace) {}

  async put(key: string, data: ArrayBuffer, metadata: AssetMetadata): Promise<void> {
    await this.namespace.put(key, data, { metadata });
  }

  async get(key: string): Promise<StoredAsset | null> {
    const result = await this.namespace.getWithMetadata<AssetMetadata>(key, { type: 'arrayBuffer' });
    if (!result.value) return null;
    const metadata = result.metadata || {
      size: result.value.byteLength,
      contentType: 'application/zip',
    };
    return { body: result.value, size: result.value.byteLength, metadata };
  }

  async head(key: string): Promise<AssetMetadata | null> {
    const result = await this.get(key);
    return result?.metadata || null;
  }

  async delete(key: string): Promise<void> {
    await this.namespace.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }
}

class R2ProjectAssetStorage implements ProjectAssetStorage {
  readonly provider = 'r2' as const;
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, data: ArrayBuffer, metadata: AssetMetadata): Promise<void> {
    await this.bucket.put(key, data, {
      httpMetadata: {
        contentType: metadata.contentType,
        ...(metadata.contentDisposition ? { contentDisposition: metadata.contentDisposition } : {}),
      },
      customMetadata: {
        ...(metadata.projectId ? { projectId: metadata.projectId } : {}),
        ...(metadata.version ? { version: metadata.version } : {}),
        ...(metadata.sha256 ? { sha256: metadata.sha256 } : {}),
      },
    });
  }

  async get(key: string): Promise<StoredAsset | null> {
    const object = await this.bucket.get(key);
    if (!object?.body) return null;
    return {
      body: object.body,
      size: object.size,
      metadata: { size: object.size, contentType: 'application/zip' },
    };
  }

  async head(key: string): Promise<AssetMetadata | null> {
    const object = await this.bucket.head(key);
    return object ? { size: object.size, contentType: 'application/zip' } : null;
  }

  async delete(key: string): Promise<void> {
    if (this.bucket.delete) await this.bucket.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }
}

export function resolveAssetStorage(
  bindings: StorageBindings,
  provider: AssetStorageProviderName
): ProjectAssetStorage | null {
  if (provider === 'kv' && bindings.PROJECT_ASSETS) {
    return new KVProjectAssetStorage(bindings.PROJECT_ASSETS);
  }
  if (provider === 'r2' && bindings.DIGITAL_DELIVERY_BUCKET) {
    return new R2ProjectAssetStorage(bindings.DIGITAL_DELIVERY_BUCKET);
  }
  return null;
}
