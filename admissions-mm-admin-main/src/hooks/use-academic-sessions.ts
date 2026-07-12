import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete, publicGet } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface AcademicSession {
  id: string;
  organizationId: string;
  name: string;
  displayName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicSessionInput {
  name: string;
  displayName?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  isActive?: boolean;
}

export function useAcademicSessions(page: number = 1, limit: number = 10) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["academic-sessions", { orgId, page, limit }],
    queryFn: () =>
      apiGet<PaginatedResponse<AcademicSession>>(
        `/organizations/${orgId}/academic-sessions`,
        { page, limit },
      ),
    enabled: !!orgId,
  });
}

export function useAcademicSession(id: string | null) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;
  const isValidUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  return useQuery({
    queryKey: ["academic-session", id, { orgId }],
    queryFn: () =>
      apiGet<AcademicSession>(`/organizations/${orgId}/academic-sessions/${id}`),
    enabled: !!orgId && isValidUuid,
  });
}

export function useCurrentAcademicSession() {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["academic-session-current", { orgId }],
    queryFn: () =>
      publicGet<AcademicSession>(`/organizations/${orgId}/academic-sessions/current`),
    enabled: !!orgId,
  });
}

export function useCreateAcademicSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (data: CreateAcademicSessionInput) =>
      apiPost<AcademicSession>(`/organizations/${orgId}/academic-sessions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["academic-session-current"] });
      toast.success("Academic session created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create academic session",
      );
    },
  });
}

export function useUpdateAcademicSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateAcademicSessionInput>;
    }) =>
      apiPatch<AcademicSession>(
        `/organizations/${orgId}/academic-sessions/${id}`,
        data,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["academic-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["academic-session", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["academic-session-current"] });
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Academic session updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update academic session",
      );
    },
  });
}

export function useDeleteAcademicSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/academic-sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["academic-session-current"] });
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Academic session deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to deactivate academic session",
      );
    },
  });
}
