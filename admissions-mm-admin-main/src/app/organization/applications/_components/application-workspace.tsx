"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Circle,
  ClipboardList,
  CreditCard,
  FileCheck2,
  History,
  Loader2,
  Save,
  Send,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiGet } from "@/lib/api";
import {
  useApplicationProgress,
  useApplicationTimeline,
  useChangeApplicationStage,
  useTrackerCounsellors,
  useUpdateApplicationMaster,
} from "@/hooks/use-application-tracker";
import { useApplicationPayments } from "@/hooks/use-payments";
import {
  useApplicationReminders,
  useCloseReminder,
  useSendReminderNow,
  useUpdateReminderPreferences,
} from "@/hooks/use-reminders";
import { APPLICATION_SOURCES, REMINDER_CHANNELS, TRACKER_STAGES } from "@/types/application-management";
import { DocumentsPanel } from "./documents-panel";
import { GatewayPayPanel } from "./gateway-pay-panel";

const pill = "font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block";
const paymentPill: Record<string, string> = {
  Pending: `bg-yellow-500/10 text-yellow-700 ${pill}`,
  Success: `bg-green-500/10 text-green-700 ${pill}`,
  Failed: `bg-red-500/10 text-red-700 ${pill}`,
  Refunded: `bg-slate-500/10 text-slate-700 ${pill}`,
};

export function fmtDate(v?: string | null, withTime = true) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
  });
}

function SectionCard({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
      <CardHeader
        className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
        style={{ padding: "16px 20px" }}
      >
        <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B]">
          {icon}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">{label}</span>
      <div className="font-semibold text-sm text-[#1E293B] break-words">{children}</div>
    </div>
  );
}

/** Applicant view: step-wise progress tracker (also shown to staff). */
export function ProgressTracker({ applicationNo }: { applicationNo: string }) {
  const { data, isLoading } = useApplicationProgress(applicationNo);
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin text-[#2563EB]" />
      </div>
    );
  }
  if (!data) return null;
  const finalColor =
    data.currentStage === "Approved" ? "text-green-700" : data.currentStage === "Rejected" ? "text-red-700" : data.currentStage === "Waitlisted" ? "text-amber-700" : "text-[#2563EB]";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Current stage:</span>
          <span className={`text-sm font-bold ${finalColor}`}>{data.currentStage}</span>
          <Badge variant="secondary" className="text-[10px]">{data.applicationStatus}</Badge>
        </div>
        <span className="text-xs font-semibold text-slate-500">{data.percent}% complete</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${data.percent}%` }} />
      </div>
      <ol className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {data.steps.map((s) => (
          <li key={s.key} className="flex items-start gap-2">
            {s.state === "completed" ? (
              <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            ) : s.state === "current" ? (
              <Circle className="size-5 shrink-0 text-[#2563EB] fill-[#2563EB]/15" />
            ) : (
              <Circle className="size-5 shrink-0 text-slate-300" />
            )}
            <div className="flex flex-col">
              <span className={`text-xs font-semibold ${s.state === "upcoming" ? "text-slate-400" : "text-slate-800"}`}>{s.label}</span>
              {s.reachedAt && <span className="text-[10px] text-slate-400">{fmtDate(s.reachedAt, false)}</span>}
            </div>
          </li>
        ))}
      </ol>
      {data.nextAction && (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-800">
          <span className="font-semibold">Next step: </span>
          {data.nextAction}
        </div>
      )}
    </div>
  );
}

function Timeline({ applicationNo }: { applicationNo: string }) {
  const { data, isLoading } = useApplicationTimeline(applicationNo);
  if (isLoading) return <Loader2 className="size-5 animate-spin text-[#2563EB] mx-auto" />;
  if (!data?.length) return <p className="text-sm text-slate-500">No status changes recorded yet.</p>;
  return (
    <ol className="relative border-l border-slate-200 ml-2 flex flex-col gap-4">
      {[...data].reverse().map((l) => (
        <li key={l.id} className="ml-4">
          <span className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ${l.isCurrent ? "bg-[#2563EB]" : "bg-slate-300"}`} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400">SL-{l.statusLogId}</span>
            <span className="text-sm font-semibold text-slate-800">
              {l.previousStatus ? `${l.previousStatus} → ` : ""}
              {l.currentStatus}
            </span>
            {l.slaBreached && (
              <Badge className="bg-red-500/10 text-red-700 border-0 text-[10px] gap-1">
                <AlertTriangle className="size-3" /> SLA breached
              </Badge>
            )}
            {l.applicantVisible === false && <Badge variant="outline" className="text-[10px]">Internal</Badge>}
          </div>
          <p className="text-xs text-slate-500">
            {fmtDate(l.statusChangeDate)} · by {l.statusChangedBy}
            {l.source ? ` (${l.source})` : ""}
            {l.slaDays != null ? ` · SLA ${l.slaDays} day(s)${l.slaDueAt ? `, due ${fmtDate(l.slaDueAt)}` : ""}` : ""}
          </p>
          {l.internalRemarks && <p className="text-xs text-slate-700 mt-1 bg-slate-50 rounded px-2 py-1">{l.internalRemarks}</p>}
        </li>
      ))}
    </ol>
  );
}

