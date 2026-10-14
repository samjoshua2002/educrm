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
import { useActiveGdScoringScheme } from "@/hooks/use-scoring";
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
  testPercentile: [
    { minPercentile: 95, points: 10 },
    { minPercentile: 90, points: 8 },
    { minPercentile: 80, points: 6 },
    { minPercentile: 70, points: 4 },
    { minPercentile: 60, points: 2 },
  ],
  // Split entrance scoring (CAT vs other exams) starts from the same bands.
  catPercentile: [
    { minPercentile: 95, points: 10 },
    { minPercentile: 90, points: 8 },
    { minPercentile: 80, points: 6 },
    { minPercentile: 70, points: 4 },
    { minPercentile: 60, points: 2 },
  ],
  otherTestPercentile: [
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
};

type BandSection = "tenth" | "twelfth" | "ug" | "testPercentile" | "catPercentile" | "otherTestPercentile" | "experienceMonths";

const EMPTY_BANDS: ScoreConversionConfig["bands"] = {
  tenth: [],
  twelfth: [],
  ug: [],
  testPercentile: [],
  catPercentile: [],
  otherTestPercentile: [],
  experienceMonths: [],
};

type ActiveModal =
  | "tenth"
  | "twelfth"
  | "ug"
  | "testPercentile"
  | "catPercentile"
  | "otherTestPercentile"
  | "experienceMonths"
  | "eligibility"
  | "entranceMode"
  | null;

