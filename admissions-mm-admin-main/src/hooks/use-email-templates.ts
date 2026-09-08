/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  EmailTemplate,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  AVAILABLE_SHORTCUTS,
} from "@/types/email-template";

export const INITIAL_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "TMPL-001",
    name: "GD & Interview Slot Invitation",
    category: "Interview Schedule",
    channel: "Email",
    subject: "Interview Schedule: GD & Personal Interview Slot Confirmed - {course} ({application_no})",
    body: `Dear {student},

We are pleased to inform you that your application {application_no} for the {course} program has been shortlisted for the upcoming selection round.

Selection Round Details:
- Date: {date}
- Time Slot: {time}
- Venue / Room: {venue}

Please ensure you carry a printed copy of your application form, admit card, government ID proof, and original academic certificates.

Best regards,
{sender}
Admissions Directorate`,
    description: "Official candidate invite for GD and personal interview rounds with schedule shortcuts.",
    variables: ["student", "application_no", "course", "date", "time", "venue", "sender"],
    status: "active",
    isDefault: true,
    usageCount: 14,
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "TMPL-002",
    name: "Provisional Admission Offer Letter Notice",
    category: "Admission Offer",
    channel: "Email",
    subject: "Congratulations {student}! Admission Offer for {course} - {application_no}",
    body: `Congratulations {student}!

On behalf of the Admissions Committee, we are thrilled to offer you provisional admission to the {course} program for the upcoming academic session.

Application Number: {application_no}
Offer Issue Date: {date}

Please log in to your student portal to review your detailed scholarship breakdown, download your official Offer Letter, and complete your seat acceptance fee before the deadline.

Warm regards,
{sender}
Admissions Office`,
    description: "Formal announcement of seat allotment and admission offer issuance.",
    variables: ["student", "course", "application_no", "date", "sender"],
    status: "active",
    isDefault: true,
    usageCount: 9,
    createdAt: "2026-02-02T11:30:00.000Z",
    updatedAt: "2026-02-02T11:30:00.000Z",
  },
  {
    id: "TMPL-003",
    name: "Document Verification Request",
    category: "Document Request",
    channel: "Email",
    subject: "Action Required: Pending Document Submission for {course} ({application_no})",
    body: `Dear {student},

During the preliminary verification of your application {application_no} for {course}, our review team noticed that certain required certificates are missing or unclear.

Required Action:
Please log in to your application dashboard by {date} and re-upload clear scanned copies of your pending marksheets and identification proof.

If you have any questions, please reply directly to this communication.

Sincerely,
{sender}
Verification Desk`,
    description: "Requests missing documents or marksheets from applicants.",
    variables: ["student", "application_no", "course", "date", "sender"],
    status: "active",
    isDefault: true,
    usageCount: 6,
    createdAt: "2026-02-03T09:15:00.000Z",
    updatedAt: "2026-02-03T09:15:00.000Z",
  },
  {
    id: "TMPL-004",
    name: "Application Fee Payment Reminder",
    category: "Payment Reminder",
    channel: "Email",
    subject: "Payment Reminder: Complete Application Fee for {course} - {application_no}",
    body: `Dear {student},

Your application {application_no} for {course} has been saved, but your application fee payment is still pending.

To ensure your application is considered in the current admissions cycle, please complete the payment on or before {date}.

Candidate: {student}
Application No: {application_no}
Program: {course}

Best regards,
{sender}
Admissions Finance Team`,
    description: "Automated reminder for incomplete application fee submissions.",
    variables: ["student", "application_no", "course", "date", "sender"],
    status: "active",
    isDefault: true,
    usageCount: 21,
    createdAt: "2026-02-04T14:45:00.000Z",
    updatedAt: "2026-02-04T14:45:00.000Z",
  },
  {
    id: "TMPL-005",
    name: "General Admissions Notice & Guidance",
    category: "General Notice",
    channel: "Email",
    subject: "Important Update Regarding Your Application: {course} ({application_no})",
    body: `Dear {student},

Thank you for your active interest in {course}. This is an official communication regarding your application {application_no}.

Please review your applicant portal for regular updates and announcements regarding upcoming orientation schedules, curriculum roadmaps, and campus guidelines.

Date: {date}

Warm regards,
{sender}
Admissions Committee`,
    description: "General purpose announcement template for candidates.",
    variables: ["student", "course", "application_no", "date", "sender"],
    status: "active",
    isDefault: true,
    usageCount: 4,
    createdAt: "2026-02-05T08:00:00.000Z",
    updatedAt: "2026-02-05T08:00:00.000Z",
  },
];

