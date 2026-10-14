import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ============================================================================
// TYPES — mirror admissions-tenant-api-main/src/modules/calendar-sync
// ============================================================================

export type CalendarProvider = "Google Calendar" | "Outlook";
export type CalendarSyncStatus = "Not Connected" | "Connected" | "Synced" | "Failed" | "Disconnected";

// Per-organisation OAuth app credentials (secrets are write-only).
export interface CalendarSettings {
  id: string;
  organizationId: string;
  googleEnabled: boolean;
  googleClientId: string | null;
  hasGoogleClientSecret: boolean;
  microsoftEnabled: boolean;
  microsoftClientId: string | null;
  hasMicrosoftClientSecret: boolean;
  microsoftTenantId: string;
  redirectUri: string | null;
  effectiveRedirectUri: string;
  autoMeetingLink: boolean;
  inviteCandidate: boolean;
  availabilityDays: number;
  workdayStart: string;
  workdayEnd: string;
  timeZone: string;
  updatedAt?: string;
}

export interface UpdateCalendarSettingsInput {
  googleEnabled?: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  microsoftEnabled?: boolean;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftTenantId?: string;
  redirectUri?: string;
  autoMeetingLink?: boolean;
  inviteCandidate?: boolean;
  availabilityDays?: number;
  workdayStart?: string;
  workdayEnd?: string;
  timeZone?: string;
}

// Scope: Interview_Calendar_Sync
export interface InterviewCalendarSync {
  id: string;
  calendarSyncNumber: number;
  organizationId: string;
  interviewerId: string;
  interviewer?: { id: string; name: string; email: string };
  calendarProvider: CalendarProvider;
  calendarEmail: string | null;
  calendarEventId: string | null;
  syncStatus: CalendarSyncStatus;
  lastSyncTime: string | null;
  availabilityWindow: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCalendarEvent {
  interviewId: string;
  syncStatus: string;
  eventId: string | null;
  meetingLink: string | null;
  lastError: string | null;
  lastSyncTime: string | null;
}

// ============================================================================
// HOOKS
// ============================================================================

export function useCalendarSettings() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["calendar-settings", orgId],
    queryFn: () => apiGet<CalendarSettings>(`/organizations/${orgId}/calendar-settings`),
    enabled: !!orgId,
  });
}

export function useUpdateCalendarSettings() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: UpdateCalendarSettingsInput) =>
      apiPatch<CalendarSettings>(`/organizations/${orgId}/calendar-settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-settings"] });
      toast.success("Calendar settings saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save calendar settings"),
  });
}

export function useCalendarConnections(interviewerId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["calendar-connections", orgId, interviewerId],
    queryFn: async () => {
      const res = await apiGet<InterviewCalendarSync[] | { data: InterviewCalendarSync[] }>(
        `/organizations/${orgId}/calendar-sync`,
        interviewerId ? { interviewerId } : undefined,
      );
      return Array.isArray(res) ? res : res?.data ?? [];
    },
    enabled: !!orgId,
  });
}

// Returns the provider consent URL; the caller sends the browser there.
export function useConnectCalendar() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: { provider: CalendarProvider; interviewerId?: string }) =>
      apiPost<{ provider: string; interviewerId: string; redirectUri: string; authorizeUrl: string }>(
        `/organizations/${orgId}/calendar-sync/connect`,
        data,
      ),
    onError: (err: any) => toast.error(err.response?.data?.message || "Could not start the calendar connection"),
  });
}

export function useRunCalendarSync() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: () =>
      apiPost<{ connections: number; availabilityUpdated: number; eventsSynced: number; eventsRemoved: number }>(
        `/organizations/${orgId}/calendar-sync/run`,
      ),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      toast.success(
        `Sync finished: ${r?.connections ?? 0} calendars, ${r?.eventsSynced ?? 0} events synced, ${r?.availabilityUpdated ?? 0} availability windows updated`,
      );
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Calendar sync failed"),
  });
}

export function useRefreshAvailability() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiPost(`/organizations/${orgId}/calendar-sync/${id}/refresh-availability`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      toast.success("Availability refreshed");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to read free/busy"),
  });
}

export function useUpdateCalendarConnection() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { availabilityWindow?: string; calendarEmail?: string } }) =>
      apiPatch<InterviewCalendarSync>(`/organizations/${orgId}/calendar-sync/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      toast.success("Calendar connection updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update connection"),
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/calendar-sync/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-connections"] });
      toast.success("Calendar disconnected");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to disconnect calendar"),
  });
}

export function useInterviewCalendarEvent(interviewId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["interview-calendar-event", orgId, interviewId],
    queryFn: () => apiGet<InterviewCalendarEvent>(`/organizations/${orgId}/calendar-sync/interviews/${interviewId}`),
    enabled: !!orgId && !!interviewId,
  });
}

export function useSyncInterviewCalendar() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (interviewId: string) =>
      apiPost<{ status: string; error?: string; meetingLink?: string }>(
        `/organizations/${orgId}/calendar-sync/interviews/${interviewId}/sync`,
      ),
    onSuccess: (r, interviewId) => {
      queryClient.invalidateQueries({ queryKey: ["interview-calendar-event", orgId, interviewId] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      if (r?.status === "Synced") toast.success("Calendar event synced");
      else toast.warning(r?.error || `Calendar sync: ${r?.status ?? "not synced"}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Calendar sync failed"),
  });
}
