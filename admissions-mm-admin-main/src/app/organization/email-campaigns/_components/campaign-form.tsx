"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Loader2, Paperclip, Rocket, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourses } from "@/hooks/use-courses";
import { useAcademicSessions } from "@/hooks/use-academic-sessions";
import { useEmailTemplates, renderTemplate } from "@/hooks/use-email-templates";
import { useAudiencePreview } from "@/hooks/use-email-campaigns";
import { browserTimeZone, toWallClock } from "@/lib/scheduled-communications";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_ATTACHMENT_TYPES,
  CAMPAIGN_FREQUENCIES,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_TRIGGER_EVENTS,
  CAMPAIGN_TYPES,
  CAMPAIGN_VARIABLES,
  SEGMENT_CRITERIA,
  STOP_CONDITIONS,
  TARGET_AUDIENCES,
  TEMPLATE_LANGUAGES,
  TIME_ZONES,
  type EmailCampaign,
  type EmailCampaignInput,
} from "@/types/communications";
import { ChipToggleGroup, Field, ReadOnlyField, SectionCard, StatusPill, formatDateTime, pill } from "../../communications/_components/comm-ui";

const STEPS = ["Campaign information", "Email content", "Automation & scheduling", "Review"] as const;

const SAMPLE = {
  first_name: "Aarav",
  name: "Aarav Sharma",
  program: "PGDM 2026-28",
  application_no: "APP-2026-00123",
  date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
};

interface FormState {
  name: string;
  campaignType: string;
  objective: string;
  targetCourseId: string;
  targetProgram: string;
  academicYear: string;
  intakeTerm: string;
  targetAudience: string[];
  segmentCriteria: string[];
  templateId: string;
  subject: string;
  preHeader: string;
  htmlBody: string;
  textBody: string;
  attachments: { name: string; url: string; type: string }[];
  language: string;
  footerAddress: string;
  footerText: string;
  senderName: string;
  triggerEvent: string;
  deadlineAt: string;
  scheduledAt: string;
  endAt: string;
  frequency: string;
  maxSendsPerRecipient: number;
  timeZone: string;
  stopConditions: string[];
}

function fromCampaign(c?: EmailCampaign | null): FormState {
  const tz = c?.timeZone || browserTimeZone();
  return {
    name: c?.name || "",
    campaignType: c?.campaignType || "Manual",
    objective: c?.objective || "Lead Nurture",
    targetCourseId: c?.targetCourseId || "",
    targetProgram: c?.targetProgram || "",
    academicYear: c?.academicYear || "",
    intakeTerm: c?.intakeTerm || "",
    targetAudience: c?.targetAudience?.length ? c.targetAudience : ["Prospects"],
    segmentCriteria: c?.segmentCriteria || [],
    templateId: c?.templateId || "",
    subject: c?.subject || "",
    preHeader: c?.preHeader || "",
    htmlBody: c?.htmlBody || "",
    textBody: c?.textBody || "",
    attachments: (c?.attachments || []).map((a) => ({ name: a.name, url: a.url, type: a.type || "Other" })),
    language: c?.language || "English",
    footerAddress: c?.footerAddress || "",
    footerText: c?.footerText || "",
    senderName: c?.senderName || "",
    triggerEvent: c?.triggerEvent || "",
    deadlineAt: toWallClock(c?.deadlineAt, tz),
    scheduledAt: toWallClock(c?.scheduledAt, tz),
    endAt: toWallClock(c?.endAt, tz),
    frequency: c?.frequency || "One-time",
    maxSendsPerRecipient: c?.maxSendsPerRecipient || 1,
    timeZone: tz,
    stopConditions: c?.stopConditions || [],
  };
}

export function toPayload(f: FormState): EmailCampaignInput {
  return {
    name: f.name.trim(),
    campaignType: f.campaignType,
    objective: f.objective,
    targetCourseId: f.targetCourseId || null,
    targetProgram: f.targetProgram || null,
    academicYear: f.academicYear || null,
    intakeTerm: f.intakeTerm || null,
    targetAudience: f.targetAudience,
    segmentCriteria: f.segmentCriteria,
    templateId: f.templateId || null,
    subject: f.subject,
    preHeader: f.preHeader || null,
    htmlBody: f.htmlBody,
    textBody: f.textBody || null,
    attachments: f.attachments.filter((a) => a.url),
    language: f.language,
    footerAddress: f.footerAddress || null,
    footerText: f.footerText || null,
    senderName: f.senderName || null,
    triggerEvent: f.triggerEvent || null,
    deadlineAt: f.deadlineAt || null,
    scheduledAt: f.scheduledAt || null,
    endAt: f.endAt || null,
    frequency: f.frequency,
    maxSendsPerRecipient: Number(f.maxSendsPerRecipient) || 1,
    timeZone: f.timeZone,
    stopConditions: f.stopConditions,
  };
}

