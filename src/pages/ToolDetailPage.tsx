import React, { Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Badge from '@/components/ui/Badge';
import ToolGrid from '@/components/tools/ToolGrid';
import { getToolBySlug, getRelatedTools } from '@/tools/registry';
import NotFoundPage from './NotFoundPage';

const ToolLoader = () => (
  <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center min-h-[300px]">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading Tool...</p>
  </div>
);

const ToolDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  if (!slug) {
    return <NotFoundPage />;
  }

  const tool = getToolBySlug(slug);

  if (!tool) {
    return <NotFoundPage />;
  }

  const relatedTools = getRelatedTools(tool, 4);
  const ToolImplementationComponent = tool.component;

  const seoTitle = tool.seo?.title || `${tool.name} - Free Online Tool | Tools4Genz`;
  const seoDesc = tool.seo?.description || tool.longDescription || tool.description;

  return (
    <>
      <SEO title={seoTitle} description={seoDesc} />

      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 md:py-16">
        <Container>
          <Link
            to="/tools"
            className="text-primary-600 dark:text-primary-400 hover:underline mb-8 inline-block font-medium text-sm md:text-base"
          >
            &larr; {t('tool_detail.back', 'Back to Tools')}
          </Link>

          {/* Render Active Tool Implementation */}
          {ToolImplementationComponent ? (
            <div className="mb-16">
              <Suspense fallback={<ToolLoader />}>
                <ToolImplementationComponent tool={tool} />
              </Suspense>
            </div>
          ) : (
            /* Fallback for Catalog/Coming Soon/Disabled tools */
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-16">
              <div className="p-8 md:p-12">
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

                    <div className="prose dark:prose-invert max-w-none mb-10 text-gray-700 dark:text-gray-300">
                      <p>{tool.longDescription || tool.description}</p>
                    </div>

                    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-amber-800 dark:text-amber-300 mb-8">
                      <h4 className="font-bold text-base mb-1">Tool In Active Development</h4>
                      <p className="text-sm">
                        This tool is scheduled for full implementation. Check back soon for interactive browser and Cloudflare API execution!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tool Features and Use Cases (If present) */}
          {(tool.features?.length || tool.useCases?.length) && ToolImplementationComponent ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-700 mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tool.features && tool.features.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      {t('tool_detail.features', 'Key Features')}
                    </h3>
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
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      {t('tool_detail.use_cases', 'Use Cases')}
                    </h3>
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
