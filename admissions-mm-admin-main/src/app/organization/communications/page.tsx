"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  EllipsisVertical,
  Eye,
  LayoutTemplate,
  Loader2,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCancelCommunication,
  useCommunicationStats,
  useCommunications,
  useResendCommunication,
} from "@/hooks/use-communications";
import { useCancelMessage, useConsents, useMessageLogs, useMessageStats, useRetryMessage, useSetConsent } from "@/hooks/use-messaging";
import { LogInteractionDialog } from "@/components/communication-timeline";
import {
  INTERACTION_CHANNELS,
  INTERACTION_DIRECTIONS,
  MESSAGE_SENT_STATUSES,
  MESSAGE_TYPES,
  type MessageLog,
  type TimelineEntry,
} from "@/types/communications";
import {
  ChannelPill,
  EmptyState,
  Field,
  Pager,
  ReadOnlyField,
  StatCard,
  StatusPill,
  TabBar,
  Th,
  formatDateTime,
  tableHeaderClass,
  tableShell,
} from "./_components/comm-ui";
import { ComposeDialog } from "./_components/compose-dialog";
import { RecipientPicker, type PickedRecipient } from "./_components/recipient-picker";

type Tab = "interactions" | "messages" | "consent";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CommunicationsPage() {
  usePageHeader({
    title: "Communications",
    description: "Every Email, SMS, WhatsApp, call and system interaction with prospects and applicants.",
  });
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === "org_admin" || role === "superadmin";
  const [tab, setTab] = React.useState<Tab>("interactions");
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composeChannel, setComposeChannel] = React.useState<"Email" | "SMS" | "WhatsApp">("Email");
  const [logOpen, setLogOpen] = React.useState(false);

  const { data: stats } = useCommunicationStats();
  const { data: msgStats } = useMessageStats();
  const total = stats?.total || 0;

  const openCompose = (c: "Email" | "SMS" | "WhatsApp") => {
    setComposeChannel(c);
    setComposeOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard icon={<Mail className="size-5" />} label="Email" value={stats?.byChannel?.Email ?? 0} ratio={total ? (stats?.byChannel?.Email || 0) / total : 0} />
        <StatCard
          icon={<MessageSquare className="size-5" />}
          label="SMS"
          value={stats?.byChannel?.SMS ?? 0}
          color="#7C3AED"
          bg="#F5F3FF"
          ratio={total ? (stats?.byChannel?.SMS || 0) / total : 0}
        />
        <StatCard
          icon={<MessageCircle className="size-5" />}
          label="WhatsApp"
          value={stats?.byChannel?.WhatsApp ?? 0}
          color="#059669"
          bg="#ECFDF5"
          ratio={total ? (stats?.byChannel?.WhatsApp || 0) / total : 0}
          hint={msgStats ? `${msgStats.read} read` : undefined}
        />
        <StatCard
          icon={<Phone className="size-5" />}
          label="Calls"
          value={stats?.byChannel?.Call ?? 0}
          color="#D97706"
          bg="#FFFBEB"
          ratio={total ? (stats?.byChannel?.Call || 0) / total : 0}
        />
        <StatCard
          icon={<CalendarClock className="size-5" />}
          label="Follow-ups due"
          value={stats?.followUpsDue ?? 0}
          color="#DC2626"
          bg="#FEF2F2"
          hint={`${stats?.byStatus?.Failed ?? 0} failed · ${stats?.byStatus?.Scheduled ?? 0} scheduled`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button className="gap-1.5" onClick={() => openCompose("Email")}>
          <Send className="size-4" /> Compose
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => openCompose("SMS")}>
          <MessageSquare className="size-4 text-[#7C3AED]" /> Send SMS
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => openCompose("WhatsApp")}>
          <MessageCircle className="size-4 text-[#059669]" /> Send WhatsApp
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={() => setLogOpen(true)}>
          <Plus className="size-4" /> Log interaction
        </Button>
        <div className="flex-1" />
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/organization/email-campaigns">
            <Megaphone className="size-4 text-[#2563EB]" /> Email Campaigns
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/organization/calls">
            <Phone className="size-4 text-[#D97706]" /> Calls
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/organization/email-templates">
            <LayoutTemplate className="size-4 text-[#2563EB]" /> Templates
          </Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" size="icon" title="SMS & WhatsApp settings">
            <Link href="/organization/settings/messaging">
              <Settings2 className="size-4" />
            </Link>
          </Button>
        )}
      </div>

      <TabBar<Tab>
        tabs={[
          { value: "interactions", label: "All interactions" },
          { value: "messages", label: "SMS & WhatsApp log" },
          { value: "consent", label: "Opt-in consent" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "interactions" && <InteractionsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "consent" && <ConsentTab />}

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} initialChannel={composeChannel} />
      {logOpen && <PickAndLogDialog onClose={() => setLogOpen(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────── interactions ──

function InteractionsTab() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState("all");
  const [direction, setDirection] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [followUpDue, setFollowUpDue] = React.useState(false);
  const debounced = useDebounced(search);
  const limit = 20;
  const { data, isLoading } = useCommunications(page, limit, { search: debounced, channel, direction, status, followUpDue });
  const resend = useResendCommunication();
  const cancel = useCancelCommunication();
  const [viewing, setViewing] = React.useState<TimelineEntry | null>(null);
  const rows = data?.data || [];
  const totalRows = data?.pagination?.total || 0;

  const openHistory = (e: TimelineEntry) => {
    if (e.applicantId) router.push(`/organization/communications/app/${e.applicantId}`);
    else if (e.leadId) router.push(`/organization/communications/lead/${e.leadId}`);
    else setViewing(e);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search by applicant, app no, email, phone or subject…"
            className="h-10 pr-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <FilterSelect value={channel} onChange={(v) => (setChannel(v), setPage(1))} all="All channels" options={INTERACTION_CHANNELS} />
          <FilterSelect value={direction} onChange={(v) => (setDirection(v), setPage(1))} all="All directions" options={INTERACTION_DIRECTIONS} />
          <FilterSelect value={status} onChange={(v) => (setStatus(v), setPage(1))} all="All statuses" options={["Sent", "Read", "Failed", "Scheduled"]} />
          <Button variant={followUpDue ? "default" : "outline"} className="h-10" onClick={() => (setFollowUpDue((f) => !f), setPage(1))}>
            <CalendarClock className="size-4" /> Follow-ups due
          </Button>
        </div>
      </div>

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Date & time</Th>
              <Th>Applicant</Th>
              <Th>Channel</Th>
              <Th>Direction</Th>
              <Th>Subject / summary</Th>
              <Th>Handled by</Th>
              <Th>Status</Th>
              <Th>Next follow-up</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState title="No interactions found" description="Sent emails, messages, calls and logged interactions appear here." />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => (
                <TableRow key={e.interactionId} className="cursor-pointer" onClick={() => openHistory(e)}>
                  <TableCell className="px-4 text-xs whitespace-nowrap">{formatDateTime(e.dateTime)}</TableCell>
                  <TableCell className="px-4">
                    <p className="text-sm font-medium">{e.applicantName || e.recipient || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{e.applicationNo || (e.leadId ? "Lead" : "")}</p>
                  </TableCell>
                  <TableCell className="px-4">
                    <ChannelPill channel={e.channel} />
                  </TableCell>
                  <TableCell className="px-4 text-xs">{e.direction}</TableCell>
                  <TableCell className="px-4 max-w-[320px]">
                    <p className="text-sm truncate">{e.subject}</p>
                    {e.summary && <p className="text-[11px] text-muted-foreground truncate">{e.summary}</p>}
                  </TableCell>
                  <TableCell className="px-4 text-xs">{e.handledBy || "System"}</TableCell>
                  <TableCell className="px-4">
                    <StatusPill status={e.deliveryStatus} />
                  </TableCell>
                  <TableCell className="px-4 text-xs whitespace-nowrap">{e.nextFollowUpDate ? formatDateTime(e.nextFollowUpDate) : "—"}</TableCell>
                  <TableCell className="px-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(e)}>
                          <Eye className="size-4" /> View details
                        </DropdownMenuItem>
                        {(e.applicantId || e.leadId) && (
                          <DropdownMenuItem onClick={() => openHistory(e)}>
                            <CalendarClock className="size-4" /> Full timeline
                          </DropdownMenuItem>
                        )}
                        {e.channel === "Email" && e.source === "communication" && e.rawStatus !== "Scheduled" && (
                          <DropdownMenuItem onClick={() => resend.mutate(e.interactionId)}>
                            <RefreshCw className="size-4" /> Resend
                          </DropdownMenuItem>
                        )}
                        {e.rawStatus === "Scheduled" && e.channel === "Email" && (
                          <DropdownMenuItem onClick={() => cancel.mutate(e.interactionId)}>
                            <XCircle className="size-4" /> Cancel scheduled
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} limit={limit} total={totalRows} onPage={setPage} />

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Interaction details</SheetTitle>
          </SheetHeader>
          {viewing && <InteractionDetails e={viewing} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InteractionDetails({ e }: { e: TimelineEntry }) {
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(e.content || "");
  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Interaction ID" value={<span className="font-mono text-[11px]">{e.interactionId}</span>} />
        <ReadOnlyField label="Related record ID" value={<span className="font-mono text-[11px]">{e.relatedRecordId}</span>} />
        <ReadOnlyField label="Applicant" value={e.applicantName} />
        <ReadOnlyField label="Application no" value={e.applicationNo} />
        <ReadOnlyField label="Channel" value={e.channel} />
        <ReadOnlyField label="Direction" value={e.direction} />
        <ReadOnlyField label="Date & time" value={formatDateTime(e.dateTime)} />
        <ReadOnlyField label="Handled by" value={e.handledBy} />
        <ReadOnlyField label="Delivery status" value={<StatusPill status={e.deliveryStatus} />} />
        <ReadOnlyField label="Recipient" value={e.recipient} />
        <ReadOnlyField label="Action taken" value={e.actionTaken} />
        <ReadOnlyField label="Next follow-up" value={e.nextFollowUpDate ? formatDateTime(e.nextFollowUpDate) : null} />
        <ReadOnlyField label="Assigned staff" value={e.assignedStaff} />
        <ReadOnlyField label="Remarks" value={e.remarks} />
      </div>
      <ReadOnlyField label="Subject / title" value={e.subject} />
      {e.failureReason && <ReadOnlyField label="Failure reason" value={<span className="text-destructive">{e.failureReason}</span>} />}
      {e.attachments?.length > 0 && (
        <ReadOnlyField
          label="Attachment links"
          value={
            <div className="flex flex-col gap-1">
              {e.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-primary underline">
                  {a.name || a.url}
                </a>
              ))}
            </div>
          }
        />
      )}
      {e.content &&
        (isHtml ? (
          <iframe title="content" sandbox="" srcDoc={e.content} className="w-full h-[420px] rounded-md border border-border bg-white" />
        ) : (
          <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-xs font-sans">{e.content}</pre>
        ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────── message log ──

function MessagesTab() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [messageType, setMessageType] = React.useState("all");
  const debounced = useDebounced(search);
  const limit = 20;
  const { data, isLoading } = useMessageLogs(page, limit, { search: debounced, channel, status, messageType });
  const { data: stats } = useMessageStats();
  const retry = useRetryMessage();
  const cancel = useCancelMessage();
  const [viewing, setViewing] = React.useState<MessageLog | null>(null);
  const rows = data?.data || [];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 rounded-[8px] border border-border bg-card shadow-xs">
        {[
          ["Total", stats?.total],
          ["Sent", stats?.sent],
          ["Delivered", stats?.delivered],
          ["Read (WhatsApp)", stats?.read],
          ["Failed", stats?.failed],
          ["Scheduled", stats?.scheduled],
        ].map(([l, v]) => (
          <div key={l as string}>
            <span className="block text-[10px] font-bold tracking-[1px] uppercase text-muted-foreground">{l}</span>
            <p className="text-[16px] font-bold">{(v as number) ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, mobile, app no or text…"
            className="h-10 pr-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <FilterSelect value={channel} onChange={(v) => (setChannel(v), setPage(1))} all="All channels" options={["SMS", "WhatsApp"]} />
          <FilterSelect value={messageType} onChange={(v) => (setMessageType(v), setPage(1))} all="All types" options={MESSAGE_TYPES} />
          <FilterSelect value={status} onChange={(v) => (setStatus(v), setPage(1))} all="All statuses" options={MESSAGE_SENT_STATUSES} />
        </div>
      </div>
      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Created</Th>
              <Th>Recipient</Th>
              <Th>Channel</Th>
              <Th>Type</Th>
              <Th>Message</Th>
              <Th>Priority</Th>
              <Th>Consent</Th>
              <Th>Status</Th>
              <Th>Read</Th>
              <Th>Provider</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <EmptyState title="No SMS or WhatsApp messages yet" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => setViewing(m)}>
                  <TableCell className="px-4 text-xs whitespace-nowrap">{formatDateTime(m.scheduledAt && m.sentStatus === "Scheduled" ? m.scheduledAt : m.createdAt)}</TableCell>
                  <TableCell className="px-4">
                    <p className="text-sm font-medium">{m.recipientName || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      +{m.countryCode} {m.mobileNumber}
                      {m.direction === "Inbound" ? " · inbound" : ""}
                    </p>
                  </TableCell>
                  <TableCell className="px-4">
                    <ChannelPill channel={m.channel} />
                  </TableCell>
                  <TableCell className="px-4 text-xs">{m.messageType}</TableCell>
                  <TableCell className="px-4 max-w-[280px]">
                    <p className="text-xs truncate">{m.body}</p>
                    <p className="text-[11px] text-muted-foreground">{m.characterCount} chars</p>
                  </TableCell>
                  <TableCell className="px-4 text-xs">{m.priority}</TableCell>
                  <TableCell className="px-4">
                    <StatusPill status={m.consentStatus} />
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusPill status={m.sentStatus} />
                  </TableCell>
                  <TableCell className="px-4 text-xs">{m.channel === "WhatsApp" ? m.readStatus || "Unread" : "—"}</TableCell>
                  <TableCell className="px-4 text-xs capitalize">{m.provider || "—"}</TableCell>
                  <TableCell className="px-4 text-right" onClick={(ev) => ev.stopPropagation()}>
                    {m.sentStatus === "Failed" && m.direction !== "Inbound" && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => retry.mutate(m.id)}>
                        <RefreshCw className="size-3.5" /> Retry
                      </Button>
                    )}
                    {m.sentStatus === "Scheduled" && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => cancel.mutate(m.id)}>
                        <XCircle className="size-3.5" /> Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} limit={limit} total={data?.pagination?.total || 0} onPage={setPage} />

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewing?.channel} message</SheetTitle>
          </SheetHeader>
          {viewing && (
            <div className="flex flex-col gap-3 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <ReadOnlyField label="Message ID" value={<span className="font-mono text-[11px]">{viewing.id}</span>} />
                <ReadOnlyField label="Channel" value={viewing.channel} />
                <ReadOnlyField label="Message type" value={viewing.messageType} />
                <ReadOnlyField label="Template ID" value={viewing.templateId} />
                <ReadOnlyField label="Character count" value={viewing.characterCount} />
                <ReadOnlyField label="CTA link" value={viewing.ctaLink} />
                <ReadOnlyField label="Applicant ID" value={viewing.applicationNo || viewing.applicationId} />
                <ReadOnlyField label="Full name" value={viewing.recipientName} />
                <ReadOnlyField label="Mobile number" value={viewing.mobileNumber} />
                <ReadOnlyField label="Country code" value={`+${viewing.countryCode}`} />
                <ReadOnlyField label="Preferred language" value={viewing.preferredLanguage} />
                <ReadOnlyField label="Consent / opt-in" value={<StatusPill status={viewing.consentStatus} />} />
                <ReadOnlyField label="Trigger event" value={viewing.triggerEvent} />
                <ReadOnlyField label="Scheduled date & time" value={viewing.scheduledAt ? formatDateTime(viewing.scheduledAt) : null} />
                <ReadOnlyField label="Priority" value={viewing.priority} />
                <ReadOnlyField label="Time zone" value={viewing.timeZone} />
                <ReadOnlyField label="Sent status" value={<StatusPill status={viewing.sentStatus} />} />
                <ReadOnlyField label="Read status" value={viewing.channel === "WhatsApp" ? viewing.readStatus || "Unread" : "n/a (SMS)"} />
                <ReadOnlyField label="Delivery timestamp" value={viewing.deliveredAt ? formatDateTime(viewing.deliveredAt) : null} />
                <ReadOnlyField label="Provider" value={viewing.provider} />
              </div>
              {viewing.failureReason && <ReadOnlyField label="Failure reason" value={<span className="text-destructive">{viewing.failureReason}</span>} />}
              {viewing.mediaUrl && (
                <ReadOnlyField
                  label="Media attachment"
                  value={
                    <a href={viewing.mediaUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                      {viewing.mediaUrl}
                    </a>
                  }
                />
              )}
              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-xs font-sans">{viewing.body}</pre>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── consent ──

function ConsentTab() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const debounced = useDebounced(search);
  const { data, isLoading } = useConsents(page, 20, { search: debounced, channel, status });
  const setConsent = useSetConsent();
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ mobile: "", countryCode: "91", channel: "WhatsApp", status: "Opted In", source: "Manual (staff)" });
  const rows = data?.data || [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Input placeholder="Search mobile number…" className="h-10 pr-10" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <FilterSelect value={channel} onChange={(v) => (setChannel(v), setPage(1))} all="All channels" options={["SMS", "WhatsApp"]} />
          <FilterSelect value={status} onChange={(v) => (setStatus(v), setPage(1))} all="All statuses" options={["Opted In", "Opted Out"]} />
          <Button className="h-10 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Record consent
          </Button>
        </div>
      </div>
      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Mobile</Th>
              <Th>Channel</Th>
              <Th>Status</Th>
              <Th>Source</Th>
              <Th>Preferred language</Th>
              <Th>Updated</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="No consent records" description="Opt-ins / opt-outs (including STOP replies) are recorded here." />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="px-4 text-sm">
                    +{c.countryCode} {c.mobileNumber}
                  </TableCell>
                  <TableCell className="px-4">
                    <ChannelPill channel={c.channel} />
                  </TableCell>
                  <TableCell className="px-4">
                    <StatusPill status={c.status} />
                  </TableCell>
                  <TableCell className="px-4 text-xs">{c.source || "—"}</TableCell>
                  <TableCell className="px-4 text-xs">{c.preferredLanguage || "—"}</TableCell>
                  <TableCell className="px-4 text-xs">{formatDateTime(c.updatedAt)}</TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() =>
                        setConsent.mutate({
                          mobile: c.mobileNumber,
                          countryCode: c.countryCode,
                          channel: c.channel as "SMS" | "WhatsApp",
                          status: c.status === "Opted In" ? "Opted Out" : "Opted In",
                          source: "Manual (staff)",
                        })
                      }
                    >
                      Mark {c.status === "Opted In" ? "opted out" : "opted in"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} limit={20} total={data?.pagination?.total || 0} onPage={setPage} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Record consent</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Code">
              <Input className="h-10" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} />
            </Field>
            <Field label="Mobile number" className="col-span-2">
              <Input className="h-10" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </Field>
            <Field label="Channel">
              <FilterSelect value={form.channel} onChange={(v) => setForm({ ...form, channel: v })} options={["SMS", "WhatsApp"]} />
            </Field>
            <Field label="Status" className="col-span-2">
              <FilterSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={["Opted In", "Opted Out"]} />
            </Field>
            <Field label="Source" className="col-span-3">
              <Input className="h-10" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.mobile || setConsent.isPending}
              onClick={() =>
                setConsent.mutate(
                  {
                    mobile: form.mobile,
                    countryCode: form.countryCode,
                    channel: form.channel as "SMS" | "WhatsApp",
                    status: form.status as "Opted In" | "Opted Out",
                    source: form.source,
                  },
                  { onSuccess: () => setAddOpen(false) },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── shared ──

function FilterSelect({
  value,
  onChange,
  options,
  all,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  all?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[150px] h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {all && <SelectItem value="all">{all}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PickAndLogDialog({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = React.useState<PickedRecipient[]>([]);
  const [step, setStep] = React.useState<"pick" | "log">("pick");
  const r = picked[0];
  if (step === "log" && r) {
    return <LogInteractionDialog applicationId={r.applicationId} leadId={r.leadId} onClose={onClose} />;
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Log interaction — choose applicant / lead</DialogTitle>
        </DialogHeader>
        <RecipientPicker value={picked} onChange={(v) => setPicked(v.filter((x) => x.kind !== "Manual"))} multiple={false} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!r} onClick={() => setStep("log")}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
