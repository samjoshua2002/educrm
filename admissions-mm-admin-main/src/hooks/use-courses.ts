import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export interface Course {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  department?: string | null;
  duration?: string | null;
  durationMonths?: number | null;
  totalFee?: number | null;
  totalSeats?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  name: string;
  code: string;
  description?: string;
  department?: string;
  duration?: string;
  durationMonths?: number;
  totalFee?: number;
  totalSeats?: number;
  isActive?: boolean;
}

export function useCourses(
  page: number = 1,
  limit: number = 10,
  search?: string,
  department?: string,
  isActive?: boolean,
) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["courses", { orgId, page, limit, search, department, isActive }],
    queryFn: () =>
      apiGet<PaginatedResponse<Course>>(`/organizations/${orgId}/courses`, {
        page,
        limit,
        search: search || undefined,
        department: department === "all" ? undefined : department,
        isActive: isActive !== undefined ? isActive : undefined,
      }),
    enabled: !!orgId,
  });
}

export function useCourse(id: string | null) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;
  const isValidUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  return useQuery({
    queryKey: ["course", id, { orgId }],
    queryFn: () => apiGet<Course>(`/organizations/${orgId}/courses/${id}`),
    enabled: !!orgId && isValidUuid,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (data: CreateCourseInput) =>
      apiPost<Course>(`/organizations/${orgId}/courses`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create course");
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCourseInput>;
    }) => apiPatch<Course>(`/organizations/${orgId}/courses/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Course updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update course");
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Course deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to deactivate course");
    },
  });
}

export function useHardDeleteCourse() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/courses/${id}/hard-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Course permanently deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete course");
    },
  });
}
