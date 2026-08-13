import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required,
  className = '',
  id: externalId,
  ...props
}) => {
  const generatedId = useId();
  const id = externalId || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        required={required}
        className={`block w-full rounded-md shadow-sm sm:text-sm transition-colors
          ${error 
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-700 dark:text-red-300 dark:placeholder-red-700 dark:bg-surface-900' 
            : 'border-surface-300 text-surface-900 focus:ring-primary-500 focus:border-primary-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:placeholder-surface-500'
          }
          disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed dark:disabled:bg-surface-800
          border px-3 py-2 outline-none
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">{helperText}</p>}
    </div>
  );
};

export default Input;
