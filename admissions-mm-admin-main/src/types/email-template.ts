export interface EmailTemplate {
  id: string;
  organizationId?: string | null;
  name: string;
  category: string;
  categoryId?: string | null;
  channel: "Email" | "SMS" | "WhatsApp";
  subject: string;
  body: string;
  footer?: string | null;
  description?: string | null;
  variables: string[];
  status: "active" | "draft";
  isDefault?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmailTemplateInput {
  name: string;
  category: string;
  categoryId?: string;
  channel?: "Email" | "SMS" | "WhatsApp";
  subject: string;
  body: string;
  footer?: string;
  description?: string;
  variables?: string[];
  status?: "active" | "draft";
  isDefault?: boolean;
}

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput>;
