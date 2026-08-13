import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import ToolFilters from '@/components/tools/ToolFilters';
import ToolGrid from '@/components/tools/ToolGrid';
import { toolCategories } from '@/data/categories';
import { getAllTools, searchTools } from '@/tools/registry';
import { ToolCategory } from '@/types/tool';

const ToolsPage = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<string>('featured');

  const allTools = useMemo(() => getAllTools(), []);

  const filteredTools = useMemo(() => {
    return searchTools(allTools, searchQuery, selectedCategory, sortBy);
  }, [allTools, searchQuery, selectedCategory, sortBy]);

  const isFiltering = searchQuery !== '' || selectedCategory !== 'all' || sortBy !== 'featured';
  const featuredTools = useMemo(() => allTools.filter(t => t.featured), [allTools]);

  return (
    <>
      <SEO
        title={t('seo.tools.title', 'Explore All Tools - Tools4Genz')}
        description={t('seo.tools.description', 'Browse our collection of fast, reliable AI, developer, writing, and productivity tools.')}
      />

      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-16">
        <Container>
          <div className="mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('tools.header_title', 'Explore Our Tools')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
              {t('tools.header_subtitle', 'Find the perfect tool to boost your productivity and streamline your workflow.')}
            </p>
          </div>

          <ToolFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={toolCategories}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {!isFiltering && featuredTools.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('tools.featured_title', 'Featured Tools')}
              </h2>
              <ToolGrid tools={featuredTools} />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {isFiltering ? t('tools.search_results', 'Search Results') : t('tools.all_tools', 'All Tools')}
            </h2>
            {filteredTools.length > 0 ? (
              <ToolGrid tools={filteredTools} />
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {t('tools.no_results', 'No tools found matching your criteria.')}
                </p>
              </div>
            )}
          </div>
        </Container>
      </div>
    </>
  );
};

export default ToolsPage;
