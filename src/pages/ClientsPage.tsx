import React from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import ClientRequestForm from '@/components/forms/ClientRequestForm';

const ClientsPage = () => {
  const { t } = useTranslation();

  const offerings = [
    { icon: '🏢', title: t('clients.offering_1', 'Business Websites') },
    { icon: '📱', title: t('clients.offering_2', 'Landing Pages') },
    { icon: '🛒', title: t('clients.offering_3', 'E-Commerce') },
    { icon: '⚡', title: t('clients.offering_4', 'Web Apps') },
    { icon: '⚙️', title: t('clients.offering_5', 'Custom Software') },
    { icon: '🧠', title: t('clients.offering_6', 'AI Solutions') },
    { icon: '🔄', title: t('clients.offering_7', 'Automation') },
    { icon: '🔧', title: t('clients.offering_8', 'Maintenance') }
  ];

  return (
    <>
      <SEO title={t('seo.clients.title', 'Custom Software Services for Businesses | Tools4Genz')} description={t('seo.clients.description', 'Request websites, web applications, workflow tools, integrations, and custom software shaped around real business requirements.')} />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        <section className="bg-slate-800 py-20 text-center text-white">
          <Container>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
              {t('clients.hero_title', 'Enterprise Solutions & Custom Development')}
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              {t('clients.hero_subtitle', 'Scalable, secure, and modern software solutions designed to accelerate your business growth.')}
            </p>
          </Container>
        </section>

        <section className="py-20">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('clients.offerings_title', 'What We Offer')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
              {offerings.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                </div>
              ))}
            </div>

            <div className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                {t('clients.how_it_works', 'How It Works')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: '1', title: t('clients.step1_title', 'Consultation'), desc: t('clients.step1_desc', 'We discuss your business requirements and goals.') },
                  { step: '2', title: t('clients.step2_title', 'Development'), desc: t('clients.step2_desc', 'Agile development with regular updates and feedback loops.') },
                  { step: '3', title: t('clients.step3_title', 'Delivery & Support'), desc: t('clients.step3_desc', 'Seamless deployment and ongoing maintenance.') }
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                      {s.step}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                  {t('clients.form_title', 'Request a Consultation')}
                </h2>
                <ClientRequestForm />
              </div>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
};

export default ClientsPage;
