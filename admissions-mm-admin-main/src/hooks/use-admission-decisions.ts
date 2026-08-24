import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { CompositeScoreBreakdown } from "@/hooks/use-scoring";

// ============================================================================
// TYPES — mirror admissions-tenant-api-main/src/modules/admissions-decisions
// entities (AdmissionDecision / OfferLetter).
// ============================================================================

export type DecisionStage = "under_review" | "committee_review" | "final_approval" | "decision_released";
export type FinalDecision = "offer_made" | "waitlisted" | "rejected";

export interface AdmissionDecision {
  id: string;
  organizationId: string;
  applicationId: string;
  decisionStage: DecisionStage;
  finalDecision: FinalDecision | null;
  decisionCommittee: string[];
  decisionScore: number | null;
  decisionDate: string | null;
  approvedBy: string | null;
  approvalStatus: string;
  internalRemarks: string | null;
  applicantVisible: boolean;
  decisionLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionWithScore {
  decision: AdmissionDecision | null;
  scoreBreakdown: CompositeScoreBreakdown;
}

export type OfferType = "regular" | "conditional" | "scholarship";
export type OfferStatus = "draft" | "generated" | "sent" | "expired" | "withdrawn";

export interface OfferLetter {
  id: string;
  applicationId: string;
  admissionDecisionId: string | null;
  offerType: OfferType;
  programOffered: string | null;
  offerStatus: OfferStatus;
  offerLetterHtml: string | null;
  offerGeneratedOn: string | null;
  offerValidTill: string | null;
  scholarshipAmount: number;
  conditions: string | null;
  generatedBy: string | null;
  sentToCandidate: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDecisionInput {
  decisionStage?: DecisionStage;
  decisionCommittee?: string[];
  internalRemarks?: string;
  applicantVisible?: boolean;
}

export interface FinalizeDecisionInput {
  finalDecision: FinalDecision;
  internalRemarks?: string;
}

export interface GenerateOfferLetterInput {
  offerType: OfferType;
  offerValidTill: string;
  scholarshipAmount?: number;
  conditions?: string;
}

// ============================================================================
// DECISION HOOKS
// ============================================================================

export function useDecision(applicationNo?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["admission-decision", orgId, applicationNo],
    queryFn: () =>
      apiGet<DecisionWithScore>(`/organizations/${orgId}/applications/${applicationNo}/decision`),
    enabled: !!orgId && !!applicationNo,
  });
}

export function useUpdateDecision(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: UpdateDecisionInput) =>
      apiPatch<AdmissionDecision>(`/organizations/${orgId}/applications/${applicationNo}/decision`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-decision", orgId, applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["admission-decisions-list"] });
      toast.success("Decision saved");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to save decision"),
  });
}

export function useAdvanceDecisionStage(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (decisionStage: "committee_review" | "final_approval") =>
      apiPatch<AdmissionDecision>(`/organizations/${orgId}/applications/${applicationNo}/decision/advance-stage`, {
        decisionStage,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-decision", orgId, applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["admission-decisions-list"] });
      toast.success("Decision stage advanced");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to advance decision stage"),
  });
}

export function useFinalizeDecision(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: FinalizeDecisionInput) =>
      apiPatch<AdmissionDecision>(`/organizations/${orgId}/applications/${applicationNo}/decision/finalize`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-decision", orgId, applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["admission-decisions-list"] });
      toast.success("Final decision recorded");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to finalize decision"),
  });
}

// ============================================================================
// OFFER LETTER HOOKS
// ============================================================================

export function useOfferLetter(applicationNo?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["offer-letter", orgId, applicationNo],
    queryFn: () =>
      apiGet<OfferLetter | null>(`/organizations/${orgId}/applications/${applicationNo}/offer-letter`),
    enabled: !!orgId && !!applicationNo,
  });
}

export function useGenerateOfferLetter(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: GenerateOfferLetterInput) =>
      apiPost<OfferLetter>(`/organizations/${orgId}/applications/${applicationNo}/offer-letter/generate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer-letter", orgId, applicationNo] });
      toast.success("Offer letter generated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to generate offer letter"),
  });
}

export function useSendOfferLetter(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: () =>
      apiPost<OfferLetter>(`/organizations/${orgId}/applications/${applicationNo}/offer-letter/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer-letter", orgId, applicationNo] });
      toast.success("Offer letter sent to candidate");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to send offer letter"),
  });
}

export function useWithdrawOffer(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (reason?: string) =>
      apiPost<OfferLetter>(`/organizations/${orgId}/applications/${applicationNo}/offer-letter/withdraw`, {
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer-letter", orgId, applicationNo] });
      toast.success("Offer letter withdrawn");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to withdraw offer letter"),
  });
}
