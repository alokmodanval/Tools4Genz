import React from 'react';

export interface ToolShellProps {
  children: React.ReactNode;
  className?: string;
}

export const ToolShell: React.FC<ToolShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="p-6 md:p-10 space-y-8">
        {children}
      </div>
    </div>
  );
};

export default ToolShell;
