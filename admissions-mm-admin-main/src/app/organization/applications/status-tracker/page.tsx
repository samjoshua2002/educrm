"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, Search, SearchX, UserCheck, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { useBulkAssignCounsellor, useBulkChangeStage, useTrackerCounsellors, useTrackerDashboard } from "@/hooks/use-application-tracker";
import { APPLICATION_SOURCES, APPLICATION_STATUSES, TRACKER_STAGES } from "@/types/application-management";

const TH = "py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto";
const pill = "font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block whitespace-nowrap";
const stageClass: Record<string, string> = {
  "Application Started": `bg-slate-500/10 text-slate-700 ${pill}`,
  "Fee Paid": `bg-blue-500/10 text-blue-700 ${pill}`,
  "Documents Uploaded": `bg-indigo-500/10 text-indigo-700 ${pill}`,
  "Under Review": `bg-yellow-500/10 text-yellow-700 ${pill}`,
  Verified: `bg-teal-500/10 text-teal-700 ${pill}`,
  Shortlisted: `bg-cyan-500/10 text-cyan-700 ${pill}`,
  Approved: `bg-green-500/10 text-green-700 ${pill}`,
  Rejected: `bg-red-500/10 text-red-700 ${pill}`,
  Waitlisted: `bg-amber-500/10 text-amber-700 ${pill}`,
};

