import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  ...props
}) => {
  const baseStyles = 'animate-pulse bg-surface-200 dark:bg-surface-700';
  
  const variants = {
    text: 'rounded-md h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const style = {
    width: width,
    height: height,
  };

  const classes = `${baseStyles} ${variants[variant]} ${className}`;

  return (
    <div className={classes} style={style} {...props} />
  );
};

export default Skeleton;
