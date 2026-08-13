/**
 * Cloudflare Worker request domain types.
 *
 * These mirror the public API contract — NOT the D1 row model.
 * The D1 schema is defined separately in db/schema.ts.
 */

export type RequestType =
  | 'student-project'
  | 'client-website'
  | 'client-software'
  | 'client-ai'
  | 'client-business'
  | 'custom-request';

export type RequestStatus = 'submitted';

export type PreferredContactMethod = 'email' | 'phone' | 'whatsapp';

/**
 * Validation-safe inbound payload from the frontend.
 * The server never trusts the client's `id`, `status`, `requestId`,
 * `createdAt`, or `updatedAt` — those are always generated server-side.
 */
export interface CreateRequestInput {
  requestType: RequestType;
  name: string;
  email: string;
  phone?: string;
  preferredContactMethod?: PreferredContactMethod;

  projectType: string;
  technology?: string;
  titleOrIdea?: string;
  description: string;

  budget?: string;
  deadline?: string;
  additionalDetails?: string;
  additionalRequirements?: string;

  // Student-specific
  course?: string;
  branch?: string;
  academicYear?: string;
  collegeName?: string;

  // Client-specific
  company?: string;
  websiteUrl?: string;
  referenceWebsite?: string;
  existingSystem?: string;
  businessDescription?: string;
  requirements?: string;
}

/**
 * Safe public status response returned by GET /api/requests/:requestId.
 * Never includes private contact/academic/business details.
 */
export interface PublicRequestStatus {
  success: true;
  data: {
    requestId: string;
    status: RequestStatus;
    createdAt: string;
  };
}