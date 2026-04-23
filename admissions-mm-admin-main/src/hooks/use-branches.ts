import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
}

export function useBranches(page: number = 1, limit: number = 10) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["branches", { orgId, page, limit }],
    queryFn: () => apiGet<PaginatedResponse<Branch>>(`/organizations/${orgId}/branches`, { page, limit }),
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
