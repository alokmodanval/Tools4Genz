import { CreateRequestInput, RequestType } from '../types/request.ts';

export const VALID_REQUEST_TYPES: RequestType[] = [
  'student-project',
  'client-website',
  'client-software',
  'client-ai',
  'client-business',
  'custom-request',
];

export const VALID_CONTACT_METHODS = ['email', 'phone', 'whatsapp'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\s-]{8,15}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_PROJECT_TYPE_LENGTH = 120;
const MAX_GENERIC_LENGTH = 500;

/** Strip control chars and trim; returns '' for null/undefined/non-string. */
/* eslint-disable no-control-regex */
function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  // Remove control characters except common whitespace, then trim
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
/* eslint-enable no-control-regex */
}

/**
 * Validate + sanitize an inbound request payload.
 * Returns either the normalized payload or a list of field errors.
 */
export function normalizeRequestPayload(raw: unknown): { ok: true; data: CreateRequestInput } | { ok: false; errors: string[] } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['Request body must be a JSON object'] };
  }

  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  // --- requestType ---
  const requestType = input.requestType;
  if (!VALID_REQUEST_TYPES.includes(requestType as RequestType)) {
    errors.push('requestType must be one of: student-project, client-website, client-software, client-ai, client-business, custom-request');
  }

  // --- name ---
  const name = cleanString(input.name, MAX_NAME_LENGTH);
  if (!name) errors.push('name is required');

  // --- email ---
  const email = cleanString(input.email, MAX_EMAIL_LENGTH).toLowerCase();
  if (!email) {
    errors.push('email is required');
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('email has an invalid format');
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errors.push('email is too long');
  }

  // --- phone (optional) ---
  const phoneRaw = cleanString(input.phone, 20);
  const phone = phoneRaw || undefined;
  if (phone && !PHONE_REGEX.test(phone)) {
    errors.push('phone has an invalid format');
  }

  // --- preferredContactMethod (optional) ---
  const contactRaw = input.preferredContactMethod;
  const preferredContactMethod =
    contactRaw && VALID_CONTACT_METHODS.includes(contactRaw as string)
      ? (contactRaw as 'email' | 'phone' | 'whatsapp')
      : undefined;
  if (input.preferredContactMethod !== undefined && input.preferredContactMethod !== null && !preferredContactMethod) {
    errors.push('preferredContactMethod must be one of: email, phone, whatsapp');
  }

  // --- projectType ---
  const projectType = cleanString(input.projectType, MAX_PROJECT_TYPE_LENGTH);
  if (!projectType) errors.push('projectType is required');

  // --- description ---
  const description = cleanString(input.description, MAX_DESCRIPTION_LENGTH);
  if (!description) {
    errors.push('description is required');
  } else if (description.length < 15) {
    errors.push('description must be at least 15 characters');
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(`description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  // --- deadline (optional, must be YYYY-MM-DD) ---
  let deadline: string | undefined;
  const deadlineRaw = cleanString(input.deadline, 10);
  if (deadlineRaw) {
    if (!DATE_REGEX.test(deadlineRaw)) {
      errors.push('deadline must be a valid date in YYYY-MM-DD format');
    } else {
      deadline = deadlineRaw;
    }
  }

  // --- optional strings (allowed to be empty) ---
  const technology = cleanString(input.technology, 100) || undefined;
  const titleOrIdea = cleanString(input.titleOrIdea, 200) || undefined;
  const budget = cleanString(input.budget, 100) || undefined;
  const additionalDetails = cleanString(input.additionalDetails, MAX_GENERIC_LENGTH) || undefined;
  const additionalRequirements = cleanString(input.additionalRequirements, MAX_GENERIC_LENGTH) || undefined;
  const course = cleanString(input.course, 100) || undefined;
  const branch = cleanString(input.branch, 100) || undefined;
  const academicYear = cleanString(input.academicYear, 100) || undefined;
  const collegeName = cleanString(input.collegeName, 200) || undefined;
  const company = cleanString(input.company, 200) || undefined;
  const websiteUrl = cleanString(input.websiteUrl, 300) || undefined;
  const referenceWebsite = cleanString(input.referenceWebsite, 300) || undefined;
  const existingSystem = cleanString(input.existingSystem, MAX_GENERIC_LENGTH) || undefined;
  const businessDescription = cleanString(input.businessDescription, MAX_DESCRIPTION_LENGTH) || undefined;
  const requirements = cleanString(input.requirements, MAX_DESCRIPTION_LENGTH) || undefined;

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      requestType: requestType as RequestType,
      name,
      email,
      phone,
      preferredContactMethod,
      projectType,
      technology,
      titleOrIdea,
      description,
      budget,
      deadline,
      additionalDetails,
      additionalRequirements,
      course,
      branch,
      academicYear,
      collegeName,
      company,
      websiteUrl,
      referenceWebsite,
      existingSystem,
      businessDescription,
      requirements,
    },
  };
}