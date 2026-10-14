import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { toast } from "sonner";

import api, { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AdmissionDecision,
  BulkDecisionInput,
  BulkDecisionResult,
  CommitteeReviewInput,
  CommitteeTeam,
  CommitteeTeamInput,
  DecisionDetail,
  DecisionListFilters,
  DecisionListRow,
  DecisionPicklists,
  DecisionSettings,
  FinalizeDecisionInput,
  GenerateOfferLetterInput,
  LetterTemplate,
  LetterTemplateInput,
  MergeField,
  OfferLetter,
  OfferListRow,
  ReleaseDecisionInput,
  UpdateDecisionInput,
  UpdateDecisionSettingsInput,
} from "@/types/admission-decisions";

export type * from "@/types/admission-decisions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function errorMessage(err: any, fallback: string): string {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  return msg || fallback;
}

// Error toasts for 400/403/500 are shown by the axios interceptor; show ours
// only for the statuses it stays silent on (404 / 422) so nothing is doubled.
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

// ============================================================================
// PDF download (authenticated) â€” the API streams application/pdf.
// ============================================================================

export async function downloadAuthenticatedFile(
  path: string,
  fallbackName: string,
  method: "GET" | "POST" = "GET",
  body?: object,
) {
  const token = Cookies.get("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    let message = "The file could not be downloaded.";
    try {
      const json = await res.json();
      message = Array.isArray(json?.message)
        ? json.message.join(", ")
        : json?.message || message;
    } catch {
      /* not json */
    }
    toast.error(message);
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const name = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function invalidateDecision(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId?: string | null,
  applicationNo?: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["admission-decision", orgId, applicationNo],
  });
  queryClient.invalidateQueries({ queryKey: ["admission-decisions-list"] });
}

// ============================================================================
// DECISIONS
// ============================================================================

export function useDecisionList(filters: DecisionListFilters = {}) {
  const orgId = useOrgId();
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.stage) params.stage = filters.stage;
  if (filters.finalDecision) params.finalDecision = filters.finalDecision;
  if (filters.program) params.program = filters.program;
  return useQuery({
    queryKey: ["admission-decisions-list", orgId, params],
    queryFn: () =>
      getList<DecisionListRow>(`/organizations/${orgId}/decisions`, params),
    enabled: !!orgId,
  });
}

export function useDecision(applicationNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["admission-decision", orgId, applicationNo],
    queryFn: () =>
      apiGet<DecisionDetail>(
        `/organizations/${orgId}/applications/${encodeURIComponent(applicationNo!)}/decision`,
      ),
    enabled: !!orgId && !!applicationNo,
  });
}

function useDecisionMutation<TInput>(
  applicationNo: string | undefined,
  request: (base: string, input: TInput) => Promise<unknown>,
  success: string,
  failure: string,
) {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (input: TInput) =>
      request(
        `/organizations/${orgId}/applications/${encodeURIComponent(applicationNo || "")}`,
        input,
      ),
    onSuccess: () => {
      invalidateDecision(queryClient, orgId, applicationNo);
      queryClient.invalidateQueries({
        queryKey: ["offer-letter", orgId, applicationNo],
      });
      queryClient.invalidateQueries({
        queryKey: ["waitlist-entry", orgId, applicationNo],
      });
      queryClient.invalidateQueries({
        queryKey: ["rejection", orgId, applicationNo],
      });
      toast.success(success);
    },
    onError: onMutationError(failure),
  });
}

export function useUpdateDecision(applicationNo?: string) {
  return useDecisionMutation<UpdateDecisionInput>(
    applicationNo,
    (base, input) => apiPatch<AdmissionDecision>(`${base}/decision`, input),
    "Decision saved",
    "Failed to save decision",
  );
}

export function useCommitteeReview(applicationNo?: string) {
  return useDecisionMutation<CommitteeReviewInput>(
    applicationNo,
    (base, input) =>
      apiPost<AdmissionDecision>(`${base}/decision/review`, input),
    "Committee review recorded",
    "Failed to record review",
  );
}

export function useAdvanceDecisionStage(applicationNo?: string) {
  return useDecisionMutation<"committee_review" | "final_approval">(
    applicationNo,
    (base, decisionStage) =>
      apiPatch<AdmissionDecision>(`${base}/decision/advance-stage`, {
        decisionStage,
      }),
    "Decision stage advanced",
    "Failed to advance decision stage",
  );
}

export function useFinalizeDecision(applicationNo?: string) {
  return useDecisionMutation<FinalizeDecisionInput>(
    applicationNo,
    (base, input) =>
      apiPatch<AdmissionDecision>(`${base}/decision/finalize`, input),
    "Final approval recorded",
    "Failed to record final approval",
  );
}

export function useReleaseDecision(applicationNo?: string) {
  return useDecisionMutation<ReleaseDecisionInput>(
    applicationNo,
    (base, input) =>
      apiPost<AdmissionDecision>(`${base}/decision/release`, input),
    "Decision released",
    "Failed to release decision",
  );
}

