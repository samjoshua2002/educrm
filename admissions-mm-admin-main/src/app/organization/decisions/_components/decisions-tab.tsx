"use client";

import * as React from "react";

import Link from "next/link";

import { Eye, Layers, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useBulkDecision,
  useDecisionList,
  useDecisionPicklists,
  type BulkDecisionAction,
  type BulkDecisionResult,
  type DecisionStage,
  type FinalDecision,
} from "@/hooks/use-admission-decisions";
import {
  DECISION_STAGE_LABELS,
  FINAL_DECISION_LABELS,
  FINAL_DECISION_TONE,
  STAGE_TONE,
  TONE,
  APPROVAL_STATUS_LABELS,
} from "@/types/admission-decisions";

import {
  CELL,
  EmptyRow,
  LoadingRow,
  Pill,
  ROW,
  TABLE_HEADER,
  TABLE_WRAPPER,
  Th,
  formatDate,
  formatScore,
} from "./shared";

const BULK_ACTIONS: {
  value: BulkDecisionAction;
  label: string;
  hint: string;
}[] = [
  {
    value: "create",
    label: "Start decision records",
    hint: "Creates an Under Review decision for each selected application.",
  },
  {
    value: "assign_committee",
    label: "Assign decision committee",
    hint: "Sets the committee (users and/or teams).",
  },
  {
    value: "advance",
    label: "Advance to next stage",
    hint: "Under Review → Committee Review → Final Approval.",
  },
  {
    value: "finalize",
    label: "Final approval",
    hint: "Approvers only. Approves the chosen final decision, or sends back.",
  },
  {
    value: "release",
    label: "Release decision",
    hint: "Approvers only. Locks the decision and applies the outcome.",
  },
  {
    value: "publish",
    label: "Show to applicant",
    hint: "Makes released decisions visible and sends the communications.",
  },
];

