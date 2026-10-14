"use client";

import * as React from "react";

import Link from "next/link";

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
import { Textarea } from "@/components/ui/textarea";
import {
  downloadStudentOfferPdf,
  downloadStudentRejectionPdf,
  useRespondToOffer,
  useStudentAdmissionResult,
} from "@/hooks/use-acceptance";
import { useActiveApplication } from "@/hooks/use-applications";
import { useBranches } from "@/hooks/use-branches";
import { startGatewayCheckout, useAvailableGateways } from "@/hooks/use-payments";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePageHeaderStore } from "@/stores/page-header-store";
import {
  ACCEPTANCE_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
  FEE_PAYMENT_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  OFFER_TYPE_LABELS,
  REJECTION_REASON_LABELS,
} from "@/types/admission-decisions";

export default function StudentResultsPage() {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const { data: activeApp, isLoading: isAppLoading } = useActiveApplication({
    enabled: true,
  });
  const { data: result, isLoading: isResultLoading } =
    useStudentAdmissionResult(activeApp?.applicationNo, {
      enabled: !!activeApp?.applicationNo,
    });
  const respond = useRespondToOffer(activeApp?.applicationNo);
  const [declineOpen, setDeclineOpen] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState("");

  // Branches to resolve campus IDs or codes to human names
  const { data: branchesData } = useBranches(1, 100);
  const branches = React.useMemo(() => {
    return (
      (branchesData as any)?.data ||
      (Array.isArray(branchesData) ? branchesData : [])
    );
  }, [branchesData]);

  const resolveCampusName = React.useCallback(
    (val?: string) => {
      if (!val) return "Main Campus";
      const match = branches.find(
        (b: any) => b.id === val || b.name === val || b.city === val,
      );
      if (match) return match.name || match.city;
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          val,
        )
      ) {
        return "Main Campus";
      }
      return val;
    },
    [branches],
  );

  // Student Profile Data
  const studentName =
    activeApp?.applicant?.name || (activeApp as any)?.name || "Applicant";
  const applicationNo = activeApp?.applicationNo || "—";
  const email = activeApp?.applicant?.email || (activeApp as any)?.email || "—";
  const phone =
    activeApp?.applicant?.primaryMobile ||
    (activeApp as any)?.primaryMobile ||
    (activeApp as any)?.phone ||
    "—";

  // Admission decision — only what the institution has RELEASED and made
  // visible to the applicant (GET /student/admission-result).
  const finalDecision = result?.decisionReleased
    ? (result.decision?.finalDecision ?? null)
    : null;
  const waitlistInfo = result?.waitlist ?? null;
  const offerInfo = result?.offer ?? null;
  const acceptanceInfo = result?.acceptance ?? null;
  const rejectionInfo = result?.rejection ?? null;

  // A waitlisted applicant who later got an offer from the waitlist is "Offer Made".
  const isSelected = finalDecision === "offer_made";
  const isWaitlisted = finalDecision === "waitlisted";
  const isRejected = finalDecision === "rejected";
  const waitlistDisplay = waitlistInfo?.waitlistRank
    ? `WL-${waitlistInfo.waitlistRank}`
    : isWaitlisted
      ? "Waitlisted"
      : "Not Applicable";
  const statusStr = (
    activeApp?.shortlistStatus ||
    (activeApp as any)?.status ||
    ""
  ).toLowerCase();
  const course =
    offerInfo?.programOffered ||
    activeApp?.appliedFor ||
    (activeApp as any)?.program ||
    result?.program ||
    "—";
  const hasFinalDecision = isSelected || isWaitlisted || isRejected;

  // -------------------------------------------------------------------------
  // 4-STEP ADMISSIONS LIFECYCLE
  // Step 1: Application Submitted
  // Step 2: Application Verified & Shortlisted
  // Step 3: GD & Personal Interview (marked completed by admin)
  // Step 4: Results Announcement
  // -------------------------------------------------------------------------

  const isStep1Done = Boolean(
    activeApp &&
      activeApp.status !== "incomplete" &&
      activeApp.status !== "draft",
  );

  // Step 2: Application Verified & Shortlisted
  const isVerified = Boolean(
    activeApp?.verificationStatus === "verified" ||
      activeApp?.shortlistStatus === "Shortlisted" ||
      activeApp?.shortlistStatus === "Eligible" ||
      statusStr === "shortlisted" ||
      statusStr === "eligible" ||
      (activeApp as any)?.status?.toLowerCase() === "shortlisted",
  );
  const isStep2Done = isVerified;

  // Has scores or evaluation remarks entered
  const hasInterviewScores = Boolean(
    activeApp?.compositeScore != null ||
      activeApp?.gdScore != null ||
      activeApp?.piScore != null ||
      activeApp?.gdEvaluation?.gdScore != null ||
      activeApp?.gdEvaluation?.piScore != null,
  );

  const hasEvaluationRemarks = Boolean(
    (activeApp?.evaluationRemarks &&
      activeApp.evaluationRemarks.trim() !== "") ||
      (activeApp?.gdEvaluation?.remarks &&
        activeApp.gdEvaluation.remarks.trim() !== ""),
  );

  // Step 3: GD & Personal Interview
  // When admin gives "Mark as Completed", activeApp.interviewStatus or activeInterview is 'Completed'
  const isInterviewCompleted = Boolean(
    activeApp?.interviewStatus?.toLowerCase() === "completed" ||
      (activeApp as any)?.interview_status?.toLowerCase() === "completed" ||
      (activeApp as any)?.activeInterview?.status?.toLowerCase() ===
        "completed" ||
      hasInterviewScores ||
      hasEvaluationRemarks ||
      statusStr.includes("attended") ||
      statusStr.includes("completed"),
  );
  const isStep3Done = isInterviewCompleted;

  // Is interview currently scheduled or shortlisted?
  const isInterviewScheduled = Boolean(isStep2Done && !isStep3Done);

  // Step 4: Results Announcement
  const isStep4Done = hasFinalDecision;
  const isStep4InProgress = isStep3Done && !hasFinalDecision;

  // Layout Header: Show Single Download Result Button only when final results are released
  React.useEffect(() => {
    if (isStep4Done) {
      setHeader({
        title: "Admission Results",
        description:
          "Official admission decision, seat allotment, and campus allocation details.",
        customRightNode: (
          <Button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-[#EA2525] hover:bg-[#D61F1F] active:bg-[#B91C1C] text-white cursor-pointer shadow-2xs transition-colors"
          >
            Download Result
          </Button>
        ),
      });
    } else if (isStep3Done) {
      setHeader({
        title: "Admission Results",
        description:
          "Your interview is completed. Evaluation is under review by the admissions committee.",
        customRightNode: null,
      });
    } else if (isStep2Done) {
      setHeader({
        title: "Admission Results",
        description:
          "Application verified. You are shortlisted for Group Discussion & Personal Interview.",
        customRightNode: null,
      });
    } else {
      setHeader({
        title: "Admission Results",
        description:
          "Application received. Verification and interview rounds are pending.",
        customRightNode: null,
      });
    }

    return () => {
      clearHeader();
    };
  }, [setHeader, clearHeader, isStep4Done, isStep3Done, isStep2Done]);

  // Campus Allotted (Which Place He Allotted)
  const campusAllotted = resolveCampusName(
    activeApp?.confirmedCampus ||
      (activeApp as any)?.confirmedCampus ||
      (activeApp as any)?.interviewLocation ||
      activeApp?.preferences?.preference1,
  );

  const finalRemarks =
    activeApp?.evaluationRemarks ||
    (activeApp as any)?.evaluationRemarks ||
    (activeApp as any)?.evaluation_remarks ||
    (activeApp as any)?.remarks ||
    (isSelected
      ? "Congratulations! You have been offered admission. See your offer below."
      : isWaitlisted
        ? `You are on the waitlist (${waitlistDisplay}). An offer is released automatically if a seat becomes available.`
        : isRejected
          ? rejectionInfo
            ? `Reason: ${REJECTION_REASON_LABELS[rejectionInfo.rejectionReason] ?? rejectionInfo.rejectionReason}.`
            : "We are unable to offer you admission in this round."
          : "Evaluation in progress.");

  const todayDateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const rawInterviewDate =
    activeApp?.activeInterview?.slot?.slotDate ||
    activeApp?.gdEvaluation?.interviewDate ||
    (activeApp as any)?.interviewDate;

  const interviewDateFormatted = rawInterviewDate
    ? new Date(rawInterviewDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const formatSingleTime = (str?: string | null): string => {
    if (!str) return "";
    const s = String(str).trim();
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(s)) return s.toUpperCase();
    if (s.includes("T") || (s.includes("-") && s.length >= 10)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    }
    const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
      }
    }
    return s;
  };

  const formatTimeSlot = (raw?: string | null): string => {
    if (!raw) return "";
    const rangeDelim = raw.includes(" – ")
      ? " – "
      : raw.includes(" - ")
        ? " - "
        : raw.includes(" to ")
          ? " to "
          : null;

    if (rangeDelim) {
      const [start, end] = raw.split(rangeDelim);
      const fmtStart = formatSingleTime(start);
      const fmtEnd = formatSingleTime(end);
      if (fmtStart && fmtEnd) return `${fmtStart} – ${fmtEnd}`;
      if (fmtStart) return fmtStart;
      return raw;
    }
    return formatSingleTime(raw);
  };

  const rawStart = activeApp?.activeInterview?.slot?.startTime;
  const rawEnd = activeApp?.activeInterview?.slot?.endTime;
  const rawFallbackTime =
    activeApp?.gdEvaluation?.interviewTime || (activeApp as any)?.interviewTime;

  const interviewTimeFormatted = React.useMemo(() => {
    if (rawStart && rawEnd) {
      return `${formatSingleTime(rawStart)} – ${formatSingleTime(rawEnd)}`;
    }
    if (rawStart) {
      return formatTimeSlot(rawStart);
    }
    if (rawFallbackTime) {
      return formatTimeSlot(rawFallbackTime);
    }
    return null;
  }, [rawStart, rawEnd, rawFallbackTime]);

  const interviewLocationFormatted =
    activeApp?.activeInterview?.slot?.location ||
    activeApp?.gdEvaluation?.interviewLocation ||
    activeApp?.interviewLocation ||
    activeApp?.preferences?.interviewPreference1 ||
    "Campus Venue / Online link shared via notification";

  if (isAppLoading || (!!activeApp?.applicationNo && isResultLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] w-full p-6">
        <div className="size-9 animate-spin rounded-full border-4 border-[#EA2525] border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground font-medium">
          Loading admission results...
        </p>
      </div>
    );
  }

  if (!activeApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full w-full p-6 text-center">
        <h3 className="text-base font-semibold text-foreground">
          No Active Application Registered
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          You currently do not have an active application. Please submit your
          application to track GD &amp; Interview results.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/my-application">Go to My Application</Link>
        </Button>
      </div>
    );
  }

  // =========================================================================
  // HELPER: RENDER 4-STEP TRACKER
  // =========================================================================
  const renderAdmissionsJourneyTracker = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Admissions Journey Tracker
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {isStep4Done
            ? "4 of 4 Steps Completed"
            : isStep3Done
              ? "3 of 4 Steps Completed"
              : isStep2Done
                ? "2 of 4 Steps Completed"
                : "1 of 4 Steps Completed"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Step 1: Application Submitted */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Step 1</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Completed
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-emerald-950">
              Application Submitted
            </span>
            <span className="text-xs text-emerald-700">
              Form &amp; credentials registered
            </span>
          </div>
        </div>

        {/* Step 2: Application Verified */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-2xs ${
            isStep2Done
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-amber-300 bg-amber-50/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold ${isStep2Done ? "text-emerald-800" : "text-amber-800"}`}
            >
              Step 2
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isStep2Done
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isStep2Done ? "Completed" : "In Progress"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-sm font-bold ${isStep2Done ? "text-emerald-950" : "text-amber-950"}`}
            >
              Application Verified
            </span>
            <span
              className={`text-xs ${isStep2Done ? "text-emerald-700" : "text-amber-800"}`}
            >
              {isStep2Done
                ? "Verified & shortlisted for GD/PI"
                : "Document verification pending"}
            </span>
          </div>
        </div>

        {/* Step 3: GD & Personal Interview */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-2xs ${
            isStep3Done
              ? "border-emerald-200 bg-emerald-50/40"
              : isInterviewScheduled
                ? "border-blue-300 bg-blue-50/50"
                : "border-border/80 bg-background opacity-75"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold ${
                isStep3Done
                  ? "text-emerald-800"
                  : isInterviewScheduled
                    ? "text-blue-800"
                    : "text-muted-foreground"
              }`}
            >
              Step 3
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isStep3Done
                  ? "bg-emerald-100 text-emerald-800"
                  : isInterviewScheduled
                    ? "bg-blue-100 text-blue-800"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isStep3Done
                ? "Completed"
                : isInterviewScheduled
                  ? "Scheduled"
                  : "Pending"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-sm font-bold ${
                isStep3Done
                  ? "text-emerald-950"
                  : isInterviewScheduled
                    ? "text-blue-950"
                    : "text-foreground"
              }`}
            >
              GD &amp; Interview
            </span>
            <span
              className={`text-xs ${
                isStep3Done
                  ? "text-emerald-700"
                  : isInterviewScheduled
                    ? "text-blue-800"
                    : "text-muted-foreground"
              }`}
            >
              {isStep3Done
                ? "Rounds attended & completed"
                : isInterviewScheduled && interviewDateFormatted
                  ? `${interviewDateFormatted} ${interviewTimeFormatted ? `· ${interviewTimeFormatted}` : ""}`
                  : isInterviewScheduled
                    ? "Shortlisted · Scheduled for rounds"
                    : "Rounds to be scheduled"}
            </span>
          </div>
        </div>

        {/* Step 4: Results Announcement */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-2xs ${
            isStep4Done
              ? "border-emerald-200 bg-emerald-50/40"
              : isStep4InProgress
                ? "border-amber-300 bg-amber-50/40"
                : "border-border/80 bg-background opacity-75"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold ${
                isStep4Done
                  ? "text-emerald-800"
                  : isStep4InProgress
                    ? "text-amber-800"
                    : "text-muted-foreground"
              }`}
            >
              Step 4
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isStep4Done
                  ? "bg-emerald-100 text-emerald-800"
                  : isStep4InProgress
                    ? "bg-amber-100 text-amber-800"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isStep4Done
                ? "Announced"
                : isStep4InProgress
                  ? "In Progress"
                  : "Pending"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className={`text-sm font-bold ${
                isStep4Done
                  ? "text-emerald-950"
                  : isStep4InProgress
                    ? "text-amber-950"
                    : "text-foreground"
              }`}
            >
              Results Announcement
            </span>
            <span
              className={`text-xs ${
                isStep4Done
                  ? "text-emerald-700"
                  : isStep4InProgress
                    ? "text-amber-800"
                    : "text-muted-foreground"
              }`}
            >
              {isStep4Done
                ? "Official seat allotment declared"
                : isStep4InProgress
                  ? "Evaluating merit & finalizing results"
                  : "Awaiting interview completion"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // STATE 1: APPLICATION VERIFIED & SHORTLISTED FOR GD/PI
  // Step 2 is verified (completed), Step 3 is GD Interview (Scheduled/In progress)
  // =========================================================================
  if (!isStep4Done && !isStep3Done && isStep2Done) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
        <div className="w-full max-w-full bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Admissions Office
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Shortlisted for GD &amp; Personal Interview
              </h1>
              <span className="text-xs text-muted-foreground mt-0.5">
                Current Status as of {todayDateStr}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xs">
                SHORTLISTED FOR GD &amp; PI
              </Badge>
            </div>
          </div>

          {/* Candidate Profile Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 border-b border-border/60 bg-muted/5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Candidate Name
              </span>
              <span className="text-base font-bold text-foreground">
                {studentName}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Application No.
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {applicationNo}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Applied Program
              </span>
              <span className="text-base font-bold text-[#EA2525]">
                {course}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 md:p-8 flex flex-col gap-8">
            {/* Informational Message */}
            <div className="p-5 rounded-xl border border-blue-200/80 bg-blue-50/50 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Application Verified · Shortlisted for GD &amp; PI
              </span>
              <p className="text-sm text-blue-950 font-medium leading-relaxed">
                Your application has been verified and you are officially
                shortlisted for the Group Discussion and Personal Interview.
                Please attend your scheduled session as detailed below.
              </p>
            </div>

            {/* Scheduled Details (If available) */}
            {(interviewDateFormatted ||
              interviewTimeFormatted ||
              interviewLocationFormatted) && (
              <div className="p-5 rounded-xl border border-border/80 bg-background flex flex-col gap-3 shadow-2xs">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Scheduled Interview Details (Step 3)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Date:</span>
                    <strong className="text-foreground text-sm">
                      {interviewDateFormatted ||
                        "Scheduled for upcoming session"}
                    </strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Time Slot:</span>
                    <strong className="text-foreground text-sm">
                      {interviewTimeFormatted || "Morning Session"}
                    </strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">
                      Venue / Location:
                    </span>
                    <strong className="text-foreground text-sm">
                      {interviewLocationFormatted}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* 4-Step Journey Tracker */}
            {renderAdmissionsJourneyTracker()}

            {/* Quick Actions */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Prepare your identity proof and original academic certificates
                for verification during the interview.
              </span>
              <Button
                asChild
                variant="outline"
                className="text-xs font-semibold"
              >
                <Link href="/my-application">View Application Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 1A: INITIAL APPLICATION (Not verified yet)
  // =========================================================================
  if (!isStep4Done && !isStep3Done && !isStep2Done) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
        <div className="w-full max-w-full bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Admissions Office
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Admission Evaluation Pending
              </h1>
              <span className="text-xs text-muted-foreground mt-0.5">
                Current Status as of {todayDateStr}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-100 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xs">
                APPLICATION SUBMITTED
              </Badge>
            </div>
          </div>

          {/* Candidate Profile Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 border-b border-border/60 bg-muted/5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Candidate Name
              </span>
              <span className="text-base font-bold text-foreground">
                {studentName}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Application No.
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {applicationNo}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Applied Program
              </span>
              <span className="text-base font-bold text-[#EA2525]">
                {course}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 md:p-8 flex flex-col gap-8">
            {/* Informational Message */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Application Under Verification
              </span>
              <p className="text-sm text-slate-900 font-medium leading-relaxed">
                Your application has been received and registered. It is
                currently undergoing Step 2 verification before being
                shortlisted for GD and Personal Interview.
              </p>
            </div>

            {/* 4-Step Tracker */}
            {renderAdmissionsJourneyTracker()}

            {/* Quick Actions */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Questions regarding verification? Contact Central Admissions
                Office.
              </span>
              <Button
                asChild
                variant="outline"
                className="text-xs font-semibold"
              >
                <Link href="/my-application">View Submitted Application</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: INTERVIEW COMPLETED — UNDER REVIEW
  // When admin gives "Mark as Completed", Step 3 finishes and Step 4 is in progress
  // =========================================================================
  if (!isStep4Done && isStep3Done) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
        <div className="w-full max-w-full bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Admissions Office
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                Admission Evaluation Under Review
              </h1>
              <span className="text-xs text-muted-foreground mt-0.5">
                Current Status as of {todayDateStr}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-100 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-2xs">
                UNDER REVIEW
              </Badge>
            </div>
          </div>

          {/* Candidate Profile Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 border-b border-border/60 bg-muted/5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Candidate Name
              </span>
              <span className="text-base font-bold text-foreground">
                {studentName}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Application No.
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                {applicationNo}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Applied Program
              </span>
              <span className="text-base font-bold text-[#EA2525]">
                {course}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 md:p-8 flex flex-col gap-8">
            {/* Informational Message */}
            <div className="p-5 rounded-xl border border-amber-200/80 bg-amber-50/50 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Interview Completed · Evaluation In Progress
              </span>
              <p className="text-sm text-amber-950 font-medium leading-relaxed">
                Your Group Discussion and Personal Interview evaluation is
                completed and currently under review by the admissions
                committee. Official admission decisions will be announced here
                once published.
              </p>
            </div>

            {/* 4-Step Tracker */}
            {renderAdmissionsJourneyTracker()}

            {/* Quick Actions */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Admissions decisions are released in batches as each course
                panel concludes.
              </span>
              <Button
                asChild
                variant="outline"
                className="text-xs font-semibold"
              >
                <Link href="/my-application">View Application Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: FINAL RESULTS DECLARED (Selected / Waitlisted / Not Selected)
  // Step 4 Completed · MODERN ADMISSION RESULT & CAMPUS ALLOTMENT CARD
  // id="printable-admission-result" for crisp PDF printing
  // =========================================================================
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      <div
        id="printable-admission-result"
        className="w-full max-w-full bg-white rounded-2xl border border-border/80 shadow-sm overflow-hidden flex flex-col"
      >
        {/* Printable Official Header */}
        <div className="p-6 md:p-8 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Admissions Office
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Official Admission Allotment
            </h1>
            <span className="text-xs text-muted-foreground mt-0.5">
              Declaration Date:{" "}
              {formatResultDate(
                result?.decision?.releasedAt || result?.decision?.decisionDate,
              ) || todayDateStr}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSelected ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-1.5 rounded-full shadow-2xs">
                CONFIRMED SELECTION
              </Badge>
            ) : isWaitlisted ? (
              <Badge className="bg-amber-600 hover:bg-amber-600 text-white font-bold text-sm px-4 py-1.5 rounded-full shadow-2xs">
                WAITLISTED ({waitlistDisplay})
              </Badge>
            ) : (
              <Badge className="bg-rose-600 hover:bg-rose-600 text-white font-bold text-sm px-4 py-1.5 rounded-full shadow-2xs">
                NOT SELECTED
              </Badge>
            )}
          </div>
        </div>

        {/* Candidate & Course Overview Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 border-b border-border/60 bg-muted/5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Candidate Name
            </span>
            <span className="text-base font-bold text-foreground">
              {studentName}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Application No.
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              {applicationNo}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Applied Program
            </span>
            <span className="text-base font-bold text-[#EA2525]">{course}</span>
          </div>
        </div>

        {/* PRIMARY HIGHLIGHT: WHICH PLACE HE IS ALLOTTED & ADMISSION DECISION */}
        <div className="p-6 md:p-8 flex flex-col gap-6">
          {/* 4-Step Tracker showing completion */}
          {renderAdmissionsJourneyTracker()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* Box 1: ALLOTTED CAMPUS / LOCATION */}
            <div className="p-6 rounded-xl border border-border/80 bg-background flex flex-col justify-between gap-3 shadow-2xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Allotted Campus / Location
              </span>
              <div className="flex flex-col gap-1 my-1">
                <span className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                  {campusAllotted}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {isSelected
                    ? "Official allocated campus for registration & classes"
                    : isWaitlisted
                      ? "Preferred campus for waitlist seat release"
                      : "Campus allotment not available"}
                </span>
              </div>
              <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground">
                Campus Status:{" "}
                <strong className="text-foreground">
                  {isSelected
                    ? "Confirmed Seat"
                    : isWaitlisted
                      ? "Subject to Vacancy"
                      : "Closed"}
                </strong>
              </div>
            </div>

            {/* Box 2: ADMISSION DECISION & STANDING */}
            <div className="p-6 rounded-xl border border-border/80 bg-background flex flex-col justify-between gap-3 shadow-2xs">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Admission Decision &amp; Standing
              </span>
              <div className="flex flex-col gap-1 my-1">
                {isSelected ? (
                  <span className="text-2xl md:text-3xl font-extrabold text-emerald-700 tracking-tight">
                    Selected for Admission
                  </span>
                ) : isWaitlisted ? (
                  <span className="text-2xl md:text-3xl font-extrabold text-amber-700 tracking-tight">
                    Waitlisted ({waitlistDisplay})
                  </span>
                ) : (
                  <span className="text-2xl md:text-3xl font-extrabold text-rose-700 tracking-tight">
                    Not Selected
                  </span>
                )}
                <span className="text-xs text-muted-foreground font-medium">
                  {isSelected
                    ? "Offer extended under course capacity quota"
                    : isWaitlisted
                      ? `Standing ${waitlistDisplay} on official course merit list`
                      : "Intake quota finalized for current round"}
                </span>
              </div>
              <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground">
                Waitlist Standing:{" "}
                <strong className="text-foreground">{waitlistDisplay}</strong>
              </div>
            </div>
          </div>

          {/* Official Committee Remarks */}
          <div className="p-5 rounded-xl border border-border/80 bg-muted/20 flex flex-col gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Admissions Committee Observations &amp; Remarks
            </span>
            <p className="text-sm text-foreground font-medium leading-relaxed whitespace-pre-wrap">
              {finalRemarks}
            </p>
          </div>

          {isSelected && offerInfo && (
            <div className="p-5 rounded-xl border border-border/80 bg-background flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Your Offer Letter
                </span>
                {offerInfo.hasPdf && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadStudentOfferPdf(activeApp?.applicationNo)
                    }
                  >
                    Download Offer Letter (PDF)
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <ResultField
                  label="Offer Type"
                  value={
                    OFFER_TYPE_LABELS[offerInfo.offerType] ??
                    offerInfo.offerType
                  }
                />
                <ResultField
                  label="Program Offered"
                  value={offerInfo.programOffered || "—"}
                />
                <ResultField
                  label="Offer Status"
                  value={
                    OFFER_STATUS_LABELS[offerInfo.offerStatus] ??
                    offerInfo.offerStatus
                  }
                />
                <ResultField
                  label="Valid Till"
                  value={formatResultDate(offerInfo.offerValidTill) || "—"}
                />
                {Number(offerInfo.scholarshipAmount) > 0 && (
                  <ResultField
                    label="Scholarship"
                    value={formatInr(offerInfo.scholarshipAmount)}
                  />
                )}
                {offerInfo.conditions && (
                  <ResultField
                    label="Conditions"
                    value={offerInfo.conditions}
                    className="col-span-2 md:col-span-3"
                  />
                )}
              </div>

              {acceptanceInfo && (
                <div className="flex flex-col gap-4 pt-3 border-t border-border/60">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <ResultField
                      label="Your Response"
                      value={
                        ACCEPTANCE_STATUS_LABELS[
                          acceptanceInfo.acceptanceStatus
                        ] ?? acceptanceInfo.acceptanceStatus
                      }
                    />
                    <ResultField
                      label="Respond By"
                      value={
                        formatResultDate(acceptanceInfo.acceptanceDeadline) ||
                        "—"
                      }
                    />
                    <ResultField
                      label="Seat Booking Fee"
                      value={formatInr(acceptanceInfo.seatBookingFee)}
                    />
                    <ResultField
                      label="Fee Payment"
                      value={
                        FEE_PAYMENT_STATUS_LABELS[
                          acceptanceInfo.feePaymentStatus
                        ] ?? acceptanceInfo.feePaymentStatus
                      }
                    />
                    <ResultField
                      label="Enrollment"
                      value={
                        ENROLLMENT_STATUS_LABELS[
                          acceptanceInfo.enrollmentStatus
                        ] ?? acceptanceInfo.enrollmentStatus
                      }
                    />
                    {acceptanceInfo.candidateConfirmationDate && (
                      <ResultField
                        label="Responded On"
                        value={formatResultDate(
                          acceptanceInfo.candidateConfirmationDate,
                        )}
                      />
                    )}
                    {acceptanceInfo.paymentReferenceId && (
                      <ResultField
                        label="Payment Reference"
                        value={acceptanceInfo.paymentReferenceId}
                      />
                    )}
                  </div>

                  {acceptanceInfo.acceptanceStatus === "pending" &&
                    offerInfo.offerStatus === "sent" && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          className="h-9 px-4 rounded-[8px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={respond.isPending}
                          onClick={() => respond.mutate({ accept: true })}
                        >
                          Accept Offer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 px-4 rounded-[8px] text-xs font-semibold"
                          disabled={respond.isPending}
                          onClick={() => {
                            setDeclineReason("");
                            setDeclineOpen(true);
                          }}
                        >
                          Decline Offer
                        </Button>
                      </div>
                    )}

                  {acceptanceInfo.acceptanceStatus === "accepted" &&
                    acceptanceInfo.feePaymentStatus !== "paid" &&
                    acceptanceInfo.feePaymentStatus !== "waived" &&
                    Number(acceptanceInfo.seatBookingFee) > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          Pay the seat booking fee to confirm your enrollment.
                        </span>
                        {acceptanceInfo.feePaymentLink ? (
                          <Button
                            asChild
                            size="sm"
                            className="h-8 bg-[#EA2525] hover:bg-[#D61F1F] text-white"
                          >
                            <a
                              href={acceptanceInfo.feePaymentLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Pay Seat Booking Fee
                            </a>
                          </Button>
                        ) : result?.applicationId ? (
                          <SeatFeePayButton
                            applicationId={result.applicationId}
                            offerAcceptanceId={acceptanceInfo.id}
                          />
                        ) : null}
                      </div>
                    )}

                  {acceptanceInfo.onboardingPackageSent &&
                    acceptanceInfo.onboardingInfo && (
                      <div className="flex flex-col gap-1.5 rounded-lg bg-muted/20 p-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Onboarding Information
                        </span>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {acceptanceInfo.onboardingInfo}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {isRejected && rejectionInfo && (
            <div className="p-5 rounded-xl border border-border/80 bg-background flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Decision Details
                </span>
                {rejectionInfo.hasLetter && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadStudentRejectionPdf(activeApp?.applicationNo)
                    }
                  >
                    Download Letter (PDF)
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <ResultField
                  label="Reason"
                  value={
                    REJECTION_REASON_LABELS[rejectionInfo.rejectionReason] ??
                    rejectionInfo.rejectionReason
                  }
                />
                <ResultField
                  label="Date"
                  value={formatResultDate(rejectionInfo.rejectionDate) || "—"}
                />
                <ResultField
                  label="Eligible to Reapply"
                  value={rejectionInfo.eligibleForReapply ? "Yes" : "No"}
                />
                {rejectionInfo.nextIntake && (
                  <ResultField
                    label="Next Intake"
                    value={rejectionInfo.nextIntake}
                  />
                )}
                {rejectionInfo.alternateOptionsSuggested && (
                  <ResultField
                    label="Alternate Options"
                    value={rejectionInfo.alternateOptionsSuggested}
                    className="col-span-2 md:col-span-4"
                  />
                )}
              </div>
            </div>
          )}

          {isWaitlisted && waitlistInfo?.alternateProgramOffered && (
            <div className="p-5 rounded-xl border border-border/80 bg-background text-sm">
              Alternate program offered:{" "}
              <strong>{waitlistInfo.alternateProgramOffered}</strong>
            </div>
          )}

          {/* Official Instructions & Directives */}
          <div className="p-5 rounded-xl border border-border/80 bg-background flex flex-col gap-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Official Instructions
            </span>
            {isSelected ? (
              <ul className="text-xs text-muted-foreground leading-relaxed list-disc list-inside space-y-1.5">
                <li>
                  <strong>Offer Acceptance:</strong> You must confirm acceptance
                  of your allotted seat for <strong>{course}</strong> at{" "}
                  <strong>{campusAllotted}</strong> within the scheduled
                  admission timeline.
                </li>
                <li>
                  <strong>Seat Booking &amp; Fee:</strong> Complete the initial
                  registration fee payment to finalize your enrollment.
                </li>
                <li>
                  <strong>Original Document Verification:</strong> Present
                  original educational credentials and photo ID at{" "}
                  <strong>{campusAllotted}</strong> during orientation.
                </li>
              </ul>
            ) : isWaitlisted ? (
              <ul className="text-xs text-muted-foreground leading-relaxed list-disc list-inside space-y-1.5">
                <li>
                  <strong>Waitlist Movement:</strong> Vacated seats are offered
                  in strict merit rank sequence (WL-1, WL-2, etc.) as candidate
                  confirmations conclude.
                </li>
                <li>
                  <strong>Instant Notification:</strong> If a seat becomes
                  available for your standing, an official admission offer will
                  be transmitted via SMS and Email.
                </li>
                <li>
                  <strong>No Additional Action Needed:</strong> Your candidature
                  remains active in the admissions pool.
                </li>
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thank you for your participation in the Group Discussion and
                Personal Interview process. Due to limited seat capacity, we are
                unable to extend an admission offer for this round.
              </p>
            )}
          </div>

          {/* Printable Authorization Seal */}
          <div className="pt-6 mt-4 border-t border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-muted-foreground gap-4">
            <div className="flex flex-col">
              <span>
                Contact: {email} · {phone}
              </span>
              <span>EduCRM Central Admissions System</span>
            </div>
            <div className="text-right sm:text-right">
              <span className="block font-semibold text-foreground">
                Office of Academic Admissions
              </span>
              <span>Allotment Reference: {applicationNo}</span>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Decline this offer?</DialogTitle>
            <DialogDescription>
              Your seat will be released to another applicant. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={respond.isPending}
              onClick={() =>
                respond.mutate(
                  {
                    accept: false,
                    declineReason: declineReason.trim() || undefined,
                  },
                  { onSuccess: () => setDeclineOpen(false) },
                )
              }
            >
              Decline Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatResultDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatInr(value?: number | string | null) {
  const n = Number(value ?? 0);
  return `₹${(isFinite(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function ResultField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className ?? ""}`}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground break-words whitespace-pre-wrap">
        {value}
      </span>
    </div>
  );
}

// Seat booking fee through the organization's payment gateway (payments
// module). When paid, the API confirms the enrollment automatically.
function SeatFeePayButton({
  applicationId,
  offerAcceptanceId,
}: {
  applicationId: string;
  offerAcceptanceId: string;
}) {
  const queryClient = useQueryClient();
  const { data: gateways } = useAvailableGateways(applicationId, {
    purpose: "seat_booking_fee",
    offerAcceptanceId,
  });
  const [busy, setBusy] = React.useState(false);
  const gateway =
    gateways?.gateways.find((g) => g.isDefault) ?? gateways?.gateways[0];
  if (!gateway) return null;

  async function pay() {
    if (!gateway) return;
    setBusy(true);
    try {
      const res = await startGatewayCheckout({
        applicationId,
        gateway: gateway.gateway,
        purpose: "seat_booking_fee",
        offerAcceptanceId,
      });
      if (res.status === "success") {
        toast.success("Seat booking fee paid. Your enrollment will be confirmed shortly.");
        queryClient.invalidateQueries({ queryKey: ["student-admission-result"] });
      } else if (res.status === "failed" && res.error) {
        toast.error(res.error);
      }
    } catch {
      // API errors are shown by the request interceptor.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      className="h-8 bg-[#EA2525] hover:bg-[#D61F1F] text-white"
      disabled={busy}
      onClick={pay}
    >
      {busy ? "Opening payment..." : `Pay Seat Booking Fee (${gateway.label})`}
    </Button>
  );
}
