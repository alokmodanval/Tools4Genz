import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import Badge from '@/components/ui/Badge';
import ToolGrid from '@/components/tools/ToolGrid';
import ToolIntegrationRenderer from '@/tools/integrations/ToolIntegrationRenderer';
import { getIntegrationBadge } from '@/tools/integrations';
import { getToolBySlug, getRelatedTools } from '@/tools/registry';
import NotFoundPage from './NotFoundPage';
import { platformService, trackEvent } from '@/services/platformService';
import { canonicalUrl } from '@/config/site';
import AdSlot from '@/components/monetization/AdSlot';
import RecommendedResources from '@/components/monetization/RecommendedResources';
import { canAccessTool } from '@/utils/toolAccess';

const ToolDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const bundledTool = slug ? getToolBySlug(slug) : undefined;
  const [runtimeResult, setRuntimeResult] = useState<{
    slug: string;
    tool: ReturnType<typeof getToolBySlug>;
    loaded: boolean;
  }>({ slug: '', tool: undefined, loaded: false });
  useEffect(() => {
    let active = true;
    if (!slug || getToolBySlug(slug)) return () => { active = false; };
    platformService.publicTools()
      .then((tools) => {
        if (active) setRuntimeResult({ slug, tool: tools.find((item) => item.slug === slug), loaded: true });
      })
      .catch(() => { if (active) setRuntimeResult({ slug, tool: undefined, loaded: true }); });
    return () => { active = false; };
  }, [slug]);
  const tool = bundledTool || (runtimeResult.slug === slug ? runtimeResult.tool : undefined);
  const loading = Boolean(slug && !bundledTool && !(runtimeResult.slug === slug && runtimeResult.loaded));
  useEffect(() => { if (tool) trackEvent('tool_open', 'tool', tool.id); }, [tool]);

  if (!slug) {
    return <NotFoundPage />;
  }

  if (loading) {
    return <div className="min-h-[60vh] bg-gray-50 dark:bg-gray-900" aria-busy="true" />;
  }

  if (!tool) {
    return <NotFoundPage />;
  }

  const relatedTools = getRelatedTools(tool, 4);
  const integrationBadge = getIntegrationBadge(tool);
  const access = canAccessTool(tool);

  const seoTitle = tool.seo?.title || `${tool.name} – Free Online Tool | Tools4Genz`;
  const seoDesc = tool.seo?.description || tool.description || `Use ${tool.name} online with Tools4Genz.`;
  const indexableTool = (tool.status === 'active' || tool.status === 'beta')
    && !tool.id.startsWith('demo-')
    && (Boolean(tool.component) || (tool.integration && tool.integration !== 'native'));
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: canonicalUrl('/tools') },
      { '@type': 'ListItem', position: 3, name: tool.name, item: canonicalUrl(`/tools/${tool.slug}`) },
    ],
  };

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDesc}
        noindex={!indexableTool}
        canonicalPath={`/tools/${tool.slug}`}
        jsonLd={breadcrumbJsonLd}
      />

      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 md:py-16">
        <Container>
          <Breadcrumbs items={[{ label: t('nav.home', 'Home'), href: '/' }, { label: t('nav.tools', 'Tools'), href: '/tools' }, { label: tool.name }]} />

          {/* Tool header info (metadata + integration badge) */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
            <div className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {tool.icon && (
                  <div className="w-20 h-20 text-4xl bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center shrink-0 border border-primary-100 dark:border-primary-800/40">
                    {tool.icon}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                      {tool.name}
                    </h1>
                    <Badge variant="primary">{tool.category}</Badge>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${integrationBadge.className}`}>
                      {t(integrationBadge.labelKey, integrationBadge.label)}
                    </span>
                    {tool.status && (
                      <Badge
                        variant={
                          tool.status === 'beta'
                            ? 'warning'
                            : tool.status === 'coming-soon'
                              ? 'info'
                              : tool.status === 'disabled'
                                ? 'danger'
                                : 'success'
                        }
                      >
                        {tool.status}
                      </Badge>
                    )}
                  </div>

                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                    {tool.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {tool.tags?.map(tag => (
                      <Badge key={tag} variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    <p>{tool.longDescription || tool.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration-aware tool workspace */}
          <div className="mb-16">
            {access.allowed ? <ToolIntegrationRenderer tool={tool} /> : <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30"><h2 className="text-xl font-black text-amber-950 dark:text-amber-100">{access.reason === 'premium-unavailable' ? 'Premium access is not available yet' : 'This tool is coming soon'}</h2><p className="mt-2 text-sm text-amber-800 dark:text-amber-200">No subscription or premium entitlement is being offered at this time.</p></section>}
          </div>

          {/* Tool Features and Use Cases (If present) */}
          {(tool.features?.length || tool.useCases?.length) ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-700 mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tool.features && tool.features.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      {t('tool_detail.features', 'Key Features')}
                    </h2>
                    <ul className="space-y-2">
                      {tool.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                          <span className="text-primary-500 font-bold mr-2">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tool.useCases && tool.useCases.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      {t('tool_detail.use_cases', 'Use Cases')}
                    </h2>
                    <ul className="space-y-2">
                      {tool.useCases.map((useCase, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                          <span className="text-primary-500 font-bold mr-2">•</span> {useCase}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <AdSlot placement="tool_content" />
          <RecommendedResources entityType="tool" entityId={tool.id} />

          {/* Related Tools */}
          {relatedTools.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('tool_detail.related_tools', 'Related Tools')}
              </h2>
              <ToolGrid tools={relatedTools} />
            </div>
          )}
        </Container>
      </div>
    </>
  );
};

export default ToolDetailPage;
