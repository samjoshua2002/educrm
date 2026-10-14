import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { downloadAuthenticatedFile } from "@/hooks/use-admission-decisions";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AcceptanceListRow,
  OfferAcceptance,
  RecordAcceptanceInput,
  Rejection,
  RejectionListRow,
  ReleaseWaitlistOfferInput,
  SeatsAvailableInput,
  StudentAdmissionResult,
  UpdateAcceptanceInput,
  UpdateRejectionInput,
  UpdateWaitlistInput,
  WaitlistEntry,
  WaitlistListRow,
} from "@/types/admission-decisions";

export type * from "@/types/admission-decisions";

function errorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  return msg || fallback;
}

// 400/403/500 are toasted by the axios interceptor already.
function onMutationError(fallback: string) {
  return (err: any) => {
    const status = err?.response?.status;
    if (status === 404 || status === 422)
      toast.error(errorMessage(err, fallback));
  };
}

function useOrgId() {
  return useAuthStore((s) => s.user?.organizationId);
}

// List endpoints return a plain array, which the API wraps as
// { data: [...], pagination } — unwrap to the array.
async function getList<T>(url: string, params?: object): Promise<T[]> {
  const res = await apiGet<T[] | { data?: T[] }>(url, params);
  return Array.isArray(res) ? res : (res?.data ?? []);
}

// A missing record comes back as 404; show "nothing yet" instead of an error.
async function getOrNull<T>(url: string): Promise<T | null> {
  try {
    return (await apiGet<T | null>(url)) ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

function appBase(
  orgId: string | null | undefined,
  applicationNo: string | undefined,
) {
  return `/organizations/${orgId}/applications/${encodeURIComponent(applicationNo || "")}`;
}

function useInvalidateOutcome(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return () => {
    queryClient.invalidateQueries({
      queryKey: ["offer-acceptance", orgId, applicationNo],
    });
    queryClient.invalidateQueries({ queryKey: ["acceptances-list", orgId] });
    queryClient.invalidateQueries({
      queryKey: ["offer-letter", orgId, applicationNo],
    });
    queryClient.invalidateQueries({ queryKey: ["offer-letters-list", orgId] });
    queryClient.invalidateQueries({
      queryKey: ["waitlist-entry", orgId, applicationNo],
    });
    queryClient.invalidateQueries({ queryKey: ["waitlist-list", orgId] });
    queryClient.invalidateQueries({
      queryKey: ["rejection", orgId, applicationNo],
    });
    queryClient.invalidateQueries({ queryKey: ["rejections-list", orgId] });
  };
}

// ============================================================================
// ACCEPTANCE (Offer_Acceptances)
// ============================================================================

export function useAcceptance(applicationNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["offer-acceptance", orgId, applicationNo],
    queryFn: () =>
      getOrNull<OfferAcceptance>(`${appBase(orgId, applicationNo)}/acceptance`),
    enabled: !!orgId && !!applicationNo,
    retry: false,
  });
}

export function useAcceptanceList(status?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["acceptances-list", orgId, status ?? ""],
    queryFn: () =>
      getList<AcceptanceListRow>(
        `/organizations/${orgId}/acceptances`,
        status ? { status } : undefined,
      ),
    enabled: !!orgId,
  });
}

export function useUpdateAcceptance(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: (input: UpdateAcceptanceInput) =>
      apiPatch<OfferAcceptance>(
        `${appBase(orgId, applicationNo)}/acceptance`,
        input,
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Acceptance updated");
    },
    onError: onMutationError("Failed to update acceptance"),
  });
}

export function useConfirmAcceptance(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: (input: RecordAcceptanceInput) =>
      apiPost<OfferAcceptance>(
        `${appBase(orgId, applicationNo)}/acceptance/confirm`,
        input,
      ),
    onSuccess: (_d, v) => {
      invalidate();
      toast.success(
        v.accept ? "Offer acceptance recorded" : "Offer decline recorded",
      );
    },
    onError: onMutationError("Failed to record the candidate's response"),
  });
}

export function useSendOnboardingPackage(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: (onboardingInfo?: string) =>
      apiPost<OfferAcceptance>(
        `${appBase(orgId, applicationNo)}/acceptance/onboarding`,
        { onboardingInfo },
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Onboarding package sent");
    },
    onError: onMutationError("Failed to send the onboarding package"),
  });
}

// ============================================================================
// WAITLIST (Waitlist_Management)
// ============================================================================

export function useWaitlistEntry(applicationNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["waitlist-entry", orgId, applicationNo],
    queryFn: () =>
      getOrNull<WaitlistEntry>(`${appBase(orgId, applicationNo)}/waitlist`),
    enabled: !!orgId && !!applicationNo,
    retry: false,
  });
}