function StageChanger({ applicationId, currentStage }: { applicationId: string; currentStage: string }) {
  const change = useChangeApplicationStage();
  const [stage, setStage] = React.useState(currentStage);
  const [remarks, setRemarks] = React.useState("");
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => setStage(currentStage), [currentStage]);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Move to stage</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKER_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label className="text-xs">Internal remarks</Label>
          <Textarea rows={1} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Visible to staff only" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox checked={visible} onCheckedChange={(v) => setVisible(!!v)} />
          Show this change to the applicant
        </label>
        <Button
          size="sm"
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5"
          disabled={change.isPending || stage === currentStage}
          onClick={() =>
            change.mutate(
              { applicationId, stage, internalRemarks: remarks || undefined, applicantVisible: visible },
              { onSuccess: () => setRemarks("") },
            )
          }
        >
          {change.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Update stage
        </Button>
      </div>
    </div>
  );
}

/** Application master fields (scope p.15) with editable counsellor & source. Staff only. */
function MasterFields({ applicationNo }: { applicationNo: string }) {
  const { data: app } = useQuery({
    queryKey: ["application-raw", applicationNo],
    queryFn: () => apiGet<any>(`/applications/${encodeURIComponent(applicationNo)}`),
  });
  const { data: counsellorList } = useTrackerCounsellors();
  const update = useUpdateApplicationMaster();
  const counsellors = counsellorList || [];

  if (!app) return <Loader2 className="size-5 animate-spin text-[#2563EB] mx-auto" />;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5">
        <Field label="Application ID">{app.applicationNo}</Field>
        <Field label="Applicant ID">{app.studentId || "—"}</Field>
        <Field label="Program Applied">{app.program || "—"}</Field>
        <Field label="Academic Year">{app.academicSession || "—"}</Field>
        <Field label="Application Status">{app.applicationStatus || "—"}</Field>
        <Field label="Application Start Date">{fmtDate(app.createdAt)}</Field>
        <Field label="Application Submission Date">{fmtDate(app.submittedAt)}</Field>
        <Field label="Last Updated">{fmtDate(app.updatedAt)}</Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Assigned Counsellor</Label>
          <Select
            value={app.assignedCounselorId || "unassigned"}
            onValueChange={(v) => update.mutate({ applicationId: app.id, assignedCounselorId: v === "unassigned" ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {counsellors.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Application Source</Label>
          <Select
            value={app.applicationSource || "none"}
            onValueChange={(v) => update.mutate({ applicationId: app.id, applicationSource: v === "none" ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {APPLICATION_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <StageChanger applicationId={app.id} currentStage={app.currentStage || "Application Started"} />
    </div>
  );
}

function PaymentsList({ applicationNo }: { applicationNo: string }) {
  const { data, isLoading } = useApplicationPayments(applicationNo);
  if (isLoading) return <Loader2 className="size-5 animate-spin text-[#2563EB] mx-auto" />;
  if (!data?.length) return <p className="text-sm text-slate-500">No payment attempts yet.</p>;
  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {data.map((p) => (
        <div key={p.paymentId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-slate-800">
              PAY-{String(p.paymentNo).padStart(6, "0")} · {p.purpose === "seat_booking_fee" ? "Seat booking fee" : "Application fee"}
            </span>
            <span className="text-xs text-slate-500">
              {p.gatewayLabel}
              {p.method ? ` · ${p.method}` : ""}
              {p.transactionId ? ` · Txn ${p.transactionId}` : ""} · {fmtDate(p.paidAt)}
            </span>
            {p.failureReason && p.status === "Failed" && <span className="text-xs text-red-600">{p.failureReason}</span>}
            {p.refundStatus && p.refundStatus !== "Not Initiated" && (
              <span className="text-xs text-slate-500">
                Refund {p.refundStatus} · {p.currency} {Number(p.refundAmount || 0).toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">
              {p.currency} {Number(p.amount).toFixed(2)}
            </span>
            <span className={paymentPill[p.status]}>{p.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RemindersSection({ applicationNo, isStudent }: { applicationNo: string; isStudent: boolean }) {
  const { data, isLoading } = useApplicationReminders(applicationNo);
  const prefs = useUpdateReminderPreferences();
  const send = useSendReminderNow();
  const close = useCloseReminder();
  if (isLoading) return <Loader2 className="size-5 animate-spin text-[#2563EB] mx-auto" />;
  if (!data) return null;
  const optOut = data.preferences.optOutChannels || [];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-slate-800">{isStudent ? "Send me reminders about pending steps" : "Applicant has opted in to reminders"}</span>
          <Switch
            checked={data.preferences.remindersOptIn}
            disabled={prefs.isPending}
            onCheckedChange={(v) => prefs.mutate({ applicationId: applicationNo, remindersOptIn: v })}
          />
        </label>
        {data.preferences.remindersOptIn && (
          <div className="flex flex-wrap gap-4">
            {REMINDER_CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={!optOut.includes(c)}
                  onCheckedChange={(v) =>
                    prefs.mutate({ applicationId: applicationNo, optOutChannels: v ? optOut.filter((x) => x !== c) : [...optOut, c] })
                  }
                />
                {c}
              </label>
            ))}
          </div>
        )}
      </div>
      {data.reminders.length === 0 ? (
        <p className="text-sm text-slate-500">No reminders sent for this application.</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {data.reminders.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-slate-800">
                  {r.reminderType} <span className="text-xs font-normal text-slate-400">· {r.triggerEvent}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {r.reminderChannels.join(", ")} · attempt {r.attemptCount}
                  {r.reminderSentDate ? ` · sent ${fmtDate(r.reminderSentDate)}` : ""}
                  {!r.isClosed && r.nextScheduledDate ? ` · next ${fmtDate(r.nextScheduledDate)}` : ""}
                </span>
                {!isStudent && r.lastError && <span className="text-xs text-red-600">{r.lastError}</span>}
              </div>
              <div className="flex items-center gap-2">
                {r.reminderStatus && (
                  <span className={r.reminderStatus === "Sent" ? `bg-green-500/10 text-green-700 ${pill}` : `bg-red-500/10 text-red-700 ${pill}`}>
                    {r.reminderStatus}
                  </span>
                )}
                {r.isClosed ? (
                  <Badge variant="secondary" className="text-[10px]">{r.applicantResponse || "Closed"}</Badge>
                ) : (
                  !isStudent && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={send.isPending} onClick={() => send.mutate(r.id)}>
                        <Send className="size-3" /> Send now
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={close.isPending} onClick={() => close.mutate({ id: r.id, applicantResponse: "No Action" })}>
                        <XCircle className="size-3" /> Close
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Application management workspace used on the application detail page (staff)
 * and on the student's "My Application" page: progress tracker, fee payment,
 * documents with verification, status timeline, reminders.
 */
export function ApplicationWorkspace({
  applicationNo,
  applicationId,
  isStudent,
}: {
  applicationNo: string;
  applicationId?: string;
  isStudent: boolean;
}) {
  const { data: progress } = useApplicationProgress(applicationNo);
  const unpaid = progress && !["success", "paid"].includes((progress.paymentStatus || "").toLowerCase());

  return (
    <div className="flex flex-col gap-6">
      <SectionCard icon={<ClipboardList className="h-5 w-5 text-[#415876]" />} title={isStudent ? "Application Progress" : "Application Status Tracker"}>
        <ProgressTracker applicationNo={applicationNo} />
      </SectionCard>

      {isStudent && unpaid && (
        <SectionCard icon={<CreditCard className="h-5 w-5 text-[#415876]" />} title="Pay Application Fee">
          <GatewayPayPanel applicationId={applicationId || applicationNo} />
        </SectionCard>
      )}

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="documents" className="gap-1.5">
            <FileCheck2 className="size-4" /> Documents
          </TabsTrigger>
          {!isStudent && (
            <TabsTrigger value="master" className="gap-1.5">
              <ClipboardList className="size-4" /> Application Master
            </TabsTrigger>
          )}
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="size-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <History className="size-4" /> Status Timeline
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-1.5">
            <BellRing className="size-4" /> Reminders
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel applicationNo={applicationNo} isStudent={isStudent} />
        </TabsContent>
        {!isStudent && (
          <TabsContent value="master" className="mt-4">
            <SectionCard icon={<ClipboardList className="h-5 w-5 text-[#415876]" />} title="Application Master">
              <MasterFields applicationNo={applicationNo} />
            </SectionCard>
          </TabsContent>
        )}
        <TabsContent value="payments" className="mt-4">
          <SectionCard icon={<CreditCard className="h-5 w-5 text-[#415876]" />} title="Fee Payments">
            <PaymentsList applicationNo={applicationNo} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <SectionCard icon={<History className="h-5 w-5 text-[#415876]" />} title={isStudent ? "Application Updates" : "Status Timeline (audit log)"}>
            <Timeline applicationNo={applicationNo} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <SectionCard icon={<BellRing className="h-5 w-5 text-[#415876]" />} title="Reminders & Nudges">
            <RemindersSection applicationNo={applicationNo} isStudent={isStudent} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
