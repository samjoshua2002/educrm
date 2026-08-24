"use client";

import * as React from "react";

import Link from "next/link";

import { Eye, SearchX, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { type Application, useApplications } from "@/hooks/use-applications";
import { useDecision, type DecisionStage, type FinalDecision } from "@/hooks/use-admission-decisions";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeader } from "@/hooks/use-page-header";

const ALLOWED_ROLES = ["org_admin", "application_manager", "superadmin"];

const STAGE_LABELS: Record<DecisionStage, string> = {
  under_review: "Under Review",
  committee_review: "Committee Review",
  final_approval: "Final Approval",
  decision_released: "Decision Released",
};

const STAGE_STYLES: Record<DecisionStage, string> = {
  under_review: "bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  committee_review: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  final_approval: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  decision_released: "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
};

const FINAL_DECISION_LABELS: Record<FinalDecision, string> = {
  offer_made: "Offer Made",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};

const FINAL_DECISION_STYLES: Record<FinalDecision, string> = {
  offer_made: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  waitlisted: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  rejected: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

// Lazily fetches this row's decision + composite score — cached per
// applicationNo by react-query so paging/re-render doesn't re-fetch.
function DecisionCells({ applicationNo }: { applicationNo: string }) {
  const { data, isLoading } = useDecision(applicationNo);

  if (isLoading) {
    return (
      <>
        <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground">…</TableCell>
        <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground">…</TableCell>
      </>
    );
  }

  const score = data?.scoreBreakdown?.compositeScore;
  const stage = data?.decision?.decisionStage;
  const finalDecision = data?.decision?.finalDecision;

  return (
    <>
      <TableCell className="py-5 px-6 align-middle text-sm text-foreground/90 font-medium">
        {score !== undefined && score !== null ? score.toFixed(2) : "—"}
      </TableCell>
      <TableCell className="py-5 px-6 align-middle">
        <div className="flex flex-col gap-1.5 items-start">
          <Badge className={`${STAGE_STYLES[stage ?? "under_review"]} font-medium px-2.5 py-0.5 rounded-full text-xs border-0`}>
            {STAGE_LABELS[stage ?? "under_review"]}
          </Badge>
          {finalDecision && (
            <Badge className={`${FINAL_DECISION_STYLES[finalDecision]} font-medium px-2.5 py-0.5 rounded-full text-xs border-0`}>
              {FINAL_DECISION_LABELS[finalDecision]}
            </Badge>
          )}
        </div>
      </TableCell>
    </>
  );
}

export default function AdmissionDecisionsPage() {
  usePageHeader({
    title: "Admission Decisions",
    description: "Review composite scores and record the committee's final admission decision for each candidate.",
  });

  const user = useAuthStore((state) => state.user);
  const canAccess = !!user && ALLOWED_ROLES.includes(user.role);

  const { data: applicationsResponse, isLoading } = useApplications(1, 200);

  // Ready-for-decision = anything past the raw "incomplete" draft stage —
  // keeps this simple rather than hard-coding a shortlist/interview gate,
  // per the task's "keep it simple" guidance. The detail page still shows
  // the full composite score breakdown so reviewers can judge readiness.
  const applications = React.useMemo(() => {
    const raw = (applicationsResponse as any)?.data || applicationsResponse || [];
    const list = Array.isArray(raw) ? (raw as Application[]) : [];
    return list.filter((app) => app.formStatus && app.formStatus !== "incomplete");
  }, [applicationsResponse]);

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(applications.length / itemsPerPage));
  const pagedApplications = React.useMemo(
    () => applications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [applications, currentPage],
  );

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
          <ShieldAlert className="size-6 text-muted-foreground/80" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">Access restricted</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Only Org Admins, Application Managers and Superadmins can review admission decisions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="hidden lg:block overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                APPLICANT DETAIL
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                APPLICATION NO.
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                PROGRAM
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                COMPOSITE SCORE
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                DECISION STATUS
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground font-medium">Loading applications...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : pagedApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">No applications ready for decision</p>
                      <p className="text-xs text-muted-foreground">
                        Applications appear here once submitted.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pagedApplications.map((app) => (
                <TableRow
                  key={app.id}
                  className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                >
                  <TableCell className="py-5 px-6 align-middle">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-semibold text-foreground text-sm tracking-tight">{app.name}</div>
                      <div className="text-xs text-muted-foreground font-normal">{app.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                    {app.applicationNo}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-medium text-foreground text-sm tracking-tight">{app.program}</div>
                      <div className="text-xs text-muted-foreground font-normal">{app.campus}</div>
                    </div>
                  </TableCell>
                  <DecisionCells applicationNo={app.applicationNo} />
                  <TableCell className="py-5 px-6 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                        <Link href={`/organization/decisions/${encodeURIComponent(app.applicationNo)}`}>
                          <Eye className="size-3.5" />
                          Review
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view */}
      <div className="flex flex-col gap-3.5 lg:hidden w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground font-medium">Loading applications...</p>
          </div>
        ) : pagedApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">No applications ready for decision</p>
              <p className="text-xs text-muted-foreground">Applications appear here once submitted.</p>
            </div>
          </div>
        ) : (
          pagedApplications.map((app) => (
            <Link
              key={app.id}
              href={`/organization/decisions/${encodeURIComponent(app.applicationNo)}`}
              className="bg-card border border-border/80 rounded-xl p-4 flex flex-col gap-3 hover:shadow-xs transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                    {app.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate block mt-0.5">{app.email}</span>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {app.applicationNo}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-muted-foreground/80">Program:</span>
                  <span className="text-foreground/95 font-medium truncate">{app.program}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {applications.length > itemsPerPage && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
