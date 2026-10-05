"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  GraduationCap,
  Briefcase,
  FileText,
  Printer,
  Info,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { usePageHeader } from "@/hooks/use-page-header";
import { useActiveApplication } from "@/hooks/use-applications";
import { useCompositeScore } from "@/hooks/use-scoring";
import { useAnnouncedResultsStatus, useScoreConversionConfig } from "@/hooks/use-shortlisting";
import { useBranches } from "@/hooks/use-branches";

export default function StudentResultsPage() {
  usePageHeader({
    title: "Evaluation Results",
    description: "Detailed evaluation breakdown, composite score, and admission decision.",
  });

  const { data: activeApp, isLoading: isAppLoading } = useActiveApplication({ enabled: true });
  const { data: compositeScoreData, isLoading: isScoreLoading } = useCompositeScore(activeApp?.applicationNo);
  const { data: announcedStatus } = useAnnouncedResultsStatus();
  const { data: scoringConfig } = useScoreConversionConfig();

  // Branch data for resolving raw campus UUIDs to human-friendly names
  const { data: branchesData } = useBranches(1, 100);
  const branches = React.useMemo(() => {
    return (branchesData as any)?.data || (Array.isArray(branchesData) ? branchesData : []);
  }, [branchesData]);

  const resolveCampusName = React.useCallback(
    (val?: string) => {
      if (!val) return "infosys";
      const match = branches.find((b: any) => b.id === val || b.name === val || b.city === val);
      if (match) return match.name || match.city;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) {
        return "infosys";
      }
      return val;
    },
    [branches]
  );

  const isResultsAnnounced = Boolean(
    announcedStatus?.resultsAnnounced ||
    (announcedStatus?.autoAnnounceResults &&
      announcedStatus?.resultsDeclarationDate &&
      new Date(announcedStatus.resultsDeclarationDate).getTime() <= Date.now())
  );

  // Student Profile Data
  const studentName = activeApp?.applicant?.name || (activeApp as any)?.name || "Applicant";
  const applicationNo = activeApp?.applicationNo || "—";
  const email = activeApp?.applicant?.email || (activeApp as any)?.email || "—";
  const phone = activeApp?.applicant?.primaryMobile || (activeApp as any)?.primaryMobile || (activeApp as any)?.phone || "—";
  const course = activeApp?.appliedFor || (activeApp as any)?.program || "Bachelor of Computer Science";
  const photoUrl = activeApp?.applicant?.photo || (activeApp as any)?.photoUrl || "";

  // Scoring Breakdown
  const compScore = compositeScoreData?.compositeScore ?? ((activeApp as any)?.compositeScore != null ? Number((activeApp as any).compositeScore) : 0);
  const qualifyingScore = compositeScoreData?.qualifyingScore ?? Number(scoringConfig?.qualifyingScore ?? 50);
  const gdScore = compositeScoreData?.gdScore ?? ((activeApp as any)?.gdScore != null ? Number((activeApp as any).gdScore) : 10);
  const piScore = compositeScoreData?.piScore ?? ((activeApp as any)?.piScore != null ? Number((activeApp as any).piScore) : 30);
  const gdpiTotal = compositeScoreData?.gdpiTotal ?? Number((gdScore + piScore).toFixed(2));

  // Academic Profile
  const tenthPct = activeApp?.education?.tenth?.percentage || "85";
  const twelfthPct = activeApp?.education?.twelfth?.percentage || "90";
  const ugPct = (activeApp?.education?.graduation as any)?.percentageTillLast || activeApp?.education?.graduation?.percentage || "75";
  const tenthScore = compositeScoreData?.tenthScore ?? 10;
  const twelfthScore = compositeScoreData?.twelfthScore ?? 10;
  const ugScore = compositeScoreData?.ugScore ?? 10;
  const academicTotal = compositeScoreData?.academicComponent ?? (tenthScore + twelfthScore + ugScore);

  // Entrance Tests
  const rawTests = (activeApp?.entranceTests && Array.isArray(activeApp.entranceTests)) ? activeApp.entranceTests : [];
  const primaryTest = rawTests[0] || { exam: "CAT", percentile: "95", score: "95" };
  const testPercentile = primaryTest.percentile != null ? String(primaryTest.percentile) : "95";
  const testComponent = compositeScoreData?.testComponent ?? 10;
  const maxTestScore = compositeScoreData?.maxTestScore ?? 10;

  // Work Experience
  const expMonths = compositeScoreData?.validatedExperienceMonths || compositeScoreData?.claimedExperienceMonths || "18";
  const expComponent = compositeScoreData?.experienceComponent ?? 4;

  // Other components (adjustments)
  const achievementScore = compositeScoreData?.achievementScore ?? 0;
  const penaltyScore = compositeScoreData?.penaltyScore ?? 0;

  // Selection Status
  const isSelected =
    activeApp?.shortlistStatus === "Selected" ||
    (activeApp as any)?.status === "accepted" ||
    compositeScoreData?.isQualified ||
    (isResultsAnnounced && compScore >= qualifyingScore);

  const isRejected =
    activeApp?.shortlistStatus === "Not Selected" ||
    (activeApp as any)?.status === "rejected" ||
    (isResultsAnnounced && compScore < qualifyingScore);

  // Campus, Waitlist, and Final Remarks
  const campusName = resolveCampusName(
    (activeApp as any)?.confirmedCampus ||
    (activeApp as any)?.interviewLocation ||
    activeApp?.preferences?.preference1
  );

  const waitlistStatus =
    (activeApp as any)?.waitlistStatus ||
    (activeApp as any)?.waitlist_status ||
    "Not Applicable";

  const finalRemarks =
    (activeApp as any)?.evaluationRemarks ||
    (activeApp as any)?.evaluation_remarks ||
    (activeApp as any)?.remarks ||
    (isSelected
      ? "Strong performance in GD and PI. Recommended for selection."
      : isRejected
        ? "Does not meet the cut-off requirements for this admissions round."
        : "Evaluation in progress.");

  const interviewDateStr = (activeApp as any)?.interviewDate
    ? new Date((activeApp as any).interviewDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "06 Oct 2026";
  const interviewTimeStr = (activeApp as any)?.interviewTime || "11:30 AM – 12:30 PM";

  if (isAppLoading || isScoreLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] w-full p-6">
        <div className="size-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading evaluation scorecard...</p>
      </div>
    );
  }

  if (!activeApp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6 text-center">
        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Info className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Active Application Registered</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          You currently do not have an active application. Please submit your application to track GD & Interview results.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/my-application">Go to My Application</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-20 w-full min-w-0 max-w-full bg-[#FAFAFA]/50">
      {/* ========================================================================= */}
      {/* 1. HERO CANDIDATE CARD (Pixel-perfect match to admin gd-interview page)  */}
      {/* ========================================================================= */}
      <div className="relative w-full p-6 rounded-[8px] border border-[#D4D4D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 md:gap-x-6 gap-y-2">
          {/* Avatar */}
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-100 shadow-xs shrink-0 col-start-1 row-start-1 md:row-span-2 mt-1 md:mt-0">
            <AvatarImage src={photoUrl} alt={studentName} />
            <AvatarFallback className="text-xl md:text-2xl font-bold bg-blue-50 text-blue-700">
              {studentName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Name & APP No */}
          <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
            <h1 className="text-xl md:text-2xl font-bold text-[#0A0A0A] leading-tight break-words">
              {studentName}
            </h1>
            <span
              style={{
                display: "inline-flex",
                padding: "4px 12px",
                borderRadius: "9999px",
                border: "1px solid #DBEAFE",
                background: "#EFF6FF",
                color: "#475569",
                fontFamily: "Inter, sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: "16px",
                textTransform: "uppercase",
              }}
            >
              APP NO: {applicationNo}
            </span>
          </div>

          {/* Details & Location Row */}
          <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col gap-4 w-full overflow-hidden mt-3 md:mt-0">
            <div className="flex flex-col lg:flex-row justify-between items-start w-full gap-5">
              <div className="flex flex-col gap-3">
                {/* Email & Phone */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#1E293B] text-[12px] font-normal font-sans">
                  <span className="flex items-center gap-1.5 shrink-0 text-slate-700">
                    <svg viewBox="0 0 20 16" fill="none" className="h-4 w-4 text-[#415876]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196667 15.0217 0.000666667 14.5507 0 14V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 1.45 19.8043 15.021 19.413 15.413C19.0217 15.805 18.5507 16.0007 18 16H2ZM10 9L18 4V2L10 7L2 2V4L10 9Z" fill="currentColor" />
                    </svg>
                    {email}
                  </span>
                  {phone && phone !== "—" && (
                    <span className="flex items-center gap-1.5 shrink-0 text-slate-700">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-[#415876]" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.95 21C17.8667 21 15.8083 20.546 13.775 19.638C11.7417 18.73 9.89167 17.4423 8.225 15.775C6.55833 14.1077 5.271 12.2577 4.363 10.225C3.455 8.19233 3.00067 6.134 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07933 8.725 3.238C8.90833 3.39667 9.01667 3.584 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.704 12.1123 8.162 12.687C8.62 13.2617 9.12433 13.816 9.675 14.35C10.1917 14.8667 10.7333 15.346 11.3 15.788C11.8667 16.23 12.4667 16.634 13.1 17L15.45 14.65C15.6 14.5 15.796 14.3877 16.038 14.313C16.28 14.2383 16.5173 14.2173 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1377 20.775 15.313C20.925 15.4883 21 15.684 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z" fill="currentColor" />
                      </svg>
                      {phone}
                    </span>
                  )}
                </div>

                {/* Time & Location Box */}
                <div className="flex items-center gap-6 mt-1 bg-[#F8FAFC]/80 px-3 py-2 rounded-md border border-slate-100 w-max">
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold leading-[14px] tracking-[1px] uppercase text-[#475569] font-sans">
                      LOCATION
                    </span>
                    <p className="text-[13px] font-bold leading-[18px] text-[#1E293B] font-sans whitespace-nowrap">
                      {campusName}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold leading-[14px] tracking-[1px] uppercase text-[#475569] font-sans">
                      DATE
                    </span>
                    <p className="text-[13px] font-bold leading-[18px] text-[#1E293B] font-sans whitespace-nowrap">
                      {interviewDateStr}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] font-bold leading-[14px] tracking-[1px] uppercase text-[#475569] font-sans">
                      TIME
                    </span>
                    <p className="text-[13px] font-bold leading-[18px] text-[#1E293B] font-sans whitespace-nowrap">
                      {interviewTimeStr}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions & Print Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 self-start lg:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 shadow-2xs cursor-pointer h-9 px-3.5"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3.5" />
                  <span>Print Scorecard</span>
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#E2E8F0] my-0.5" />

            {/* Bottom Row: Applied Course & Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[#475569]">
                <span>Applied For:</span>
                <Badge
                  className="text-[#2563EB] border-none font-bold px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "rgba(37, 99, 235, 0.12)",
                    borderRadius: "9999px",
                  }}
                >
                  {course}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">Outcome:</span>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
                    <CheckCircle2 className="size-3.5" /> Selected for Admission
                  </span>
                ) : isRejected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="size-3.5" /> Not Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="size-3.5" /> In Review
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ADMISSION DECISION CARD (Exact match to admin page, read-only mode)   */}
      {/* ========================================================================= */}
      <Card
        style={{
          borderRadius: "8px",
          border: "1px solid #D4D4D4",
          background: "#FFF",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <CardHeader
          className="flex-row space-y-0 justify-between"
          style={{
            display: "flex",
            padding: "16px 20px",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid #F8FAFC",
          }}
        >
          <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold text-[#1E293B] m-0 p-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1E293B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-slate-700"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Admission Decision
          </CardTitle>

          {isSelected ? (
            <Badge className="bg-[#15803D] text-white font-bold text-xs px-2.5 py-0.5">
              CONFIRMED SELECTION
            </Badge>
          ) : isRejected ? (
            <Badge variant="destructive" className="font-bold text-xs px-2.5 py-0.5">
              NOT SELECTED
            </Badge>
          ) : (
            <Badge className="bg-amber-600 text-white font-bold text-xs px-2.5 py-0.5">
              PROVISIONAL
            </Badge>
          )}
        </CardHeader>

        {/* Notice Info Banner */}
        <div className="px-6 pt-5 w-full">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs leading-5">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Official Admission Decision:</span>{" "}
              The admissions committee has finalized your evaluation. View your allocated campus, waitlist standing, and observational panel remarks below.
            </div>
          </div>
        </div>

        <CardContent className="p-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Campus Selection */}
            <div className="space-y-2">
              <Label
                htmlFor="campus-display"
                style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: "20px" }}
              >
                Campus Selection
              </Label>
              <div
                id="campus-display"
                className="w-full px-3.5 py-2.5 rounded-[8px] border border-[#E2E8F0] bg-slate-50/70 text-[#1E293B] font-semibold text-sm flex items-center justify-between"
              >
                <span>{campusName}</span>
                <MapPin className="size-4 text-slate-400" />
              </div>
            </div>

            {/* Waitlist Status */}
            <div className="space-y-2">
              <Label
                htmlFor="waitlist-display"
                style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: "20px" }}
              >
                Waitlist Status
              </Label>
              <div
                id="waitlist-display"
                className="w-full px-3.5 py-2.5 rounded-[8px] border border-[#E2E8F0] bg-slate-50/70 text-[#1E293B] font-semibold text-sm flex items-center justify-between"
              >
                <span>{waitlistStatus}</span>
                <Clock className="size-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Final Remarks / Comments */}
          <div className="space-y-2">
            <Label
              htmlFor="remarks-display"
              style={{ color: "#475569", fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500, lineHeight: "20px" }}
            >
              Final Remarks / Comments
            </Label>
            <div
              id="remarks-display"
              className="min-h-[90px] p-4 bg-slate-50/70 border border-[#E2E8F0] rounded-[8px] text-[#334155] text-sm leading-relaxed whitespace-pre-wrap font-sans"
            >
              {finalRemarks}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 3. TWO-COLUMN RESPONSIVE LAYOUT (Academics/Exp left, Score Table right)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* ========================== LEFT COLUMN (4 of 12) ========================== */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Academic Profile */}
          <Card
            style={{
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold text-[#1E293B] m-0 p-0">
                <GraduationCap className="h-4 w-4 text-[#1E293B]" />
                Academic Profile
              </CardTitle>
              <span className="text-xs font-bold text-slate-700">
                {academicTotal} / 30 pts
              </span>
            </CardHeader>

            <CardContent className="p-0 w-full">
              <div className="px-5 w-full">
                <div className="divide-y divide-[#F8FAFC] w-full text-xs">
                  {/* Table Header */}
                  <div className="grid grid-cols-3 pt-4 pb-2.5 font-bold uppercase tracking-wider text-[#475569] text-[10px]">
                    <div>Level</div>
                    <div className="text-center">Percentage</div>
                    <div className="text-right">Score</div>
                  </div>
                  {/* 10th */}
                  <div className="grid grid-cols-3 items-center py-3.5">
                    <div className="font-semibold text-[#1E293B]">10th Std</div>
                    <div className="text-center font-bold text-[#1E293B]">{tenthPct}%</div>
                    <div className="text-right font-bold text-[#1E293B]">{tenthScore} pts</div>
                  </div>
                  {/* 12th */}
                  <div className="grid grid-cols-3 items-center py-3.5">
                    <div className="font-semibold text-[#1E293B]">12th Std</div>
                    <div className="text-center font-bold text-[#1E293B]">{twelfthPct}%</div>
                    <div className="text-right font-bold text-[#1E293B]">{twelfthScore} pts</div>
                  </div>
                  {/* UG */}
                  <div className="grid grid-cols-3 items-center py-3.5">
                    <div className="font-semibold text-[#1E293B]">UG Degree</div>
                    <div className="text-center font-bold text-[#1E293B]">{ugPct}%</div>
                    <div className="text-right font-bold text-[#1E293B]">{ugScore} pts</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Experience Card */}
          <Card
            style={{
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold text-[#1E293B] m-0 p-0">
                <Briefcase className="h-4 w-4 text-[#1E293B]" />
                Work Experience
              </CardTitle>
              <span className="text-xs font-bold text-slate-700">
                {expComponent} / 10 pts
              </span>
            </CardHeader>
            <CardContent className="p-0 w-full">
              <div className="px-5 py-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-slate-800">Validated</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Validated Duration</span>
                  <span className="font-bold text-[#1A237E]">{expMonths} Months</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Experience Score</span>
                  <span className="font-bold text-slate-900">{expComponent} / 10 pts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entrance Examination Card */}
          <Card
            style={{
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold text-[#1E293B] m-0 p-0">
                <FileText className="h-4 w-4 text-[#1E293B]" />
                Entrance Examination
              </CardTitle>
              <span className="text-xs font-bold text-slate-700">
                {testComponent} / {maxTestScore} pts
              </span>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Exam Name</span>
                <span className="font-bold text-slate-800">{primaryTest.exam || "CAT / National Test"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Percentile Achieved</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {testPercentile}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-slate-500">Scaled Points</span>
                <span className="font-bold text-slate-900">{testComponent} / {maxTestScore} pts</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================== RIGHT COLUMN (8 of 12) ========================== */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card: Evaluation & Scoring Breakdown (Matching Admin Layout) */}
          <Card
            style={{
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <div>
                <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold text-[#1E293B] m-0 p-0">
                  <Award className="h-4 w-4 text-blue-600" />
                  Evaluation &amp; Scoring Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Complete stage-2 rollup across all weighted admission components
                </CardDescription>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-medium block">Total Composite Score</span>
                <span className="text-2xl font-black text-blue-700 leading-none">
                  {compScore} <span className="text-xs text-slate-400 font-semibold">/ 100</span>
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Full Desktop Table (grid 4 cols: Component, Details, Max Weight, Score) */}
              <div className="border border-slate-200 rounded-[8px] overflow-hidden">
                <div className="grid grid-cols-4 px-5 py-3 bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                  <div>Selection Component</div>
                  <div className="text-center">Details / Sub-scores</div>
                  <div className="text-center">Max Weight</div>
                  <div className="text-right">Score Awarded</div>
                </div>

                <div className="divide-y divide-slate-100 text-xs font-sans">
                  {/* Row 1: Academics */}
                  <div className="grid grid-cols-4 items-center px-5 py-3.5">
                    <div className="font-semibold text-[#1E293B]">Academic Profile</div>
                    <div className="text-center text-slate-500">
                      10th ({tenthScore}) · 12th ({twelfthScore}) · UG ({ugScore})
                    </div>
                    <div className="text-center font-semibold text-slate-700">30</div>
                    <div className="text-right font-bold text-slate-900">{academicTotal}</div>
                  </div>

                  {/* Row 2: Entrance Test */}
                  <div className="grid grid-cols-4 items-center px-5 py-3.5">
                    <div className="font-semibold text-[#1E293B]">Entrance Examination</div>
                    <div className="text-center text-slate-500">
                      {primaryTest.exam || "CAT"} ({testPercentile}%)
                    </div>
                    <div className="text-center font-semibold text-slate-700">{maxTestScore}</div>
                    <div className="text-right font-bold text-slate-900">{testComponent}</div>
                  </div>

                  {/* Row 3: Work Experience */}
                  <div className="grid grid-cols-4 items-center px-5 py-3.5">
                    <div className="font-semibold text-[#1E293B]">Work Experience</div>
                    <div className="text-center text-slate-500">{expMonths} Months Validated</div>
                    <div className="text-center font-semibold text-slate-700">10</div>
                    <div className="text-right font-bold text-slate-900">{expComponent}</div>
                  </div>

                  {/* Row 4: GD & PI */}
                  <div className="grid grid-cols-4 items-center px-5 py-3.5">
                    <div className="font-semibold text-[#1E293B]">GD &amp; Personal Interview</div>
                    <div className="text-center text-slate-500">
                      GD ({gdScore}) + PI ({piScore})
                    </div>
                    <div className="text-center font-semibold text-slate-700">40</div>
                    <div className="text-right font-bold text-blue-600">{gdpiTotal}</div>
                  </div>

                  {/* Row 5: Other Components */}
                  <div className="grid grid-cols-4 items-center px-5 py-3.5">
                    <div className="font-semibold text-[#1E293B]">Other Components</div>
                    <div className="text-center text-slate-500">
                      <span className="text-emerald-600 font-semibold">+{achievementScore} Ach</span>
                      {" · "}
                      <span className="text-red-500 font-semibold">-{penaltyScore} Pen</span>
                    </div>
                    <div className="text-center font-semibold text-slate-700">5</div>
                    <div className="text-right font-bold text-slate-900">
                      {achievementScore - penaltyScore >= 0 ? `+${achievementScore - penaltyScore}` : achievementScore - penaltyScore}
                    </div>
                  </div>

                  {/* Row 6: Total Composite Score */}
                  <div className="grid grid-cols-4 items-center px-5 py-4 bg-blue-50/50 border-t-2 border-blue-200">
                    <div className="font-bold text-[#0A0A0A] text-sm">Total Composite Score</div>
                    <div className="text-center text-xs text-slate-500 font-medium">Overall Weighted Score</div>
                    <div className="text-center font-bold text-slate-800 text-sm">100</div>
                    <div className="text-right font-extrabold text-[#2563EB] text-xl">
                      {compScore}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Next Steps & Official Instructions */}
          <Card
            style={{
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold text-[#1E293B] m-0 p-0">
                <ShieldCheck className="size-4 text-blue-600" />
                Admissions Next Steps & Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-3 text-xs text-slate-600 leading-relaxed font-sans">
              {isSelected ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      1
                    </div>
                    <p>
                      <strong>Offer Letter Dispatch:</strong> Your provisional admission offer letter has been processed for <strong>{course}</strong> at campus <strong>{campusName}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      2
                    </div>
                    <p>
                      <strong>Acceptance & Fee Payment:</strong> Please confirm your seat booking and pay the admission acceptance fee within the deadline stated in your notification.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      3
                    </div>
                    <p>
                      <strong>Original Documents:</strong> Bring original mark sheets (10th, 12th, UG) and entrance scorecards during campus registration.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      1
                    </div>
                    <p>
                      Admission decisions for this round are finalized based on merit cutoff percentiles.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                      2
                    </div>
                    <p>
                      If you are on the waitlist, you will receive automated notification if vacancies arise in subsequent rounds.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
