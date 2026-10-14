"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Ban,
  CheckCircle2,
  Copy,
  EllipsisVertical,
  Loader2,
  MailOpen,
  Megaphone,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import {
  useAddSuppression,
  useCampaignOverview,
  useDeleteCampaign,
  useDuplicateCampaign,
  useEmailCampaigns,
  useRemoveSuppression,
  useSendCampaignNow,
  useSetCampaignStatus,
  useSuppressions,
} from "@/hooks/use-email-campaigns";
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, type EmailCampaign } from "@/types/communications";
import {
  EmptyState,
  Field,
  Pager,
  StatCard,
  StatusPill,
  TabBar,
  Th,
  formatDateTime,
  pill,
  tableHeaderClass,
  tableShell,
} from "../communications/_components/comm-ui";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function EmailCampaignsPage() {
  usePageHeader({
    title: "Email Campaigns",
    description: "Targeted, scheduled and automated email campaigns with open, click, bounce and unsubscribe tracking.",
  });
  const [tab, setTab] = React.useState<"campaigns" | "suppression">("campaigns");
  const { data: o } = useCampaignOverview();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard icon={<Megaphone className="size-5" />} label="Campaigns" value={o?.campaigns ?? 0} hint={`${o?.active ?? 0} active`} />
        <StatCard icon={<Send className="size-5" />} label="Emails sent" value={o?.totalSent ?? 0} color="#7C3AED" bg="#F5F3FF" hint={`${o?.delivered ?? 0} delivered`} />
        <StatCard icon={<MailOpen className="size-5" />} label="Open rate" value={`${o?.openRate ?? 0}%`} color="#059669" bg="#ECFDF5" ratio={(o?.openRate ?? 0) / 100} />
        <StatCard
          icon={<MousePointerClick className="size-5" />}
          label="Click rate"
          value={`${o?.clickRate ?? 0}%`}
          color="#D97706"
          bg="#FFFBEB"
          ratio={(o?.clickRate ?? 0) / 100}
        />
        <StatCard
          icon={<Ban className="size-5" />}
          label="Bounce rate"
          value={`${o?.bounceRate ?? 0}%`}
          color="#DC2626"
          bg="#FEF2F2"
          ratio={(o?.bounceRate ?? 0) / 100}
          hint={`${o?.unsubscribed ?? 0} unsubscribed · ${o?.suppressed ?? 0} suppressed`}
        />
      </div>

      <TabBar
        tabs={[
          { value: "campaigns", label: "Campaigns" },
          { value: "suppression", label: "Suppression list" },
        ]}
        active={tab}
        onChange={(v) => setTab(v as any)}
      />
      {tab === "campaigns" ? <CampaignsTable /> : <SuppressionList />}
    </div>
  );
}