export function DecisionsTab() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [stage, setStage] = React.useState<string>("all");
  const [finalDecision, setFinalDecision] = React.useState<string>("all");
  const [program, setProgram] = React.useState<string>("all");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: rowsData, isLoading } = useDecisionList({
    search: debounced || undefined,
    stage:
      stage === "all" ? undefined : (stage as DecisionStage | "not_started"),
    finalDecision:
      finalDecision === "all" ? undefined : (finalDecision as FinalDecision),
    program: program === "all" ? undefined : program,
  });
  const rows = React.useMemo(() => rowsData ?? [], [rowsData]);
  const { data: picklists } = useDecisionPicklists();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    setSelected(
      (prev) =>
        new Set(
          [...prev].filter((no) => rows.some((r) => r.applicationNo === no)),
        ),
    );
  }, [rows]);

  const [page, setPage] = React.useState(1);
  const perPage = 15;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  React.useEffect(() => setPage(1), [debounced, stage, finalDecision, program]);
  const paged = rows.slice((page - 1) * perPage, page * perPage);

  const allOnPageSelected =
    paged.length > 0 && paged.every((r) => selected.has(r.applicationNo));
  function togglePage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      paged.forEach((r) =>
        checked ? next.add(r.applicationNo) : next.delete(r.applicationNo),
      );
      return next;
    });
  }
  function toggleOne(no: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(no);
      else next.delete(no);
      return next;
    });
  }

  // Bulk dialog
  const bulk = useBulkDecision();
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [action, setAction] = React.useState<BulkDecisionAction>("create");
  const [committee, setCommittee] = React.useState<string[]>([]);
  const [teams, setTeams] = React.useState<string[]>([]);
  const [bulkFinal, setBulkFinal] = React.useState<FinalDecision>("offer_made");
  const [approval, setApproval] = React.useState<"approved" | "rejected">(
    "approved",
  );
  const [visible, setVisible] = React.useState(true);
  const [remarks, setRemarks] = React.useState("");
  const [result, setResult] = React.useState<BulkDecisionResult | null>(null);

  function openBulk() {
    setResult(null);
    setBulkOpen(true);
  }

  function runBulk() {
    bulk.mutate(
      {
        applicationNos: [...selected],
        action,
        decisionCommittee:
          action === "create" || action === "assign_committee"
            ? committee
            : undefined,
        decisionCommitteeTeamIds:
          action === "create" || action === "assign_committee"
            ? teams
            : undefined,
        finalDecision:
          action === "finalize" && approval === "approved"
            ? bulkFinal
            : undefined,
        approvalStatus: action === "finalize" ? approval : undefined,
        applicantVisible: action === "release" ? visible : undefined,
        internalRemarks: remarks.trim() || undefined,
      },
      { onSuccess: (res) => setResult(res) },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, application no. or email"
            className="pl-9 bg-card"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:flex">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="lg:w-[180px] bg-card">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="not_started">Not started</SelectItem>
              {Object.entries(DECISION_STAGE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={finalDecision} onValueChange={setFinalDecision}>
            <SelectTrigger className="lg:w-[170px] bg-card">
              <SelectValue placeholder="Final decision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All decisions</SelectItem>
              {Object.entries(FINAL_DECISION_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger className="lg:w-[200px] bg-card">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {(picklists?.programs || []).map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-sm font-medium text-foreground">
            {selected.size} application(s) selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openBulk}>
              <Layers className="size-3.5" />
              Bulk decision
            </Button>
          </div>
        </div>
      )}

      <div className={TABLE_WRAPPER}>
        <Table>
          <TableHeader className={TABLE_HEADER}>
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <Th className="w-10 pr-0">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={(c) => togglePage(c === true)}
                  aria-label="Select page"
                />
              </Th>
              <Th>Applicant Detail</Th>
              <Th>Decision ID</Th>
              <Th>Program</Th>
              <Th>Decision Score</Th>
              <Th>Stage</Th>
              <Th>Final Decision</Th>
              <Th>Approval</Th>
              <Th>Decision Date</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={10} label="Loading decisions..." />
            ) : paged.length === 0 ? (
              <EmptyRow
                colSpan={10}
                title="No applications found"
                hint="Submitted applications appear here."
              />
            ) : (
              paged.map((row) => {
                const d = row.decision;
                const href = `/organization/decisions/${encodeURIComponent(row.applicationNo)}`;
                return (
                  <TableRow key={row.applicationId} className={ROW}>
                    <TableCell className="py-4 pl-6 pr-0 align-middle w-10">
                      <Checkbox
                        checked={selected.has(row.applicationNo)}
                        onCheckedChange={(c) =>
                          toggleOne(row.applicationNo, c === true)
                        }
                        aria-label={`Select ${row.applicationNo}`}
                      />
                    </TableCell>
                    <TableCell className={CELL}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground tracking-tight">
                          {row.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.applicationNo} · {row.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={`${CELL} text-foreground/80`}>
                      {d ? `DEC-${d.decisionNo}` : "—"}
                    </TableCell>
                    <TableCell className={`${CELL} text-foreground/90`}>
                      {row.program || "—"}
                    </TableCell>
                    <TableCell className={`${CELL} font-medium`}>
                      {formatScore(d?.decisionScore ?? row.compositeScore)}
                    </TableCell>
                    <TableCell className={CELL}>
                      {d ? (
                        <div className="flex items-center gap-1.5">
                          <Pill tone={STAGE_TONE[d.decisionStage]}>
                            {DECISION_STAGE_LABELS[d.decisionStage]}
                          </Pill>
                          {d.decisionLocked && (
                            <Pill tone={TONE.zinc}>Locked</Pill>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not started
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={CELL}>
                      {d?.finalDecision ? (
                        <Pill tone={FINAL_DECISION_TONE[d.finalDecision]}>
                          {FINAL_DECISION_LABELS[d.finalDecision]}
                        </Pill>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className={`${CELL} text-foreground/80`}>
                      {d
                        ? (APPROVAL_STATUS_LABELS[d.approvalStatus] ??
                          d.approvalStatus)
                        : "—"}
                    </TableCell>
                    <TableCell className={`${CELL} text-foreground/80`}>
                      {formatDate(d?.decisionDate)}
                    </TableCell>
                    <TableCell className={`${CELL} text-right`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        asChild
                      >
                        <Link href={href}>
                          <Eye className="size-3.5" />
                          Review
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > perPage && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {rows.length} applications
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Bulk decision</DialogTitle>
            <DialogDescription>
              Apply one action to {selected.size} selected application(s). Each
              one is checked against the workflow rules (stage order, committee,
              approver rights, locks).
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                <strong>{result.succeeded}</strong> succeeded,{" "}
                <strong>{result.failed}</strong> failed.
              </p>
              {result.failed > 0 && (
                <div className="max-h-60 overflow-auto rounded-lg border border-border">
                  {result.results
                    .filter((r) => !r.ok)
                    .map((r) => (
                      <div
                        key={r.applicationNo}
                        className="px-3 py-2 text-xs border-b border-border/60 last:border-0"
                      >
                        <span className="font-semibold text-foreground">
                          {r.applicationNo}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {r.error}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              <DialogFooter>
                <Button
                  onClick={() => {
                    setBulkOpen(false);
                    setSelected(new Set());
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Action</Label>
                <Select
                  value={action}
                  onValueChange={(v) => setAction(v as BulkDecisionAction)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BULK_ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {BULK_ACTIONS.find((a) => a.value === action)?.hint}
                </p>
              </div>

              {(action === "create" || action === "assign_committee") && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Decision Committee — Users
                    </Label>
                    <MultiSelect
                      values={committee}
                      onValuesChange={setCommittee}
                    >
                      <MultiSelectTrigger className="w-full bg-muted/30">
                        <MultiSelectValue placeholder="Select users" />
                      </MultiSelectTrigger>
                      <MultiSelectContent
                        search={{ placeholder: "Search users" }}
                      >
                        {(picklists?.users || []).map((u) => (
                          <MultiSelectItem key={u.id} value={u.id}>
                            {u.name}
                          </MultiSelectItem>
                        ))}
                      </MultiSelectContent>
                    </MultiSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Decision Committee — Teams
                    </Label>
                    <MultiSelect values={teams} onValuesChange={setTeams}>
                      <MultiSelectTrigger className="w-full bg-muted/30">
                        <MultiSelectValue placeholder="Select teams" />
                      </MultiSelectTrigger>
                      <MultiSelectContent>
                        {(picklists?.teams || [])
                          .filter((t) => t.isActive)
                          .map((t) => (
                            <MultiSelectItem key={t.id} value={t.id}>
                              {t.name}
                            </MultiSelectItem>
                          ))}
                      </MultiSelectContent>
                    </MultiSelect>
                  </div>
                </>
              )}

              {action === "finalize" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Approval Status
                    </Label>
                    <Select
                      value={approval}
                      onValueChange={(v) =>
                        setApproval(v as "approved" | "rejected")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">
                          Rejected (send back)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {approval === "approved" && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Final Decision
                      </Label>
                      <Select
                        value={bulkFinal}
                        onValueChange={(v) => setBulkFinal(v as FinalDecision)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FINAL_DECISION_LABELS).map(
                            ([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {action === "release" && (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm">Applicant Visible</span>
                  <Switch checked={visible} onCheckedChange={setVisible} />
                </label>
              )}

              {(action === "create" ||
                action === "assign_committee" ||
                action === "finalize") && (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Internal Remarks (optional)
                  </Label>
                  <Textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={runBulk} disabled={bulk.isPending}>
                  {bulk.isPending ? "Working..." : "Apply"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
