import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';
import { RequestMultiStepForm } from '@/components/forms/RequestMultiStepForm';
import { services } from '@/data/services';

const ServiceRequestPage: React.FC = () => {
  const [params] = useSearchParams();
  const service = services.find((item) => item.id === params.get('type'));
  const projectType = service?.title || 'Custom Software';

  return (
    <>
      <SEO title={`${service?.title || 'Service Request'} - Tools4Genz`} description="Submit a secure software service request to Tools4Genz." noindex />
      <main className="min-h-screen bg-gray-50 py-14 dark:bg-gray-900">
        <Container>
          <div className="mx-auto max-w-4xl">
            <Link to="/services" className="text-sm font-semibold text-primary-600 hover:text-primary-700">← Back to services</Link>
            <h1 className="mt-5 text-3xl font-extrabold text-gray-900 dark:text-white">Request {service?.title || 'a custom service'}</h1>
            <p className="mb-8 mt-3 text-gray-600 dark:text-gray-300">
              {service?.description || 'Tell us what you need. We will review the request and contact you before any work or payment is agreed.'}
            </p>
            <RequestMultiStepForm formType="client" draftKey={`service-request-${service?.id || 'generic'}`} initialProjectType={projectType} />
          </div>
        </Container>
      </main>
    </>
  );
};

export default ServiceRequestPage;
