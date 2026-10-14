/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { PaginatedResponse } from "@/types/api";
import type { CommTemplate, CommTemplateInput } from "@/types/communications";

/** Communication template (Email / SMS / WhatsApp / Call Script). */
export type EmailTemplate = CommTemplate;

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message || e?.message || fallback;
  return Array.isArray(m) ? m.join(", ") : m;
};

/**
 * Renders merge fields: {{Name}} / {{Program}} / {{Date}} / {{Link}} /
 * {{Application_ID}} (double braces, case-insensitive) and the legacy
 * single-brace category variables such as {student}, {course}.
 * Unknown tags are left as they are so they stay visible.
 */
export function renderTemplate(template: string | null | undefined, context: Record<string, string | undefined | null>): string {
  if (!template) return "";
  const lower: Record<string, string> = {};
  Object.entries(context || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") lower[k.toLowerCase()] = String(v);
  });
  const aliases: Record<string, string[]> = {
    name: ["name", "student", "full_name"],
    first_name: ["first_name", "firstname"],
    program: ["program", "course"],
    application_id: ["application_id", "application_no", "applicationno"],
    application_no: ["application_no", "application_id"],
    date: ["date"],
    link: ["link", "portal_link"],
  };
  const lookup = (key: string) => {
    const k = key.toLowerCase();
    if (lower[k] !== undefined) return lower[k];
    for (const a of aliases[k] || []) if (lower[a] !== undefined) return lower[a];
    if (k === "first_name" && lower.name) return lower.name.split(/\s+/)[0];
    return undefined;
  };
  return template
    .replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, key) => lookup(key) ?? m)
    .replace(/\{([a-zA-Z0-9_-]+)\}/g, (m, key) => lookup(key) ?? m);
}

export interface TemplateFilters {
  type?: string;
  templateCategory?: string;
  language?: string;
}

function endpointFor(orgId?: string | null) {
  return orgId ? `/organizations/${orgId}/email-templates` : `/email-templates`;
}

/** Templates from the API (no local fallback data). */
export function useEmailTemplates(search?: string, category?: string, status?: string, filters: TemplateFilters = {}) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["email-templates", { orgId, search, category, status, filters }],
    queryFn: async () => {
      const raw = await apiGet<CommTemplate[] | PaginatedResponse<CommTemplate>>(endpointFor(orgId), {
        search: search || undefined,
        category: category && category !== "all" ? category : undefined,
        status: status && status !== "all" ? status : undefined,
        type: filters.type && filters.type !== "all" ? filters.type : undefined,
        templateCategory: filters.templateCategory && filters.templateCategory !== "all" ? filters.templateCategory : undefined,
        language: filters.language && filters.language !== "all" ? filters.language : undefined,
      });
      return Array.isArray(raw) ? raw : raw?.data || [];
    },
  });
}

export function useEmailTemplate(id: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["email-template", id],
    queryFn: () => apiGet<CommTemplate>(`${endpointFor(orgId)}/${id}`),
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["email-templates"] });
    if (id) qc.invalidateQueries({ queryKey: ["email-template", id] });
  };
}

export function useCreateEmailTemplate() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (dto: CommTemplateInput) => apiPost<CommTemplate>(endpointFor(orgId), dto),
    onSuccess: () => {
      invalidate();
      toast.success("Template created");
    },
    onError: (e: any) => {
      if (![400, 403].includes(e?.response?.status)) toast.error(errMsg(e, "Failed to create template"));
    },
  });
}

export function useUpdateEmailTemplate() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CommTemplateInput> }) => apiPatch<CommTemplate>(`${endpointFor(orgId)}/${id}`, dto),
    onSuccess: (_, v) => {
      invalidate(v.id);
      toast.success("Template updated");
    },
    onError: (e: any) => {
      if (![400, 403].includes(e?.response?.status)) toast.error(errMsg(e, "Failed to update template"));
    },
  });
}

export function useDeleteEmailTemplate() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`${endpointFor(orgId)}/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Template deleted");
    },
  });
}

export function useDuplicateEmailTemplate() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiPost<CommTemplate>(`${endpointFor(orgId)}/${id}/duplicate`, {}),
    onSuccess: () => {
      invalidate();
      toast.success("Template duplicated as draft");
    },
  });
}

function useStatusAction(action: "approve" | "archive" | "restore", message: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiPost<CommTemplate>(`/organizations/${orgId}/email-templates/${id}/${action}`, {}),
    onSuccess: (_, id) => {
      invalidate(id);
      toast.success(message);
    },
  });
}

/** Only org_admin may approve (enforced by the API too). */
export const useApproveTemplate = () => useStatusAction("approve", "Template approved");
export const useArchiveTemplate = () => useStatusAction("archive", "Template archived");
export const useRestoreTemplate = () => useStatusAction("restore", "Template restored as draft");

/** Sends one email (rendered by the caller) through the organization's SMTP and logs it. */
export function useSendTemplatedEmail() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      to: string;
      subject: string;
      body: string;
      header?: string;
      footer?: string;
      signature?: string;
      senderName?: string;
      category?: string;
      templateId?: string;
      applicationNo?: string;
      applicantName?: string;
      channel?: string;
    }) =>
      apiPost<{ success: boolean; messageId?: string; error?: string }>(`${endpointFor(orgId)}/send`, {
        ...payload,
        senderName: payload.senderName || user?.name || "Admissions Desk",
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      qc.invalidateQueries({ queryKey: ["communications"] });
      if (res && (res as any).success === false) toast.error((res as any).error || "Email could not be sent");
      else toast.success("Email sent");
    },
  });
}

/** Scope merge fields + category variables, from the API. */
export function useMergeFields() {
  return useQuery({
    queryKey: ["email-template-categories", "merge-fields"],
    queryFn: () => apiGet<{ tag: string; key: string; label: string; sample: string }[]>("/email-template-categories/merge-fields"),
    staleTime: 10 * 60_000,
  });
}
