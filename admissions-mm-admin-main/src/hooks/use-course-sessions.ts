import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { Course } from "./use-courses";
import { AcademicSession } from "./use-academic-sessions";

export interface CourseSession {
  id: string;
  organizationId: string;
  courseId: string;
  course: Course;
  academicSessionId: string;
  academicSession: AcademicSession;
  totalSeats: number;
  feeAmount: number | string; // backend sometimes returns decimal string, e.g. "150000.00"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseSessionInput {
  courseId: string;
  academicSessionId: string;
  totalSeats?: number;
  feeAmount?: number;
  isActive?: boolean;
}

export function useCourseSessions(
  page: number = 1,
  limit: number = 10,
  courseId?: string,
  academicSessionId?: string,
  isActive?: boolean,
) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["course-sessions", { orgId, page, limit, courseId, academicSessionId, isActive }],
    queryFn: () =>
      apiGet<PaginatedResponse<CourseSession>>(
        `/organizations/${orgId}/course-sessions`,
        {
          page,
          limit,
          courseId: courseId === "all" ? undefined : courseId,
          academicSessionId: academicSessionId === "all" ? undefined : academicSessionId,
          isActive: isActive !== undefined ? isActive : undefined,
        },
      ),
    enabled: !!orgId,
  });
}

export function useCourseSession(id: string | null) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;
  const isValidUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  return useQuery({
    queryKey: ["course-session", id, { orgId }],
    queryFn: () =>
      apiGet<CourseSession>(`/organizations/${orgId}/course-sessions/${id}`),
    enabled: !!orgId && isValidUuid,
  });
}

export function useCreateCourseSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (data: CreateCourseSessionInput) =>
      apiPost<CourseSession>(`/organizations/${orgId}/course-sessions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Course session created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create course session",
      );
    },
  });
}

export function useUpdateCourseSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateCourseSessionInput>;
    }) =>
      apiPatch<CourseSession>(
        `/organizations/${orgId}/course-sessions/${id}`,
        data,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["course-session", variables.id] });
      toast.success("Course session updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update course session",
      );
    },
  });
}

export function useDeleteCourseSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/course-sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-sessions"] });
      toast.success("Course session deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to deactivate course session",
      );
    },
  });
}
