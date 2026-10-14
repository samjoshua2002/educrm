"use client";

import * as React from "react";
import { CheckCircle2, CreditCard, Globe, Loader2, PlugZap, Save, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { usePageHeader } from "@/hooks/use-page-header";
import { useGatewaySettings, useTestGateway, useUpdateGatewaySetting } from "@/hooks/use-payments";
import type { GatewaySetting } from "@/types/application-management";
import { PAYMENT_METHODS } from "@/types/application-management";

const GATEWAY_INFO: Record<string, string> = {
  razorpay: "UPI, cards, net banking and wallets for Indian payments (Checkout + Orders API).",
  stripe: "International card payments in USD and other currencies (Checkout Sessions).",
  payu: "UPI, cards, net banking and wallets through PayU hosted checkout.",
  paytm: "UPI, cards, net banking and Paytm wallet through Paytm hosted checkout.",
};

function GatewayCard({ setting, webhookBaseUrl }: { setting: GatewaySetting; webhookBaseUrl: string | null }) {
  const update = useUpdateGatewaySetting();
  const test = useTestGateway();
  const [form, setForm] = React.useState(() => ({
    mode: setting.mode,
    currency: setting.currency,
    feeAmount: setting.feeAmount != null ? String(setting.feeAmount) : "",
    methods: setting.methods,
    credentials: { ...setting.credentials },
    displayName: setting.displayName || "",
  }));

  React.useEffect(() => {
    setForm({
      mode: setting.mode,
      currency: setting.currency,
      feeAmount: setting.feeAmount != null ? String(setting.feeAmount) : "",
      methods: setting.methods,
      credentials: { ...setting.credentials },
      displayName: setting.displayName || "",
    });
  }, [setting]);

  const isIntl = form.currency !== "INR";
  const webhookUrl = webhookBaseUrl
    ? `${webhookBaseUrl}/${setting.gateway}/${setting.webhookPath.split("/").pop()}`
    : `${process.env.NEXT_PUBLIC_API_URL || ""}${setting.webhookPath.replace(/^\/api/, "")}`;

  const save = (extra: Record<string, any> = {}) =>
    update.mutate({
      gateway: setting.gateway,
      mode: form.mode,
      currency: form.currency,
      feeAmount: form.feeAmount === "" ? null : Number(form.feeAmount),
      methods: form.methods,
      credentials: form.credentials,
      displayName: form.displayName || null,
      ...extra,
    });

  return (
    <div className="rounded-[12px] border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-[#FAFAFA] dark:bg-muted/10 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            {setting.gateway === "stripe" ? <Globe className="size-5" /> : <CreditCard className="size-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">{setting.label}</h3>
              {setting.active ? (
                <Badge className="bg-green-500/10 text-green-700 border-0 text-[10px]">Active</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
              )}
              {setting.isDefault && (
                <Badge className="bg-blue-500/10 text-blue-700 border-0 text-[10px] gap-1">
                  <Star className="size-3" /> Default
                </Badge>
              )}
              {setting.usingServerKeys && <Badge variant="outline" className="text-[10px]">Server keys</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{GATEWAY_INFO[setting.gateway]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch checked={setting.isEnabled} disabled={update.isPending} onCheckedChange={(v) => save({ isEnabled: v })} />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {setting.fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label className="text-xs">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                className="h-9"
                placeholder={f.secret && setting.credentials[f.key] ? "Saved — type to replace" : ""}
                value={form.credentials[f.key] || ""}
                onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, [f.key]: e.target.value } })}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Mode</Label>
            <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v as any })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test / Sandbox</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Currency</Label>
            <Select
              value={["INR", "USD"].includes(form.currency) ? form.currency : "Other"}
              onValueChange={(v) => setForm({ ...form, currency: v === "Other" ? "EUR" : v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="USD">USD (international)</SelectItem>
                <SelectItem value="Other">Other (international)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!["INR", "USD"].includes(form.currency) && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">ISO currency code</Label>
              <Input
                className="h-9 uppercase"
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </div>
          )}
          {isIntl && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Fee amount ({form.currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-9"
                value={form.feeAmount}
                onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Label shown to students</Label>
            <Input className="h-9" placeholder={setting.label} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
        </div>
        {!isIntl && <p className="text-[11px] text-muted-foreground -mt-2">INR payments use the application fee (and any active discount) from Fee Settings.</p>}

        <div className="flex flex-col gap-2">
          <Label className="text-xs">Payment methods</Label>
          <div className="flex flex-wrap gap-4">
            {PAYMENT_METHODS.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={form.methods.includes(m)}
                  onCheckedChange={(v) =>
                    setForm({ ...form, methods: v ? [...form.methods, m] : form.methods.filter((x) => x !== m) })
                  }
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 text-xs flex flex-col gap-1">
          <span className="font-semibold text-foreground">Webhook URL (real-time confirmation)</span>
          <code className="break-all text-muted-foreground">{webhookUrl}</code>
          {(setting.gateway === "payu" || setting.gateway === "paytm") && (
            <span className="text-muted-foreground">Browser callbacks are handled automatically; also add this URL as the server notification / webhook URL in the {setting.label} dashboard.</span>
          )}
        </div>

        {setting.lastTestResult && (
          <p className={`text-xs ${setting.lastTestResult.startsWith("OK") ? "text-green-700" : "text-red-600"}`}>
            Last test: {setting.lastTestResult}
          </p>
        )}

        <Separator />
        <div className="flex flex-wrap justify-end gap-2">
          {!setting.isDefault && setting.isEnabled && (
            <Button variant="outline" size="sm" className="gap-1.5" disabled={update.isPending} onClick={() => save({ isDefault: true })}>
              <Star className="size-3.5" /> Make default
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" disabled={test.isPending} onClick={() => test.mutate(setting.gateway)}>
            {test.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlugZap className="size-3.5" />}
            Test connection
          </Button>
          <Button size="sm" className="gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white" disabled={update.isPending} onClick={() => save()}>
            {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentGatewaysPage() {
  usePageHeader({
    title: "Payment Gateways",
    description: "Enable Razorpay, Stripe, PayU and Paytm, store their keys, choose the default gateway and allowed payment methods.",
    action: { label: "Fee Settings", href: "/organization/settings/fees" },
  });
  const { data, isLoading } = useGatewaySettings();
  const enabledCount = data?.settings.filter((s) => s.active).length ?? 0;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-5xl">
      <div className="rounded-[12px] border border-border bg-card px-5 py-4 flex items-center gap-3 shadow-sm">
        <CheckCircle2 className={`size-5 ${enabledCount ? "text-green-600" : "text-muted-foreground"}`} />
        <p className="text-sm text-foreground">
          {enabledCount
            ? `${enabledCount} gateway(s) active. Students choose among the active gateways on the payment page.`
            : "No gateway is active yet. Students cannot pay online until at least one gateway is enabled."}
        </p>
      </div>
      {isLoading || !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        data.settings.map((s) => <GatewayCard key={s.gateway} setting={s} webhookBaseUrl={data.webhookBaseUrl} />)
      )}
    </div>
  );
}
