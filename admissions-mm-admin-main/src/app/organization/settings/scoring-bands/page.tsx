"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageHeader } from "@/hooks/use-page-header";
import { cn } from "@/lib/utils";
import {
  useScoreConversionConfig,
  useUpdateScoreConversionConfig,
  type ScoreBand,
  type ScoreConversionConfig,
} from "@/hooks/use-shortlisting";

// ============================================================================
// STANDARD 55-POINT PRESET
// ============================================================================

const STANDARD_55_BANDS: ScoreConversionConfig["bands"] = {
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
  testPercentileCatXat: [
    { minPercentile: 90, points: 10 },
    { minPercentile: 80, points: 8 },
    { minPercentile: 70, points: 6 },
    { minPercentile: 60, points: 4 },
    { minPercentile: 50, points: 2 },
  ],
  testPercentileOther: [
    { minPercentile: 95, points: 10 },
    { minPercentile: 90, points: 8 },
    { minPercentile: 80, points: 6 },
    { minPercentile: 70, points: 4 },
    { minPercentile: 60, points: 2 },
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
    { minMonths: 0, points: 0 },
  ],
  evaluationLimits: {
    maxGd: 10,
    maxPi: 30,
    maxAchievement: 5,
    maxPenalty: 5,
  },
};

const DEFAULT_EVALUATION_LIMITS = {
  maxGd: 10,
  maxPi: 30,
  maxAchievement: 5,
  maxPenalty: 5,
};

const EMPTY_BANDS: ScoreConversionConfig["bands"] = {
  tenth: [],
  twelfth: [],
  ug: [],
  testPercentileCatXat: [],
  testPercentileOther: [],
  testPercentile: [],
  experienceMonths: [],
  evaluationLimits: { ...DEFAULT_EVALUATION_LIMITS },
};

type ActiveModal =
  | "tenth"
  | "twelfth"
  | "ug"
  | "testPercentileCatXat"
  | "testPercentileOther"
  | "testPercentile"
  | "experienceMonths"
  | "eligibility"
  | "gdpiLimits"
  | "otherLimits"
  | null;

