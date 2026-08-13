import { ToolIntegrationType } from '@/types/tool';

/**
 * Result of resolving a tool's integration strategy.
 * The resolver returns a discriminated union so renderers/adapters
 * can switch without stringly-typed logic.
 */
export type ResolvedIntegration =
    | { kind: 'native' }
    | { kind: 'external-url'; url: string }
    | { kind: 'embedded'; url: string; sandbox: string; permissions?: string }
    | { kind: 'worker-api'; endpoint: string; method: 'GET' | 'POST' }
    | { kind: 'external-api'; endpointId: string; method: 'GET' | 'POST' };

export interface IntegrationResolveContext {
    /** Base origin for relative worker endpoints (no trailing slash). */
    workerOrigin?: string;
    /** Raise when the integration config is missing/malformed. */
    strict?: boolean;
}

export interface IntegrationBadgeInfo {
    type: ToolIntegrationType;
    labelKey: string;
    /** Default label used as fallback if translation key is missing. */
    label: string;
    /** Tailwind classes for a subtle badge. */
    className: string;
}

export type { ToolIntegrationType };