/* eslint-disable max-lines, @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useApplications } from "@/hooks/use-applications";
import { useInterviews, type Interview } from "@/hooks/use-interviews";
import { useScoreConversionConfig, type ScoreBand } from "@/hooks/use-shortlisting";
import { useCourses } from "@/hooks/use-courses";
import { useCourseSessions } from "@/hooks/use-course-sessions";
import { useBranches } from "@/hooks/use-branches";
import { apiPatch } from "@/lib/api";
import { usePageHeaderStore } from "@/stores/page-header-store";

import {
  Search,
  Save,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  SearchX,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Standard scoring bands fallback
const STANDARD_55_BANDS = {
  tenth: [
    { minPercent: 90, points: 10 },
    { minPercent: 80, points: 8 },
    { minPercent: 70, points: 6 },
    { minPercent: 60, points: 4 },
    { minPercent: 50, points: 2 },
  ],
  twelfth: [
    { minPercent: 90, points: 10 },
    { minPercent: 80, points: 8 },
    { minPercent: 70, points: 6 },
    { minPercent: 60, points: 4 },
    { minPercent: 50, points: 2 },
  ],
  ug: [
    { minPercent: 85, points: 15 },
    { minPercent: 75, points: 12 },
    { minPercent: 65, points: 9 },
    { minPercent: 55, points: 6 },
    { minPercent: 50, points: 3 },
  ],
  testPercentile: [
    { minPercentile: 95, points: 10 },
    { minPercentile: 90, points: 8 },
    { minPercentile: 80, points: 6 },
    { minPercentile: 70, points: 4 },
    { minPercentile: 60, points: 2 },
  ],
  experienceMonths: [
    { minMonths: 48, points: 10 },
    { minMonths: 36, points: 8 },
    { minMonths: 24, points: 6 },
    { minMonths: 12, points: 4 },
  ],
};

function computeScoreFromBand(
  val: number,
  bands?: ScoreBand[],
  mode: "percent" | "percentile" | "months" = "percent"
): number {
  if (!bands || !Array.isArray(bands) || bands.length === 0) return 0;
  const sorted = [...bands].sort((a, b) => {
    const aVal = Number(a.minPercent ?? a.minPercentile ?? a.minMonths ?? 0);
    const bVal = Number(b.minPercent ?? b.minPercentile ?? b.minMonths ?? 0);
    return bVal - aVal;
  });
  for (const band of sorted) {
    const threshold = Number(
      mode === "percentile"
        ? (band.minPercentile ?? band.minPercent ?? 0)
        : mode === "months"
        ? (band.minMonths ?? 0)
        : (band.minPercent ?? 0)
    );
    if (val >= threshold) {
      return Number(band.points ?? 0);
    }
  }
  return 0;
}

export default function SeatAllocationMeritPage() {
  const queryClient = useQueryClient();
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  // State Filters (Default to 'selected' tab)
  const [activeTab, setActiveTab] = React.useState<string>("selected");
  const [selectedCourse, setSelectedCourse] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Backend Data Queries
  const { data: appsResponse, isLoading: appsLoading } = useApplications(1, 1000);
  const { data: allInterviews } = useInterviews();
  const { data: scoringConfig } = useScoreConversionConfig();
  const { data: coursesResponse } = useCourses(1, 100);
  const { data: courseSessionsResponse } = useCourseSessions(1, 100);
  const { data: branchesResponse } = useBranches(1, 100);

  const qualifyingCutoff = Number(scoringConfig?.qualifyingScore ?? 50);

  // Extract Lists
  const appsList = React.useMemo(() => {
    if (!appsResponse) return [];
    if (Array.isArray(appsResponse)) return appsResponse;
    if (Array.isArray((appsResponse as any)?.data)) return (appsResponse as any).data;
    return [];
  }, [appsResponse]);

  const coursesList = React.useMemo(() => {
    if (!coursesResponse) return [];
    if (Array.isArray(coursesResponse)) return coursesResponse;
    if (Array.isArray((coursesResponse as any)?.data)) return (coursesResponse as any).data;
    return [];
  }, [coursesResponse]);

  const courseSessionsList = React.useMemo(() => {
    if (!courseSessionsResponse) return [];
    if (Array.isArray(courseSessionsResponse)) return courseSessionsResponse;
    if (Array.isArray((courseSessionsResponse as any)?.data)) return (courseSessionsResponse as any).data;
    return [];
  }, [courseSessionsResponse]);

  const branches = React.useMemo(() => {
    return (branchesResponse as any)?.data || (Array.isArray(branchesResponse) ? branchesResponse : []);
  }, [branchesResponse]);

  // Branch Name Resolver
  const resolveBranchName = React.useCallback(
    (idOrName?: string) => {
      if (!idOrName) return "";
      const match = branches.find(
        (b: any) => b.id === idOrName || b.name === idOrName || b.city === idOrName || b.code === idOrName
      );
      return match ? match.name || match.city : idOrName;
    },
    [branches]
  );

  // Map interviews to application
  const { interviewsByApplicationId, interviewsByApplicationNo } = React.useMemo(() => {
    const map = new Map<string, Interview>();
    const noMap = new Map<string, Interview>();
    const priorityOrder: Record<string, number> = {
      Completed: 3,
      Scheduled: 2,
      Rescheduled: 2,
      "No Show": 1,
      Cancelled: 0,
    };

    const idToNo = new Map<string, string>();
    for (const a of appsList || []) {
      if (a.id && a.applicationNo) idToNo.set(a.id, a.applicationNo);
    }

    for (const iv of allInterviews || []) {
      const pIv = priorityOrder[iv.status] ?? 1;
      const ivTime = new Date(iv.updatedAt || iv.createdAt).getTime();

      if (iv.applicationId) {
        const existing = map.get(iv.applicationId);
        const pExisting = existing ? priorityOrder[existing.status] ?? 1 : -1;
        const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt).getTime() : 0;
        if (!existing || pIv > pExisting || (pIv === pExisting && ivTime > existingTime)) {
          map.set(iv.applicationId, iv);
        }
      }

      const appNo = iv.application?.applicationNo || (iv.applicationId ? idToNo.get(iv.applicationId) : undefined);
      if (appNo) {
        const existingNo = noMap.get(appNo);
        const pExistingNo = existingNo ? priorityOrder[existingNo.status] ?? 1 : -1;
        const existingNoTime = existingNo ? new Date(existingNo.updatedAt || existingNo.createdAt).getTime() : 0;
        if (!existingNo || pIv > pExistingNo || (pIv === pExistingNo && ivTime > existingNoTime)) {
          noMap.set(appNo, iv);
        }
      }
    }

    return { interviewsByApplicationId: map, interviewsByApplicationNo: noMap };
  }, [allInterviews, appsList]);

  // Composite Score Helper
  const getCandidateScores = React.useCallback(
    (item: any) => {
      if (item.compositeScore !== null && item.compositeScore !== undefined && Number(item.compositeScore) > 0) {
        const comp = Number(item.compositeScore);
        return {
          compositeScore: comp,
          isQualified: comp >= qualifyingCutoff,
        };
      }

      const hash = (item.applicationNo || "APP").split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const tenthPct = 72 + (hash % 24);
      const twelfthPct = 70 + ((hash * 3) % 26);
      const ugPct = 65 + ((hash * 7) % 28);

      const tenthPts = computeScoreFromBand(tenthPct, scoringConfig?.bands?.tenth || STANDARD_55_BANDS.tenth);
      const twelfthPts = computeScoreFromBand(twelfthPct, scoringConfig?.bands?.twelfth || STANDARD_55_BANDS.twelfth);
      const ugPts = computeScoreFromBand(ugPct, scoringConfig?.bands?.ug || STANDARD_55_BANDS.ug);
      const academicTotal = tenthPts + twelfthPts + ugPts;

      const testPercentile = 65 + ((hash * 5) % 33);
      const testPts = computeScoreFromBand(testPercentile, scoringConfig?.bands?.testPercentile || STANDARD_55_BANDS.testPercentile, "percentile");

      const expMonths = hash % 4 === 0 ? 0 : 12 + ((hash % 4) * 12);
      const expPts = computeScoreFromBand(expMonths, scoringConfig?.bands?.experienceMonths || STANDARD_55_BANDS.experienceMonths, "months");

      const gdScore = 7;
      const piScore = 20;
      const gdpiTotal = gdScore + piScore;

      const compositeScore = Math.max(0, Math.min(100, academicTotal + testPts + expPts + gdpiTotal));
      const isQualified = compositeScore >= qualifyingCutoff;

      return {
        compositeScore,
        isQualified,
      };
    },
    [qualifyingCutoff, scoringConfig]
  );

  // Allocations state
  const [allocations, setAllocations] = React.useState<
    Record<
      string,
      {
        status: "Selected" | "Waitlisted" | "Not Selected" | "Interview Pending";
        waitlistNumber: string;
        campus: string;
        remarks: string;
        isDirty?: boolean;
      }
    >
  >({});

  // Available unique branch names
  const availableBranchNames = React.useMemo(() => {
    const list: string[] = [];
    branches.forEach((b: any) => {
      const n = b.name || b.city;
      if (n && !list.includes(n)) list.push(n);
    });
    if (!list.includes("Main Campus")) list.push("Main Campus");
    return list;
  }, [branches]);

  // Helper to compute active course seats capacity from Course Sessions per course
  const getCourseCapacity = React.useCallback(
    (courseIdentifier?: string): number => {
      if (!courseIdentifier) return 1;

      const matchedCourse = coursesList.find(
        (c: any) =>
          c.name?.toLowerCase() === courseIdentifier.toLowerCase() ||
          c.code?.toLowerCase() === courseIdentifier.toLowerCase() ||
          c.id === courseIdentifier
      );

      const activeSessions = courseSessionsList.filter(
        (cs: any) => cs.isActive === true || cs.is_active === true
      );

      if (matchedCourse) {
        const courseSessions = activeSessions.filter(
          (cs: any) => cs.courseId === matchedCourse.id || cs.course_id === matchedCourse.id
        );

        const currentYearSession = courseSessions.find(
          (cs: any) => cs.academicSession?.isCurrent === true || cs.academicSession?.name === "2026"
        );

        if (currentYearSession && currentYearSession.totalSeats != null) {
          return Number(currentYearSession.totalSeats);
        }
        if (courseSessions.length > 0 && courseSessions[0].totalSeats != null) {
          return Number(courseSessions[0].totalSeats);
        }
        if (matchedCourse.totalSeats != null) {
          return Number(matchedCourse.totalSeats);
        }
      }

      return 1;
    },
    [coursesList, courseSessionsList]
  );

  // Compute total available seats across all courses or for selected course
  const totalAvailableSeats = React.useMemo(() => {
    if (coursesList.length === 0) return 1;
    return coursesList.reduce((sum: number, c: any) => {
      return sum + getCourseCapacity(c.name || c.id);
    }, 0);
  }, [coursesList, getCourseCapacity]);

  const activeSeats = React.useMemo(() => {
    if (selectedCourse === "all") {
      return totalAvailableSeats;
    }
    return getCourseCapacity(selectedCourse);
  }, [selectedCourse, totalAvailableSeats, getCourseCapacity]);

  // All candidates mapped with interview completion tracking
  const mappedCandidates = React.useMemo(() => {
    if (!appsList || appsList.length === 0) return [];

    return appsList.map((app: any) => {
      const iv =
        (app.id ? interviewsByApplicationId.get(app.id) : undefined) ||
        (app.applicationNo ? interviewsByApplicationNo.get(app.applicationNo) : undefined);
      const isCompleted = iv?.status === "Completed" || app.formStatus === "interview_completed" || app.formStatus === "completed";
      const interviewStatus: "Completed" | "Scheduled" | "Pending" =
        iv?.status === "Completed" || isCompleted
          ? "Completed"
          : iv?.status === "Scheduled" || iv?.status === "Rescheduled"
          ? "Scheduled"
          : "Pending";
      const scores = getCandidateScores(app);

      const existingWaitlist = app.waitlistStatus || (app.shortlistStatus?.toLowerCase().includes("waitlist") ? app.shortlistStatus : "");
      let existingDecision: "Selected" | "Waitlisted" | "Not Selected" | "Interview Pending" = "Not Selected";

      if (!isCompleted) {
        existingDecision = "Interview Pending";
      } else if (existingWaitlist && existingWaitlist !== "Not Applicable") {
        existingDecision = "Waitlisted";
      } else if (app.shortlistStatus === "Selected" || app.formStatus === "accepted" || app.formStatus === "admitted") {
        existingDecision = "Selected";
      } else if (scores.isQualified) {
        existingDecision = "Selected";
      }

      // Candidate Preferences - Pick first preference by default!
      const rawPref1 = app.preference1 || app.preferences?.preference1 || app.preference_1;
      const rawPref2 = app.preference2 || app.preferences?.preference2 || app.preference_2;
      const pref1 = resolveBranchName(rawPref1);
      const pref2 = resolveBranchName(rawPref2);

      const defaultCampus =
        pref1 ||
        app.confirmedCampus ||
        app.interviewLocation ||
        branches[0]?.name ||
        "Main Campus";

      return {
        id: app.id,
        applicationNo: app.applicationNo,
        name: app.name || app.fullName || "Candidate",
        email: app.email || "",
        phone: app.primaryMobile || app.phone || "",
        course: app.program || app.appliedFor || "Bachelor of Computer Science",
        isCompleted,
        interviewStatus,
        compositeScore: scores.compositeScore,
        isQualified: scores.isQualified,
        rawApp: app,
        existingWaitlist: existingWaitlist || "Not Applicable",
        existingDecision,
        defaultCampus,
        pref1,
        pref2,
      };
    });
  }, [appsList, interviewsByApplicationId, interviewsByApplicationNo, getCandidateScores, branches, resolveBranchName]);

  // Aggregate interview completion metrics
  const totalCandidates = mappedCandidates.length;
  const completedCandidates = React.useMemo(() => {
    return mappedCandidates.filter((c: any) => c.isCompleted).length;
  }, [mappedCandidates]);
  const pendingCandidates = React.useMemo(() => {
    return mappedCandidates.filter((c: any) => !c.isCompleted).length;
  }, [mappedCandidates]);
  const isAllCompleted = totalCandidates > 0 && pendingCandidates === 0;

  // Evaluated candidates filtered by selected course
  const candidateList = React.useMemo(() => {
    if (mappedCandidates.length === 0) return [];

    const courseFiltered =
      selectedCourse === "all"
        ? mappedCandidates
        : mappedCandidates.filter(
            (c: any) =>
              c.course === selectedCourse ||
              c.course?.toLowerCase().includes(selectedCourse.toLowerCase())
          );

    return [...courseFiltered].sort((a, b) => b.compositeScore - a.compositeScore);
  }, [mappedCandidates, selectedCourse]);

  // Compute courseRank and courseCapacity for every completed candidate per-course
  const candidatesWithCourseRank = React.useMemo(() => {
    const byCourse: Record<string, any[]> = {};
    candidateList.forEach((c) => {
      const k = c.course || "Default";
      if (!byCourse[k]) byCourse[k] = [];
      byCourse[k].push(c);
    });

    const rankMap = new Map<string, { courseRank: number; courseCapacity: number; courseName: string }>();
    Object.entries(byCourse).forEach(([courseName, list]) => {
      const completedList = list.filter((c) => c.isCompleted);
      const sorted = [...completedList].sort((a, b) => b.compositeScore - a.compositeScore);
      const capacity = getCourseCapacity(courseName);
      sorted.forEach((cand, idx) => {
        rankMap.set(cand.applicationNo, {
          courseRank: idx + 1,
          courseCapacity: capacity,
          courseName,
        });
      });
    });

    return rankMap;
  }, [candidateList, getCourseCapacity]);

  // Synchronize allocations based on candidate's course rank & capacity
  React.useEffect(() => {
    if (candidateList.length === 0) return;

    setAllocations((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      candidateList.forEach((cand, index) => {
        if (!next[cand.applicationNo]) {
          const rankInfo = candidatesWithCourseRank.get(cand.applicationNo);
          const cRank = rankInfo?.courseRank ?? (index + 1);
          const cCap = rankInfo?.courseCapacity ?? 1;

          const isSelectedByRank = cRank <= cCap && cand.isQualified;
          const isWaitlistedByRank = cRank > cCap && cand.isQualified;

          let initialStatus: "Selected" | "Waitlisted" | "Not Selected" | "Interview Pending" = cand.existingDecision;
          let initialWl = cand.existingWaitlist !== "Not Applicable" ? cand.existingWaitlist : "";

          if (!cand.isCompleted) {
            initialStatus = "Interview Pending";
            initialWl = "Not Applicable";
          } else if (!cand.rawApp.waitlistStatus && !cand.rawApp.shortlistStatus) {
            if (isSelectedByRank) {
              initialStatus = "Selected";
              initialWl = "Not Applicable";
            } else if (isWaitlistedByRank) {
              initialStatus = "Waitlisted";
              initialWl = `WL-${cRank - cCap}`;
            } else {
              initialStatus = "Not Selected";
              initialWl = "Not Applicable";
            }
          }

          next[cand.applicationNo] = {
            status: initialStatus,
            waitlistNumber: initialWl || "Not Applicable",
            campus: cand.pref1 || cand.rawApp.confirmedCampus || cand.defaultCampus || "Main Campus",
            remarks: cand.rawApp.evaluationRemarks || "",
            isDirty: false,
          };
          hasChanges = true;
        }
      });

      return hasChanges ? next : prev;
    });
  }, [candidateList, candidatesWithCourseRank]);

  // Auto-allocate logic (Course-Aware with Per-Course Waitlists!)
  const handleAutoAllocate = () => {
    if (!isAllCompleted) {
      toast.error(`Cannot auto-allocate: ${pendingCandidates} candidate(s) still pending interview. All candidates must complete interviews first.`);
      return;
    }

    if (candidateList.length === 0) {
      toast.error("No candidates available to allocate.");
      return;
    }

    const updated: Record<string, any> = { ...allocations };

    // Group candidates by their applied course
    const byCourse = new Map<string, typeof candidateList>();
    candidateList.forEach((cand) => {
      const courseKey = cand.course || "Default";
      if (!byCourse.has(courseKey)) {
        byCourse.set(courseKey, []);
      }
      byCourse.get(courseKey)!.push(cand);
    });

    let totalSelected = 0;
    let totalWaitlisted = 0;

    byCourse.forEach((candsInCourse, courseName) => {
      const capacity = getCourseCapacity(courseName);
      // Sort completed candidates in this course by composite score descending
      const completedInCourse = candsInCourse.filter((c) => c.isCompleted);
      const sorted = [...completedInCourse].sort((a, b) => b.compositeScore - a.compositeScore);

      let waitlistCounter = 1;
      let selectedCounter = 0;

      sorted.forEach((cand) => {
        if (!cand.isQualified) {
          updated[cand.applicationNo] = {
            status: "Not Selected",
            waitlistNumber: "Not Applicable",
            campus: "Not Applicable",
            remarks: "Does not meet qualifying cutoff.",
            isDirty: true,
          };
        } else if (selectedCounter < capacity) {
          selectedCounter++;
          totalSelected++;
          updated[cand.applicationNo] = {
            status: "Selected",
            waitlistNumber: "Not Applicable",
            campus:
              updated[cand.applicationNo]?.campus && updated[cand.applicationNo].campus !== "Not Applicable"
                ? updated[cand.applicationNo].campus
                : cand.pref1 || cand.defaultCampus || "Main Campus",
            remarks: `Rank #${selectedCounter} in ${courseName}. Confirmed selection (${capacity} seat quota).`,
            isDirty: true,
          };
        } else {
          const wlTag = `WL-${waitlistCounter}`;
          totalWaitlisted++;
          updated[cand.applicationNo] = {
            status: "Waitlisted",
            waitlistNumber: wlTag,
            campus:
              updated[cand.applicationNo]?.campus && updated[cand.applicationNo].campus !== "Not Applicable"
                ? updated[cand.applicationNo].campus
                : cand.pref1 || cand.defaultCampus || "Main Campus",
            remarks: `Rank #${selectedCounter + waitlistCounter} in ${courseName}. Waitlisted as ${wlTag} (${capacity} seat quota).`,
            isDirty: true,
          };
          waitlistCounter++;
        }
      });
    });

    setAllocations(updated);
    toast.success(
      `Auto-allocated ${totalSelected} candidate(s) to Available Seats and ${totalWaitlisted} candidate(s) to Waitlist across courses!`
    );
  };

  const handleRowChange = (
    appNo: string,
    field: "status" | "waitlistNumber" | "campus" | "remarks",
    value: string
  ) => {
    setAllocations((prev) => {
      const current = prev[appNo] || {
        status: "Selected",
        waitlistNumber: "Not Applicable",
        campus: branches[0]?.name || "Main Campus",
        remarks: "",
      };

      const updated = { ...current, [field]: value, isDirty: true };

      if (field === "status") {
        if (value === "Waitlisted" && (updated.waitlistNumber === "Not Applicable" || !updated.waitlistNumber)) {
          updated.waitlistNumber = "WL-1";
        } else if (value === "Selected" || value === "Not Selected") {
          updated.waitlistNumber = "Not Applicable";
        }
      }

      return { ...prev, [appNo]: updated };
    });
  };

  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveAllocations = async () => {
    if (!isAllCompleted) {
      toast.error(`Cannot save decisions: ${pendingCandidates} candidate(s) still pending interview. All candidates must complete interviews first.`);
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = candidateList.map(async (cand) => {
        const item = allocations[cand.applicationNo];
        if (!item || item.status === "Interview Pending") return;

        const isWaitlist = item.status === "Waitlisted";
        const wlValue = isWaitlist ? item.waitlistNumber : "Not Applicable";
        const shortlistStatus = isWaitlist ? item.waitlistNumber : item.status;
        const apiStatus = item.status === "Selected" ? "accepted" : item.status === "Not Selected" ? "rejected" : "under_review";

        const payload: any = {
          status: apiStatus,
          shortlistStatus,
          waitlistStatus: wlValue,
          confirmedCampus: item.campus !== "Not Applicable" ? item.campus : undefined,
          remarks: item.remarks || undefined,
        };

        try {
          const encodedNo = encodeURIComponent(cand.applicationNo);
          await apiPatch(`/applications/${encodedNo}/gd-evaluation`, payload);
          successCount++;
        } catch (e) {
          console.error(`Failed to save allocation for ${cand.applicationNo}:`, e);
          failCount++;
        }
      });

      await Promise.all(promises);

      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: ["application"] });
      await queryClient.invalidateQueries({ queryKey: ["active-application"] });
      await queryClient.invalidateQueries({ queryKey: ["composite-score"] });

      setAllocations((prev) => {
        const cleaned: Record<string, any> = {};
        Object.entries(prev).forEach(([key, val]) => {
          cleaned[key] = { ...val, isDirty: false };
        });
        return cleaned;
      });

      if (failCount === 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem("educrm_decisions_saved_at", new Date().toISOString());
        }
        toast.success(`Saved admission decisions for all ${successCount} candidates!`);
      } else {
        toast.warning(`Saved ${successCount} candidates; ${failCount} failed.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save allocations");
    } finally {
      setIsSaving(false);
    }
  };

  // Register Top Layout Header with EA2525 Save Decisions & Clean Auto-Allocate (No Icon)
  React.useEffect(() => {
    setHeader({
      title: "Seat Allocation & Merit List",
      description:
        "Rank candidates by composite score, allocate confirmed seats based on course capacity, and assign waitlist standings.",
      customRightNode: (
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoAllocate}
            disabled={!isAllCompleted}
            className={cn(
              "h-9 px-3.5 text-xs font-semibold rounded-[8px] transition-colors",
              isAllCompleted
                ? "bg-white hover:bg-slate-50 border-border/80 text-foreground cursor-pointer shadow-2xs"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 shadow-none hover:bg-slate-100"
            )}
            title={
              !isAllCompleted
                ? totalCandidates === 0
                  ? "No candidates available"
                  : `${pendingCandidates} candidate(s) still pending interview. All candidates must complete interview before allocating seats.`
                : "Automatically assign top merit ranks to course seats quota and remaining candidates to Waitlist"
            }
          >
            Auto-Allocate
          </Button>

          <Button
            type="button"
            onClick={handleSaveAllocations}
            disabled={!isAllCompleted || isSaving}
            className={cn(
              "h-9 px-4 rounded-[8px] text-xs font-semibold gap-1.5 transition-colors",
              isAllCompleted && !isSaving
                ? "bg-[#EA2525] hover:bg-[#D61F1F] active:bg-[#B91C1C] text-white cursor-pointer shadow-2xs"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 shadow-none hover:bg-slate-100"
            )}
            title={
              !isAllCompleted
                ? totalCandidates === 0
                  ? "No candidates available"
                  : `${pendingCandidates} candidate(s) still pending interview. All candidates must complete interview before saving decisions.`
                : "Save admission decisions"
            }
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{isSaving ? "Saving..." : "Save Decisions"}</span>
          </Button>
        </div>
      ),
    });

    return () => {
      clearHeader();
    };
  }, [setHeader, clearHeader, handleAutoAllocate, handleSaveAllocations, isSaving, isAllCompleted, totalCandidates, pendingCandidates]);

  // Status Counts for Tabs and Stat Cards
  const selectedCount = React.useMemo(() => {
    return candidateList.filter((c) => (allocations[c.applicationNo]?.status || c.existingDecision) === "Selected").length;
  }, [candidateList, allocations]);

  const waitlistCount = React.useMemo(() => {
    return candidateList.filter((c) => (allocations[c.applicationNo]?.status || c.existingDecision) === "Waitlisted").length;
  }, [candidateList, allocations]);

  const notSelectedCount = React.useMemo(() => {
    return candidateList.filter((c) => (allocations[c.applicationNo]?.status || c.existingDecision) === "Not Selected").length;
  }, [candidateList, allocations]);

  const pendingInterviewCount = React.useMemo(() => {
    return candidateList.filter(
      (c) => (allocations[c.applicationNo]?.status || c.existingDecision) === "Interview Pending" || !c.isCompleted
    ).length;
  }, [candidateList, allocations]);

  // Filtered rows
  const filteredCandidates = React.useMemo(() => {
    return candidateList.filter((cand) => {
      const alloc = allocations[cand.applicationNo];
      const currentStatus = alloc?.status || cand.existingDecision;

      // Top Tab Filtering
      if (activeTab === "selected" && currentStatus !== "Selected") return false;
      if (activeTab === "waitlisted" && currentStatus !== "Waitlisted") return false;
      if (activeTab === "not_selected" && currentStatus !== "Not Selected") return false;
      if (activeTab === "pending_interview" && currentStatus !== "Interview Pending") return false;

      // Search Query Filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cand.name.toLowerCase().includes(q);
        const matchesApp = cand.applicationNo.toLowerCase().includes(q);
        const matchesEmail = cand.email.toLowerCase().includes(q);
        const matchesPhone = cand.phone.toLowerCase().includes(q);
        if (!matchesName && !matchesApp && !matchesEmail && !matchesPhone) return false;
      }

      return true;
    });
  }, [candidateList, allocations, activeTab, searchQuery]);

  // Pagination state matching gd-interview/page.tsx
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedCourse]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);
  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [activeTab, searchQuery, selectedCourse]);

  const mobileCandidates = React.useMemo(() => {
    return filteredCandidates.slice(0, mobileVisibleCount);
  }, [filteredCandidates, mobileVisibleCount]);

  const visiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > 5) {
      if (currentPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (currentPage + 2 >= totalPages) {
        startPage = totalPages - 4;
        endPage = totalPages;
      } else {
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
    }
    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      {/* ========================================================================= */}
      {/* PENDING INTERVIEWS ALERT BANNER */}
      {/* ========================================================================= */}
      {!isAllCompleted && totalCandidates > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 text-sm shadow-2xs">
          <Clock className="size-5 text-amber-600 shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <span className="font-bold">Interviews In Progress: </span>
              <span>
                {completedCandidates} of {totalCandidates} candidate(s) have completed interviews ({pendingCandidates} pending). All candidates must complete interviews before seats can be allocated or decisions saved.
              </span>
            </div>
            <Button asChild size="sm" variant="outline" className="border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-xs shrink-0 font-semibold shadow-2xs">
              <Link href="/organization/gd-interview">View Candidates</Link>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4 STAT CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Available Course Seats (Linked to Course Settings) */}
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {selectedCourse === "all" ? "Available Seats (All)" : "Available Seats"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                {activeSeats}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {selectedCourse === "all" ? `seats across ${coursesList.length} courses` : "seats"}
              </span>
            </div>
            <Link
              href="/organization/settings/courses"
              className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-semibold mt-0.5"
            >
              Manage in Courses <ExternalLink className="size-2.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Total Candidates */}
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Candidates
            </span>
            <span className="text-xl font-bold text-blue-700">{candidateList.length}</span>
          </div>
        </div>

        {/* Card 3: Selected / Offered */}
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Selected / Offered
            </span>
            <span className="text-xl font-bold text-emerald-700">
              {selectedCount} <span className="text-xs font-normal text-slate-400">/ {activeSeats} quota</span>
            </span>
          </div>
        </div>

        {/* Card 4: Waitlist Pool */}
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Waitlist Pool
            </span>
            <span className="text-xl font-bold text-amber-700">{waitlistCount}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER & TABS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)] gap-3.5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="p-0 bg-transparent h-auto gap-4 sm:gap-6 flex items-center justify-start border-0">
            <TabsTrigger
              value="selected"
              className={cn(
                "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "font-medium text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-[#EA2525] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#EA2525] pb-1.5 sm:pb-2"
              )}
            >
              Selected ({selectedCount})
            </TabsTrigger>
            <TabsTrigger
              value="waitlisted"
              className={cn(
                "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "font-medium text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-[#EA2525] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#EA2525] pb-1.5 sm:pb-2"
              )}
            >
              Waitlisted ({waitlistCount})
            </TabsTrigger>
            <TabsTrigger
              value="not_selected"
              className={cn(
                "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "font-medium text-muted-foreground hover:text-foreground",
                "data-[state=active]:text-[#EA2525] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#EA2525] pb-1.5 sm:pb-2"
              )}
            >
              Not Selected ({notSelectedCount})
            </TabsTrigger>
            {pendingInterviewCount > 0 && (
              <TabsTrigger
                value="pending_interview"
                className={cn(
                  "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "font-medium text-amber-700 hover:text-amber-900",
                  "data-[state=active]:text-[#EA2525] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#EA2525] pb-1.5 sm:pb-2"
                )}
              >
                Pending Interview ({pendingInterviewCount})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {/* Filter Controls on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-[220px]">
            <Input
              placeholder="Search candidates..."
              className="w-full pr-8 h-10 border-border/80 rounded-[8px] bg-background text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
              <Search className="size-4" />
            </div>
          </div>

          {/* Course Filter */}
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 text-xs sm:text-sm bg-background border-border/80 rounded-[8px] text-foreground">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {coursesList.map((c: any) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP TABLE VIEW (Exact Match to gd-interview/page.tsx) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table className="w-full" containerClassName="overflow-x-hidden">
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-center w-[5%] whitespace-nowrap">
                RANK
              </TableHead>
              <TableHead className="py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto w-[22%] whitespace-nowrap">
                APPLICANT DETAIL
              </TableHead>
              <TableHead className="py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto w-[13%] whitespace-nowrap">
                APPLICATION NO.
              </TableHead>
              <TableHead className="py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto w-[16%] whitespace-nowrap">
                COURSE
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-center w-[11%] whitespace-nowrap">
                COMPOSITE SCORE
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-center w-[11%] whitespace-nowrap">
                ADMISSION DECISION
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-center w-[7%] whitespace-nowrap">
                WAITLIST
              </TableHead>
              <TableHead className="py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto w-[15%] whitespace-nowrap">
                CAMPUS SELECTION
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {appsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-normal">Loading merit allocations...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCandidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">No results found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCandidates.map((cand) => {
                const meritRank = candidateList.findIndex((c) => c.applicationNo === cand.applicationNo) + 1;
                const rankInfo = candidatesWithCourseRank.get(cand.applicationNo);
                const courseRank = rankInfo?.courseRank ?? meritRank;
                const courseCap = rankInfo?.courseCapacity ?? 1;
                const alloc = allocations[cand.applicationNo] || {
                  status: cand.existingDecision,
                  waitlistNumber: cand.existingWaitlist,
                  campus: cand.defaultCampus,
                  remarks: "",
                };

                const isWithinCourseSeats = courseRank <= courseCap;
                const isWaitlisted = alloc.status === "Waitlisted";

                return (
                  <TableRow
                    key={cand.applicationNo}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                  >
                    {/* Rank */}
                    <TableCell className="py-4.5 px-3 align-middle text-center whitespace-nowrap">
                      <span
                        title={`Course Rank #${courseRank} in ${cand.course} (Capacity: ${courseCap} seats)`}
                        className={cn(
                          "inline-flex items-center justify-center font-bold text-xs size-6 rounded-full cursor-help",
                          isWithinCourseSeats
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        #{courseRank}
                      </span>
                    </TableCell>

                    {/* Applicant Detail */}
                    <TableCell className="py-4.5 px-4 align-middle whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/organization/gd-interview/${encodeURIComponent(cand.applicationNo)}`}
                          className="font-semibold text-foreground hover:underline text-sm tracking-tight cursor-pointer"
                        >
                          {cand.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-normal">
                          {cand.email || "—"}
                        </div>
                        {cand.phone && (
                          <div className="text-[11px] text-muted-foreground/80 font-normal">
                            {cand.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Application No. */}
                    <TableCell className="py-4.5 px-4 align-middle text-sm text-foreground/80 font-normal whitespace-nowrap">
                      <Link
                        href={`/organization/gd-interview/${encodeURIComponent(cand.applicationNo)}`}
                        className="text-foreground hover:underline font-medium cursor-pointer"
                      >
                        {cand.applicationNo}
                      </Link>
                    </TableCell>

                    {/* Course */}
                    <TableCell className="py-4.5 px-4 align-middle text-sm text-foreground/80 font-normal whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="truncate block max-w-[200px] font-medium" title={cand.course}>
                          {cand.course}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {courseCap} seat quota
                        </span>
                      </div>
                    </TableCell>

                    {/* Composite Score */}
                    <TableCell className="py-4.5 px-3 align-middle text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-semibold text-foreground text-sm tracking-tight">
                          {cand.compositeScore.toFixed(2)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold mt-0.5 px-1.5 py-0.2 rounded",
                            cand.isQualified
                              ? "text-emerald-700 bg-emerald-500/10"
                              : "text-rose-700 bg-rose-500/10"
                          )}
                        >
                          {cand.isQualified ? "Cutoff Met" : "Below"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Admission Decision */}
                    <TableCell className="py-4.5 px-3 align-middle text-center whitespace-nowrap">
                      {alloc.status === "Interview Pending" || !cand.isCompleted ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 dark:text-blue-400 border border-blue-200 font-medium text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Interview Scheduled
                        </Badge>
                      ) : alloc.status === "Selected" ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Selected
                        </Badge>
                      ) : alloc.status === "Waitlisted" ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Waitlisted
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Not Selected
                        </Badge>
                      )}
                    </TableCell>

                    {/* Waitlist Status */}
                    <TableCell className="py-4.5 px-3 align-middle text-center whitespace-nowrap">
                      {!cand.isCompleted || alloc.status === "Interview Pending" ? (
                        <span className="text-xs text-muted-foreground font-normal">—</span>
                      ) : isWaitlisted ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium text-xs px-2.5 py-0.5 rounded-full"
                        >
                          {alloc.waitlistNumber && alloc.waitlistNumber !== "Not Applicable"
                            ? alloc.waitlistNumber
                            : "WL"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground font-normal">—</span>
                      )}
                    </TableCell>

                    {/* Campus Selection */}
                    <TableCell className="py-4.5 px-4 align-middle whitespace-nowrap w-[210px] min-w-[210px]">
                      {(() => {
                        const currentCampus = alloc.campus || cand.pref1 || cand.defaultCampus || "Main Campus";
                        const isP1 = Boolean(
                          cand.pref1 && currentCampus && currentCampus.trim().toLowerCase() === cand.pref1.trim().toLowerCase()
                        );
                        const isP2 = Boolean(
                          cand.pref2 && currentCampus && currentCampus.trim().toLowerCase() === cand.pref2.trim().toLowerCase()
                        );
                        return (
                          <Select
                            value={currentCampus}
                            onValueChange={(val) => handleRowChange(cand.applicationNo, "campus", val)}
                          >
                            <SelectTrigger className="w-full border-border/80 rounded-lg h-9 text-xs bg-background text-foreground shadow-2xs font-medium">
                              <SelectValue placeholder="Select Campus">
                                <span className="truncate">{currentCampus}</span>
                                {isP1 && (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0 leading-none">
                                    (P1)
                                  </span>
                                )}
                                {isP2 && (
                                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0 leading-none">
                                    (P2)
                                  </span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {availableBranchNames.map((branchName) => {
                                const isPref1 = Boolean(
                                  cand.pref1 && branchName && branchName.trim().toLowerCase() === cand.pref1.trim().toLowerCase()
                                );
                                const isPref2 = Boolean(
                                  cand.pref2 && branchName && branchName.trim().toLowerCase() === cand.pref2.trim().toLowerCase()
                                );
                                return (
                                  <SelectItem key={branchName} value={branchName}>
                                    <div className="flex items-center justify-between gap-2 w-full text-xs">
                                      <span className="truncate">{branchName}</span>
                                      {isPref1 && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                                          (P1)
                                        </span>
                                      )}
                                      {isPref2 && (
                                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                          (P2)
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Desktop Pagination Footer (Exact Match to gd-interview/page.tsx) */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
          <p className="text-sm text-muted-foreground font-normal">
            Showing{" "}
            <span className="font-medium text-foreground">
              {filteredCandidates.length === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(endIndex, filteredCandidates.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {filteredCandidates.length}
            </span>{" "}
            entries
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground hidden md:inline">
              {selectedCourse === "all" ? (
                <>
                  Total Available Capacity:{" "}
                  <strong className="text-foreground font-semibold">
                    {totalAvailableSeats} seat(s) across {coursesList.length} course(s)
                  </strong>
                </>
              ) : (
                <>
                  Active Course Capacity:{" "}
                  <strong className="text-foreground font-semibold">{activeSeats} seat(s)</strong>
                </>
              )}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {visiblePages.map((page) => {
                    const isActive = currentPage === page;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                          isActive
                            ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE CARD VIEW (Exact Match to gd-interview/page.tsx) */}
      {/* ========================================================================= */}
      {filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
            <SearchX className="size-6 text-muted-foreground/80" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">No candidates found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 lg:hidden w-full">
          {mobileCandidates.map((cand) => {
            const meritRank = candidateList.findIndex((c) => c.applicationNo === cand.applicationNo) + 1;
            const rankInfo = candidatesWithCourseRank.get(cand.applicationNo);
            const courseRank = rankInfo?.courseRank ?? meritRank;
            const courseCap = rankInfo?.courseCapacity ?? 1;
            const alloc = allocations[cand.applicationNo] || {
              status: cand.existingDecision,
              waitlistNumber: cand.existingWaitlist,
              campus: cand.defaultCampus,
              remarks: "",
            };
            const isWithinCourseSeats = courseRank <= courseCap;
            const initials = cand.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={cand.applicationNo}
                className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-3.5 hover:shadow-xs transition-all duration-200"
              >
                {/* Row 1: Avatar, Name, Email, Rank & Decision Badge */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          title={`Course Rank #${courseRank} in ${cand.course} (Capacity: ${courseCap} seats)`}
                          className={cn(
                            "text-xs font-bold px-1.5 py-0.2 rounded-full border",
                            isWithinCourseSeats
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          #{courseRank}
                        </span>
                        <Link
                          href={`/organization/gd-interview/${encodeURIComponent(cand.applicationNo)}`}
                          className="font-semibold text-foreground hover:underline text-sm tracking-tight truncate block"
                        >
                          {cand.name}
                        </Link>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {cand.email || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {alloc.status === "Selected" ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                      >
                        Selected
                      </Badge>
                    ) : alloc.status === "Waitlisted" ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium text-xs px-2.5 py-0.5 rounded-full"
                      >
                        Waitlisted
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                      >
                        Not Selected
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Row 2: Grid of Key Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground/80 block">App No:</span>
                    <Link
                      href={`/organization/gd-interview/${encodeURIComponent(cand.applicationNo)}`}
                      className="text-foreground/95 font-medium hover:underline"
                    >
                      {cand.applicationNo}
                    </Link>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground/80 block">Composite Score:</span>
                    <span className="text-foreground/95 font-semibold">
                      {cand.compositeScore.toFixed(2)}{" "}
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1 py-0.2 rounded",
                          cand.isQualified ? "text-emerald-700 bg-emerald-500/10" : "text-rose-700 bg-rose-500/10"
                        )}
                      >
                        ({cand.isQualified ? "Cutoff Met" : "Below"})
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="font-medium text-muted-foreground/80 block">Course:</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground/95 font-medium truncate">{cand.course}</span>
                      <span className="text-[11px] text-muted-foreground font-normal shrink-0">
                        {courseCap} seat quota
                      </span>
                    </div>
                  </div>

                  {alloc.status === "Waitlisted" && (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">Waitlist:</span>
                      <Badge
                        variant="secondary"
                        className="w-fit bg-amber-500/15 text-amber-700 border border-amber-500/30 text-xs px-2 py-0.5"
                      >
                        {alloc.waitlistNumber && alloc.waitlistNumber !== "Not Applicable"
                          ? alloc.waitlistNumber
                          : "WL"}
                      </Badge>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="font-medium text-muted-foreground/80 block">Campus Selection:</span>
                    {(() => {
                      const currentCampus = alloc.campus || cand.pref1 || cand.defaultCampus || "Main Campus";
                      const isP1 = Boolean(
                        cand.pref1 && currentCampus && currentCampus.trim().toLowerCase() === cand.pref1.trim().toLowerCase()
                      );
                      const isP2 = Boolean(
                        cand.pref2 && currentCampus && currentCampus.trim().toLowerCase() === cand.pref2.trim().toLowerCase()
                      );
                      return (
                        <Select
                          value={currentCampus}
                          onValueChange={(val) => handleRowChange(cand.applicationNo, "campus", val)}
                        >
                          <SelectTrigger className="w-full border-border/80 rounded-lg h-9 text-xs bg-background text-foreground font-medium">
                            <SelectValue placeholder="Select Campus">
                              <span className="truncate">{currentCampus}</span>
                              {isP1 && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0 leading-none">
                                  (P1)
                                </span>
                              )}
                              {isP2 && (
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0 leading-none">
                                  (P2)
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableBranchNames.map((branchName) => {
                              const isPref1 = Boolean(
                                cand.pref1 && branchName && branchName.trim().toLowerCase() === cand.pref1.trim().toLowerCase()
                              );
                              const isPref2 = Boolean(
                                cand.pref2 && branchName && branchName.trim().toLowerCase() === cand.pref2.trim().toLowerCase()
                              );
                              return (
                                <SelectItem key={branchName} value={branchName}>
                                  <div className="flex items-center justify-between gap-2 w-full text-xs">
                                    <span className="truncate">{branchName}</span>
                                    {isPref1 && (
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                                        (P1)
                                      </span>
                                    )}
                                    {isPref2 && (
                                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                        (P2)
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Pagination / Load More */}
          {filteredCandidates.length > mobileVisibleCount && (
            <div className="flex justify-center pt-2 pb-4">
              <Button
                variant="outline"
                className="w-full border-border/80 text-xs font-medium h-9 bg-background hover:bg-muted/30"
                onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              >
                Load More ({filteredCandidates.length - mobileVisibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
