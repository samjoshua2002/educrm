"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import { useMyAssignedInterviews, type MyAssignedInterview } from "@/hooks/use-evaluations";

function evaluationStatusBadge(status: MyAssignedInterview["evaluationStatus"]) {
  switch (status) {
    case "submitted":
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-transparent">Submitted</Badge>;
    case "draft":
      return <Badge className="bg-amber-500/15 text-amber-700 border-transparent">Draft</Badge>;
    default:
      return <Badge variant="outline">Not Started</Badge>;
  }
}

function formatSlot(slot: MyAssignedInterview["slot"]) {
  if (!slot) return "—";
  const date = new Date(slot.slotDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = slot.startTime
    ? new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  return [date, time].filter(Boolean).join(" · ");
}

export default function MyEvaluationsPage() {
  usePageHeader({
    title: "My Evaluations",
    description: "Score the GD & PI interviews you've been assigned to evaluate.",
  });

  const { data: assignments, isLoading } = useMyAssignedInterviews();

  const rows = assignments || [];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                CANDIDATE
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                APPLICATION NO.
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                TYPE / ROUND
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                SLOT
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                EVALUATION
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-sm text-muted-foreground">
                  Loading assignments...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        No interviews assigned to you
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You'll see interviews here once you're added to a panel.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.interviewId}
                  className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                >
                  <TableCell className="py-5 px-6 align-middle text-sm font-semibold text-foreground">
                    {row.studentName || "—"}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80">
                    {row.applicationNo || "—"}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80">
                    {row.interviewType} · Round {row.round}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80">
                    {formatSlot(row.slot)}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle">
                    {evaluationStatusBadge(row.evaluationStatus)}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-right">
                    <Link
                      href={`/organization/gd-interview/evaluate/${row.interviewId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <ClipboardList className="size-4" />
                      {row.evaluationStatus === "submitted" ? "View" : "Score"}
                    </Link>
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
