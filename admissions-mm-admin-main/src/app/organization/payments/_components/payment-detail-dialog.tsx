"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { usePaymentDetail, useRefundPayment, useUpdateReconciliation } from "@/hooks/use-payments";
import { useAuthStore } from "@/stores/auth-store";

export const pillBase = "font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center";

export const paymentStatusClass: Record<string, string> = {
  Pending: `bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 ${pillBase}`,
  Success: `bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 ${pillBase}`,
  Failed: `bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 ${pillBase}`,
  Refunded: `bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 ${pillBase}`,
};

export const reconciliationClass: Record<string, string> = {
  Matched: `bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 ${pillBase}`,
  Unmatched: `bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 ${pillBase}`,
};

export const refundClass: Record<string, string> = {
  "Not Initiated": `bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300 ${pillBase}`,
  "In Progress": `bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 ${pillBase}`,
  Completed: `bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 ${pillBase}`,
  Failed: `bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 ${pillBase}`,
};

export function formatMoney(amount: number | null | undefined, currency = "INR") {
  const n = Number(amount || 0);
  if (currency === "INR") return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  try {
    return n.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground break-all">{children}</div>
    </div>
  );
}

/** Payment record (scope fields), refunds (full / partial) and reconciliation for finance users. */
export function PaymentDetailDialog({
  paymentId,
  open,
  onOpenChange,
}: {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: p, isLoading } = usePaymentDetail(open ? paymentId : null);
  const refund = useRefundPayment();
  const recon = useUpdateReconciliation();
  // Backend: reconciliation update needs superadmin/org_admin/application_manager; counselors may only view.
  const role = useAuthStore((s) => s.user?.role);
  const isFinance = role === "superadmin" || role === "org_admin" || role === "application_manager";

  const [refundType, setRefundType] = React.useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = React.useState("");
  const [refundReason, setRefundReason] = React.useState("");
  const [reconStatus, setReconStatus] = React.useState("Unmatched");
  const [remarks, setRemarks] = React.useState("");

  React.useEffect(() => {
    if (p) {
      setReconStatus(p.reconciliationStatus || "Unmatched");
      setRemarks(p.financeRemarks || "");
      setRefundType("full");
      setRefundAmount("");
      setRefundReason("");
    }
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refundable = p ? Math.max(0, Number(p.amount) - Number(p.refundAmount || 0)) : 0;
  const canRefund = isFinance && !!p && p.paymentStatus === "Success" && refundable > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment {p?.paymentId || ""}</DialogTitle>
          <DialogDescription>Gateway transaction, refunds and reconciliation.</DialogDescription>
        </DialogHeader>

        {isLoading || !p ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border border-border bg-muted/20 p-4">
              <Field label="Payment ID">{p.paymentId}</Field>
              <Field label="Application ID">
                <Link className="hover:underline" href={`/organization/applications/${encodeURIComponent(p.applicationNo)}`}>
                  {p.applicationNo}
                </Link>
              </Field>
              <Field label="Payment Status">
                <span className={paymentStatusClass[p.paymentStatus]}>{p.paymentStatus}</span>
              </Field>
              <Field label="Payment Amount">{formatMoney(p.amount, p.currency)}</Field>
              <Field label="Currency">{p.currency === "INR" || p.currency === "USD" ? p.currency : `Other (${p.currency})`}</Field>
              <Field label="Payment Gateway">{p.gatewayLabel}</Field>
              <Field label="Transaction ID">{p.transactionId || "—"}</Field>
              <Field label="Payment Method">{p.method || "—"}{p.isInternational ? " · International" : ""}</Field>
              <Field label="Payment Date">{formatDateTime(p.paidAt)}</Field>
              <Field label="Gateway Order Ref">{p.gatewayOrderId || "—"}</Field>
              <Field label="Gateway Status">
                {p.gatewayStatus ? `${p.gatewayStatus}${p.gatewayAmount != null ? ` · ${formatMoney(p.gatewayAmount, p.currency)}` : ""}` : "Not checked"}
              </Field>
              <Field label="Purpose">{p.purpose === "seat_booking_fee" ? "Seat Booking Fee" : "Application Fee"}</Field>
            </div>
            {p.failureReason && <p className="text-xs text-red-600">Failure reason: {p.failureReason}</p>}

            {/* Reconciliation */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold">Reconciliation</h4>
              {p.reconciliationNotes && <p className="text-xs text-orange-700">{p.reconciliationNotes}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Reconciliation Status</Label>
                  <Select value={reconStatus} onValueChange={setReconStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matched">Matched</SelectItem>
                      <SelectItem value="Unmatched">Unmatched</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label className="text-xs">Finance Remarks</Label>
                  <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes for the finance team" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5"
                  disabled={recon.isPending || !isFinance}
                  onClick={() => recon.mutate({ paymentId: p.id, reconciliationStatus: reconStatus, financeRemarks: remarks })}
                >
                  {recon.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save
                </Button>
              </div>
            </div>

            <Separator />

            {/* Refunds */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Refunds</h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className={refundClass[p.refundStatus]}>{p.refundStatus}</span>
                  <span className="text-muted-foreground">Refunded {formatMoney(p.refundAmount, p.currency)}</span>
                </div>
              </div>

              {canRefund && (
                <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Refund Type</Label>
                      <Select value={refundType} onValueChange={(v) => setRefundType(v as any)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full ({formatMoney(refundable, p.currency)})</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {refundType === "partial" && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Refund Amount ({p.currency})</Label>
                        <Input
                          type="number"
                          min={1}
                          max={refundable}
                          step="0.01"
                          className="h-9"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                        />
                      </div>
                    )}
                    <div className={`flex flex-col gap-1.5 ${refundType === "partial" ? "" : "sm:col-span-2"}`}>
                      <Label className="text-xs">Reason</Label>
                      <Input className="h-9" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Duplicate payment" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
                      disabled={
                        refund.isPending ||
                        (refundType === "partial" && (!(Number(refundAmount) > 0) || Number(refundAmount) > refundable))
                      }
                      onClick={() => {
                        if (!window.confirm(`Refund ${refundType === "full" ? formatMoney(refundable, p.currency) : formatMoney(Number(refundAmount), p.currency)} through ${p.gatewayLabel}?`)) return;
                        refund.mutate({
                          paymentId: p.id,
                          amount: refundType === "partial" ? Number(refundAmount) : undefined,
                          reason: refundReason || undefined,
                        });
                      }}
                    >
                      {refund.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                      Initiate Refund
                    </Button>
                  </div>
                </div>
              )}

              {p.refunds?.length ? (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {p.refunds.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm">
                          {formatMoney(r.amount, p.currency)}{" "}
                          <Badge variant="secondary" className="ml-1 text-[10px] capitalize">
                            {r.refundType}
                          </Badge>
                        </span>
                        <span className="text-muted-foreground">
                          {formatDateTime(r.createdAt)} · Ref {r.reference}
                          {r.gatewayRefundId ? ` · Gateway ${r.gatewayRefundId}` : ""}
                        </span>
                        {r.reason && <span className="text-muted-foreground">Reason: {r.reason}</span>}
                        {r.error && <span className="text-red-600">{r.error}</span>}
                      </div>
                      <span className={refundClass[r.status]}>{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No refunds issued.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
