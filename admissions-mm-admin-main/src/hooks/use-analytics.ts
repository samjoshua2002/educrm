import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AnalyticsFilters,
  CampaignReport,
  CounselorReport,
  DashboardView,
  FilterOptions,
  FunnelReport,
  GeographyReport,
  OrgDashboard,
  PlatformOverview,
  TrendPoint,
} from "@/types/analytics";

/** Drops empty / "all" values so they are not sent as query params. */
export function cleanFilters(f?: AnalyticsFilters & Record<string, any>) {
  const out: Record<string, string> = {};
  Object.entries(f || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") out[k] = String(v);
  });
  return out;
}

function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId) || null;
}

function useOrgReport<T>(path: string, filters?: AnalyticsFilters & Record<string, any>, enabled = true) {
  const orgId = useOrgId();
  const params = cleanFilters(filters);
  return useQuery({
    queryKey: ["analytics", orgId, path, params],
    queryFn: () => apiGet<T>(`/organizations/${orgId}/analytics/${path}`, params),
    enabled: !!orgId && enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAnalyticsFilterOptions() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["analytics", orgId, "filter-options"],
    queryFn: () => apiGet<FilterOptions>(`/organizations/${orgId}/analytics/filter-options`),
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}

/** Role-based dashboard; refreshes every minute so it stays near real time. */
export function useOrgDashboard(view?: DashboardView, filters?: AnalyticsFilters) {
  const orgId = useOrgId();
  const params = cleanFilters({ ...filters, view });
  return useQuery({
    queryKey: ["analytics", orgId, "dashboard", params],
    queryFn: () => apiGet<OrgDashboard>(`/organizations/${orgId}/analytics/dashboard`, params),
    enabled: !!orgId,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export const useFunnelReport = (f?: AnalyticsFilters, enabled = true) =>
  useOrgReport<FunnelReport>("funnel", f, enabled);

export const useCampaignReport = (f?: AnalyticsFilters, enabled = true) =>
  useOrgReport<CampaignReport>("campaigns", f, enabled);

export const useGeographyReport = (f?: AnalyticsFilters, enabled = true) =>
  useOrgReport<GeographyReport>("geography", f, enabled);

export const useCounselorReport = (f?: AnalyticsFilters & { slaHours?: number }, enabled = true) =>
  useOrgReport<CounselorReport>("counselors", f, enabled);

export const useTrendReport = (f?: AnalyticsFilters, enabled = true) =>
  useOrgReport<TrendPoint[]>("trend", f, enabled);

// ── Superadmin ──────────────────────────────────────────────────────────────
export function usePlatformOverview() {
  return useQuery({
    queryKey: ["superadmin", "analytics", "overview"],
    queryFn: () => apiGet<PlatformOverview>("/superadmin/analytics/overview"),
    refetchInterval: 60_000,
  });
}

export function useRunPlatformAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<any>("/superadmin/analytics/alerts/run", {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      const created = typeof res?.created === "number" ? res.created : undefined;
      toast.success(
        created !== undefined ? `Alert check finished: ${created} new alert(s).` : "Alert check finished.",
      );
    },
  });
}