export default function ScoringBandsSettingsPage() {
  usePageHeader({
    title: "Scoring Bands & Settings",
    description: "Configure score conversion bands and eligibility rules for composite scoring.",
  });

  const { data: config, isLoading } = useScoreConversionConfig();
  const updateConfig = useUpdateScoreConversionConfig();

  const [activeTab, setActiveTab] = React.useState<"academics" | "test-experience" | "eligibility">("academics");
  const [bands, setBands] = React.useState<ScoreConversionConfig["bands"]>(EMPTY_BANDS);
  const [discrepancyThreshold, setDiscrepancyThreshold] = React.useState("10");
  const [qualifyingScore, setQualifyingScore] = React.useState("50");
  const [initialized, setInitialized] = React.useState(false);
  // Entrance scoring (owner request): best percentile across all tests
  // (default, original behaviour) or CAT and other exams scored separately.
  const [entranceMode, setEntranceMode] = React.useState<"best_overall" | "cat_split">("best_overall");
  const [catWeight, setCatWeight] = React.useState("100");
  const [otherTestWeight, setOtherTestWeight] = React.useState("100");
  const [tempEntranceMode, setTempEntranceMode] = React.useState<"best_overall" | "cat_split">("best_overall");
  const [tempCatWeight, setTempCatWeight] = React.useState("100");
  const [tempOtherWeight, setTempOtherWeight] = React.useState("100");
  const { data: activeScheme } = useActiveGdScoringScheme();

  // Modal edit state
  const [activeModal, setActiveModal] = React.useState<ActiveModal>(null);
  const [tempRows, setTempRows] = React.useState<ScoreBand[]>([]);
  const [tempThreshold, setTempThreshold] = React.useState("");
  const [tempQualifyingScore, setTempQualifyingScore] = React.useState("");

  React.useEffect(() => {
    if (config && !initialized) {
      setBands({
        tenth: config.bands?.tenth ?? [],
        twelfth: config.bands?.twelfth ?? [],
        ug: config.bands?.ug ?? [],
        testPercentile: config.bands?.testPercentile ?? [],
        catPercentile: config.bands?.catPercentile ?? config.bands?.testPercentile ?? [],
        otherTestPercentile: config.bands?.otherTestPercentile ?? config.bands?.testPercentile ?? [],
        experienceMonths: config.bands?.experienceMonths ?? [],
      });
      setEntranceMode(config.entranceScoringMode === "cat_split" ? "cat_split" : "best_overall");
      setCatWeight(String(config.catWeight ?? 100));
      setOtherTestWeight(String(config.otherTestWeight ?? 100));
      setDiscrepancyThreshold(String(config.discrepancyThreshold ?? 10));
      setQualifyingScore(String(config.qualifyingScore ?? 50));
      setInitialized(true);
    }
  }, [config, initialized]);

  // Points calculation
  const maxTenth = Math.max(0, ...(bands.tenth || []).map((b) => Number(b.points) || 0));
  const maxTwelfth = Math.max(0, ...(bands.twelfth || []).map((b) => Number(b.points) || 0));
  const maxUg = Math.max(0, ...(bands.ug || []).map((b) => Number(b.points) || 0));
  const maxOf = (rows?: ScoreBand[]) => Math.max(0, ...(rows || []).map((b) => Number(b.points) || 0));
  const maxCat = maxOf(bands.catPercentile);
  const maxOther = maxOf(bands.otherTestPercentile);
  const maxTest =
    entranceMode === "cat_split"
      ? Number(((maxCat * (Number(catWeight) || 0)) / 100 + (maxOther * (Number(otherTestWeight) || 0)) / 100).toFixed(2))
      : maxOf(bands.testPercentile);
  const maxExp = Math.max(0, ...(bands.experienceMonths || []).map((b) => Number(b.points) || 0));

  const totalBandsMax = maxTenth + maxTwelfth + maxUg + maxTest + maxExp;
  // GD & PI maximum comes from the selected scoring scheme (Settings > GD
  // Scoring); the predefined Standard template is GD 10 + PI 30.
  const GDPI_MAX = (activeScheme?.components ?? [])
    .filter((c) => c.includeInComposite)
    .reduce((sum, c) => sum + Number(c.compositeWeight || 0), 0);
  const FIXED_OTHER = 5;
  const grandTotal = Number((totalBandsMax + GDPI_MAX + FIXED_OTHER).toFixed(2));

  // Open modal handlers
  const openBandModal = (section: BandSection) => {
    setTempRows(JSON.parse(JSON.stringify(bands[section] || [])));
    setActiveModal(section);
  };

  const openEligibilityModal = () => {
    setTempThreshold(discrepancyThreshold);
    setTempQualifyingScore(qualifyingScore);
    setActiveModal("eligibility");
  };

  const openEntranceModeModal = () => {
    setTempEntranceMode(entranceMode);
    setTempCatWeight(catWeight);
    setTempOtherWeight(otherTestWeight);
    setActiveModal("entranceMode");
  };

  // Save modal handler
  const handleSaveModal = () => {
    if (!activeModal) return;

    if (activeModal === "entranceMode") {
      const cw = Number(tempCatWeight);
      const ow = Number(tempOtherWeight);
      if (Number.isNaN(cw) || cw < 0 || Number.isNaN(ow) || ow < 0) {
        toast.error("Weights must be 0 or more");
        return;
      }
      updateConfig.mutate(
        { entranceScoringMode: tempEntranceMode, catWeight: cw, otherTestWeight: ow },
        {
          onSuccess: () => {
            setEntranceMode(tempEntranceMode);
            setCatWeight(String(cw));
            setOtherTestWeight(String(ow));
            setActiveModal(null);
          },
        }
      );
      return;
    }

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
    toast.success("Applied standard 55-point scoring preset");
  };

  const getSectionTitle = (modal: ActiveModal) => {
    switch (modal) {
      case "tenth":
        return "10th Percentage Bands";
      case "twelfth":
        return "12th Percentage Bands";
      case "ug":
        return "UG Percentage Bands";
      case "testPercentile":
        return "Entrance Test Percentile Bands";
      case "catPercentile":
        return "CAT Percentile Bands";
      case "otherTestPercentile":
        return "Other Exams Percentile Bands (XAT, MAT, CMAT, GMAT, GRE...)";
      case "entranceMode":
        return "Entrance Test Scoring";
      case "experienceMonths":
        return "Work Experience Bands";
      case "eligibility":
        return "Admission Cutoff & Eligibility";
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
      case "testPercentile":
      case "catPercentile":
      case "otherTestPercentile":
        return "Min Percentile";
      case "experienceMonths":
        return "Min Months";
      default:
        return "Min Value";
    }
  };

  const getThresholdKey = (modal: ActiveModal): "minPercent" | "minPercentile" | "minMonths" => {
    if (modal === "testPercentile" || modal === "catPercentile" || modal === "otherTestPercentile") return "minPercentile";
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
                GD &amp; PI (SCHEME)
              </span>
              <p className="text-[15px] sm:text-[16px] font-bold leading-[22px] text-[#1E293B] font-sans">
                {activeScheme ? GDPI_MAX : "—"}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#64748B] font-sans">
                OTHER (FIXED)
              </span>
              <p className="text-[15px] sm:text-[16px] font-bold leading-[22px] text-[#1E293B] font-sans">
                +5
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#64748B] font-sans">
                TOTAL COMPOSITE
              </span>
              <p className="text-[15px] sm:text-[16px] font-extrabold leading-[22px] text-[#1A237E] font-sans">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Entrance scoring mode (owner request: CAT scored separately) */}
              <div className="md:col-span-2 flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
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
                    Entrance Test Scoring
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={openEntranceModeModal}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold tracking-[1px] uppercase text-[#64748B]">Mode</span>
                    <span className="font-semibold text-[#1E293B]">
                      {entranceMode === "cat_split" ? "CAT and other exams scored separately" : "Best percentile across all tests (default)"}
                    </span>
                  </div>
                  {entranceMode === "cat_split" ? (
                    <>
                      <div>
                        <span className="block text-[10px] font-bold tracking-[1px] uppercase text-[#64748B]">CAT weight</span>
                        <span className="font-semibold text-[#1A237E]">{catWeight}% of CAT band points (max {Number(((maxCat * (Number(catWeight) || 0)) / 100).toFixed(2))} pts)</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold tracking-[1px] uppercase text-[#64748B]">Other exams weight</span>
                        <span className="font-semibold text-[#1A237E]">{otherTestWeight}% of other-exam band points (max {Number(((maxOther * (Number(otherTestWeight) || 0)) / 100).toFixed(2))} pts)</span>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 text-[#475569]">
                      The single best percentile among all entrance tests (CAT, XAT, MAT, CMAT, GMAT, GRE...) is converted with the bands below.
                    </div>
                  )}
                </div>
              </div>

              {entranceMode === "cat_split" && (
                <>
                  <BandListCard
                    title="CAT Percentile"
                    rows={bands.catPercentile || []}
                    onEdit={() => openBandModal("catPercentile")}
                    maxLabel={`${maxCat} pts x ${catWeight}%`}
                  />
                  <BandListCard
                    title="Other Exams Percentile (best non-CAT)"
                    rows={bands.otherTestPercentile || []}
                    onEdit={() => openBandModal("otherTestPercentile")}
                    maxLabel={`${maxOther} pts x ${otherTestWeight}%`}
                  />
                </>
              )}

              {/* Entrance Test Card */}
              <div className={cn("flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden", entranceMode === "cat_split" && "hidden")}>
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
                    Entrance Test Percentile
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
                    onClick={() => openBandModal("testPercentile")}
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
                    {(bands.testPercentile || []).map((row, idx) => (
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
                    <span className="font-bold text-[#1A237E]">{maxTest} pts</span>
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

              {activeModal === "entranceMode" ? (
                <div className="flex flex-col gap-5 pt-5 pb-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#475569]">Scoring mode</Label>
                    {([
                      {
                        value: "best_overall",
                        title: "Best percentile across all tests (default)",
                        help: "Original behaviour: the single best percentile among all entrance tests is converted with the Entrance Test bands.",
                      },
                      {
                        value: "cat_split",
                        title: "CAT scored separately from other exams",
                        help: "CAT uses its own bands and weight; the best percentile among the other exams (XAT, MAT, CMAT, GMAT, GRE, ...) uses its own bands and weight. Both add to the composite.",
                      },
                    ] as const).map((opt) => (
                      <label
                        key={opt.value}
                        className={cn(
                          "flex gap-3 rounded-[8px] border p-3 cursor-pointer",
                          tempEntranceMode === opt.value ? "border-[#1A237E] bg-[#1A237E]/5" : "border-[#D4D4D4]"
                        )}
                      >
                        <input
                          type="radio"
                          name="entranceMode"
                          className="mt-1"
                          checked={tempEntranceMode === opt.value}
                          onChange={() => setTempEntranceMode(opt.value)}
                        />
                        <span>
                          <span className="block text-sm font-semibold text-[#1E293B]">{opt.title}</span>
                          <span className="block text-xs text-[#64748B] mt-0.5">{opt.help}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {tempEntranceMode === "cat_split" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="catWeight" className="text-sm font-medium text-[#475569]">CAT weight (%)</Label>
                        <Input
                          id="catWeight"
                          type="number"
                          min={0}
                          value={tempCatWeight}
                          onChange={(e) => setTempCatWeight(e.target.value)}
                          className="h-10 border-[#D4D4D4] rounded-[8px]"
                        />
                        <p className="text-xs text-[#64748B]">CAT component = CAT band points x this %.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="otherWeight" className="text-sm font-medium text-[#475569]">Other exams weight (%)</Label>
                        <Input
                          id="otherWeight"
                          type="number"
                          min={0}
                          value={tempOtherWeight}
                          onChange={(e) => setTempOtherWeight(e.target.value)}
                          className="h-10 border-[#D4D4D4] rounded-[8px]"
                        />
                        <p className="text-xs text-[#64748B]">Other-exams component = band points x this %.</p>
                      </div>
                    </div>
                  )}

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
              ) : activeModal === "eligibility" ? (
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

// Read-only list of percentile bands with an edit button (used for the CAT
// and other-exams bands when entrance scoring is split).
function BandListCard({
  title,
  rows,
  onEdit,
  maxLabel,
}: {
  title: string;
  rows: ScoreBand[];
  onEdit: () => void;
  maxLabel: string;
}) {
  return (
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
          {title}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer shrink-0 rounded-full"
          onClick={onEdit}
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
          {rows.length === 0 && <p className="text-xs text-[#64748B]">No bands yet.</p>}
          {rows.map((row, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-[#F8FAFC]">
              <span className="text-slate-600 font-medium">&ge; {row.minPercentile}</span>
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
          <span className="font-bold text-[#1A237E]">{maxLabel}</span>
        </div>
      </div>
    </div>
  );
}