export function useWaitlist(
  filters: { program?: string; status?: string } = {},
) {
  const orgId = useOrgId();
  const params: Record<string, string> = {};
  if (filters.program) params.program = filters.program;
  if (filters.status) params.status = filters.status;
  return useQuery({
    queryKey: ["waitlist-list", orgId, params],
    queryFn: () =>
      getList<WaitlistListRow>(`/organizations/${orgId}/waitlist`, params),
    enabled: !!orgId,
  });
}

export function useUpdateWaitlistEntry(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: (input: UpdateWaitlistInput) =>
      apiPatch<WaitlistEntry>(
        `${appBase(orgId, applicationNo)}/waitlist`,
        input,
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Waitlist entry updated");
    },
    onError: onMutationError("Failed to update waitlist entry"),
  });
}

export function useReleaseWaitlistOffer(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: (input: ReleaseWaitlistOfferInput) =>
      apiPost<WaitlistEntry>(
        `${appBase(orgId, applicationNo)}/waitlist/release-offer`,
        input,
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Offer released to the waitlisted applicant");
    },
    onError: onMutationError("Failed to release offer"),
  });
}

export function useCloseWaitlistEntry(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: () =>
      apiPost<WaitlistEntry>(`${appBase(orgId, applicationNo)}/waitlist/close`),
    onSuccess: () => {
      invalidate();
      toast.success("Waitlist entry closed");
    },
    onError: onMutationError("Failed to close waitlist entry"),
  });
}

export function useSeatsAvailable() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (input: SeatsAvailableInput) =>
      apiPost<unknown>(
        `/organizations/${orgId}/waitlist/seats-available`,
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-list", orgId] });
      queryClient.invalidateQueries({
        queryKey: ["offer-letters-list", orgId],
      });
      queryClient.invalidateQueries({ queryKey: ["waitlist-entry"] });
      toast.success("Offers released to the next ranked applicants");
    },
    onError: onMutationError("Failed to release waitlist offers"),
  });
}

// ============================================================================
// REJECTIONS
// ============================================================================

export function useRejection(applicationNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["rejection", orgId, applicationNo],
    queryFn: () =>
      getOrNull<Rejection>(`${appBase(orgId, applicationNo)}/rejection`),
    enabled: !!orgId && !!applicationNo,
    retry: false,
  });
}

export function useRejectionList() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["rejections-list", orgId],
    queryFn: () =>
      getList<RejectionListRow>(`/organizations/${orgId}/rejections`),
    enabled: !!orgId,
  });
}

export function useUpdateRejection(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: (input: UpdateRejectionInput) =>
      apiPatch<Rejection>(`${appBase(orgId, applicationNo)}/rejection`, input),
    onSuccess: () => {
      invalidate();
      toast.success("Rejection saved");
    },
    onError: onMutationError("Failed to save rejection"),
  });
}

export function useSendRejectionLetter(applicationNo?: string) {
  const orgId = useOrgId();
  const invalidate = useInvalidateOutcome(applicationNo);
  return useMutation({
    mutationFn: () =>
      apiPost<Rejection>(
        `${appBase(orgId, applicationNo)}/rejection/send-letter`,
      ),
    onSuccess: () => {
      invalidate();
      toast.success("Rejection letter sent");
    },
    onError: onMutationError("Failed to send the rejection letter"),
  });
}

// ============================================================================
// STUDENT PORTAL — the applicant's own released result
// ============================================================================

export function useStudentAdmissionResult(
  applicationNo?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["student-admission-result", applicationNo ?? ""],
    queryFn: () =>
      getOrNull<StudentAdmissionResult>(
        `/student/admission-result${applicationNo ? `?applicationNo=${encodeURIComponent(applicationNo)}` : ""}`,
      ),
    enabled: options?.enabled ?? true,
    retry: false,
  });
}

export function useRespondToOffer(applicationNo?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordAcceptanceInput) =>
      apiPost<unknown>(
        `/student/admission-result/respond${applicationNo ? `?applicationNo=${encodeURIComponent(applicationNo)}` : ""}`,
        input,
      ),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["student-admission-result"] });
      toast.success(
        v.accept
          ? "You have accepted the offer"
          : "You have declined the offer",
      );
    },
    onError: onMutationError("Your response could not be recorded"),
  });
}

export function downloadStudentOfferPdf(applicationNo?: string) {
  return downloadAuthenticatedFile(
    `/student/admission-result/offer-letter/pdf${applicationNo ? `?applicationNo=${encodeURIComponent(applicationNo)}` : ""}`,
    "Offer-Letter.pdf",
  );
}

export function downloadStudentRejectionPdf(applicationNo?: string) {
  return downloadAuthenticatedFile(
    `/student/admission-result/rejection-letter/pdf${applicationNo ? `?applicationNo=${encodeURIComponent(applicationNo)}` : ""}`,
    "Rejection-Letter.pdf",
  );
}
