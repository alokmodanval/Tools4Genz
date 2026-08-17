import {
  adminCategoryRepository,
  adminMetricsRepository,
  adminProjectRepository,
  adminServiceRepository,
  adminToolRepository,
  D1Database,
  requestRepository,
} from '../db/repository';
import { error, success } from '../utils/api';

// ============================================================
// Dashboard Metrics
// ============================================================
export async function handleGetAdminMetrics(db: D1Database): Promise<Response> {
  const metrics = await adminMetricsRepository.getMetrics(db);
  return success(metrics);
}

// ============================================================
// Tools Handlers
// ============================================================
export async function handleGetAdminTools(db: D1Database): Promise<Response> {
  const rows = await adminToolRepository.getAll(db);
  const tools = rows.map((r) => {
    try {
      const parsed = JSON.parse(r.data) as Record<string, unknown>;
      return {
        ...parsed,
        id: r.id,
        slug: r.slug || parsed.slug,
        name: r.name || parsed.name,
        category: r.category || parsed.category,
        status: r.status || parsed.status,
        featured: Boolean(r.featured),
      };
    } catch {
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category,
        status: r.status,
        featured: Boolean(r.featured),
        description: '',
      };
    }
  });
  return success(tools);
}

export async function handleSaveAdminTool(
  request: Request,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid tool payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  if (!body.id || !body.name || !body.slug) {
    return error('VALIDATION_ERROR', 'Tool id, slug, and name are required', 400);
  }

  await adminToolRepository.upsert(db, {
    id: String(body.id),
    slug: String(body.slug),
    name: String(body.name),
    category: String(body.category || 'other'),
    status: String(body.status || 'active'),
    featured: body.featured ? 1 : 0,
    data: JSON.stringify(body),
  });

  return success({ saved: true, id: body.id }, 201);
}

export async function handleUpdateAdminTool(
  request: Request,
  id: string,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid tool payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  const toolId = id || (typeof body.id === 'string' ? body.id : '');
  if (!toolId) {
    return error('VALIDATION_ERROR', 'Tool ID is required', 400);
  }

  const existing = await adminToolRepository.getById(db, toolId);
  const existingParsed = existing ? (JSON.parse(existing.data) as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...existingParsed, ...body, id: toolId };

  await adminToolRepository.upsert(db, {
    id: toolId,
    slug: String(merged.slug || toolId),
    name: String(merged.name || toolId),
    category: String(merged.category || 'other'),
    status: String(merged.status || 'active'),
    featured: merged.featured ? 1 : 0,
    data: JSON.stringify(merged),
  });

  return success({ updated: true, id: toolId });
}

export async function handleDeleteAdminTool(
  id: string,
  db: D1Database
): Promise<Response> {
  const deleted = await adminToolRepository.delete(db, id);
  if (!deleted) {
    return error('NOT_FOUND', 'Tool not found', 404);
  }
  return success({ deleted: true, id });
}

// ============================================================
// Projects Handlers
// ============================================================
export async function handleGetAdminProjects(db: D1Database): Promise<Response> {
  const rows = await adminProjectRepository.getAll(db);
  const projects = rows.map((r) => {
    try {
      const parsed = JSON.parse(r.data) as Record<string, unknown>;
      return {
        ...parsed,
        id: r.id,
        slug: r.slug || parsed.slug,
        title: r.title || parsed.title,
        category: r.category || parsed.category,
        status: r.status || parsed.status,
        featured: Boolean(r.featured),
      };
    } catch {
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        category: r.category,
        status: r.status,
        featured: Boolean(r.featured),
      };
    }
  });
  return success(projects);
}

export async function handleSaveAdminProject(
  request: Request,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid project payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  if (!body.id || !body.title || !body.slug) {
    return error('VALIDATION_ERROR', 'Project id, slug, and title are required', 400);
  }

  await adminProjectRepository.upsert(db, {
    id: String(body.id),
    slug: String(body.slug),
    title: String(body.title),
    category: String(body.category || 'General'),
    status: String(body.status || 'available'),
    featured: body.featured ? 1 : 0,
    data: JSON.stringify(body),
  });

  return success({ saved: true, id: body.id }, 201);
}

