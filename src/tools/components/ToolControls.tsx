import React from 'react';

export interface ToolControlsProps {
  children: React.ReactNode;
  className?: string;
}

export const ToolControls: React.FC<ToolControlsProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-3 pt-2 ${className}`}>
      {children}
    </div>
  );
};

export default ToolControls;
