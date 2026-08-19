import { BaseRequestData, RequestSubmissionResult } from '@/types/request';
import { API_BASE_URL } from '@/config/api';

/**
 * Submit a student or client request via the Cloudflare Worker API.
 *
 * Phase 4 behavior: simulated async processing with mock TG-REQ- ID.
 * Phase 5 behavior: real HTTP fetch to Worker → D1.
 *
 * The public API surface (RequestSubmissionResult shape) is unchanged
 * so that the form component does not need refactoring.
 */
export const requestService = {
  /**
   * Submit a student or client request.
   */
  async submitRequest(requestData: BaseRequestData): Promise<RequestSubmissionResult> {
    // In production / against a real Worker, forward the request.
    // When VITE_API_BASE_URL is set to a real Worker domain, the fetch
    // goes directly to that Worker. When it's /api (fallback / dev), the
    // request is proxied by Cloudflare Pages to the Worker defined
    // under the /api route (see wrangler.toml routes config).
    const apiUrl = `${API_BASE_URL}/api/requests`;

    try {
      const body = {
        requestType: requestData.requestType,
        name: requestData.name,
        email: requestData.email,
        phone: requestData.phone ?? '',
        preferredContactMethod: requestData.preferredContactMethod ?? 'email',
        projectType: requestData.projectType || 'student-project',
        technology: requestData.technology ?? '',
        titleOrIdea: requestData.titleOrIdea ?? '',
        description: requestData.description || '',
        budget: requestData.budget ?? '',
        deadline: requestData.deadline ?? '',
        additionalDetails: requestData.additionalDetails ?? '',
        additionalRequirements: requestData.additionalRequirements ?? '',
        // Student-specific fields
        course: requestData.course ?? undefined,
        branch: requestData.branch ?? undefined,
        academicYear: requestData.academicYear ?? undefined,
        collegeName: requestData.collegeName ?? undefined,
        // Client-specific fields
        company: requestData.company ?? undefined,
        websiteUrl: requestData.websiteUrl ?? undefined,
        referenceWebsite: requestData.referenceWebsite ?? undefined,
        existingSystem: requestData.existingSystem ?? undefined,
        businessDescription: requestData.businessDescription ?? undefined,
        requirements: requestData.requirements ?? undefined,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Server returns a validation error — propagate it to the form
      if (!data.success) {
        throw new Error(data.error?.message || 'Request submission failed');
      }

      // Phase 5: real requestId from the backend
      return {
        success: true,
        requestId: data.requestId ?? `TG-REQ-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        message: data.message || `Your ${requestData.requestType} request has been received successfully.`,
        timestamp: data.createdAt || new Date().toISOString(),
      };
    } catch (err) {
      // Network / timeout / 400 / 500 — surface a friendly error
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.';

      return {
        success: false,
        requestId: '',
        message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Local draft persistence helper
   */
  saveDraft<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`tools4genz_draft_${key}`, JSON.stringify(data));
    } catch {
      // Ignore storage quota or disabled storage errors
    }
  },

  /**
   * Load draft from localStorage
   */
  loadDraft<T>(key: string): T | null {
    try {
      const saved = localStorage.getItem(`tools4genz_draft_${key}`);
      return saved ? (JSON.parse(saved) as T) : null;
    } catch {
      return null;
    }
  },

  /**
   * Clear draft from localStorage
   */
  clearDraft(key: string): void {
    try {
      localStorage.removeItem(`tools4genz_draft_${key}`);
    } catch {
      // Ignore
    }
  },
};

export default requestService;