export async function handleUpdateAdminProject(
  request: Request,
  id: string,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid project payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  const projId = id || (typeof body.id === 'string' ? body.id : '');
  if (!projId) {
    return error('VALIDATION_ERROR', 'Project ID is required', 400);
  }

  const existing = await adminProjectRepository.getById(db, projId);
  const existingParsed = existing ? (JSON.parse(existing.data) as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...existingParsed, ...body, id: projId };

  await adminProjectRepository.upsert(db, {
    id: projId,
    slug: String(merged.slug || projId),
    title: String(merged.title || projId),
    category: String(merged.category || 'General'),
    status: String(merged.status || 'available'),
    featured: merged.featured ? 1 : 0,
    data: JSON.stringify(merged),
  });

  return success({ updated: true, id: projId });
}

export async function handleDeleteAdminProject(
  id: string,
  db: D1Database
): Promise<Response> {
  const deleted = await adminProjectRepository.delete(db, id);
  if (!deleted) {
    return error('NOT_FOUND', 'Project not found', 404);
  }
  return success({ deleted: true, id });
}

// ============================================================
// Services Handlers
// ============================================================
export async function handleGetAdminServices(db: D1Database): Promise<Response> {
  const rows = await adminServiceRepository.getAll(db);
  const services = rows.map((r) => {
    try {
      const parsed = JSON.parse(r.data) as Record<string, unknown>;
      return {
        ...parsed,
        id: r.id,
        title: r.title || parsed.title,
        category: r.category || parsed.category,
      };
    } catch {
      return {
        id: r.id,
        title: r.title,
        category: r.category,
      };
    }
  });
  return success(services);
}

export async function handleSaveAdminService(
  request: Request,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid service payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  if (!body.id || !body.title) {
    return error('VALIDATION_ERROR', 'Service id and title are required', 400);
  }

  await adminServiceRepository.upsert(db, {
    id: String(body.id),
    title: String(body.title),
    category: String(body.category || 'Development'),
    data: JSON.stringify(body),
  });

  return success({ saved: true, id: body.id }, 201);
}

export async function handleUpdateAdminService(
  request: Request,
  id: string,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid service payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  const svcId = id || (typeof body.id === 'string' ? body.id : '');
  if (!svcId) {
    return error('VALIDATION_ERROR', 'Service ID is required', 400);
  }

  const existing = await adminServiceRepository.getById(db, svcId);
  const existingParsed = existing ? (JSON.parse(existing.data) as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...existingParsed, ...body, id: svcId };

  await adminServiceRepository.upsert(db, {
    id: svcId,
    title: String(merged.title || svcId),
    category: String(merged.category || 'Development'),
    data: JSON.stringify(merged),
  });

  return success({ updated: true, id: svcId });
}

export async function handleDeleteAdminService(
  id: string,
  db: D1Database
): Promise<Response> {
  const deleted = await adminServiceRepository.delete(db, id);
  if (!deleted) {
    return error('NOT_FOUND', 'Service not found', 404);
  }
  return success({ deleted: true, id });
}

// ============================================================
// Categories Handlers
// ============================================================
export async function handleGetAdminCategories(db: D1Database): Promise<Response> {
  const rows = await adminCategoryRepository.getAll(db);
  const categories = rows.map((r) => ({
    id: r.id,
    type: r.type as 'tool' | 'project' | 'service',
    name: r.name,
    icon: r.icon || '',
    count: r.count,
  }));
  return success(categories);
}

export async function handleSaveAdminCategory(
  request: Request,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid category payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  if (!body.id || !body.name || !body.type) {
    return error('VALIDATION_ERROR', 'Category id, name, and type are required', 400);
  }

  await adminCategoryRepository.upsert(db, {
    id: String(body.id),
    type: String(body.type),
    name: String(body.name),
    icon: typeof body.icon === 'string' ? body.icon : null,
    count: Number(body.count || 0),
    data: JSON.stringify(body),
  });

  return success({ saved: true, id: body.id, type: body.type }, 201);
}

