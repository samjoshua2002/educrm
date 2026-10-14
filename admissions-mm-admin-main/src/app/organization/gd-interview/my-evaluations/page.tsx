"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardCheck, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import { useMyAssignedInterviews } from "@/hooks/use-evaluations";

const EVALUATION_STYLES: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-700 border-slate-200",
  draft: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  submitted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// Evaluator portal: interviews where the signed-in user is on the panel.
export default function MyEvaluationsPage() {
  usePageHeader({
    title: "My Evaluations",
    description: "Interviews you are on the panel for. Enter rubric scores, a recommendation and comments.",
  });

  const { data: assignments = [], isLoading } = useMyAssignedInterviews();
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"pending" | "submitted" | "all">("pending");

  const rows = assignments.filter((a) => {
    if (tab === "pending" && a.evaluationStatus === "submitted") return false;
    if (tab === "submitted" && a.evaluationStatus !== "submitted") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (a.studentName ?? "").toLowerCase().includes(q) || (a.applicationNo ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["pending", "submitted", "all"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t)}
              className="h-9 rounded-[6px] capitalize cursor-pointer"
            >
              {t}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate or application no."
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="rounded-[8px] border border-border bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Interview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>My Evaluation</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No interviews to evaluate.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => (
                <TableRow key={a.interviewId}>
                  <TableCell>
                    <span className="block font-medium">{a.studentName ?? "-"}</span>
                    <span className="block text-xs text-muted-foreground">{a.applicationNo ?? ""}</span>
                  </TableCell>
                  <TableCell>
                    {a.interviewType} · Round {a.round}
                    {a.interviewMode && <span className="block text-xs text-muted-foreground">{a.interviewMode}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(a.slot?.startTime)}
                    {a.slot?.timeZone && <span className="block text-xs text-muted-foreground">{a.slot.timeZone}</span>}
                  </TableCell>
                  <TableCell>
                    {a.meetingLink ? (
                      <a href={a.meetingLink} target="_blank" rel="noreferrer" className="text-primary underline">
                        Join
                      </a>
                    ) : (
                      a.location ?? a.slot?.location ?? "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${EVALUATION_STYLES[a.evaluationStatus] ?? ""}`}>
                      {a.evaluationStatus === "submitted" ? "Submitted" : a.evaluationStatus === "draft" ? "Draft" : "Not Started"}
                    </Badge>
                    {a.recommendation && <span className="block text-xs text-muted-foreground mt-1">{a.recommendation}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline" className="h-8 rounded-[6px] cursor-pointer">
                      <Link href={`/organization/gd-interview/evaluate/${a.interviewId}`}>
                        <ClipboardCheck className="size-4 mr-1.5" />
                        {a.evaluationStatus === "submitted" ? "View" : "Evaluate"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