export function usePublishDecision(applicationNo?: string) {
  return useDecisionMutation<void>(
    applicationNo,
    (base) => apiPost<AdmissionDecision>(`${base}/decision/publish`),
    "Decision is now visible to the applicant",
    "Failed to publish decision",
  );
}

export function useLockDecision(applicationNo?: string) {
  return useDecisionMutation<void>(
    applicationNo,
    (base) => apiPost<AdmissionDecision>(`${base}/decision/lock`),
    "Decision locked",
    "Failed to lock decision",
  );
}

export function useUnlockDecision(applicationNo?: string) {
  return useDecisionMutation<string>(
    applicationNo,
    (base, reason) =>
      apiPost<AdmissionDecision>(`${base}/decision/unlock`, { reason }),
    "Decision unlocked",
    "Failed to unlock decision",
  );
}

export function useBulkDecision() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (input: BulkDecisionInput) =>
      apiPost<BulkDecisionResult>(
        `/organizations/${orgId}/decisions/bulk`,
        input,
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admission-decisions-list"] });
      queryClient.invalidateQueries({ queryKey: ["admission-decision"] });
      if (res.failed === 0)
        toast.success(`Done for ${res.succeeded} application(s)`);
      else toast.warning(`${res.succeeded} done, ${res.failed} failed`);
    },
    onError: onMutationError("Bulk action failed"),
  });
}

export function useDecisionPicklists() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["decision-picklists", orgId],
    queryFn: () =>
      apiGet<DecisionPicklists>(`/organizations/${orgId}/decisions/picklists`),
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

// ============================================================================
// SETTINGS & COMMITTEE TEAMS
// ============================================================================

export function useDecisionSettings() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["decision-settings", orgId],
    queryFn: () =>
      apiGet<DecisionSettings>(`/organizations/${orgId}/decisions/settings`),
    enabled: !!orgId,
  });
}

export function useUpdateDecisionSettings() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (input: UpdateDecisionSettingsInput) =>
      apiPatch<DecisionSettings>(
        `/organizations/${orgId}/decisions/settings`,
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decision-settings", orgId] });
      queryClient.invalidateQueries({
        queryKey: ["decision-picklists", orgId],
      });
      toast.success("Decision settings saved");
    },
    onError: onMutationError("Failed to save settings"),
  });
}

export function useCommitteeTeams() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["decision-committee-teams", orgId],
    queryFn: () =>
      getList<CommitteeTeam>(`/organizations/${orgId}/decisions/teams`),
    enabled: !!orgId,
  });
}

export function useSaveCommitteeTeam() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: ({ id, ...input }: CommitteeTeamInput & { id?: string }) =>
      id
        ? apiPatch<CommitteeTeam>(
            `/organizations/${orgId}/decisions/teams/${id}`,
            input,
          )
        : apiPost<CommitteeTeam>(
            `/organizations/${orgId}/decisions/teams`,
            input,
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["decision-committee-teams", orgId],
      });
      queryClient.invalidateQueries({
        queryKey: ["decision-picklists", orgId],
      });
      toast.success("Committee team saved");
    },
    onError: onMutationError("Failed to save committee team"),
  });
}

export function useDeleteCommitteeTeam() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/decisions/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["decision-committee-teams", orgId],
      });
      queryClient.invalidateQueries({
        queryKey: ["decision-picklists", orgId],
      });
      toast.success("Committee team deleted");
    },
    onError: onMutationError("Failed to delete committee team"),
  });
}

// ============================================================================
// OFFER LETTERS
// ============================================================================

export function useOfferLetter(applicationNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["offer-letter", orgId, applicationNo],
    queryFn: () =>
      apiGet<OfferLetter | null>(
        `/organizations/${orgId}/applications/${encodeURIComponent(applicationNo!)}/offer-letter`,
      ),
    enabled: !!orgId && !!applicationNo,
  });
}

export function useOfferHistory(applicationNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["offer-letter", orgId, applicationNo, "history"],
    queryFn: () =>
      getList<OfferLetter>(
        `/organizations/${orgId}/applications/${encodeURIComponent(applicationNo!)}/offer-letter/history`,
      ),
    enabled: !!orgId && !!applicationNo,
  });
}

export function useOfferList(
  filters: { status?: string; search?: string } = {},
) {
  const orgId = useOrgId();
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  return useQuery({
    queryKey: ["offer-letters-list", orgId, params],
    queryFn: () =>
      getList<OfferListRow>(`/organizations/${orgId}/offer-letters`, params),
    enabled: !!orgId,
  });
}

