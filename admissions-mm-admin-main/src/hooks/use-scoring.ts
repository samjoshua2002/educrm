import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ============================================================================
// TYPES — mirror ScoringService's CompositeScoreBreakdown
// (admissions-tenant-api-main/src/modules/interviews/scoring.service.ts)
// ============================================================================

export interface InterviewScoreBreakdown {
  interviewId: string;
  interviewType: "GD" | "PI";
  round: number;
  status: "Slot Available" | "Scheduled" | "Rescheduled" | "Completed" | "No Show" | "Cancelled";
  score: number | null;
  evaluatorCount: number;
}

// One component of the selected GD/PI scoring scheme for this candidate.
export interface GdComponentBreakdown {
  key: string;
  label: string;
  interviewType: "GD" | "PI" | null;
  maxMarks: number;
  compositeWeight: number;
  includeInComposite: boolean;
  // null = not scored yet
  rawScore: number | null;
  contribution: number | null;
  source: "evaluations" | "manual" | "legacy" | null;
  parameters: Array<{ key: string; name: string; maxMarks: number; score: number | null }>;
  remarks: string | null;
}

export interface CompositeScoreBreakdown {
  applicationId: string;
  applicationNo: string;
  interviews: InterviewScoreBreakdown[];
  // Selected GD/PI scoring scheme and its per-component marks
  scheme: { id: string; name: string; isPredefined: boolean };
  gdComponents: GdComponentBreakdown[];
  maxGdpiTotal: number;
  gdScore: number | null;
  piScore: number | null;
  gdpiTotal: number;
  // Academic component scores (band-derived from org's scoring-bands config)
  tenthScore: number;
  twelfthScore: number;
  ugScore: number;
  academicComponent: number;
  maxAcademicScore: number;
  // Entrance test score. 'best_overall' = single best percentile across all
  // tests; 'cat_split' = CAT and best non-CAT exam scored separately.
  entranceScoringMode: "best_overall" | "cat_split";
  testComponent: number;
  maxTestScore: number;
  bestTestPercentile: number | null;
  bestTestName: string | null;
  catComponent: number | null;
  maxCatScore: number | null;
  catPercentile: number | null;
  otherTestComponent: number | null;
  maxOtherTestScore: number | null;
  otherTestPercentile: number | null;
  otherTestName: string | null;
  // Experience score (auto-calculated from from/to dates, band-derived)
  experienceComponent: number;
  maxExperienceScore: number;
  claimedExperienceMonths: string | null;
  validatedExperienceMonths: string | null;
  // Auto-calculated from work experience from/to dates
  autoCalculatedMonths: number | null;
  discrepancyFlag: boolean;
  achievementScore: number;
  penaltyScore: number;
  otherComponentsTotal: number;
  compositeScore: number;
  qualifyingScore?: number;
  isQualified?: boolean;
}

export interface ScoreAdjustmentInput {
  achievementScore?: number;
  penaltyScore?: number;
  remarks?: string;
}

// ============================================================================
// HOOKS
// ============================================================================

