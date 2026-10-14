import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PaginatedResponse } from "@/types/api";

// ============================================================================
// TYPES
// ============================================================================

export interface EvaluationRubric {
  id: string;
  // Rubric_ID (Auto Number)
  rubricNumber?: number;
  organizationId: string;
  interviewType: "GD" | "PI";
  parameterName: string;
  maxScore: number;
  weightagePercent?: number | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRubricInput {
  interviewType: "GD" | "PI";
  parameterName: string;
  maxScore: number;
  weightagePercent?: number;
  description?: string;
  isActive?: boolean;
}

export interface ShortlistingRule {
  id: string;
  // Rule_ID (Auto Number)
  ruleNumber?: number;
  createdBy?: string | null;
  creator?: { id: string; name: string; email?: string } | null;
  organizationId: string;
  program: string;
  academicYear: string;
  minGpa?: number | null;
  minTestScore?: number | null;
  minExperienceYears?: number | null;
  academicWeightage: number;
  testWeightage: number;
  experienceWeightage: number;
  cutoffScore: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortlistingRuleInput {
  program: string;
  academicYear: string;
  minGpa?: number;
  minTestScore?: number;
  minExperienceYears?: number;
  academicWeightage: number;
  testWeightage: number;
  experienceWeightage: number;
  cutoffScore: number;
  status?: "active" | "inactive";
}

export interface ShortlistPreviewRow {
  applicationId: string;
  applicationNo: string;
  name: string;
  academicComponent: number;
  testComponent: number;
  experienceComponent: number;
  // Filled only when entrance scoring is split (CAT vs other exams)
  catComponent?: number | null;
  otherTestComponent?: number | null;
  shortlistScore: number;
  shortlistStatus: "Eligible" | "Not Eligible";
  failedCriteria?: string[];
}

// ============================================================================
// RUBRICS
// ============================================================================

export function useRubrics(interviewType?: "GD" | "PI") {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["evaluation-rubrics", orgId, interviewType],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<EvaluationRubric>>(`/organizations/${orgId}/evaluation-rubrics`, {
        interviewType: interviewType || undefined,
      });
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useCreateRubric() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: CreateRubricInput) =>
      apiPost<EvaluationRubric>(`/organizations/${orgId}/evaluation-rubrics`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-rubrics"] });
      toast.success("Rubric parameter added");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to add rubric parameter"),
  });
}

export function useUpdateRubric() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRubricInput> }) =>
      apiPatch<EvaluationRubric>(`/organizations/${orgId}/evaluation-rubrics/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-rubrics"] });
      toast.success("Rubric parameter updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update rubric parameter"),
  });
}

export function useDeactivateRubric() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/evaluation-rubrics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-rubrics"] });
      toast.success("Rubric parameter deactivated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to deactivate rubric parameter"),
  });
}

// ============================================================================
// SHORTLISTING RULES
// ============================================================================

export function useShortlistingRules(program?: string, academicYear?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["shortlisting-rules", orgId, program, academicYear],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<ShortlistingRule>>(`/organizations/${orgId}/shortlisting-rules`, {
        program: program || undefined,
        academicYear: academicYear || undefined,
      });
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useCreateShortlistingRule() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: CreateShortlistingRuleInput) =>
      apiPost<ShortlistingRule>(`/organizations/${orgId}/shortlisting-rules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlisting-rules"] });
      toast.success("Shortlisting rule created");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create shortlisting rule"),
  });
}

