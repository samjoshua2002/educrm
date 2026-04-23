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

export function useTeam(page: number = 1, limit: number = 10) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useQuery({
    queryKey: ["team", { orgId, page, limit }],
    queryFn: () => apiGet<PaginatedResponse<User>>(`/organizations/${orgId}/users`, { page, limit }),
    enabled: !!orgId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

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

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

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
