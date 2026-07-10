/** System field IDs — location value is stored as leads.branch_id on submit. */
export const SYSTEM_FIELD_IDS = ['full_name', 'phone', 'location', 'email'] as const;

const RESERVED_LABELS = new Set(['full name', 'phone', 'location', 'email']);

export const DEFAULT_FORM_FIELDS = [
  {
    id: 'full_name',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Enter your full name...',
    required: true,
    systemField: true,
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Phone',
    placeholder: 'Enter your phone number...',
    required: true,
    systemField: true,
  },
  {
    id: 'location',
    type: 'select',
    label: 'Location',
    placeholder: 'Select branch...',
    required: true,
    systemField: true,
    options: [],
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email address...',
    required: true,
    systemField: true,
  },
];

export function isSystemField(field: { id?: string; label?: string }): boolean {
  return !!field.id && SYSTEM_FIELD_IDS.includes(field.id as (typeof SYSTEM_FIELD_IDS)[number]);
}

export function mergeDefaultFormFields(fields: any[]): any[] {
  const systemFields = DEFAULT_FORM_FIELDS.map((defaultField) => {
    const existing = (fields ?? []).find((f) => f && f.id === defaultField.id);
    if (existing) {
      return {
        ...defaultField,
        ...existing,
        systemField: true,
        id: defaultField.id,
      };
    }
    return defaultField;
  });

  const customFields = (fields ?? []).filter((f) => f && !isSystemField(f));
  return [...systemFields, ...customFields];
}