/** Create / edit wizard for email campaigns. */
export function CampaignForm({
  initial,
  saving,
  onSave,
}: {
  initial?: EmailCampaign | null;
  saving?: boolean;
  /** activate = save and activate */
  onSave: (payload: EmailCampaignInput, activate: boolean) => void;
}) {
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState<FormState>(() => fromCampaign(initial));
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  const { data: courses } = useCourses(1, 200);
  const { data: sessions } = useAcademicSessions(1, 100);
  const { data: templates = [] } = useEmailTemplates(undefined, undefined, "approved", { type: "Email" });
  const audience = useAudiencePreview();

  const courseList: any[] = (courses as any)?.data || [];
  const sessionList: any[] = (sessions as any)?.data || [];

  const eventMode = f.campaignType === "Trigger-based" || f.frequency === "Event-based";

  const applyTemplate = (id: string) => {
    set("templateId", id === "none" ? "" : id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setF((s) => ({
      ...s,
      templateId: id,
      subject: t.subject || s.subject,
      htmlBody: [t.header, t.body, t.signature].filter(Boolean).join("\n\n"),
      footerText: t.footer || s.footerText,
      language: t.language || s.language,
    }));
  };

  const insertVar = (tag: string) => {
    const el = bodyRef.current;
    const cur = f.htmlBody;
    if (!el) return set("htmlBody", cur + tag);
    const a = el.selectionStart ?? cur.length;
    const b = el.selectionEnd ?? cur.length;
    set("htmlBody", cur.slice(0, a) + tag + cur.slice(b));
  };

  const checkAudience = () =>
    audience.mutate({
      targetCourseId: f.targetCourseId || null,
      academicYear: f.academicYear || null,
      intakeTerm: f.intakeTerm || null,
      targetAudience: f.targetAudience,
      segmentCriteria: f.segmentCriteria,
      stopConditions: f.stopConditions,
    });

  const stepValid = [
    !!f.name.trim() && f.targetAudience.length > 0,
    !!f.subject.trim() && !!(f.htmlBody.trim() || f.textBody.trim()),
    (f.campaignType !== "Trigger-based" || !!f.triggerEvent) && (f.triggerEvent !== "Deadline Missed" || !!f.deadlineAt),
    true,
  ];
  const allValid = stepValid.every(Boolean);

  const previewHtml = renderTemplate(f.htmlBody, SAMPLE);
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(previewHtml);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 h-9 px-3 rounded-full border text-xs font-medium cursor-pointer",
                step === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px]",
                  stepValid[i] && i < step ? "bg-emerald-600 text-white" : step === i ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {stepValid[i] && i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        {step === 0 && (
          <SectionCard title="1. Campaign information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Campaign name" required className="sm:col-span-2">
                <Input className="h-10" value={f.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Campaign type" required>
                <Select value={f.campaignType} onValueChange={(v) => set("campaignType", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Campaign objective" required>
                <Select value={f.objective} onValueChange={(v) => set("objective", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_OBJECTIVES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Target program / course">
                <Select
                  value={f.targetCourseId || "all"}
                  onValueChange={(v) => {
                    const c = courseList.find((x) => x.id === v);
                    setF((s) => ({ ...s, targetCourseId: v === "all" ? "" : v, targetProgram: c?.name || "" }));
                  }}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programs</SelectItem>
                    {courseList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Academic year">
                <Select value={f.academicYear || "all"} onValueChange={(v) => set("academicYear", v === "all" ? "" : v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {sessionList.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.displayName || s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Intake term" hint="Matches the lead's intake, e.g. Fall 2026 (prospects).">
                <Input className="h-10" value={f.intakeTerm} onChange={(e) => set("intakeTerm", e.target.value)} />
              </Field>
              <Field label="Target audience" required className="sm:col-span-2">
                <ChipToggleGroup options={TARGET_AUDIENCES} value={f.targetAudience} onChange={(v) => set("targetAudience", v)} />
              </Field>
              <Field label="Segment criteria" hint="Applies to applicants / admitted / waitlisted. All selected criteria must match." className="sm:col-span-2">
                <ChipToggleGroup options={SEGMENT_CRITERIA} value={f.segmentCriteria} onChange={(v) => set("segmentCriteria", v)} />
              </Field>
            </div>
            <div className="flex flex-col gap-3 rounded-[8px] border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Audience preview</p>
                  <p className="text-xs text-muted-foreground">Resolved from leads and applications, excluding the suppression list.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={checkAudience} disabled={audience.isPending}>
                  {audience.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Users className="size-3.5" />} Count recipients
                </Button>
              </div>
              {audience.data && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={pill.blue}>{audience.data.total} reachable</span>
                    {Object.entries(audience.data.byAudience).map(([k, v]) => (
                      <span key={k} className={pill.gray}>
                        {k}: {v}
                      </span>
                    ))}
                    {audience.data.suppressed > 0 && <span className={pill.amber}>{audience.data.suppressed} suppressed</span>}
                  </div>
                  {audience.data.sample.length > 0 && (
                    <div className="max-h-[180px] overflow-y-auto rounded-md border border-border text-xs">
                      {audience.data.sample.map((m) => (
                        <div key={m.email} className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/60 last:border-0">
                          <span className="truncate">
                            {m.name || "—"} <span className="text-muted-foreground">· {m.email}</span>
                          </span>
                          <span className="text-muted-foreground shrink-0">{m.audienceType}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {step === 1 && (
          <SectionCard title="2. Email content">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start from template (approved)">
                <Select value={f.templateId || "none"} onValueChange={applyTemplate}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Language">
                <Select value={f.language} onValueChange={(v) => set("language", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([f.language, ...TEMPLATE_LANGUAGES])).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Subject line" required className="sm:col-span-2">
                <Input className="h-10" value={f.subject} onChange={(e) => set("subject", e.target.value)} />
              </Field>
              <Field label="Pre-header text" hint="Shown after the subject in most inboxes." className="sm:col-span-2">
                <Input className="h-10" value={f.preHeader} onChange={(e) => set("preHeader", e.target.value)} />
              </Field>
              <Field label="Sender name">
                <Input className="h-10" placeholder="Admissions Office" value={f.senderName} onChange={(e) => set("senderName", e.target.value)} />
              </Field>
            </div>
            <Field label="Personalization variables">
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN_VARIABLES.map((t) => (
                  <button key={t} type="button" onClick={() => insertVar(t)} className={cn(pill.blue, "cursor-pointer hover:opacity-80")}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Body content (HTML)" required hint="HTML or plain text. Links are tracked automatically (click rate).">
              <Textarea ref={bodyRef} rows={12} className="font-mono text-xs" value={f.htmlBody} onChange={(e) => set("htmlBody", e.target.value)} />
            </Field>
            <Field label="Text version (plain text)" hint="Leave empty to generate it from the HTML.">
              <Textarea rows={5} value={f.textBody} onChange={(e) => set("textBody", e.target.value)} />
            </Field>
            <Field label="Attachments (prospectus, offer letter, brochure)">
              <div className="flex flex-col gap-2">
                {f.attachments.map((a, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_2fr_auto] gap-2">
                    <Select value={a.type} onValueChange={(v) => set("attachments", f.attachments.map((x, j) => (j === i ? { ...x, type: v } : x)))}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_ATTACHMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input className="h-9" placeholder="File name" value={a.name} onChange={(e) => set("attachments", f.attachments.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <Input className="h-9" placeholder="https://…/file.pdf" value={a.url} onChange={(e) => set("attachments", f.attachments.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => set("attachments", f.attachments.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start gap-1.5"
                  onClick={() => set("attachments", [...f.attachments, { name: "", url: "", type: "Prospectus" }])}
                >
                  <Paperclip className="size-3.5" /> Add attachment
                </Button>
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Footer — institution address" hint="Defaults to the organization's address.">
                <Textarea rows={3} value={f.footerAddress} onChange={(e) => set("footerAddress", e.target.value)} />
              </Field>
              <Field label="Footer text" hint="An unsubscribe link is always added.">
                <Textarea rows={3} value={f.footerText} onChange={(e) => set("footerText", e.target.value)} />
              </Field>
            </div>
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard title="3. Automation & scheduling">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Frequency" required>
                <Select value={f.frequency} onValueChange={(v) => set("frequency", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_FREQUENCIES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trigger event" required={f.campaignType === "Trigger-based"} hint="Used by trigger-based / event-based campaigns.">
                <Select value={f.triggerEvent || "none"} onValueChange={(v) => set("triggerEvent", v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CAMPAIGN_TRIGGER_EVENTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {f.triggerEvent === "Deadline Missed" && (
                <Field label="Deadline" required hint="Sent once to recipients who have not submitted by this time.">
                  <Input type="datetime-local" className="h-10" value={f.deadlineAt} onChange={(e) => set("deadlineAt", e.target.value)} />
                </Field>
              )}
              {!eventMode && (
                <Field label="Scheduled send date & time" hint="Empty = send as soon as the campaign is activated.">
                  <Input type="datetime-local" className="h-10" value={f.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
                </Field>
              )}
              <Field label="Time zone">
                <Select value={f.timeZone} onValueChange={(v) => set("timeZone", v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([f.timeZone, ...TIME_ZONES])).map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Max send limit per applicant">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="h-10"
                  value={f.maxSendsPerRecipient}
                  onChange={(e) => set("maxSendsPerRecipient", Math.max(1, Number(e.target.value) || 1))}
                />
              </Field>
              {(f.frequency === "Daily" || f.frequency === "Weekly" || eventMode) && (
                <Field label="End date (optional)">
                  <Input type="datetime-local" className="h-10" value={f.endAt} onChange={(e) => set("endAt", e.target.value)} />
                </Field>
              )}
              <Field label="Stop condition" hint="Recipients who meet any of these are not emailed again." className="sm:col-span-2">
                <ChipToggleGroup options={STOP_CONDITIONS.map((s) => s)} value={f.stopConditions} onChange={(v) => set("stopConditions", v)} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {eventMode
                ? f.triggerEvent === "Signup"
                  ? "Every new lead / application that matches the audience gets this email (checked every 5 minutes)."
                  : f.triggerEvent === "Form Submission"
                    ? "Every application submitted after activation that matches the audience gets this email."
                    : f.triggerEvent === "Deadline Missed"
                      ? "After the deadline, everyone in the audience who has not submitted gets this email once."
                      : "Choose a trigger event."
                : f.frequency === "One-time"
                  ? "Sent once to the whole audience at the scheduled time."
                  : `Re-sent ${f.frequency.toLowerCase()} until each recipient reaches the max send limit or a stop condition.`}
            </p>
          </SectionCard>
        )}

        {step === 3 && (
          <SectionCard title="4. Review">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ReadOnlyField label="Name" value={f.name} />
              <ReadOnlyField label="Type / objective" value={`${f.campaignType} · ${f.objective}`} />
              <ReadOnlyField label="Program" value={f.targetProgram || "All programs"} />
              <ReadOnlyField label="Academic year / intake" value={[f.academicYear, f.intakeTerm].filter(Boolean).join(" · ") || "Any"} />
              <ReadOnlyField label="Audience" value={f.targetAudience.join(", ")} />
              <ReadOnlyField label="Segment" value={f.segmentCriteria.join(", ") || "—"} />
              <ReadOnlyField label="Frequency" value={f.frequency} />
              <ReadOnlyField label="Trigger" value={f.triggerEvent || "—"} />
              <ReadOnlyField label="Scheduled" value={f.scheduledAt ? `${f.scheduledAt.replace("T", " ")} (${f.timeZone})` : "On activation"} />
              <ReadOnlyField label="Max sends / stop" value={`${f.maxSendsPerRecipient} · ${f.stopConditions.join(", ") || "no stop condition"}`} />
            </div>
            <ReadOnlyField label="Subject" value={renderTemplate(f.subject, SAMPLE)} />
            {looksHtml ? (
              <iframe title="preview" sandbox="" srcDoc={previewHtml} className="w-full h-[420px] rounded-md border border-border bg-white" />
            ) : (
              <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-4 text-sm font-sans">{previewHtml}</pre>
            )}
          </SectionCard>
        )}

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="gap-1.5">
            <ChevronLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!stepValid[step]} className="gap-1.5">
              Next <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-4">
        <SectionCard title="Status">
          {initial ? (
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="Campaign ID" value={initial.campaignCode} />
              <ReadOnlyField label="Status" value={<StatusPill status={initial.status} />} />
              <ReadOnlyField label="Created by" value={initial.createdByName} />
              <ReadOnlyField label="Created date" value={formatDateTime(initial.createdAt)} />
              <ReadOnlyField label="Modified date" value={formatDateTime(initial.updatedAt)} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">New campaigns are saved as Draft. Activate to start sending.</p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" variant="outline" disabled={!stepValid[0] || saving} onClick={() => onSave(toPayload(f), false)} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save {initial?.status === "Active" ? "changes" : "as draft"}
            </Button>
            {initial?.status !== "Active" && (
              <Button type="button" disabled={!allValid || saving} onClick={() => onSave(toPayload(f), true)} className="gap-1.5">
                <Rocket className="size-4" /> Save & activate
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/organization/email-campaigns">Cancel</Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