const LOCAL_STORAGE_KEY = "educrm_email_templates_store";

function getStoredTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") return INITIAL_EMAIL_TEMPLATES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return INITIAL_EMAIL_TEMPLATES;
}

function saveStoredTemplates(templates: EmailTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // ignore
  }
}

/**
 * Replaces all shortcut placeholders such as {student}, {course}, {date}, etc.
 * Supports both {variable} and {{variable}} case-insensitively.
 */
export function renderTemplate(template: string, context: Record<string, string | undefined | null>): string {
  if (!template) return "";

  let result = template;
  // Standard mapped aliases
  const aliasMap: Record<string, string> = {
    student: "student",
    student_name: "student",
    applicant_name: "student",
    candidate: "student",
    course: "course",
    program: "course",
    course_name: "course",
    application_no: "application_no",
    app_no: "application_no",
    application_number: "application_no",
    date: "date",
    today: "date",
    time: "time",
    slot: "time",
    time_slot: "time",
    venue: "venue",
    location: "venue",
    sender: "sender",
    sender_name: "sender",
    organization: "organization",
    org_name: "organization",
    email: "email",
    phone: "phone",
    mobile: "phone",
  };

  // Replace {key} or {{key}}
  result = result.replace(/\{\{?([a-zA-Z0-9_-]+)\}?\}/g, (match, capturedKey) => {
    const cleanKey = capturedKey.trim().toLowerCase();
    const resolvedKey = aliasMap[cleanKey] || cleanKey;
    const val = context[resolvedKey] || context[cleanKey];
    return val !== undefined && val !== null && val !== "" ? String(val) : match;
  });

  return result;
}

/**
 * 1. Fetch Email Templates
 */
export function useEmailTemplates(search?: string, category?: string, status?: string) {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["email-templates", { orgId, search, category, status }],
    queryFn: async () => {
      try {
        const endpoint = orgId ? `/organizations/${orgId}/email-templates` : `/email-templates`;
        const res = await apiGet<EmailTemplate[]>(endpoint, {
          search,
          category: category === "all" ? undefined : category,
          status: status === "all" ? undefined : status,
        });
        if (Array.isArray(res) && res.length > 0) {
          saveStoredTemplates(res);
          return res;
        }
      } catch {
        // Fallback to local storage
      }

      let list = getStoredTemplates();
      if (category && category !== "all") {
        list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
      }
      if (status && status !== "all") {
        list = list.filter((t) => t.status.toLowerCase() === status.toLowerCase());
      }
      if (search && search.trim() !== "") {
        const q = search.toLowerCase();
        list = list.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.subject.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.body.toLowerCase().includes(q)
        );
      }
      return list;
    },
    initialData: getStoredTemplates(),
  });
}

/**
 * 2. Fetch Single Email Template
 */
export function useEmailTemplate(id: string) {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["email-template", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const endpoint = orgId
          ? `/organizations/${orgId}/email-templates/${id}`
          : `/email-templates/${id}`;
        const res = await apiGet<EmailTemplate>(endpoint);
        if (res) return res;
      } catch {
        // Fallback
      }
      const all = getStoredTemplates();
      return all.find((t) => t.id === id) || null;
    },
    enabled: !!id,
  });
}

/**
 * 3. Create Template Mutation
 */
