import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminField } from '@/components/admin/FormPrimitives';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    siteName: 'Tools4Genz',
    siteUrl: 'https://tools4genz.com',
    contactEmail: 'contact@tools4genz.com',
    maintenanceMode: 'false',
    allowRegistrations: 'false',
    themeDefault: 'system',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert(t('admin.settings.saved', 'Platform settings saved successfully (local mock store)!'));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.settings.title', 'Platform Settings')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.settings.subtitle', 'Configure general platform variables and system flags.')}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminField label={t('admin.settings.siteName', 'Site Name')} name="siteName" value={formData.siteName} onChange={handleChange} required />
          <AdminField label={t('admin.settings.siteUrl', 'Site URL')} name="siteUrl" value={formData.siteUrl} onChange={handleChange} required />
        </div>

        <AdminField label={t('admin.settings.contactEmail', 'Support/Contact Email')} name="contactEmail" value={formData.contactEmail} onChange={handleChange} required />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-700/50 pt-6">
          <AdminField
            label={t('admin.settings.maintenanceMode', 'Maintenance Mode')}
            name="maintenanceMode"
            value={formData.maintenanceMode}
            onChange={handleChange}
            type="select"
            options={[
              { value: 'false', label: 'Online / Operational' },
              { value: 'true', label: 'Under Maintenance' },
            ]}
          />
          <AdminField
            label={t('admin.settings.allowRegistrations', 'User Registration')}
            name="allowRegistrations"
            value={formData.allowRegistrations}
            onChange={handleChange}
            type="select"
            options={[
              { value: 'false', label: 'Disabled (Invite Only)' },
              { value: 'true', label: 'Enabled' },
            ]}
          />
          <AdminField
            label={t('admin.settings.themeDefault', 'Default Theme')}
            name="themeDefault"
            value={formData.themeDefault}
            onChange={handleChange}
            type="select"
            options={[
              { value: 'system', label: 'System Sync' },
              { value: 'light', label: 'Light Theme' },
              { value: 'dark', label: 'Dark Theme' },
            ]}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm">
            {t('admin.settings.saveButton', 'Save Platform Settings')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