export async function handleUpdateAdminCategory(
  request: Request,
  id: string,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid category payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  const catId = id || (typeof body.id === 'string' ? body.id : '');
  const type = String(body.type || 'tool');

  await adminCategoryRepository.upsert(db, {
    id: catId,
    type,
    name: String(body.name || catId),
    icon: typeof body.icon === 'string' ? body.icon : null,
    count: Number(body.count || 0),
    data: JSON.stringify(body),
  });

  return success({ updated: true, id: catId });
}

export async function handleDeleteAdminCategory(
  id: string,
  request: Request,
  db: D1Database
): Promise<Response> {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || undefined;
  const deleted = await adminCategoryRepository.delete(db, id, type);
  if (!deleted) {
    return error('NOT_FOUND', 'Category not found', 404);
  }
  return success({ deleted: true, id });
}

// ============================================================
// Requests Handlers (Admin)
// ============================================================
export async function handleGetAdminRequests(db: D1Database): Promise<Response> {
  const rows = await requestRepository.findAllAdmin(db);
  const requests = rows.map((r) => ({
    requestId: r.request_id,
    requestType: r.request_type,
    status: r.status,
    name: r.name,
    email: r.email,
    phone: r.phone,
    preferredContactMethod: r.preferred_contact,
    projectType: r.project_type,
    technology: r.technology,
    titleOrIdea: r.project_title,
    description: r.description,
    budget: r.budget,
    deadline: r.deadline,
    additionalDetails: r.additional_notes,
    course: r.course,
    branch: r.branch,
    academicYear: r.academic_year,
    collegeName: r.college_name,
    company: r.company,
    websiteUrl: r.website_url,
    referenceWebsite: r.reference_website,
    existingSystem: r.existing_system,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return success(requests);
}

export async function handleGetAdminRequestById(
  requestId: string,
  db: D1Database
): Promise<Response> {
  const r = await requestRepository.findByIdAdmin(db, requestId);
  if (!r) {
    return error('NOT_FOUND', 'Request not found', 404);
  }
  return success({
    requestId: r.request_id,
    requestType: r.request_type,
    status: r.status,
    name: r.name,
    email: r.email,
    phone: r.phone,
    preferredContactMethod: r.preferred_contact,
    projectType: r.project_type,
    technology: r.technology,
    titleOrIdea: r.project_title,
    description: r.description,
    budget: r.budget,
    deadline: r.deadline,
    additionalDetails: r.additional_notes,
    course: r.course,
    branch: r.branch,
    academicYear: r.academic_year,
    collegeName: r.college_name,
    company: r.company,
    websiteUrl: r.website_url,
    referenceWebsite: r.reference_website,
    existingSystem: r.existing_system,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

export async function handleUpdateAdminRequestStatus(
  request: Request,
  requestId: string,
  db: D1Database
): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return error('BAD_JSON', 'Invalid JSON body', 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid status payload', 400);
  }

  const body = rawBody as Record<string, unknown>;
  const status = body.status;
  if (!status || typeof status !== 'string') {
    return error('VALIDATION_ERROR', 'Valid status string is required', 400);
  }

  const validStatuses = [
    'draft',
    'submitted',
    'reviewing',
    'contacted',
    'quoted',
    'approved',
    'in-progress',
    'in_progress',
    'completed',
    'cancelled',
    'rejected',
  ];
  if (!validStatuses.includes(status)) {
    return error(
      'VALIDATION_ERROR',
      `Status must be one of: ${validStatuses.join(', ')}`,
      400
    );
  }

  const updated = await requestRepository.updateStatusAdmin(db, requestId, status);
  if (!updated) {
    return error('NOT_FOUND', 'Request not found', 404);
  }

  return success({ updated: true, requestId, status });
}
