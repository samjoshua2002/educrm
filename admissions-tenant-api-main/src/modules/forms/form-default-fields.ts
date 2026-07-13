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
  if (!fields || fields.length === 0) {
    return [...DEFAULT_FORM_FIELDS];
  }

  const processedFields = fields.map((f) => {
    if (f && isSystemField(f)) {
      const defaultField = DEFAULT_FORM_FIELDS.find((df) => df.id === f.id);
      return {
        ...defaultField,
        ...f,
        systemField: true,
      };
    }
    return f;
  }).filter(Boolean);

  const missingSystemFields = DEFAULT_FORM_FIELDS.filter(
    (df) => !processedFields.some((pf) => pf && pf.id === df.id)
  );

  return [...processedFields, ...missingSystemFields];
}
