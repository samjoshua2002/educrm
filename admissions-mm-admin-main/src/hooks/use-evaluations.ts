import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PaginatedResponse } from "@/types/api";
import type { GdSchemeComponent } from "@/hooks/use-scoring";

// ============================================================================
// TYPES
// ============================================================================

export const RECOMMENDATIONS = ["Strongly Recommend", "Recommend", "Neutral", "Do Not Recommend"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export interface MyAssignedInterview {
  interviewId: string;
  interviewNumber?: number;
  applicationId: string;
  applicationNo?: string;
  studentName?: string;
  interviewType: "GD" | "PI";
  interviewMode?: string | null;
  round: number;
  status: "Slot Available" | "Scheduled" | "Rescheduled" | "Completed" | "No Show" | "Cancelled";
  meetingLink?: string | null;
  location?: string | null;
  slot?: {
    slotDate: string;
    startTime: string;
    endTime?: string;
    location?: string | null;
    timeZone?: string | null;
  } | null;
  evaluationStatus: "Not Started" | "draft" | "submitted";
  recommendation?: string | null;
  submitted?: boolean;
}

export interface EvaluationRubricLite {
  id: string;
  rubricNumber?: number;
  organizationId: string;
  interviewType: "GD" | "PI";
  parameterName: string;
  maxScore: number;
  weightagePercent?: number | null;
  description?: string | null;
  isActive: boolean;
}

export interface EvaluationScore {
  id: string;
  scoreNumber?: number;
  rubricId: string;
  parameterName?: string;
  maxScore?: number;
  weightagePercent?: number | null;
  scoreGiven: number;
  notes?: string | null;
  // Weighted_Score = Score_Given / Max_Score x Weightage
  weightedScore?: number | null;
}

export interface InterviewEvaluation {
  id: string;
  evaluationNumber?: number;
  interviewId: string;
  evaluatorId: string;
  evaluatorName?: string;
  evaluatorEmail?: string;
  status: "draft" | "submitted";
  submitted?: boolean;
  overallRecommendation?: string | null;
  comments?: string | null;
  evaluationDate?: string | null;
  submittedAt?: string | null;
  totalWeightedScore?: number;
  scores: EvaluationScore[];
}

// Evaluator portal context: interview details, rubrics for its type and the
// selected GD scoring scheme's component(s) that the panel's marks feed.
export interface ScoringContext {
  interview: {
    id: string;
    interviewNumber?: number;
    interviewType: "GD" | "PI";
    interviewMode?: string | null;
    round: number;
    status: string;
    interviewDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    meetingLink?: string | null;
    location?: string | null;
    applicationNo?: string | null;
    candidateName?: string | null;
  };
  scheme: { id: string; name: string; isPredefined: boolean };
  schemeComponents: GdSchemeComponent[];
  rubrics: EvaluationRubricLite[];
  totalWeightage: number;
}

export interface SubmitEvaluationInput {
  scores: { rubricId: string; scoreGiven: number; notes?: string }[];
  overallRecommendation?: string;
  comments?: string;
  submit?: boolean;
}

// ============================================================================
// EVALUATOR-FACING
// ============================================================================

export function useMyAssignedInterviews() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["my-assigned-interviews", orgId],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<MyAssignedInterview> | MyAssignedInterview[]>(
        `/organizations/${orgId}/interviews/my-assignments`,
      );
      return Array.isArray(res) ? res : res?.data ?? [];
    },
    enabled: !!orgId,
  });
}

export function useInterviewRubrics(interviewId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["interview-rubrics", orgId, interviewId],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<EvaluationRubricLite> | EvaluationRubricLite[]>(
        `/organizations/${orgId}/interviews/${interviewId}/rubrics`,
      );
      return Array.isArray(res) ? res : res?.data ?? [];
    },
    enabled: !!orgId && !!interviewId,
  });
}

export function useScoringContext(interviewId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["scoring-context", orgId, interviewId],
    queryFn: () => apiGet<ScoringContext>(`/organizations/${orgId}/interviews/${interviewId}/scoring-context`),
    enabled: !!orgId && !!interviewId,
  });
}

export function useMyEvaluation(interviewId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["my-evaluation", orgId, interviewId],
    queryFn: () => apiGet<InterviewEvaluation>(`/organizations/${orgId}/interviews/${interviewId}/evaluations/mine`),
    enabled: !!orgId && !!interviewId,
  });
}

export function useSubmitEvaluation(interviewId?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: SubmitEvaluationInput) =>
      apiPatch<InterviewEvaluation>(`/organizations/${orgId}/interviews/${interviewId}/evaluations/mine`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-evaluation", orgId, interviewId] });
      queryClient.invalidateQueries({ queryKey: ["my-assigned-interviews"] });
      queryClient.invalidateQueries({ queryKey: ["interview-evaluations", orgId, interviewId] });
      queryClient.invalidateQueries({ queryKey: ["composite-score"] });
      toast.success(variables.submit ? "Evaluation submitted" : "Draft saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save evaluation"),
  });
}

// ============================================================================
// ADMIN OVERSIGHT
// ============================================================================

export function useInterviewEvaluations(interviewId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["interview-evaluations", orgId, interviewId],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<InterviewEvaluation> | InterviewEvaluation[]>(
        `/organizations/${orgId}/interviews/${interviewId}/evaluations`,
      );
      return Array.isArray(res) ? res : res?.data ?? [];
    },
    enabled: !!orgId && !!interviewId,
  });
}
