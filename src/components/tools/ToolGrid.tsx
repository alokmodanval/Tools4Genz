import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tool } from '@/types/tool';
import EmptyState from '@/components/ui/EmptyState';
import ToolCard from './ToolCard';

interface ToolGridProps {
  tools: Tool[];
}

const ToolGrid: React.FC<ToolGridProps> = ({ tools }) => {
  const { t } = useTranslation();

  if (!tools || tools.length === 0) {
    return (
      <EmptyState 
        icon="🔍"
        title={t('tools.empty.title')}
        description={t('tools.empty.description')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
};

export default ToolGrid;
