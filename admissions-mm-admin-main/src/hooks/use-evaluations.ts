import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PaginatedResponse } from "@/types/api";

// ============================================================================
// TYPES
// ============================================================================

export interface MyAssignedInterview {
  interviewId: string;
  applicationId: string;
  applicationNo?: string;
  studentName?: string;
  interviewType: "GD" | "PI";
  round: number;
  status: "Scheduled" | "Rescheduled" | "Completed" | "No Show" | "Cancelled";
  slot?: { slotDate: string; startTime: string; location?: string | null } | null;
  evaluationStatus: "Not Started" | "draft" | "submitted";
}

export interface EvaluationRubricLite {
  id: string;
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
  rubricId: string;
  parameterName?: string;
  maxScore?: number;
  weightagePercent?: number | null;
  scoreGiven: number;
  notes?: string | null;
  weightedScore?: number | null;
}

export interface InterviewEvaluation {
  id: string;
  interviewId: string;
  evaluatorId: string;
  evaluatorName?: string;
  evaluatorEmail?: string;
  status: "draft" | "submitted";
  overallRecommendation?: string | null;
  comments?: string | null;
  submittedAt?: string | null;
  scores: EvaluationScore[];
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
      const res = await apiGet<PaginatedResponse<MyAssignedInterview>>(
        `/organizations/${orgId}/interviews/my-assignments`,
      );
      return res.data;
    },
    enabled: !!orgId,
  });
}

export function useInterviewRubrics(interviewId?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["interview-rubrics", orgId, interviewId],
    queryFn: async () => {
      const res = await apiGet<PaginatedResponse<EvaluationRubricLite>>(
        `/organizations/${orgId}/interviews/${interviewId}/rubrics`,
      );
      return res.data;
    },
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
      const res = await apiGet<PaginatedResponse<InterviewEvaluation>>(
        `/organizations/${orgId}/interviews/${interviewId}/evaluations`,
      );
      return res.data;
    },
    enabled: !!orgId && !!interviewId,
  });
}
