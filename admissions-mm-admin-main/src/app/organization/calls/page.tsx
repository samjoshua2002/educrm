"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Clock,
  EllipsisVertical,
  Loader2,
  Pencil,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { useTeam } from "@/hooks/use-team";
import { useCall, useCallStats, useCalls, useClickToCall, useDeleteCall, useLogCall, useTelephonySettings, useUpdateCall } from "@/hooks/use-calls";
import { useRecipientSearch } from "@/hooks/use-communications";
import { browserTimeZone, toWallClock } from "@/lib/scheduled-communications";
import { CALL_OUTCOMES, CALL_STATUSES, CALL_TYPES, type CallInput, type CallLog } from "@/types/communications";
import {
  EmptyState,
  Field,
  Pager,
  ReadOnlyField,
  StatCard,
  StatusPill,
  Th,
  formatDateTime,
  formatDuration,
  pill,
  tableHeaderClass,
  tableShell,
} from "../communications/_components/comm-ui";
import { RecipientPicker, type PickedRecipient } from "../communications/_components/recipient-picker";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CallsPage() {
  return (
    <React.Suspense fallback={null}>
      <CallsPageInner />
    </React.Suspense>
  );
}

function CallsPageInner() {
  usePageHeader({
    title: "Calls",
    description: "Call log, click-to-call, recordings, outcomes and follow-ups (Exotel / Twilio Voice).",
  });
  const params = useSearchParams();
  const role = useAuthStore((s) => s.user?.role) || "";
  const isAdmin = role === "org_admin" || role === "superadmin";
  const { data: stats } = useCallStats();
  const { data: settings } = useTelephonySettings();

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [callType, setCallType] = React.useState("all");
  const [callStatus, setCallStatus] = React.useState("all");
  const [callOutcome, setCallOutcome] = React.useState("all");
  const [agent, setAgent] = React.useState("all");
  const [followUpDue, setFollowUpDue] = React.useState(false);
  const debounced = useDebounced(search);
  const { data, isLoading } = useCalls(page, 20, { search: debounced, callType, callStatus, callOutcome, agentUserId: agent, followUpDue });
  const del = useDeleteCall();
  const rows = data?.data || [];

  const [logOpen, setLogOpen] = React.useState(params.get("log") === "1");
  const [editing, setEditing] = React.useState<CallLog | null>(null);
  const [callOpen, setCallOpen] = React.useState(false);
  const [viewingId, setViewingId] = React.useState<string | null>(params.get("id"));

  const prefill = React.useMemo(
    () => ({ applicationId: params.get("applicationId") || undefined, leadId: params.get("leadId") || undefined }),
    [params],
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard icon={<Phone className="size-5" />} label="Total calls" value={stats?.total ?? 0} hint={`${formatDuration(stats?.totalDurationSeconds)} talk time`} />
        <StatCard
          icon={<PhoneOutgoing className="size-5" />}
          label="Outbound / inbound"
          value={`${stats?.outbound ?? 0} / ${stats?.inbound ?? 0}`}
          color="#059669"
          bg="#ECFDF5"
          hint={`${stats?.answered ?? 0} answered`}
        />
        <StatCard
          icon={<PhoneMissed className="size-5" />}
          label="Missed"
          value={stats?.missed ?? 0}
          color="#DC2626"
          bg="#FEF2F2"
          ratio={stats?.total ? (stats.missed || 0) / stats.total : 0}
          hint={`${stats?.notAnswered ?? 0} not answered`}
        />
        <StatCard icon={<Clock className="size-5" />} label="Avg. duration" value={formatDuration(stats?.avgDurationSeconds)} color="#7C3AED" bg="#F5F3FF" />
        <StatCard
          icon={<CalendarClock className="size-5" />}
          label="Follow-ups due"
          value={stats?.followUpsDue ?? 0}
          color="#D97706"
          bg="#FFFBEB"
          hint={`${stats?.interested ?? 0} interested`}
        />
      </div>

      {settings && !settings.ready && (
        <p className={`${pill.amber} rounded-md px-3 py-2 text-xs`}>
          Click-to-call is not configured.{" "}
          {isAdmin ? (
            <Link href="/organization/settings/telephony" className="underline">
              Set up Exotel or Twilio Voice
            </Link>
          ) : (
            "Ask an organization admin to set up Exotel or Twilio Voice."
          )}{" "}
          — you can still log calls manually.
        </p>
      )}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Input placeholder="Search applicant, number, app no, agent or notes…" className="h-10 pr-10" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Filter value={callType} onChange={(v) => (setCallType(v), setPage(1))} all="All types" options={CALL_TYPES} />
          <Filter value={callStatus} onChange={(v) => (setCallStatus(v), setPage(1))} all="All statuses" options={[...CALL_STATUSES, "In Progress"]} />
          <Filter value={callOutcome} onChange={(v) => (setCallOutcome(v), setPage(1))} all="All outcomes" options={CALL_OUTCOMES} />
          <Filter value={agent} onChange={(v) => (setAgent(v), setPage(1))} all="All agents" options={["me"]} labels={{ me: "My calls" }} />
          <Button variant={followUpDue ? "default" : "outline"} className="h-10" onClick={() => (setFollowUpDue((f) => !f), setPage(1))}>
            <CalendarClock className="size-4" /> Due
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 gap-1.5" onClick={() => setLogOpen(true)}>
            <Plus className="size-4" /> Log a call
          </Button>
          <Button className="h-10 gap-1.5" onClick={() => setCallOpen(true)} disabled={!settings?.ready}>
            <PhoneCall className="size-4" /> Click to call
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" size="icon" className="h-10 w-10" title="Telephony settings">
              <Link href="/organization/settings/telephony">
                <Settings2 className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Call</Th>
              <Th>Applicant</Th>
              <Th>Type</Th>
              <Th>Start</Th>
              <Th>Duration</Th>
              <Th>Status</Th>
              <Th>Agent</Th>
              <Th>Outcome</Th>
              <Th>Follow-up</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState title="No calls logged" description="Calls placed with click-to-call, provider callbacks and manual logs appear here." />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => {
                const TypeIcon = c.callType === "Inbound" ? PhoneIncoming : c.callType === "Missed" ? PhoneMissed : PhoneOutgoing;
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewingId(c.id)}>
                    <TableCell className="px-4 text-xs font-mono">{c.callCode}</TableCell>
                    <TableCell className="px-4">
                      <p className="text-sm font-medium">{c.applicantName || "Unknown caller"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        +{c.countryCode} {c.contactNumber}
                        {c.programInterested ? ` · ${c.programInterested}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <TypeIcon className={`size-3.5 ${c.callType === "Missed" ? "text-red-600" : c.callType === "Inbound" ? "text-emerald-600" : "text-blue-600"}`} />
                        {c.callType}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-xs whitespace-nowrap">{formatDateTime(c.callStartTime || c.createdAt)}</TableCell>
                    <TableCell className="px-4 text-xs">{c.durationLabel}</TableCell>
                    <TableCell className="px-4">
                      <StatusPill status={c.callStatus} />
                    </TableCell>
                    <TableCell className="px-4 text-xs">
                      <p>{c.agentName || "—"}</p>
                      {c.department && <p className="text-[11px] text-muted-foreground">{c.department}</p>}
                    </TableCell>
                    <TableCell className="px-4">{c.callOutcome ? <StatusPill status={c.callOutcome} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="px-4 text-xs whitespace-nowrap">{c.followUpDate ? formatDateTime(c.followUpDate) : "—"}</TableCell>
                    <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(c)}>
                            <Pencil className="size-4" /> Notes & outcome
                          </DropdownMenuItem>
                          {(c.applicationId || c.leadId) && (
                            <DropdownMenuItem asChild>
                              <Link href={c.applicationId ? `/organization/communications/app/${c.applicationId}` : `/organization/communications/lead/${c.leadId}`}>
                                <CalendarClock className="size-4" /> Communication history
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem className="text-destructive" onClick={() => del.mutate(c.id)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} limit={20} total={data?.pagination?.total || 0} onPage={setPage} />

      {logOpen && <CallFormDialog onClose={() => setLogOpen(false)} prefill={prefill} />}
      {editing && <CallFormDialog call={editing} onClose={() => setEditing(null)} />}
      {callOpen && <ClickToCallDialog onClose={() => setCallOpen(false)} />}
      <CallDetailsSheet id={viewingId} onClose={() => setViewingId(null)} onEdit={(c) => (setViewingId(null), setEditing(c))} />
    </div>
  );
}

function CallDetailsSheet({ id, onClose, onEdit }: { id: string | null; onClose: () => void; onEdit: (c: CallLog) => void }) {
  const { data: c } = useCall(id);
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{c ? `${c.callCode} · ${c.callType} call` : "Call"}</SheetTitle>
        </SheetHeader>
        {!c ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 pb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Call information</p>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Call ID" value={<span className="font-mono text-[11px]">{c.id}</span>} />
              <ReadOnlyField label="Applicant ID" value={c.applicationNo || c.applicationId || (c.leadId ? `Lead ${c.leadId.slice(0, 8)}` : null)} />
              <ReadOnlyField label="Applicant name" value={c.applicantName} />
              <ReadOnlyField label="Contact number" value={`+${c.countryCode} ${c.contactNumber}`} />
              <ReadOnlyField label="Program interested" value={c.programInterested} />
              <ReadOnlyField label="Call type" value={c.callType} />
              <ReadOnlyField label="Call start time" value={formatDateTime(c.callStartTime)} />
              <ReadOnlyField label="Call end time" value={formatDateTime(c.callEndTime)} />
              <ReadOnlyField label="Call duration" value={c.durationLabel} />
              <ReadOnlyField label="Call status" value={<StatusPill status={c.callStatus} />} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Agent details</p>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Agent / user ID" value={c.agentUserId ? <span className="font-mono text-[11px]">{c.agentUserId}</span> : null} />
              <ReadOnlyField label="Agent name" value={c.agentName} />
              <ReadOnlyField label="Department" value={c.department} />
              <ReadOnlyField label="Extension / device ID" value={c.extensionDeviceId} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recording & notes</p>
            {c.recordingUrl ? (
              <div className="flex flex-col gap-2">
                <audio controls src={c.recordingUrl} className="w-full" />
                <a href={c.recordingUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                  {c.recordingUrl}
                </a>
              </div>
            ) : (
              <ReadOnlyField label="Call recording" value={null} />
            )}
            <ReadOnlyField label="Transcription" value={c.transcription ? <span className="whitespace-pre-wrap">{c.transcription}</span> : null} />
            <ReadOnlyField label="Agent notes" value={c.agentNotes ? <span className="whitespace-pre-wrap">{c.agentNotes}</span> : null} />
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Call outcome" value={c.callOutcome ? <StatusPill status={c.callOutcome} /> : null} />
              <ReadOnlyField label="Follow-up date" value={c.followUpDate ? formatDateTime(c.followUpDate) : null} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Automation actions</p>
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField
                label="Auto-SMS after missed call"
                value={`${c.autoSmsAfterMissedCall ? "Yes" : "No"}${c.autoSmsSentAt ? ` — sent ${formatDateTime(c.autoSmsSentAt)}` : ""}${c.autoSmsError ? ` (failed: ${c.autoSmsError})` : ""}`}
              />
              <ReadOnlyField
                label="Auto-create follow-up task"
                value={`${c.autoCreateFollowUpTask ? "Yes" : "No"}${c.followUpTaskCreatedAt ? ` — created ${formatDateTime(c.followUpTaskCreatedAt)}` : ""}`}
              />
              <ReadOnlyField
                label="Auto-tag applicant"
                value={
                  <span>
                    {c.autoTagApplicant ? "Yes" : "No"}
                    {c.tags.length > 0 && (
                      <span className="ml-2 inline-flex flex-wrap gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className={pill.purple}>
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                }
              />
              <ReadOnlyField label="Provider" value={`${c.provider}${c.providerStatus ? ` · ${c.providerStatus}` : ""}`} />
              {c.failureReason && <ReadOnlyField label="Failure reason" value={<span className="text-destructive">{c.failureReason}</span>} />}
            </div>
            <Button variant="outline" onClick={() => onEdit(c)} className="gap-1.5 self-start">
              <Pencil className="size-4" /> Edit notes & outcome
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CallFormDialog({ call, prefill, onClose }: { call?: CallLog; prefill?: { applicationId?: string; leadId?: string }; onClose: () => void }) {
  const logCall = useLogCall();
  const update = useUpdateCall();
  const { data: settings } = useTelephonySettings();
  const { data: team } = useTeam(1, 100);
  const users: any[] = (team as any)?.data || [];
  const tz = browserTimeZone();
  const userId = useAuthStore((s) => s.user?.id);

  // Prefill from ?applicationId / ?leadId
  const { data: found = [] } = useRecipientSearch("");
  const [picked, setPicked] = React.useState<PickedRecipient[]>([]);
  React.useEffect(() => {
    if (call || !prefill || (!prefill.applicationId && !prefill.leadId) || picked.length) return;
    const hit = found.find((r) => (prefill.applicationId && r.applicationId === prefill.applicationId) || (prefill.leadId && r.leadId === prefill.leadId));
    setPicked([
      hit
        ? { key: hit.key, applicationId: hit.applicationId, leadId: hit.leadId, name: hit.name, email: hit.email, phone: hit.phone, kind: hit.kind }
        : {
            key: prefill.applicationId ? `app:${prefill.applicationId}` : `lead:${prefill.leadId}`,
            applicationId: prefill.applicationId,
            leadId: prefill.applicationId ? undefined : prefill.leadId,
            name: "Selected applicant",
            kind: prefill.applicationId ? "Applicant" : "Lead",
          },
    ]);
  }, [call, prefill, found, picked.length]);

  const [f, setF] = React.useState({
    contactNumber: call ? call.contactNumber : "",
    countryCode: call?.countryCode || settings?.defaultCountryCode || "91",
    applicantName: call?.applicantName || "",
    programInterested: call?.programInterested || "",
    callType: call?.callType || "Outbound",
    callStatus: call?.callStatus && call.callStatus !== "In Progress" ? call.callStatus : "Answered",
    callStartTime: toWallClock(call?.callStartTime || new Date().toISOString(), tz),
    callEndTime: toWallClock(call?.callEndTime, tz),
    durationMinutes: call ? String(Math.round((call.durationSeconds || 0) / 6) / 10) : "",
    agentUserId: call?.agentUserId || userId || "",
    department: call?.department || "",
    extensionDeviceId: call?.extensionDeviceId || "",
    recordingUrl: call?.recordingUrl || "",
    transcription: call?.transcription || "",
    agentNotes: call?.agentNotes || "",
    callOutcome: call?.callOutcome || "",
    followUpDate: toWallClock(call?.followUpDate, tz),
    autoSmsAfterMissedCall: call?.autoSmsAfterMissedCall ?? settings?.autoSmsAfterMissedCall ?? false,
    autoCreateFollowUpTask: call?.autoCreateFollowUpTask ?? settings?.autoCreateFollowUpTask ?? true,
    autoTagApplicant: call?.autoTagApplicant ?? settings?.autoTagApplicant ?? false,
    tags: (call?.tags || []).join(", "),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const r = picked[0];
  const hasContact = !!call || !!r?.applicationId || !!r?.leadId || f.contactNumber.replace(/\D+/g, "").length >= 6;

  const submit = () => {
    const payload: CallInput = {
      applicantName: f.applicantName || undefined,
      programInterested: f.programInterested || undefined,
      callType: f.callType,
      callStatus: f.callStatus,
      callStartTime: f.callStartTime || undefined,
      callEndTime: f.callEndTime || undefined,
      durationSeconds: f.durationMinutes ? Math.round(Number(f.durationMinutes) * 60) : undefined,
      timeZone: tz,
      agentUserId: f.agentUserId || undefined,
      department: f.department || undefined,
      extensionDeviceId: f.extensionDeviceId || undefined,
      recordingUrl: f.recordingUrl || undefined,
      transcription: f.transcription || undefined,
      agentNotes: f.agentNotes || undefined,
      callOutcome: f.callOutcome || null,
      followUpDate: f.followUpDate || null,
      autoSmsAfterMissedCall: f.autoSmsAfterMissedCall,
      autoCreateFollowUpTask: f.autoCreateFollowUpTask,
      autoTagApplicant: f.autoTagApplicant,
      tags: f.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (call) {
      if (f.contactNumber && f.contactNumber !== call.contactNumber) {
        payload.contactNumber = f.contactNumber;
        payload.countryCode = f.countryCode;
      }
      update.mutate({ id: call.id, ...payload }, { onSuccess: onClose });
    } else {
      logCall.mutate(
        {
          ...payload,
          applicationId: r?.applicationId,
          leadId: r?.applicationId ? undefined : r?.leadId,
          contactNumber: f.contactNumber || (r?.kind === "Manual" ? r.phone || undefined : undefined),
          countryCode: f.countryCode,
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{call ? `Edit ${call.callCode}` : "Log a call"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Call information</p>
          {!call && (
            <Field label="Applicant / lead" hint="Pick an applicant or lead, or type a phone number.">
              <RecipientPicker value={picked} onChange={setPicked} multiple={false} mode="phone" />
            </Field>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Country code">
              <Input className="h-10" value={f.countryCode} onChange={(e) => set("countryCode", e.target.value)} />
            </Field>
            <Field label="Contact number" className="sm:col-span-2" hint={!call && r && r.kind !== "Manual" ? "Leave empty to use the applicant's number." : undefined}>
              <Input className="h-10" value={f.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
            </Field>
            <Field label="Applicant name">
              <Input className="h-10" value={f.applicantName} placeholder={r?.name} onChange={(e) => set("applicantName", e.target.value)} />
            </Field>
            <Field label="Program interested" className="sm:col-span-2">
              <Input className="h-10" value={f.programInterested} onChange={(e) => set("programInterested", e.target.value)} />
            </Field>
            <Field label="Call type" required>
              <Sel value={f.callType} onChange={(v) => set("callType", v)} options={CALL_TYPES} />
            </Field>
            <Field label="Call status" required>
              <Sel value={f.callStatus} onChange={(v) => set("callStatus", v)} options={CALL_STATUSES} />
            </Field>
            <Field label="Duration (minutes)">
              <Input type="number" min={0} step="0.1" className="h-10" value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} />
            </Field>
            <Field label="Call start time">
              <Input type="datetime-local" className="h-10" value={f.callStartTime} onChange={(e) => set("callStartTime", e.target.value)} />
            </Field>
            <Field label="Call end time">
              <Input type="datetime-local" className="h-10" value={f.callEndTime} onChange={(e) => set("callEndTime", e.target.value)} />
            </Field>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Agent details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Agent">
              <Select value={f.agentUserId || "none"} onValueChange={(v) => set("agentUserId", v === "none" ? "" : v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department">
              <Input className="h-10" value={f.department} placeholder={settings?.defaultDepartment || ""} onChange={(e) => set("department", e.target.value)} />
            </Field>
            <Field label="Extension / device ID">
              <Input className="h-10" value={f.extensionDeviceId} onChange={(e) => set("extensionDeviceId", e.target.value)} />
            </Field>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recording & notes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Call recording file URL" className="sm:col-span-2">
              <Input className="h-10" placeholder="https://" value={f.recordingUrl} onChange={(e) => set("recordingUrl", e.target.value)} />
            </Field>
            <Field label="Transcription (if available)" className="sm:col-span-2">
              <Textarea rows={3} value={f.transcription} onChange={(e) => set("transcription", e.target.value)} />
            </Field>
            <Field label="Agent notes" className="sm:col-span-2">
              <Textarea rows={3} value={f.agentNotes} onChange={(e) => set("agentNotes", e.target.value)} />
            </Field>
            <Field label="Call outcome">
              <Select value={f.callOutcome || "none"} onValueChange={(v) => set("callOutcome", v === "none" ? "" : v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {CALL_OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Follow-up date">
              <Input type="datetime-local" className="h-10" value={f.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
            </Field>
            <Field label="Tags" hint="Comma separated." className="sm:col-span-2">
              <Input className="h-10" value={f.tags} onChange={(e) => set("tags", e.target.value)} />
            </Field>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Automation actions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Toggle label="Auto-SMS after missed call" checked={f.autoSmsAfterMissedCall} onChange={(v) => set("autoSmsAfterMissedCall", v)} />
            <Toggle label="Auto-create follow-up task" checked={f.autoCreateFollowUpTask} onChange={(v) => set("autoCreateFollowUpTask", v)} />
            <Toggle label="Auto-tag applicant" checked={f.autoTagApplicant} onChange={(v) => set("autoTagApplicant", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!hasContact || logCall.isPending || update.isPending}>
            {(logCall.isPending || update.isPending) && <Loader2 className="size-4 animate-spin" />} {call ? "Save changes" : "Log call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClickToCallDialog({ onClose }: { onClose: () => void }) {
  const call = useClickToCall();
  const [picked, setPicked] = React.useState<PickedRecipient[]>([]);
  const [agentNumber, setAgentNumber] = React.useState("");
  const r = picked[0];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Click to call</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Your phone rings first; when you answer, the applicant is dialled and the call is recorded and logged automatically.
        </p>
        <Field label="Applicant / lead or number" required>
          <RecipientPicker value={picked} onChange={setPicked} multiple={false} mode="phone" />
        </Field>
        <Field label="Your number (optional)" hint="Defaults to your agent line or profile phone.">
          <Input className="h-10" value={agentNumber} onChange={(e) => setAgentNumber(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!r || call.isPending}
            onClick={() =>
              call.mutate(
                {
                  applicationId: r?.applicationId,
                  leadId: r?.applicationId ? undefined : r?.leadId,
                  to: r?.kind === "Manual" ? r.phone || undefined : undefined,
                  agentNumber: agentNumber || undefined,
                },
                { onSuccess: onClose },
              )
            }
            className="gap-1.5"
          >
            {call.isPending ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />} Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[8px] border border-border px-3 py-2 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Filter({
  value,
  onChange,
  options,
  all,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  all: string;
  labels?: Record<string, string>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[140px] h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels?.[o] || o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

