import React from 'react';
import { useTranslation } from 'react-i18next';
import { Service } from '@/types/service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ServiceCardProps {
  service: Service;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { t } = useTranslation();

  return (
    <Card 
      variant="elevated" 
      className="flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl dark:hover:shadow-gray-900/50"
    >
      <div className="mb-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
          {service.icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {service.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          {service.description}
        </p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          {t('services.card.idealFor', 'Best for')}: <span className="normal-case tracking-normal text-gray-600 dark:text-gray-300">{service.category}</span>
        </p>
      </div>

      <div className="flex-grow">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">
          {t('services.card.benefits', 'What you get')}
        </h4>
        <ul className="space-y-3 mb-8">
          {service.benefits.map((benefit, index) => (
            <li key={index} className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                {benefit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto">
        <Button variant="primary" className="w-full" href={`/services/request?type=${service.id}`}>
          {t('services.card.requestNow', 'Request this service')}
        </Button>
      </div>
    </Card>
  );
};

export default ServiceCard;
