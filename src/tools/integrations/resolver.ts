import { ToolDefinition, ToolIntegrationType } from '@/types/tool';
import { ResolvedIntegration, IntegrationResolveContext } from './types';

/** Safe default sandbox for embedded iframes. Restrictive by design. */
export const DEFAULT_EMBED_SANDBOX = 'allow-scripts allow-same-origin';

/** Validate absolute http(s) URLs. Fragments not accepted. */
export function isSafeHttpUrl(value: string | undefined): value is string {
    if (!value || typeof value !== 'string') return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Returns the effective integration type. Legacy tools without an
 * explicit `integration` field default to 'native'.
 */
export function getIntegrationType(tool: Pick<ToolDefinition, 'integration'>): ToolIntegrationType {
    return tool.integration ?? 'native';
}

/**
 * Resolve a tool to a concrete integration strategy.
 *
 * The ToolDetailPage must never become a giant switch: it delegates to this
 * resolver which returns a discriminated union consumed by the adapter layer.
 */
export function resolveToolIntegration(
    tool: ToolDefinition,
    context: IntegrationResolveContext = {}
): ResolvedIntegration {
    const type = getIntegrationType(tool);
    const config = tool.integrationConfig;
    const strict = context.strict ?? false;

    switch (type) {
        case 'native':
            return { kind: 'native' };

        case 'external-url': {
            const url = config && config.type === 'external-url' ? config.url : undefined;
            // Native-safe fallback: if unconfigured, degrade to native quietly in
            // non-strict mode so old registry entries never crash the page.
            if (!isSafeHttpUrl(url)) {
                if (strict) {
                    throw new Error(`External URL integration for "${tool.slug}" is missing a valid URL.`);
                }
                return { kind: 'native' };
            }
            return { kind: 'external-url', url };
        }

        case 'embedded': {
            const url = config && config.type === 'embedded' ? config.url : undefined;
            const allowEmbed = tool.allowEmbed === true;
            const sandbox = config && config.type === 'embedded' ? config.sandbox : undefined;
            const permissions =
                config && config.type === 'embedded' ? config.permissions : undefined;

            if (!isSafeHttpUrl(url) || !allowEmbed) {
                // Not framed without explicit opt-in. Fall back to external-open.
                return {
                    kind: 'external-url',
                    url: url && isSafeHttpUrl(url) ? url : '',
                };
            }
            return {
                kind: 'embedded',
                url,
                sandbox: sandbox || DEFAULT_EMBED_SANDBOX,
                permissions,
            };
        }

        case 'worker-api': {
            const endpoint = config && config.type === 'worker-api' ? config.endpoint : undefined;
            const method = config && config.type === 'worker-api' ? config.method : 'POST';
            if (!endpoint || typeof endpoint !== 'string') {
                if (strict) {
                    throw new Error(`Worker API integration for "${tool.slug}" is missing an endpoint.`);
                }
                return { kind: 'native' };
            }
            const base = (context.workerOrigin || '').replace(/\/+$/, '');
            const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            return { kind: 'worker-api', endpoint: `${base}${path}`, method: method || 'POST' };
        }

        case 'external-api': {
            const endpointId =
                config && config.type === 'external-api' ? config.endpointId : undefined;
            const method = config && config.type === 'external-api' ? config.method : 'POST';
            if (!endpointId || typeof endpointId !== 'string') {
                if (strict) {
                    throw new Error(`External API integration for "${tool.slug}" is missing an endpointId.`);
                }
                return { kind: 'native' };
            }
            return { kind: 'external-api', endpointId, method: method || 'POST' };
        }

        default:
            return { kind: 'native' };
    }
}