export function useUpdateShortlistingRule() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateShortlistingRuleInput> }) =>
      apiPatch<ShortlistingRule>(`/organizations/${orgId}/shortlisting-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlisting-rules"] });
      toast.success("Shortlisting rule updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update shortlisting rule"),
  });
}

export function useDeactivateShortlistingRule() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/shortlisting-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlisting-rules"] });
      toast.success("Shortlisting rule deactivated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to deactivate shortlisting rule"),
  });
}

// ============================================================================
// SCORE CONVERSION CONFIG
// ============================================================================

export interface ScoreBand {
  minPercent?: number;
  minPercentile?: number;
  minMonths?: number;
  points: number;
}

export interface ScoreConversionConfig {
  id: string;
  organizationId: string;
  bands: {
    tenth: ScoreBand[];
    twelfth: ScoreBand[];
    ug: ScoreBand[];
    testPercentile: ScoreBand[];
    // Split entrance scoring (owner request): CAT and other exams
    catPercentile?: ScoreBand[];
    otherTestPercentile?: ScoreBand[];
    experienceMonths: ScoreBand[];
  };
  discrepancyThreshold: number;
  qualifyingScore?: number;
  resultsAnnounced?: boolean;
  resultsDeclarationDate?: string | null;
  autoAnnounceResults?: boolean;
  // 'best_overall' (default: single best percentile across all tests) or
  // 'cat_split' (CAT and best non-CAT exam scored separately)
  entranceScoringMode?: "best_overall" | "cat_split";
  catWeight?: number;
  otherTestWeight?: number;
  gdScoringSchemeId?: string | null;
}

export type ScoreConversionConfigUpdate = Partial<
  Pick<
    ScoreConversionConfig,
    | "bands"
    | "discrepancyThreshold"
    | "qualifyingScore"
    | "resultsAnnounced"
    | "resultsDeclarationDate"
    | "autoAnnounceResults"
    | "entranceScoringMode"
    | "catWeight"
    | "otherTestWeight"
  >
>;

export function useScoreConversionConfig() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["score-conversion-config", orgId],
    queryFn: () => apiGet<ScoreConversionConfig>(`/organizations/${orgId}/score-conversion-config`),
    enabled: !!orgId,
  });
}

export function useUpdateScoreConversionConfig() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: ScoreConversionConfigUpdate) =>
      apiPatch<ScoreConversionConfig>(`/organizations/${orgId}/score-conversion-config`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["score-conversion-config"] });
      queryClient.invalidateQueries({ queryKey: ["composite-score"] });
      toast.success("Score conversion settings saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save settings"),
  });
}

export function useAnnounceResults() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (dto: { declarationDate?: string }) =>
      apiPost<{ success: boolean; totalUpdated: number; selectedCount: number; notSelectedCount: number }>(
        `/organizations/${orgId}/announce-results`,
        dto
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["score-conversion-config"] });
      queryClient.invalidateQueries({ queryKey: ["announced-results-status"] });
      toast.success(`Results announced successfully: ${res.selectedCount} Selected, ${res.notSelectedCount} Not Selected`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to announce results"),
  });
}

export function useSetDeclarationDate() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (payload: { declarationDate: string; autoAnnounce?: boolean } | string) => {
      const body = typeof payload === "string" ? { declarationDate: payload } : payload;
      return apiPost<{ success: boolean; studentsNotified?: number }>(
        `/organizations/${orgId}/set-declaration-date`,
        body
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["score-conversion-config"] });
      queryClient.invalidateQueries({ queryKey: ["announced-results-status"] });
      queryClient.invalidateQueries({ queryKey: ["communications"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (res?.studentsNotified) {
        toast.success(`Declaration date set & notification sent to ${res.studentsNotified} candidates`);
      } else {
        toast.success("Results declaration date updated");
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to set declaration date"),
  });
}

export function useAnnouncedResultsStatus() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["announced-results-status", orgId],
    queryFn: () =>
      apiGet<{
        resultsAnnounced: boolean;
        resultsDeclarationDate: string | null;
        autoAnnounceResults?: boolean;
        qualifyingScore: number;
      }>(`/organizations/${orgId}/announced-results-status`),
    enabled: !!orgId,
  });
}

// ============================================================================
// SHORTLISTING RUN
// ============================================================================

export function useRunShortlisting() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: async ({ ruleId, commit }: { ruleId: string; commit?: boolean }) => {
      if (commit) {
        return apiPost<{ updated: number }>(`/organizations/${orgId}/shortlisting/run`, { ruleId, commit: true });
      }
      const res = await apiPost<PaginatedResponse<ShortlistPreviewRow>>(`/organizations/${orgId}/shortlisting/run`, {
        ruleId,
        commit: false,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      if (variables.commit) {
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        toast.success("Shortlisting results committed");
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to run shortlisting"),
  });
}

export function useHardDeleteRubric() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/evaluation-rubrics/${id}/hard-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-rubrics"] });
      toast.success("Rubric parameter permanently deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete rubric parameter"),
  });
}

export function useHardDeleteShortlistingRule() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/organizations/${orgId}/shortlisting-rules/${id}/hard-delete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlisting-rules"] });
      toast.success("Shortlisting rule permanently deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete shortlisting rule"),
  });
}
