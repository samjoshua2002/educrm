export type FieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'date'
  | 'select' | 'checkbox' | 'radio' | 'file' | 'payment'
  | 'textarea';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { id: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    regex?: string;
  };
  systemField?: boolean;
}

export interface Form {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'expired';
  campaignId?: string | null;
  fields: FormField[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  fields: FormField[];
}

export interface FormResponse {
  id: string;
  formId: string;
  data: Record<string, any>; // key = fieldId
  status: 'verified' | 'pending' | 'rejected';
  isDuplicate: boolean;
  submittedAt: string;
  utmData?: Record<string, string>;
  source?: string;
}

// Input DTOs
export interface CreateFormInput {
  name: string;
  slug?: string;
  campaignId?: string;
}

export interface UpdateFormInput {
  name?: string;
  slug?: string;
  fields?: FormField[];
  status?: 'draft' | 'active' | 'expired';
}

export interface SubmitFormInput {
  data: Record<string, any>;
  utmData?: Record<string, string>;
  source?: string;
}
