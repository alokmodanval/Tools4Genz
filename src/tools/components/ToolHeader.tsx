import React from 'react';
import Badge from '@/components/ui/Badge';
import { ToolDefinition } from '@/types/tool';

export interface ToolHeaderProps {
  tool: ToolDefinition;
  className?: string;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({ tool, className = '' }) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'beta':
        return 'warning';
      case 'coming-soon':
        return 'info';
      case 'disabled':
        return 'danger';
      default:
        return 'primary';
    }
  };

  return (
    <div className={`flex flex-col md:flex-row gap-6 items-start ${className}`}>
      {tool.icon && (
        <div className="w-16 h-16 text-3xl md:w-20 md:h-20 md:text-4xl bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center shrink-0 border border-primary-100 dark:border-primary-800/40">
          {tool.icon}
        </div>
      )}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {tool.name}
          </h2>
          <Badge variant="primary">{tool.category}</Badge>
          {tool.status && (
            <Badge variant={getStatusBadgeVariant(tool.status)}>
              {tool.status}
            </Badge>
          )}
          {tool.executionMode && (
            <Badge variant="outline" size="sm">
              {tool.executionMode}
            </Badge>
          )}
        </div>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">
          {tool.description}
        </p>
      </div>
    </div>
  );
};

export default ToolHeader;
