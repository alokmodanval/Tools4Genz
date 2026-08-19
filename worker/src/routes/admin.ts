import {
  adminCategoryRepository,
  adminMetricsRepository,
  adminProjectRepository,
  adminServiceRepository,
  adminToolRepository,
  D1Database,
  projectReleaseRepository,
  requestRepository,
} from '../db/repository';
import { findAuthoritativeProject } from '../data/projects';
import { resolveAssetStorage, StorageBindings } from '../services/assetStorage';
import {
  MAX_PROJECT_RELEASE_BYTES,
  saveProjectRelease,
} from '../services/projectReleases';
import { error, success } from '../utils/api';
import { validateAdminToolPayload } from './platform';

export type AdminAssetEnv = StorageBindings;

function safeRelease(release: Awaited<ReturnType<typeof projectReleaseRepository.findById>>) {
  if (!release) return null;
  return {
    id: release.id,
    projectId: release.project_id,
    version: release.version,
    filename: release.filename,
    contentType: release.content_type,
    fileSize: release.file_size,
    sha256: release.sha256,
    status: release.status,
    createdAt: release.created_at,
    updatedAt: release.updated_at,
    publishedAt: release.published_at,
  };
}

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
  const validationError = await validateAdminToolPayload(db, body);
  if (validationError) return validationError;

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
  const validationError = await validateAdminToolPayload(db, merged, toolId);
  if (validationError) return validationError;

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
  const existing = await adminToolRepository.getById(db, id);
  if (!existing) {
    return error('NOT_FOUND', 'Tool not found', 404);
  }
  let data: Record<string, unknown> = {}; try { data = JSON.parse(existing.data); } catch { /* safe fallback */ }
  data.status = 'disabled';
  await adminToolRepository.upsert(db, { id: existing.id, slug: existing.slug, name: existing.name, category: existing.category, status: 'disabled', featured: 0, data: JSON.stringify(data) });
  return success({ archived: true, id });
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
// Project Release / Private Asset Handlers (Phase 10)
// ============================================================
export async function handleGetProjectReleases(
  projectId: string,
  db: D1Database
): Promise<Response> {
  const project =
    (await adminProjectRepository.getById(db, projectId)) || findAuthoritativeProject(projectId);
  if (!project) return error('NOT_FOUND', 'Project not found', 404);
  const releases = await projectReleaseRepository.listByProjectId(db, projectId);
  return success(releases.map((release) => safeRelease(release)));
}

export async function handleUploadProjectRelease(
  request: Request,
  projectId: string,
  db: D1Database,
  env: AdminAssetEnv
): Promise<Response> {
  const project =
    (await adminProjectRepository.getById(db, projectId)) || findAuthoritativeProject(projectId);
  if (!project) return error('NOT_FOUND', 'Project not found', 404);
  if (!env.PROJECT_ASSETS) {
    return error('STORAGE_NOT_CONFIGURED', 'Private KV project storage is not configured', 503);
  }

  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_PROJECT_RELEASE_BYTES + 1024 * 1024) {
    return error('FILE_TOO_LARGE', 'Project ZIP exceeds the 24 MiB upload limit', 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error('VALIDATION_ERROR', 'Expected multipart project release upload', 400);
  }

  const version = String(form.get('version') || '').trim();
  const file = form.get('file');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,31}$/.test(version)) {
    return error('VALIDATION_ERROR', 'Version must use 1-32 letters, numbers, dots, dashes, or underscores', 400);
  }
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return error('VALIDATION_ERROR', 'A ZIP file is required', 400);
  }

  const filename = file.name.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._ -]/g, '-');
  const allowedTypes = new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ]);
  if (!filename.toLowerCase().endsWith('.zip') || (file.type && !allowedTypes.has(file.type))) {
    return error('UNSAFE_FILE_TYPE', 'Only ZIP project releases are allowed', 415);
  }
  if (file.size <= 0 || file.size > MAX_PROJECT_RELEASE_BYTES) {
    return error('FILE_TOO_LARGE', 'Project ZIP must be between 1 byte and 24 MiB', 413);
  }

  const bytes = await file.arrayBuffer();
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature.length < 2 || signature[0] !== 0x50 || signature[1] !== 0x4b) {
    return error('UNSAFE_FILE_TYPE', 'Uploaded file is not a valid ZIP container', 415);
  }

  try {
    const release = await saveProjectRelease(db, env, {
      projectId,
      version,
      filename,
      contentType: file.type || 'application/zip',
      bytes,
    });
    if (!release) return error('INTERNAL_ERROR', 'Release could not be saved', 500);
    return success(safeRelease(release), 201);
  } catch {
    console.error(`[ProjectRelease] Upload failed for project ${projectId}`);
    return error('STORAGE_ERROR', 'Project release upload failed', 502);
  }
}

export async function handlePublishProjectRelease(
  projectId: string,
  releaseId: number,
  db: D1Database,
  env: AdminAssetEnv
): Promise<Response> {
  const release = await projectReleaseRepository.findById(db, releaseId);
  if (!release || release.project_id !== projectId) {
    return error('NOT_FOUND', 'Project release not found', 404);
  }
  const provider = release.storage_provider === 'kv' ? 'kv' : 'r2';
  const storage = resolveAssetStorage(env, provider);
  if (!storage) {
    return error('STORAGE_NOT_CONFIGURED', `Private ${provider.toUpperCase()} project storage is not configured`, 503);
  }
  if (!(await storage.exists(release.r2_key))) {
    return error('RELEASE_OBJECT_MISSING', 'Release ZIP is missing from private storage', 409);
  }
  const published = await projectReleaseRepository.publish(db, release);
  return success(safeRelease(published));
}

export async function handleArchiveProjectRelease(
  projectId: string,
  releaseId: number,
  db: D1Database
): Promise<Response> {
  const release = await projectReleaseRepository.findById(db, releaseId);
  if (!release || release.project_id !== projectId) {
    return error('NOT_FOUND', 'Project release not found', 404);
  }
  await projectReleaseRepository.archive(db, releaseId);
  return success({ archived: true, releaseId });
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
