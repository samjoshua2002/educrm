"use client";

import * as React from "react";

import { Download, Eye, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadLetterPreviewPdf,
  useDeleteLetterTemplate,
  useLetterMergeFields,
  useLetterTemplates,
  usePreviewLetterTemplate,
  useSaveLetterTemplate,
  type LetterTemplate,
  type LetterTemplateStatus,
  type LetterTemplateType,
} from "@/hooks/use-admission-decisions";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { LETTER_TEMPLATE_TYPE_LABELS } from "@/types/admission-decisions";

const VIEW_ROLES = [
  "superadmin",
  "org_admin",
  "application_manager",
  "exam_manager",
  "counselor",
];
const EDIT_ROLES = ["superadmin", "org_admin", "application_manager"];

const TYPE_STYLES: Record<LetterTemplateType, string> = {
  offer:
    "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  waitlist:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  rejection: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

const TH =
  "py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap";
const TD = "py-4 px-6 align-middle text-sm";

interface FormState {
  id?: string;
  name: string;
  type: LetterTemplateType;
  subject: string;
  bodyHtml: string;
  status: LetterTemplateStatus;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  type: "offer",
  subject: "",
  bodyHtml: "",
  status: "active",
  isDefault: false,
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LetterTemplatesPage() {
  usePageHeader({
    title: "Letter Templates",
    description:
      "Offer, waitlist and rejection letters with merge fields. Letters are generated as PDF from these templates.",
  });

  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;
  const canView = !!user && VIEW_ROLES.includes(user.role);
  const canEdit = !!user && EDIT_ROLES.includes(user.role);

  const [typeFilter, setTypeFilter] = React.useState("all");
  const { data: templates = [], isLoading } = useLetterTemplates({
    type: typeFilter === "all" ? undefined : typeFilter,
  });
  const { data: mergeFields = [] } = useLetterMergeFields();
  const save = useSaveLetterTemplate();
  const remove = useDeleteLetterTemplate();
  const preview = usePreviewLetterTemplate();

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
  const [previewAppNo, setPreviewAppNo] = React.useState("");
  const [deleting, setDeleting] = React.useState<LetterTemplate | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  function openEditor(t: LetterTemplate | null) {
    setForm(
      t
        ? {
            id: t.id,
            name: t.name,
            type: t.type,
            subject: t.subject ?? "",
            bodyHtml: t.bodyHtml,
            status: t.status,
            isDefault: t.isDefault,
          }
        : EMPTY_FORM,
    );
    setPreviewHtml(null);
    setOpen(true);
  }

  function insertField(key: string) {
    const token = `{{${key}}}`;
    const el = bodyRef.current;
    if (!el) {
      setForm((f) => ({ ...f, bodyHtml: f.bodyHtml + token }));
      return;
    }
    const start = el.selectionStart ?? form.bodyHtml.length;
    const end = el.selectionEnd ?? start;
    const next =
      form.bodyHtml.slice(0, start) + token + form.bodyHtml.slice(end);
    setForm((f) => ({ ...f, bodyHtml: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function submit() {
    save.mutate(
      {
        id: form.id,
        name: form.name.trim(),
        type: form.type,
        subject: form.subject.trim() || undefined,
        bodyHtml: form.bodyHtml,
        status: form.status,
        isDefault: form.isDefault,
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  function runPreview() {
    preview.mutate(
      {
        bodyHtml: form.bodyHtml,
        applicationNo: previewAppNo.trim() || undefined,
      },
      { onSuccess: (res) => setPreviewHtml(res.html) },
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 px-4 text-center">
        <p className="text-sm font-semibold text-foreground">
          Access restricted
        </p>
        <p className="text-xs text-muted-foreground">
          Only organization staff can view letter templates.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-[200px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(LETTER_TEMPLATE_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit && (
          <Button
            size="sm"
            className="gap-1.5 w-fit"
            onClick={() => openEditor(null)}
          >
            <Plus className="size-3.5" />
            New template
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className={TH}>Template</TableHead>
              <TableHead className={TH}>Type</TableHead>
              <TableHead className={TH}>Status</TableHead>
              <TableHead className={TH}>Version</TableHead>
              <TableHead className={TH}>Updated</TableHead>
              <TableHead className={`${TH} text-right`}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Loading templates...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    No letter templates
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create one with New template.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t) => (
                <TableRow
                  key={t.id}
                  className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                >
                  <TableCell className={TD}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        {t.name}
                        {t.isDefault && (
                          <Star
                            className="size-3.5 text-amber-500 fill-amber-500"
                            aria-label="Default"
                          />
                        )}
                      </span>
                      {t.subject && (
                        <span className="text-xs text-muted-foreground">
                          {t.subject}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={TD}>
                    <Badge
                      className={`${TYPE_STYLES[t.type]} font-medium px-2.5 py-0.5 rounded-full text-xs border-0`}
                    >
                      {LETTER_TEMPLATE_TYPE_LABELS[t.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className={TD}>
                    <Badge
                      className={`${
                        t.status === "active"
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : "bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300"
                      } font-medium px-2.5 py-0.5 rounded-full text-xs border-0 capitalize`}
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={TD}>v{t.version}</TableCell>
                  <TableCell className={TD}>
                    {formatDate(t.updatedAt)}
                  </TableCell>
                  <TableCell className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => openEditor(t)}
                      >
                        {canEdit ? (
                          <Pencil className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                        {canEdit ? "Edit" : "View"}
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-red-700"
                          onClick={() => setDeleting(t)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Edit letter template" : "New letter template"}
            </DialogTitle>
            <DialogDescription>
              Write the letter in HTML. Merge fields such as {"{{Name}}"} are
              replaced with the applicant&apos;s details when the letter is
              generated. Changing the subject or body creates a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
            <div className="flex flex-col gap-3 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={form.name}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select
                    value={form.type}
                    disabled={!canEdit}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, type: v as LetterTemplateType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LETTER_TEMPLATE_TYPE_LABELS).map(
                        ([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Email subject
                </Label>
                <Input
                  value={form.subject}
                  disabled={!canEdit}
                  placeholder="e.g. Your offer of admission to {{Program}}"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Body (HTML)
                </Label>
                <Textarea
                  ref={bodyRef}
                  rows={16}
                  className="font-mono text-xs"
                  value={form.bodyHtml}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bodyHtml: e.target.value }))
                  }
                  placeholder={
                    "<p>Dear {{Name}},</p>\n<p>We are pleased to offer you admission to {{Program}}...</p>"
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm">Active</span>
                  <Switch
                    checked={form.status === "active"}
                    disabled={!canEdit}
                    onCheckedChange={(c) =>
                      setForm((f) => ({
                        ...f,
                        status: c ? "active" : "inactive",
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span className="text-sm">Default for this type</span>
                  <Switch
                    checked={form.isDefault}
                    disabled={!canEdit}
                    onCheckedChange={(c) =>
                      setForm((f) => ({ ...f, isDefault: c }))
                    }
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Preview with application no. (optional)
                    </Label>
                    <Input
                      value={previewAppNo}
                      onChange={(e) => setPreviewAppNo(e.target.value)}
                      placeholder="Leave empty to show field names"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!form.bodyHtml.trim() || preview.isPending}
                    onClick={runPreview}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!form.bodyHtml.trim() || !orgId}
                    onClick={() =>
                      orgId &&
                      downloadLetterPreviewPdf(
                        orgId,
                        form.bodyHtml,
                        previewAppNo.trim() || undefined,
                      )
                    }
                  >
                    <Download className="size-3.5" />
                    PDF
                  </Button>
                </div>
                {previewHtml !== null && (
                  <div
                    className="rounded-md border border-border bg-muted/20 p-4 text-sm max-h-[320px] overflow-auto [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Merge fields
              </p>
              <div className="flex flex-col gap-1 max-h-[520px] overflow-auto">
                {mergeFields.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => insertField(m.key)}
                    className="text-left rounded-md border border-border px-2.5 py-1.5 hover:bg-muted/40 disabled:opacity-60"
                  >
                    <span className="block font-mono text-xs text-primary">{`{{${m.key}}}`}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {m.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button
                onClick={submit}
                disabled={
                  !form.name.trim() || !form.bodyHtml.trim() || save.isPending
                }
              >
                {save.isPending ? "Saving..." : "Save template"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              {deleting?.name} will be removed. Letters already generated keep
              their PDF.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
