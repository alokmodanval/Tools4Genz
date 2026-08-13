import { Tool } from '@/types/tool';
import { Project } from '@/types/project';
import { Service } from '@/types/service';
import { BaseRequestData, RequestStatus } from '@/types/request';
import { toolRegistry } from '@/tools/registry';
import { projects as initialProjects } from '@/data/projects';
import { services as initialServices } from '@/data/services';
import { toolCategories as initialToolCategories, projectCategories as initialProjectCategories } from '@/data/categories';

// Local storage or sessionStorage keys for local mockup persistence
const STORAGE_KEYS = {
  TOOLS: 'tools4genz_admin_mock_tools',
  PROJECTS: 'tools4genz_admin_mock_projects',
  SERVICES: 'tools4genz_admin_mock_services',
  CATEGORIES: 'tools4genz_admin_mock_categories',
  REQUESTS: 'tools4genz_admin_mock_requests',
};

export interface AdminRequest extends BaseRequestData {
  requestId: string;
  status: RequestStatus;
  createdAt: string;
}

// Seed mock requests
const SEED_REQUESTS: AdminRequest[] = [
  {
    requestId: 'TG-REQ-54EF6A20',
    requestType: 'student-project',
    status: 'submitted',
    name: 'Alok Kumar',
    email: 'alok@student.dev',
    phone: '+91 98765 43210',
    preferredContactMethod: 'whatsapp',
    projectType: 'Final Year Project',
    technology: 'Python, ML',
    description: 'A comprehensive review and recommendation system using collaborative filtering.',
    budget: '₹3,000–₹5,000',
    deadline: '2026-10-15',
    createdAt: '2026-08-13T04:05:48.538Z',
  },
  {
    requestId: 'TG-REQ-6AD87AF7',
    requestType: 'client-website',
    status: 'reviewing',
    name: 'John Doe',
    email: 'john@doe-corp.com',
    phone: '+1 555 123 4567',
    preferredContactMethod: 'email',
    projectType: 'Business Website',
    technology: 'React, Tailwind, Cloudflare Pages',
    description: 'We need a highly responsive portfolio and pricing calculator website for our logistics firm.',
    budget: '₹25,000–₹50,000',
    deadline: '2026-09-01',
    createdAt: '2026-08-13T04:31:03.768Z',
  }
];

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

class AdminDataStore {
  private load<T>(key: string, defaultValue: T): T {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private save<T>(key: string, data: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // sessionStorage may be unavailable (private mode / quota exceeded)
    }
  }

  getTools(): Tool[] {
    const list = this.load<Tool[]>(STORAGE_KEYS.TOOLS, []);
    if (list.length === 0) {
      // Seed on first load
      const stripped = toolRegistry.map(t => {
        // Exclude lazy component to keep sessionStorage clean
        const rest = { ...t };
        delete rest.component;
        return rest as Tool;
      });
      this.save(STORAGE_KEYS.TOOLS, stripped);
      return stripped;
    }
    return list;
  }

  saveTool(tool: Tool): void {
    const tools = this.getTools();
    const idx = tools.findIndex(t => t.id === tool.id);
    if (idx >= 0) {
      tools[idx] = tool;
    } else {
      tools.push(tool);
    }
    this.save(STORAGE_KEYS.TOOLS, tools);
  }

  getProjects(): Project[] {
    const list = this.load<Project[]>(STORAGE_KEYS.PROJECTS, []);
    if (list.length === 0) {
      this.save(STORAGE_KEYS.PROJECTS, initialProjects);
      return initialProjects;
    }
    return list;
  }

