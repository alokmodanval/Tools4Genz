import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  onClick,
  ...props
}) => {
  const baseStyles = 'rounded-xl overflow-hidden transition-all duration-200 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100';
  
  const variants = {
    default: 'shadow-sm',
    bordered: 'border border-surface-200 dark:border-surface-700',
    elevated: 'shadow-md hover:shadow-lg dark:shadow-surface-900/50 hover:-translate-y-1',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  const classes = `${baseStyles} ${variants[variant]} ${paddings[padding]} ${onClick ? 'cursor-pointer' : ''} ${className}`;

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export default Card;
