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
  shortlistScore: number;
  shortlistStatus: "Eligible" | "Not Eligible";
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
  minYears?: number;
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
    experienceYears: ScoreBand[];
  };
  discrepancyThreshold: number;
}

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
    mutationFn: (data: Partial<Pick<ScoreConversionConfig, "bands" | "discrepancyThreshold">>) =>
      apiPatch<ScoreConversionConfig>(`/organizations/${orgId}/score-conversion-config`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["score-conversion-config"] });
      toast.success("Score conversion settings saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save settings"),
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