function CampaignsTable() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role) || "";
  const canManage = ["org_admin", "superadmin", "lead_manager", "application_manager"].includes(role);
  const isAdmin = role === "org_admin" || role === "superadmin";
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [campaignType, setCampaignType] = React.useState("all");
  const [objective, setObjective] = React.useState("all");
  const debounced = useDebounced(search);
  const { data, isLoading } = useEmailCampaigns(page, 20, { search: debounced, status, campaignType, objective });
  const setSt = useSetCampaignStatus();
  const sendNow = useSendCampaignNow();
  const dup = useDuplicateCampaign();
  const del = useDeleteCampaign();
  const [deleting, setDeleting] = React.useState<EmailCampaign | null>(null);
  const rows = data?.data || [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Input placeholder="Search by name, subject or campaign ID…" className="h-10 pr-10" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-3 sm:flex gap-2">
          <Filter value={status} onChange={(v) => (setStatus(v), setPage(1))} all="All statuses" options={CAMPAIGN_STATUSES} />
          <Filter value={campaignType} onChange={(v) => (setCampaignType(v), setPage(1))} all="All types" options={CAMPAIGN_TYPES} />
          <Filter value={objective} onChange={(v) => (setObjective(v), setPage(1))} all="All objectives" options={CAMPAIGN_OBJECTIVES} />
        </div>
        {canManage && (
          <Button asChild className="h-10 gap-1.5">
            <Link href="/organization/email-campaigns/create">
              <Plus className="size-4" /> New campaign
            </Link>
          </Button>
        )}
      </div>

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Campaign</Th>
              <Th>Type</Th>
              <Th>Objective</Th>
              <Th>Audience</Th>
              <Th>Schedule</Th>
              <Th>Sent</Th>
              <Th>Open</Th>
              <Th>Click</Th>
              <Th>Bounce</Th>
              <Th>Unsub.</Th>
              <Th>Status</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12}>
                  <EmptyState title="No campaigns yet" description="Create a campaign to nurture prospects and remind applicants." />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/organization/email-campaigns/${c.id}`)}>
                  <TableCell className="px-4 max-w-[260px]">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {c.campaignCode} · {c.targetProgram || "All programs"}
                    </p>
                  </TableCell>
                  <TableCell className="px-4 text-xs">{c.campaignType}</TableCell>
                  <TableCell className="px-4 text-xs">{c.objective}</TableCell>
                  <TableCell className="px-4 text-xs max-w-[160px] truncate">{c.targetAudience.join(", ")}</TableCell>
                  <TableCell className="px-4 text-xs whitespace-nowrap">
                    {c.mode === "event" ? (
                      <span className={pill.purple}>On {c.triggerEvent}</span>
                    ) : c.nextRunAt && c.status === "Active" ? (
                      <>
                        <p>{formatDateTime(c.nextRunAt)}</p>
                        <p className="text-[11px] text-muted-foreground">{c.frequency}</p>
                      </>
                    ) : (
                      c.frequency
                    )}
                  </TableCell>
                  <TableCell className="px-4 text-sm font-medium">{c.totalSent}</TableCell>
                  <TableCell className="px-4 text-xs">{c.openRate}%</TableCell>
                  <TableCell className="px-4 text-xs">{c.clickRate}%</TableCell>
                  <TableCell className="px-4 text-xs">{c.bounceRate}%</TableCell>
                  <TableCell className="px-4 text-xs">{c.unsubscribeCount}</TableCell>
                  <TableCell className="px-4">
                    <StatusPill status={c.status} />
                    {c.isRunning && <span className="ml-1 text-[11px] text-muted-foreground">sending…</span>}
                  </TableCell>
                  <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/organization/email-campaigns/${c.id}`)}>
                          <BarChart3 className="size-4" /> Statistics
                        </DropdownMenuItem>
                        {canManage && c.status !== "Completed" && (
                          <DropdownMenuItem onClick={() => router.push(`/organization/email-campaigns/${c.id}/edit`)}>
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canManage && (c.status === "Draft" || c.status === "Paused") && (
                          <DropdownMenuItem onClick={() => setSt.mutate({ id: c.id, status: "Active" })}>
                            <Play className="size-4" /> {c.status === "Paused" ? "Resume" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {canManage && c.status === "Active" && (
                          <DropdownMenuItem onClick={() => setSt.mutate({ id: c.id, status: "Paused" })}>
                            <Pause className="size-4" /> Pause
                          </DropdownMenuItem>
                        )}
                        {canManage && c.status !== "Completed" && (
                          <DropdownMenuItem onClick={() => sendNow.mutate(c.id)}>
                            <Send className="size-4" /> Send now
                          </DropdownMenuItem>
                        )}
                        {canManage && c.status !== "Completed" && c.status !== "Draft" && (
                          <DropdownMenuItem onClick={() => setSt.mutate({ id: c.id, status: "Completed" })}>
                            <CheckCircle2 className="size-4" /> Mark completed
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <DropdownMenuItem onClick={() => dup.mutate(c.id)}>
                            <Copy className="size-4" /> Duplicate
                          </DropdownMenuItem>
                        )}
                        {isAdmin && c.status !== "Active" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(c)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </>
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
      <Pager page={page} limit={20} total={data?.pagination?.total || 0} onPage={setPage} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.name}” and its recipient statistics will be removed. Sent emails stay in the communication history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SuppressionList() {
  const role = useAuthStore((s) => s.user?.role) || "";
  const isAdmin = role === "org_admin" || role === "superadmin";
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [reason, setReason] = React.useState("all");
  const debounced = useDebounced(search);
  const { data, isLoading } = useSuppressions(page, 25, { search: debounced, reason });
  const add = useAddSuppression();
  const remove = useRemoveSuppression();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const rows = data?.data || [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Addresses here never receive campaign, compose, scheduled or template emails. Unsubscribes and hard bounces are added automatically.
      </p>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Input placeholder="Search email…" className="h-10 pr-10" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <Filter value={reason} onChange={(v) => (setReason(v), setPage(1))} all="All reasons" options={["Unsubscribed", "Hard Bounce", "Manual"]} />
        <Button className="h-10 gap-1.5" onClick={() => setOpen(true)}>
          <ShieldOff className="size-4" /> Suppress address
        </Button>
      </div>
      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Email</Th>
              <Th>Reason</Th>
              <Th>Note</Th>
              <Th>Added</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="Suppression list is empty" />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="px-4 text-sm">{s.email}</TableCell>
                  <TableCell className="px-4">
                    <span className={s.reason === "Hard Bounce" ? pill.red : s.reason === "Unsubscribed" ? pill.amber : pill.gray}>{s.reason}</span>
                  </TableCell>
                  <TableCell className="px-4 text-xs max-w-[300px] truncate">{s.note || "—"}</TableCell>
                  <TableCell className="px-4 text-xs">{formatDateTime(s.createdAt)}</TableCell>
                  <TableCell className="px-4 text-right">
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => remove.mutate(s.id)}>
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} limit={25} total={data?.pagination?.total || 0} onPage={setPage} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Suppress an email address</DialogTitle>
          </DialogHeader>
          <Field label="Email" required>
            <Input className="h-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Note">
            <Input className="h-10" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!/\S+@\S+\.\S+/.test(email) || add.isPending}
              onClick={() =>
                add.mutate(
                  { email, reason: "Manual", note: note || undefined },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      setEmail("");
                      setNote("");
                    },
                  },
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Filter({ value, onChange, options, all }: { value: string; onChange: (v: string) => void; options: readonly string[]; all: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[150px] h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
