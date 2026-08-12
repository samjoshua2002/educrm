import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete, apiPatch, apiPost } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface Lead {
  id: string;
  organizationId: string;
  branchId?: string;
  branch?: { id: string; name: string };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  source?: string;
  sourceDetail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  formId?: string;
  form?: { id: string; name: string };
  campaignId?: string;
  isDuplicate: boolean;
  duplicateCount: number;
  rawPayload: any;
  assignedTo?: string | null;
  assignedAt?: string;
  createdAt: string;
  status: string; // 'unverified' | 'verified' | 'disqualified'
  scoreBand?: string;
  nextFollowUpAt?: string;
}

export function useLeads(
  page: number = 1,
  limit: number = 10,
  search?: string,
  explicitOrgId?: string,
  status?: string,
  filters?: {
    assignedTo?: string;
    scoreBand?: string;
    state?: string;
    city?: string;
    source?: string;
    stage?: string;
  }
) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useQuery({
    queryKey: ["leads", { orgId, page, limit, search, status, filters }],
    queryFn: () =>
      apiGet<PaginatedResponse<Lead>>(`/organizations/${orgId}/leads`, {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        assignedTo: filters?.assignedTo || undefined,
        scoreBand: filters?.scoreBand || undefined,
        state: filters?.state || undefined,
        city: filters?.city || undefined,
        source: filters?.source || undefined,
        stage: filters?.stage || undefined,
      }),
    enabled: !!orgId,
  });
}

export function useLead(leadId?: string, explicitOrgId?: string) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useQuery({
    queryKey: ["leads", leadId, { orgId }],
    queryFn: () => apiGet<Lead>(`/organizations/${orgId}/leads/${leadId}`),
    enabled: !!orgId && !!leadId,
  });
}

export function useCreateLead(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      apiPost(`/organizations/${orgId}/leads`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create lead");
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: Partial<Lead> }) =>
      apiPatch(`/organizations/${orgId}/leads/${leadId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update lead");
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      apiPatch(`/organizations/${orgId}/leads/${leadId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead status updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update lead status",
      );
    },
  });
}

export function useDeleteLead(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useMutation({
    mutationFn: (leadId: string) =>
      apiDelete(`/organizations/${orgId}/leads/${leadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete lead");
    },
  });
}
