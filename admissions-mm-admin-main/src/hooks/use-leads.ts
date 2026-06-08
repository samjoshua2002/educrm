import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete, apiPatch } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface Lead {
  id: string;
  organizationId: string;
  branchId?: string;
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
  campaignId?: string;
  isDuplicate: boolean;
  duplicateCount: number;
  rawPayload: any;
  assignedTo?: string;
  assignedAt?: string;
  createdAt: string;
  status: string; // 'unverified' | 'verified' | 'disqualified'
}

export function useLeads(
  page: number = 1,
  limit: number = 10,
  search?: string,
  explicitOrgId?: string,
  status?: string,
) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useQuery({
    queryKey: ["leads", { orgId, page, limit, search, status }],
    queryFn: () =>
      apiGet<PaginatedResponse<Lead>>(`/organizations/${orgId}/leads`, {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
      }),
    enabled: !!orgId,
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
