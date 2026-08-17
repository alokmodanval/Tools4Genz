import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryAdminService, AdminCategory } from '@/services/adminService';
import { AdminField } from '@/components/admin/FormPrimitives';

export const CategoryManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<AdminCategory[]>(() => CategoryAdminService.getAll());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  // Modal State
  const [editingCat, setEditingCat] = useState<AdminCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '📁',
    type: 'tool' as 'tool' | 'project' | 'service',
  });

  const loadData = async () => {
    try {
      const live = await CategoryAdminService.fetchAll();
      setCategories(live);
    } catch {
      setCategories(CategoryAdminService.getAll());
    }
  };

  useEffect(() => {
    let isMounted = true;
    CategoryAdminService.fetchAll().then((live) => {
      if (isMounted) {
        setCategories(live);
      }
    }).catch(() => {
      if (isMounted) {
        setCategories(CategoryAdminService.getAll());
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = (cat: AdminCategory) => {
    setEditingCat(cat);
    setFormData({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '📁',
      type: cat.type,
    });
    setModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingCat(null);
    setFormData({
      id: `cat-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      icon: '📁',
      type: 'tool',
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id: string, type: 'tool' | 'project' | 'service') => {
    if (confirm(t('admin.confirmDeleteCategory', 'Are you sure you want to delete this category?'))) {
      await CategoryAdminService.delete(id, type);
      await loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.id) return;

    const savedCat: AdminCategory = {
      id: formData.id,
      name: formData.name,
      icon: formData.icon,
      type: formData.type,
      count: editingCat ? editingCat.count : 0,
    };

    await CategoryAdminService.save(savedCat);
    setModalOpen(false);
    await loadData();
  };

  const filteredCategories = categories.filter(c => {
    return selectedTypeFilter === 'all' || c.type === selectedTypeFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.categories.title', 'Centralized Category Definitions')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.categories.subtitle', 'Configure taxonomies for tools, projects, and custom solutions.')}</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all"
        >
          ➕ {t('admin.categories.createNew', 'Add New Category')}
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm">
        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="w-full sm:w-64 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 animate-all"
        >
          <option value="all">{t('admin.categories.allTypes', 'All Parameter Types')}</option>
          <option value="tool">Tools Taxonomies</option>
          <option value="project">Projects Taxonomies</option>
          <option value="service">Services Taxonomies</option>
        </select>
      </div>

      {/* Categories Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4">{t('admin.table.category', 'Category')}</th>
                <th className="px-6 py-4">{t('admin.table.type', 'Scope Type')}</th>
                <th className="px-6 py-4">{t('admin.table.itemsCount', 'Items Count')}</th>
                <th className="px-6 py-4 text-right">{t('admin.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm font-semibold">
              {filteredCategories.map(c => (
                <tr key={`${c.type}-${c.id}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.icon || '📁'}</span>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{c.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono block">{c.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-gray-500 dark:text-gray-400">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${c.type === 'tool' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                        c.type === 'project' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' :
                          'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                      }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400 font-bold">{c.count}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(c)} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c.id, c.type)} className="text-sm px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
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
          <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingCat ? t('admin.categories.editTitle', 'Edit Category Parameters') : t('admin.categories.createTitle', 'Add New Category')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <AdminField label={t('admin.form.id', 'Category ID (System Key)')} name="id" value={formData.id} onChange={handleFieldChange} placeholder="e.g. cloud-tools" required />
              <AdminField label={t('admin.form.name', 'Category Label (Display)')} name="name" value={formData.name} onChange={handleFieldChange} placeholder="e.g. Cloud Tools" required />

              <div className="grid grid-cols-2 gap-4">
                <AdminField
                  label={t('admin.form.type', 'Scope Type')}
                  name="type"
                  value={formData.type}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'tool', label: 'Tools Catalog' },
                    { value: 'project', label: 'Projects Catalog' },
                    { value: 'service', label: 'Services Blocks' },
                  ]}
                />
                <AdminField label={t('admin.form.icon', 'Visual Icon (Emoji)')} name="icon" value={formData.icon} onChange={handleFieldChange} required />
              </div>

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

export default CategoryManagementPage;
