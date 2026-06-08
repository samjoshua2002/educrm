import { z } from "zod";

export const OrganizationSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  slug: z.string().min(2, "Unique slug is required"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Valid phone number is required")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .min(5, "Full address is required")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  status: z.string().optional(),
  subscriptionStart: z.coerce.date(),
  subscriptionEnd: z.coerce.date(),
});

export type OrganizationFormValues = z.infer<typeof OrganizationSchema>;
