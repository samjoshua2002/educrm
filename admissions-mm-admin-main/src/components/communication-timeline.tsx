"use client";

/**
 * Communication History timeline (scope §5) — one chronological list of every
 * Email / SMS / WhatsApp / Call / System interaction for an applicant or lead.
 *
 * Usage:  <CommunicationTimeline applicationId={app.id} />
 *         <CommunicationTimeline leadId={lead.id} compact />
 */

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCommunicationTimeline, useCreateInteraction, useUpdateInteraction } from "@/hooks/use-communications";
import { useTeam } from "@/hooks/use-team";
import { INTERACTION_CHANNELS, INTERACTION_DIRECTIONS, type TimelineEntry } from "@/types/communications";

const CHANNEL_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Email: { icon: Mail, color: "#2563EB", bg: "#EFF6FF" },
  SMS: { icon: MessageSquare, color: "#7C3AED", bg: "#F5F3FF" },
  WhatsApp: { icon: MessageCircle, color: "#059669", bg: "#ECFDF5" },
  Call: { icon: Phone, color: "#D97706", bg: "#FFFBEB" },
  System: { icon: Settings2, color: "#475569", bg: "#F1F5F9" },
};

const STATUS_CLASS: Record<string, string> = {
  Sent: "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300",
  Read: "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300",
  Failed: "bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-500/20 dark:text-red-300",
  Scheduled: "bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300",
  Cancelled: "bg-muted text-muted-foreground",
};

const fmt = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const toDateInput = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export interface CommunicationTimelineProps {
  applicationId?: string | null;
  leadId?: string | null;
  /** Hide the header / filters (for embedding in narrow side panels) */
  compact?: boolean;
  /** Show the "Log interaction" button */
  allowLogging?: boolean;
  className?: string;
}

export function CommunicationTimeline({ applicationId, leadId, compact, allowLogging = true, className }: CommunicationTimelineProps) {
  const [channel, setChannel] = React.useState<string>("all");
  const { data, isLoading, isError } = useCommunicationTimeline({ applicationId, leadId, channel });
  const [editing, setEditing] = React.useState<TimelineEntry | null>(null);
  const [logOpen, setLogOpen] = React.useState(false);
  const entries = data?.entries || [];

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach((e) => (c[e.channel] = (c[e.channel] || 0) + 1));
    return c;
  }, [entries]);

  if (!applicationId && !leadId) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {["all", ...INTERACTION_CHANNELS].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={cn(
                  "h-8 px-3 rounded-full border text-xs font-medium transition-colors cursor-pointer",
                  channel === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "all" ? "All" : c}
                {channel === "all" && c !== "all" && counts[c] ? <span className="ml-1 opacity-70">({counts[c]})</span> : null}
              </button>
            ))}
          </div>
          {allowLogging && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setLogOpen(true)}>
              <Plus className="size-3.5" /> Log interaction
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading communication history…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive py-6 text-center">Could not load the communication history.</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">No communication recorded yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {entries.map((e) => (
            <TimelineItem key={e.interactionId} entry={e} onEdit={() => setEditing(e)} />
          ))}
        </ol>
      )}

      {editing && <EditInteractionDialog entry={editing} onClose={() => setEditing(null)} />}
      {logOpen && (
        <LogInteractionDialog
          applicationId={applicationId || data?.applicant?.applicationId || undefined}
          leadId={leadId || data?.applicant?.leadId || undefined}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}

function TimelineItem({ entry, onEdit }: { entry: TimelineEntry; onEdit: () => void }) {
  const [open, setOpen] = React.useState(false);
  const meta = CHANNEL_META[entry.channel] || CHANNEL_META.System;
  const Icon = meta.icon;
  const DirIcon = entry.direction === "Inbound" ? ArrowDownLeft : entry.direction === "Outbound" ? ArrowUpRight : Bot;
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(entry.content || "");

  return (
    <li className="relative flex gap-3">
      <div className="relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full border border-border" style={{ backgroundColor: meta.bg, color: meta.color }}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0 rounded-[10px] border border-border bg-card px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground break-words">{entry.subject}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{fmt(entry.dateTime)}</span>
              <span className="inline-flex items-center gap-1">
                <DirIcon className="size-3" /> {entry.direction}
              </span>
              <span>{entry.channel}</span>
              <span>by {entry.handledBy || "System"}</span>
              {entry.recipient && <span className="truncate max-w-[220px]">to {entry.recipient}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CLASS[entry.deliveryStatus] || STATUS_CLASS.Cancelled)}>
              {entry.deliveryStatus}
            </span>
            {entry.editable && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Follow-up & remarks">
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {entry.summary && <p className="mt-2 text-xs text-muted-foreground line-clamp-2 break-words">{entry.summary}</p>}
        {entry.failureReason && entry.deliveryStatus === "Failed" && (
          <p className="mt-1 text-xs text-destructive break-words">Reason: {entry.failureReason}</p>
        )}

        {(entry.actionTaken || entry.nextFollowUpDate || entry.assignedStaff || entry.remarks) && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            {entry.actionTaken && (
              <span>
                <span className="text-muted-foreground">Action taken:</span> {entry.actionTaken}
              </span>
            )}
            {entry.nextFollowUpDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3 text-amber-600" />
                <span className="text-muted-foreground">Next follow-up:</span> {fmt(entry.nextFollowUpDate)}
              </span>
            )}
            {entry.assignedStaff && (
              <span>
                <span className="text-muted-foreground">Assigned staff:</span> {entry.assignedStaff}
              </span>
            )}
            {entry.remarks && (
              <span className="sm:col-span-2">
                <span className="text-muted-foreground">Remarks:</span> {entry.remarks}
              </span>
            )}
          </div>
        )}

        {entry.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.attachments.map((a, i) => (
              <a
                key={`${a.url}-${i}`}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-primary hover:bg-muted/40"
              >
                <Paperclip className="size-3" /> {a.name || "Attachment"}
              </a>
            ))}
          </div>
        )}

        {entry.content && entry.content !== entry.summary && (
          <div className="mt-2">
            <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary cursor-pointer" onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {open ? "Hide full content" : entry.channel === "Call" ? "Show transcript / notes" : "Show full content"}
            </button>
            {open &&
              (isHtml ? (
                <iframe
                  title={`content-${entry.interactionId}`}
                  sandbox=""
                  srcDoc={entry.content}
                  className="mt-2 w-full h-[360px] rounded-md border border-border bg-white"
                />
              ) : (
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-xs text-foreground font-sans">{entry.content}</pre>
              ))}
          </div>
        )}
      </div>
    </li>
  );
}

function StaffSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useTeam(1, 100);
  const users: any[] = (data as any)?.data || [];
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger className="w-full h-10">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name || u.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditInteractionDialog({ entry, onClose }: { entry: TimelineEntry; onClose: () => void }) {
  const update = useUpdateInteraction();
  const [actionTaken, setActionTaken] = React.useState(entry.actionTaken || "");
  const [nextFollowUpDate, setNext] = React.useState(toDateInput(entry.nextFollowUpDate));
  const [assignedStaffId, setStaff] = React.useState(entry.assignedStaffId || "");
  const [remarks, setRemarks] = React.useState(entry.remarks || "");
  const [deliveryStatus, setStatus] = React.useState(["Sent", "Read", "Failed"].includes(entry.deliveryStatus) ? entry.deliveryStatus : "Sent");

  const save = () =>
    update.mutate(
      { id: entry.interactionId, actionTaken, nextFollowUpDate, assignedStaffId, remarks, deliveryStatus },
      { onSuccess: onClose },
    );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Status & follow-up</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Delivery status</Label>
            <Select value={deliveryStatus} onValueChange={setStatus}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Sent", "Read", "Failed"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Next follow-up date</Label>
            <Input type="date" className="h-10" value={nextFollowUpDate} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label className="text-xs">Action taken</Label>
            <Input className="h-10" value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="e.g. Shared fee structure" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label className="text-xs">Assigned staff</Label>
            <StaffSelect value={assignedStaffId} onChange={setStaff} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label className="text-xs">Remarks</Label>
            <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LogInteractionDialog({
  applicationId,
  leadId,
  onClose,
}: {
  applicationId?: string;
  leadId?: string;
  onClose: () => void;
}) {
  const create = useCreateInteraction();
  const [form, setForm] = React.useState({
    channel: "Email",
    direction: "Inbound",
    subject: "",
    summary: "",
    content: "",
    dateTime: "",
    deliveryStatus: "Read",
    actionTaken: "",
    nextFollowUpDate: "",
    assignedStaffId: "",
    remarks: "",
    attachmentName: "",
    attachmentUrl: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.subject.trim()) return;
    create.mutate(
      {
        channel: form.channel,
        direction: form.direction,
        applicationId,
        leadId,
        subject: form.subject.trim(),
        summary: form.summary || undefined,
        content: form.content || undefined,
        dateTime: form.dateTime ? new Date(form.dateTime).toISOString() : undefined,
        deliveryStatus: form.deliveryStatus,
        actionTaken: form.actionTaken || undefined,
        nextFollowUpDate: form.nextFollowUpDate || undefined,
        assignedStaffId: form.assignedStaffId || undefined,
        remarks: form.remarks || undefined,
        attachments: form.attachmentUrl ? [{ name: form.attachmentName || "Attachment", url: form.attachmentUrl }] : undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log interaction</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Channel</Label>
            <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Direction</Label>
            <Select value={form.direction} onValueChange={(v) => set("direction", v)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_DIRECTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Delivery status</Label>
            <Select value={form.deliveryStatus} onValueChange={(v) => set("deliveryStatus", v)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Sent", "Read", "Failed"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label className="text-xs">Subject / title *</Label>
            <Input className="h-10" value={form.subject} onChange={(e) => set("subject", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Date & time</Label>
            <Input type="datetime-local" className="h-10" value={form.dateTime} onChange={(e) => set("dateTime", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label className="text-xs">Summary</Label>
            <Input className="h-10" value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label className="text-xs">Full content / transcript</Label>
            <Textarea rows={4} value={form.content} onChange={(e) => set("content", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Attachment name</Label>
            <Input className="h-10" value={form.attachmentName} onChange={(e) => set("attachmentName", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label className="text-xs">Attachment link</Label>
            <Input className="h-10" placeholder="https://" value={form.attachmentUrl} onChange={(e) => set("attachmentUrl", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label className="text-xs">Action taken</Label>
            <Input className="h-10" value={form.actionTaken} onChange={(e) => set("actionTaken", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Next follow-up</Label>
            <Input type="date" className="h-10" value={form.nextFollowUpDate} onChange={(e) => set("nextFollowUpDate", e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label className="text-xs">Assigned staff</Label>
            <StaffSelect value={form.assignedStaffId} onChange={(v) => set("assignedStaffId", v)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-3">
            <Label className="text-xs">Remarks</Label>
            <Textarea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={create.isPending || !form.subject.trim()}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Save interaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CommunicationTimeline;
