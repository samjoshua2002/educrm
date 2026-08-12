import { FormField } from "@/types/form";
import { INDIAN_STATES } from "@/lib/locations";

/** Stable IDs used in submissions and lead ingestion (location → leads.branch_id, course → leads.course_id). */
export const SYSTEM_FIELD_IDS = [
  "full_name",
  "phone",
  "location",
  "email",
  "course",
  "city",
  "state",
  "country",
] as const;

export type SystemFieldId = (typeof SYSTEM_FIELD_IDS)[number];

export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: "full_name",
    type: "text",
    label: "Full Name",
    placeholder: "Enter your full name...",
    required: false,
    systemField: true,
  },
  {
    id: "phone",
    type: "phone",
    label: "Phone",
    placeholder: "Enter your phone number...",
    required: false,
    systemField: true,
  },
  {
    id: "location",
    type: "select",
    label: "Location",
    placeholder: "Select branch...",
    required: false,
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
  {
    id: "course",
    type: "select",
    label: "Course",
    placeholder: "Select course...",
    required: false,
    systemField: true,
    options: [],
  },
  {
    id: "city",
    type: "text",
    label: "City",
    placeholder: "Enter your city...",
    required: false,
    systemField: true,
  },
  {
    id: "state",
    type: "select",
    label: "State",
    placeholder: "Select your state...",
    required: false,
    systemField: true,
    options: INDIAN_STATES.map((name) => ({ id: name, label: name })),
  },
  {
    id: "country",
    type: "text",
    label: "Country",
    placeholder: "Enter your country...",
    required: false,
    systemField: true,
    defaultValue: "India",
  },
];

const RESERVED_LABELS = new Set([
  "full name",
  "phone",
  "location",
  "email",
  "course",
  "city",
  "state",
  "country",
]);

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

/**
 * Like ensureDefaultFormFields, but only reconciles system fields already present
 * in `fields` against their latest DEFAULT_FORM_FIELDS definition (options, type, etc.).
 * Unlike ensureDefaultFormFields, it never injects system fields that are missing —
 * system fields are opt-in via the form builder's "System Fields" panel.
 */
export function reconcileSystemFieldOverrides(fields: FormField[]): FormField[] {
  return (fields || []).map((f) => {
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
}
