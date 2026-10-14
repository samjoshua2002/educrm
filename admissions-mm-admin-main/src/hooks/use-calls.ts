import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { CallInput, CallLog, CallStats, TelephonySettings } from "@/types/communications";
import { useOrgId } from "./use-communications";

const clean = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== "all"));

export interface CallFilters {
  callType?: string;
  callStatus?: string;
  callOutcome?: string;
  agentUserId?: string;
  search?: string;
  applicationId?: string;
  leadId?: string;
  dateFrom?: string;
  dateTo?: string;
  followUpDue?: boolean;
}

export function useCalls(page = 1, limit = 20, filters: CallFilters = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["calls", orgId, page, limit, filters],
    queryFn: () =>
      apiGet<PaginatedResponse<CallLog>>(
        `/organizations/${orgId}/calls`,
        clean({ page, limit, ...filters, followUpDue: filters.followUpDue ? "true" : undefined }),
      ),
    enabled: !!orgId,
    refetchInterval: 20_000,
  });
}

export function useCallStats() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["calls", "stats", orgId],
    queryFn: () => apiGet<CallStats>(`/organizations/${orgId}/calls/stats`),
    enabled: !!orgId,
  });
}

export function useCall(id?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["calls", "one", orgId, id],
    queryFn: () => apiGet<CallLog>(`/organizations/${orgId}/calls/${id}`),
    enabled: !!orgId && !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["calls"] });
    qc.invalidateQueries({ queryKey: ["communications"] });
  };
}

export function useLogCall() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: CallInput) => apiPost<CallLog>(`/organizations/${orgId}/calls`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Call logged");
    },
  });
}

export function useUpdateCall() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...payload }: CallInput & { id: string }) => apiPatch<CallLog>(`/organizations/${orgId}/calls/${id}`, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Call updated");
    },
  });
}

export function useDeleteCall() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/calls/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Call deleted");
    },
  });
}

export function useClickToCall() {
  const orgId = useOrgId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: { applicationId?: string; leadId?: string; to?: string; countryCode?: string; agentNumber?: string }) =>
      apiPost<CallLog & { message?: string }>(`/organizations/${orgId}/calls/click-to-call`, payload),
    onSuccess: (r) => {
      invalidate();
      toast.success(r?.message || "Call initiated");
    },
  });
}

export function useTelephonySettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["calls", "settings", orgId],
    queryFn: () => apiGet<TelephonySettings>(`/organizations/${orgId}/calls/settings`),
    enabled: !!orgId,
  });
}

export function useUpdateTelephonySettings() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => apiPatch<TelephonySettings>(`/organizations/${orgId}/calls/settings`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls", "settings"] });
      toast.success("Telephony settings saved");
    },
  });
}

export function useTestTelephonySettings() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: () => apiPost<{ ok: boolean; message: string }>(`/organizations/${orgId}/calls/settings/test`),
    onSuccess: (r) => (r?.ok ? toast.success(r.message) : toast.error(r?.message || "Check failed")),
  });
}
