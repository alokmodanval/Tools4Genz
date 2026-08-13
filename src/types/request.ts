export type RequestType =
  | 'student-project'
  | 'client-website'
  | 'client-software'
  | 'client-ai'
  | 'client-business'
  | 'custom-request';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'reviewing'
  | 'contacted'
  | 'quoted'
  | 'approved'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export type PreferredContactMethod = 'email' | 'phone' | 'whatsapp';

export interface AttachmentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface BaseRequestData {
  id?: string;
  requestType: RequestType;
  status?: RequestStatus;
  createdAt?: string;
  updatedAt?: string;

  // Contact
  name: string;
  email: string;
  phone: string;
  preferredContactMethod?: PreferredContactMethod;

  // Project Details
  projectType: string;
  description: string;
  titleOrIdea?: string;
  technology?: string;

  // Budget & Timeline
  budget: string;
  deadline: string;
  additionalDetails?: string;
  additionalRequirements?: string;

  // Academic / Student optional fields
  course?: string;
  branch?: string;
  academicYear?: string;
  collegeName?: string;
  teamSize?: string;

  // Business / Client optional fields
  company?: string;
  companyName?: string;
  websiteUrl?: string;
  referenceWebsite?: string;
  existingSystem?: string;
  businessDescription?: string;
  requirements?: string;
  budgetRange?: string;

  // Attachments
  attachments?: AttachmentMetadata[];
}

export interface StudentRequestData extends BaseRequestData {
  requestType: 'student-project';
  course: string;
  branch: string;
}

export interface ClientRequestData extends BaseRequestData {
  requestType: 'client-website' | 'client-software' | 'client-ai' | 'client-business' | 'custom-request';
}

export type StudentRequest = StudentRequestData;
export type ClientRequest = ClientRequestData;

export interface RequestSubmissionResult {
  success: boolean;
  requestId: string;
  message: string;
  timestamp: string;
}
