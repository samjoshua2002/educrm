"use client";

import * as React from "react";
import Link from "next/link";
import { BellRing, Loader2, Play, Save, Send, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  useCloseReminder,
  useReminderRules,
  useReminders,
  useReminderTemplates,
  useRunReminders,
  useSendReminderNow,
  useUpdateReminderRule,
} from "@/hooks/use-reminders";
import { useUpdateWorkflowSettings, useWorkflowSettings } from "@/hooks/use-application-tracker";
import { DOCUMENT_TYPES, REMINDER_CHANNELS, TRACKER_STAGES } from "@/types/application-management";
import type { ReminderRule } from "@/types/application-management";

const pill = "font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block";
const statusPill: Record<string, string> = {
  Sent: `bg-green-500/10 text-green-700 ${pill}`,
  Failed: `bg-red-500/10 text-red-700 ${pill}`,
  Scheduled: `bg-yellow-500/10 text-yellow-700 ${pill}`,
};

function fmt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

function RuleCard({ rule, templates }: { rule: ReminderRule; templates: { id: string; name: string; channel: string }[] }) {
  const update = useUpdateReminderRule();
  const [f, setF] = React.useState(rule);
  React.useEffect(() => setF(rule), [rule]);
  const isDeadline = rule.scenario === "deadline_approaching";

  return (
    <div className="rounded-[12px] border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-[#FAFAFA] dark:bg-muted/10 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{rule.label}</h3>
            <Badge variant="secondary" className="text-[10px]">{rule.reminderType}</Badge>
            <Badge variant="outline" className="text-[10px]">{rule.triggerEvent}</Badge>
          </div>
          {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}
        </div>
        <Switch checked={f.isEnabled} onCheckedChange={(v) => update.mutate({ scenario: rule.scenario, isEnabled: v })} />
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Reminder channels</Label>
          <div className="flex flex-wrap gap-4">
            {REMINDER_CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={f.channels.includes(c)}
                  onCheckedChange={(v) => setF({ ...f, channels: v ? [...f.channels, c] : f.channels.filter((x) => x !== c) })}
                />
                {c}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">First reminder after (hours)</Label>
            <Input type="number" min={0} className="h-9" value={f.firstReminderAfterHours} onChange={(e) => setF({ ...f, firstReminderAfterHours: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Repeat every (hours)</Label>
            <Input type="number" min={1} className="h-9" value={f.frequencyHours} onChange={(e) => setF({ ...f, frequencyHours: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Max attempts</Label>
            <Input type="number" min={1} max={20} className="h-9" value={f.maxAttempts} onChange={(e) => setF({ ...f, maxAttempts: Number(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Template</Label>
            <Select value={f.templateId || "default"} onValueChange={(v) => setF({ ...f, templateId: v === "default" ? null : v })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Built-in message</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.channel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isDeadline && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Application deadline</Label>
                <Input type="date" className="h-9" value={f.deadlineDate || ""} onChange={(e) => setF({ ...f, deadlineDate: e.target.value || null })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Start reminding (days before)</Label>
                <Input type="number" min={0} max={90} className="h-9" value={f.deadlineDaysBefore} onChange={(e) => setF({ ...f, deadlineDaysBefore: Number(e.target.value) })} />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={f.autoClose} onCheckedChange={(v) => setF({ ...f, autoClose: v })} />
            Auto-close when the applicant completes the step
          </label>
          <Button
            size="sm"
            className="gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            disabled={update.isPending || f.channels.length === 0}
            onClick={() =>
              update.mutate({
                scenario: rule.scenario,
                channels: f.channels,
                firstReminderAfterHours: f.firstReminderAfterHours,
                frequencyHours: f.frequencyHours,
                maxAttempts: f.maxAttempts,
                templateId: f.templateId,
                autoClose: f.autoClose,
                ...(isDeadline ? { deadlineDate: f.deadlineDate, deadlineDaysBefore: f.deadlineDaysBefore } : {}),
              })
            }
          >
            {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save rule
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkflowSettingsCard() {
  const { data } = useWorkflowSettings();
  const update = useUpdateWorkflowSettings();
  const [sla, setSla] = React.useState<Record<string, number>>({});
  const [required, setRequired] = React.useState<string[]>([]);
  const [maxMb, setMaxMb] = React.useState(5);
  const [notify, setNotify] = React.useState(true);
  React.useEffect(() => {
    if (data) {
      setSla(data.stageSlaDays || {});
      setRequired(data.requiredDocumentTypes || []);
      setMaxMb(data.maxDocumentSizeMb || 5);
      setNotify(data.notifyApplicantOnStageChange);
    }
  }, [data]);
  const slaStages = TRACKER_STAGES.filter((s) => !["Approved", "Rejected", "Waitlisted"].includes(s));

  return (
    <div className="rounded-[12px] border border-border bg-card shadow-sm p-5 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-bold">Status tracker SLA (days per stage)</h3>
        <p className="text-xs text-muted-foreground">An application staying in a stage longer than this is flagged as SLA breached and the team is notified.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {slaStages.map((s) => (
          <div key={s} className="flex flex-col gap-1.5">
            <Label className="text-xs">{s}</Label>
            <Input type="number" min={0} max={365} className="h-9" value={sla[s] ?? ""} onChange={(e) => setSla({ ...sla, [s]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Required documents</Label>
        <div className="flex flex-wrap gap-4">
          {DOCUMENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={required.includes(t)} onCheckedChange={(v) => setRequired(v ? [...required, t] : required.filter((x) => x !== t))} />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Maximum file size (MB, PDF / JPG / PNG)</Label>
          <Input type="number" min={1} max={25} className="h-9" value={maxMb} onChange={(e) => setMaxMb(Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Switch checked={notify} onCheckedChange={setNotify} />
          Notify the applicant when the stage changes
        </label>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          disabled={update.isPending || required.length === 0}
          onClick={() => update.mutate({ stageSlaDays: sla, requiredDocumentTypes: required, maxDocumentSizeMb: maxMb, notifyApplicantOnStageChange: notify })}
        >
          {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function ReminderLog() {
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [state, setState] = React.useState("open");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useReminders({ page, limit: 20, reminderType: type, reminderStatus: status, state, search });
  const send = useSendReminderNow();
  const close = useCloseReminder();
  const items = data?.items || [];

  return (
    <div className="flex flex-col gap-4">
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ["Total", data.stats.total],
            ["Open", data.stats.open],
            ["Sent", data.stats.sent],
            ["Failed", data.stats.failed],
            ["Completed", data.stats.completed],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-[12px] border border-border bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground">{l}</p>
              <p className="text-xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2.5">
        <Input className="h-10 w-full md:w-[260px] bg-background" placeholder="Search applicant or application no" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {[
          { v: type, s: setType, ph: "All Types", o: ["Fee Pending", "Docs Missing", "Deadline"] },
          { v: status, s: setStatus, ph: "All Status", o: ["Sent", "Failed", "Scheduled"] },
          { v: state, s: setState, ph: "Open & Closed", o: ["open", "closed"] },
        ].map((x, i) => (
          <Select key={i} value={x.v} onValueChange={(v) => { x.s(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[160px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{x.ph}</SelectItem>
              {x.o.map((o) => (
                <SelectItem key={o} value={o}>
                  {o === "open" ? "Open" : o === "closed" ? "Closed" : o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[12px] border border-border bg-card">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5">
            <TableRow>
              {["Reminder", "Application", "Type / Trigger", "Channels", "Status", "Attempts", "Next", "Response", ""].map((h) => (
                <TableHead key={h} className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                  No reminders yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-4 py-3 text-xs font-mono">RM-{r.reminderId}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Link className="text-sm font-medium hover:underline" href={`/organization/applications/${encodeURIComponent(r.applicationNo || "")}`}>
                      {r.applicantName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{r.applicationNo}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    <p className="font-medium">{r.reminderType}</p>
                    <p className="text-muted-foreground">{r.triggerEvent}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs">{r.reminderChannels.join(", ")}</TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={statusPill[r.reminderStatus || "Scheduled"]}>{r.reminderStatus || "Scheduled"}</span>
                    {r.lastError && <p className="text-[11px] text-red-600 mt-1 max-w-[200px]">{r.lastError}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fmt(r.reminderSentDate)}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">{r.attemptCount}</TableCell>
                  <TableCell className="px-4 py-3 text-xs">{r.isClosed ? "Closed" : fmt(r.nextScheduledDate)}</TableCell>
                  <TableCell className="px-4 py-3 text-xs">{r.applicantResponse || "—"}</TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {!r.isClosed && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={send.isPending} onClick={() => send.mutate(r.id)}>
                          <Send className="size-3" /> Send now
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={close.isPending} onClick={() => close.mutate({ id: r.id, applicantResponse: "No Action" })}>
                          <XCircle className="size-3" /> Close
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border bg-zinc-100 dark:bg-muted/5 px-4 py-3 text-sm">
          <span className="text-muted-foreground">{data?.total ?? 0} reminder(s)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReminderSettingsPage() {
  usePageHeader({
    title: "Reminders & Nudges",
    description: "Automatic reminders for unpaid fees, missing or rejected documents and approaching deadlines, plus status-tracker SLAs.",
  });
  const { data: rules, isLoading } = useReminderRules();
  const { data: templates } = useReminderTemplates();
  const run = useRunReminders();

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-6xl">
      <div className="rounded-[12px] border border-border bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
            <BellRing className="size-5" />
          </div>
          <p className="text-sm text-foreground">
            Reminders run automatically every 30 minutes. Applicants can opt out from any reminder e-mail or from their portal.
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Run now
        </Button>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Reminder rules</TabsTrigger>
          <TabsTrigger value="log">Reminder log</TabsTrigger>
          <TabsTrigger value="workflow">Status & SLA rules</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="flex flex-col gap-4 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            rules?.map((r) => <RuleCard key={r.id} rule={r} templates={templates || []} />)
          )}
        </TabsContent>
        <TabsContent value="log" className="mt-4">
          <ReminderLog />
        </TabsContent>
        <TabsContent value="workflow" className="mt-4">
          <WorkflowSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
