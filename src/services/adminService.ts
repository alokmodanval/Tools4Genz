import { Tool } from '@/types/tool';
import { Project } from '@/types/project';
import { Service } from '@/types/service';
import { BaseRequestData, RequestStatus } from '@/types/request';
import { toolRegistry } from '@/tools/registry';
import { projects as initialProjects } from '@/data/projects';
import { services as initialServices } from '@/data/services';
import {
  toolCategories as initialToolCategories,
  projectCategories as initialProjectCategories,
} from '@/data/categories';

import { API_BASE_URL } from '@/config/api';

// Base API endpoint URL
const API_BASE = `${API_BASE_URL}/api`;

export interface AdminRequest extends BaseRequestData {
  requestId: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminCategory {
  type: 'tool' | 'project' | 'service';
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface AdminDashboardMetrics {
  totalTools: number;
  activeTools: number;
  totalProjects: number;
  featuredProjects: number;
  pendingRequests: number;
  completedRequests: number;
  totalServices: number;
}

export interface AdminUser {
  userId: number | string;
  email: string;
  role: string;
  status: string;
}

export interface ProjectReleaseSummary {
  id: number;
  projectId: string;
  version: string;
  filename: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  status: 'draft' | 'ready' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/**
 * Generic authenticated API fetch wrapper.
 * Always sends HttpOnly session cookies via credentials: "include".
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || 'Authentication required or session expired';
    authStore.isAuthenticated = false;
    authStore.currentUser = null;
    throw new Error(message);
  }

  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || 'Access denied';
    throw new Error(message);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  const jsonResult = await response.json();
  // Worker standard response envelope: { success: true, data: ... }
  if (jsonResult && typeof jsonResult === 'object' && 'data' in jsonResult) {
    return jsonResult.data as T;
  }
  return jsonResult as T;
}

// Initial in-memory mock datasets (used as initial synchronous state & fallback)
const initialToolList: Tool[] = toolRegistry.map((t) => {
  const rest = { ...t };
  delete rest.component;
  return rest as Tool;
});

const initialCategoryList: AdminCategory[] = [
  ...initialToolCategories.map((c) => ({
    type: 'tool' as const,
    id: c.id,
    name: c.name,
    icon: c.icon,
    count: c.count,
  })),
  ...initialProjectCategories.map((c) => ({
    type: 'project' as const,
    id: c.id,
    name: c.name,
    icon: c.icon,
    count: c.count,
  })),
  { type: 'service' as const, id: 'Development', name: 'Development', icon: '💻', count: 2 },
  { type: 'service' as const, id: 'Enterprise', name: 'Enterprise', icon: '⚙️', count: 1 },
  { type: 'service' as const, id: 'AI/ML', name: 'AI/ML', icon: '🧠', count: 1 },
  { type: 'service' as const, id: 'Education', name: 'Education', icon: '🎓', count: 1 },
  { type: 'service' as const, id: 'Consulting', name: 'Consulting', icon: '📈', count: 1 },
];

let toolCache: Tool[] = [...initialToolList];
let projectCache: Project[] = [...initialProjects];
let serviceCache: Service[] = [...initialServices];
let categoryCache: AdminCategory[] = [...initialCategoryList];
let requestCache: AdminRequest[] = [];

// ============================================================
// Tool Admin Service
// ============================================================
export const ToolAdminService = {
  getAll(): Tool[] {
    return toolCache;
  },

  async fetchAll(): Promise<Tool[]> {
    try {
      const live = await apiFetch<Tool[]>('/admin/tools');
      if (Array.isArray(live) && live.length > 0) {
        toolCache = live;
        return live;
      }
      // If DB is empty, seed initial tools
      for (const t of initialToolList) {
        await apiFetch('/admin/tools', {
          method: 'POST',
          body: JSON.stringify(t),
        }).catch(() => {});
      }
      const seeded = await apiFetch<Tool[]>('/admin/tools').catch(() => initialToolList);
      toolCache = Array.isArray(seeded) && seeded.length > 0 ? seeded : initialToolList;
      return toolCache;
    } catch {
      return toolCache;
    }
  },

  async save(tool: Tool): Promise<void> {
    await apiFetch('/admin/tools', {
      method: 'POST',
      body: JSON.stringify(tool),
    });
    const idx = toolCache.findIndex((t) => t.id === tool.id);
    if (idx >= 0) toolCache[idx] = tool;
    else toolCache.unshift(tool);
  },

  async update(tool: Tool): Promise<void> {
    await apiFetch(`/admin/tools/${tool.id}`, {
      method: 'PUT',
      body: JSON.stringify(tool),
    });
    const idx = toolCache.findIndex((t) => t.id === tool.id);
    if (idx >= 0) toolCache[idx] = tool;
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/admin/tools/${id}`, {
      method: 'DELETE',
    });
    toolCache = toolCache.map((tool) => tool.id === id ? { ...tool, status: 'disabled', featured: false } : tool);
  },
};

// ============================================================
// Project Admin Service
// ============================================================
export const ProjectAdminService = {
  getAll(): Project[] {
    return projectCache;
  },

  async fetchAll(): Promise<Project[]> {
    try {
      const live = await apiFetch<Project[]>('/admin/projects');
      if (Array.isArray(live) && live.length > 0) {
        projectCache = live;
        return live;
      }
      // Seed if DB is empty
      for (const p of initialProjects) {
        await apiFetch('/admin/projects', {
          method: 'POST',
          body: JSON.stringify(p),
        }).catch(() => {});
      }
      const seeded = await apiFetch<Project[]>('/admin/projects').catch(() => initialProjects);
      projectCache = Array.isArray(seeded) && seeded.length > 0 ? seeded : initialProjects;
      return projectCache;
    } catch {
      return projectCache;
    }
  },

  async save(proj: Project): Promise<void> {
    const idx = projectCache.findIndex((p) => p.id === proj.id);
    if (idx >= 0) {
      projectCache[idx] = proj;
    } else {
      projectCache.unshift(proj);
    }
    await apiFetch('/admin/projects', {
      method: 'POST',
      body: JSON.stringify(proj),
    });
  },

  async update(proj: Project): Promise<void> {
    const idx = projectCache.findIndex((p) => p.id === proj.id);
    if (idx >= 0) {
      projectCache[idx] = proj;
    }
    await apiFetch(`/admin/projects/${proj.id}`, {
      method: 'PUT',
      body: JSON.stringify(proj),
    });
  },

  async delete(id: string): Promise<void> {
    projectCache = projectCache.filter((p) => p.id !== id);
    await apiFetch(`/admin/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

export const ProjectReleaseAdminService = {
  async list(projectId: string): Promise<ProjectReleaseSummary[]> {
    return apiFetch<ProjectReleaseSummary[]>(`/admin/projects/${encodeURIComponent(projectId)}/releases`);
  },

  async upload(projectId: string, version: string, file: File): Promise<ProjectReleaseSummary> {
    const form = new FormData();
    form.set('version', version);
    form.set('file', file);
    return apiFetch<ProjectReleaseSummary>(
      `/admin/projects/${encodeURIComponent(projectId)}/releases`,
      { method: 'POST', body: form }
    );
  },

  async publish(projectId: string, releaseId: number): Promise<ProjectReleaseSummary> {
    return apiFetch<ProjectReleaseSummary>(
      `/admin/projects/${encodeURIComponent(projectId)}/releases/${releaseId}/publish`,
      { method: 'POST' }
    );
  },

  async archive(projectId: string, releaseId: number): Promise<void> {
    await apiFetch(
      `/admin/projects/${encodeURIComponent(projectId)}/releases/${releaseId}/archive`,
      { method: 'POST' }
    );
  },
};

// ============================================================
// Service Admin Service
// ============================================================
export const ServiceAdminService = {
  getAll(): Service[] {
    return serviceCache;
  },

  async fetchAll(): Promise<Service[]> {
    try {
      const live = await apiFetch<Service[]>('/admin/services');
      if (Array.isArray(live) && live.length > 0) {
        serviceCache = live;
        return live;
      }
      // Seed if DB is empty
      for (const s of initialServices) {
        await apiFetch('/admin/services', {
          method: 'POST',
          body: JSON.stringify(s),
        }).catch(() => {});
      }
      const seeded = await apiFetch<Service[]>('/admin/services').catch(() => initialServices);
      serviceCache = Array.isArray(seeded) && seeded.length > 0 ? seeded : initialServices;
      return serviceCache;
    } catch {
      return serviceCache;
    }
  },

  async save(svc: Service): Promise<void> {
    const idx = serviceCache.findIndex((s) => s.id === svc.id);
    if (idx >= 0) {
      serviceCache[idx] = svc;
    } else {
      serviceCache.unshift(svc);
    }
    await apiFetch('/admin/services', {
      method: 'POST',
      body: JSON.stringify(svc),
    });
  },

  async update(svc: Service): Promise<void> {
    const idx = serviceCache.findIndex((s) => s.id === svc.id);
    if (idx >= 0) {
      serviceCache[idx] = svc;
    }
    await apiFetch(`/admin/services/${svc.id}`, {
      method: 'PUT',
      body: JSON.stringify(svc),
    });
  },

  async delete(id: string): Promise<void> {
    serviceCache = serviceCache.filter((s) => s.id !== id);
    await apiFetch(`/admin/services/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Category Admin Service
// ============================================================
export const CategoryAdminService = {
  getAll(): AdminCategory[] {
    return categoryCache;
  },

  async fetchAll(): Promise<AdminCategory[]> {
    try {
      const live = await apiFetch<AdminCategory[]>('/admin/categories');
      if (Array.isArray(live) && live.length > 0) {
        categoryCache = live;
        return live;
      }
      // Seed if DB is empty
      for (const c of initialCategoryList) {
        await apiFetch('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(c),
        }).catch(() => {});
      }
      const seeded = await apiFetch<AdminCategory[]>('/admin/categories').catch(() => initialCategoryList);
      categoryCache = Array.isArray(seeded) && seeded.length > 0 ? seeded : initialCategoryList;
      return categoryCache;
    } catch {
      return categoryCache;
    }
  },

  async save(cat: AdminCategory): Promise<void> {
    const idx = categoryCache.findIndex((c) => c.id === cat.id && c.type === cat.type);
    if (idx >= 0) {
      categoryCache[idx] = cat;
    } else {
      categoryCache.push(cat);
    }
    await apiFetch('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    });
  },

  async update(cat: AdminCategory): Promise<void> {
    const idx = categoryCache.findIndex((c) => c.id === cat.id && c.type === cat.type);
    if (idx >= 0) {
      categoryCache[idx] = cat;
    }
    await apiFetch(`/admin/categories/${cat.id}`, {
      method: 'PUT',
      body: JSON.stringify(cat),
    });
  },

  async delete(id: string, type?: 'tool' | 'project' | 'service'): Promise<void> {
    categoryCache = categoryCache.filter((c) => !(c.id === id && (!type || c.type === type)));
    await apiFetch(`/admin/categories/${id}${type ? `?type=${type}` : ''}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Request Admin Service
// ============================================================
export const RequestAdminService = {
  getAll(): AdminRequest[] {
    return requestCache;
  },

  async fetchAll(): Promise<AdminRequest[]> {
    try {
      const live = await apiFetch<AdminRequest[]>('/admin/requests');
      if (Array.isArray(live)) {
        requestCache = live;
        return live;
      }
      return requestCache;
    } catch {
      return requestCache;
    }
  },

  async getById(requestId: string): Promise<AdminRequest | undefined> {
    try {
      return await apiFetch<AdminRequest>(`/admin/requests/${requestId}`);
    } catch {
      return requestCache.find((r) => r.requestId === requestId);
    }
  },

  async updateStatus(requestId: string, status: RequestStatus): Promise<void> {
    const idx = requestCache.findIndex((r) => r.requestId === requestId);
    if (idx >= 0) {
      requestCache[idx] = { ...requestCache[idx], status };
    }
    await apiFetch(`/admin/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// ============================================================
// Admin Dashboard Service
// ============================================================
export const AdminDashboardService = {
  getMetrics(): AdminDashboardMetrics {
    return {
      totalTools: toolCache.length,
      activeTools: toolCache.filter((t) => t.status === 'active').length,
      totalProjects: projectCache.length,
      featuredProjects: projectCache.filter((p) => p.featured).length,
      pendingRequests: requestCache.filter(
        (r) => r.status === 'submitted' || r.status === 'reviewing'
      ).length,
      completedRequests: requestCache.filter((r) => r.status === 'completed').length,
      totalServices: serviceCache.length,
    };
  },

  async fetchMetrics(): Promise<AdminDashboardMetrics> {
    try {
      return await apiFetch<AdminDashboardMetrics>('/admin/dashboard/metrics');
    } catch {
      return this.getMetrics();
    }
  },
};

// ============================================================
// Auth Store
// ============================================================
export const authStore = {
  currentUser: null as AdminUser | null,
  isAuthenticated: false,
  isInitialized: false,

  async login(email: string, password: string): Promise<AdminUser> {
    const res = await apiFetch<{ userId: number | string; email: string; role?: string; status?: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    const user: AdminUser = {
      userId: res.userId,
      email: res.email,
      role: res.role || 'admin',
      status: res.status || 'active',
    };

    authStore.isAuthenticated = true;
    authStore.currentUser = user;
    authStore.isInitialized = true;
    return user;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } finally {
      authStore.isAuthenticated = false;
      authStore.currentUser = null;
      authStore.isInitialized = true;
    }
  },

  async bootstrap(email: string, password: string): Promise<AdminUser> {
    const res = await apiFetch<{ userId: number | string; email: string; role?: string; status?: string }>(
      '/auth/bootstrap',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    const user: AdminUser = {
      userId: res.userId,
      email: res.email,
      role: res.role || 'admin',
      status: res.status || 'active',
    };

    authStore.isAuthenticated = true;
    authStore.currentUser = user;
    authStore.isInitialized = true;
    return user;
  },

  async me(): Promise<AdminUser | null> {
    try {
      const res = await apiFetch<AdminUser>('/auth/me');
      authStore.isAuthenticated = true;
      authStore.currentUser = res;
      authStore.isInitialized = true;
      return res;
    } catch {
      authStore.isAuthenticated = false;
      authStore.currentUser = null;
      authStore.isInitialized = true;
      return null;
    }
  },
};

// ============================================================
// Mock Store (Backward Compatibility helper)
// ============================================================
export const mockStore = {
  tools: toolCache,
  projects: projectCache,
  services: serviceCache,
  categories: categoryCache,
  getTools: () => toolCache,
  saveTool: (t: Tool) => ToolAdminService.save(t),
  getProjects: () => projectCache,
  saveProject: (p: Project) => ProjectAdminService.save(p),
  getServices: () => serviceCache,
  saveService: (s: Service) => ServiceAdminService.save(s),
  getCategories: () => categoryCache,
  saveCategory: (c: AdminCategory) => CategoryAdminService.save(c),
  getRequests: () => requestCache,
  saveRequest: (r: AdminRequest) => {
    const idx = requestCache.findIndex((x) => x.requestId === r.requestId);
    if (idx >= 0) requestCache[idx] = r;
    else requestCache.push(r);
  },
};
