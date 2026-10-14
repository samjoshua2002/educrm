import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import { useOrgId } from "@/hooks/use-application-tracker";
import type {
  AvailableGatewaysResponse,
  CheckoutResponse,
  GatewaySetting,
  GatewaySettingsResponse,
  PaymentAdminRecord,
  PaymentPublicView,
  PaymentRefundRecord,
  ReconciliationFilters,
  ReconciliationResponse,
} from "@/types/application-management";

/** Row of the payments list (scope: Payment_ID ... Finance_Remarks). */
export type PaymentRecord = PaymentAdminRecord;

export interface PaymentStats {
  totalCollected: number;
  successfulOrders: number;
  pendingCount: number;
  failedCount: number;
  totalOrders: number;
  avgPayment: number;
  refundedCount: number;
  refundedAmount: number;
  unmatchedCount: number;
}

/** GET /payments returns {data,total,...}; the response interceptors turn it into {data, pagination}. */
export interface PaymentsResponse {
  data: PaymentRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function usePayments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
  gateway?: string;
  reconciliationStatus?: string;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 200;
  const search = params?.search || "";
  const status = params?.status || "all";
  const purpose = params?.purpose || "all";
  const dateFrom = params?.dateFrom || "";
  const dateTo = params?.dateTo || "";
  const gateway = params?.gateway || "all";
  const reconciliationStatus = params?.reconciliationStatus || "all";

  return useQuery<PaymentsResponse>({
    queryKey: ["payments", { page, limit, search, status, purpose, dateFrom, dateTo, gateway, reconciliationStatus }],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", String(limit));
      if (search) q.set("search", search);
      if (status !== "all") q.set("status", status);
      if (purpose !== "all") q.set("purpose", purpose);
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);
      if (gateway !== "all") q.set("gateway", gateway);
      if (reconciliationStatus !== "all") q.set("reconciliationStatus", reconciliationStatus);
      return apiGet<PaymentsResponse>(`/payments?${q.toString()}`);
    },
  });
}

export function usePaymentStats() {
  return useQuery<PaymentStats>({
    queryKey: ["payments-stats"],
    queryFn: () => apiGet<PaymentStats>("/payments/stats"),
  });
}

function invalidatePayments(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["payments"] });
  qc.invalidateQueries({ queryKey: ["payments-stats"] });
  qc.invalidateQueries({ queryKey: ["payment-reconciliation"] });
  qc.invalidateQueries({ queryKey: ["payment-detail"] });
  qc.invalidateQueries({ queryKey: ["application-payments"] });
}

// ---------------------------------------------------------------------------
// Finance / admin
// ---------------------------------------------------------------------------

export function usePaymentDetail(paymentId?: string | null) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["payment-detail", orgId, paymentId],
    queryFn: () => apiGet<PaymentAdminRecord & { refunds: PaymentRefundRecord[] }>(`/organizations/${orgId}/payments/${paymentId}`),
    enabled: !!orgId && !!paymentId && !paymentId.startsWith("app_pay_"),
  });
}

export function useRefundPayment() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string }) =>
      apiPost<{ refund: PaymentRefundRecord; payment: PaymentAdminRecord }>(`/organizations/${orgId}/payments/${paymentId}/refund`, {
        amount,
        reason,
      }),
    onSuccess: (res) => {
      invalidatePayments(qc);
      toast.success(res?.refund?.status === "Completed" ? "Refund completed" : "Refund initiated with the gateway");
    },
    onError: () => invalidatePayments(qc),
  });
}

export function useReconciliation(filters: ReconciliationFilters) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["payment-reconciliation", orgId, filters],
    queryFn: async (): Promise<ReconciliationResponse> => {
      const q: Record<string, any> = {};
      for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "" && v !== "all") q[k] = v;
      // Rows arrive under items so the summary survives the response wrapper.
      const res = await apiGet<any>(`/organizations/${orgId}/payments/reconciliation`, q);
      const p = res?.pagination;
      return {
        data: Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [],
        total: p?.total ?? res?.total ?? 0,
        totalPages: p?.totalPages ?? res?.totalPages ?? 1,
        page: p?.page ?? res?.page ?? 1,
        limit: p?.limit ?? res?.limit ?? 20,
        summary: res?.summary,
      };
    },
    enabled: !!orgId,
  });
}

