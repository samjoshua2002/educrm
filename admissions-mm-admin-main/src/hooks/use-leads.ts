import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiDelete, apiPatch, apiPost } from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import type { LeadActivity, ScoreBreakdownItem, TouchPoint } from "@/types/lead-management";

export interface Lead {
  id: string;
  organizationId: string;
  branchId?: string;
  branch?: { id: string; name: string };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  source?: string;
  sourceDetail?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  formId?: string;
  form?: { id: string; name: string; fields?: any[] };
  campaignId?: string;
  isDuplicate: boolean;
  duplicateCount: number;
  rawPayload: any;
  assignedTo?: string | null;
  assignedAt?: string;
  createdAt: string;
  status: string; // 'unverified' | 'verified' | 'disqualified'
  scoreBand?: string;
  nextFollowUpAt?: string;
  assignedToUser?: { id: string; name: string; role?: string } | null;
  // ---- standardized "Fields to capture" ----
  dateOfBirth?: string | null;
  studentId?: string | null;
  channelSource?: string | null;
  formName?: string | null;
  courseId?: string | null;
  course?: { id: string; name: string } | null;
  programInterest?: string | null;
  intake?: string | null;
  intakeSessionId?: string | null;
  // ---- source tracking ----
  sourceType?: string | null;
  subSource?: string | null;
  campaignName?: string | null;
  createdFrom?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  submissionUrl?: string | null;
  referrerUrl?: string | null;
  firstTouch?: TouchPoint | null;
  lastTouch?: TouchPoint | null;
  touchCount?: number;
  // ---- scoring ----
  score?: number | null;
  academicScore?: number | null;
  engagementScore?: number | null;
  lastScoredAt?: string | null;
  scoreBreakdown?: ScoreBreakdownItem[] | null;
  engagement?: Record<string, number>;
  emailBounced?: boolean;
  testType?: string | null;
  testScore?: number | null;
  gpa?: number | null;
  workExperienceYears?: number | null;
  // ---- routing ----
  assignmentRule?: string | null;
  followUpStatus?: string | null;
  // ---- duplicates ----
  masterLeadId?: string | null;
  mergedAt?: string | null;
  duplicateConfidence?: number | null;
  duplicateReason?: string | null;
}

export function useLeads(
  page: number = 1,
  limit: number = 10,
  search?: string,
  explicitOrgId?: string,
  status?: string,
  filters?: {
    assignedTo?: string;
    scoreBand?: string;
    state?: string;
    city?: string;
    source?: string;
    campaign?: string;
    stage?: string;
    sortOrder?: string;
    sortBy?: string;
    channelSource?: string;
    sourceType?: string;
    createdFrom?: string;
    followUpStatus?: string;
    campaignId?: string;
    duplicates?: boolean;
  }
) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useQuery({
    queryKey: ["leads", { orgId, page, limit, search, status, filters }],
    queryFn: () =>
      apiGet<PaginatedResponse<Lead>>(`/organizations/${orgId}/leads`, {
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        assignedTo: filters?.assignedTo || undefined,
        scoreBand: filters?.scoreBand || undefined,
        state: filters?.state || undefined,
        city: filters?.city || undefined,
        source: filters?.source || undefined,
        campaign: filters?.campaign || undefined,
        stage: filters?.stage || undefined,
        sortOrder: filters?.sortOrder || undefined,
        sortBy: filters?.sortBy || undefined,
        channelSource: filters?.channelSource || undefined,
        sourceType: filters?.sourceType || undefined,
        createdFrom: filters?.createdFrom || undefined,
        followUpStatus: filters?.followUpStatus || undefined,
        campaignId: filters?.campaignId || undefined,
        duplicates: filters?.duplicates ? "true" : undefined,
      }),
    enabled: !!orgId,
  });
}


export function useLead(leadId?: string, explicitOrgId?: string) {
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useQuery({
    queryKey: ["leads", leadId, { orgId }],
    queryFn: () => apiGet<Lead>(`/organizations/${orgId}/leads/${leadId}`),
    enabled: !!orgId && !!leadId,
  });
}

export function useCreateLead(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      apiPost(`/organizations/${orgId}/leads`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create lead");
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: Partial<Lead> }) =>
      apiPatch(`/organizations/${orgId}/leads/${leadId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update lead");
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = currentUser?.organizationId;

  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      apiPatch(`/organizations/${orgId}/leads/${leadId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead status updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update lead status",
      );
    },
  });
}

export function useDeleteLead(explicitOrgId?: string) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const orgId = explicitOrgId || currentUser?.organizationId;

  return useMutation({
    mutationFn: (leadId: string) =>
      apiDelete(`/organizations/${orgId}/leads/${leadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete lead");
    },
  });
}

// ---- scoring / routing / follow-up actions on a single lead ----------------

function useLeadAction<V>(fn: (orgId: string, v: V) => Promise<any>, success: string, failure: string) {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((state) => state.user?.organizationId);
  return useMutation({
    mutationFn: (v: V) => fn(orgId as string, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities"] });
      toast.success(success);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || failure);
    },
  });
}

export function useLeadActivities(leadId?: string | null) {
  const orgId = useAuthStore((state) => state.user?.organizationId);
  return useQuery({
    queryKey: ["lead-activities", orgId, leadId],
    // The API returns an array, which the response interceptor turns into { data, pagination }.
    queryFn: async () => {
      const res: any = await apiGet<LeadActivity[]>(`/organizations/${orgId}/leads/${leadId}/activities`);
      return (Array.isArray(res) ? res : res?.data ?? []) as LeadActivity[];
    },
    enabled: !!orgId && !!leadId,
  });
}

/** Manual (re)assignment — the API keeps the assignment history. */
export function useAssignLead() {
  return useLeadAction<{ leadId: string; assignedTo: string; reason?: string }>(
    (orgId, { leadId, ...data }) => apiPatch(`/organizations/${orgId}/leads/${leadId}/assign`, data),
    "Lead assigned",
    "Failed to assign lead",
  );
}

/** Re-runs the routing rules for the lead. */
export function useRerouteLead() {
  return useLeadAction<string>(
    (orgId, leadId) => apiPost(`/organizations/${orgId}/leads/${leadId}/reroute`),
    "Lead re-routed by the assignment rules",
    "Failed to re-route lead",
  );
}

export function useRescoreLead() {
  return useLeadAction<string>(
    (orgId, leadId) => apiPost(`/organizations/${orgId}/leads/${leadId}/rescore`),
    "Lead rescored",
    "Failed to rescore lead",
  );
}

export function useRecordEngagement() {
  return useLeadAction<{ leadId: string; type: string; count?: number; note?: string }>(
    (orgId, { leadId, ...data }) => apiPost(`/organizations/${orgId}/leads/${leadId}/engagement`, data),
    "Engagement recorded and lead rescored",
    "Failed to record engagement",
  );
}

export function useUpdateFollowUpStatus() {
  return useLeadAction<{ leadId: string; followUpStatus: string; nextFollowUpAt?: string }>(
    (orgId, { leadId, ...data }) => apiPatch(`/organizations/${orgId}/leads/${leadId}/follow-up-status`, data),
    "Follow-up status updated",
    "Failed to update follow-up status",
  );
}
