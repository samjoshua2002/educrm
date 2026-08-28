/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  Award,
  AlertTriangle,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  Pencil,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useQueryClient } from "@tanstack/react-query";
import { useApplication, useUpdateApplicationStatus, useUpdateGdEvaluation, useUpdateApplication } from "@/hooks/use-applications";
import { useCompositeScore, useScoreAdjustment } from "@/hooks/use-scoring";
import { useScoreConversionConfig } from "@/hooks/use-shortlisting";
import { useAuthStore } from "@/stores/auth-store";
import { gdInterviews } from "@/data/mock-gd-interviews";
import { toast } from "sonner";

export default function GDInterviewDetailsPage() {
  const params = useParams();
  const rawParam = params.application_number;
  const applicationNumber = React.useMemo(() => {
    if (!rawParam) return "";
    if (Array.isArray(rawParam)) {
      return rawParam.map((p) => decodeURIComponent(p)).join("/");
    }
    return decodeURIComponent(rawParam as string);
  }, [rawParam]);

  const listMatch = gdInterviews.find(
    (item) => item.applicationNo === applicationNumber,
  );

  const { data: fetchedAppData, isLoading } = useApplication(applicationNumber, { enabled: !listMatch });
  const { data: scoringConfig } = useScoreConversionConfig();
  const queryClient = useQueryClient();
  const updateStatusMutation = useUpdateApplicationStatus();
  const updateGdEvalMutation = useUpdateGdEvaluation();
  const updateSectionMutation = useUpdateApplication();

  // Stage-2 composite score rollup — real, backend-persisted figures
  // (replaces the fabricated client-side "Composite Score Banner" calc
  // that used to live in interviewData.interviewScores.compositeScore).
  const { data: compositeScoreData } = useCompositeScore(applicationNumber);
  const scoreAdjustmentMutation = useScoreAdjustment(applicationNumber);
  const currentRole = useAuthStore((s) => s.user?.role);
  const canAdjustScore =
    currentRole === "org_admin" || currentRole === "application_manager" || currentRole === "superadmin";
  const [scoreAdjustmentOpen, setScoreAdjustmentOpen] = React.useState(false);
  const [scoreAdjustmentForm, setScoreAdjustmentForm] = React.useState({
    achievementScore: 0,
    penaltyScore: 0,
    remarks: "",
  });

  React.useEffect(() => {
    if (compositeScoreData) {
      setScoreAdjustmentForm((prev) => ({
        ...prev,
        achievementScore: compositeScoreData.achievementScore ?? 0,
        penaltyScore: compositeScoreData.penaltyScore ?? 0,
      }));
    }
  }, [compositeScoreData]);

  const handleScoreAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scoreAdjustmentMutation.mutate(scoreAdjustmentForm, {
      onSuccess: () => setScoreAdjustmentOpen(false),
    });
  };

  const [activeEditSection, setActiveEditSection] = React.useState<
    | "academics"
    | "experience"
    | "entranceTest"
    | "scoring"
    | "decision"
    | null
  >(null);

  const [localInterviewEdits, setLocalInterviewEdits] = React.useState<{
    academics?: any;
    experience?: any;
    entranceTest?: any;
    scoring?: any;
    decision?: any;
  }>({});

  const handleSave = (section: string, updatedFields: any) => {
    toast.success(`${section} updated successfully`);
    setLocalInterviewEdits((prev) => ({
      ...prev,
      [section === "Academic Profile" ? "academics" :
       section === "Work Experience" ? "experience" :
       section === "Entrance Test" ? "entranceTest" :
       section === "Evaluation & Scoring" ? "scoring" :
       section === "Admission Decision" ? "decision" : "other"]: updatedFields
    }));

    if (section === "Academic Profile" && appData) {
      updateSectionMutation.mutate({
        applicationNo: applicationNumber,
        section: "education",
        data: {
          ...(appData as any),
          education: {
            tenth: { institute: "", board: "", stream: "", year: "", ...appData.education?.tenth, percentage: String(updatedFields.tenthPercentage) },
            twelfth: { institute: "", board: "", stream: "", year: "", ...appData.education?.twelfth, percentage: String(updatedFields.twelfthPercentage) },
            graduation: { state: "", university: "", college: "", degree: "", mode: "", status: "", enrollmentYear: "", passingYear: "", ...appData.education?.graduation, percentageTillLast: String(updatedFields.ugPercentage), percentage: String(updatedFields.ugPercentage) },
          }
        } as any
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["composite-score"] });
        }
      });
    }

    if (section === "Entrance Test" && appData) {
      const testsArray = Array.isArray(updatedFields.entranceTests)
        ? updatedFields.entranceTests
        : [
            {
              exam: updatedFields.name || "CAT",
              rollNo: updatedFields.rollNo || "",
              month: updatedFields.month || "",
              status: updatedFields.status || "Declared",
              score: String(updatedFields.score || "-"),
              percentile: String(updatedFields.percentile || "0"),
            }
          ];

      updateSectionMutation.mutate({
        applicationNo: applicationNumber,
        section: "entrance",
        data: {
          ...(appData as any),
          entranceTests: testsArray,
        } as any
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["composite-score"] });
        }
      });
    }

    if (section === "Work Experience") {
      if (updatedFields.workExperiences) {
        updateSectionMutation.mutate({
          applicationNo: applicationNumber,
          section: "experience",
          data: {
            ...(appData as any),
            workExperiences: updatedFields.workExperiences,
          } as any,
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["composite-score"] });
          }
        });
      }

      if (updatedFields.validatedMonths !== undefined) {
        updateGdEvalMutation.mutate({
          applicationNo: applicationNumber,
          data: {
            claimedMonths: String(updatedFields.claimedMonths || "0"),
            validatedMonths: String(updatedFields.validatedMonths || "0"),
          },
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["composite-score"] });
          }
        });
      }
    }

    if (section === "Evaluation & Scoring") {
      const gdNum = Number(updatedFields.gdScore);
      const piNum = Number(updatedFields.piScore);
      const payload: any = {};
      if (!isNaN(gdNum)) payload.gdScore = gdNum;
      if (!isNaN(piNum)) payload.piScore = piNum;

      updateGdEvalMutation.mutate({
        applicationNo: applicationNumber,
        data: payload,
      });
    }

    if (section === "Admission Decision") {
      let apiStatus = "under_review";
      if (updatedFields.campus === "Not Selected") {
        apiStatus = "rejected";
      } else if (updatedFields.campus !== "Awaited Scores" && updatedFields.campus) {
        apiStatus = "accepted";
      }

      const payload: any = { status: apiStatus };
      if (updatedFields.campus) payload.confirmedCampus = updatedFields.campus;
      if (updatedFields.remarks !== undefined) payload.remarks = updatedFields.remarks;

      updateGdEvalMutation.mutate({
        applicationNo: applicationNumber,
        data: payload,
      });
    }

    setActiveEditSection(null);
  };

  const appData = fetchedAppData || (listMatch ? {
    applicationNo: listMatch.applicationNo,
    applicant: {
      name: listMatch.name,
      email: listMatch.email,
      primaryMobile: listMatch.phone,
      photo: "",
    },
    appliedFor: listMatch.course,
    education: {
      tenth: { percentage: "85" },
      twelfth: { percentage: "92" },
      graduation: { percentageTillLast: "75", percentage: "75" },
    },
    entranceTests: [
      { exam: "CAT", score: "99", percentile: "99" }
    ],
    preferences: {
      preference1: listMatch.confirmedCampus || "Kochi",
      preference2: "Chennai",
    }
  } : null);

  const interviewData = React.useMemo(() => {
    if (!appData) return null;

    const tenthPct = parseFloat(localInterviewEdits.academics?.tenthPercentage ?? appData.education?.tenth?.percentage ?? "0") || 0;
    const twelfthPct = parseFloat(localInterviewEdits.academics?.twelfthPercentage ?? appData.education?.twelfth?.percentage ?? "0") || 0;
    const ugPct = parseFloat(localInterviewEdits.academics?.ugPercentage ?? (appData.education?.graduation as any)?.percentageTillLast ?? (appData.education?.graduation as any)?.percentage ?? "0") || 0;

    const tenthScore = compositeScoreData?.tenthScore ?? localInterviewEdits.academics?.tenthScore ?? (tenthPct >= 80 ? 1 : 0);
    const twelfthScore = compositeScoreData?.twelfthScore ?? localInterviewEdits.academics?.twelfthScore ?? (twelfthPct >= 90 ? 4 : twelfthPct >= 80 ? 3 : 2);
    const ugScore = compositeScoreData?.ugScore ?? localInterviewEdits.academics?.ugScore ?? (ugPct >= 70 ? 2 : ugPct >= 60 ? 1 : 0);
    const totalAcademicScore = tenthScore + twelfthScore + ugScore;

    const rawTests = (appData.entranceTests && Array.isArray(appData.entranceTests))
      ? appData.entranceTests.filter((t: any) => {
          if (!t) return false;
          const roll = (t.rollNo || t.rollNumber || "").toString().trim();
          const score = (t.score || t.compositeScore || "").toString().trim();
          const pct = (t.percentile != null ? t.percentile : "").toString().trim();
          return Boolean((roll && roll !== "-") || (score && score !== "-") || (pct && pct !== "-"));
        })
      : [];

    const calcIndividualTestScore = (pctVal: any) => {
      const pct = parseFloat(pctVal) || 0;
      const testBands = scoringConfig?.bands?.testPercentile;
      if (testBands && Array.isArray(testBands) && testBands.length > 0) {
        const sorted = [...testBands]
          .map((b: any) => ({
            threshold: Number(b.minPercentile ?? b.minPercent ?? 0),
            points: Number(b.points ?? 0),
          }))
          .sort((a, b) => b.threshold - a.threshold);
        for (const band of sorted) {
          if (pct >= band.threshold) return band.points;
        }
        return 0;
      }
      if (pct >= 95) return 10;
      if (pct >= 90) return 8;
      if (pct >= 80) return 6;
      if (pct >= 70) return 4;
      if (pct >= 60) return 2;
      return 0;
    };

    const maxScore = compositeScoreData?.maxTestScore ?? 10;

    const allTests = rawTests.map((t: any) => {
      const tPct = parseFloat(t.percentile) || 0;
      const testScoreVal = (t.score && t.score !== "-")
        ? t.score
        : (t.percentile != null && t.percentile !== "-"
            ? `${calcIndividualTestScore(tPct)} / ${maxScore}`
            : "-");

      return {
        name: t.exam || t.testName || "CAT",
        rollNo: t.rollNo || "-",
        month: t.month || "-",
        status: t.status || "Declared",
        score: testScoreVal,
        percentile: t.percentile != null ? String(t.percentile) : "-",
      };
    });

    const bestTest = rawTests.reduce((best: any, current: any) => {
      const currentPct = parseFloat(current.percentile) || 0;
      const bestPct = parseFloat(best?.percentile) || 0;
      return currentPct > bestPct ? current : best;
    }, rawTests[0]);

    const rawPercentile = parseFloat(localInterviewEdits.entranceTest?.percentile ?? bestTest?.percentile ?? "0") || 0;
    // Use band-derived score from API; fall back to simple linear formula only when compositeScoreData hasn't loaded
    const entranceTestScore = compositeScoreData?.testComponent ?? Math.round((rawPercentile * 0.4) * 10) / 10;

    const validatedExpMonths = parseInt(localInterviewEdits.experience?.validatedMonths ?? (appData as any).experience?.validatedMonths ?? "0") || 0;
    // Use band-derived experience score from API; fall back to simple formula
    const expScore = compositeScoreData?.experienceComponent ?? Math.min(5, Math.floor(validatedExpMonths / 6));

    const dbGdScore = fetchedAppData?.gdEvaluation?.gdScore;
    const dbPiScore = fetchedAppData?.gdEvaluation?.piScore;
    const gdScore = localInterviewEdits.scoring?.gdScore ?? (dbGdScore !== undefined ? dbGdScore : (listMatch?.selectionStatus === "Accepted" ? 8 : listMatch?.selectionStatus === "Rejected" ? 3 : 5));
    const piScore = localInterviewEdits.scoring?.piScore ?? (dbPiScore !== undefined ? dbPiScore : (listMatch?.selectionStatus === "Accepted" ? 22 : listMatch?.selectionStatus === "Rejected" ? 9 : 15));

    const achievement = localInterviewEdits.scoring?.achievement ?? 0;
    const penalty = localInterviewEdits.scoring?.penalty ?? 0;
    const assignedTotalOther = achievement - penalty + 5;

    const base = {
      applicationNo: appData.applicationNo,
      name: appData.applicant?.name || "",
      email: appData.applicant?.email || "",
      phone: appData.applicant?.primaryMobile || "",
      appliedFor: appData.appliedFor || "",
      interviewDetails: {
        location: fetchedAppData?.gdEvaluation?.interviewLocation || listMatch?.interviewLocation || "Kochi",
        date: fetchedAppData?.gdEvaluation?.interviewDate || listMatch?.date || "2026-02-07",
        time: fetchedAppData?.gdEvaluation?.interviewTime || listMatch?.time || "14:30",
      },
      academics: {
        tenth: {
          percentage: String(tenthPct),
          score: tenthScore,
        },
        twelfth: {
          percentage: String(twelfthPct),
          score: twelfthScore,
        },
        ug: {
          percentage: String(ugPct),
          score: ugScore,
        },
        totalScore: totalAcademicScore,
      },
      entranceTest: {
        name: localInterviewEdits.entranceTest?.name ?? bestTest?.exam ?? "CAT",
        score: localInterviewEdits.entranceTest?.score ?? bestTest?.score ?? "-",
        percentile: String(rawPercentile),
      },
      entranceTests: allTests,
      workExperiences: (appData as any).workExperiences || (appData as any).experiences || [],
      experience: {
        companyName: localInterviewEdits.experience?.companyName ?? (appData as any).experience?.companyName ?? "TCS Digital",
        designation: localInterviewEdits.experience?.designation ?? (appData as any).experience?.designation ?? "Systems Engineer",
        claimedMonths: localInterviewEdits.experience?.claimedMonths ?? (appData as any).experience?.claimedMonths ?? "18",
        validatedMonths: String(validatedExpMonths),
        score: expScore,
      },
      components: {
        achievement,
        penalty,
        assignedTotalOther,
      },
      interviewScores: {
        gd: gdScore,
        pi: piScore,
        get totalGDPI() {
          return this.gd + this.pi;
        },
        get compositeScore() {
          return Math.min(100, Math.round((totalAcademicScore + entranceTestScore + expScore + this.totalGDPI + achievement - penalty) * 10) / 10);
        },
      },
      discrepancy: appData.entranceTests?.every((t: any) => t.percentile === "-")
        ? "Entrance Score Awaited"
        : null,
      decision: {
        campus: localInterviewEdits.decision?.campus ?? fetchedAppData?.gdEvaluation?.confirmedCampus ?? listMatch?.confirmedCampus ?? "Awaited Scores",
        waitlist: localInterviewEdits.decision?.waitlist ?? "Not Applicable",
        remarks:
          localInterviewEdits.decision?.remarks ??
          fetchedAppData?.gdEvaluation?.remarks ??
          (listMatch?.selectionStatus === "Accepted"
            ? "Strong performance in GD and PI. Recommended for selection."
            : listMatch?.selectionStatus === "Rejected"
              ? "Does not meet the cut-off requirements."
              : "Evaluation in progress."),
      },
    };

    return base;
  }, [appData, listMatch, localInterviewEdits, fetchedAppData, compositeScoreData, scoringConfig]);

  const hasWorkExp = React.useMemo(() => {
    if (!interviewData) return false;
    const exps = (interviewData as any).workExperiences;
    if (Array.isArray(exps) && exps.length > 0) return true;
    const exp = interviewData.experience;
    if (exp && exp.companyName && exp.companyName !== "-" && exp.companyName !== "") return true;
    if (exp && exp.claimedMonths && exp.claimedMonths !== "0" && exp.claimedMonths !== "-") return true;
    return false;
  }, [interviewData]);

  if (isLoading && !listMatch) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading candidate details...
          </p>
        </div>
      </div>
    );
  }

  if (!appData || !interviewData) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white">
        <p className="text-sm text-red-500 font-medium">Candidate not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full bg-white min-h-screen">


      {/* Hero Header Card */}
      <div className="relative w-full p-6 rounded-[8px] border border-[#D4D4D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <Link
          href="/organization/gd-interview"
          className="absolute top-3 left-3 hover:opacity-80 transition-opacity p-1 z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="11.667"
            viewBox="0 0 17 14"
            fill="none"
          >
            <path
              d="M6.66671 12.4999L0.833374 6.66658M0.833374 6.66658L6.66671 0.833252M0.833374 6.66658H15.8334"
              stroke="#64748B"
              strokeWidth="1.667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <div className="grid grid-cols-[auto_1fr] gap-x-[16px] md:gap-x-[24px] gap-y-[6px] pt-4">
          {/* Column 1: Avatar */}
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-100 shadow-xs shrink-0 col-start-1 row-start-1 md:row-span-2 mt-2 md:mt-0">
            <AvatarImage
              src={appData.applicant.photo}
              alt={interviewData.name}
            />
            <AvatarFallback className="text-xl font-bold">
              {interviewData.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Name & APP No */}
          <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
            <h2 className="text-xl md:text-2xl font-bold text-[#0A0A0A] leading-tight break-words">
              {interviewData.name}
            </h2>
            <div className="flex">
              <span
                className="font-sans"
                style={{
                  display: "inline-flex",
                  padding: "4px 12px",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  borderRadius: "9999px",
                  border: "1px solid #DBEAFE",
                  background: "#EFF6FF",
                  color: "#475569",
                  fontFamily: "Inter",
                  fontSize: "12px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "16px",
                  textTransform: "uppercase",
                }}
              >
                APP NO: {interviewData.applicationNo}
              </span>
            </div>
          </div>

          {/* Details & Buttons Row */}
          <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col gap-4 w-full overflow-hidden mt-4 md:mt-0">
            {/* Top Row: Content and Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-start w-full gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#1E293B] text-[12px] font-normal leading-[20px] font-sans">
                    <span className="flex items-center gap-1.5 shrink-0">
                      <svg
                        viewBox="0 0 20 16"
                        fill="none"
                        className="h-4 w-4 text-[#415876]"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196667 15.0217 0.000666667 14.5507 0 14V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 1.45 19.8043 15.021 19.413 15.413C19.0217 15.805 18.5507 16.0007 18 16H2ZM10 9L18 4V2L10 7L2 2V4L10 9Z"
                          fill="currentColor"
                        />
                      </svg>
                      {interviewData.email}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 text-[#415876]"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19.95 21C17.8667 21 15.8083 20.546 13.775 19.638C11.7417 18.73 9.89167 17.4423 8.225 15.775C6.55833 14.1077 5.271 12.2577 4.363 10.225C3.455 8.19233 3.00067 6.134 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07933 8.725 3.238C8.90833 3.39667 9.01667 3.584 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.704 12.1123 8.162 12.687C8.62 13.2617 9.12433 13.816 9.675 14.35C10.1917 14.8667 10.7333 15.346 11.3 15.788C11.8667 16.23 12.4667 16.634 13.1 17L15.45 14.65C15.6 14.5 15.796 14.3877 16.038 14.313C16.28 14.2383 16.5173 14.2173 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1377 20.775 15.313C20.925 15.4883 21 15.684 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z"
                          fill="currentColor"
                        />
                      </svg>
                      {interviewData.phone}
                    </span>
                  </div>

                  {/* Time & Location Box */}
                  <div className="flex items-center gap-6 mt-1 bg-[#F8FAFC]/50 w-max">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-normal leading-[15px] tracking-[1px] uppercase text-[#475569] font-sans">
                        LOCATION
                      </span>
                      <p className="text-[14px] font-bold leading-[20px] text-[#1E293B] font-sans whitespace-nowrap">
                        {interviewData.interviewDetails.location}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-normal leading-[15px] tracking-[1px] uppercase text-[#475569] font-sans">
                        DATE
                      </span>
                      <p className="text-[14px] font-bold leading-[20px] text-[#1E293B] font-sans whitespace-nowrap">
                        {new Date(
                          interviewData.interviewDetails.date,
                        ).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-normal leading-[15px] tracking-[1px] uppercase text-[#475569] font-sans">
                        TIME
                      </span>
                      <p className="text-[14px] font-bold leading-[20px] text-[#1E293B] font-sans whitespace-nowrap">
                        {interviewData.interviewDetails.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[15px] shrink-0 w-full lg:w-auto mt-4 lg:mt-0">
                <Button
                  asChild
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
                >
                  <Link href={`/organization/applications/${interviewData.applicationNo}`}>
                    APPLICATION
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
                >
                  <Link href={`/organization/communications/${interviewData.applicationNo}`}>
                    COMMUNICATION
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Divider Line starts exactly from name text column alignment */}
            <div className="border-t border-[#E2E8F0]" />

            {/* Bottom Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-[#475569]">
                <span>Applied For:</span>
                <Badge
                  className="text-[#2563EB] border-none font-bold px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "rgba(37, 99, 235, 0.25)",
                    borderRadius: "9999px",
                  }}
                >
                  {interviewData.appliedFor}
                </Badge>
              </div>

              {interviewData.discrepancy && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{
                    color: "#E11D48",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "20px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(225, 29, 72, 0.24)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Discrepancy: {interviewData.discrepancy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academics, Experience & Tests (Col-4/12 equivalent) */}
        <div className="lg:col-span-1 space-y-6">
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
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
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="13.379"
                  viewBox="0 0 17 15"
                  fill="none"
                  className="aspect-[37/33] shrink-0"
                >
                  <path
                    d="M8.35791 8.8099L15.8579 4.64323L8.35791 0.476562L0.85791 4.64323L8.35791 8.8099V8.8099M8.35791 8.8099L13.4912 5.95823C14.1667 7.6733 14.3584 9.54087 14.0454 11.3574C11.9317 11.5625 9.93892 12.4379 8.35791 13.8557C6.77712 12.4381 4.78465 11.5627 2.67124 11.3574C2.35808 9.54088 2.54977 7.67325 3.22541 5.95823L8.35791 8.8099V8.8099M5.02458 13.8099V7.5599L8.35791 5.70823"
                    stroke="#1E293B"
                    strokeWidth="0.833333"
                  />
                </svg>
                Academic Profile
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("academics")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 w-full">
              <div className="px-5 w-full">
                <div className="divide-y divide-[#F8FAFC] w-full">
                  <div className="grid grid-cols-3 pt-6 pb-4">
                    <div
                      className="font-sans text-left"
                      style={{
                        color: "var(--Colorsecondary-text-color, #475569)",
                        fontFamily: "Inter",
                        fontSize: "10px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Level
                    </div>
                    <div
                      className="font-sans text-center"
                      style={{
                        color: "var(--Colorsecondary-text-color, #475569)",
                        fontFamily: "Inter",
                        fontSize: "10px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Percentage
                    </div>
                    <div
                      className="font-sans text-right"
                      style={{
                        color: "var(--Colorsecondary-text-color, #475569)",
                        fontFamily: "Inter",
                        fontSize: "10px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Score
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center py-4">
                  <div style={{ color: "var(--text-primary-color, #1E293B)", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "20px" }}>10th Std</div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.tenth.percentage}
                  </div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.tenth.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center py-4">
                  <div style={{ color: "var(--text-primary-color, #1E293B)", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "20px" }}>12th Std</div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.twelfth.percentage}
                  </div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.twelfth.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center py-4">
                  <div style={{ color: "var(--text-primary-color, #1E293B)", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "20px" }}>UG</div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.ug.percentage}
                  </div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.ug.score}
                  </div>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Experience Card */}
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "16px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
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
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <Briefcase className="h-4 w-4 text-[#1E293B]" />
                Work Experience
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("experience")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 w-full">
              {((interviewData?.workExperiences || []).length > 0) ? (
                <div className="divide-y divide-[#F8FAFC] w-full">
                  {(interviewData.workExperiences || []).map((exp: any, index: number) => (
                    <div key={index} className="px-5 py-3 flex flex-col gap-1 hover:bg-slate-50/50">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">{exp.companyName || exp.organization || "-"}</span>
                        <span className="font-bold text-emerald-600 text-xs">{exp.salaryCtc || exp.grossSalary || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>{exp.designation || "-"}</span>
                        <span>{exp.fromDate || exp.from_date || exp.toDate || exp.to_date ? `${exp.fromDate || exp.from_date || "-"} to ${exp.toDate || exp.to_date || "Present"}` : exp.rolesResponsibilities || "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-sm text-slate-600">Company Name</span>
                  <div style={{ color: "#1E293B", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.experience.companyName}
                  </div>
                </div>
              )}

              <div className="px-5 pt-3 mt-2 border-t border-[#F8FAFC] flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total Months: <span className="font-bold text-[#1A237E]">{compositeScoreData?.autoCalculatedMonths ?? interviewData.experience.validatedMonths}</span></span>
                <span className="text-xs font-semibold text-slate-600">Experience Score: <span className="font-bold text-[#1A237E]">{interviewData.experience.score} / {compositeScoreData?.maxExperienceScore ?? "—"}</span></span>
              </div>
            </CardContent>
          </Card>

          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
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
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13.035"
                  height="13.035"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d="M1.22024 9.73576C0.892701 8.94502 0.724121 8.09751 0.724121 7.24162C0.724121 5.51307 1.41078 3.85532 2.63305 2.63305C3.85532 1.41078 5.51307 0.724121 7.24162 0.724121C8.97017 0.724121 10.6279 1.41078 11.8502 2.63305C13.0725 3.85532 13.7591 5.51307 13.7591 7.24162C13.7591 8.09751 13.5905 8.94502 13.263 9.73576C12.9355 10.5265 12.4554 11.245 11.8502 11.8502C11.245 12.4554 10.5265 12.9355 9.73576 13.263C8.94502 13.5905 8.09751 13.7591 7.24162 13.7591C6.38573 13.7591 5.53822 13.5905 4.74748 13.263C3.95674 12.9355 3.23826 12.4554 2.63305 11.8502C2.02785 11.245 1.54777 10.5265 1.22024 9.73576Z"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.2417 3.62061V7.24144L9.4142 9.41394"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Entrance Test
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("entranceTest")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="px-5 pt-6 pb-4 w-full">
              {(!interviewData.entranceTests || interviewData.entranceTests.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400 mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-600">
                    Entrance Scores Awaited
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {interviewData.entranceTests.map((test: any, idx: number) => (
                    <div key={idx} className="space-y-4 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Test Name</span>
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Score</span>
                        <div style={{ color: "#1E293B", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                          {test.score}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Percentile</span>
                        <div style={{ color: "#E11D48", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                          {test.percentile}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="px-5 pt-3 mt-2 border-t border-[#F8FAFC] flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Test Score: <span className="font-bold text-[#1A237E]">{compositeScoreData?.testComponent ?? "—"} / {compositeScoreData?.maxTestScore ?? "10"}</span></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scoring & Final Evaluation (Col-8/12 equivalent) */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
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
                alignSelf: "stretch",
                borderBottom: "1px solid #E5E5E5",
                background: "#FAFAFA",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <div className="flex items-center justify-center w-[32px] h-[32px] rounded-[6px] bg-[#E5E5E5] shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="shrink-0"
                  >
                  <path
                    d="M9.16662 2.5459C5.26403 2.98203 2.35838 6.35434 2.50402 10.2785C2.64967 14.2027 5.7973 17.3504 9.72149 17.496C13.6457 17.496 17.018 14.736 17.4541 10.8334H9.16662V2.5459V2.5459"
                    stroke="#1A237E"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.0733 7.50009H12.5V2.92676C14.6356 3.6844 16.3157 5.36453 17.0733 7.50009V7.50009"
                    stroke="#1A237E"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  </svg>
                </div>
                Evaluation & Scoring
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("scoring")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Objective Scores */}
                <div className="space-y-4">
                  <h3 className="pb-2" style={{ color: "#64748B", fontFamily: "Inter", fontSize: "10px", fontStyle: "normal", fontWeight: 700, lineHeight: "15px", letterSpacing: "1px", textTransform: "uppercase" }}>
                    Other Components
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">
                        Achievement (Max 5)
                      </span>
                      <Input
                        type="number"
                        defaultValue={interviewData.components.achievement}
                        className="w-[72px] h-[32px] px-0 text-center bg-slate-50 rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: "#1A237E", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                        readOnly
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Penalty (Max -5)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.components.penalty}
                        className="w-[72px] h-[32px] px-0 text-center bg-red-50 text-red-600 rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                        readOnly
                      />
                    </div>

                    <div className="pt-2 flex justify-between items-center" style={{ borderTop: "1px solid #F8FAFC" }}>
                      <span className="font-sans text-sm font-bold text-[#1E293B] leading-5">
                        Total - Other
                      </span>
                      <span className="font-bold text-lg text-slate-900 w-20 text-right pr-3" style={{ fontFamily: "Inter" }}>
                        {interviewData.components.assignedTotalOther}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interview Scores */}
                <div className="space-y-4">
                  <h3 className="pb-2" style={{ color: "#64748B", fontFamily: "Inter", fontSize: "10px", fontStyle: "normal", fontWeight: 700, lineHeight: "15px", letterSpacing: "1px", textTransform: "uppercase" }}>
                    GD & PI Scores
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">GD Score (Max 10)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.interviewScores.gd}
                        className="w-[72px] h-[32px] px-0 text-center rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: "#1A237E", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">PI Score (Max 30)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.interviewScores.pi}
                        className="w-[72px] h-[32px] px-0 text-center rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: "#1A237E", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                      />
                    </div>

                    <div className="pt-2 flex justify-between items-center" style={{ borderTop: "1px solid #F8FAFC" }}>
                      <span className="font-sans text-sm font-bold text-[#1E293B] leading-5">
                        Total - GDPI
                      </span>
                      <span className="font-bold text-lg text-blue-600 w-20 text-right pr-3" style={{ fontFamily: "Inter" }}>
                        {interviewData.interviewScores.totalGDPI}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Composite Score Banner */}
              <div className="relative mt-8 bg-[#2563EB] rounded-xl h-[95px] flex items-center justify-between px-6 overflow-hidden shadow-md">
                {/* Sloped Background SVG */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    viewBox="0 0 693 95"
                    fill="none"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 95L695.333 0V95H0Z" fill="white" fillOpacity="0.15" />
                  </svg>
                </div>

                {/* Left Side: Texts */}
                <div className="relative z-10 text-white space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    FINAL CALCULATION
                  </p>
                  <h3 className="font-bold text-xl md:text-2xl">
                    Composite Score
                  </h3>
                </div>

                {/* Right Side: Score */}
                <div className="relative z-10 flex items-baseline gap-1 text-white pr-2 sm:pr-4">
                  <span className="text-4xl font-black">
                    {typeof compositeScoreData?.compositeScore === "number"
                      ? compositeScoreData.compositeScore
                      : interviewData.interviewScores.compositeScore}
                  </span>
                  <span className="text-sm font-bold opacity-80">/ 100</span>
                </div>
              </div>

              {compositeScoreData?.discrepancyFlag && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Experience discrepancy flagged — claimed {compositeScoreData.claimedExperienceMonths ?? "-"} mo vs
                  validated {compositeScoreData.validatedExperienceMonths ?? "-"} mo (exceeds org threshold).
                </div>
              )}

              {/* Composite Score Breakdown — real per-round scores + components
                  behind the banner above, from ScoringService.computeCompositeScore */}
              <div className="mt-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    style={{
                      color: "#64748B",
                      fontFamily: "Inter",
                      fontSize: "10px",
                      fontWeight: 700,
                      lineHeight: "15px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                    }}
                  >
                    Composite Score Breakdown
                  </h3>
                  {canAdjustScore && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[11px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
                      onClick={() => setScoreAdjustmentOpen(true)}
                    >
                      Adjust Achievement / Penalty
                    </Button>
                  )}
                </div>

                {!compositeScoreData ? (
                  <p className="text-xs text-slate-500">Loading composite score…</p>
                ) : (
                  <>
                    {compositeScoreData.interviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {compositeScoreData.interviews.map((iv) => (
                          <div key={iv.interviewId} className="rounded-md bg-white border border-[#E2E8F0] p-2.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              {iv.interviewType} Round {iv.round}
                            </p>
                            <p className="text-base font-bold text-slate-900">
                              {iv.score !== null ? iv.score : "—"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {iv.status}
                              {iv.evaluatorCount ? ` · ${iv.evaluatorCount} evaluator(s)` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          GD/PI Total
                        </span>
                        <span className="font-bold text-slate-900">{compositeScoreData.gdpiTotal}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Experience
                        </span>
                        <span className="font-bold text-slate-900">{compositeScoreData.experienceComponent}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Achievement
                        </span>
                        <span className="font-bold text-emerald-600">+{compositeScoreData.achievementScore}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Penalty
                        </span>
                        <span className="font-bold text-red-600">-{compositeScoreData.penaltyScore}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Decision Panel */}
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
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
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
                background: "#FAFAFA",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13.035"
                  height="13.035"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d="M1.22024 9.73576C0.892701 8.94502 0.724121 8.09751 0.724121 7.24162C0.724121 5.51307 1.41078 3.85532 2.63305 2.63305C3.85532 1.41078 5.51307 0.724121 7.24162 0.724121C8.97017 0.724121 10.6279 1.41078 11.8502 2.63305C13.0725 3.85532 13.7591 5.51307 13.7591 7.24162C13.7591 8.09751 13.5905 8.94502 13.263 9.73576C12.9355 10.5265 12.4554 11.245 11.8502 11.8502C11.245 12.4554 10.5265 12.9355 9.73576 13.263C8.94502 13.5905 8.09751 13.7591 7.24162 13.7591C6.38573 13.7591 5.53822 13.5905 4.74748 13.263C3.95674 12.9355 3.23826 12.4554 2.63305 11.8502C2.02785 11.245 1.54777 10.5265 1.22024 9.73576Z"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.2417 3.62061V7.24144L9.4142 9.41394"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Admission Decision
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("decision")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="campus-select"
                    style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                  >
                    Campus Selection
                  </Label>
                  <Select defaultValue={interviewData.decision.campus}>
                    <SelectTrigger id="campus-select" className="w-full rounded-[8px]" style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}>
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Awaited Scores">
                        Awaited Scores
                      </SelectItem>
                      <SelectItem value="PGDM Bangalore">
                        PGDM Bangalore
                      </SelectItem>
                      <SelectItem value="PGDM Chennai">PGDM Chennai</SelectItem>
                      <SelectItem value="PGDM Kochi">PGDM Kochi</SelectItem>
                      <SelectItem value="Not Selected">Not Selected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="waitlist-select"
                    style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                  >
                    Waitlist Status
                  </Label>
                  <Select defaultValue={interviewData.decision.waitlist}>
                    <SelectTrigger id="waitlist-select" className="w-full rounded-[8px]" style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}>
                      <SelectValue placeholder="Select Waitlist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Applicable">
                        Not Applicable
                      </SelectItem>
                      <SelectItem value="WL-1">Waitlist 1</SelectItem>
                      <SelectItem value="WL-2">Waitlist 2</SelectItem>
                      <SelectItem value="WL-3">Waitlist 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="remarks"
                  style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                >
                  Final Remarks / Comments
                </Label>
                <Textarea
                  id="remarks"
                  defaultValue={interviewData.decision.remarks}
                  placeholder="Enter any observational remarks from the panel..."
                  className="min-h-[100px] bg-white border border-[#E2E8F0] rounded-[8px]"
                  style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={activeEditSection !== null}
        onOpenChange={(open) => !open && setActiveEditSection(null)}
      >
        <DialogContent
          className={
            activeEditSection === "academics" || activeEditSection === "scoring" || activeEditSection === "experience"
              ? "max-w-[800px] w-[95%] rounded-[12px] p-[24px] md:p-[32px] gap-0 bg-white max-h-[98vh] overflow-y-auto"
              : "max-w-[600px] w-[95%] rounded-[12px] p-[24px] md:p-[32px] gap-0 bg-white max-h-[98vh] overflow-y-auto"
          }
        >
          <DialogHeader className="flex flex-row items-center gap-2 pb-4 border-b border-[#E5E5E5] space-y-0">
            <div className="flex items-center justify-center h-[36px] w-[36px] rounded-full bg-[#FAFAFA] shrink-0">
              {activeEditSection === "academics" && (
                <GraduationCap className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "experience" && (
                <Briefcase className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "entranceTest" && (
                <Clock className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "scoring" && (
                <Award className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "decision" && (
                <CheckCircle2 className="h-4 w-4 text-[#415876]" />
              )}
            </div>
            <DialogTitle className="text-[#0A0A0A] font-semibold text-[20px] leading-8 tracking-[-0.24px] font-sans">
              {activeEditSection === "academics" && "Academic Profile"}
              {activeEditSection === "experience" && "Work Experience"}
              {activeEditSection === "entranceTest" && "Entrance Test"}
              {activeEditSection === "scoring" && "Evaluation & Scoring"}
              {activeEditSection === "decision" && "Admission Decision"}
            </DialogTitle>
          </DialogHeader>

          {activeEditSection === "academics" && (
            <EditAcademicsForm
              data={interviewData.academics}
              onSave={(d) => handleSave("Academic Profile", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "experience" && (
            <EditExperienceForm
              data={interviewData.experience}
              appData={appData}
              onSave={(d) => handleSave("Work Experience", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "entranceTest" && (
            <EditEntranceTestForm
              data={appData?.entranceTests || interviewData.entranceTests}
              onSave={(d: any) => handleSave("Entrance Test", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "scoring" && (
            <EditScoringForm
              data={{
                achievement: interviewData.components.achievement,
                penalty: interviewData.components.penalty,
                gdScore: interviewData.interviewScores.gd,
                piScore: interviewData.interviewScores.pi,
              }}
              onSave={(d) => handleSave("Evaluation & Scoring", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "decision" && (
            <EditDecisionForm
              data={interviewData.decision}
              onSave={(d) => handleSave("Admission Decision", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Achievement/Penalty manual score adjustment — org_admin /
          application_manager / superadmin only. Calls PATCH
          .../score-adjustment, which re-runs the composite rollup
          server-side so compositeScore above reflects it immediately. */}
      <Dialog open={scoreAdjustmentOpen} onOpenChange={setScoreAdjustmentOpen}>
        <DialogContent className="max-w-[480px] w-[95%] rounded-[12px] p-[24px] gap-0 bg-white">
          <DialogHeader className="flex flex-row items-center gap-2 pb-4 border-b border-[#E5E5E5] space-y-0">
            <div className="flex items-center justify-center h-[36px] w-[36px] rounded-full bg-[#FAFAFA] shrink-0">
              <Award className="h-4 w-4 text-[#415876]" />
            </div>
            <DialogTitle className="text-[#0A0A0A] font-semibold text-[18px] leading-7 font-sans">
              Adjust Achievement / Penalty
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScoreAdjustmentSubmit} className="grid grid-cols-2 gap-x-6 gap-y-4 pt-5 pb-1">
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
                Achievement (0-9.99)
              </Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={9.99}
                value={scoreAdjustmentForm.achievementScore}
                onChange={(e) =>
                  setScoreAdjustmentForm((prev) => ({ ...prev, achievementScore: Number(e.target.value) }))
                }
                className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
                Penalty (0-9.99)
              </Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={9.99}
                value={scoreAdjustmentForm.penaltyScore}
                onChange={(e) =>
                  setScoreAdjustmentForm((prev) => ({ ...prev, penaltyScore: Number(e.target.value) }))
                }
                className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2">
              <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
                Remarks
              </Label>
              <Textarea
                value={scoreAdjustmentForm.remarks}
                onChange={(e) => setScoreAdjustmentForm((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Reason for this adjustment..."
                className="min-h-[80px] bg-white border border-[#E2E8F0] rounded-[8px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] col-span-2 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setScoreAdjustmentOpen(false)}
                className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scoreAdjustmentMutation.isPending}
                className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
              >
                {scoreAdjustmentMutation.isPending ? "Saving..." : "Save Adjustment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface GDFormProps {
  data: any;
  onSave: (updatedData: any) => void;
  onClose: () => void;
}

function EditAcademicsForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    tenthPercentage: data.tenth.percentage,
    tenthScore: data.tenth.score,
    twelfthPercentage: data.twelfth.percentage,
    twelfthScore: data.twelfth.score,
    ugPercentage: data.ug.percentage,
    ugScore: data.ug.score,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-6 gap-y-3 pt-5 pb-1">
      {/* Scoring note */}
      <div className="col-span-2 mb-1 flex items-start gap-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <p className="text-[11px] text-[#1D4ED8] leading-relaxed">
          <span className="font-bold">Score is auto-computed</span> from your org&apos;s scoring bands and cannot be edited here.
          Update bands at{" "}
          <a href="/organization/settings/scoring-bands" className="underline font-semibold hover:text-[#1e40af]" target="_blank">Settings → Scoring Bands</a>.
        </p>
      </div>

      <div className="col-span-2 pb-1">
        <h3 className="font-bold text-slate-800 text-sm">10th Standard</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentage
        </Label>
        <Input
          value={formData.tenthPercentage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tenthPercentage: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score <span className="text-[10px] normal-case font-normal text-slate-400">(auto)</span>
        </Label>
        <Input
          type="number"
          value={formData.tenthScore}
          readOnly
          disabled
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px] bg-[#F8FAFC] text-slate-400 cursor-not-allowed"
        />
      </div>

      <div className="col-span-2 pb-1 pt-3 border-t border-[#F1F5F9]">
        <h3 className="font-bold text-slate-800 text-sm">12th Standard</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentage
        </Label>
        <Input
          value={formData.twelfthPercentage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, twelfthPercentage: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score <span className="text-[10px] normal-case font-normal text-slate-400">(auto)</span>
        </Label>
        <Input
          type="number"
          value={formData.twelfthScore}
          readOnly
          disabled
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px] bg-[#F8FAFC] text-slate-400 cursor-not-allowed"
        />
      </div>

      <div className="col-span-2 pb-1 pt-3 border-t border-[#F1F5F9]">
        <h3 className="font-bold text-slate-800 text-sm">Under-Graduation</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentage
        </Label>
        <Input
          value={formData.ugPercentage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, ugPercentage: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score <span className="text-[10px] normal-case font-normal text-slate-400">(auto)</span>
        </Label>
        <Input
          type="number"
          value={formData.ugScore}
          readOnly
          disabled
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px] bg-[#F8FAFC] text-slate-400 cursor-not-allowed"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] col-span-2 mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditExperienceForm({ data, appData, onSave, onClose }: GDFormProps & { appData?: any }) {
  const formatDateForInput = (dateVal: any) => {
    if (!dateVal) return "";
    if (typeof dateVal === "string") {
      return dateVal.split("T")[0];
    }
    return "";
  };

  const existingExps =
    (data as any)?.workExperiences ||
    appData?.workExperiences ||
    appData?.experiences ||
    [];

  const [experiences, setExperiences] = React.useState<any[]>(
    existingExps.length > 0
      ? existingExps
      : [{ companyName: data?.companyName || "", designation: data?.designation || "", salaryCtc: "", fromDate: "", toDate: "" }]
  );

  const [validatedMonths, setValidatedMonths] = React.useState(data?.validatedMonths || "0");

  const handleFieldChange = (index: number, field: string, value: string) => {
    setExperiences((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddExperience = () => {
    setExperiences((prev) => [
      ...prev,
      { companyName: "", designation: "", salaryCtc: "", fromDate: "", toDate: "" },
    ]);
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      workExperiences: experiences,
      validatedMonths,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-3 pb-1">
      {experiences.map((exp: any, index: number) => (
        <div key={index} className="flex flex-col gap-3 p-4 border rounded-lg bg-white">
          <div className="border-b pb-1.5 flex justify-between items-center">
            <h4 className="font-bold text-slate-800 text-sm">
              Experience #{index + 1} Details
            </h4>
            <button
              type="button"
              onClick={() => handleRemoveExperience(index)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition-colors"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider font-sans">
                Company / Employer
              </Label>
              <Input
                value={exp.companyName || exp.organization || ""}
                onChange={(e) => handleFieldChange(index, "companyName", e.target.value)}
                placeholder="e.g. TCS / Infosys"
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider font-sans">
                Designation
              </Label>
              <Input
                value={exp.designation || ""}
                onChange={(e) => handleFieldChange(index, "designation", e.target.value)}
                placeholder="e.g. Software Engineer"
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider font-sans">
                From Date
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formatDateForInput(exp.fromDate || exp.from_date)}
                  onChange={(e) => handleFieldChange(index, "fromDate", e.target.value)}
                  className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                />
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider font-sans">
                To Date
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formatDateForInput(exp.toDate || exp.to_date)}
                  onChange={(e) => handleFieldChange(index, "toDate", e.target.value)}
                  className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                />
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider font-sans">
                Annual CTC / Salary
              </Label>
              <Input
                value={exp.salaryCtc || exp.grossSalary || ""}
                onChange={(e) => handleFieldChange(index, "salaryCtc", e.target.value)}
                placeholder="e.g. ₹6.5 LPA"
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddExperience}
        className="w-full h-9 text-xs font-semibold text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/5 cursor-pointer"
      >
        + Add Work Experience
      </Button>

      {/* Auto-calculated months note */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E5E5E5]">
        <div className="flex items-start gap-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <p className="text-[11px] text-[#1D4ED8] leading-relaxed">
            <span className="font-bold">Experience months are auto-calculated</span> from the From / To dates of each job record above. Score is assigned based on your org&apos;s scoring bands at{" "}
            <a href="/organization/settings/scoring-bands" className="underline font-semibold hover:text-[#1e40af]" target="_blank">Settings → Scoring Bands</a>.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditEntranceTestForm({ data, onSave, onClose }: any) {
  const rawList = Array.isArray(data) ? data : [];
  const initialTests = (rawList && rawList.length > 0)
    ? rawList.map((test: any) => ({
        exam: test.exam || test.name || "CAT",
        rollNo: test.rollNo === "-" ? "" : (test.rollNo || ""),
        month: test.month === "-" ? "" : (test.month || ""),
        status: test.status === "-" ? "Declared" : (test.status || "Declared"),
        score: test.score === "-" ? "" : (test.score || ""),
        percentile: test.percentile === "-" ? "" : (test.percentile || ""),
      }))
    : [{ exam: "CAT", rollNo: "", month: "", status: "Declared", score: "", percentile: "" }];

  const [formData, setFormData] = React.useState({
    entranceTests: initialTests,
  });

  const handleFieldChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const updatedTests = [...prev.entranceTests];
      updatedTests[index] = {
        ...updatedTests[index],
        [field]: value,
      };
      return { entranceTests: updatedTests };
    });
  };

  const handleAddTest = () => {
    setFormData((prev) => ({
      entranceTests: [
        ...prev.entranceTests,
        { exam: "MAT", rollNo: "", month: "", status: "Declared", score: "", percentile: "" },
      ],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ entranceTests: formData.entranceTests });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-3 pb-1">
      {/* Score note banner */}
      <div className="flex items-start gap-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <p className="text-[11px] text-[#1D4ED8] leading-relaxed">
          <span className="font-bold">Score is auto-computed</span> from your org&apos;s scoring bands based on percentile. To change how scores are awarded, update bands at{" "}
          <a href="/organization/settings/scoring-bands" className="underline font-semibold hover:text-[#1e40af]" target="_blank">Settings → Scoring Bands</a>.
        </p>
      </div>
      {formData.entranceTests.map((test: any, index: number) => (
        <div key={index} className="flex flex-col gap-3 p-4 border rounded-lg bg-white">
          <div className="border-b pb-1.5 flex justify-between items-center">
            <h4 className="font-bold text-slate-800 text-sm">
              Test #{index + 1} Details
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Exam Name
              </Label>
              <Select
                value={test.exam}
                onValueChange={(val) => handleFieldChange(index, "exam", val)}
              >
                <SelectTrigger className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white">
                  <SelectValue placeholder="Select Exam" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAT">CAT</SelectItem>
                  <SelectItem value="XAT">XAT</SelectItem>
                  <SelectItem value="MAT">MAT</SelectItem>
                  <SelectItem value="CMAT">CMAT</SelectItem>
                  <SelectItem value="ATMA">ATMA</SelectItem>
                  <SelectItem value="GMAT">GMAT</SelectItem>
                  <SelectItem value="CUET">CUET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Roll No / Reg No
              </Label>
              <Input
                value={test.rollNo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(index, "rollNo", e.target.value)}
                placeholder="e.g. CUET998877"
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Month/Year
              </Label>
              <Input
                value={test.month}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(index, "month", e.target.value)}
                placeholder="e.g. May 2024"
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Status
              </Label>
              <Select
                value={test.status}
                onValueChange={(val) => handleFieldChange(index, "status", val)}
              >
                <SelectTrigger className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Declared">Declared</SelectItem>
                  <SelectItem value="Awaiting Result">Awaiting Result</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Percentile
              </Label>
              <Input
                value={test.percentile}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(index, "percentile", e.target.value)}
                placeholder="e.g. 94.00"
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddTest}
        className="w-full border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
      >
        + Add Another Entrance Test
      </Button>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditScoringForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    achievement: data.achievement,
    penalty: data.penalty,
    gdScore: data.gdScore,
    piScore: data.piScore,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-6 gap-y-3 pt-5 pb-1">
      <div className="col-span-2 pb-1">
        <h3 className="font-bold text-slate-800 text-sm">Other Components</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Achievement (Max 5)
        </Label>
        <Input
          type="number"
          value={formData.achievement}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, achievement: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Penalty (Max -5)
        </Label>
        <Input
          type="number"
          value={formData.penalty}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, penalty: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="col-span-2 pb-1 pt-3 border-t border-[#F1F5F9]">
        <h3 className="font-bold text-slate-800 text-sm">GD &amp; PI Scores</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          GD Score (Max 10)
        </Label>
        <Input
          type="number"
          value={formData.gdScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, gdScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          PI Score (Max 30)
        </Label>
        <Input
          type="number"
          value={formData.piScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, piScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] col-span-2 mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditDecisionForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    campus: data.campus,
    waitlist: data.waitlist,
    remarks: data.remarks,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-5 pb-1">
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Campus Selection
        </Label>
        <Select
          value={formData.campus}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, campus: val }))
          }
        >
          <SelectTrigger className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]">
            <SelectValue placeholder="Select Campus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Awaited Scores">Awaited Scores</SelectItem>
            <SelectItem value="PGDM Bangalore">PGDM Bangalore</SelectItem>
            <SelectItem value="PGDM Chennai">PGDM Chennai</SelectItem>
            <SelectItem value="PGDM Kochi">PGDM Kochi</SelectItem>
            <SelectItem value="Not Selected">Not Selected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Waitlist Status
        </Label>
        <Select
          value={formData.waitlist}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, waitlist: val }))
          }
        >
          <SelectTrigger className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]">
            <SelectValue placeholder="Select Waitlist" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Not Applicable">Not Applicable</SelectItem>
            <SelectItem value="WL-1">Waitlist 1</SelectItem>
            <SelectItem value="WL-2">Waitlist 2</SelectItem>
            <SelectItem value="WL-3">Waitlist 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Final Remarks / Comments
        </Label>
        <Textarea
          value={formData.remarks}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, remarks: e.target.value }))
          }
          placeholder="Enter any observational remarks from the panel..."
          className="min-h-[100px] bg-white border border-[#D4D4D4] rounded-[8px] text-[14px]"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}
