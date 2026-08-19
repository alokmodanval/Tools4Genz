import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import ProjectFilters from '@/components/projects/ProjectFilters';
import ProjectGrid from '@/components/projects/ProjectGrid';
import { projects } from '@/data/projects';
import { projectCategories } from '@/data/categories';
import { ProjectCategory } from '@/types/project';

const ProjectsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [manualSearch, setManualSearch] = useState<string | null>(null);
  const searchQuery = manualSearch ?? searchParams.get('search') ?? '';
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('all');
  const [selectedTechnology, setSelectedTechnology] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  const technologies = useMemo(() => {
    const techs = new Set<string>();
    projects.forEach(p => (p.technologies || p.technology || []).forEach((t: string) => techs.add(t)));
    return Array.from(techs).sort();
  }, []);

  const filteredProjects = useMemo(() => {
    const result = projects.filter(project => {
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      const matchesTech = selectedTechnology === 'all' || (project.technologies || project.technology || []).includes(selectedTechnology);
      const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            project.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesTech && matchesSearch;
    });
    
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    }
    
    return result;
  }, [searchQuery, selectedCategory, selectedTechnology, sortBy]);

  const isFiltering = searchQuery !== '' || selectedCategory !== 'all' || selectedTechnology !== 'all' || sortBy !== 'default';
  const featuredProjects = projects.filter(p => p.featured);

  return (
    <>
      <SEO title={t('seo.projects.title', 'Software Project Source Code Catalog | Tools4Genz')} description={t('seo.projects.description', 'Explore practical web, AI, Java, Python, React, and software project source-code examples with clear technology and feature details.')} canonicalPath="/projects" />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-16">
        <Container>
          <div className="mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('projects.header_title', 'Ready-Made Projects')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
              {t('projects.header_subtitle', 'High-quality source code for students, developers, and businesses.')}
            </p>
          </div>

          <ProjectFilters 
            searchQuery={searchQuery}
            onSearchChange={setManualSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={(cat) => setSelectedCategory(cat as ProjectCategory | 'all')}
            selectedTechnology={selectedTechnology}
            onTechnologyChange={setSelectedTechnology}
            sortBy={sortBy}
            onSortChange={setSortBy}
            categories={projectCategories}
            technologies={technologies}
          />

          {!isFiltering && featuredProjects.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('projects.featured_title', 'Featured Projects')}
              </h2>
              <ProjectGrid projects={featuredProjects} />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {isFiltering ? t('projects.search_results', 'Search Results') : t('projects.all_projects', 'All Projects')}
            </h2>
            {filteredProjects.length > 0 ? (
              <ProjectGrid projects={filteredProjects} />
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {t('projects.no_results', 'No projects found matching your criteria.')}
                </p>
              </div>
            )}
          </div>
        </Container>
      </div>
    </>
  );
};

export default ProjectsPage;
