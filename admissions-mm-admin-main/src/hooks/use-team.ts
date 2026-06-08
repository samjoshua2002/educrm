import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { User, Role } from "@/types/auth";

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  role: Role | string;
  phone: string;
  branchId?: string;
}

export function useTeam(orgIdOrPage?: string | number, pageParam?: number, limitParam: number = 10) {
  const currentUser = useAuthStore((state) => state.user);
  let page = 1;
  let limit = 10;
  let orgId = currentUser?.organizationId;

  if (typeof orgIdOrPage === "string") {
    orgId = orgIdOrPage;
    if (typeof pageParam === "number") page = pageParam;
    if (typeof limitParam === "number") limit = limitParam;
  } else if (typeof orgIdOrPage === "number") {
    page = orgIdOrPage;
    if (typeof pageParam === "number") limit = pageParam;
  }

  return useQuery({
    queryKey: ["team", { orgId, page, limit }],
    queryFn: () => apiGet<PaginatedResponse<User>>(`/organizations/${orgId}/users`, { page, limit }),
    enabled: !!orgId,
  });
}

export function useCreateUser(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useMutation({
    mutationFn: (data: CreateUserInput) => apiPost<User>(`/organizations/${orgId}/users`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Team member created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create team member");
    },
  });
}

export function useUpdateUser(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<CreateUserInput> & { isActive?: boolean } }) =>
      apiPatch<User>(`/organizations/${orgId}/users/${userId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    },
  });
}