export function useRunReconciliation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { dateFrom?: string; dateTo?: string; gateway?: string }) =>
      apiPost<{ checked: number; matched: number; unmatched: number; recovered: number; errors: number }>(
        `/organizations/${orgId}/payments/reconciliation/run`,
        dto,
      ),
    onSuccess: (r) => {
      invalidatePayments(qc);
      toast.success(
        `Checked ${r.checked} payment(s): ${r.matched} matched, ${r.unmatched} unmatched${r.recovered ? `, ${r.recovered} recovered` : ""}${r.errors ? `, ${r.errors} errors` : ""}`,
      );
    },
  });
}

export function useUpdateReconciliation() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, ...dto }: { paymentId: string; reconciliationStatus?: string; financeRemarks?: string }) =>
      apiPatch<PaymentAdminRecord>(`/organizations/${orgId}/payments/${paymentId}/reconciliation`, dto),
    onSuccess: () => {
      invalidatePayments(qc);
      toast.success("Reconciliation updated");
    },
  });
}

/** Downloads the daily / weekly reconciliation report (CSV or Excel). */
export async function downloadReconciliationReport(
  orgId: string,
  params: { period?: "daily" | "weekly"; date?: string; dateFrom?: string; dateTo?: string; format: "csv" | "xlsx"; gateway?: string },
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && v !== "all") q.set(k, String(v));
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  const res = await fetch(`${baseUrl}/organizations/${orgId}/payments/reconciliation/export?${q.toString()}`, {
    headers: { Authorization: `Bearer ${Cookies.get("auth_token") || ""}` },
    credentials: "include",
  });
  if (!res.ok) {
    toast.error("Could not download the report");
    return;
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const name = /filename="([^"]+)"/.exec(cd)?.[1] || `payment-reconciliation.${params.format === "xlsx" ? "xls" : "csv"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function useGatewaySettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["payment-gateways", orgId],
    queryFn: () => apiGet<GatewaySettingsResponse>(`/organizations/${orgId}/payments/gateways`),
    enabled: !!orgId,
  });
}

