import React, { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolDefinition } from '@/types/tool';
import {
    resolveToolIntegration,
    getExternalTarget,
    getEmbedSpec,
    getWorkerCallSpec,
    getExternalApiSpec,
    getIntegrationBadge,
} from './index';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';

/**
 * Renders a tool based on its resolved integration type.
 * ToolDetailPage delegates here instead of becoming a giant switch.
 */
export const ToolIntegrationRenderer: React.FC<{ tool: ToolDefinition }> = ({ tool }) => {
    const { t } = useTranslation();
    const resolved = resolveToolIntegration(tool);
    const badge = getIntegrationBadge(tool);

    // Native: render the bundled implementation (lazy-loaded component).
    if (resolved.kind === 'native') {
        const Component = tool.component;
        if (Component) {
            return (
                <Suspense fallback={<ToolLoader />}>
                    <Component tool={tool} />
                </Suspense>
            );
        }
        // Native tool without a component yet → catalog/coming-soon state.
        return <CatalogState tool={tool} />;
    }

    // External URL: show info + Open Tool CTA (safe new-tab navigation).
    if (resolved.kind === 'external-url') {
        const target = getExternalTarget(tool);
        return (
            <ExternalUrlView
                tool={tool}
                url={target.url}
                badgeLabel={t(badge.labelKey, badge.label)}
            />
        );
    }

    // Embedded: sandboxed iframe with loading + fallback.
    if (resolved.kind === 'embedded') {
        const spec = getEmbedSpec(tool);
        if (!spec) {
            return <CatalogState tool={tool} />;
        }
        return (
            <EmbeddedView
                tool={tool}
                url={spec.url}
                sandbox={spec.sandbox}
                permissions={spec.permissions}
                badgeLabel={t(badge.labelKey, badge.label)}
            />
        );
    }

    // Worker API: API-powered tool UI.
    if (resolved.kind === 'worker-api') {
        const spec = getWorkerCallSpec(tool);
        if (!spec) {
            return <CatalogState tool={tool} />;
        }
        return (
            <WorkerApiView
                tool={tool}
                endpoint={spec.endpoint}
                method={spec.method}
                badgeLabel={t(badge.labelKey, badge.label)}
            />
        );
    }

    // External API: adapter-driven UI (architecture only, no secrets).
    if (resolved.kind === 'external-api') {
        const spec = getExternalApiSpec(tool);
        if (!spec) {
            return <CatalogState tool={tool} />;
        }
        return (
            <ExternalApiView
                tool={tool}
                endpointId={spec.endpointId}
                method={spec.method}
                badgeLabel={t(badge.labelKey, badge.label)}
            />
        );
    }

    return <CatalogState tool={tool} />;
};

const ToolLoader = () => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading Tool...</p>
    </div>
);

/** Catalog / coming-soon / disabled state (no component, no integration). */
const CatalogState: React.FC<{ tool: ToolDefinition }> = ({ tool }) => {
    const { t } = useTranslation();
    return (
        <ToolShell>
            <ToolHeader tool={tool} />
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-amber-800 dark:text-amber-300">
                <h4 className="font-bold text-base mb-1">
                    {t('tool_detail.in_development', 'Tool In Active Development')}
                </h4>
                <p className="text-sm">
                    {t(
                        'tool_detail.in_development_desc',
                        'This tool is scheduled for full implementation. Check back soon for interactive browser and Cloudflare API execution!'
                    )}
                </p>
            </div>
        </ToolShell>
    );
};

/** External URL view — safe new-tab CTA, never iframed. */
const ExternalUrlView: React.FC<{
    tool: ToolDefinition;
    url: string;
    badgeLabel: string;
}> = ({ tool, url, badgeLabel }) => {
    const { t } = useTranslation();
    return (
        <ToolShell>
            <ToolHeader tool={tool} />
            <div className="flex flex-col items-center text-center gap-4 py-6">
                <span className="text-5xl">{tool.icon || '🔗'}</span>
                <p className="text-gray-600 dark:text-gray-300 max-w-xl">
                    {tool.longDescription || tool.description}
                </p>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                    {badgeLabel}
                </span>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all"
                >
                    {t('tool_detail.open_tool', 'Open Tool')} ↗
                </a>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('tool_detail.external_note', 'Opens in a new tab.')}
                </p>
            </div>
        </ToolShell>
    );
};

/** Embedded view — sandboxed iframe with loading + fallback. */
const EmbeddedView: React.FC<{
    tool: ToolDefinition;
    url: string;
    sandbox: string;
    permissions?: string;
    badgeLabel: string;
}> = ({ tool, url, sandbox, permissions, badgeLabel }) => {
    const { t } = useTranslation();
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    return (
        <ToolShell>
            <ToolHeader tool={tool} />
            <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                    {badgeLabel}
                </span>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                    {t('tool_detail.open_external', 'Open in new tab')} ↗
                </a>
            </div>

            {failed ? (
                <div className="p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl text-center">
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                        {t('tool_detail.embed_failed', 'This tool could not be embedded.')}
                    </p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm"
                    >
                        {t('tool_detail.open_tool', 'Open Tool')} ↗
                    </a>
                </div>
            ) : (
                <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    {!loaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600"></div>
                        </div>
                    )}
                    <iframe
                        src={url}
                        title={tool.name}
                        sandbox={sandbox}
                        allow={permissions}
                        onLoad={() => setLoaded(true)}
                        onError={() => setFailed(true)}
                        className="w-full h-[70vh] min-h-[400px]"
                        loading="lazy"
                    />
                </div>
            )}
        </ToolShell>
    );
};

/** Worker API view — calls a Tools4Genz worker endpoint. */
const WorkerApiView: React.FC<{
    tool: ToolDefinition;
    endpoint: string;
    method: 'GET' | 'POST';
    badgeLabel: string;
}> = ({ tool, endpoint, method, badgeLabel }) => {
    const { t } = useTranslation();
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async () => {
        setLoading(true);
        setError(null);
        setOutput(null);
        try {
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'POST' ? JSON.stringify({ input }) : undefined,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setOutput(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ToolShell>
            <ToolHeader tool={tool} />
            <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
                    {badgeLabel}
                </span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                    {method} {endpoint}
                </span>
            </div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('tool_detail.worker_input', 'Enter input for the worker...')}
                rows={4}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            />
            <button
                onClick={run}
                disabled={loading}
                className="mt-3 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all"
            >
                {loading ? t('common.loading', 'Loading...') : t('tool_detail.run', 'Run')}
            </button>
            {error && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {output && (
                <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-sm overflow-auto whitespace-pre-wrap">
                    {output}
                </pre>
            )}
        </ToolShell>
    );
};

/** External API view — adapter architecture only, no secrets exposed. */
const ExternalApiView: React.FC<{
    tool: ToolDefinition;
    endpointId: string;
    method: 'GET' | 'POST';
    badgeLabel: string;
}> = ({ tool, endpointId, method, badgeLabel }) => {
    const { t } = useTranslation();
    return (
        <ToolShell>
            <ToolHeader tool={tool} />
            <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                    {badgeLabel}
                </span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                    {method} {endpointId}
                </span>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t(
                        'tool_detail.external_api_note',
                        'This tool is backed by an external API. The adapter architecture is configured; live execution requires a server-side adapter (planned for a later phase). No secrets are exposed in the browser.'
                    )}
                </p>
            </div>
        </ToolShell>
    );
};

export default ToolIntegrationRenderer;