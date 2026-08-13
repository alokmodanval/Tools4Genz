import React from 'react';
import { useTranslation } from 'react-i18next';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';

const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO title={t('seo.not_found.title', '404 - Page Not Found')} description={t('seo.not_found.description', 'The page you are looking for does not exist.')} />
      
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Container className="text-center">
          <h1 className="text-9xl font-extrabold text-gray-200 dark:text-gray-800 mb-8">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('not_found.title', 'Page not found')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-lg mx-auto">
            {t('not_found.description', 'Sorry, we couldn’t find the page you’re looking for. It might have been moved or doesn’t exist.')}
          </p>
          <Button href="/" size="lg" variant="primary">
            {t('not_found.go_home', 'Go back home')}
          </Button>
        </Container>
      </div>
    </>
  );
};

export default NotFoundPage;
