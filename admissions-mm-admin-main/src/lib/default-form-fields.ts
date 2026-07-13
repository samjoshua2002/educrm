import { FormField } from "@/types/form";

/** Stable IDs used in submissions and lead ingestion (location → leads.branch_id). */
export const SYSTEM_FIELD_IDS = [
  "full_name",
  "phone",
  "location",
  "email",
] as const;

export type SystemFieldId = (typeof SYSTEM_FIELD_IDS)[number];

export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: "full_name",
    type: "text",
    label: "Full Name",
    placeholder: "Enter your full name...",
    required: true,
    systemField: true,
  },
  {
    id: "phone",
    type: "phone",
    label: "Phone",
    placeholder: "Enter your phone number...",
    required: true,
    systemField: true,
  },
  {
    id: "location",
    type: "select",
    label: "Location",
    placeholder: "Select branch...",
    required: true,
    systemField: true,
    options: [],
  },
  {
    id: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email address...",
    required: true,
    systemField: true,
  },
];

const RESERVED_LABELS = new Set(["full name", "phone", "location", "email"]);

export function isSystemField(field: Pick<FormField, "id" | "label">): boolean {
  return SYSTEM_FIELD_IDS.includes(field.id as SystemFieldId);
}

export function ensureDefaultFormFields(fields: FormField[]): FormField[] {
  if (!fields || fields.length === 0) {
    return [...DEFAULT_FORM_FIELDS];
  }

  const processedFields = fields.map((f) => {
    if (isSystemField(f)) {
      const defaultField = DEFAULT_FORM_FIELDS.find((df) => df.id === f.id);
      return {
        ...defaultField,
        ...f,
        systemField: true,
      };
    }
    return f;
  });

  const missingSystemFields = DEFAULT_FORM_FIELDS.filter(
    (df) => !processedFields.some((pf) => pf.id === df.id)
  );

  return [...processedFields, ...missingSystemFields];
}
