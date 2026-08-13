import React from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import Button from '@/components/ui/Button';
import SEO from '@/components/SEO';
import ToolGrid from '@/components/tools/ToolGrid';
import ProjectGrid from '@/components/projects/ProjectGrid';
import ServiceCard from '@/components/services/ServiceCard';
import { tools } from '@/data/tools';
import { projects } from '@/data/projects';
import { services } from '@/data/services';

const HomePage = () => {
  const { t } = useTranslation();
  
  const featuredTools = tools.filter(tool => tool.featured).slice(0, 4);
  const featuredProjects = projects.filter(project => project.featured).slice(0, 4);

  return (
    <>
      <SEO title={t('seo.home.title', 'Home - Tools4Genz')} description={t('seo.home.description', 'Tools4Genz Platform')} />
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950 dark:to-gray-900 py-20 md:py-32">
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] dark:bg-grid-slate-900/[0.04] bg-[bottom_1px_center] bg-[length:24px_24px]" />
        <Container className="relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            {t('home.hero_title', 'Empowering The Next Generation')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            {t('home.hero_subtitle', 'Discover powerful tools, explore ready-made projects, or request custom development tailored for your needs.')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button href="/tools" size="lg" variant="primary">
              {t('home.hero_cta_primary', 'Explore Tools')}
            </Button>
            <Button href="/projects" size="lg" variant="outline">
              {t('home.hero_cta_secondary', 'Explore Projects')}
            </Button>
          </div>
        </Container>
      </section>

      {/* 2. FEATURED TOOLS */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('home.featured_tools_title', 'Featured Tools')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('home.featured_tools_desc', 'Check out some of our most popular and powerful tools.')}
            </p>
          </div>
          <ToolGrid tools={featuredTools} />
          <div className="mt-10 text-center">
            <Button href="/tools" variant="outline">
              {t('home.view_all_tools', 'View All Tools')}
            </Button>
          </div>
        </Container>
      </section>

      {/* 3. POPULAR PROJECTS */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('home.popular_projects_title', 'Popular Projects')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('home.popular_projects_desc', 'Ready-to-use projects for students and developers.')}
            </p>
          </div>
          <ProjectGrid projects={featuredProjects} />
          <div className="mt-10 text-center">
            <Button href="/projects" variant="outline">
              {t('home.view_all_projects', 'View All Projects')}
            </Button>
          </div>
        </Container>
      </section>

      {/* 4. SERVICES */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('home.services_title', 'Our Services')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('home.services_desc', 'Comprehensive solutions for every requirement.')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </Container>
      </section>

      {/* 5. STUDENTS SECTION */}
      <section className="py-20 bg-indigo-50 dark:bg-indigo-900/20">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {t('home.students_title', 'For Students')}
            </h2>
            <ul className="text-left text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto space-y-4 mb-10 list-disc list-inside">
              <li>{t('home.students_bullet_1', 'Mini Projects & Final Year Projects')}</li>
              <li>{t('home.students_bullet_2', 'AI/ML & Data Science Assignments')}</li>
              <li>{t('home.students_bullet_3', 'Web & App Development Projects')}</li>
              <li>{t('home.students_bullet_4', 'Complete Documentation & Deployment Help')}</li>
            </ul>
            <Button href="/students" variant="primary" size="lg">
              {t('home.students_cta', 'Request a Student Project')}
            </Button>
          </div>
        </Container>
      </section>

      {/* 6. CLIENTS SECTION */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {t('home.clients_title', 'For Businesses & Clients')}
            </h2>
            <ul className="text-left text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto space-y-4 mb-10 list-disc list-inside">
              <li>{t('home.clients_bullet_1', 'Custom Web Applications & Portals')}</li>
              <li>{t('home.clients_bullet_2', 'E-commerce Solutions & Landing Pages')}</li>
              <li>{t('home.clients_bullet_3', 'AI Integrations & Automations')}</li>
              <li>{t('home.clients_bullet_4', 'Long-term Maintenance & Support')}</li>
            </ul>
            <Button href="/clients" variant="primary" size="lg">
              {t('home.clients_cta', 'Request a Custom Solution')}
            </Button>
          </div>
        </Container>
      </section>

      {/* 7. WHY TOOLS4GENZ */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <Container>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-12">
            {t('home.why_title', 'Why Choose Tools4Genz?')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '🏆', title: t('home.why_quality_title', 'Top Quality'), desc: t('home.why_quality_desc', 'Built with modern tech stacks and best practices.') },
              { icon: '⚡', title: t('home.why_speed_title', 'Lightning Fast'), desc: t('home.why_speed_desc', 'Optimized for performance and fast delivery.') },
              { icon: '🤝', title: t('home.why_support_title', 'Dedicated Support'), desc: t('home.why_support_desc', 'We are here to help you every step of the way.') },
              { icon: '💡', title: t('home.why_innovation_title', 'Innovative'), desc: t('home.why_innovation_desc', 'Always adapting to the latest trends and tools.') },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-sm text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-indigo-800 text-white text-center">
        <Container>
          <h2 className="text-4xl font-bold mb-6">
            {t('home.final_cta_title', 'Ready to Get Started?')}
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            {t('home.final_cta_desc', 'Join thousands of students and businesses leveraging Tools4Genz.')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button href="/tools" size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
              {t('home.final_cta_button_1', 'Explore Tools')}
            </Button>
            <Button href="/about" size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              {t('home.final_cta_button_2', 'Contact Us')}
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
};

export default HomePage;
