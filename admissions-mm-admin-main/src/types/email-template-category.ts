export interface EmailTemplateVariable {
  id: string;
  categoryId: string;
  key: string;
  tag: string;
  label: string;
  description?: string | null;
  sampleValue?: string | null;
  sourceField?: string | null;
}

export interface EmailTemplateCategory {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  variables: EmailTemplateVariable[];
}

export interface CreateCategoryVariableInput {
  key: string;
  tag: string;
  label: string;
  description?: string;
  sampleValue?: string;
  sourceField?: string;
}
