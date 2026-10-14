"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiPatch } from "@/lib/api";
import { usePageHeader } from "@/hooks/use-page-header";
import { clearPendingPayment, readPendingPayment, useConfirmPayment } from "@/hooks/use-payments";
import type { PaymentPublicView } from "@/types/application-management";

function PaymentStatusInner() {
  const params = useSearchParams();
  const confirm = useConfirmPayment();
  const [payment, setPayment] = React.useState<PaymentPublicView | null>(null);
  const [finalizing, setFinalizing] = React.useState(false);
  const [finalError, setFinalError] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState(false);
  const pending = React.useMemo(() => (typeof window !== "undefined" ? readPendingPayment() : null), []);
  const paymentId = params.get("paymentId") || pending?.paymentId || "";
  const returnTo = pending?.returnTo || "/my-application";

  usePageHeader({ title: "Payment Status", description: "Result of your fee payment." });

  React.useEffect(() => {
    if (!paymentId) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      attempts++;
      try {
        const p = await confirm.mutateAsync(paymentId);
        if (cancelled) return;
        setPayment(p);
        if (p.status === "Pending" && attempts < 6) {
          setTimeout(check, 3000);
          return;
        }
        if (p.status === "Success" && pending?.submitAfterPayment && pending.applicationNo) {
          setFinalizing(true);
          try {
            await apiPatch(`/applications/${encodeURIComponent(pending.applicationNo)}/submit`, pending.password ? { password: pending.password } : undefined);
          } catch (e: any) {
            setFinalError(e?.response?.data?.message || "Your payment was received but the application could not be submitted. Please contact support.");
          } finally {
            setFinalizing(false);
          }
        }
        if (p.status !== "Pending") clearPendingPayment();
      } catch {
        /* toast shown by api client */
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const status = payment?.status;
  const amount = payment ? `${payment.currency === "INR" ? "₹" : `${payment.currency} `}${Number(payment.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "";

  return (
    <div className="flex justify-center p-4 md:p-10 w-full">
      <div className="w-full max-w-lg rounded-[12px] border border-border bg-card shadow-sm p-8 flex flex-col items-center gap-4 text-center">
        {!checked || (status === "Pending" && confirm.isPending) || finalizing ? (
          <>
            <Loader2 className="size-10 animate-spin text-[#2563EB]" />
            <p className="text-sm text-muted-foreground">{finalizing ? "Submitting your application..." : "Confirming your payment with the gateway..."}</p>
          </>
        ) : !payment ? (
          <>
            <XCircle className="size-10 text-red-500" />
            <p className="text-sm font-semibold">We could not find this payment.</p>
          </>
        ) : status === "Success" ? (
          <>
            <CheckCircle2 className="size-12 text-emerald-600" />
            <h2 className="text-xl font-bold">Payment successful</h2>
            <p className="text-sm text-muted-foreground">
              {amount} paid via {payment.gatewayLabel}
              {payment.method ? ` (${payment.method})` : ""}.
            </p>
            {payment.transactionId && <p className="text-xs font-mono text-muted-foreground">Transaction ID: {payment.transactionId}</p>}
            {finalError && <p className="text-xs text-red-600">{finalError}</p>}
          </>
        ) : status === "Pending" ? (
          <>
            <Clock className="size-12 text-amber-500" />
            <h2 className="text-xl font-bold">Payment pending</h2>
            <p className="text-sm text-muted-foreground">
              {payment.gatewayLabel} has not confirmed this payment yet. It will update automatically once the gateway confirms it.
            </p>
          </>
        ) : (
          <>
            <XCircle className="size-12 text-red-500" />
            <h2 className="text-xl font-bold">Payment {status === "Refunded" ? "refunded" : "failed"}</h2>
            {payment.failureReason && <p className="text-sm text-muted-foreground">{payment.failureReason}</p>}
          </>
        )}
        {checked && !finalizing && (
          <Button asChild className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white mt-2">
            <Link href={returnTo}>{status === "Success" ? "Continue" : "Back to my application"}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center p-10">
          <Loader2 className="size-8 animate-spin text-[#2563EB]" />
        </div>
      }
    >
      <PaymentStatusInner />
    </React.Suspense>
  );
}
