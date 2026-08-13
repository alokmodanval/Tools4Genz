import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
}

const Container: React.FC<ContainerProps> = ({
  as: Component = 'div',
  className = '',
  children,
  ...props
}) => {
  return (
    <Component className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${className}`} {...props}>
      {children}
    </Component>
  );
};

export default Container;
