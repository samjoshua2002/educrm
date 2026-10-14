import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  AudiencePreview,
  CampaignOverview,
  CampaignStats,
  EmailCampaign,
  EmailCampaignInput,
  EmailSuppression,
} from "@/types/communications";
import { useOrgId } from "./use-communications";

const clean = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== "all"));

export function useEmailCampaigns(page = 1, limit = 20, filters: { search?: string; status?: string; campaignType?: string; objective?: string } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-campaigns", orgId, page, limit, filters],
    queryFn: () => apiGet<PaginatedResponse<EmailCampaign>>(`/organizations/${orgId}/email-campaigns`, clean({ page, limit, ...filters })),
    enabled: !!orgId,
  });
}

export function useCampaignOverview() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-campaigns", "overview", orgId],
    queryFn: () => apiGet<CampaignOverview>(`/organizations/${orgId}/email-campaigns/overview`),
    enabled: !!orgId,
  });
}

export function useEmailCampaign(id?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-campaigns", "one", orgId, id],
    queryFn: () => apiGet<EmailCampaign>(`/organizations/${orgId}/email-campaigns/${id}`),
    enabled: !!orgId && !!id,
  });
}

export function useCampaignStats(id: string | null | undefined, page = 1, limit = 25, filters: { status?: string; search?: string } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-campaigns", "stats", orgId, id, page, limit, filters],
    queryFn: () => apiGet<CampaignStats>(`/organizations/${orgId}/email-campaigns/${id}/stats`, clean({ page, limit, ...filters })),
    enabled: !!orgId && !!id,
    refetchInterval: 30_000,
  });
}

export function useCampaignPreview(id?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-campaigns", "preview", orgId, id],
    queryFn: () => apiGet<{ subject: string; html: string; text: string }>(`/organizations/${orgId}/email-campaigns/${id}/preview`),
    enabled: !!orgId && !!id,
  });
}

export function useAudiencePreview() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (payload: {
      targetCourseId?: string | null;
      academicYear?: string | null;
      intakeTerm?: string | null;
      targetAudience?: string[];
      segmentCriteria?: string[];
      stopConditions?: string[];
    }) => apiPost<AudiencePreview>(`/organizations/${orgId}/email-campaigns/audience-preview`, payload),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["email-campaigns"] });
}

export function useCreateEmailCampaign() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: EmailCampaignInput) => apiPost<EmailCampaign>(`/organizations/${orgId}/email-campaigns`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Campaign saved");
    },
  });
}

export function useUpdateEmailCampaign() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...payload }: EmailCampaignInput & { id: string }) => apiPatch<EmailCampaign>(`/organizations/${orgId}/email-campaigns/${id}`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Campaign updated");
    },
  });
}

export function useSetCampaignStatus() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Active" | "Paused" | "Completed" }) =>
      apiPost<EmailCampaign>(`/organizations/${orgId}/email-campaigns/${id}/status`, { status }),
    onSuccess: (c) => {
      invalidate();
      toast.success(`Campaign ${c?.status === "Active" ? "activated" : (c?.status || "updated").toLowerCase()}`);
    },
  });
}

export function useSendCampaignNow() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ sent: number; skipped: number; failed: number; audience?: number; message?: string }>(`/organizations/${orgId}/email-campaigns/${id}/send-now`),
    onSuccess: (r) => {
      invalidate();
      if (r?.message) toast.info(r.message);
      else toast.success(`Sent to ${r?.sent ?? 0} recipient(s)${r?.failed ? `, ${r.failed} failed` : ""}${r?.skipped ? `, ${r.skipped} skipped` : ""}`);
    },
  });
}

export function useTestCampaign() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => apiPost(`/organizations/${orgId}/email-campaigns/${id}/test`, { to }),
    onSuccess: () => toast.success("Test email sent"),
  });
}

export function useDuplicateCampaign() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiPost<EmailCampaign>(`/organizations/${orgId}/email-campaigns/${id}/duplicate`),
    onSuccess: () => {
      invalidate();
      toast.success("Campaign duplicated");
    },
  });
}

export function useDeleteCampaign() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/email-campaigns/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Campaign deleted");
    },
  });
}

export function useSuppressions(page = 1, limit = 25, filters: { search?: string; reason?: string } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["email-campaigns", "suppressions", orgId, page, limit, filters],
    queryFn: () => apiGet<PaginatedResponse<EmailSuppression>>(`/organizations/${orgId}/email-campaigns/suppressions`, clean({ page, limit, ...filters })),
    enabled: !!orgId,
  });
}

export function useAddSuppression() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: { email: string; reason?: string; note?: string }) => apiPost(`/organizations/${orgId}/email-campaigns/suppressions`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Address suppressed");
    },
  });
}

export function useRemoveSuppression() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/email-campaigns/suppressions/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Address removed from the suppression list");
    },
  });
}
