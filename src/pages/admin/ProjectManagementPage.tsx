import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ProjectAdminService,
  CategoryAdminService,
  ProjectReleaseAdminService,
  ProjectReleaseSummary,
} from '@/services/adminService';
import { Project, ProjectStatus, ProjectLevel, ProjectCategory } from '@/types/project';
import { AdminField, SeoFields } from '@/components/admin/FormPrimitives';
import { generateSlug } from '@/utils/slug';

export const ProjectManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>(() => ProjectAdminService.getAll());
  const [categories, setCategories] = useState<{ value: string; label: string }[]>(() =>
    CategoryAdminService.getAll()
      .filter(c => c.type === 'project')
      .map(c => ({ value: c.id, label: c.name }))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [releaseProject, setReleaseProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<ProjectReleaseSummary[]>([]);
  const [releaseVersion, setReleaseVersion] = useState('v1');
  const [releaseFile, setReleaseFile] = useState<File | null>(null);
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  // Form Fields State
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    slug: '',
    description: '',
    shortDescription: '',
    longDescription: '',
    category: 'final-year' as ProjectCategory,
    status: 'available' as ProjectStatus,
    level: 'intermediate' as ProjectLevel,
    price: '4999',
    currency: 'INR',
    tags: '',
    technologies: '',
    demoUrl: '',
    githubUrl: '',
    documentationUrl: '',
    thumbnail: '🚀',
    featured: 'false',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });

  const loadData = async () => {
    try {
      const [fetchedProjects, fetchedCats] = await Promise.all([
        ProjectAdminService.fetchAll(),
        CategoryAdminService.fetchAll(),
      ]);
      setProjects(fetchedProjects);
      const cats = fetchedCats
        .filter(c => c.type === 'project')
        .map(c => ({ value: c.id, label: c.name }));
      setCategories(cats);
    } catch {
      setProjects(ProjectAdminService.getAll());
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([ProjectAdminService.fetchAll(), CategoryAdminService.fetchAll()]).then(
      ([fetchedProjects, fetchedCats]) => {
        if (isMounted) {
          setProjects(fetchedProjects);
          const cats = fetchedCats
            .filter((c) => c.type === 'project')
            .map((c) => ({ value: c.id, label: c.name }));
          setCategories(cats);
        }
      }
    ).catch(() => {
      if (isMounted) {
        setProjects(ProjectAdminService.getAll());
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description,
      shortDescription: project.shortDescription || '',
      longDescription: project.longDescription || '',
      category: project.category,
      status: project.status,
      level: project.level,
      price: String(project.price),
      currency: project.currency || 'INR',
      tags: project.tags ? project.tags.join(', ') : '',
      technologies: project.technologies ? project.technologies.join(', ') : '',
      demoUrl: project.demoUrl || '',
      githubUrl: project.githubUrl || '',
      documentationUrl: project.documentationUrl || '',
      thumbnail: project.thumbnail || '🚀',
      featured: project.featured ? 'true' : 'false',
      seoTitle: project.seo?.title || '',
      seoDescription: project.seo?.description || '',
      seoKeywords: project.seo?.keywords ? project.seo.keywords.join(', ') : '',
    });
    setModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingProject(null);
    setFormData({
      id: `project-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      slug: '',
      description: '',
      shortDescription: '',
      longDescription: '',
      category: 'final-year',
      status: 'available',
      level: 'intermediate',
      price: '4999',
      currency: 'INR',
      tags: '',
      technologies: '',
      demoUrl: '',
      githubUrl: '',
      documentationUrl: '',
      thumbnail: '🚀',
      featured: 'false',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'title' && !editingProject) {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('admin.confirmDeleteProject', 'Are you sure you want to delete this project?'))) {
      await ProjectAdminService.delete(id);
      await loadData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug || !formData.description) return;

    const savedProject: Project = {
      id: formData.id,
      slug: formData.slug,
      title: formData.title,
      description: formData.description,
      shortDescription: formData.shortDescription,
      longDescription: formData.longDescription,
      category: formData.category,
      status: formData.status,
      level: formData.level,
      price: Number(formData.price),
      currency: formData.currency,
      thumbnail: formData.thumbnail,
      tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      technologies: formData.technologies.split(',').map(s => s.trim()).filter(Boolean),
      demoUrl: formData.demoUrl || undefined,
      githubUrl: formData.githubUrl || undefined,
      documentationUrl: formData.documentationUrl || undefined,
      featured: formData.featured === 'true',
      seo: {
        title: formData.seoTitle,
        description: formData.seoDescription,
        keywords: formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean),
      }
    };

    await ProjectAdminService.save(savedProject);
    setModalOpen(false);
    await loadData();
  };

  const openReleases = async (project: Project) => {
    setReleaseProject(project);
    setReleaseError('');
    try {
      setReleases(await ProjectReleaseAdminService.list(project.id));
    } catch (err) {
      setReleases([]);
      setReleaseError(err instanceof Error ? err.message : 'Unable to load project releases.');
    }
  };

  const refreshReleases = async () => {
    if (releaseProject) setReleases(await ProjectReleaseAdminService.list(releaseProject.id));
  };

  const handleReleaseUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseProject || !releaseFile) return;
    setReleaseBusy(true);
    setReleaseError('');
    try {
      await ProjectReleaseAdminService.upload(releaseProject.id, releaseVersion.trim(), releaseFile);
      setReleaseFile(null);
      await refreshReleases();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : 'Release upload failed.');
    } finally {
      setReleaseBusy(false);
    }
  };

  const handleReleaseAction = async (release: ProjectReleaseSummary, action: 'publish' | 'archive') => {
    if (!releaseProject) return;
    setReleaseBusy(true);
    setReleaseError('');
    try {
      if (action === 'publish') {
        await ProjectReleaseAdminService.publish(releaseProject.id, release.id);
      } else {
        await ProjectReleaseAdminService.archive(releaseProject.id, release.id);
      }
      await refreshReleases();
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : `Unable to ${action} release.`);
    } finally {
      setReleaseBusy(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('admin.projects.title', 'Marketplace Projects catalog')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.projects.subtitle', 'Configure items available for student mini-projects or client source code purchase.')}</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all"
        >
          ➕ {t('admin.projects.createNew', 'Add New Project')}
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder={t('admin.projects.searchPlaceholder', 'Search projects by title...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">{t('admin.projects.allCategories', 'All Categories')}</option>
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2"
        >
          <option value="all">{t('admin.projects.allStatuses', 'All Statuses')}</option>
          <option value="available">Available</option>
          <option value="beta">Beta</option>
          <option value="coming-soon">Coming Soon</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      {/* Projects Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4">{t('admin.table.project', 'Project')}</th>
                <th className="px-6 py-4">{t('admin.table.price', 'Price')}</th>
                <th className="px-6 py-4">{t('admin.table.category', 'Category')}</th>
                <th className="px-6 py-4">{t('admin.table.status', 'Status')}</th>
                <th className="px-6 py-4">{t('admin.table.featured', 'Featured')}</th>
                <th className="px-6 py-4 text-right">{t('admin.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm font-semibold">
              {filteredProjects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.thumbnail || '🚀'}</span>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{p.title}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono block">/{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-primary-600 dark:text-primary-400">
                    {p.currency || 'INR'} {p.price}
                  </td>
                  <td className="px-6 py-4 capitalize text-gray-500 dark:text-gray-400">{p.category.replace('-', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded capitalize ${p.status === 'available' ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                        p.status === 'beta' ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                          p.status === 'coming-soon' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' :
                            'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                      }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.featured ? <span className="text-yellow-500">⭐ Yes</span> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openReleases(p)} className="text-sm px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg">
                      Project File
                    </button>
                    <button onClick={() => handleEdit(p)} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-sm px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
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
                {editingProject ? t('admin.projects.editTitle', 'Edit Project Details') : t('admin.projects.createTitle', 'Add New Project')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminField label={t('admin.form.title', 'Project Title')} name="title" value={formData.title} onChange={handleFieldChange} required />
                <AdminField label={t('admin.form.slug', 'Project URL Slug')} name="slug" value={formData.slug} onChange={handleFieldChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminField
                  label={t('admin.form.category', 'Project Category')}
                  name="category"
                  value={formData.category}
                  onChange={handleFieldChange}
                  type="select"
                  options={categories}
                />
                <AdminField
                  label={t('admin.form.status', 'Catalog Status')}
                  name="status"
                  value={formData.status}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'available', label: 'Available for Purchase' },
                    { value: 'beta', label: 'Beta Program' },
                    { value: 'coming-soon', label: 'Coming Soon' },
                    { value: 'unavailable', label: 'Unavailable' },
                  ]}
                />
                <AdminField
                  label={t('admin.form.level', 'Academic Level')}
                  name="level"
                  value={formData.level}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' },
                  ]}
                />
                <AdminField
                  label={t('admin.form.featured', 'Promoted (Featured)')}
                  name="featured"
                  value={formData.featured}
                  onChange={handleFieldChange}
                  type="select"
                  options={[
                    { value: 'false', label: 'Normal' },
                    { value: 'true', label: 'Featured ⭐' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminField label={t('admin.form.price', 'Price')} name="price" value={formData.price} onChange={handleFieldChange} required />
                <AdminField label={t('admin.form.currency', 'Currency')} name="currency" value={formData.currency} onChange={handleFieldChange} required />
                <AdminField label={t('admin.form.thumbnail', 'Thumbnail Emoji')} name="thumbnail" value={formData.thumbnail} onChange={handleFieldChange} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminField label={t('admin.form.technologies', 'Tech Stack (Comma Separated)')} name="technologies" value={formData.technologies} onChange={handleFieldChange} placeholder="e.g. React, Python, Node.js" />
                <AdminField label={t('admin.form.tags', 'Tags (Comma Separated)')} name="tags" value={formData.tags} onChange={handleFieldChange} placeholder="e.g. Web application, dashboard, admin" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminField label={t('admin.form.demoUrl', 'Live Demo URL')} name="demoUrl" value={formData.demoUrl} onChange={handleFieldChange} />
                <AdminField label={t('admin.form.githubUrl', 'GitHub Code URL')} name="githubUrl" value={formData.githubUrl} onChange={handleFieldChange} />
                <AdminField label={t('admin.form.docUrl', 'Documentation URL')} name="documentationUrl" value={formData.documentationUrl} onChange={handleFieldChange} />
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

      {releaseProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-2xl w-full rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Project File / Release</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{releaseProject.title}</p>
              </div>
              <button onClick={() => setReleaseProject(null)} className="text-xl p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>

            <form onSubmit={handleReleaseUpload} className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Upload one private ZIP per version. Publishing makes it the default release for new paid orders.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={releaseVersion} onChange={(e) => setReleaseVersion(e.target.value)} required placeholder="v1" className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
                <input type="file" accept=".zip,application/zip" required onChange={(e) => setReleaseFile(e.target.files?.[0] || null)} className="sm:col-span-2 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700" />
              </div>
              <button disabled={releaseBusy || !releaseFile} className="px-4 py-2 bg-primary-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm">
                {releaseBusy ? 'Working…' : 'Upload ZIP'}
              </button>
              {releaseError && <p className="text-sm text-red-600 dark:text-red-400">{releaseError}</p>}
            </form>

            <div className="p-6 space-y-3">
              {releases.length === 0 && <p className="text-sm text-gray-500">No releases uploaded yet.</p>}
              {releases.map((release) => (
                <div key={release.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-bold text-gray-900 dark:text-white">{release.version} · {release.filename}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {(release.fileSize / 1024).toFixed(1)} KB · SHA-256 {release.sha256.slice(0, 12)}…
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-bold uppercase">{release.status}</span>
                  </div>
                  <div className="flex gap-2">
                    {release.status === 'ready' && (
                      <button disabled={releaseBusy} onClick={() => handleReleaseAction(release, 'publish')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm">Publish</button>
                    )}
                    {release.status !== 'archived' && (
                      <button disabled={releaseBusy} onClick={() => handleReleaseAction(release, 'archive')} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">Archive</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementPage;
