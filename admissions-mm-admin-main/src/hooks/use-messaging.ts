import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { MessageLog, MessageStats, MessagingConsent, MessagingSettings } from "@/types/communications";
import { useOrgId } from "./use-communications";

export interface MessageLogFilters {
  channel?: string;
  status?: string;
  messageType?: string;
  direction?: string;
  search?: string;
  applicationId?: string;
  leadId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const clean = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== "all"));

export function useMessageLogs(page = 1, limit = 20, filters: MessageLogFilters = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["messaging", "logs", orgId, page, limit, filters],
    queryFn: () => apiGet<PaginatedResponse<MessageLog>>(`/organizations/${orgId}/messaging/logs`, clean({ page, limit, ...filters })),
    enabled: !!orgId,
  });
}

export function useMessageStats() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["messaging", "stats", orgId],
    queryFn: () => apiGet<MessageStats>(`/organizations/${orgId}/messaging/stats`),
    enabled: !!orgId,
  });
}

export interface SendMessageInput {
  channel: "SMS" | "WhatsApp";
  applicationId?: string;
  leadId?: string;
  to?: string;
  countryCode?: string;
  recipientName?: string;
  preferredLanguage?: string;
  body: string;
  messageType?: string;
  templateId?: string;
  mediaUrl?: string;
  ctaLink?: string;
  triggerEvent?: string;
  scheduledAt?: string;
  timeZone?: string;
  priority?: string;
}

export function useSendMessage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendMessageInput) =>
      apiPost<{ success: boolean; messageLogId?: string; error?: string }>(`/organizations/${orgId}/messaging/send`, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["messaging"] });
      qc.invalidateQueries({ queryKey: ["communications"] });
      if (res?.success) toast.success("Message processed");
      else toast.error(res?.error || "Message could not be sent");
    },
  });
}

export function useSendBulkMessage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<SendMessageInput, "applicationId" | "leadId" | "to" | "countryCode" | "recipientName"> & {
      recipients: { applicationId?: string; leadId?: string; to?: string; countryCode?: string; recipientName?: string }[];
    }) => apiPost<any>(`/organizations/${orgId}/messaging/send-bulk`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messaging"] });
      qc.invalidateQueries({ queryKey: ["communications"] });
      toast.success("Bulk messages processed");
    },
  });
}

export function useRetryMessage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/organizations/${orgId}/messaging/logs/${id}/retry`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messaging"] });
      toast.success("Message retried");
    },
  });
}

export function useCancelMessage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPost<any>(`/organizations/${orgId}/messaging/logs/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messaging"] });
      toast.success("Scheduled message cancelled");
    },
  });
}

export function useMessagingSettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["messaging", "settings", orgId],
    queryFn: () => apiGet<MessagingSettings>(`/organizations/${orgId}/messaging/settings`),
    enabled: !!orgId,
  });
}

export function useUpdateMessagingSettings() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => apiPatch<MessagingSettings>(`/organizations/${orgId}/messaging/settings`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messaging", "settings"] });
      toast.success("Messaging settings saved");
    },
  });
}

export function useTestMessagingSettings() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (payload: { channel: "SMS" | "WhatsApp"; to: string; countryCode?: string }) =>
      apiPost<{ success: boolean; error?: string }>(`/organizations/${orgId}/messaging/settings/test`, payload),
    onSuccess: (res) => {
      if (res?.success) toast.success("Test message sent");
      else toast.error(res?.error || "Test message failed");
    },
  });
}

export function useConsents(page = 1, limit = 20, filters: { search?: string; channel?: string; status?: string } = {}) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["messaging", "consents", orgId, page, limit, filters],
    queryFn: () => apiGet<PaginatedResponse<MessagingConsent>>(`/organizations/${orgId}/messaging/consents`, clean({ page, limit, ...filters })),
    enabled: !!orgId,
  });
}

export function useSetConsent() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { mobile: string; countryCode?: string; channel: "SMS" | "WhatsApp"; status: "Opted In" | "Opted Out"; source?: string; applicationId?: string; leadId?: string }) =>
      apiPost<MessagingConsent>(`/organizations/${orgId}/messaging/consents`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messaging", "consents"] });
      toast.success("Consent updated");
    },
  });
}
