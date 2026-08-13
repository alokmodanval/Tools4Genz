import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolAdminService, CategoryAdminService } from '@/services/adminService';
import { Tool, ToolStatus, ToolCategory } from '@/types/tool';
import { AdminField, SeoFields } from '@/components/admin/FormPrimitives';
import { generateSlug } from '@/utils/slug';

export const ToolManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [tools, setTools] = useState<Tool[]>(() => ToolAdminService.getAll());
  const [categories, setCategories] = useState<{ value: string; label: string }[]>(() =>
    CategoryAdminService.getAll()
      .filter(c => c.type === 'tool')
      .map(c => ({ value: c.id, label: c.name }))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Edit Modal State
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    slug: '',
    description: '',
    longDescription: '',
    category: 'writing-tools' as ToolCategory,
    status: 'active' as ToolStatus,
    featured: 'false',
    icon: '🔧',
    tags: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    // Integration fields
    integration: 'native' as 'native' | 'external-url' | 'embedded' | 'worker-api' | 'external-api',
    externalUrl: '',
    embedUrl: '',
    embedSandbox: 'allow-scripts allow-same-origin',
    allowEmbed: 'false',
    workerEndpoint: '',
    workerMethod: 'POST',
    externalApiEndpointId: '',
    externalApiMethod: 'POST',
  });

  const loadData = () => {
    setTools(ToolAdminService.getAll());
    const cats = CategoryAdminService.getAll()
      .filter(c => c.type === 'tool')
      .map(c => ({ value: c.id, label: c.name }));
    setCategories(cats);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    const cfg = tool.integrationConfig;
    setFormData({
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      longDescription: tool.longDescription || '',
      category: tool.category,
      status: tool.status,
      featured: tool.featured ? 'true' : 'false',
      icon: tool.icon || '🔧',
      tags: tool.tags ? tool.tags.join(', ') : '',
      seoTitle: tool.seo?.title || '',
      seoDescription: tool.seo?.description || '',
      seoKeywords: tool.seo?.keywords ? tool.seo.keywords.join(', ') : '',
      integration: tool.integration || 'native',
      externalUrl: cfg && cfg.type === 'external-url' ? cfg.url : '',
      embedUrl: cfg && cfg.type === 'embedded' ? cfg.url : '',
      embedSandbox: cfg && cfg.type === 'embedded' && cfg.sandbox ? cfg.sandbox : 'allow-scripts allow-same-origin',
      allowEmbed: tool.allowEmbed ? 'true' : 'false',
      workerEndpoint: cfg && cfg.type === 'worker-api' ? cfg.endpoint : '',
      workerMethod: cfg && cfg.type === 'worker-api' && cfg.method ? cfg.method : 'POST',
      externalApiEndpointId: cfg && cfg.type === 'external-api' ? cfg.endpointId : '',
      externalApiMethod: cfg && cfg.type === 'external-api' && cfg.method ? cfg.method : 'POST',
    });
    setModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTool(null);
    setFormData({
      id: `tool-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      slug: '',
      description: '',
      longDescription: '',
      category: 'writing-tools',
      status: 'active',
      featured: 'false',
      icon: '🔧',
      tags: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      integration: 'native',
      externalUrl: '',
      embedUrl: '',
      embedSandbox: 'allow-scripts allow-same-origin',
      allowEmbed: 'false',
      workerEndpoint: '',
      workerMethod: 'POST',
      externalApiEndpointId: '',
      externalApiMethod: 'POST',
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'name' && !editingTool) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleDelete = (id: string) => {
    if (confirm(t('admin.confirmDelete', 'Are you sure you want to delete this tool?'))) {
      ToolAdminService.delete(id);
      loadData();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.description) return;

    // Build integration config based on selected integration type
    let integrationConfig: Tool['integrationConfig'];
    const integration = formData.integration;

    if (integration === 'external-url' && formData.externalUrl) {
      integrationConfig = { type: 'external-url', url: formData.externalUrl, openMode: 'new-tab' };
    } else if (integration === 'embedded' && formData.embedUrl) {
      integrationConfig = {
        type: 'embedded',
        url: formData.embedUrl,
        sandbox: formData.embedSandbox || 'allow-scripts allow-same-origin',
      };
    } else if (integration === 'worker-api' && formData.workerEndpoint) {
      integrationConfig = {
        type: 'worker-api',
        endpoint: formData.workerEndpoint,
        method: formData.workerMethod as 'GET' | 'POST',
      };
    } else if (integration === 'external-api' && formData.externalApiEndpointId) {
      integrationConfig = {
        type: 'external-api',
        endpointId: formData.externalApiEndpointId,
        method: formData.externalApiMethod as 'GET' | 'POST',
      };
    }

    const savedTool: Tool = {
      id: formData.id,
      slug: formData.slug,
      name: formData.name,
      description: formData.description,
      longDescription: formData.longDescription,
      category: formData.category,
      status: formData.status,
      featured: formData.featured === 'true',
      icon: formData.icon,
      tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      integration,
      integrationConfig,
      allowEmbed: formData.allowEmbed === 'true',
      seo: {
        title: formData.seoTitle,
        description: formData.seoDescription,
        keywords: formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean),
      }
    };

    ToolAdminService.save(savedTool);
    setModalOpen(false);
    loadData();
  };

  const filteredTools = tools.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCat === 'all' || t.category === selectedCat;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.tools.title', 'Tool Directory Parameters')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.tools.subtitle', 'Configure, edit, and categorize live client-side tools.')}</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all"
        >
          ➕ {t('admin.tools.createNew', 'Add New Tool')}
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder={t('admin.tools.searchPlaceholder', 'Search tools by title...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">{t('admin.tools.allCategories', 'All Categories')}</option>
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">{t('admin.tools.allStatuses', 'All Statuses')}</option>
          <option value="active">Active</option>
          <option value="beta">Beta</option>
          <option value="coming-soon">Coming Soon</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Tools Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4">{t('admin.table.tool', 'Tool')}</th>
                <th className="px-6 py-4">{t('admin.table.category', 'Category')}</th>
                <th className="px-6 py-4">{t('admin.table.status', 'Status')}</th>
                <th className="px-6 py-4">{t('admin.table.featured', 'Featured')}</th>
                <th className="px-6 py-4 text-right">{t('admin.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm font-semibold">
              {filteredTools.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{t.icon || '🔧'}</span>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{t.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono block">/{t.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-gray-500 dark:text-gray-400">{t.category.replace('-', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded capitalize ${t.status === 'active' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                      t.status === 'beta' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                        t.status === 'coming-soon' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' :
                          'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                      }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {t.featured ? <span className="text-yellow-500">⭐ Yes</span> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(t)} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-sm px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
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
          <div className="bg-white dark:bg-gray-800 max-w-3xl w-full rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingTool ? t('admin.tools.editTitle', 'Edit Tool Parameters') : t('admin.tools.createTitle', 'Add New Tool')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminField label={t('admin.form.name', 'Tool Name')} name="name" value={formData.name} onChange={handleFieldChange} required />
                <AdminField label={t('admin.form.slug', 'Tool URL Slug')} name="slug" value={formData.slug} onChange={handleFieldChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminField
                  label={t('admin.form.category', 'Tool Category')}
                  name="category"
                  value={formData.category}
                  onChange={handleFieldChange}
                  type="select"
                  options={categories}
                />
                <AdminField
                  label={t('admin.form.status', 'Publish Status')}
                  name="status"
                  value={formData.status}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'active', label: 'Active / Published' },
                    { value: 'beta', label: 'Beta Program' },
                    { value: 'coming-soon', label: 'Coming Soon Catalog' },
                    { value: 'disabled', label: 'Disabled / Internal' },
                  ]}
                />
                <AdminField
                  label={t('admin.form.featured', 'Promoted (Featured)')}
                  name="featured"
                  value={formData.featured}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'false', label: 'Normal Catalog' },
                    { value: 'true', label: 'Featured ⭐' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminField label={t('admin.form.icon', 'Visual Icon (Emoji)')} name="icon" value={formData.icon} onChange={handleFieldChange} required />
                <AdminField label={t('admin.form.tags', 'Tags / Tags Search (Comma Separated)')} name="tags" value={formData.tags} onChange={handleFieldChange} placeholder="e.g. Word Counter, Stats, Tool" />
              </div>

              {/* Integration Type */}
              <div className="bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/80 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🔌</span> {t('admin.form.integration', 'Integration Type')}
                </h3>
                <AdminField
                  label={t('admin.form.integrationType', 'Execution / Integration Strategy')}
                  name="integration"
                  value={formData.integration}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'native', label: t('admin.form.integrationNative', 'Native (bundled implementation)') },
                    { value: 'external-url', label: t('admin.form.integrationExternal', 'External URL (open in new tab)') },
                    { value: 'embedded', label: t('admin.form.integrationEmbedded', 'Embedded (sandboxed iframe)') },
                    { value: 'worker-api', label: t('admin.form.integrationWorker', 'Worker API (Cloudflare Worker)') },
                    { value: 'external-api', label: t('admin.form.integrationApi', 'External API (adapter)') },
                  ]}
                />

                {formData.integration === 'external-url' && (
                  <AdminField
                    label={t('admin.form.externalUrl', 'External Tool URL')}
                    name="externalUrl"
                    value={formData.externalUrl}
                    onChange={handleFieldChange}
                    placeholder="https://example-tool.pages.dev"
                  />
                )}

                {formData.integration === 'embedded' && (
                  <div className="space-y-4">
                    <AdminField
                      label={t('admin.form.embedUrl', 'Embedded App URL')}
                      name="embedUrl"
                      value={formData.embedUrl}
                      onChange={handleFieldChange}
                      placeholder="https://app.example.com"
                    />
                    <AdminField
                      label={t('admin.form.embedSandbox', 'Iframe Sandbox (safe defaults)')}
                      name="embedSandbox"
                      value={formData.embedSandbox}
                      onChange={handleFieldChange}
                      placeholder="allow-scripts allow-same-origin"
                    />
                    <AdminField
                      label={t('admin.form.allowEmbed', 'Allow Embedding (opt-in)')}
                      name="allowEmbed"
                      value={formData.allowEmbed}
                      onChange={handleFieldChange}
                      type="select"
                      options={[
                        { value: 'false', label: 'No (disabled by default)' },
                        { value: 'true', label: 'Yes (render sandboxed iframe)' },
                      ]}
                    />
                  </div>
                )}

                {formData.integration === 'worker-api' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AdminField
                      label={t('admin.form.workerEndpoint', 'Worker Endpoint Path')}
                      name="workerEndpoint"
                      value={formData.workerEndpoint}
                      onChange={handleFieldChange}
                      placeholder="/api/demo-worker"
                    />
                    <AdminField
                      label={t('admin.form.workerMethod', 'HTTP Method')}
                      name="workerMethod"
                      value={formData.workerMethod}
                      onChange={handleFieldChange}
                      type="select"
                      options={[
                        { value: 'POST', label: 'POST' },
                        { value: 'GET', label: 'GET' },
                      ]}
                    />
                  </div>
                )}

                {formData.integration === 'external-api' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AdminField
                      label={t('admin.form.externalApiId', 'External API Endpoint ID')}
                      name="externalApiEndpointId"
                      value={formData.externalApiEndpointId}
                      onChange={handleFieldChange}
                      placeholder="demo-external-api"
                    />
                    <AdminField
                      label={t('admin.form.externalApiMethod', 'HTTP Method')}
                      name="externalApiMethod"
                      value={formData.externalApiMethod}
                      onChange={handleFieldChange}
                      type="select"
                      options={[
                        { value: 'POST', label: 'POST' },
                        { value: 'GET', label: 'GET' },
                      ]}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('admin.form.integrationNote', 'Secrets and API keys are never stored in frontend tool definitions.')}
                </p>
              </div>

              <AdminField label={t('admin.form.description', 'Short description')} name="description" value={formData.description} onChange={handleFieldChange} type="textarea" required />
              <AdminField label={t('admin.form.longDescription', 'Long comprehensive description')} name="longDescription" value={formData.longDescription} onChange={handleFieldChange} type="textarea" />

              <SeoFields
                seoTitle={formData.seoTitle}
                seoDescription={formData.seoDescription}
                seoKeywords={formData.seoKeywords}
                onChange={handleFieldChange}
              />

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

export default ToolManagementPage;
