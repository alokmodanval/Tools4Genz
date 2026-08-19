/**
 * Tools4Genz — Centralized API Configuration
 *
 * Provides a single, canonical resolution for the Cloudflare Worker API base URL.
 * Deployed Worker: https://tools4genz-api.alokmodanwal940.workers.dev
 */

export const DEFAULT_WORKER_URL = 'https://tools4genz-api.alokmodanwal940.workers.dev';

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  return DEFAULT_WORKER_URL;
}

export const API_BASE_URL = getApiBaseUrl();
