import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  DuplicatePair,
  LeadManagementSettings,
  MergePreview,
  RoutingRule,
  RoutingRuleInput,
  ScoringMeta,
  ScoringRule,
  ScoringRuleInput,
  ScoringSummary,
} from "@/types/lead-management";

function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId);
}

const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

// ---- settings --------------------------------------------------------------

export function useLeadManagementSettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "settings", orgId],
    queryFn: () => apiGet<LeadManagementSettings>(`/organizations/${orgId}/lead-management/settings`),
    enabled: !!orgId,
  });
}

export function useUpdateLeadManagementSettings() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LeadManagementSettings>) =>
      apiPatch<LeadManagementSettings>(`/organizations/${orgId}/lead-management/settings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-management"] });
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to save settings")),
  });
}

// ---- scoring ---------------------------------------------------------------

export function useScoringMeta() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "scoring-meta", orgId],
    queryFn: () => apiGet<ScoringMeta>(`/organizations/${orgId}/lead-management/scoring/meta`),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useScoringRules() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "scoring-rules", orgId],
    queryFn: () => apiGet<ScoringRule[]>(`/organizations/${orgId}/lead-management/scoring/rules`),
    enabled: !!orgId,
  });
}

export function useScoringSummary() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "scoring-summary", orgId],
    queryFn: () => apiGet<ScoringSummary>(`/organizations/${orgId}/lead-management/scoring/summary`),
    enabled: !!orgId,
  });
}

export function useSaveScoringRule() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<ScoringRuleInput> }) =>
      id
        ? apiPatch<ScoringRule>(`/organizations/${orgId}/lead-management/scoring/rules/${id}`, data)
        : apiPost<ScoringRule>(`/organizations/${orgId}/lead-management/scoring/rules`, data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lead-management", "scoring-rules"] });
      toast.success(v.id ? "Scoring rule updated" : "Scoring rule created");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to save scoring rule")),
  });
}

export function useDeleteScoringRule() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/lead-management/scoring/rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-management", "scoring-rules"] });
      toast.success("Scoring rule deleted");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to delete scoring rule")),
  });
}

export function useRescoreAll() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<{ rescored: number }>(`/organizations/${orgId}/lead-management/scoring/rescore-all`),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["lead-management", "scoring-summary"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${d?.rescored ?? 0} leads rescored`);
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to rescore leads")),
  });
}

// ---- routing ---------------------------------------------------------------

export function useRoutingRules() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "routing-rules", orgId],
    queryFn: () => apiGet<RoutingRule[]>(`/organizations/${orgId}/lead-management/routing/rules`),
    enabled: !!orgId,
  });
}

export function useSaveRoutingRule() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<RoutingRuleInput> }) =>
      id
        ? apiPatch<RoutingRule>(`/organizations/${orgId}/lead-management/routing/rules/${id}`, data)
        : apiPost<RoutingRule>(`/organizations/${orgId}/lead-management/routing/rules`, data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lead-management", "routing-rules"] });
      toast.success(v.id ? "Routing rule updated" : "Routing rule created");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to save routing rule")),
  });
}

export function useDeleteRoutingRule() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/lead-management/routing/rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-management", "routing-rules"] });
      toast.success("Routing rule deleted");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to delete routing rule")),
  });
}

export function useReorderRoutingRules() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => apiPost(`/organizations/${orgId}/lead-management/routing/reorder`, { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-management", "routing-rules"] }),
    onError: (e: any) => toast.error(errMsg(e, "Failed to reorder rules")),
  });
}

// ---- duplicates ------------------------------------------------------------

export function useDuplicateLeads() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "duplicates", orgId],
    queryFn: () => apiGet<DuplicatePair[]>(`/organizations/${orgId}/lead-management/duplicates`),
    enabled: !!orgId,
  });
}

export function useDuplicateScan(leadId?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "duplicate-scan", orgId, leadId],
    queryFn: () =>
      apiGet<{ matches: { confidence: number; reasons: string[]; lead: any }[] }>(
        `/organizations/${orgId}/lead-management/duplicates/scan/${leadId}`,
      ),
    enabled: !!orgId && !!leadId,
  });
}

export function useMergePreview(masterId?: string | null, duplicateId?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-management", "merge-preview", orgId, masterId, duplicateId],
    queryFn: () =>
      apiGet<MergePreview>(`/organizations/${orgId}/lead-management/duplicates/preview`, {
        masterId,
        duplicateId,
      }),
    enabled: !!orgId && !!masterId && !!duplicateId,
  });
}

export function useMergeLeads() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      masterLeadId: string;
      duplicateLeadId: string;
      choices?: Record<string, "master" | "duplicate">;
    }) => apiPost(`/organizations/${orgId}/lead-management/duplicates/merge`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-management"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Leads merged successfully");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to merge leads")),
  });
}

export function useDismissDuplicate() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => apiPost(`/organizations/${orgId}/lead-management/duplicates/${leadId}/dismiss`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-management"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Marked as not a duplicate");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to update lead")),
  });
}
