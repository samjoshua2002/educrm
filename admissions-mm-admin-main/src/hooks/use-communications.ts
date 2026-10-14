import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { PaginatedResponse } from "@/types/api";
import type {
  CommunicationStats,
  ComposePayload,
  ComposeResult,
  TimelineEntry,
  TimelineResponse,
} from "@/types/communications";

export function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId) || undefined;
}

const errMsg = (e: any, fallback: string) => {
  const m = e?.response?.data?.message || e?.message || fallback;
  return Array.isArray(m) ? m.join(", ") : m;
};

export interface CommunicationFilters {
  channel?: string;
  direction?: string;
  status?: string;
  search?: string;
  applicationId?: string;
  leadId?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpDue?: boolean;
}

/** Organization-wide interaction list (Email / SMS / WhatsApp / Call / System). */
export function useCommunications(page = 1, limit = 20, filters: CommunicationFilters = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["communications", orgId, page, limit, filters],
    queryFn: () =>
      apiGet<PaginatedResponse<TimelineEntry>>(`/organizations/${orgId}/communications`, {
        page,
        limit,
        channel: filters.channel && filters.channel !== "all" ? filters.channel : undefined,
        direction: filters.direction && filters.direction !== "all" ? filters.direction : undefined,
        status: filters.status && filters.status !== "all" ? filters.status : undefined,
        search: filters.search || undefined,
        applicationId: filters.applicationId || undefined,
        leadId: filters.leadId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        followUpDue: filters.followUpDue ? "true" : undefined,
      }),
    enabled: !!orgId,
  });
}

export function useCommunicationStats() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["communications", "stats", orgId],
    queryFn: () => apiGet<CommunicationStats>(`/organizations/${orgId}/communications/stats`),
    enabled: !!orgId,
  });
}

/** One chronological timeline for an applicant / lead. */
export function useCommunicationTimeline(params: { applicationId?: string | null; leadId?: string | null; channel?: string }) {
  const orgId = useOrgId();
  const { applicationId, leadId, channel } = params;
  return useQuery({
    queryKey: ["communications", "timeline", orgId, applicationId, leadId, channel],
    queryFn: () =>
      apiGet<TimelineResponse>(`/organizations/${orgId}/communications/timeline`, {
        applicationId: applicationId || undefined,
        leadId: leadId || undefined,
        channel: channel && channel !== "all" ? channel : undefined,
      }),
    enabled: !!orgId && !!(applicationId || leadId),
  });
}

export function useInteraction(id?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["communications", "interaction", orgId, id],
    queryFn: () => apiGet<TimelineEntry>(`/organizations/${orgId}/communications/interactions/${id}`),
    enabled: !!orgId && !!id,
  });
}

function useInvalidateCommunications() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["communications"] });
    qc.invalidateQueries({ queryKey: ["messaging"] });
  };
}

/** Unified compose: Email / SMS / WhatsApp to one or many recipients, now or scheduled. */
export function useComposeCommunication() {
  const orgId = useOrgId();
  const invalidate = useInvalidateCommunications();
  return useMutation({
    mutationFn: (payload: ComposePayload) => apiPost<ComposeResult>(`/organizations/${orgId}/communications/send`, payload),
    onSuccess: (res) => {
      invalidate();
      if (res.scheduled) toast.success(`${res.succeeded} message(s) scheduled`);
      else if (res.failed === 0) toast.success(`${res.succeeded} message(s) sent`);
      else toast.warning(`${res.succeeded} sent, ${res.failed} failed`);
    },
    onError: (e: any) => {
      if (e?.response?.status !== 400) toast.error(errMsg(e, "Could not send the message"));
    },
  });
}

export function useResendCommunication() {
  const orgId = useOrgId();
  const invalidate = useInvalidateCommunications();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/organizations/${orgId}/communications/${id}/resend`),
    onSuccess: () => {
      invalidate();
      toast.success("Message re-sent");
    },
  });
}

export function useCancelCommunication() {
  const orgId = useOrgId();
  const invalidate = useInvalidateCommunications();
  return useMutation({
    mutationFn: (id: string) => apiPost(`/organizations/${orgId}/communications/${id}/cancel`),
    onSuccess: () => {
      invalidate();
      toast.success("Scheduled message cancelled");
    },
  });
}

export interface InteractionInput {
  channel: string;
  direction: string;
  applicationId?: string;
  leadId?: string;
  subject: string;
  summary?: string;
  content?: string;
  attachments?: { name: string; url: string }[];
  relatedRecordId?: string;
  deliveryStatus?: string;
  dateTime?: string;
  actionTaken?: string;
  nextFollowUpDate?: string;
  assignedStaffId?: string;
  remarks?: string;
}

export function useCreateInteraction() {
  const orgId = useOrgId();
  const invalidate = useInvalidateCommunications();
  return useMutation({
    mutationFn: (payload: InteractionInput) => apiPost<TimelineEntry>(`/organizations/${orgId}/communications/interactions`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Interaction logged");
    },
  });
}

export function useUpdateInteraction() {
  const orgId = useOrgId();
  const invalidate = useInvalidateCommunications();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; actionTaken?: string; nextFollowUpDate?: string; assignedStaffId?: string; remarks?: string; summary?: string; deliveryStatus?: string }) =>
      apiPatch<TimelineEntry>(`/organizations/${orgId}/communications/interactions/${id}`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Interaction updated");
    },
  });
}

/** Applicant / lead search used by recipient pickers. */
export interface RecipientOption {
  key: string;
  applicationId?: string;
  leadId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  applicationNo?: string | null;
  program?: string | null;
  kind: "Applicant" | "Lead";
}

export function useRecipientSearch(search: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["communications", "recipient-search", orgId, search],
    queryFn: async () => {
      const out: RecipientOption[] = [];
      const [apps, leads] = await Promise.allSettled([
        apiGet<any>("/applications", { page: 1, limit: 10, search: search || undefined }),
        apiGet<any>(`/organizations/${orgId}/leads`, { page: 1, limit: 10, search: search || undefined }),
      ]);
      if (apps.status === "fulfilled") {
        const rows: any[] = Array.isArray(apps.value?.data) ? apps.value.data : Array.isArray(apps.value) ? apps.value : [];
        rows.forEach((a) =>
          out.push({
            key: `app:${a.id}`,
            applicationId: a.id,
            leadId: a.leadId || undefined,
            name: a.name || a.student?.name || a.applicationNo,
            email: a.email || a.student?.email,
            phone: a.primaryMobile || a.student?.phone,
            applicationNo: a.applicationNo,
            program: a.program || a.course?.name,
            kind: "Applicant",
          }),
        );
      }
      if (leads.status === "fulfilled") {
        const rows: any[] = Array.isArray(leads.value?.data) ? leads.value.data : [];
        rows.forEach((l) =>
          out.push({
            key: `lead:${l.id}`,
            leadId: l.id,
            name: `${l.firstName || ""} ${l.lastName || ""}`.trim() || l.email || l.phone || "Lead",
            email: l.email,
            phone: l.phone,
            program: l.programInterest || l.course?.name,
            kind: "Lead",
          }),
        );
      }
      return out;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
