import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ============================================================================
// TYPES — mirror admissions-tenant-api-main/src/modules/admissions-decisions
// entities added in Phase 6b (OfferAcceptance / WaitlistEntry / Rejection).
// ============================================================================

export type AcceptanceStatus = "pending" | "accepted" | "declined" | "expired";

export interface OfferAcceptance {
  id: string;
  offerLetterId: string;
  acceptanceStatus: AcceptanceStatus;
  candidateConfirmationDate: string | null;
  acceptanceDeadline: string | null;
  seatBookingFee: number;
  feePaymentStatus: string;
  paymentReferenceId: string | null;
  onboardingPackageSent: boolean;
  onboardingInfo: string | null;
  enrollmentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export type WaitlistStatus = "active" | "offer_released" | "converted" | "closed";

export interface WaitlistEntry {
  id: string;
  organizationId: string;
  applicationId: string;
  waitlistRank: number | null;
  waitlistStatus: WaitlistStatus;
  movementTrigger: string | null;
  alternateProgramOffered: string | null;
  offerReleased: boolean;
  communicationSent: boolean;
  lastReviewDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RejectionReason =
  | "below_cutoff"
  | "incomplete_documents"
  | "failed_interview"
  | "seat_unavailable"
  | "other";

export interface Rejection {
  id: string;
  organizationId: string;
  applicationId: string;
  rejectionReason: RejectionReason;
  detailedReason: string | null;
  rejectionDate: string;
  communicationSent: boolean;
  alternateOptionsSuggested: string | null;
  eligibleForReapply: boolean;
  nextIntake: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordAcceptanceInput {
  accept: boolean;
}

export interface MarkOnboardingInput {
  onboardingInfo?: string;
}

export interface AddToWaitlistInput {
  waitlistRank?: number;
  remarks?: string;
}

export interface ReleaseOfferInput {
  alternateProgramOffered?: string;
}

export interface UpdateRejectionInput {
  rejectionReason?: RejectionReason;
  detailedReason?: string;
  alternateOptionsSuggested?: string;
  eligibleForReapply?: boolean;
  nextIntake?: string;
}

// ============================================================================
// ACCEPTANCE HOOKS
// ============================================================================

export function useAcceptance(applicationNo?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["offer-acceptance", orgId, applicationNo],
    queryFn: () =>
      apiGet<OfferAcceptance>(`/organizations/${orgId}/applications/${applicationNo}/acceptance`),
    enabled: !!orgId && !!applicationNo,
    retry: false,
  });
}

export function useMarkOnboardingSent(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: MarkOnboardingInput) =>
      apiPatch<OfferAcceptance>(`/organizations/${orgId}/applications/${applicationNo}/acceptance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer-acceptance", orgId, applicationNo] });
      toast.success("Onboarding package marked as sent");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update onboarding status"),
  });
}

export function useConfirmAcceptance(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: RecordAcceptanceInput) =>
      apiPost<OfferAcceptance>(`/organizations/${orgId}/applications/${applicationNo}/acceptance/confirm`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["offer-acceptance", orgId, applicationNo] });
      toast.success(variables.accept ? "Offer acceptance recorded" : "Offer decline recorded");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to record candidate decision"),
  });
}

// ============================================================================
// WAITLIST HOOKS
// ============================================================================

export function useWaitlistEntry(applicationNo?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["waitlist-entry", orgId, applicationNo],
    queryFn: () =>
      apiGet<WaitlistEntry>(`/organizations/${orgId}/applications/${applicationNo}/waitlist`),
    enabled: !!orgId && !!applicationNo,
    retry: false,
  });
}

export function useUpdateWaitlistEntry(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: AddToWaitlistInput) =>
      apiPatch<WaitlistEntry>(`/organizations/${orgId}/applications/${applicationNo}/waitlist`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entry", orgId, applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["waitlist-list", orgId] });
      toast.success("Waitlist entry updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update waitlist entry"),
  });
}

export function useReleaseWaitlistOffer(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: ReleaseOfferInput) =>
      apiPost<WaitlistEntry>(`/organizations/${orgId}/applications/${applicationNo}/waitlist/release-offer`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entry", orgId, applicationNo] });
      queryClient.invalidateQueries({ queryKey: ["waitlist-list", orgId] });
      toast.success("Offer release flagged — generate the offer letter next");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to release offer"),
  });
}

// Full org-level waitlist listing — GET /organizations/:orgId/waitlist.
export function useWaitlist() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["waitlist-list", orgId],
    queryFn: () => apiGet<WaitlistEntry[]>(`/organizations/${orgId}/waitlist`),
    enabled: !!orgId,
  });
}

// ============================================================================
// REJECTION HOOKS
// ============================================================================

export function useRejection(applicationNo?: string) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: ["rejection", orgId, applicationNo],
    queryFn: () =>
      apiGet<Rejection>(`/organizations/${orgId}/applications/${applicationNo}/rejection`),
    enabled: !!orgId && !!applicationNo,
    retry: false,
  });
}

export function useUpdateRejection(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useMutation({
    mutationFn: (data: UpdateRejectionInput) =>
      apiPatch<Rejection>(`/organizations/${orgId}/applications/${applicationNo}/rejection`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rejection", orgId, applicationNo] });
      toast.success("Rejection record updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update rejection record"),
  });
}
