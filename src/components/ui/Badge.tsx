import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'warning' | 'success' | 'outline' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    default: 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-200',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
    secondary: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300',
    accent: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    outline: 'border border-surface-300 text-surface-700 dark:border-surface-600 dark:text-surface-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
