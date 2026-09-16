import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

export interface PaymentRecord {
  id: string;
  applicationId: string;
  applicationNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  program: string;
  campus: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  purpose: "application_fee" | "seat_booking_fee";
  method: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  createdAt: string;
  paidAt?: string;
}

export interface PaymentStats {
  totalCollected: number;
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  totalOrders: number;
  avgPayment: number;
}

export interface PaymentsResponse {
  data: PaymentRecord[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export function usePayments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 200;
  const search = params?.search || "";
  const status = params?.status || "all";
  const purpose = params?.purpose || "all";
  const dateFrom = params?.dateFrom || "";
  const dateTo = params?.dateTo || "";

  return useQuery<PaymentsResponse>({
    queryKey: ["payments", { page, limit, search, status, purpose, dateFrom, dateTo }],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (page) q.set("page", String(page));
      if (limit) q.set("limit", String(limit));
      if (search) q.set("search", search);
      if (status && status !== "all") q.set("status", status);
      if (purpose && purpose !== "all") q.set("purpose", purpose);
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);

      const qs = q.toString();
      const url = qs ? `/payments?${qs}` : "/payments";
      return apiGet<PaymentsResponse>(url);
    },
  });
}

export function usePaymentStats() {
  return useQuery<PaymentStats>({
    queryKey: ["payments-stats"],
    queryFn: () => apiGet<PaymentStats>("/payments/stats"),
  });
}