export default function ScoringBandsSettingsPage() {
  usePageHeader({
    title: "Scoring Bands & Settings",
    description: "Configure score conversion bands and eligibility rules for composite scoring.",
  });

  const { data: config, isLoading } = useScoreConversionConfig();
  const updateConfig = useUpdateScoreConversionConfig();

  const [activeTab, setActiveTab] = React.useState<"academics" | "test-experience" | "evaluation-scoring" | "eligibility">("academics");
  const [bands, setBands] = React.useState<ScoreConversionConfig["bands"]>(EMPTY_BANDS);
  const [discrepancyThreshold, setDiscrepancyThreshold] = React.useState("10");
  const [qualifyingScore, setQualifyingScore] = React.useState("50");
  const [initialized, setInitialized] = React.useState(false);

  // Modal edit state
  const [activeModal, setActiveModal] = React.useState<ActiveModal>(null);
  const [tempRows, setTempRows] = React.useState<ScoreBand[]>([]);
  const [tempThreshold, setTempThreshold] = React.useState("");
  const [tempQualifyingScore, setTempQualifyingScore] = React.useState("");
  const [tempMaxGd, setTempMaxGd] = React.useState("");
  const [tempMaxPi, setTempMaxPi] = React.useState("");
  const [tempMaxAchievement, setTempMaxAchievement] = React.useState("");
  const [tempMaxPenalty, setTempMaxPenalty] = React.useState("");

  React.useEffect(() => {
    if (config && !initialized) {
      setBands({
        tenth: config.bands?.tenth ?? [],
        twelfth: config.bands?.twelfth ?? [],
        ug: config.bands?.ug ?? [],
        testPercentileCatXat: config.bands?.testPercentileCatXat ?? [
          { minPercentile: 90, points: 10 },
          { minPercentile: 80, points: 8 },
          { minPercentile: 70, points: 6 },
          { minPercentile: 60, points: 4 },
          { minPercentile: 50, points: 2 },
        ],
        testPercentileOther: config.bands?.testPercentileOther ?? (config.bands?.testPercentile ?? [
          { minPercentile: 95, points: 10 },
          { minPercentile: 90, points: 8 },
          { minPercentile: 80, points: 6 },
          { minPercentile: 70, points: 4 },
          { minPercentile: 60, points: 2 },
        ]),
        testPercentile: config.bands?.testPercentile ?? [],
        experienceMonths: config.bands?.experienceMonths ?? [],
        evaluationLimits: config.bands?.evaluationLimits ?? { ...DEFAULT_EVALUATION_LIMITS },
      });
      setDiscrepancyThreshold(String(config.discrepancyThreshold ?? 10));
      setQualifyingScore(String(config.qualifyingScore ?? 50));
      setInitialized(true);
    }
  }, [config, initialized]);

  // Points calculation
  const maxTenth = Math.max(0, ...(bands.tenth || []).map((b) => Number(b.points) || 0));
  const maxTwelfth = Math.max(0, ...(bands.twelfth || []).map((b) => Number(b.points) || 0));
  const maxUg = Math.max(0, ...(bands.ug || []).map((b) => Number(b.points) || 0));
  const maxTestCatXat = Math.max(0, ...(bands.testPercentileCatXat || []).map((b) => Number(b.points) || 0));
  const maxTestOther = Math.max(0, ...(bands.testPercentileOther || []).map((b) => Number(b.points) || 0));
  const maxTest = Math.max(maxTestCatXat, maxTestOther, Math.max(0, ...(bands.testPercentile || []).map((b) => Number(b.points) || 0)));
  const maxExp = Math.max(0, ...(bands.experienceMonths || []).map((b) => Number(b.points) || 0));

  const totalBandsMax = maxTenth + maxTwelfth + maxUg + maxTest + maxExp;
  const evaluationLimits = bands.evaluationLimits ?? DEFAULT_EVALUATION_LIMITS;
  const maxGd = Number(evaluationLimits.maxGd) || 0;
  const maxPi = Number(evaluationLimits.maxPi) || 0;
  const maxGdpi = maxGd + maxPi;
  const maxAchievement = Number(evaluationLimits.maxAchievement) || 0;
  const grandTotal = totalBandsMax + maxGdpi + maxAchievement;

  // Open modal handlers
  const openBandModal = (section: "tenth" | "twelfth" | "ug" | "testPercentileCatXat" | "testPercentileOther" | "testPercentile" | "experienceMonths") => {
    setTempRows(JSON.parse(JSON.stringify(bands[section] || [])));
    setActiveModal(section);
  };

  const openEligibilityModal = () => {
    setTempThreshold(discrepancyThreshold);
    setTempQualifyingScore(qualifyingScore);
    setActiveModal("eligibility");
  };

  const openGdpiModal = () => {
    const limits = bands.evaluationLimits ?? DEFAULT_EVALUATION_LIMITS;
    setTempMaxGd(String(limits.maxGd ?? 10));
    setTempMaxPi(String(limits.maxPi ?? 30));
    setActiveModal("gdpiLimits");
  };

  const openOtherModal = () => {
    const limits = bands.evaluationLimits ?? DEFAULT_EVALUATION_LIMITS;
    setTempMaxAchievement(String(limits.maxAchievement ?? 5));
    setTempMaxPenalty(String(limits.maxPenalty ?? 5));
    setActiveModal("otherLimits");
  };

  // Save modal handler
  const handleSaveModal = () => {
    if (!activeModal) return;

    if (activeModal === "eligibility") {
      const qScore = Number(tempQualifyingScore);
      const disc = Number(tempThreshold);
      if (Number.isNaN(qScore) || qScore < 0 || qScore > 100) {
        toast.error("Please enter a valid qualifying score between 0 and 100");
        return;
      }
      if (Number.isNaN(disc) || disc < 0) {
        toast.error("Please enter a valid discrepancy threshold");
        return;
      }

      setQualifyingScore(tempQualifyingScore);
      setDiscrepancyThreshold(tempThreshold);
      updateConfig.mutate(
        {
          bands,
          qualifyingScore: qScore,
          discrepancyThreshold: disc,
        },
        {
          onSuccess: () => {
            setActiveModal(null);
          },
        }
      );
      return;
    }

    if (activeModal === "gdpiLimits") {
      const g = Number(tempMaxGd);
      const p = Number(tempMaxPi);
      if (Number.isNaN(g) || g < 0 || Number.isNaN(p) || p < 0) {
        toast.error("Please enter valid positive numbers for GD and PI limits");
        return;
      }
      const updatedBands = {
        ...bands,
        evaluationLimits: {
          ...(bands.evaluationLimits ?? DEFAULT_EVALUATION_LIMITS),
          maxGd: g,
          maxPi: p,
        },
      };
      setBands(updatedBands);
      updateConfig.mutate(
        {
          bands: updatedBands,
          qualifyingScore: Number(qualifyingScore),
          discrepancyThreshold: Number(discrepancyThreshold),
        },
        {
          onSuccess: () => {
            setActiveModal(null);
            toast.success("GD & PI limits updated");
          },
        }
      );
      return;
    }

    if (activeModal === "otherLimits") {
      const ach = Number(tempMaxAchievement);
      const pen = Number(tempMaxPenalty);
      if (Number.isNaN(ach) || ach < 0 || Number.isNaN(pen) || pen < 0) {
        toast.error("Please enter valid positive numbers for Achievement and Penalty limits");
        return;
      }
      const updatedBands = {
        ...bands,
        evaluationLimits: {
          ...(bands.evaluationLimits ?? DEFAULT_EVALUATION_LIMITS),
          maxAchievement: ach,
          maxPenalty: pen,
        },
      };
      setBands(updatedBands);
      updateConfig.mutate(
        {
          bands: updatedBands,
          qualifyingScore: Number(qualifyingScore),
          discrepancyThreshold: Number(discrepancyThreshold),
        },
        {
          onSuccess: () => {
            setActiveModal(null);
            toast.success("Other component limits updated");
          },
        }
      );
      return;
    }

    const updatedBands = {
      ...bands,
      [activeModal]: tempRows,
    };

    setBands(updatedBands);
    updateConfig.mutate(
      {
        bands: updatedBands,
        qualifyingScore: Number(qualifyingScore),
        discrepancyThreshold: Number(discrepancyThreshold),
      },
      {
        onSuccess: () => {
          setActiveModal(null);
        },
      }
    );
  };

  const handleApplyPreset = () => {
    setBands(STANDARD_55_BANDS);
    updateConfig.mutate({
      bands: STANDARD_55_BANDS,
      qualifyingScore: Number(qualifyingScore),
      discrepancyThreshold: Number(discrepancyThreshold),
    });
    toast.success("Applied standard 55-point scoring preset (40 GD&PI, 5 Other)");
  };

  const getSectionTitle = (modal: ActiveModal) => {
    switch (modal) {
      case "tenth":
        return "10th Percentage Bands";
      case "twelfth":
        return "12th Percentage Bands";
      case "ug":
        return "UG Percentage Bands";
      case "testPercentileCatXat":
        return "Entrance Test — CAT & XAT Percentile Bands";
      case "testPercentileOther":
        return "Remaining Entrance Tests Bands (MAT, CMAT, ATMA, etc.)";
      case "testPercentile":
        return "Entrance Test Percentile Bands";
      case "experienceMonths":
        return "Work Experience Bands";
      case "eligibility":
        return "Admission Cutoff & Eligibility";
      case "gdpiLimits":
        return "GD & PI Maximum Score Limits";
      case "otherLimits":
        return "Other Components Limits (Achievement & Penalty)";
      default:
        return "Edit Section";
    }
  };

  const getThresholdLabel = (modal: ActiveModal) => {
    switch (modal) {
      case "tenth":
      case "twelfth":
      case "ug":
        return "Min Percentage (%)";
      case "testPercentileCatXat":
      case "testPercentileOther":
      case "testPercentile":
        return "Min Percentile";
      case "experienceMonths":
        return "Min Months";
      default:
        return "Min Value";
    }
  };

  const getThresholdKey = (modal: ActiveModal): "minPercent" | "minPercentile" | "minMonths" => {
    if (modal === "testPercentileCatXat" || modal === "testPercentileOther" || modal === "testPercentile") return "minPercentile";
    if (modal === "experienceMonths") return "minMonths";
    return "minPercent";
  };

  return (
    <div className="flex flex-col gap-5 p-3.5 sm:p-5 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#1A237E]" /> Loading scoring configuration...
        </div>
      ) : (
        <>
          {/* Top Header & Preset Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-bold text-[#1E293B] font-sans">
                Score Conversion Bands
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[#475569] font-sans mt-0.5">
                Configure points awarded for academic marks, entrance exams, experience, and the qualifying cutoff.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyPreset}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-[8px] border-[#D4D4D4] text-[#1A237E] hover:bg-slate-50 font-semibold text-xs cursor-pointer w-full sm:w-auto"
              >
                Standard 55-pt Preset
              </Button>
            </div>
          </div>

          {/* Stats Ribbon (Mobile responsive grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 p-4 rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs">
            <div className="space-y-0.5">
              <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#64748B] font-sans">
                PROFILE POINTS
              </span>
              <p className="text-[15px] sm:text-[16px] font-bold leading-[22px] text-[#1E293B] font-sans">
                {totalBandsMax} <span className="text-xs font-normal text-[#64748B]">/ 55</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#64748B] font-sans">
                GD &amp; PI
              </span>
              <p className="text-[15px] sm:text-[16px] font-bold leading-[22px] text-[#1E293B] font-sans">
                {maxGdpi} <span className="text-xs font-normal text-[#64748B]">({maxGd} + {maxPi})</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#64748B] font-sans">
                OTHER
              </span>
              <p className="text-[15px] sm:text-[16px] font-bold leading-[22px] text-[#1E293B] font-sans">
                +{maxAchievement} <span className="text-xs font-normal text-[#64748B]">(-{evaluationLimits.maxPenalty ?? 5})</span>
              </p>
            </div>
            <div className={cn(
              "space-y-0.5 rounded-[6px] px-2.5 py-1 -my-1 transition-all border",
              grandTotal === 100
                ? "bg-emerald-50/70 border-emerald-200"
                : grandTotal > 100
                  ? "bg-rose-50 border-rose-300"
                  : "bg-amber-50 border-amber-300"
            )}>
              <div className="flex items-center justify-between">
                <span className={cn(
                  "block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase font-sans",
                  grandTotal === 100 ? "text-emerald-700" : grandTotal > 100 ? "text-rose-700" : "text-amber-700"
                )}>
                  TOTAL COMPOSITE
                </span>
                {grandTotal !== 100 && (
                  <span className={cn(
                    "text-[9px] font-bold px-1 py-0.2 rounded uppercase",
                    grandTotal > 100 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                  )}>
                    {grandTotal > 100 ? `+${grandTotal - 100} over` : `${grandTotal - 100} under`}
                  </span>
                )}
              </div>
              <p className={cn(
                "text-[15px] sm:text-[16px] font-extrabold leading-[22px] font-sans",
                grandTotal === 100 ? "text-emerald-700" : grandTotal > 100 ? "text-rose-600" : "text-amber-600"
              )}>
                {grandTotal} <span className="text-xs font-normal text-[#64748B]">/ 100</span>
              </p>
            </div>
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#64748B] font-sans">
                QUALIFYING CUTOFF
              </span>
              <p className="text-[15px] sm:text-[16px] font-bold leading-[22px] text-[#10B981] font-sans">
                {qualifyingScore} <span className="text-xs font-normal text-[#64748B]">/ 100</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Mobile scrollable with dark blue active color) */}
          <div className="border-b border-[#E2E8F0] flex gap-4 sm:gap-8 overflow-x-auto w-full pt-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("academics")}
              className={cn(
                "pb-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer border-b-[3px] whitespace-nowrap font-sans shrink-0",
                activeTab === "academics"
                  ? "border-[#1A237E] text-[#1A237E] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Academic Scores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("test-experience")}
              className={cn(
                "pb-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer border-b-[3px] whitespace-nowrap font-sans shrink-0",
                activeTab === "test-experience"
                  ? "border-[#1A237E] text-[#1A237E] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Entrance &amp; Work Experience
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("eligibility")}
              className={cn(
                "pb-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer border-b-[3px] whitespace-nowrap font-sans shrink-0",
                activeTab === "eligibility"
                  ? "border-[#1A237E] text-[#1A237E] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Cutoff &amp; Eligibility
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("evaluation-scoring")}
              className={cn(
                "pb-3 text-xs sm:text-sm font-medium transition-colors cursor-pointer border-b-[3px] whitespace-nowrap font-sans shrink-0",
                activeTab === "evaluation-scoring"
                  ? "border-[#1A237E] text-[#1A237E] font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              Evaluation &amp; Scoring
            </button>
          </div>

          {/* TAB 1: ACADEMIC SCORES */}
          {activeTab === "academics" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* 10th Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    10th Percentage
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("tenth")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Min Percentage</span>
                      <span className="text-right">Points</span>
                    </div>
                    {(bands.tenth || []).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                        <span className="text-slate-600 font-medium">≥ {row.minPercent}%</span>
                        <div
                          className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                          style={{ fontFamily: "Inter" }}
                        >
                          {row.points}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Maximum Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxTenth} pts</span>
                  </div>
                </div>
              </div>

              {/* 12th Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    12th Percentage
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("twelfth")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Min Percentage</span>
                      <span className="text-right">Points</span>
                    </div>
                    {(bands.twelfth || []).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                        <span className="text-slate-600 font-medium">≥ {row.minPercent}%</span>
                        <div
                          className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                          style={{ fontFamily: "Inter" }}
                        >
                          {row.points}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Maximum Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxTwelfth} pts</span>
                  </div>
                </div>
              </div>

              {/* UG Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden col-span-1 md:col-span-2 xl:col-span-1">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    UG Graduation Percentage
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("ug")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Min Percentage</span>
                      <span className="text-right">Points</span>
                    </div>
                    {(bands.ug || []).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                        <span className="text-slate-600 font-medium">≥ {row.minPercent}%</span>
                        <div
                          className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                          style={{ fontFamily: "Inter" }}
                        >
                          {row.points}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Maximum Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxUg} pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENTRANCE & EXPERIENCE */}
          {activeTab === "test-experience" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* Entrance Test Division 1: CAT & XAT */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                      Entrance Test (CAT &amp; XAT)
                    </div>
                    <span className="text-[11px] font-medium text-[#4338CA]">High Rigor Exam Bands</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("testPercentileCatXat")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Min Percentile</span>
                      <span className="text-right">Points</span>
                    </div>
                    {(bands.testPercentileCatXat || []).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                        <span className="text-slate-600 font-medium">≥ {row.minPercentile}</span>
                        <div
                          className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                          style={{ fontFamily: "Inter" }}
                        >
                          {row.points}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Maximum Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxTestCatXat} pts</span>
                  </div>
                </div>
              </div>

              {/* Entrance Test Division 2: Remaining Tests */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                      Remaining Tests (MAT, CMAT, etc.)
                    </div>
                    <span className="text-[11px] font-medium text-[#047857]">Standard Rigor Exam Bands</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("testPercentileOther")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Min Percentile</span>
                      <span className="text-right">Points</span>
                    </div>
                    {(bands.testPercentileOther || []).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                        <span className="text-slate-600 font-medium">≥ {row.minPercentile}</span>
                        <div
                          className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                          style={{ fontFamily: "Inter" }}
                        >
                          {row.points}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Maximum Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxTestOther} pts</span>
                  </div>
                </div>
              </div>

              {/* Work Experience Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    Work Experience Duration
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("experienceMonths")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Min Months</span>
                      <span className="text-right">Points</span>
                    </div>
                    {(bands.experienceMonths || []).map((row, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                        <span className="text-slate-600 font-medium">≥ {row.minMonths} Months</span>
                        <div
                          className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                          style={{ fontFamily: "Inter" }}
                        >
                          {row.points}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Maximum Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxExp} pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUTOFF & ELIGIBILITY */}
          {activeTab === "eligibility" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Qualifying Cutoff Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    Minimum Qualifying Score
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={openEligibilityModal}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                    <span className="text-sm text-slate-600 font-sans">Qualifying Cutoff</span>
                    <div
                      className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#10B981] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                      style={{ fontFamily: "Inter" }}
                    >
                      {qualifyingScore}
                    </div>
                  </div>
                  <div className="text-xs text-[#475569] leading-relaxed space-y-1">
                    <p className="font-semibold text-[#1E293B]">Evaluation Rule:</p>
                    <p>• Composite score ≥ {qualifyingScore}: Candidate is Qualified for admission.</p>
                    <p>• Composite score &lt; {qualifyingScore}: Candidate is Not Qualified.</p>
                  </div>
                </div>
              </div>

              {/* Experience Discrepancy Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    Discrepancy Threshold
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={openEligibilityModal}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
                    <span className="text-sm text-slate-600 font-sans">Threshold Allowed</span>
                    <div
                      className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                      style={{ fontFamily: "Inter" }}
                    >
                      {discrepancyThreshold}%
                    </div>
                  </div>
                  <div className="text-xs text-[#475569] leading-relaxed space-y-1">
                    <p className="font-semibold text-[#1E293B]">Review Flag Rule:</p>
                    <p>
                      If the gap between self-reported experience and verified documents exceeds {discrepancyThreshold}%, an automatic discrepancy flag is raised.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EVALUATION & SCORING */}
          {activeTab === "evaluation-scoring" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* GD & PI Score Limits Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    GD &amp; PI Score Limits
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={openGdpiModal}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Component</span>
                      <span className="text-right">Max Points</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                      <span className="text-slate-600 font-medium">Group Discussion (GD)</span>
                      <div
                        className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                        style={{ fontFamily: "Inter" }}
                      >
                        {maxGd}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                      <span className="text-slate-600 font-medium">Personal Interview (PI)</span>
                      <div
                        className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-slate-50 text-[#1A237E] font-bold text-[14px] rounded-[8px] border border-[#E2E8F0]"
                        style={{ fontFamily: "Inter" }}
                      >
                        {maxPi}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Total GD &amp; PI Weightage:</span>
                    <span className="font-bold text-[#1A237E]">{maxGdpi} pts</span>
                  </div>
                </div>
              </div>

              {/* Other Components (Achievement & Penalty) Limits Card */}
              <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                  }}
                >
                  <div className="flex items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                    Other Components Limits
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={openOtherModal}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                      <span>Adjustment Axis</span>
                      <span className="text-right">Max Limit</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                      <span className="text-slate-600 font-medium">Achievement (Bonus)</span>
                      <div
                        className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold text-[14px] rounded-[8px] border border-emerald-200"
                        style={{ fontFamily: "Inter" }}
                      >
                        +{maxAchievement}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
                      <span className="text-slate-600 font-medium">Penalty (Deduction)</span>
                      <div
                        className="w-[64px] sm:w-[72px] h-[32px] flex items-center justify-center bg-rose-50 text-rose-700 font-bold text-[14px] rounded-[8px] border border-rose-200"
                        style={{ fontFamily: "Inter" }}
                      >
                        -{evaluationLimits.maxPenalty ?? 5}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 mt-2 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#475569]">
                    <span>Score Adjustment Range:</span>
                    <span className="font-bold text-[#1A237E]">-{evaluationLimits.maxPenalty ?? 5} to +{maxAchievement} pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDIT DIALOG MODAL (matching CITY/2026/1003 popup) */}
          <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
            <DialogContent className="max-w-[600px] w-[95%] sm:w-full rounded-[12px] p-5 sm:p-7 md:p-8 gap-0 bg-white max-h-[92vh] overflow-y-auto">
              <DialogHeader className="flex flex-row items-center gap-2 pb-4 border-b border-[#E5E5E5] space-y-0">
                <div className="flex items-center justify-center h-[36px] w-[36px] rounded-full bg-[#FAFAFA] shrink-0">
                  <Pencil className="h-4 w-4 text-[#1A237E]" />
                </div>
                <DialogTitle className="text-[#0A0A0A] font-semibold text-[17px] sm:text-[20px] leading-7 font-sans">
                  {getSectionTitle(activeModal)}
                </DialogTitle>
              </DialogHeader>

              {activeModal === "eligibility" ? (
                <div className="flex flex-col gap-5 pt-5 pb-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="modalQualifyingScore"
                      className="text-sm font-medium text-[#475569]"
                    >
                      Qualifying Cutoff Score (out of 100)
                    </Label>
                    <Input
                      id="modalQualifyingScore"
                      type="number"
                      min={0}
                      max={100}
                      value={tempQualifyingScore}
                      onChange={(e) => setTempQualifyingScore(e.target.value)}
                      className="h-10 border-[#D4D4D4] rounded-[8px]"
                    />
                    <p className="text-xs text-[#64748B]">
                      Candidates scoring &ge; this score will be deemed Qualified for admission.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="modalThreshold"
                      className="text-sm font-medium text-[#475569]"
                    >
                      Experience Discrepancy Threshold (%)
                    </Label>
                    <Input
                      id="modalThreshold"
                      type="number"
                      min={0}
                      value={tempThreshold}
                      onChange={(e) => setTempThreshold(e.target.value)}
                      className="h-10 border-[#D4D4D4] rounded-[8px]"
                    />
                    <p className="text-xs text-[#64748B]">
                      Maximum percentage variance allowed before flagging discrepancy.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModal(null)}
                      className="h-10 px-5 rounded-[8px] border-[#D4D4D4] text-[#475569] hover:bg-slate-50 font-medium text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveModal}
                      disabled={updateConfig.isPending}
                      className="h-10 px-6 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer"
                    >
                      {updateConfig.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : activeModal === "gdpiLimits" ? (
                <div className="flex flex-col gap-5 pt-5 pb-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="modalMaxGd" className="text-sm font-medium text-[#475569]">
                      Group Discussion (GD) Maximum Score
                    </Label>
                    <Input
                      id="modalMaxGd"
                      type="number"
                      min={0}
                      value={tempMaxGd}
                      onChange={(e) => setTempMaxGd(e.target.value)}
                      className="h-10 border-[#D4D4D4] rounded-[8px]"
                      placeholder="10"
                    />
                    <p className="text-xs text-[#64748B]">
                      Maximum points awarded for Group Discussion evaluation (Standard preset: 10).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modalMaxPi" className="text-sm font-medium text-[#475569]">
                      Personal Interview (PI) Maximum Score
                    </Label>
                    <Input
                      id="modalMaxPi"
                      type="number"
                      min={0}
                      value={tempMaxPi}
                      onChange={(e) => setTempMaxPi(e.target.value)}
                      className="h-10 border-[#D4D4D4] rounded-[8px]"
                      placeholder="30"
                    />
                    <p className="text-xs text-[#64748B]">
                      Maximum points awarded for Personal Interview evaluation (Standard preset: 30).
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 border border-[#E2E8F0] rounded-[8px] text-xs">
                    <span className="font-semibold text-slate-700">Total GD &amp; PI Weightage:</span>
                    <span className="font-bold text-[#1A237E] text-sm">
                      {(Number(tempMaxGd) || 0) + (Number(tempMaxPi) || 0)} pts
                    </span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModal(null)}
                      className="h-10 px-5 rounded-[8px] border-[#D4D4D4] text-[#475569] hover:bg-slate-50 font-medium text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveModal}
                      disabled={updateConfig.isPending}
                      className="h-10 px-6 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer"
                    >
                      {updateConfig.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : activeModal === "otherLimits" ? (
                <div className="flex flex-col gap-5 pt-5 pb-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="modalMaxAchievement" className="text-sm font-medium text-[#475569]">
                      Achievement Maximum Bonus Points
                    </Label>
                    <Input
                      id="modalMaxAchievement"
                      type="number"
                      min={0}
                      value={tempMaxAchievement}
                      onChange={(e) => setTempMaxAchievement(e.target.value)}
                      className="h-10 border-[#D4D4D4] rounded-[8px]"
                      placeholder="5"
                    />
                    <p className="text-xs text-[#64748B]">
                      Maximum positive score awarded for candidate achievements (Standard preset: 5).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="modalMaxPenalty" className="text-sm font-medium text-[#475569]">
                      Penalty Maximum Deduction Points
                    </Label>
                    <Input
                      id="modalMaxPenalty"
                      type="number"
                      min={0}
                      value={tempMaxPenalty}
                      onChange={(e) => setTempMaxPenalty(e.target.value)}
                      className="h-10 border-[#D4D4D4] rounded-[8px]"
                      placeholder="5"
                    />
                    <p className="text-xs text-[#64748B]">
                      Maximum negative points that can be deducted (e.g. 5 enables penalty from 0 to -5; Standard preset: 5).
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 border border-[#E2E8F0] rounded-[8px] text-xs">
                    <span className="font-semibold text-slate-700">Other Components Range:</span>
                    <span className="font-bold text-[#1A237E] text-sm">
                      -{Number(tempMaxPenalty) || 0} to +{Number(tempMaxAchievement) || 0} pts
                    </span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModal(null)}
                      className="h-10 px-5 rounded-[8px] border-[#D4D4D4] text-[#475569] hover:bg-slate-50 font-medium text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveModal}
                      disabled={updateConfig.isPending}
                      className="h-10 px-6 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer"
                    >
                      {updateConfig.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pt-5 pb-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-[#64748B] font-medium">
                      Configure threshold values and points awarded.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const key = getThresholdKey(activeModal);
                        setTempRows([...tempRows, { [key]: 0, points: 0 } as ScoreBand]);
                      }}
                      className="h-8 px-3 rounded-[8px] border-[#D4D4D4] text-xs font-semibold text-[#1A237E] gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Row
                    </Button>
                  </div>

                  <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                    <div className="grid grid-cols-12 bg-[#F8FAFC] py-2.5 px-3 sm:px-4 text-xs font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                      <div className="col-span-6">{getThresholdLabel(activeModal)}</div>
                      <div className="col-span-4">Points</div>
                      <div className="col-span-2 text-right">Action</div>
                    </div>

                    <div className="divide-y divide-[#F1F5F9] max-h-[300px] overflow-y-auto">
                      {tempRows.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No bands configured. Click &ldquo;Add Row&rdquo; to add a band.
                        </div>
                      ) : (
                        tempRows.map((row, idx) => {
                          const key = getThresholdKey(activeModal);
                          return (
                            <div key={idx} className="grid grid-cols-12 items-center p-2.5 sm:p-3 px-3 sm:px-4 gap-2">
                              <div className="col-span-6">
                                <Input
                                  type="number"
                                  value={row[key] ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    const next = [...tempRows];
                                    next[idx] = { ...next[idx], [key]: val };
                                    setTempRows(next);
                                  }}
                                  className="h-9 border-[#D4D4D4] rounded-[8px] text-xs"
                                  placeholder="0"
                                />
                              </div>
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  value={row.points ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    const next = [...tempRows];
                                    next[idx] = { ...next[idx], points: val };
                                    setTempRows(next);
                                  }}
                                  className="h-9 border-[#D4D4D4] rounded-[8px] text-xs font-semibold"
                                  placeholder="0"
                                />
                              </div>
                              <div className="col-span-2 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setTempRows(tempRows.filter((_, i) => i !== idx))}
                                  className="h-8 w-8 text-slate-400 hover:text-red-500 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveModal(null)}
                      className="h-10 px-5 rounded-[8px] border-[#D4D4D4] text-[#475569] hover:bg-slate-50 font-medium text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveModal}
                      disabled={updateConfig.isPending}
                      className="h-10 px-6 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer"
                    >
                      {updateConfig.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
