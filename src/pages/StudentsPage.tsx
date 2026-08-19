import React from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import StudentRequestForm from '@/components/forms/StudentRequestForm';

const StudentsPage = () => {
  const { t } = useTranslation();

  const offerings = [
    { icon: '🎓', title: t('students.offering_1', 'Mini Projects') },
    { icon: '📜', title: t('students.offering_2', 'Final Year Projects') },
    { icon: '🤖', title: t('students.offering_3', 'AI/ML Projects') },
    { icon: '🌐', title: t('students.offering_4', 'Web Projects') },
    { icon: '🐍', title: t('students.offering_5', 'Python Projects') },
    { icon: '💻', title: t('students.offering_6', 'Software Projects') },
    { icon: '📝', title: t('students.offering_7', 'Documentation') },
    { icon: '🚀', title: t('students.offering_8', 'Deployment Assistance') }
  ];

  return (
    <>
      <SEO title={t('seo.students.title', 'Software Project Support for Students | Tools4Genz')} description={t('seo.students.description', 'Explore practical tools, software project guidance, documentation support, and development services for students.')} />
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        <section className="bg-indigo-600 dark:bg-indigo-900 py-20 text-center text-white">
          <Container>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
              {t('students.hero_title', 'Student Project Support')}
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              {t('students.hero_subtitle', 'Get expert help with your academic projects, complete with documentation and deployment.')}
            </p>
          </Container>
        </section>

        <section className="py-20">
          <Container>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              {t('students.offerings_title', 'What We Offer')}
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
                {t('students.how_it_works', 'How It Works')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: '1', title: t('students.step1_title', 'Submit Request'), desc: t('students.step1_desc', 'Fill out the form with your project requirements.') },
                  { step: '2', title: t('students.step2_title', 'We Review'), desc: t('students.step2_desc', 'We analyze your needs and provide a proposal and timeline.') },
                  { step: '3', title: t('students.step3_title', 'Get Your Project'), desc: t('students.step3_desc', 'Receive complete code, documentation, and support.') }
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
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
                  {t('students.form_title', 'Request Your Project')}
                </h2>
                <StudentRequestForm />
              </div>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
};

export default StudentsPage;
