import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tool } from '@/types/tool';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ToolCardProps {
  tool: Tool;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const { t } = useTranslation();

  const isComingSoon = tool.status === 'coming-soon';
  const isDisabled = tool.status === 'disabled';

  return (
    <Card 
      variant="elevated" 
      className="flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-gray-900/50"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl w-16 h-16 flex items-center justify-center border border-gray-200/50 dark:border-gray-700/50">
          {tool.icon || '🔧'}
        </div>
        <div className="flex flex-col items-end space-y-1.5">
          {isComingSoon ? (
            <Badge variant="warning" size="sm">{t('tools.coming_soon', 'Coming Soon')}</Badge>
          ) : tool.status === 'beta' ? (
            <Badge variant="accent" size="sm">{t('tools.beta', 'Beta')}</Badge>
          ) : isDisabled ? (
            <Badge variant="danger" size="sm">{t('tools.disabled', 'Disabled')}</Badge>
          ) : null}
          <Badge variant="primary" size="sm">{tool.category}</Badge>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
        {tool.name}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 flex-grow">
        {tool.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {tool.tags.slice(0, 3).map((tag, index) => (
          <Badge key={index} variant="outline" size="sm">
            {tag}
          </Badge>
        ))}
        {tool.tags.length > 3 && (
          <Badge variant="outline" size="sm">
            +{tool.tags.length - 3}
          </Badge>
        )}
      </div>

      <div className="mt-auto">
        {isComingSoon || isDisabled ? (
          <Button variant="outline" className="w-full opacity-60 cursor-not-allowed" disabled>
            {isComingSoon ? t('tools.coming_soon', 'Coming Soon') : t('tools.disabled', 'Disabled')}
          </Button>
        ) : (
          <Button variant="primary" className="w-full" href={`/tools/${tool.slug}`}>
            {t('tools.try_now', 'Try Tool')}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ToolCard;
