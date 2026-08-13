import { ToolDefinition } from '@/types/tool';
import { resolveToolIntegration, getIntegrationType, isSafeHttpUrl } from './resolver';
import { IntegrationBadgeInfo } from './types';

/**
 * Adapter layer — thin, pure functions that translate a resolved integration
 * into the exact runtime needs of the renderer. Kept free of React so it is
 * trivial to test and extend (e.g. adding a new integration type later).
 */

/** Build navigation target + strategy for external URL tools. */
export interface ExternalTarget {
    url: string;
    /** 'open' = new-tab anchor; 'route' = internal Tools4Genz route. */
    mode: 'open' | 'route';
}

export function getExternalTarget(tool: ToolDefinition): ExternalTarget {
    const resolved = resolveToolIntegration(tool);
    if (resolved.kind === 'external-url' && isSafeHttpUrl(resolved.url)) {
        return { url: resolved.url, mode: 'open' };
    }
    // Fall back to the tool's own Tools4Genz detail page.
    return { url: `/tools/${tool.slug}`, mode: 'route' };
}

/** iframe sandbox + permissions string for embedded tools (or null). */
export interface EmbedSpec {
    url: string;
    sandbox: string;
    permissions?: string;
}

export function getEmbedSpec(tool: ToolDefinition): EmbedSpec | null {
    const resolved = resolveToolIntegration(tool);
    return resolved.kind === 'embedded' && isSafeHttpUrl(resolved.url)
        ? { url: resolved.url, sandbox: resolved.sandbox, permissions: resolved.permissions }
        : null;
}

/** Worker API call descriptor (or null). */
export interface WorkerCallSpec {
    endpoint: string;
    method: 'GET' | 'POST';
}

export function getWorkerCallSpec(tool: ToolDefinition): WorkerCallSpec | null {
    const resolved = resolveToolIntegration(tool);
    return resolved.kind === 'worker-api' && resolved.endpoint
        ? { endpoint: resolved.endpoint, method: resolved.method }
        : null;
}

/** External API adapter descriptor (architecture only — no secrets). */
export interface ExternalApiSpec {
    endpointId: string;
    method: 'GET' | 'POST';
}

export function getExternalApiSpec(tool: ToolDefinition): ExternalApiSpec | null {
    const resolved = resolveToolIntegration(tool);
    return resolved.kind === 'external-api' && resolved.endpointId
        ? { endpointId: resolved.endpointId, method: resolved.method }
        : null;
}

/** Badge metadata for the ToolCard / detail page (subtle, professional). */
const BADGE_STYLES: Record<string, { labelKey: string; label: string; className: string }> = {
    native: {
        labelKey: 'tools.integration.native',
        label: 'Native',
        className: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
    },
    'external-url': {
        labelKey: 'tools.integration.external',
        label: 'External',
        className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    },
    embedded: {
        labelKey: 'tools.integration.embedded',
        label: 'Embedded',
        className: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
    },
    'worker-api': {
        labelKey: 'tools.integration.worker',
        label: 'Worker',
        className: 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400',
    },
    'external-api': {
        labelKey: 'tools.integration.api',
        label: 'API',
        className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    },
};

export function getIntegrationBadge(tool: ToolDefinition): IntegrationBadgeInfo {
    const type = getIntegrationType(tool);
    const meta = BADGE_STYLES[type];
    return {
        type,
        labelKey: meta.labelKey,
        label: meta.label,
        className: meta.className,
    };
}

export { getIntegrationType, isSafeHttpUrl };