function useOfferMutation<TInput>(
  applicationNo: string | undefined,
  request: (base: string, input: TInput) => Promise<unknown>,
  success: string,
  failure: string,
) {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (input: TInput) =>
      request(
        `/organizations/${orgId}/applications/${encodeURIComponent(applicationNo || "")}/offer-letter`,
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["offer-letter", orgId, applicationNo],
      });
      queryClient.invalidateQueries({
        queryKey: ["offer-letters-list", orgId],
      });
      queryClient.invalidateQueries({
        queryKey: ["offer-acceptance", orgId, applicationNo],
      });
      queryClient.invalidateQueries({ queryKey: ["acceptances-list", orgId] });
      queryClient.invalidateQueries({ queryKey: ["waitlist-list", orgId] });
      toast.success(success);
    },
    onError: onMutationError(failure),
  });
}

export function useGenerateOfferLetter(applicationNo?: string) {
  return useOfferMutation<GenerateOfferLetterInput>(
    applicationNo,
    (base, input) => apiPost<OfferLetter>(`${base}/generate`, input),
    "Offer letter generated",
    "Failed to generate offer letter",
  );
}

export function useSendOfferLetter(applicationNo?: string) {
  return useOfferMutation<void>(
    applicationNo,
    (base) => apiPost<OfferLetter>(`${base}/send`),
    "Offer letter sent to the candidate",
    "Failed to send offer letter",
  );
}

export function useWithdrawOffer(applicationNo?: string) {
  return useOfferMutation<string | undefined>(
    applicationNo,
    (base, reason) => apiPost<OfferLetter>(`${base}/withdraw`, { reason }),
    "Offer letter withdrawn",
    "Failed to withdraw offer letter",
  );
}

export function useUploadOfferPdf(applicationNo?: string) {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: ({ offerId, file }: { offerId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(
        `/organizations/${orgId}/offer-letters/${offerId}/pdf`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["offer-letter", orgId, applicationNo],
      });
      queryClient.invalidateQueries({
        queryKey: ["offer-letters-list", orgId],
      });
      toast.success("Offer letter PDF uploaded");
    },
    onError: onMutationError("Failed to upload the PDF"),
  });
}

export function downloadOfferPdf(
  orgId: string,
  offerId: string,
  offerNo?: number,
) {
  return downloadAuthenticatedFile(
    `/organizations/${orgId}/offer-letters/${offerId}/pdf`,
    `Offer-Letter-${offerNo ?? offerId}.pdf`,
  );
}

export function downloadRejectionPdf(
  orgId: string,
  rejectionId: string,
  rejectionNo?: number,
) {
  return downloadAuthenticatedFile(
    `/organizations/${orgId}/rejections/${rejectionId}/pdf`,
    `Rejection-Letter-${rejectionNo ?? rejectionId}.pdf`,
  );
}

// ============================================================================
// LETTER TEMPLATES
// ============================================================================

export function useLetterTemplates(
  filters: { type?: string; status?: string } = {},
) {
  const orgId = useOrgId();
  const params: Record<string, string> = {};
  if (filters.type) params.type = filters.type;
  if (filters.status) params.status = filters.status;
  return useQuery({
    queryKey: ["letter-templates", orgId, params],
    queryFn: () =>
      getList<LetterTemplate>(
        `/organizations/${orgId}/letter-templates`,
        params,
      ),
    enabled: !!orgId,
  });
}

export function useLetterMergeFields() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["letter-merge-fields", orgId],
    queryFn: () =>
      getList<MergeField>(
        `/organizations/${orgId}/letter-templates/merge-fields`,
      ),
    enabled: !!orgId,
    staleTime: Infinity,
  });
}

export function useSaveLetterTemplate() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: Partial<LetterTemplateInput> & { id?: string }) =>
      id
        ? apiPatch<LetterTemplate>(
            `/organizations/${orgId}/letter-templates/${id}`,
            input,
          )
        : apiPost<LetterTemplate>(
            `/organizations/${orgId}/letter-templates`,
            input,
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letter-templates", orgId] });
      toast.success("Letter template saved");
    },
    onError: onMutationError("Failed to save letter template"),
  });
}

export function useDeleteLetterTemplate() {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/letter-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["letter-templates", orgId] });
      toast.success("Letter template deleted");
    },
    onError: onMutationError("Failed to delete letter template"),
  });
}

export function usePreviewLetterTemplate() {
  const orgId = useOrgId();
  return useMutation({
    mutationFn: (input: { bodyHtml: string; applicationNo?: string }) =>
      apiPost<{ html: string }>(
        `/organizations/${orgId}/letter-templates/preview`,
        input,
      ),
    onError: onMutationError("Failed to render preview"),
  });
}

export function downloadLetterPreviewPdf(
  orgId: string,
  bodyHtml: string,
  applicationNo?: string,
) {
  return downloadAuthenticatedFile(
    `/organizations/${orgId}/letter-templates/preview-pdf`,
    "Letter-Preview.pdf",
    "POST",
    { bodyHtml, ...(applicationNo ? { applicationNo } : {}) },
  );
}
