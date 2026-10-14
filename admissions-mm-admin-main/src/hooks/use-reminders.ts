import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { useOrgId } from "@/hooks/use-application-tracker";
import type {
  ApplicationReminders,
  ReminderMeta,
  ReminderRecord,
  ReminderRule,
  RemindersResponse,
  ReminderTemplateOption,
} from "@/types/application-management";

const base = (orgId: string) => `/organizations/${orgId}/reminders`;
const enc = (v: string) => encodeURIComponent(v);
// Array endpoints arrive as { data, pagination } after the API interceptor.
const unwrap = <T,>(res: any): T[] => (Array.isArray(res) ? res : res?.data ?? []);

export function useReminderMeta() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["reminders", "meta", orgId],
    queryFn: () => apiGet<ReminderMeta>(`${base(orgId)}/meta`),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useReminderRules() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["reminders", "rules", orgId],
    queryFn: async () => unwrap<ReminderRule>(await apiGet<any>(`${base(orgId)}/rules`)),
    enabled: !!orgId,
  });
}

export function useUpdateReminderRule() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scenario, ...dto }: { scenario: string } & Partial<ReminderRule>) =>
      apiPut<ReminderRule>(`${base(orgId)}/rules/${scenario}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", "rules"] });
      toast.success("Reminder rule saved");
    },
  });
}

export function useReminderTemplates() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["reminders", "templates", orgId],
    queryFn: async () => unwrap<ReminderTemplateOption>(await apiGet<any>(`${base(orgId)}/templates`)),
    enabled: !!orgId,
  });
}

export function useReminders(params: {
  page?: number;
  limit?: number;
  reminderType?: string;
  reminderStatus?: string;
  applicantResponse?: string;
  state?: string;
  search?: string;
}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["reminders", "list", orgId, params],
    queryFn: () => {
      const q: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== "all") q[k] = v;
      return apiGet<RemindersResponse>(base(orgId), q);
    },
    enabled: !!orgId,
  });
}

export function useRunReminders() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<any>(`${base(orgId)}/run`),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["application-reminders"] });
      toast.success(
        `Checked ${res?.applicationsChecked ?? 0} application(s): ${res?.sent ?? 0} sent, ${res?.failed ?? 0} failed`,
      );
    },
  });
}

export function useApplicationReminders(applicationIdOrNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-reminders", orgId, applicationIdOrNo],
    queryFn: () => apiGet<ApplicationReminders>(`${base(orgId)}/application/${enc(applicationIdOrNo!)}`),
    enabled: !!orgId && !!applicationIdOrNo,
  });
}

export function useUpdateReminderPreferences() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, ...dto }: { applicationId: string; remindersOptIn?: boolean; optOutChannels?: string[] }) =>
      apiPatch(`${base(orgId)}/application/${enc(applicationId)}/preferences`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-reminders"] });
      toast.success("Reminder preferences updated");
    },
  });
}

export function useSendReminderNow() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<ReminderRecord>(`${base(orgId)}/${id}/send-now`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["application-reminders"] });
      if (r?.reminderStatus === "Failed") toast.error(r.lastError || "Reminder could not be sent");
      else toast.success("Reminder sent");
    },
  });
}

export function useCloseReminder() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, applicantResponse }: { id: string; applicantResponse?: string }) =>
      apiPatch(`${base(orgId)}/${id}/close`, { applicantResponse }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["application-reminders"] });
      toast.success("Reminder closed");
    },
  });
}