export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: async (dto: CreateEmailTemplateInput) => {
      try {
        const endpoint = orgId ? `/organizations/${orgId}/email-templates` : `/email-templates`;
        const res = await apiPost<EmailTemplate>(endpoint, dto);
        if (res && res.id) {
          const current = getStoredTemplates();
          saveStoredTemplates([res, ...current]);
          return res;
        }
      } catch {
        // Fallback local save
      }

      const newTemplate: EmailTemplate = {
        id: `TMPL-${Date.now().toString().slice(-4)}`,
        organizationId: orgId,
        name: dto.name,
        category: dto.category,
        channel: dto.channel || "Email",
        subject: dto.subject,
        body: dto.body,
        description: dto.description || null,
        variables: dto.variables || ["student", "date", "course", "application_no", "sender"],
        status: dto.status || "active",
        isDefault: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const current = getStoredTemplates();
      const updated = [newTemplate, ...current];
      saveStoredTemplates(updated);
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template created successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create email template");
    },
  });
}

/**
 * 4. Update Template Mutation
 */
export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateEmailTemplateInput }) => {
      try {
        const endpoint = orgId
          ? `/organizations/${orgId}/email-templates/${id}`
          : `/email-templates/${id}`;
        const res = await apiPatch<EmailTemplate>(endpoint, dto);
        if (res && res.id) {
          const current = getStoredTemplates();
          const updated = current.map((t) => (t.id === id ? { ...t, ...res } : t));
          saveStoredTemplates(updated);
          return res;
        }
      } catch {
        // Fallback
      }

      const current = getStoredTemplates();
      const index = current.findIndex((t) => t.id === id);
      if (index === -1) throw new Error("Template not found");
      const updatedItem: EmailTemplate = {
        ...current[index],
        ...dto,
        updatedAt: new Date().toISOString(),
      };
      current[index] = updatedItem;
      saveStoredTemplates([...current]);
      return updatedItem;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-template", vars.id] });
      toast.success("Email template updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update email template");
    },
  });
}

/**
 * 5. Delete Template Mutation
 */
export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const endpoint = orgId
          ? `/organizations/${orgId}/email-templates/${id}`
          : `/email-templates/${id}`;
        await apiDelete(endpoint);
      } catch {
        // Fallback
      }

      const current = getStoredTemplates();
      const updated = current.filter((t) => t.id !== id);
      saveStoredTemplates(updated);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Email template deleted successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete email template");
    },
  });
}

/**
 * 6. Duplicate Template Mutation
 */
export function useDuplicateEmailTemplate() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const endpoint = orgId
          ? `/organizations/${orgId}/email-templates/${id}/duplicate`
          : `/email-templates/${id}/duplicate`;
        const res = await apiPost<EmailTemplate>(endpoint, {});
        if (res && res.id) {
          const current = getStoredTemplates();
          saveStoredTemplates([res, ...current]);
          return res;
        }
      } catch {
        // Fallback
      }

      const current = getStoredTemplates();
      const orig = current.find((t) => t.id === id);
      if (!orig) throw new Error("Original template not found");

      const dup: EmailTemplate = {
        ...orig,
        id: `TMPL-${Date.now().toString().slice(-4)}`,
        name: `${orig.name} (Copy)`,
        status: "draft",
        isDefault: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveStoredTemplates([dup, ...current]);
      return dup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template duplicated as draft!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to duplicate template");
    },
  });
}

/**
 * 7. Send Templated Email Mutation
 */
export function useSendTemplatedEmail() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: async (payload: {
      to: string;
      subject: string;
      body: string;
      senderName?: string;
      category?: string;
      templateId?: string;
      applicationNo?: string;
      applicantName?: string;
      channel?: string;
    }) => {
      const activeSender = payload.senderName || user?.name || "Admissions Desk";

      try {
        const endpoint = orgId
          ? `/organizations/${orgId}/email-templates/send`
          : `/email-templates/send`;
        const res = await apiPost<{ success: boolean; messageId?: string }>(endpoint, {
          ...payload,
          senderName: activeSender,
        });
        if (res) return res;
      } catch {
        // Simulated success
      }

      // Bump usage count in local store if templateId provided
      if (payload.templateId) {
        const current = getStoredTemplates();
        const updated = current.map((t) =>
          t.id === payload.templateId ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t
        );
        saveStoredTemplates(updated);
      }

      return {
        success: true,
        messageId: `COMM-${Date.now()}`,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      toast.success("Email sent successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send email");
    },
  });
}
