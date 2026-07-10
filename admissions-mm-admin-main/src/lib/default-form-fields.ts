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

/** Ensures all 4 system fields exist first; strips duplicate custom copies, keeping user customizations on system fields. */
export function ensureDefaultFormFields(fields: FormField[]): FormField[] {
  const systemFields = DEFAULT_FORM_FIELDS.map((defaultField) => {
    const existing = (fields ?? []).find((f) => f.id === defaultField.id);
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

  const customFields = (fields ?? []).filter((f) => !isSystemField(f));
  return [...systemFields, ...customFields];
}