function fmt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function TrackerInner() {
  const params = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "org_admin" || role === "application_manager" || role === "superadmin";

  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [stage, setStage] = React.useState(params.get("stage") || "all");
  const [appStatus, setAppStatus] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [counsellor, setCounsellor] = React.useState("all");
  const [slaOnly, setSlaOnly] = React.useState(params.get("slaBreached") === "true");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [bulk, setBulk] = React.useState<null | "stage" | "assign">(null);
  const [bulkStage, setBulkStage] = React.useState<string>("Under Review");
  const [bulkRemarks, setBulkRemarks] = React.useState("");
  const [bulkVisible, setBulkVisible] = React.useState(true);
  const [bulkCounsellor, setBulkCounsellor] = React.useState("unassigned");

  usePageHeader({
    title: "Application Status Tracker",
    description: "Track every application through Started → Fee Paid → Documents → Review → Verified / Shortlisted → Decision, with SLA monitoring.",
    action: canEdit ? { label: "SLA & Reminder Rules", href: "/organization/settings/reminders" } : null,
  });

  React.useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useTrackerDashboard({
    page,
    limit: 20,
    search: appliedSearch,
    stage,
    applicationStatus: appStatus,
    source,
    counsellorId: counsellor,
    slaBreached: slaOnly ? "true" : undefined,
    dateFrom,
    dateTo,
  });
  const { data: counsellorList } = useTrackerCounsellors();
  const counsellors = counsellorList || [];
  const bulkStageM = useBulkChangeStage();
  const bulkAssignM = useBulkAssignCounsellor();
  const rows = data?.data || [];
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  React.useEffect(() => setSelected([]), [page, appliedSearch, stage, appStatus, source, counsellor, slaOnly, dateFrom, dateTo]);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TRACKER_STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStage(stage === s ? "all" : s);
              setPage(1);
            }}
            className={`text-left rounded-[12px] border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-all ${stage === s ? "border-[#2563EB] ring-1 ring-[#2563EB]" : "border-border"}`}
          >
            <p className="text-[11px] font-medium text-muted-foreground">{s}</p>
            <p className="text-2xl font-bold text-[#0F172A] dark:text-foreground">{data?.stageCounts?.[s] ?? 0}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setSlaOnly(!slaOnly);
            setPage(1);
          }}
          className={`text-left rounded-[12px] border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-all ${slaOnly ? "border-red-500 ring-1 ring-red-500" : "border-border"}`}
        >
          <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
            <AlertTriangle className="size-3" /> SLA breached
          </p>
          <p className="text-2xl font-bold text-red-600">{data?.slaBreachedCount ?? 0}</p>
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <Input placeholder="Search by name, email, phone or application no..." className="h-10 pr-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Search className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <Input type="date" className="h-10 w-full lg:w-[150px] bg-background" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          <Input type="date" className="h-10 w-full lg:w-[150px] bg-background" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Select value={stage} onValueChange={(v) => { setStage(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[190px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {TRACKER_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={appStatus} onValueChange={(v) => { setAppStatus(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[170px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
            <SelectTrigger className="h-10 w-[150px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {APPLICATION_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {role !== "counselor" && (
            <Select value={counsellor} onValueChange={(v) => { setCounsellor(v); setPage(1); }}>
              <SelectTrigger className="h-10 w-[190px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counsellors</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {counsellors.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {canEdit && selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#2563EB]/30 bg-blue-50/60 px-4 py-3">
          <span className="text-sm font-medium text-[#1D4ED8]">{selected.length} application(s) selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => setBulk("assign")}>
              <UserCheck className="size-4" /> Assign counsellor
            </Button>
            <Button size="sm" className="gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white" onClick={() => setBulk("stage")}>
              <Workflow className="size-4" /> Change stage
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent">
              {canEdit && (
                <TableHead className="w-10 px-4">
                  <Checkbox checked={allChecked} onCheckedChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])} />
                </TableHead>
              )}
              <TableHead className={TH}>Applicant</TableHead>
              <TableHead className={TH}>Program / Year</TableHead>
              <TableHead className={TH}>Application Status</TableHead>
              <TableHead className={TH}>Current Stage</TableHead>
              <TableHead className={TH}>SLA</TableHead>
              <TableHead className={TH}>Counsellor</TableHead>
              <TableHead className={TH}>Source</TableHead>
              <TableHead className={TH}>Started / Submitted</TableHead>
              <TableHead className={TH}>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center">
                  <Loader2 className="size-6 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <SearchX className="size-6 text-muted-foreground" />
                    <p className="text-sm font-semibold">No applications match these filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="border-b border-border/80 hover:bg-muted/15">
                  {canEdit && (
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selected.includes(r.id)}
                        onCheckedChange={(v) => setSelected(v ? [...selected, r.id] : selected.filter((x) => x !== r.id))}
                      />
                    </TableCell>
                  )}
                  <TableCell className="py-4 px-4">
                    <Link href={`/organization/applications/${encodeURIComponent(r.applicationNo)}`} className="font-semibold text-sm hover:underline">
                      {r.applicantName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{r.applicationNo}</p>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-sm">
                    <p>{r.programApplied || "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.academicYear || "—"}</p>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <Badge variant="secondary" className="text-xs">{r.applicationStatus}</Badge>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <span className={stageClass[r.currentStage] || stageClass["Application Started"]}>{r.currentStage}</span>
                    <p className="text-[11px] text-muted-foreground mt-1">since {fmt(r.stageUpdatedAt)}</p>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs">
                    {r.slaBreached ? (
                      <span className={`bg-red-500/10 text-red-700 ${pill}`}>Breached</span>
                    ) : r.slaDueAt ? (
                      <span className="text-muted-foreground">Due {fmt(r.slaDueAt)}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="py-4 px-4 text-sm">{r.assignedCounsellorName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell className="py-4 px-4 text-sm">{r.applicationSource || "—"}</TableCell>
                  <TableCell className="py-4 px-4 text-xs text-muted-foreground">
                    <p>{fmt(r.applicationStartDate)}</p>
                    <p>{r.applicationSubmissionDate ? fmt(r.applicationSubmissionDate) : "Not submitted"}</p>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs text-muted-foreground">{fmt(r.lastUpdated)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-3 px-4 text-sm">
          <span className="text-muted-foreground">{data?.total ?? 0} application(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {data?.page ?? 1} of {Math.max(1, data?.totalPages ?? 1)}</span>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={bulk === "stage"} onOpenChange={(v) => !v && setBulk(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change stage</DialogTitle>
            <DialogDescription>Move {selected.length} application(s) to a new stage. Every change is written to the timeline.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Stage</Label>
              <Select value={bulkStage} onValueChange={setBulkStage}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRACKER_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Internal remarks</Label>
              <Textarea rows={2} value={bulkRemarks} onChange={(e) => setBulkRemarks(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={bulkVisible} onCheckedChange={(v) => setBulkVisible(!!v)} />
              Visible to applicants
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulk(null)}>Cancel</Button>
            <Button
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={bulkStageM.isPending}
              onClick={() =>
                bulkStageM.mutate(
                  { applicationIds: selected, stage: bulkStage, internalRemarks: bulkRemarks || undefined, applicantVisible: bulkVisible },
                  { onSuccess: () => { setBulk(null); setSelected([]); setBulkRemarks(""); } },
                )
              }
            >
              {bulkStageM.isPending && <Loader2 className="size-4 animate-spin mr-1" />} Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulk === "assign"} onOpenChange={(v) => !v && setBulk(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign counsellor</DialogTitle>
            <DialogDescription>Assign {selected.length} application(s) to a counsellor.</DialogDescription>
          </DialogHeader>
          <Select value={bulkCounsellor} onValueChange={setBulkCounsellor}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {counsellors.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulk(null)}>Cancel</Button>
            <Button
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={bulkAssignM.isPending}
              onClick={() =>
                bulkAssignM.mutate(
                  { applicationIds: selected, assignedCounselorId: bulkCounsellor === "unassigned" ? null : bulkCounsellor },
                  { onSuccess: () => { setBulk(null); setSelected([]); } },
                )
              }
            >
              {bulkAssignM.isPending && <Loader2 className="size-4 animate-spin mr-1" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StatusTrackerPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="size-6 animate-spin text-primary" /></div>}>
      <TrackerInner />
    </React.Suspense>
  );
}
