import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  required,
  className = '',
  id: externalId,
  ...props
}) => {
  const { t } = useTranslation();
  const generatedId = useId();
  const id = externalId || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        required={required}
        className={`block w-full rounded-md shadow-sm sm:text-sm transition-colors
          ${error 
            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:border-red-700 dark:text-red-300 dark:bg-surface-900' 
            : 'border-surface-300 text-surface-900 focus:ring-primary-500 focus:border-primary-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100'
          }
          disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed dark:disabled:bg-surface-800
          border px-3 py-2 outline-none
          ${className}
        `}
        {...props}
      >
        <option value="" disabled>{t('forms.selectOption', 'Select an option')}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default Select;
