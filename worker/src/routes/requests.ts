import { D1Database, requestRepository } from '../db/repository';
import { RequestRow } from '../db/schema';
import { CreateRequestInput } from '../types/request';
import { error, success } from '../utils/api';
import { BadJsonError, BodyTooLargeError, readJsonBody } from '../utils/body';
import { generateRequestId } from '../utils/id';
import { normalizeRequestPayload } from '../utils/validation';

/**
 * POST /api/requests
 * Creates a new request. The server generates the request_id, status, and timestamps.
 */
export async function handleCreateRequest(request: Request, db: D1Database): Promise<Response> {
  let rawBody: unknown;

  try {
    rawBody = await readJsonBody(request);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return error('PAYLOAD_TOO_LARGE', 'Request body exceeds the maximum allowed size', 413);
    }
    if (err instanceof BadJsonError) {
      return error('BAD_JSON', 'Request body must be valid JSON', 400);
    }
    throw err;
  }

  const parsed = normalizeRequestPayload(rawBody);
  if (!parsed.ok) {
    return error('VALIDATION_ERROR', parsed.errors.join('; '), 400);
  }

  const data: CreateRequestInput = parsed.data;
  const now = new Date().toISOString();
  const requestId = generateRequestId();

  const row: Omit<RequestRow, 'id'> = {
    request_id: requestId,
    request_type: data.requestType,
    status: 'submitted',
    name: data.name,
    email: data.email,
    phone: data.phone ?? null,
    preferred_contact: data.preferredContactMethod ?? null,
    project_type: data.projectType,
    technology: data.technology ?? null,
    project_title: data.titleOrIdea ?? null,
    description: data.description,
    budget: data.budget ?? null,
    deadline: data.deadline ?? null,
    additional_notes: data.additionalDetails ?? data.additionalRequirements ?? null,
    course: data.course ?? null,
    branch: data.branch ?? null,
    academic_year: data.academicYear ?? null,
    college_name: data.collegeName ?? null,
    company: data.company ?? null,
    website_url: data.websiteUrl ?? null,
    reference_website: data.referenceWebsite ?? null,
    existing_system: data.existingSystem ?? null,
    created_at: now,
    updated_at: now,
  };

  await requestRepository.insert(db, row);

  return success(
    {
      requestId,
      status: 'submitted',
      createdAt: now,
    },
    201
  );
}

/**
 * GET /api/requests/:requestId
 * Returns ONLY safe public status info — never private contact/business/academic data.
 */
export async function handleGetRequestStatus(requestId: string, db: D1Database): Promise<Response> {
  // Reject unexpected characters in the path parameter
  if (!/^[A-Z0-9-]+$/i.test(requestId)) {
    return error('VALIDATION_ERROR', 'Invalid request ID format', 400);
  }

  const row = await requestRepository.findPublicStatus(db, requestId);

  if (!row) {
    return error('NOT_FOUND', 'Request not found', 404);
  }

  return success({
    requestId: row.request_id,
    status: row.status,
    createdAt: row.created_at,
  });
}