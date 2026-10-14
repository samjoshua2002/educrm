"use client";

import * as React from "react";
import { CheckCircle2, Loader2, RefreshCw, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageHeader } from "@/hooks/use-page-header";
import { useMessagingSettings, useTestMessagingSettings, useUpdateMessagingSettings } from "@/hooks/use-messaging";
import { TIME_ZONES } from "@/types/communications";
import { CopyField, Field, SectionCard, pill } from "../../communications/_components/comm-ui";

type Draft = Record<string, any>;

function Secret({ label, set, hint, value, onChange }: { label: string; set?: boolean; hint?: string | null; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint={set ? `Saved (${hint}). Leave empty to keep it.` : undefined}>
      <Input className="h-10" type="password" autoComplete="new-password" placeholder={set ? "••••••••" : ""} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Ready({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span className={`${ok ? pill.green : pill.amber} inline-flex items-center gap-1`}>
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />} {label} {ok ? "ready" : "not configured"}
    </span>
  );
}

export default function MessagingSettingsPage() {
  usePageHeader({
    title: "SMS & WhatsApp",
    description: "Provider credentials (Twilio, MSG91, Gupshup), opt-in rules and delivery-status webhooks.",
  });
  const { data: s, isLoading } = useMessagingSettings();
  const save = useUpdateMessagingSettings();
  const test = useTestMessagingSettings();
  const [d, setD] = React.useState<Draft>({});
  const [testTo, setTestTo] = React.useState("");
  const [testChannel, setTestChannel] = React.useState<"SMS" | "WhatsApp">("SMS");

  React.useEffect(() => {
    if (!s) return;
    setD({
      smsProvider: s.smsProvider || "none",
      whatsappProvider: s.whatsappProvider || "none",
      defaultCountryCode: s.defaultCountryCode || "91",
      defaultTimeZone: s.defaultTimeZone || "Asia/Kolkata",
      requireOptInForMarketing: s.requireOptInForMarketing,
      requireOptInForAll: s.requireOptInForAll,
      twilioAccountSid: s.twilioAccountSid || "",
      twilioAuthToken: "",
      twilioSmsFrom: s.twilioSmsFrom || "",
      twilioMessagingServiceSid: s.twilioMessagingServiceSid || "",
      twilioWhatsappFrom: s.twilioWhatsappFrom || "",
      gupshupApiKey: "",
      gupshupSourceNumber: s.gupshupSourceNumber || "",
      gupshupAppName: s.gupshupAppName || "",
      msg91AuthKey: "",
      msg91SenderId: s.msg91SenderId || "",
      msg91FlowId: s.msg91FlowId || "",
      msg91DltEntityId: s.msg91DltEntityId || "",
    });
  }, [s]);

  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));
  const usesTwilio = d.smsProvider === "twilio" || d.whatsappProvider === "twilio";

  if (isLoading || !s) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Ready ok={s.smsReady} label="SMS" />
        <Ready ok={s.whatsappReady} label="WhatsApp" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <SectionCard title="Providers">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="SMS provider">
                <Select value={d.smsProvider || "none"} onValueChange={(v) => set("smsProvider", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Disabled</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="msg91">MSG91</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="WhatsApp provider">
                <Select value={d.whatsappProvider || "none"} onValueChange={(v) => set("whatsappProvider", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Disabled</SelectItem>
                    <SelectItem value="twilio">Twilio WhatsApp</SelectItem>
                    <SelectItem value="gupshup">Gupshup</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default country code">
                <Input className="h-10" value={d.defaultCountryCode || ""} onChange={(e) => set("defaultCountryCode", e.target.value)} />
              </Field>
              <Field label="Default time zone">
                <Select value={d.defaultTimeZone || "Asia/Kolkata"} onValueChange={(v) => set("defaultTimeZone", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([d.defaultTimeZone || "Asia/Kolkata", ...TIME_ZONES])).map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          {usesTwilio && (
            <SectionCard title="Twilio" description="Console → Account info. SMS uses a sender number or a Messaging Service.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Account SID">
                  <Input className="h-10" value={d.twilioAccountSid || ""} onChange={(e) => set("twilioAccountSid", e.target.value)} />
                </Field>
                <Secret label="Auth token" set={s.twilioAuthTokenSet} hint={s.twilioAuthTokenHint} value={d.twilioAuthToken || ""} onChange={(v) => set("twilioAuthToken", v)} />
                {d.smsProvider === "twilio" && (
                  <>
                    <Field label="SMS sender number (E.164)">
                      <Input className="h-10" placeholder="+14155550100" value={d.twilioSmsFrom || ""} onChange={(e) => set("twilioSmsFrom", e.target.value)} />
                    </Field>
                    <Field label="Messaging Service SID (optional)">
                      <Input className="h-10" value={d.twilioMessagingServiceSid || ""} onChange={(e) => set("twilioMessagingServiceSid", e.target.value)} />
                    </Field>
                  </>
                )}
                {d.whatsappProvider === "twilio" && (
                  <Field label="WhatsApp sender number (E.164)">
                    <Input className="h-10" placeholder="+14155238886" value={d.twilioWhatsappFrom || ""} onChange={(e) => set("twilioWhatsappFrom", e.target.value)} />
                  </Field>
                )}
              </div>
            </SectionCard>
          )}

          {d.smsProvider === "msg91" && (
            <SectionCard title="MSG91" description="Flow API — the message text is passed to your DLT-approved flow as the variable “message”.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Secret label="Auth key" set={s.msg91AuthKeySet} hint={s.msg91AuthKeyHint} value={d.msg91AuthKey || ""} onChange={(v) => set("msg91AuthKey", v)} />
                <Field label="Sender ID">
                  <Input className="h-10" value={d.msg91SenderId || ""} onChange={(e) => set("msg91SenderId", e.target.value)} />
                </Field>
                <Field label="Flow (template) ID">
                  <Input className="h-10" value={d.msg91FlowId || ""} onChange={(e) => set("msg91FlowId", e.target.value)} />
                </Field>
                <Field label="DLT entity ID (India)">
                  <Input className="h-10" value={d.msg91DltEntityId || ""} onChange={(e) => set("msg91DltEntityId", e.target.value)} />
                </Field>
              </div>
            </SectionCard>
          )}

          {d.whatsappProvider === "gupshup" && (
            <SectionCard title="Gupshup WhatsApp">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Secret label="API key" set={s.gupshupApiKeySet} hint={s.gupshupApiKeyHint} value={d.gupshupApiKey || ""} onChange={(v) => set("gupshupApiKey", v)} />
                <Field label="Source number">
                  <Input className="h-10" value={d.gupshupSourceNumber || ""} onChange={(e) => set("gupshupSourceNumber", e.target.value)} />
                </Field>
                <Field label="App name">
                  <Input className="h-10" value={d.gupshupAppName || ""} onChange={(e) => set("gupshupAppName", e.target.value)} />
                </Field>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Delivery-status & inbound webhooks" description="Paste these into the provider console so delivery, read receipts and replies (incl. STOP) are recorded.">
            <CopyField label="Twilio (status callback & incoming messages)" value={s.webhookUrls.twilio} />
            <CopyField label="Gupshup (callback URL)" value={s.webhookUrls.gupshup} />
            <CopyField label="MSG91 (delivery report webhook)" value={s.webhookUrls.msg91} />
            <Button variant="outline" size="sm" className="self-start gap-1.5" onClick={() => save.mutate({ regenerateWebhookToken: true })}>
              <RefreshCw className="size-3.5" /> Regenerate webhook token
            </Button>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <SectionCard title="Consent / opt-in">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Require opt-in for Marketing messages
                <span className="block text-xs text-muted-foreground">Recommended (TRAI / WhatsApp policy).</span>
              </span>
              <Switch checked={!!d.requireOptInForMarketing} onCheckedChange={(v) => set("requireOptInForMarketing", v)} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Require opt-in for every message
                <span className="block text-xs text-muted-foreground">Reminders, OTPs and alerts too.</span>
              </span>
              <Switch checked={!!d.requireOptInForAll} onCheckedChange={(v) => set("requireOptInForAll", v)} />
            </label>
            <p className="text-xs text-muted-foreground">Numbers that opted out (or replied STOP) are never messaged.</p>
          </SectionCard>

          <SectionCard title="Save">
            <Button
              className="gap-1.5"
              disabled={save.isPending}
              onClick={() => {
                const payload: Draft = { ...d };
                ["twilioAuthToken", "gupshupApiKey", "msg91AuthKey"].forEach((k) => {
                  if (!payload[k]) delete payload[k];
                });
                save.mutate(payload);
              }}
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
            </Button>
          </SectionCard>

          <SectionCard title="Send a test message">
            <Field label="Channel">
              <Select value={testChannel} onValueChange={(v) => setTestChannel(v as any)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mobile number">
              <Input className="h-10" placeholder="98765 43210" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            </Field>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={testTo.replace(/\D+/g, "").length < 6 || test.isPending}
              onClick={() => test.mutate({ channel: testChannel, to: testTo, countryCode: d.defaultCountryCode })}
            >
              {test.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send test
            </Button>
            <p className="text-[11px] text-muted-foreground">Save the settings first. WhatsApp tests need an open 24-hour session or an approved template.</p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
