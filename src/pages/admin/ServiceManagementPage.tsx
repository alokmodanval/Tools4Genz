import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServiceAdminService, CategoryAdminService } from '@/services/adminService';
import { Service } from '@/types/service';
import { AdminField } from '@/components/admin/FormPrimitives';

export const ServiceManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[]>(() => ServiceAdminService.getAll());
  const [categories, setCategories] = useState<{ value: string; label: string }[]>(() =>
    CategoryAdminService.getAll()
      .filter(c => c.type === 'service')
      .map(c => ({ value: c.id, label: c.name }))
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    category: 'Development',
    icon: '💻',
    benefits: '',
    features: '',
  });

  const loadData = () => {
    setServices(ServiceAdminService.getAll());
    const cats = CategoryAdminService.getAll()
      .filter(c => c.type === 'service')
      .map(c => ({ value: c.id, label: c.name }));
    setCategories(cats);
  };

  const handleEdit = (svc: Service) => {
    setEditingService(svc);
    setFormData({
      id: svc.id,
      title: svc.title,
      description: svc.description,
      category: svc.category,
      icon: svc.icon || '💼',
      benefits: svc.benefits ? svc.benefits.join(', ') : '',
      features: svc.features ? svc.features.join(', ') : '',
    });
    setModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingService(null);
    setFormData({
      id: `svc-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      description: '',
      category: 'Development',
      icon: '💼',
      benefits: '',
      features: '',
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = (id: string) => {
    if (confirm(t('admin.confirmDeleteService', 'Are you sure you want to delete this service?'))) {
      ServiceAdminService.delete(id);
      loadData();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    const savedSvc: Service = {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      icon: formData.icon,
      benefits: formData.benefits.split(',').map(s => s.trim()).filter(Boolean),
      features: formData.features.split(',').map(s => s.trim()).filter(Boolean),
    };

    ServiceAdminService.save(savedSvc);
    setModalOpen(false);
    loadData();
  };

  const filteredServices = services.filter(s => {
    return s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.services.title', 'Services definitions')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.services.subtitle', 'Configure development, consulting, and education service blocks.')}</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all"
        >
          ➕ {t('admin.services.createNew', 'Add New Service')}
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
        <input
          type="text"
          placeholder={t('admin.services.searchPlaceholder', 'Search services by name...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
      </div>

      {/* Services Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4">{t('admin.table.service', 'Service')}</th>
                <th className="px-6 py-4">{t('admin.table.category', 'Category')}</th>
                <th className="px-6 py-4">{t('admin.table.benefits', 'Benefits')}</th>
                <th className="px-6 py-4 text-right">{t('admin.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm font-semibold">
              {filteredServices.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.icon || '💼'}</span>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{s.title}</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm line-clamp-1">{s.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-bold">{s.category}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500 max-w-xs truncate">
                    {s.benefits ? s.benefits.join(' • ') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(s)} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-sm px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal Window */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 max-w-2xl w-full rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingService ? t('admin.services.editTitle', 'Edit Service Details') : t('admin.services.createTitle', 'Add New Service')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <AdminField label={t('admin.form.title', 'Service Title')} name="title" value={formData.title} onChange={handleFieldChange} required />
                </div>
                <AdminField label={t('admin.form.icon', 'Icon (Emoji)')} name="icon" value={formData.icon} onChange={handleFieldChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminField
                  label={t('admin.form.category', 'Service Category')}
                  name="category"
                  value={formData.category}
                  onChange={handleFieldChange}
                  type="select"
                  options={categories}
                />
                <AdminField label={t('admin.form.benefits', 'Benefits (Comma Separated)')} name="benefits" value={formData.benefits} onChange={handleFieldChange} placeholder="e.g. Clean Code, 24/7 Support" />
              </div>

              <AdminField label={t('admin.form.features', 'Core Features (Comma Separated)')} name="features" value={formData.features} onChange={handleFieldChange} placeholder="e.g. React/Next.js, Tailwind integration" />
              <AdminField label={t('admin.form.description', 'Short description')} name="description" value={formData.description} onChange={handleFieldChange} type="textarea" required />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagementPage;
