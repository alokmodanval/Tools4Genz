import React from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import ServiceCard from '@/components/services/ServiceCard';
import Button from '@/components/ui/Button';
import { services } from '@/data/services';

const ServicesPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO title={t('seo.services.title', 'Services - Tools4Genz')} description={t('seo.services.description', 'Professional software services.')} />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        <section className="bg-gradient-to-br from-primary-900 to-indigo-900 py-20 text-center text-white">
          <Container>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
              {t('services.hero_title', 'Our Services')}
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              {t('services.hero_subtitle', 'From student projects to enterprise solutions, we provide top-notch development services tailored to your needs.')}
            </p>
          </Container>
        </section>

        <section className="py-20 -mt-10">
          <Container>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </Container>
        </section>

        <section className="py-16">
          <Container>
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 md:p-16 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                {t('services.cta_title', 'Have a custom requirement?')}
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                {t('services.cta_desc', 'Contact us to discuss your specific needs. We build tailored software solutions.')}
              </p>
              <Button href="/about" size="lg" variant="primary">
                {t('services.cta_button', 'Contact Us')}
              </Button>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
};

export default ServicesPage;
