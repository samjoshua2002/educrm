import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PaginatedResponse } from "@/types/api";

// ============================================================================
// TYPES
// ============================================================================

export interface InterviewSlot {
  id: string;
  organizationId: string;
  interviewerId: string;
  interviewer?: { id: string; name: string; email: string };
  interviewType: "GD" | "PI";
  slotDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  mode: "In-person" | "Virtual";
  meetingLink?: string | null;
  status: "Available" | "Booked" | "Blocked" | "Cancelled";
  timeZone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlotInput {
  interviewerId: string;
  interviewType: "GD" | "PI";
  slotDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  mode?: "In-person" | "Virtual";
  meetingLink?: string;
  timeZone?: string;
}

export interface BulkCreateSlotsInput {
  interviewerId: string;
  interviewType: "GD" | "PI";
  slotDate: string;
  dayStartTime: string;
  dayEndTime: string;
  slotDurationMinutes: number;
  location?: string;
  mode?: "In-person" | "Virtual";
  meetingLink?: string;
  timeZone?: string;
}

export interface Interview {
  id: string;
  organizationId: string;
  applicationId: string;
  application?: { id: string; applicationNo: string; name: string };
  interviewType: "GD" | "PI";
  round: number;
  slotId: string | null;
  slot?: InterviewSlot;
  status: "Scheduled" | "Rescheduled" | "Completed" | "No Show" | "Cancelled";
  assignedPanel: string[];
  outcome?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookInterviewInput {
  applicationId: string;
  interviewType: "GD" | "PI";
  slotId: string;
  panelUserIds: string[];
}

// ============================================================================
// SLOTS (B1)
// ============================================================================

export function useInterviewSlots(filters?: {
  interviewerId?: string;
  interviewType?: "GD" | "PI";
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["interview-slots", orgId, filters],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<InterviewSlot>>(`/organizations/${orgId}/interview-slots`, filters);
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: CreateSlotInput) => apiPost<InterviewSlot>(`/organizations/${orgId}/interview-slots`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      toast.success("Slot created");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create slot"),
  });
}

export function useBulkCreateSlots() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: BulkCreateSlotsInput) => apiPost<InterviewSlot[]>(`/organizations/${orgId}/interview-slots/bulk`, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      const count = Array.isArray(result) ? result.length : (result as any)?.data?.length ?? 0;
      toast.success(`${count} slots created`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to bulk-create slots"),
  });
}

export function useBlockSlot() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiPatch<InterviewSlot>(`/organizations/${orgId}/interview-slots/${id}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      toast.success("Slot blocked");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to block slot"),
  });
}

export function useUnblockSlot() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiPatch<InterviewSlot>(`/organizations/${orgId}/interview-slots/${id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      toast.success("Slot unblocked");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to unblock slot"),
  });
}

export function useCancelSlot() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiPatch<InterviewSlot>(`/organizations/${orgId}/interview-slots/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      toast.success("Slot cancelled");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to cancel slot"),
  });
}

// ============================================================================
// INTERVIEWS / BOOKING (B2, B4, B5)
// ============================================================================

export function useInterviews(filters?: { applicationId?: string; interviewType?: "GD" | "PI"; status?: string }) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["interviews", orgId, filters],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<Interview>>(`/organizations/${orgId}/interviews`, filters);
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useBookInterview() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: BookInterviewInput) => apiPost<Interview>(`/organizations/${orgId}/interviews/book`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Interview scheduled");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to schedule interview"),
  });
}

export function useRescheduleInterview() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: ({ id, newSlotId }: { id: string; newSlotId: string }) =>
      apiPatch<Interview>(`/organizations/${orgId}/interviews/${id}/reschedule`, { newSlotId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Interview rescheduled");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to reschedule interview"),
  });
}

export function useCancelInterview() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiPatch<Interview>(`/organizations/${orgId}/interviews/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      toast.success("Interview cancelled");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to cancel interview"),
  });
}

export function useMarkNoShow() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiPatch<Interview>(`/organizations/${orgId}/interviews/${id}/no-show`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Marked as no-show");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to mark no-show"),
  });
}

export function useMarkCompleted() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome?: string }) =>
      apiPatch<Interview>(`/organizations/${orgId}/interviews/${id}/complete`, { outcome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast.success("Interview marked completed");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to mark interview completed"),
  });
}
