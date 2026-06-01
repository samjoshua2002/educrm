import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface Branch {
  status: string;
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateBranchInput {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  isActive?: boolean;
}

export function useBranches(
  pageOrOrgId?: number | string,
  limitOrPage?: number,
  limit?: number
) {
  const user = useAuthStore((state) => state.user);
  let page = 1;
  let orgId = user?.organizationId;
  let finalLimit = 10;

  if (typeof pageOrOrgId === "string") {
    orgId = pageOrOrgId;
    if (typeof limitOrPage === "number") {
      page = limitOrPage;
    }
    if (typeof limit === "number") {
      finalLimit = limit;
    }
  } else if (typeof pageOrOrgId === "number") {
    page = pageOrOrgId;
    if (typeof limitOrPage === "number") {
      finalLimit = limitOrPage;
    }
  }

  return useQuery({
    queryKey: ["branches", { orgId, page, limit: finalLimit }],
    queryFn: () => apiGet<PaginatedResponse<Branch>>(`/organizations/${orgId}/branches`, { page, limit: finalLimit }),
    enabled: !!orgId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (data: CreateBranchInput) => apiPost<Branch>(`/organizations/${orgId}/branches`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create branch");
    },
  });
}

export function useBranch(id: string | null) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;
  const isValidUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  return useQuery({
    queryKey: ["branch", id, { orgId }],
    queryFn: () => apiGet<Branch>(`/organizations/${orgId}/branches/${id}`),
    enabled: !!orgId && isValidUuid,
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBranchInput> }) => 
      apiPatch<Branch>(`/organizations/${orgId}/branches/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branch", variables.id] });
      toast.success("Branch updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update branch");
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete branch");
    },
  });
}