export function useCompositeScore(applicationNo?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["composite-score", orgId, applicationNo],
    queryFn: () =>
      apiGet<CompositeScoreBreakdown>(
        `/organizations/${orgId}/composite-score?applicationNo=${encodeURIComponent(applicationNo!)}`,
      ),
    enabled: !!orgId && !!applicationNo,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useScoreAdjustment(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: ScoreAdjustmentInput) =>
      apiPatch<CompositeScoreBreakdown>(
        `/organizations/${orgId}/score-adjustment?applicationNo=${encodeURIComponent(applicationNo!)}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composite-score", orgId, applicationNo] });
      toast.success("Score adjustment saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save score adjustment"),
  });
}

// ============================================================================
// GD / PI SCORING SCHEMES (owner request: customizable GD scoring)
// ============================================================================

export const STANDARD_SCHEME_ID = "standard";

export interface GdSchemeParameter {
  key: string;
  name: string;
  maxMarks: number;
}

export interface GdSchemeComponent {
  key: string;
  label: string;
  // Which interview's panel evaluations feed this component; null = marks
  // are entered manually on the candidate's GD & Interview page.
  interviewType: "GD" | "PI" | null;
  maxMarks: number;
  // Points added to the composite at full marks:
  // contribution = raw / maxMarks x compositeWeight
  compositeWeight: number;
  includeInComposite: boolean;
  parameters: GdSchemeParameter[];
}

export interface GdScoringScheme {
  id: string;
  name: string;
  description: string | null;
  isPredefined: boolean;
  isSelected?: boolean;
  components: GdSchemeComponent[];
}

export interface GdScoringSchemeList {
  selectedSchemeId: string;
  schemes: GdScoringScheme[];
}

export interface SaveGdSchemeInput {
  name: string;
  description?: string;
  components: Array<
    Omit<GdSchemeComponent, "key" | "parameters"> & {
      key?: string;
      parameters?: Array<{ key?: string; name: string; maxMarks: number }>;
    }
  >;
  select?: boolean;
}

export interface SaveComponentScoresInput {
  components: Array<{
    componentKey: string;
    rawScore?: number | null;
    parameterScores?: Record<string, number>;
    remarks?: string;
  }>;
}

export function useGdScoringSchemes() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["gd-scoring-schemes", orgId],
    queryFn: () => apiGet<GdScoringSchemeList>(`/organizations/${orgId}/gd-scoring-schemes`),
    enabled: !!orgId,
  });
}

export function useActiveGdScoringScheme() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["gd-scoring-schemes", orgId, "active"],
    queryFn: () => apiGet<GdScoringScheme>(`/organizations/${orgId}/gd-scoring-schemes/active`),
    enabled: !!orgId,
  });
}

function useInvalidateSchemes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["gd-scoring-schemes"] });
    queryClient.invalidateQueries({ queryKey: ["composite-score"] });
    queryClient.invalidateQueries({ queryKey: ["scoring-context"] });
  };
}

export function useCreateGdScoringScheme() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidateSchemes();
  return useMutation({
    mutationFn: (data: SaveGdSchemeInput) => apiPost<GdScoringScheme>(`/organizations/${orgId}/gd-scoring-schemes`, data),
    onSuccess: () => {
      invalidate();
      toast.success("Scoring scheme created");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create scoring scheme"),
  });
}

export function useUpdateGdScoringScheme() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidateSchemes();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SaveGdSchemeInput }) =>
      apiPatch<GdScoringScheme>(`/organizations/${orgId}/gd-scoring-schemes/${id}`, data),
    onSuccess: () => {
      invalidate();
      toast.success("Scoring scheme updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update scoring scheme"),
  });
}

export function useSelectGdScoringScheme() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidateSchemes();
  return useMutation({
    mutationFn: (id: string) => apiPost<GdScoringSchemeList>(`/organizations/${orgId}/gd-scoring-schemes/${id}/select`),
    onSuccess: () => {
      invalidate();
      toast.success("Scoring scheme selected");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to select scoring scheme"),
  });
}

export function useDeleteGdScoringScheme() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const invalidate = useInvalidateSchemes();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/gd-scoring-schemes/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Scoring scheme deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete scoring scheme"),
  });
}

// Saves the GD/PI marks entered on the candidate page for the selected scheme
// and returns the recalculated composite score.
export function useSaveComponentScores(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: SaveComponentScoresInput) =>
      apiPatch<CompositeScoreBreakdown>(
        `/organizations/${orgId}/component-scores?applicationNo=${encodeURIComponent(applicationNo!)}`,
        data,
      ),
    onSuccess: (result) => {
      if (result) queryClient.setQueryData(["composite-score", orgId, applicationNo], result);
      queryClient.invalidateQueries({ queryKey: ["composite-score", orgId, applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Scores saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save scores"),
  });
}
