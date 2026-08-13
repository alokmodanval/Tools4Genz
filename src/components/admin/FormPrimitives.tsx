import React from 'react';
import { useTranslation } from 'react-i18next';

interface AdminFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}

export const AdminField: React.FC<AdminFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  options = [],
  placeholder = '',
  required = false,
}) => {
  const commonClasses = "w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all";

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {type === 'textarea' && (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          className={commonClasses}
        />
      )}

      {type === 'select' && (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={commonClasses}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'checkbox' && (
        <div className="flex items-center">
          <input
            type="checkbox"
            name={name}
            checked={value === 'true'}
            onChange={(e) => {
              const syntheticEvent = {
                target: {
                  name,
                  value: e.target.checked ? 'true' : 'false'
                }
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
        </div>
      )}

      {type === 'date' && (
        <input
          type="date"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={commonClasses}
        />
      )}

      {type === 'text' && (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={commonClasses}
        />
      )}
    </div>
  );
};

interface SeoFieldsProps {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const SeoFields: React.FC<SeoFieldsProps> = ({
  seoTitle,
  seoDescription,
  seoKeywords,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/80 space-y-4">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
        <span>🔍</span> {t('admin.form.seoSettings', 'SEO & Discovery Parameters')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminField
          label={t('admin.form.seoTitle', 'SEO Page Title')}
          name="seoTitle"
          value={seoTitle}
          onChange={onChange}
          placeholder={t('admin.form.seoTitlePlaceholder', 'Enter optimized title')}
        />
        <AdminField
          label={t('admin.form.seoKeywords', 'Keywords (Comma Separated)')}
          name="seoKeywords"
          value={seoKeywords}
          onChange={onChange}
          placeholder="e.g. word counter, text statistics, characters"
        />
      </div>
      <AdminField
        label={t('admin.form.seoDescription', 'Meta Description')}
        name="seoDescription"
        value={seoDescription}
        onChange={onChange}
        type="textarea"
        placeholder={t('admin.form.seoDescPlaceholder', 'A brief optimized snippet summarizing this resource')}
      />
    </div>
  );
};
