"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  MailCheck,
  MailOpen,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  Search,
  Send,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCampaignPreview,
  useCampaignStats,
  useSendCampaignNow,
  useSetCampaignStatus,
  useTestCampaign,
} from "@/hooks/use-email-campaigns";
import { formatInZone } from "@/lib/scheduled-communications";
import {
  EmptyState,
  Field,
  Pager,
  ReadOnlyField,
  SectionCard,
  StatCard,
  StatusPill,
  Th,
  formatDateTime,
  pill,
  tableHeaderClass,
  tableShell,
} from "../../communications/_components/comm-ui";

export default function EmailCampaignStatsPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuthStore((s) => s.user?.role) || "";
  const canManage = ["org_admin", "superadmin", "lead_manager", "application_manager"].includes(role);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useCampaignStats(id, page, 25, { status, search });
  const c = data?.campaign;
  usePageHeader({ title: c ? c.name : "Campaign", description: c ? `${c.campaignCode} · ${c.campaignType} · ${c.objective}` : undefined });

  const setSt = useSetCampaignStatus();
  const sendNow = useSendCampaignNow();
  const test = useTestCampaign();
  const [testOpen, setTestOpen] = React.useState(false);
  const [testTo, setTestTo] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const { data: preview } = useCampaignPreview(previewOpen ? id : null);

  if (isLoading || !c) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Loading…
          </>
        ) : (
          "Campaign not found."
        )}
      </div>
    );
  }

  const recipients = data?.recipients;
  const maxDaily = Math.max(1, ...(data?.daily || []).map((d) => d.sent));

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/organization/email-campaigns">
            <ArrowLeft className="size-4" /> Campaigns
          </Link>
        </Button>
        <StatusPill status={c.status} />
        {c.isRunning && <span className={pill.blue}>Sending…</span>}
        <div className="flex-1" />
        <Button variant="outline" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
          <Eye className="size-4" /> Preview
        </Button>
        {canManage && (
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => setTestOpen(true)}>
              <MailCheck className="size-4" /> Send test
            </Button>
            {c.status !== "Completed" && (
              <Button asChild variant="outline" className="gap-1.5">
                <Link href={`/organization/email-campaigns/${c.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
            )}
            {(c.status === "Draft" || c.status === "Paused") && (
              <Button variant="outline" className="gap-1.5" onClick={() => setSt.mutate({ id: c.id, status: "Active" })}>
                <Play className="size-4" /> {c.status === "Paused" ? "Resume" : "Activate"}
              </Button>
            )}
            {c.status === "Active" && (
              <Button variant="outline" className="gap-1.5" onClick={() => setSt.mutate({ id: c.id, status: "Paused" })}>
                <Pause className="size-4" /> Pause
              </Button>
            )}
            {c.status !== "Completed" && (
              <Button className="gap-1.5" disabled={sendNow.isPending || c.isRunning} onClick={() => sendNow.mutate(c.id)}>
                {sendNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send now
              </Button>
            )}
            {c.status === "Active" && (
              <Button variant="ghost" className="gap-1.5" onClick={() => setSt.mutate({ id: c.id, status: "Completed" })}>
                <CheckCircle2 className="size-4" /> Complete
              </Button>
            )}
          </>
        )}
      </div>

      {c.lastError && <p className={`${pill.red} rounded-md px-3 py-2 text-xs`}>Last run error: {c.lastError}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard icon={<Send className="size-5" />} label="Total sent" value={c.totalSent} hint={`${c.failedCount} failed · ${c.skippedCount} skipped`} />
        <StatCard
          icon={<MailCheck className="size-5" />}
          label="Delivered"
          value={c.deliveredCount}
          color="#059669"
          bg="#ECFDF5"
          ratio={c.deliveryRate / 100}
          hint={`${c.deliveryRate}% of sent`}
        />
        <StatCard icon={<MailOpen className="size-5" />} label="Open rate" value={`${c.openRate}%`} color="#2563EB" bg="#EFF6FF" ratio={c.openRate / 100} hint={`${c.openCount} unique opens`} />
        <StatCard
          icon={<MousePointerClick className="size-5" />}
          label="Click rate"
          value={`${c.clickRate}%`}
          color="#7C3AED"
          bg="#F5F3FF"
          ratio={c.clickRate / 100}
          hint={`${c.clickCount} unique clicks`}
        />
        <StatCard icon={<Ban className="size-5" />} label="Bounce rate" value={`${c.bounceRate}%`} color="#DC2626" bg="#FEF2F2" ratio={c.bounceRate / 100} hint={`${c.bounceCount} bounced`} />
        <StatCard
          icon={<UserMinus className="size-5" />}
          label="Unsubscribes"
          value={c.unsubscribeCount}
          color="#D97706"
          bg="#FFFBEB"
          ratio={c.unsubscribeRate / 100}
          hint={`${c.unsubscribeRate}% of delivered`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <SectionCard title="Sends per day" description="Recipients emailed, opened and clicked by day of last send.">
            {(data?.daily || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing sent yet.</p>
            ) : (
              <div className="flex items-end gap-2 h-[160px] overflow-x-auto">
                {(data?.daily || []).map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-1 min-w-[38px]">
                    <div className="flex items-end gap-[2px] h-[120px]">
                      <div className="w-2.5 rounded-t bg-[#2563EB]" style={{ height: `${(d.sent / maxDaily) * 100}%` }} title={`Sent ${d.sent}`} />
                      <div className="w-2.5 rounded-t bg-[#059669]" style={{ height: `${(d.opened / maxDaily) * 100}%` }} title={`Opened ${d.opened}`} />
                      <div className="w-2.5 rounded-t bg-[#7C3AED]" style={{ height: `${(d.clicked / maxDaily) * 100}%` }} title={`Clicked ${d.clicked}`} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-[#2563EB]" /> Sent
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-[#059669]" /> Opened
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-[#7C3AED]" /> Clicked
              </span>
            </div>
          </SectionCard>

          <SectionCard title="Recipients">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Input placeholder="Search email or name…" className="h-10 pr-10" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
                <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
              </div>
              <Select value={status} onValueChange={(v) => (setStatus(v), setPage(1))}>
                <SelectTrigger className="w-full sm:w-[170px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All recipients</SelectItem>
                  {["Delivered", "Opened", "Clicked", "Bounced", "Failed", "Unsubscribed", "Stopped", "Pending"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(data?.breakdown || {}).map(([k, v]) => (
                <span key={k} className={pill.gray}>
                  {k}: {v}
                </span>
              ))}
            </div>
            <div className={tableShell}>
              <Table>
                <TableHeader className={tableHeaderClass}>
                  <TableRow className="hover:bg-transparent">
                    <Th>Recipient</Th>
                    <Th>Audience</Th>
                    <Th>Sends</Th>
                    <Th>Last sent</Th>
                    <Th>Opened</Th>
                    <Th>Clicks</Th>
                    <Th>Status</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recipients?.data || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState title="No recipients yet" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipients!.data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="px-4">
                          {r.applicationId || r.leadId ? (
                            <Link
                              href={r.applicationId ? `/organization/communications/app/${r.applicationId}` : `/organization/communications/lead/${r.leadId}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {r.name || r.email}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium">{r.name || r.email}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground">{r.email}</p>
                        </TableCell>
                        <TableCell className="px-4 text-xs">{r.audienceType || "—"}</TableCell>
                        <TableCell className="px-4 text-xs">{r.sendCount}</TableCell>
                        <TableCell className="px-4 text-xs whitespace-nowrap">{formatDateTime(r.lastSentAt)}</TableCell>
                        <TableCell className="px-4 text-xs whitespace-nowrap">{r.firstOpenedAt ? `${formatDateTime(r.firstOpenedAt)} (${r.openCount}×)` : "—"}</TableCell>
                        <TableCell className="px-4 text-xs">{r.clickCount}</TableCell>
                        <TableCell className="px-4">
                          <StatusPill status={r.status} />
                          {(r.failureReason || r.stoppedReason) && (
                            <p className="text-[11px] text-muted-foreground max-w-[200px] truncate" title={r.failureReason || r.stoppedReason || ""}>
                              {r.failureReason || r.stoppedReason}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <Pager page={page} limit={25} total={recipients?.total || 0} onPage={setPage} />
          </SectionCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <SectionCard title="Campaign information">
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="Campaign ID" value={c.campaignCode} />
              <ReadOnlyField label="Target program" value={c.targetProgram || "All programs"} />
              <ReadOnlyField label="Academic year / intake" value={[c.academicYear, c.intakeTerm].filter(Boolean).join(" · ")} />
              <ReadOnlyField label="Target audience" value={c.targetAudience.join(", ")} />
              <ReadOnlyField label="Segment criteria" value={c.segmentCriteria.join(", ")} />
              <ReadOnlyField label="Created by" value={c.createdByName} />
              <ReadOnlyField label="Created / modified" value={`${formatDateTime(c.createdAt)} · ${formatDateTime(c.updatedAt)}`} />
            </div>
          </SectionCard>
          <SectionCard title="Automation & scheduling">
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="Frequency" value={c.frequency} />
              <ReadOnlyField label="Trigger event" value={c.triggerEvent} />
              {c.deadlineAt && <ReadOnlyField label="Deadline" value={formatInZone(c.deadlineAt, c.timeZone)} />}
              <ReadOnlyField label="Scheduled send" value={c.scheduledAt ? formatInZone(c.scheduledAt, c.timeZone) : "On activation"} />
              <ReadOnlyField label="Next run" value={c.nextRunAt ? formatInZone(c.nextRunAt, c.timeZone) : null} />
              <ReadOnlyField label="Last run" value={c.lastRunAt ? formatInZone(c.lastRunAt, c.timeZone) : null} />
              <ReadOnlyField label="Time zone" value={c.timeZone} />
              <ReadOnlyField label="Max sends per applicant" value={c.maxSendsPerRecipient} />
              <ReadOnlyField label="Stop condition" value={c.stopConditions.join(", ")} />
            </div>
          </SectionCard>
          <SectionCard title="Email content">
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="Subject" value={c.subject} />
              <ReadOnlyField label="Pre-header" value={c.preHeader} />
              <ReadOnlyField label="Language" value={c.language} />
              <ReadOnlyField label="Variables" value={c.personalizationVariables.map((v) => `{{${v}}}`).join(" ")} />
              <ReadOnlyField
                label="Attachments"
                value={
                  c.attachments.length ? (
                    <div className="flex flex-col gap-1">
                      {c.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-primary underline">
                          {a.type ? `${a.type}: ` : ""}
                          {a.name}
                        </a>
                      ))}
                    </div>
                  ) : null
                }
              />
              <ReadOnlyField label="Footer address" value={c.footerAddress} />
            </div>
          </SectionCard>
        </div>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Send a test email</DialogTitle>
          </DialogHeader>
          <Field label="Recipient email" required>
            <Input className="h-10" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!/\S+@\S+\.\S+/.test(testTo) || test.isPending} onClick={() => test.mutate({ id: c.id, to: testTo }, { onSuccess: () => setTestOpen(false) })}>
              {test.isPending && <Loader2 className="size-4 animate-spin" />} Send test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.subject || "Preview"}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <iframe title="campaign-preview" sandbox="" srcDoc={preview.html} className="w-full h-[560px] rounded-md border border-border bg-white" />
          ) : (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
