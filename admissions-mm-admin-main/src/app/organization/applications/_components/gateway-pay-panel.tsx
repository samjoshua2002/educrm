"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Globe, Loader2, Lock, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startGatewayCheckout, useAvailableGateways, type PendingPaymentContext } from "@/hooks/use-payments";

function money(amount: number, currency: string) {
  if (currency === "INR") return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  try {
    return Number(amount).toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

/**
 * Lets the student choose among the gateways the organization enabled
 * (Razorpay / Stripe / PayU / Paytm) and starts checkout.
 */
export function GatewayPayPanel({
  applicationId,
  purpose = "application_fee",
  offerAcceptanceId,
  context,
  onSuccess,
  beforeCheckout,
  compact,
}: {
  applicationId: string;
  purpose?: "application_fee" | "seat_booking_fee";
  offerAcceptanceId?: string;
  /** Saved for redirect gateways and used by /payment-status after returning. */
  context?: Omit<PendingPaymentContext, "paymentId">;
  onSuccess?: () => void | Promise<void>;
  /** Runs before checkout starts (e.g. to save data server-side before a redirect gateway). */
  beforeCheckout?: () => Promise<void>;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useAvailableGateways(applicationId, { purpose, offerAcceptanceId });
  const [selected, setSelected] = React.useState<string>("");
  const [state, setState] = React.useState<"idle" | "working" | "success" | "failed">("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data?.gateways?.length && !selected) {
      setSelected((data.gateways.find((g) => g.isDefault) || data.gateways[0]).gateway);
    }
  }, [data, selected]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-[#2563EB]" />
      </div>
    );
  }
  if (!data?.gateways?.length) {
    return <p className="text-sm text-slate-500">Online payment is not available yet. Please contact the admissions office.</p>;
  }

  const chosen = data.gateways.find((g) => g.gateway === selected) || data.gateways[0];

  const pay = async () => {
    setError(null);
    setState("working");
    try {
      await beforeCheckout?.();
      const res = await startGatewayCheckout({
        applicationId,
        gateway: chosen.gateway,
        purpose,
        offerAcceptanceId,
        context: { ...(context || {}), returnTo: context?.returnTo || window.location.pathname },
      });
      if (res.status === "redirected") return; // browser leaves the page
      if (res.status === "success") {
        setState("success");
        qc.invalidateQueries({ queryKey: ["application-progress"] });
        qc.invalidateQueries({ queryKey: ["application-payments"] });
        qc.invalidateQueries({ queryKey: ["available-gateways"] });
        qc.invalidateQueries({ queryKey: ["active-application"] });
        await onSuccess?.();
      } else {
        setState("failed");
        setError(res.error || "Payment was not completed.");
      }
    } catch (e: any) {
      setState("failed");
      setError(e?.response?.data?.message || e?.message || "Unable to start the payment.");
    }
  };

  if (state === "success") {
    return (
      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
        <CheckCircle2 className="size-6 text-emerald-600 mx-auto" />
        <p className="font-bold text-emerald-900 text-sm">Payment successful</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={`grid gap-2.5 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {data.gateways.map((g) => {
          const active = g.gateway === chosen.gateway;
          return (
            <button
              key={g.gateway}
              type="button"
              onClick={() => setSelected(g.gateway)}
              className={`text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer ${
                active ? "border-[#2563EB] bg-blue-50/60 ring-1 ring-[#2563EB]" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  {g.international ? <Globe className="size-4 text-slate-500" /> : <CreditCard className="size-4 text-slate-500" />}
                  {g.label}
                </span>
                <span className="text-sm font-bold text-[#2563EB]">{money(g.amount, g.currency)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {g.methods.join(" · ")}
                {g.international ? " · International" : ""}
                {g.mode === "test" ? " · Test mode" : ""}
              </p>
            </button>
          );
        })}
      </div>

      {state === "failed" && error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <XCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <Button
        className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white h-11 text-sm font-semibold gap-2"
        disabled={state === "working"}
        onClick={pay}
      >
        {state === "working" ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        {state === "working" ? "Processing..." : `Pay ${money(chosen.amount, chosen.currency)} via ${chosen.label}`}
      </Button>
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <Lock className="size-3" /> Secure checkout · {chosen.label}
      </div>
    </div>
  );
}