  saveProject(project: Project): void {
    const list = this.getProjects();
    const idx = list.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      list[idx] = project;
    } else {
      list.push(project);
    }
    this.save(STORAGE_KEYS.PROJECTS, list);
  }

  getServices(): Service[] {
    const list = this.load<Service[]>(STORAGE_KEYS.SERVICES, []);
    if (list.length === 0) {
      this.save(STORAGE_KEYS.SERVICES, initialServices);
      return initialServices;
    }
    return list;
  }

  saveService(service: Service): void {
    const list = this.getServices();
    const idx = list.findIndex(s => s.id === service.id);
    if (idx >= 0) {
      list[idx] = service;
    } else {
      list.push(service);
    }
    this.save(STORAGE_KEYS.SERVICES, list);
  }

  getCategories(): AdminCategory[] {
    const list = this.load<AdminCategory[]>(STORAGE_KEYS.CATEGORIES, []);
    if (list.length === 0) {
      const toolCats: AdminCategory[] = initialToolCategories.map(c => ({
        type: 'tool',
        id: c.id,
        name: c.name,
        icon: c.icon,
        count: c.count
      }));
      const projCats: AdminCategory[] = initialProjectCategories.map(c => ({
        type: 'project',
        id: c.id,
        name: c.name,
        icon: c.icon,
        count: c.count
      }));
      const serviceCats: AdminCategory[] = [
        { type: 'service', id: 'Development', name: 'Development', icon: '💻', count: 2 },
        { type: 'service', id: 'Enterprise', name: 'Enterprise', icon: '⚙️', count: 1 },
        { type: 'service', id: 'AI/ML', name: 'AI/ML', icon: '🧠', count: 1 },
        { type: 'service', id: 'Education', name: 'Education', icon: '🎓', count: 1 },
        { type: 'service', id: 'Consulting', name: 'Consulting', icon: '📈', count: 1 },
      ];
      const merged = [...toolCats, ...projCats, ...serviceCats];
      this.save(STORAGE_KEYS.CATEGORIES, merged);
      return merged;
    }
    return list;
  }

  saveCategory(cat: AdminCategory): void {
    const list = this.getCategories();
    const idx = list.findIndex(c => c.id === cat.id && c.type === cat.type);
    if (idx >= 0) {
      list[idx] = cat;
    } else {
      list.push(cat);
    }
    this.save(STORAGE_KEYS.CATEGORIES, list);
  }

  getRequests(): AdminRequest[] {
    const list = this.load<AdminRequest[]>(STORAGE_KEYS.REQUESTS, []);
    if (list.length === 0) {
      this.save(STORAGE_KEYS.REQUESTS, SEED_REQUESTS);
      return SEED_REQUESTS;
    }
    return list;
  }

  saveRequest(request: AdminRequest): void {
    const list = this.getRequests();
    const idx = list.findIndex(r => r.requestId === request.requestId);
    if (idx >= 0) {
      list[idx] = request;
    } else {
      list.push(request);
    }
    this.save(STORAGE_KEYS.REQUESTS, list);
  }
}

export const adminStore = new AdminDataStore();

export const ToolAdminService = {
  getAll: (): Tool[] => adminStore.getTools(),
  save: (tool: Tool): void => adminStore.saveTool(tool),
  delete: (id: string): void => {
    const list = adminStore.getTools().filter(t => t.id !== id);
    sessionStorage.setItem(STORAGE_KEYS.TOOLS, JSON.stringify(list));
  }
};

export const ProjectAdminService = {
  getAll: (): Project[] => adminStore.getProjects(),
  save: (proj: Project): void => adminStore.saveProject(proj),
  delete: (id: string): void => {
    const list = adminStore.getProjects().filter(p => p.id !== id);
    sessionStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(list));
  }
};

export const ServiceAdminService = {
  getAll: (): Service[] => adminStore.getServices(),
  save: (svc: Service): void => adminStore.saveService(svc),
  delete: (id: string): void => {
    const list = adminStore.getServices().filter(s => s.id !== id);
    sessionStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
  }
};

export const CategoryAdminService = {
  getAll: (): AdminCategory[] => adminStore.getCategories(),
  save: (cat: AdminCategory): void => adminStore.saveCategory(cat),
  delete: (id: string, type: 'tool' | 'project' | 'service'): void => {
    const list = adminStore.getCategories().filter(c => !(c.id === id && c.type === type));
    sessionStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(list));
  }
};

export const RequestAdminService = {
  getAll: (): AdminRequest[] => adminStore.getRequests(),
  getById: (requestId: string): AdminRequest | undefined => adminStore.getRequests().find(r => r.requestId === requestId),
  save: (req: AdminRequest): void => adminStore.saveRequest(req),
  updateStatus: (requestId: string, status: RequestStatus): void => {
    const list = adminStore.getRequests();
    const idx = list.findIndex(r => r.requestId === requestId);
    if (idx >= 0) {
      list[idx].status = status;
      sessionStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));
    }
  }
};

export const AdminDashboardService = {
  getMetrics: (): AdminDashboardMetrics => {
    const tools = ToolAdminService.getAll();
    const projs = ProjectAdminService.getAll();
    const reqs = RequestAdminService.getAll();
    const svcs = ServiceAdminService.getAll();

    return {
      totalTools: tools.length,
      activeTools: tools.filter(t => t.status === 'active').length,
      totalProjects: projs.length,
      featuredProjects: projs.filter(p => p.featured).length,
      pendingRequests: reqs.filter(r => r.status === 'submitted' || r.status === 'reviewing').length,
      completedRequests: reqs.filter(r => r.status === 'completed').length,
      totalServices: svcs.length,
    };
  }
};
