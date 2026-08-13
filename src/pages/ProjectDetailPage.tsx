import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProjectGrid from '@/components/projects/ProjectGrid';
import { projects } from '@/data/projects';
import NotFoundPage from './NotFoundPage';

const ProjectDetailPage = () => {
  const { slug } = useParams();
  const { t } = useTranslation();
  
  const project = projects.find(p => p.slug === slug);
  
  if (!project) {
    return <NotFoundPage />;
  }

  const relatedProjects = projects.filter(p => p.category === project.category && p.id !== project.id).slice(0, 3);

  const handlePurchase = () => {
    alert(t('project_detail.purchase_alert', 'Purchase flow coming soon!'));
  };

  return (
    <>
      <SEO title={`${project.title} - Tools4Genz`} description={project.description} />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-16">
        <Container>
          <Link to="/projects" className="text-primary-600 dark:text-primary-400 hover:underline mb-8 inline-block font-medium">
            &larr; {t('project_detail.back', 'Back to Projects')}
          </Link>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="lg:col-span-2 space-y-8">
              <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center overflow-hidden">
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl text-primary-500 opacity-50">🖼️</span>
                )}
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {project.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                  {project.description}
                </p>
                <div className="prose dark:prose-invert max-w-none">
                  <p>{project.longDescription || project.description}</p>
                </div>
              </div>

              {project.features && project.features.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    {t('project_detail.features', 'Project Features')}
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-gray-700 dark:text-gray-300">
                        <span className="text-green-500 mr-3 text-lg">✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-24">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ₹{project.price}
                  </span>
                </div>
                
                <Button className="w-full mb-6" size="lg" variant="primary" onClick={handlePurchase}>
                  {t('project_detail.buy_now', 'Buy Now - ₹{{price}}', { price: project.price })}
                </Button>
                
                <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{t('project_detail.category', 'Category')}</span>
                    <Badge variant="primary">{project.category}</Badge>
                  </div>
                  {project.level && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">{t('project_detail.level', 'Level')}</span>
                      <Badge variant="secondary">{project.level}</Badge>
                    </div>
                  )}
                  {(project.technologies || project.technology) && (
                    <div className="pt-4">
                      <span className="block text-gray-500 dark:text-gray-400 mb-2">{t('project_detail.technologies', 'Technologies')}</span>
                      <div className="flex flex-wrap gap-2">
                        {(project.technologies || project.technology || []).map((tech: string) => (
                          <Badge key={tech} variant="outline" size="sm">{tech}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {project.requirements && project.requirements.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      {t('project_detail.requirements', 'Requirements')}
                    </h4>
                    <ul className="space-y-2">
                      {project.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="text-primary-500 mr-2">•</span> {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {relatedProjects.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t('project_detail.related_projects', 'Related Projects')}
              </h2>
              <ProjectGrid projects={relatedProjects} />
            </div>
          )}
        </Container>
      </div>
    </>
  );
};

export default ProjectDetailPage;
