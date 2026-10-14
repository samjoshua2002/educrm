"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Loader2,
  RefreshCcw,
  Upload,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useApplicationDocuments,
  useDocumentLogs,
  useUploadApplicationDocument,
  useVerifyDocument,
} from "@/hooks/use-application-documents";
import type { ApplicationDocumentRecord } from "@/types/application-management";

const pill = "font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center gap-1";

function StatusBadge({ doc }: { doc?: ApplicationDocumentRecord }) {
  if (!doc) return <span className={`bg-slate-500/10 text-slate-600 ${pill}`}>Not uploaded</span>;
  if (doc.reuploadRequired)
    return (
      <span className={`bg-orange-500/10 text-orange-700 ${pill}`}>
        <RefreshCcw className="size-3" /> Re-upload required
      </span>
    );
  if (doc.verificationStatus === "Approved")
    return (
      <span className={`bg-green-500/10 text-green-700 ${pill}`}>
        <CheckCircle2 className="size-3" /> Approved
      </span>
    );
  if (doc.verificationStatus === "Rejected")
    return (
      <span className={`bg-red-500/10 text-red-700 ${pill}`}>
        <XCircle className="size-3" /> Rejected
      </span>
    );
  return (
    <span className={`bg-yellow-500/10 text-yellow-700 ${pill}`}>
      <Clock className="size-3" /> Pending
    </span>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

function sizeLabel(bytes: number) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Document upload (student + staff) and verification (staff) for one application. */
export function DocumentsPanel({ applicationNo, isStudent }: { applicationNo: string; isStudent: boolean }) {
  const { data, isLoading } = useApplicationDocuments(applicationNo, true);
  const { data: logs } = useDocumentLogs(applicationNo);
  const upload = useUploadApplicationDocument();
  const verify = useVerifyDocument();
  const [uploadingType, setUploadingType] = React.useState<string | null>(null);
  const [reasonDialog, setReasonDialog] = React.useState<{ doc: ApplicationDocumentRecord; action: "reject" | "request_reupload" } | null>(null);
  const [reason, setReason] = React.useState("");
  const [showHistory, setShowHistory] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  const req = data.requirements;
  const latest = data.documents.filter((d) => d.isLatest);
  const history = (type: string) => data.documents.filter((d) => d.documentType === type && !d.isLatest);
  const accept = req.allowedExtensions.map((e) => `.${e}`).join(",");

  const onFile = async (type: string, file?: File | null) => {
    setError(null);
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!req.allowedExtensions.includes(ext) || !req.allowedMimeTypes.includes(file.type === "image/jpg" ? "image/jpeg" : file.type)) {
      setError(`${file.name}: only PDF, JPG and PNG files are allowed.`);
      return;
    }
    if (file.size > req.maxSizeMb * 1024 * 1024) {
      setError(`${file.name} is larger than the ${req.maxSizeMb} MB limit.`);
      return;
    }
    setUploadingType(type);
    try {
      await upload.mutateAsync({ applicationId: applicationNo, documentType: type, file });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Upload failed");
    } finally {
      setUploadingType(null);
      const input = fileInputs.current[type];
      if (input) input.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-[#FAFAFA] px-4 py-3">
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span>
            Required: <b>{data.progress.required.join(", ")}</b>
          </span>
          <span>
            Uploaded: <b>{data.progress.uploaded.length}</b>/{data.progress.required.length}
          </span>
          <span>
            Approved: <b>{data.progress.approved.length}</b>/{data.progress.required.length}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">PDF, JPG or PNG · max {req.maxSizeMb} MB per file</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4">
        {req.documentTypes.map((type) => {
          const doc = latest.find((d) => d.documentType === type);
          const required = req.requiredDocumentTypes.includes(type);
          const canUpload = !isStudent || !doc || doc.reuploadRequired || doc.verificationStatus !== "Approved";
          const older = history(type);
          return (
            <div key={type} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-9 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText className="size-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{type}</span>
                      {required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                      <StatusBadge doc={doc} />
                      {doc && <Badge variant="secondary" className="text-[10px]">v{doc.documentVersion}</Badge>}
                    </div>
                    {doc ? (
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-col gap-0.5">
                        <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline inline-flex items-center gap-1 truncate">
                          {doc.documentName} <ExternalLink className="size-3" />
                        </a>
                        <span>
                          DOC-{doc.documentId} · {sizeLabel(doc.fileSize)} · uploaded {fmt(doc.uploadDate)} by {doc.uploadedBy}
                        </span>
                        {doc.verificationDate && (
                          <span>
                            {doc.verificationStatus} by {doc.verifiedBy || "—"} on {fmt(doc.verificationDate)}
                          </span>
                        )}
                        {doc.rejectionReason && <span className="text-red-600">Reason: {doc.rejectionReason}</span>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">Not uploaded yet.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isStudent && doc && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                        disabled={verify.isPending || (doc.verificationStatus === "Approved" && !doc.reuploadRequired)}
                        onClick={() => verify.mutate({ documentId: doc.id, action: "approve" })}
                      >
                        <CheckCircle2 className="size-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        disabled={verify.isPending}
                        onClick={() => {
                          setReason("");
                          setReasonDialog({ doc, action: "reject" });
                        }}
                      >
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        disabled={verify.isPending || doc.reuploadRequired}
                        onClick={() => {
                          setReason("");
                          setReasonDialog({ doc, action: "request_reupload" });
                        }}
                      >
                        <RefreshCcw className="size-3.5" /> Request re-upload
                      </Button>
                    </>
                  )}
                  {canUpload && (
                    <>
                      <input
                        ref={(el) => {
                          fileInputs.current[type] = el;
                        }}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => onFile(type, e.target.files?.[0])}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                        disabled={uploadingType === type}
                        onClick={() => fileInputs.current[type]?.click()}
                      >
                        {uploadingType === type ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                        {doc ? "Upload new version" : "Upload"}
                      </Button>
                    </>
                  )}
                  {older.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setShowHistory(showHistory === type ? null : type)}>
                      <History className="size-3.5" /> {older.length} older
                    </Button>
                  )}
                </div>
              </div>
              {showHistory === type && older.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-2 flex flex-col gap-1.5 bg-slate-50/60">
                  {older.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <a href={o.documentUrl} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline">
                        v{o.documentVersion} · {o.documentName}
                      </a>
                      <span className="text-slate-500">
                        {fmt(o.uploadDate)} · {o.verificationStatus}
                        {o.rejectionReason ? ` · ${o.rejectionReason}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {logs && logs.length > 0 && (
        <div className="rounded-lg border border-slate-200">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-[#FAFAFA] text-xs font-bold uppercase tracking-wider text-slate-500">
            Verification log
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="px-4 py-2 text-xs flex flex-wrap justify-between gap-2">
                <span className="text-slate-700">
                  <b>{l.documentType}</b> v{l.documentVersion} · {l.action.replace(/_/g, " ")}
                  {l.previousStatus || l.newStatus ? ` (${l.previousStatus || "—"} → ${l.newStatus || "—"})` : ""}
                  {l.remarks ? ` · ${l.remarks}` : ""}
                </span>
                <span className="text-slate-400">
                  {l.actorName || l.actorRole || "System"} · {fmt(l.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!reasonDialog} onOpenChange={(v) => !v && setReasonDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{reasonDialog?.action === "reject" ? "Reject document" : "Request re-upload"}</DialogTitle>
            <DialogDescription>
              {reasonDialog?.doc.documentType} (v{reasonDialog?.doc.documentVersion}). The applicant sees this reason and is reminded to upload again.
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Image is blurred, marks not readable" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonDialog(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={!reason.trim() || verify.isPending}
              onClick={() =>
                reasonDialog &&
                verify.mutate(
                  { documentId: reasonDialog.doc.id, action: reasonDialog.action, reason: reason.trim() },
                  { onSuccess: () => setReasonDialog(null) },
                )
              }
            >
              {verify.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
