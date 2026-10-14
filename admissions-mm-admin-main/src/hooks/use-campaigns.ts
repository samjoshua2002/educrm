import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { PaginatedResponse } from "@/types/api";
import type { Campaign, CampaignInput, ChannelPerformance } from "@/types/lead-management";

function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId);
}

const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export function useCampaigns(
  page = 1,
  limit = 10,
  filters?: { search?: string; status?: string; sourceType?: string },
) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["campaigns", orgId, page, limit, filters],
    queryFn: () =>
      apiGet<PaginatedResponse<Campaign>>(`/organizations/${orgId}/campaigns`, {
        page,
        limit,
        search: filters?.search || undefined,
        status: filters?.status || undefined,
        sourceType: filters?.sourceType || undefined,
      }),
    enabled: !!orgId,
  });
}

export function useChannelPerformance(params?: { from?: string; to?: string; attribution?: "first" | "last" }) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["campaigns", "performance", orgId, params],
    queryFn: () =>
      apiGet<ChannelPerformance>(`/organizations/${orgId}/campaigns/performance`, {
        from: params?.from || undefined,
        to: params?.to || undefined,
        attribution: params?.attribution || undefined,
      }),
    enabled: !!orgId,
  });
}

export function useSaveCampaign() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<CampaignInput> }) =>
      id
        ? apiPatch<Campaign>(`/organizations/${orgId}/campaigns/${id}`, data)
        : apiPost<Campaign>(`/organizations/${orgId}/campaigns`, data),
    onSuccess: (d, v) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      const mapped = d?.mappedLeads ? ` — ${d.mappedLeads} existing leads mapped by utm_campaign` : "";
      toast.success((v.id ? "Campaign updated" : "Campaign created") + mapped);
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to save campaign")),
  });
}

export function useDeleteCampaign() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/campaigns/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to delete campaign")),
  });
}
