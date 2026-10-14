import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  CaptureEvent,
  CaptureEventInput,
  ChatbotConversation,
  FacebookSyncResult,
  ImportBatch,
  ImportCsvInput,
  LeadCaptureSettings,
  LeadCaptureSettingsInput,
} from "@/types/lead-management";

function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId);
}

const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

/** List endpoints return arrays, which the response interceptor turns into { data, pagination }. */
const asList = <T,>(res: any): T[] => (Array.isArray(res) ? res : res?.data ?? []);

/** Absolute URL of a public API path (e.g. "/public/lead-capture/...") */
export function apiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function useLeadCaptureSettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-capture", "settings", orgId],
    queryFn: () => apiGet<LeadCaptureSettings>(`/organizations/${orgId}/lead-capture/settings`),
    enabled: !!orgId,
  });
}

function useSettingsMutation<T>(fn: (orgId: string, vars: T) => Promise<LeadCaptureSettings>, success: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: T) => fn(orgId as string, vars),
    onSuccess: (data) => {
      qc.setQueryData(["lead-capture", "settings", orgId], data);
      toast.success(success);
    },
    onError: (e: any) => toast.error(errMsg(e, "Request failed")),
  });
}

export function useUpdateLeadCaptureSettings() {
  return useSettingsMutation<LeadCaptureSettingsInput>(
    (orgId, data) => apiPatch(`/organizations/${orgId}/lead-capture/settings`, data),
    "Integration settings saved",
  );
}

export function useRegenerateCaptureKey() {
  return useSettingsMutation<{ which: "api" | "verify" | "portal"; portalId?: string }>(
    (orgId, data) => apiPost(`/organizations/${orgId}/lead-capture/settings/regenerate`, data),
    "Key regenerated — update it wherever it is used",
  );
}

export function useAddPortal() {
  return useSettingsMutation<{ name: string }>(
    (orgId, data) => apiPost(`/organizations/${orgId}/lead-capture/portals`, data),
    "Portal integration added",
  );
}

export function useUpdatePortal() {
  return useSettingsMutation<{ id: string; name?: string; isActive?: boolean }>(
    (orgId, { id, ...data }) => apiPatch(`/organizations/${orgId}/lead-capture/portals/${id}`, data),
    "Portal integration updated",
  );
}

export function useRemovePortal() {
  return useSettingsMutation<string>(
    (orgId, id) => apiDelete(`/organizations/${orgId}/lead-capture/portals/${id}`),
    "Portal integration removed",
  );
}

export function useFacebookSync() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<FacebookSyncResult>(`/organizations/${orgId}/lead-capture/facebook/sync`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["lead-capture", "settings"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(
        `Fetched ${r.fetched}: ${r.created} new, ${r.reentries} already known, ${r.duplicatesFlagged} flagged` +
          (r.failed ? `, ${r.failed} failed` : ""),
      );
      if (r.errors?.length) toast.error(r.errors.slice(0, 3).join("\n"));
    },
    onError: (e: any) => toast.error(errMsg(e, "Facebook sync failed")),
  });
}

// ---- CSV import -----------------------------------------------------------

export function useImportBatches() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-capture", "imports", orgId],
    queryFn: async () => asList<ImportBatch>(await apiGet(`/organizations/${orgId}/lead-capture/imports`)),
    enabled: !!orgId,
  });
}

export function useImportLeadsCsv() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ImportCsvInput) => apiPost<ImportBatch>(`/organizations/${orgId}/lead-capture/import`, data),
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["lead-capture"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(
        `Import finished: ${b.created} created, ${b.reentries} merged into existing leads, ${b.duplicatesFlagged} flagged, ${b.failed} failed`,
      );
    },
    onError: (e: any) => toast.error(errMsg(e, "Import failed")),
  });
}

// ---- events ---------------------------------------------------------------

export function useCaptureEvents() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-capture", "events", orgId],
    queryFn: async () => asList<CaptureEvent>(await apiGet(`/organizations/${orgId}/lead-capture/events`)),
    enabled: !!orgId,
  });
}

export function useSaveCaptureEvent() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<CaptureEventInput> }) =>
      id
        ? apiPatch<CaptureEvent>(`/organizations/${orgId}/lead-capture/events/${id}`, data)
        : apiPost<CaptureEvent>(`/organizations/${orgId}/lead-capture/events`, data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lead-capture", "events"] });
      toast.success(v.id ? "Event updated" : "Event created");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to save event")),
  });
}

export function useDeleteCaptureEvent() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/lead-capture/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-capture", "events"] });
      toast.success("Event deleted");
    },
    onError: (e: any) => toast.error(errMsg(e, "Failed to delete event")),
  });
}

// ---- chatbot --------------------------------------------------------------

export function useChatbotConversations() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["lead-capture", "chatbot", orgId],
    queryFn: async () => asList<ChatbotConversation>(await apiGet(`/organizations/${orgId}/lead-capture/chatbot/conversations`)),
    enabled: !!orgId,
  });
}
