import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ============================================================================
// TYPES — mirror ScoringService's CompositeScoreBreakdown
// (admissions-tenant-api-main/src/modules/interviews/scoring.service.ts)
// ============================================================================

export interface InterviewScoreBreakdown {
  interviewId: string;
  interviewType: "GD" | "PI";
  round: number;
  status: "Scheduled" | "Rescheduled" | "Completed" | "No Show" | "Cancelled";
  score: number | null;
  evaluatorCount: number;
}

export interface CompositeScoreBreakdown {
  applicationId: string;
  applicationNo: string;
  interviews: InterviewScoreBreakdown[];
  gdScore: number | null;
  piScore: number | null;
  gdpiTotal: number;
  experienceComponent: number;
  claimedExperienceMonths: string | null;
  validatedExperienceMonths: string | null;
  discrepancyFlag: boolean;
  achievementScore: number;
  penaltyScore: number;
  otherComponentsTotal: number;
  compositeScore: number;
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
        `/organizations/${orgId}/applications/${applicationNo}/composite-score`,
      ),
    enabled: !!orgId && !!applicationNo,
  });
}

export function useScoreAdjustment(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: ScoreAdjustmentInput) =>
      apiPatch<CompositeScoreBreakdown>(
        `/organizations/${orgId}/applications/${applicationNo}/score-adjustment`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["composite-score", orgId, applicationNo] });
      toast.success("Score adjustment saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save score adjustment"),
  });
}
