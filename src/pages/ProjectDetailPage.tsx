import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProjectGrid from '@/components/projects/ProjectGrid';
import PurchaseModal from '@/components/projects/PurchaseModal';
import { projects } from '@/data/projects';
import NotFoundPage from './NotFoundPage';
import { orderService } from '@/services/orderService';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { trackEvent } from '@/services/platformService';
import { canonicalUrl } from '@/config/site';
import AdSlot from '@/components/monetization/AdSlot';
import RecommendedResources from '@/components/monetization/RecommendedResources';

const ProjectDetailPage = () => {
  const { slug } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enabled: customerLoginEnabled, user } = useCustomerAuth();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseAvailability, setPurchaseAvailability] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  
  const project = projects.find(p => p.slug === slug);

  useEffect(() => {
    let active = true;
    if (!project) return () => { active = false; };
    trackEvent('project_view', 'project', project.id);
    orderService.getProjectAvailability(project.id)
      .then((availability) => {
        if (active) setPurchaseAvailability(availability.purchasable ? 'available' : 'unavailable');
      })
      .catch(() => {
        // Fail closed: a customer must never pay when release readiness is unknown.
        if (active) setPurchaseAvailability('unavailable');
      });
    return () => { active = false; };
  }, [project]);

  if (!project) {
    return <NotFoundPage />;
  }

  const relatedProjects = projects.filter(p => p.category === project.category && p.id !== project.id).slice(0, 3);
  const seoTitle = project.seo?.title || `${project.title} Source Code Project | Tools4Genz`;
  const seoDescription = project.seo?.description || project.description;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonicalUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Projects', item: canonicalUrl('/projects') },
      { '@type': 'ListItem', position: 3, name: project.title, item: canonicalUrl(`/projects/${project.slug}`) },
    ],
  };
  const shouldResumePurchase = Boolean(
    user && purchaseAvailability === 'available' && new URLSearchParams(window.location.search).get('purchase') === '1'
  );

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    if (shouldResumePurchase) window.history.replaceState(null, '', `/projects/${project.slug}`);
  };

  const handlePurchase = () => {
    trackEvent('checkout_started', 'project', project.id);
    if (customerLoginEnabled && !user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/projects/${project.slug}?purchase=1`)}`);
      return;
    }
    setIsPurchaseModalOpen(true);
  };

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={`/projects/${project.slug}`}
        image={project.imageUrl}
        jsonLd={breadcrumbJsonLd}
      />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-16">
        <Container>
          <Breadcrumbs items={[{ label: t('nav.home', 'Home'), href: '/' }, { label: t('nav.projects', 'Projects'), href: '/projects' }, { label: project.title }]} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="lg:col-span-2 space-y-8">
              <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center overflow-hidden">
                {project.imageUrl && project.imageUrl !== failedImageUrl ? (
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover"
                    onError={() => setFailedImageUrl(project.imageUrl || null)}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-primary-600 dark:text-primary-300">
                    <span className="text-6xl" aria-hidden="true">{project.icon || '📦'}</span>
                    <span className="text-sm font-semibold">Project preview</span>
                  </div>
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    {t('project_detail.features', 'Project Features')}
                  </h2>
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
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(project.price)}
                  </span>
                </div>
                
                <Button
                  className="w-full mb-3"
                  size="lg"
                  variant="primary"
                  onClick={handlePurchase}
                  disabled={purchaseAvailability !== 'available'}
                >
                  {purchaseAvailability === 'checking'
                    ? t('project_detail.checking_availability', 'Checking availability…')
                    : purchaseAvailability === 'available'
                      ? t('project_detail.buy_now', 'Buy Now - ₹{{price}}', { price: project.price.toLocaleString('en-IN') })
                      : t('project_detail.currently_unavailable', 'Currently unavailable')}
                </Button>
                {purchaseAvailability === 'unavailable' && (
                  <p className="mb-6 text-center text-xs text-amber-700 dark:text-amber-300">
                    {t('project_detail.preparing_file', 'This project file is being prepared. Payment is disabled until the secure download is ready.')}
                  </p>
                )}
                
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

          <AdSlot placement="project_content" />
          <RecommendedResources entityType="project" entityId={project.id} />
          
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

      <PurchaseModal
        project={project}
        isOpen={isPurchaseModalOpen || shouldResumePurchase}
        onClose={closePurchaseModal}
      />
    </>
  );
};

export default ProjectDetailPage;
