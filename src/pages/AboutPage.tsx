import React from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';

const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO title={t('seo.about.title', 'About Tools4Genz')} description={t('seo.about.description', 'Learn how Tools4Genz supports students, creators, and businesses with practical online tools, software projects, and development services.')} />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-24 text-center text-white">
          <Container>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
              {t('about.hero_title', 'About Tools4Genz')}
            </h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              {t('about.hero_subtitle', 'Empowering the next generation with cutting-edge tools, ready-made projects, and custom solutions.')}
            </p>
          </Container>
        </section>

        <section className="py-20">
          <Container>
            <div className="max-w-4xl mx-auto space-y-20">
              
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  {t('about.who_we_are_title', 'Who We Are')}
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {t('about.who_we_are_desc', 'Tools4Genz is a unified platform connecting developers, students, and businesses. We provide high-quality developer tools, source code for academic and commercial projects, and bespoke software development services. Our goal is to streamline the development process and provide reliable solutions for modern technical challenges.')}
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-10 text-center">
                  {t('about.what_we_offer_title', 'What We Offer')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { title: t('about.offer_tools_title', 'AI & Dev Tools'), desc: t('about.offer_tools_desc', 'A curated suite of utilities and AI-powered tools to accelerate workflows.') },
                    { title: t('about.offer_projects_title', 'Ready-Made Projects'), desc: t('about.offer_projects_desc', 'High-quality source code templates for immediate deployment and learning.') },
                    { title: t('about.offer_custom_title', 'Custom Development'), desc: t('about.offer_custom_desc', 'Enterprise-grade software solutions tailored to business requirements.') },
                    { title: t('about.offer_students_title', 'Student Support'), desc: t('about.offer_students_desc', 'Comprehensive guidance and project development for academic success.') }
                  ].map((offer, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{offer.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{offer.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary-50 dark:bg-primary-900/20 p-10 rounded-3xl text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                  {t('about.mission_title', 'Our Mission')}
                </h2>
                <p className="text-xl text-gray-700 dark:text-gray-300 italic">
                  "{t('about.mission_desc', 'To democratize access to high-quality software tools and development services, enabling creators, students, and businesses to build the future effortlessly.')}"
                </p>
              </div>

              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  {[
                    { stat: '100+', label: t('about.stat_tools', 'Tools Available') },
                    { stat: '50+', label: t('about.stat_projects', 'Ready Projects') },
                    { stat: '500+', label: t('about.stat_students', 'Students Helped') },
                    { stat: '100+', label: t('about.stat_clients', 'Happy Clients') }
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="text-4xl md:text-5xl font-extrabold text-primary-600 dark:text-primary-400 mb-2">{s.stat}</div>
                      <div className="text-gray-600 dark:text-gray-400 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center pt-10">
                <Button href="/" size="lg" variant="primary">
                  {t('about.cta', 'Explore Tools4Genz')}
                </Button>
              </div>

            </div>
          </Container>
        </section>
      </div>
    </>
  );
};

export default AboutPage;
