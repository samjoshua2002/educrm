"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Copy,
  EllipsisVertical,
  Eye,
  FileText,
  FolderCog,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import {
  renderTemplate,
  useApproveTemplate,
  useArchiveTemplate,
  useDeleteEmailTemplate,
  useDuplicateEmailTemplate,
  useEmailTemplates,
  useRestoreTemplate,
  useSendTemplatedEmail,
} from "@/hooks/use-email-templates";
import { TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES, TEMPLATE_TYPES, type CommTemplate } from "@/types/communications";
import {
  EmptyState,
  Field,
  Pager,
  StatCard,
  StatusPill,
  Th,
  formatDate,
  formatDateTime,
  pill,
  tableHeaderClass,
  tableShell,
} from "../communications/_components/comm-ui";
import { SAMPLE_CONTEXT, canEditTemplate } from "./_components/template-form";

const PAGE_SIZE = 15;

export default function EmailTemplatesPage() {
  usePageHeader({
    title: "Templates",
    description: "Approved, reusable Email / SMS / WhatsApp / call-script templates with merge fields.",
  });
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role) || "";
  const isAdmin = role === "org_admin" || role === "superadmin";

  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("all");
  const [templateCategory, setTemplateCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [language, setLanguage] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const { data: templates = [], isLoading } = useEmailTemplates(undefined, undefined, undefined, { type, templateCategory, language });

  const approve = useApproveTemplate();
  const archive = useArchiveTemplate();
  const restore = useRestoreTemplate();
  const duplicate = useDuplicateEmailTemplate();
  const del = useDeleteEmailTemplate();
  const [preview, setPreview] = React.useState<CommTemplate | null>(null);
  const [testFor, setTestFor] = React.useState<CommTemplate | null>(null);
  const [deleting, setDeleting] = React.useState<CommTemplate | null>(null);

  const filtered = templates.filter((t) => {
    const st = t.status === "active" ? "approved" : t.status;
    if (status !== "all" && st !== status) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (![t.name, t.subject, t.category, t.templateCategory, t.body].some((x) => (x || "").toLowerCase().includes(q))) return false;
    }
    return true;
  });
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = (s: string) => templates.filter((t) => (t.status === "active" ? "approved" : t.status) === s).length;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="size-5" />} label="Total" value={templates.length} />
        <StatCard
          icon={<CheckCircle2 className="size-5" />}
          label="Approved"
          value={count("approved")}
          color="#059669"
          bg="#ECFDF5"
          ratio={templates.length ? count("approved") / templates.length : 0}
        />
        <StatCard
          icon={<Pencil className="size-5" />}
          label="Draft"
          value={count("draft")}
          color="#D97706"
          bg="#FFFBEB"
          ratio={templates.length ? count("draft") / templates.length : 0}
          hint={isAdmin ? "Awaiting your approval" : "Awaiting admin approval"}
        />
        <StatCard
          icon={<Archive className="size-5" />}
          label="Archived"
          value={count("archived")}
          color="#475569"
          bg="#F1F5F9"
          ratio={templates.length ? count("archived") / templates.length : 0}
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search templates…"
            className="h-10 pr-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Search className="absolute right-3 top-3 size-4 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Filter value={type} onChange={(v) => (setType(v), setPage(1))} all="All types" options={TEMPLATE_TYPES} />
          <Filter value={templateCategory} onChange={(v) => (setTemplateCategory(v), setPage(1))} all="All categories" options={TEMPLATE_CATEGORIES} />
          <Filter
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            all="All statuses"
            options={["draft", "approved", "archived"]}
            labels={{ draft: "Draft", approved: "Approved", archived: "Archived" }}
          />
          <Filter value={language} onChange={(v) => (setLanguage(v), setPage(1))} all="All languages" options={TEMPLATE_LANGUAGES} />
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-10 gap-1.5">
            <Link href="/organization/email-templates/categories">
              <FolderCog className="size-4" /> Lifecycle categories
            </Link>
          </Button>
          <Button asChild className="h-10 gap-1.5">
            <Link href="/organization/email-templates/create">
              <Plus className="size-4" /> New template
            </Link>
          </Button>
        </div>
      </div>

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th>Template</Th>
              <Th>Type</Th>
              <Th>Category</Th>
              <Th>Language</Th>
              <Th>Version</Th>
              <Th>Status</Th>
              <Th>Created by</Th>
              <Th>Approved by</Th>
              <Th>Last modified</Th>
              <Th className="text-right"> </Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="inline size-4 animate-spin mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    title="No templates found"
                    action={
                      <Button asChild size="sm">
                        <Link href="/organization/email-templates/create">Create a template</Link>
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => {
                const st = t.status === "active" ? "approved" : t.status;
                const editable = canEditTemplate(t, role);
                return (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setPreview(t)}>
                    <TableCell className="px-4 max-w-[300px]">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {t.channel === "Email" ? t.subject : t.body}
                      </p>
                    </TableCell>
                    <TableCell className="px-4">
                      <span className={t.channel === "Email" ? pill.blue : t.channel === "SMS" ? pill.purple : t.channel === "WhatsApp" ? pill.green : pill.amber}>
                        {t.channel}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-xs">
                      <p>{t.templateCategory || "—"}</p>
                      {t.category && <p className="text-[11px] text-muted-foreground">{t.category}</p>}
                    </TableCell>
                    <TableCell className="px-4 text-xs">{t.language || "English"}</TableCell>
                    <TableCell className="px-4 text-xs">v{t.versionNumber || 1}</TableCell>
                    <TableCell className="px-4">
                      <StatusPill status={st} />
                    </TableCell>
                    <TableCell className="px-4 text-xs">{t.createdByName || (t.organizationId ? "—" : "System")}</TableCell>
                    <TableCell className="px-4 text-xs">
                      {t.approvedByName ? (
                        <>
                          <p>{t.approvedByName}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDate(t.approvedAt)}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-xs whitespace-nowrap">{formatDateTime(t.updatedAt)}</TableCell>
                    <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreview(t)}>
                            <Eye className="size-4" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={!editable || !t.organizationId} onClick={() => router.push(`/organization/email-templates/${t.id}/edit`)}>
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate.mutate(t.id)}>
                            <Copy className="size-4" /> Duplicate
                          </DropdownMenuItem>
                          {t.channel === "Email" && st === "approved" && (
                            <DropdownMenuItem onClick={() => setTestFor(t)}>
                              <Send className="size-4" /> Send test email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {isAdmin && st === "draft" && (
                            <DropdownMenuItem onClick={() => approve.mutate(t.id)}>
                              <CheckCircle2 className="size-4" /> Approve
                            </DropdownMenuItem>
                          )}
                          {st !== "archived" && editable && t.organizationId && (
                            <DropdownMenuItem onClick={() => archive.mutate(t.id)}>
                              <Archive className="size-4" /> Archive
                            </DropdownMenuItem>
                          )}
                          {st === "archived" && editable && (
                            <DropdownMenuItem onClick={() => restore.mutate(t.id)}>
                              <RotateCcw className="size-4" /> Restore as draft
                            </DropdownMenuItem>
                          )}
                          {isAdmin && t.organizationId && (
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(t)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Pager page={page} limit={PAGE_SIZE} total={filtered.length} onPage={setPage} />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {preview?.name} <span className="text-xs text-muted-foreground font-normal">v{preview?.versionNumber || 1}</span>
            </DialogTitle>
          </DialogHeader>
          {preview && <TemplatePreview t={preview} />}
        </DialogContent>
      </Dialog>

      {testFor && <TestSendDialog t={testFor} onClose={() => setTestFor(null)} />}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.name}” will be removed permanently. Archive it instead to keep its history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplatePreview({ t }: { t: CommTemplate }) {
  const r = (s?: string | null) => renderTemplate(s || "", SAMPLE_CONTEXT);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={pill.blue}>{t.channel}</span>
        {t.templateCategory && <span className={pill.purple}>{t.templateCategory}</span>}
        <StatusPill status={t.status === "active" ? "approved" : t.status} />
        <span className={pill.gray}>{t.language}</span>
      </div>
      {t.channel === "Email" && (
        <p className="text-sm">
          <span className="text-muted-foreground">Subject:</span> <strong>{r(t.subject)}</strong>
        </p>
      )}
      <div className="rounded-[8px] border border-border p-4 text-sm whitespace-pre-wrap break-words bg-muted/20">
        {t.header && <div className="mb-3 text-muted-foreground">{r(t.header)}</div>}
        {r(t.body)}
        {t.signature && <div className="mt-4">{r(t.signature)}</div>}
        {t.footer && <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{r(t.footer)}</div>}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Merge fields used: {(t.variables || []).length ? t.variables.join(", ") : "none"} · Editable by:{" "}
        {(t.editableByRoles || []).join(", ") || "org_admin"}
      </p>
    </div>
  );
}

function TestSendDialog({ t, onClose }: { t: CommTemplate; onClose: () => void }) {
  const send = useSendTemplatedEmail();
  const [to, setTo] = React.useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Send test email</DialogTitle>
        </DialogHeader>
        <Field label="Recipient email" required>
          <Input className="h-10" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <p className="text-xs text-muted-foreground">Merge fields are filled with sample values.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!/\S+@\S+\.\S+/.test(to) || send.isPending}
            onClick={() =>
              send.mutate(
                {
                  to,
                  subject: `[TEST] ${renderTemplate(t.subject, SAMPLE_CONTEXT)}`,
                  body: renderTemplate(t.body, SAMPLE_CONTEXT),
                  header: t.header ? renderTemplate(t.header, SAMPLE_CONTEXT) : undefined,
                  footer: t.footer ? renderTemplate(t.footer, SAMPLE_CONTEXT) : undefined,
                  signature: t.signature ? renderTemplate(t.signature, SAMPLE_CONTEXT) : undefined,
                  category: t.category,
                  templateId: t.id,
                },
                { onSuccess: onClose },
              )
            }
          >
            {send.isPending && <Loader2 className="size-4 animate-spin" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Filter({
  value,
  onChange,
  options,
  all,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  all: string;
  labels?: Record<string, string>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[150px] h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labels?.[o] || o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
