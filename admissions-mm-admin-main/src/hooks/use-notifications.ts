import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  InAppNotificationItem,
  NotificationFilters,
  NotificationListResponse,
  NotificationModuleSummary,
} from "@/types/notifications";

/** How often the bell checks for new notifications. */
export const NOTIFICATION_POLL_MS = 45_000;

function clean(f?: NotificationFilters) {
  const out: Record<string, string | number> = {};
  Object.entries(f || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") out[k] = v as any;
  });
  return out;
}

function normalizeList(res: any): NotificationListResponse {
  if (res && Array.isArray(res.data)) {
    return {
      data: res.data,
      total: Number(res.total ?? res.pagination?.total ?? res.data.length) || 0,
      page: Number(res.page ?? res.pagination?.page ?? 1) || 1,
      limit: Number(res.limit ?? res.pagination?.limit ?? res.data.length) || 20,
    };
  }
  if (Array.isArray(res)) return { data: res, total: res.length, page: 1, limit: res.length };
  return { data: [], total: 0, page: 1, limit: 20 };
}

export function useNotifications(filters?: NotificationFilters, options?: { poll?: boolean }) {
  const userId = useAuthStore((s) => s.user?.id);
  const params = clean(filters);
  return useQuery({
    queryKey: ["notifications", "list", userId, params],
    queryFn: async () => normalizeList(await apiGet<any>("/in-app-notifications", params)),
    enabled: !!userId,
    placeholderData: keepPreviousData,
    refetchInterval: options?.poll ? NOTIFICATION_POLL_MS : false,
  });
}

export function useUnreadNotificationCount() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["notifications", "unread-count", userId],
    queryFn: () => apiGet<{ unread: number; critical: number }>("/in-app-notifications/unread-count"),
    enabled: !!userId,
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationSummary() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["notifications", "summary", userId],
    queryFn: async () => {
      const res = await apiGet<{ modules: NotificationModuleSummary[] }>("/in-app-notifications/summary");
      return res?.modules || [];
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read = true }: { id: string; read?: boolean }) =>
      apiPatch<InAppNotificationItem>(`/in-app-notifications/${id}/${read ? "read" : "unread"}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (module?: string) =>
      apiPatch<{ updated: number }>(
        `/in-app-notifications/read-all${module && module !== "all" ? `?module=${encodeURIComponent(module)}` : ""}`,
        {},
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