export function useUpdateGatewaySetting() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      gateway,
      ...dto
    }: {
      gateway: string;
      isEnabled?: boolean;
      isDefault?: boolean;
      mode?: string;
      currency?: string;
      feeAmount?: number | null;
      methods?: string[];
      credentials?: Record<string, string>;
      displayName?: string | null;
    }) => apiPut<GatewaySetting>(`/organizations/${orgId}/payments/gateways/${gateway}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-gateways"] });
      toast.success("Payment gateway saved");
    },
  });
}

export function useTestGateway() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gateway: string) => apiPost<{ success: boolean; message: string }>(`/organizations/${orgId}/payments/gateways/${gateway}/test`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["payment-gateways"] });
      if (r.success) toast.success(r.message);
      else toast.error(r.message);
    },
  });
}

// ---------------------------------------------------------------------------
// Student checkout
// ---------------------------------------------------------------------------

export function useAvailableGateways(applicationIdOrNo?: string, opts?: { purpose?: string; offerAcceptanceId?: string }) {
  return useQuery({
    queryKey: ["available-gateways", applicationIdOrNo, opts?.purpose, opts?.offerAcceptanceId],
    queryFn: () =>
      apiGet<AvailableGatewaysResponse>(`/payments/gateways/${encodeURIComponent(applicationIdOrNo!)}`, {
        purpose: opts?.purpose,
        offerAcceptanceId: opts?.offerAcceptanceId,
      }),
    enabled: !!applicationIdOrNo,
  });
}

export function useApplicationPayments(applicationIdOrNo?: string) {
  return useQuery({
    queryKey: ["application-payments", applicationIdOrNo],
    queryFn: async () => {
      // Array endpoints arrive as {data, pagination}.
      const res = await apiGet<PaymentPublicView[] | { data: PaymentPublicView[] }>(
        `/payments/application/${encodeURIComponent(applicationIdOrNo!)}`,
      );
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: !!applicationIdOrNo,
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => apiPost<PaymentPublicView>(`/payments/${paymentId}/confirm`),
    onSuccess: () => {
      invalidatePayments(qc);
      qc.invalidateQueries({ queryKey: ["application-progress"] });
      qc.invalidateQueries({ queryKey: ["active-application"] });
    },
  });
}

const PENDING_KEY = "pending_gateway_payment";

export interface PendingPaymentContext {
  paymentId: string;
  applicationNo?: string;
  /** When set, the payment-status page submits the application after a successful payment. */
  submitAfterPayment?: boolean;
  returnTo?: string;
}

export function readPendingPayment(): PendingPaymentContext | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingPaymentContext) : null;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Starts checkout on the chosen gateway.
 * - Razorpay opens its modal; the promise resolves after the signature is verified.
 * - Stripe redirects; PayU / Paytm post a form to the gateway. The student returns to /payment-status.
 */
export async function startGatewayCheckout(opts: {
  applicationId: string;
  gateway: string;
  purpose?: "application_fee" | "seat_booking_fee";
  offerAcceptanceId?: string;
  context?: Omit<PendingPaymentContext, "paymentId">;
}): Promise<{ status: "success" | "failed" | "redirected" | "cancelled"; error?: string; paymentId?: string }> {
  const returnUrl = `${window.location.origin}/payment-status`;
  const res = await apiPost<CheckoutResponse>("/payments/checkout", {
    applicationId: opts.applicationId,
    gateway: opts.gateway,
    purpose: opts.purpose,
    offerAcceptanceId: opts.offerAcceptanceId,
    returnUrl,
  });
  const c = res.checkout;

  if (c.action === "razorpay_checkout") {
    const ok = await loadRazorpayScript();
    if (!ok) return { status: "failed", error: "Unable to load Razorpay. Check your connection and try again.", paymentId: res.paymentId };
    return new Promise((resolve) => {
      let settled = false;
      const done = (v: { status: "success" | "failed" | "cancelled"; error?: string }) => {
        if (settled) return;
        settled = true;
        resolve({ ...v, paymentId: res.paymentId });
      };
      const rzp = new (window as any).Razorpay({
        key: c.keyId,
        amount: c.amountMinor,
        currency: c.currency,
        name: res.description,
        description: `${res.description} - ${res.paymentNo}`,
        order_id: c.gatewayOrderId,
        prefill: res.prefill,
        method: c.methods,
        handler: async (r: any) => {
          try {
            await apiPost("/payments/razorpay/verify", {
              razorpay_order_id: r.razorpay_order_id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            });
            done({ status: "success" });
          } catch (e: any) {
            done({ status: "failed", error: e?.response?.data?.message || "Payment verification failed" });
          }
        },
        modal: {
          ondismiss: () => {
            apiPost("/payments/razorpay/fail", { orderId: res.paymentId, reason: "Payment cancelled by user" }).catch(() => {});
            done({ status: "cancelled", error: "Payment was cancelled." });
          },
        },
        theme: { color: "#2563EB" },
      });
      rzp.on("payment.failed", (resp: any) => {
        const desc = resp?.error?.description || "Payment failed";
        apiPost("/payments/razorpay/fail", { orderId: res.paymentId, reason: desc }).catch(() => {});
        done({ status: "failed", error: desc });
      });
      rzp.open();
    });
  }

  try {
    // Never persist secrets here: only ids and navigation hints survive the gateway redirect.
    const { applicationNo, submitAfterPayment, returnTo } = opts.context || {};
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ paymentId: res.paymentId, applicationNo, submitAfterPayment, returnTo }));
  } catch {
    /* ignore */
  }

  if (c.action === "redirect") {
    window.location.href = c.url;
    return { status: "redirected", paymentId: res.paymentId };
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = c.url;
  for (const [k, v] of Object.entries(c.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  return { status: "redirected", paymentId: res.paymentId };
}
