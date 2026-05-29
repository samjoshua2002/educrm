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
    required: false,
    systemField: true,
  },
];

export function isSystemField(field: { id?: string; label?: string }): boolean {
  return (
    SYSTEM_FIELD_IDS.includes(field.id as (typeof SYSTEM_FIELD_IDS)[number]) ||
    RESERVED_LABELS.has(field.label?.toLowerCase() ?? '')
  );
}

export function mergeDefaultFormFields(fields: unknown[]): typeof DEFAULT_FORM_FIELDS {
  const custom = (fields ?? []).filter((f: { id?: string; label?: string }) => !isSystemField(f));
  return [...DEFAULT_FORM_FIELDS, ...(custom as typeof DEFAULT_FORM_FIELDS)];
}
