"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Plus, RefreshCw, Save, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageHeader } from "@/hooks/use-page-header";
import { useTeam } from "@/hooks/use-team";
import { useTelephonySettings, useTestTelephonySettings, useUpdateTelephonySettings } from "@/hooks/use-calls";
import { CopyField, Field, SectionCard, pill } from "../../communications/_components/comm-ui";

type Draft = Record<string, any>;

export default function TelephonySettingsPage() {
  usePageHeader({
    title: "Telephony",
    description: "Click-to-call and call logging with Exotel or Twilio Voice, plus call automation rules.",
  });
  const { data: s, isLoading } = useTelephonySettings();
  const save = useUpdateTelephonySettings();
  const test = useTestTelephonySettings();
  const { data: team } = useTeam(1, 100);
  const users: any[] = (team as any)?.data || [];
  const [d, setD] = React.useState<Draft>({});

  React.useEffect(() => {
    if (!s) return;
    setD({
      provider: s.provider || "none",
      defaultCountryCode: s.defaultCountryCode || "91",
      recordCalls: s.recordCalls,
      inboundForwardNumber: s.inboundForwardNumber || "",
      defaultDepartment: s.defaultDepartment || "",
      exotelAccountSid: s.exotelAccountSid || "",
      exotelApiKey: s.exotelApiKey || "",
      exotelApiToken: "",
      exotelSubdomain: s.exotelSubdomain || "api.exotel.com",
      exotelCallerId: s.exotelCallerId || "",
      twilioAccountSid: s.twilioAccountSid || "",
      twilioAuthToken: "",
      twilioCallerId: s.twilioCallerId || "",
      autoSmsAfterMissedCall: s.autoSmsAfterMissedCall,
      missedCallSmsText: s.missedCallSmsText || "",
      autoCreateFollowUpTask: s.autoCreateFollowUpTask,
      followUpDays: s.followUpDays ?? 1,
      autoTagApplicant: s.autoTagApplicant,
      tagRules: s.tagRules || [],
      agentLines: s.agentLines || [],
    });
  }, [s]);
  const set = (k: string, v: any) => setD((x) => ({ ...x, [k]: v }));

  if (isLoading || !s) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  const submit = () => {
    const payload: Draft = { ...d, followUpDays: Number(d.followUpDays) || 0 };
    ["exotelApiToken", "twilioAuthToken"].forEach((k) => {
      if (!payload[k]) delete payload[k];
    });
    payload.tagRules = (d.tagRules || []).filter((r: any) => r.keyword && r.tag);
    payload.agentLines = (d.agentLines || []).filter((l: any) => l.userId);
    save.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <span className={`${s.ready ? pill.green : pill.amber} inline-flex items-center gap-1`}>
          {s.ready ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />} Click-to-call {s.ready ? "ready" : "not configured"}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <SectionCard title="Provider">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telephony provider">
                <Select value={d.provider || "none"} onValueChange={(v) => set("provider", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Disabled (manual call logging only)</SelectItem>
                    <SelectItem value="exotel">Exotel</SelectItem>
                    <SelectItem value="twilio">Twilio Voice</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default country code">
                <Input className="h-10" value={d.defaultCountryCode || ""} onChange={(e) => set("defaultCountryCode", e.target.value)} />
              </Field>
              <Field label="Default department">
                <Input className="h-10" placeholder="Admissions" value={d.defaultDepartment || ""} onChange={(e) => set("defaultDepartment", e.target.value)} />
              </Field>
              <label className="flex items-center justify-between gap-3 rounded-[8px] border border-border px-3 text-sm h-10 self-end">
                Record calls
                <Switch checked={!!d.recordCalls} onCheckedChange={(v) => set("recordCalls", v)} />
              </label>
            </div>
          </SectionCard>

          {d.provider === "exotel" && (
            <SectionCard title="Exotel" description="Dashboard → API settings. The ExoPhone is shown to applicants as the caller id.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Account SID">
                  <Input className="h-10" value={d.exotelAccountSid || ""} onChange={(e) => set("exotelAccountSid", e.target.value)} />
                </Field>
                <Field label="API key">
                  <Input className="h-10" value={d.exotelApiKey || ""} onChange={(e) => set("exotelApiKey", e.target.value)} />
                </Field>
                <Field label="API token" hint={s.exotelApiTokenSet ? `Saved (${s.exotelApiTokenHint}). Leave empty to keep it.` : undefined}>
                  <Input className="h-10" type="password" autoComplete="new-password" value={d.exotelApiToken || ""} onChange={(e) => set("exotelApiToken", e.target.value)} />
                </Field>
                <Field label="API region">
                  <Select value={d.exotelSubdomain || "api.exotel.com"} onValueChange={(v) => set("exotelSubdomain", v)}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api.exotel.com">Singapore (api.exotel.com)</SelectItem>
                      <SelectItem value="api.in.exotel.com">Mumbai (api.in.exotel.com)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Caller ID (ExoPhone)">
                  <Input className="h-10" value={d.exotelCallerId || ""} onChange={(e) => set("exotelCallerId", e.target.value)} />
                </Field>
              </div>
            </SectionCard>
          )}

          {d.provider === "twilio" && (
            <SectionCard title="Twilio Voice">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Account SID">
                  <Input className="h-10" value={d.twilioAccountSid || ""} onChange={(e) => set("twilioAccountSid", e.target.value)} />
                </Field>
                <Field label="Auth token" hint={s.twilioAuthTokenSet ? `Saved (${s.twilioAuthTokenHint}). Leave empty to keep it.` : undefined}>
                  <Input className="h-10" type="password" autoComplete="new-password" value={d.twilioAuthToken || ""} onChange={(e) => set("twilioAuthToken", e.target.value)} />
                </Field>
                <Field label="Voice number / caller ID (E.164)">
                  <Input className="h-10" placeholder="+14155550100" value={d.twilioCallerId || ""} onChange={(e) => set("twilioCallerId", e.target.value)} />
                </Field>
                <Field label="Forward inbound calls to" hint="Inbound calls ring this number; unanswered calls are logged as Missed.">
                  <Input className="h-10" value={d.inboundForwardNumber || ""} onChange={(e) => set("inboundForwardNumber", e.target.value)} />
                </Field>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Agent lines" description="Phone each agent answers for click-to-call (falls back to the user's profile phone).">
            <div className="flex flex-col gap-2">
              {(d.agentLines || []).map((l: any, i: number) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2">
                  <Select
                    value={l.userId || "none"}
                    onValueChange={(v) => set("agentLines", d.agentLines.map((x: any, j: number) => (j === i ? { ...x, userId: v === "none" ? "" : v } : x)))}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select agent</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input className="h-9" placeholder="Phone" value={l.phone || ""} onChange={(e) => set("agentLines", d.agentLines.map((x: any, j: number) => (j === i ? { ...x, phone: e.target.value } : x)))} />
                  <Input className="h-9" placeholder="Extension / device" value={l.extension || ""} onChange={(e) => set("agentLines", d.agentLines.map((x: any, j: number) => (j === i ? { ...x, extension: e.target.value } : x)))} />
                  <Input className="h-9" placeholder="Department" value={l.department || ""} onChange={(e) => set("agentLines", d.agentLines.map((x: any, j: number) => (j === i ? { ...x, department: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => set("agentLines", d.agentLines.filter((_: any, j: number) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="self-start gap-1.5" onClick={() => set("agentLines", [...(d.agentLines || []), { userId: "", phone: "", extension: "", department: "" }])}>
                <Plus className="size-3.5" /> Add agent line
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Provider webhooks" description="Configure these so call status, recordings and inbound calls create call logs automatically.">
            {d.provider !== "twilio" && (
              <>
                <CopyField label="Exotel — status callback (used automatically by click-to-call)" value={s.webhookUrls.exotelStatus} />
                <CopyField label="Exotel — inbound Passthru applet URL" value={s.webhookUrls.exotelInbound} />
              </>
            )}
            {d.provider !== "exotel" && (
              <>
                <CopyField label="Twilio — voice webhook for incoming calls (number configuration)" value={s.webhookUrls.twilioInbound} />
                <CopyField label="Twilio — status callback (used automatically by click-to-call)" value={s.webhookUrls.twilioStatus} />
                <CopyField label="Twilio — recording status callback" value={s.webhookUrls.twilioRecording} />
              </>
            )}
            <Button variant="outline" size="sm" className="self-start gap-1.5" onClick={() => save.mutate({ regenerateWebhookToken: true })}>
              <RefreshCw className="size-3.5" /> Regenerate webhook token
            </Button>
          </SectionCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <SectionCard title="Automation actions" description="Defaults for new calls; each call can override them.">
            <label className="flex items-center justify-between gap-3 text-sm">
              Auto-SMS after missed call
              <Switch checked={!!d.autoSmsAfterMissedCall} onCheckedChange={(v) => set("autoSmsAfterMissedCall", v)} />
            </label>
            {d.autoSmsAfterMissedCall && (
              <Field label="Missed-call SMS text" hint="Merge fields: {{First_Name}} {{Name}} {{Program}}. Sent through the SMS provider (consent rules apply).">
                <Textarea rows={4} placeholder={s.defaultMissedCallSmsText} value={d.missedCallSmsText || ""} onChange={(e) => set("missedCallSmsText", e.target.value)} />
              </Field>
            )}
            <label className="flex items-center justify-between gap-3 text-sm">
              Auto-create follow-up task
              <Switch checked={!!d.autoCreateFollowUpTask} onCheckedChange={(v) => set("autoCreateFollowUpTask", v)} />
            </label>
            {d.autoCreateFollowUpTask && (
              <Field label="Follow-up due after (days)" hint="For missed / not-answered calls and “Follow-up Required” outcomes without a date.">
                <Input type="number" min={0} max={60} className="h-10" value={d.followUpDays ?? 1} onChange={(e) => set("followUpDays", e.target.value)} />
              </Field>
            )}
            <label className="flex items-center justify-between gap-3 text-sm">
              Auto-tag applicant from conversation
              <Switch checked={!!d.autoTagApplicant} onCheckedChange={(v) => set("autoTagApplicant", v)} />
            </label>
            {d.autoTagApplicant && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">When the transcription or agent notes contain the keyword, the tag is added.</p>
                {(d.tagRules || []).map((r: any, i: number) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input className="h-9" placeholder="Keyword" value={r.keyword} onChange={(e) => set("tagRules", d.tagRules.map((x: any, j: number) => (j === i ? { ...x, keyword: e.target.value } : x)))} />
                    <Input className="h-9" placeholder="Tag" value={r.tag} onChange={(e) => set("tagRules", d.tagRules.map((x: any, j: number) => (j === i ? { ...x, tag: e.target.value } : x)))} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => set("tagRules", d.tagRules.filter((_: any, j: number) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="self-start gap-1.5" onClick={() => set("tagRules", [...(d.tagRules || []), { keyword: "", tag: "" }])}>
                  <Plus className="size-3.5" /> Add rule
                </Button>
              </div>
            )}
          </SectionCard>
          <SectionCard title="Save">
            <Button className="gap-1.5" onClick={submit} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={() => test.mutate()} disabled={test.isPending || d.provider === "none"}>
              {test.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Check credentials
            </Button>
            <p className="text-[11px] text-muted-foreground">Save first, then check the saved credentials against the provider.</p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
