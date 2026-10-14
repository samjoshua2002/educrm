import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ApplicationProgress,
  StatusLogEntry,
  TrackerDashboard,
  TrackerFilters,
  TrackerMeta,
  WorkflowSettings,
} from "@/types/application-management";

export function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId) || "";
}

const base = (orgId: string) => `/organizations/${orgId}/application-tracker`;
const enc = (v: string) => encodeURIComponent(v);

/** Array endpoints arrive as {data, pagination} (see api.ts); this returns the plain array. */
function asArray<T>(res: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  return Array.isArray(res?.data) ? res!.data! : [];
}

function invalidateTracker(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["application-tracker"] });
  qc.invalidateQueries({ queryKey: ["application-timeline"] });
  qc.invalidateQueries({ queryKey: ["application-progress"] });
  qc.invalidateQueries({ queryKey: ["applications"] });
  // Master fields in the application workspace read this key.
  qc.invalidateQueries({ queryKey: ["application-raw"] });
}

export function useTrackerMeta() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-tracker", "meta", orgId],
    queryFn: () => apiGet<TrackerMeta>(`${base(orgId)}/meta`),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrackerDashboard(filters: TrackerFilters) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-tracker", "dashboard", orgId, filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== "" && v !== "all") params[k] = v;
      }
      // The backend returns the rows under `items` (so stageCounts survive the response interceptor).
      const res = await apiGet<Omit<TrackerDashboard, "data"> & { items?: TrackerDashboard["data"]; data?: TrackerDashboard["data"] }>(
        `${base(orgId)}/dashboard`,
        params,
      );
      return { ...res, data: res?.items ?? res?.data ?? [] } as TrackerDashboard;
    },
    enabled: !!orgId,
  });
}

export function useApplicationTimeline(applicationIdOrNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-timeline", orgId, applicationIdOrNo],
    queryFn: async () => asArray(await apiGet<StatusLogEntry[]>(`${base(orgId)}/${enc(applicationIdOrNo!)}/timeline`)),
    enabled: !!orgId && !!applicationIdOrNo,
  });
}

export function useApplicationProgress(applicationIdOrNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-progress", orgId, applicationIdOrNo],
    queryFn: () => apiGet<ApplicationProgress>(`${base(orgId)}/${enc(applicationIdOrNo!)}/progress`),
    enabled: !!orgId && !!applicationIdOrNo,
  });
}

export function useChangeApplicationStage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      ...dto
    }: {
      applicationId: string;
      stage: string;
      internalRemarks?: string;
      applicantVisible?: boolean;
      slaDays?: number;
    }) => apiPost(`${base(orgId)}/${enc(applicationId)}/stage`, dto),
    onSuccess: () => {
      invalidateTracker(qc);
      toast.success("Application stage updated");
    },
  });
}

export function useBulkChangeStage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { applicationIds: string[]; stage: string; internalRemarks?: string; applicantVisible?: boolean }) =>
      apiPost<any>(`${base(orgId)}/bulk-stage`, dto),
    onSuccess: (res: any) => {
      invalidateTracker(qc);
      const n = res?.updated ?? res?.count;
      toast.success(n !== undefined ? `${n} application(s) updated` : "Applications updated");
    },
  });
}

export function useBulkAssignCounsellor() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { applicationIds: string[]; assignedCounselorId: string | null }) =>
      apiPost<any>(`${base(orgId)}/bulk-assign`, dto),
    onSuccess: () => {
      invalidateTracker(qc);
      toast.success("Counsellor assignment updated");
    },
  });
}

export function useEvaluateApplication() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => apiPost<any>(`${base(orgId)}/${enc(applicationId)}/evaluate`),
    onSuccess: () => invalidateTracker(qc),
  });
}

export function useUpdateApplicationMaster() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      ...dto
    }: {
      applicationId: string;
      assignedCounselorId?: string | null;
      applicationSource?: string | null;
      academicSession?: string;
    }) => apiPatch(`${base(orgId)}/${enc(applicationId)}/master`, dto),
    onSuccess: () => {
      invalidateTracker(qc);
      qc.invalidateQueries({ queryKey: ["application"] });
      toast.success("Application details updated");
    },
  });
}

export function useWorkflowSettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-tracker", "settings", orgId],
    queryFn: () => apiGet<WorkflowSettings>(`${base(orgId)}/settings`),
    enabled: !!orgId,
  });
}

export function useUpdateWorkflowSettings() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Pick<WorkflowSettings, "stageSlaDays" | "requiredDocumentTypes" | "maxDocumentSizeMb" | "notifyApplicantOnStageChange">>) =>
      apiPut<WorkflowSettings>(`${base(orgId)}/settings`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-tracker", "settings"] });
      toast.success("Workflow settings saved");
    },
  });
}

export function useTrackerCounsellors() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-tracker", "counsellors", orgId],
    queryFn: async () =>
      asArray(await apiGet<{ id: string; name: string; email: string; role: string }[]>(`${base(orgId)}/counsellors`)),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
