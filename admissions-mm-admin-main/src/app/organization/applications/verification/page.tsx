"use client";

import * as React from "react";

import Link from "next/link";
import { toast } from "sonner";

import {
  CheckCircle2,
  Eye,
  SearchX,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  type Application,
  useApplications,
  useVerifyApplication,
} from "@/hooks/use-applications";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeader } from "@/hooks/use-page-header";

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ALLOWED_ROLES = ["org_admin", "application_manager"];

export default function ApplicationVerificationPage() {
  usePageHeader({
    title: "Application Verification",
    description: "Review newly-submitted applications and approve or reject them before they enter shortlisting.",
  });

  const user = useAuthStore((state) => state.user);
  const canAccess = !!user && ALLOWED_ROLES.includes(user.role);

  const { data: applicationsResponse, isLoading } = useApplications(
    1,
    200,
    undefined,
    undefined,
    "pending",
  );

  const applications = React.useMemo(() => {
    const raw = (applicationsResponse as any)?.data || applicationsResponse || [];
    return Array.isArray(raw) ? (raw as Application[]) : [];
  }, [applicationsResponse]);

  const verifyMutation = useVerifyApplication();

  const [approveTarget, setApproveTarget] = React.useState<Application | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<Application | null>(null);
  const [rejectRemarks, setRejectRemarks] = React.useState("");

  function handleApprove() {
    if (!approveTarget) return;
    verifyMutation.mutate(
      { applicationNo: approveTarget.applicationNo, status: "verified" },
      { onSuccess: () => setApproveTarget(null) },
    );
  }

  function handleReject() {
    if (!rejectTarget) return;
    if (!rejectRemarks.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    verifyMutation.mutate(
      {
        applicationNo: rejectTarget.applicationNo,
        status: "rejected",
        remarks: rejectRemarks.trim(),
      },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectRemarks("");
        },
      },
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
          <ShieldAlert className="size-6 text-muted-foreground/80" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">Access restricted</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Only Org Admins and Application Managers can review application verification.
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
                LAST ACTIVITY
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground font-medium">Loading applications...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">Nothing pending verification</p>
                      <p className="text-xs text-muted-foreground">
                        All submitted applications have been reviewed.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
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
                  <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground font-normal">
                    {formatDate(app.lastActivity)}
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={`/organization/applications/${encodeURIComponent(app.applicationNo)}`}>
                          <Eye className="size-4" />
                          <span className="sr-only">View</span>
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950"
                        onClick={() => setApproveTarget(app)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                        onClick={() => {
                          setRejectTarget(app);
                          setRejectRemarks("");
                        }}
                      >
                        <XCircle className="size-3.5" />
                        Reject
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
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">Nothing pending verification</p>
              <p className="text-xs text-muted-foreground">All submitted applications have been reviewed.</p>
            </div>
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
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
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-muted-foreground/80">Last Activity:</span>
                  <span className="text-foreground/95 font-medium truncate">{formatDate(app.lastActivity)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                  onClick={() => setApproveTarget(app)}
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setRejectTarget(app);
                    setRejectRemarks("");
                  }}
                >
                  <XCircle className="size-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Approve confirmation dialog */}
      <Dialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Approve application?</DialogTitle>
            <DialogDescription>
              {approveTarget
                ? `${approveTarget.name} (${approveTarget.applicationNo}) will be marked verified and become eligible for Stage-1 shortlisting.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog with required remarks */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectRemarks("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              {rejectTarget ? `${rejectTarget.name} (${rejectTarget.applicationNo})` : ""} — please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-remarks" className="text-xs font-medium text-muted-foreground">
              Rejection reason
            </Label>
            <Textarea
              id="reject-remarks"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g. Missing required documents, incomplete academic records..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
