import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { useOrgId } from "@/hooks/use-application-tracker";
import type {
  ApplicationDocumentRecord,
  ApplicationDocumentsResponse,
  DocumentLogEntry,
  DocumentQueueResponse,
  DocumentRequirements,
} from "@/types/application-management";

const enc = (v: string) => encodeURIComponent(v);

function invalidateDocs(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["application-documents"] });
  qc.invalidateQueries({ queryKey: ["document-logs"] });
  qc.invalidateQueries({ queryKey: ["document-queue"] });
  qc.invalidateQueries({ queryKey: ["application-progress"] });
  qc.invalidateQueries({ queryKey: ["application-timeline"] });
  qc.invalidateQueries({ queryKey: ["application-tracker"] });
  qc.invalidateQueries({ queryKey: ["application-reminders"] });
}

export function useDocumentRequirements() {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["document-requirements", orgId],
    queryFn: () => apiGet<DocumentRequirements>(`/organizations/${orgId}/documents/requirements`),
    enabled: !!orgId,
  });
}

export function useApplicationDocuments(applicationIdOrNo?: string, includeHistory = false) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["application-documents", orgId, applicationIdOrNo, includeHistory],
    queryFn: () =>
      apiGet<ApplicationDocumentsResponse>(
        `/organizations/${orgId}/application-documents/${enc(applicationIdOrNo!)}`,
        includeHistory ? { includeHistory: "true" } : undefined,
      ),
    enabled: !!orgId && !!applicationIdOrNo,
  });
}

export function useDocumentLogs(applicationIdOrNo?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["document-logs", orgId, applicationIdOrNo],
    queryFn: () => apiGet<DocumentLogEntry[]>(`/organizations/${orgId}/application-documents/${enc(applicationIdOrNo!)}/logs`),
    enabled: !!orgId && !!applicationIdOrNo,
  });
}

export function useDocumentQueue(params: { verificationStatus?: string; documentType?: string; search?: string; page?: number; limit?: number }) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ["document-queue", orgId, params],
    queryFn: () => {
      const q: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== "all") q[k] = v;
      return apiGet<DocumentQueueResponse>(`/organizations/${orgId}/documents`, q);
    },
    enabled: !!orgId,
  });
}

/** Uploads the file to storage (/api/upload) and registers it as a new document version. */
export function useUploadApplicationDocument() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, documentType, file }: { applicationId: string; documentType: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", `application_documents/${documentType.replace(/\s+/g, "_").toLowerCase()}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      return apiPost<ApplicationDocumentRecord>(`/organizations/${orgId}/application-documents/${enc(applicationId)}`, {
        documentType,
        documentName: file.name,
        documentUrl: data.publicUrl || data.url,
        storageKey: data.key,
        mimeType: file.type === "image/jpg" ? "image/jpeg" : file.type,
        fileSize: file.size,
      });
    },
    onSuccess: (doc) => {
      invalidateDocs(qc);
      toast.success(`${doc?.documentType || "Document"} uploaded (version ${doc?.documentVersion ?? 1})`);
    },
    onError: (err: any) => {
      if (!err?.response) toast.error(err?.message || "Upload failed");
    },
  });
}

export function useVerifyDocument() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, action, reason }: { documentId: string; action: "approve" | "reject" | "request_reupload"; reason?: string }) =>
      apiPatch<ApplicationDocumentRecord>(`/organizations/${orgId}/documents/${documentId}/verify`, { action, reason }),
    onSuccess: (_d, vars) => {
      invalidateDocs(qc);
      toast.success(
        vars.action === "approve" ? "Document approved" : vars.action === "reject" ? "Document rejected" : "Re-upload requested",
      );
    },
  });
}
