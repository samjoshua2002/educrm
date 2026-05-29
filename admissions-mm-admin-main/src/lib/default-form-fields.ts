import { FormField } from "@/types/form";

/** Stable IDs used in submissions and lead ingestion (location → leads.branch_id). */
export const SYSTEM_FIELD_IDS = ["full_name", "phone", "location", "email"] as const;

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
    required: false,
    systemField: true,
  },
];

const RESERVED_LABELS = new Set(["full name", "phone", "location", "email"]);

export function isSystemField(field: Pick<FormField, "id" | "label">): boolean {
  return (
    SYSTEM_FIELD_IDS.includes(field.id as SystemFieldId) ||
    RESERVED_LABELS.has(field.label?.toLowerCase() ?? "")
  );
}

/** Ensures all 4 system fields exist first; strips duplicate custom copies. */
export function ensureDefaultFormFields(fields: FormField[]): FormField[] {
  const customFields = (fields ?? []).filter((f) => !isSystemField(f));
  return [...DEFAULT_FORM_FIELDS, ...customFields];
}
