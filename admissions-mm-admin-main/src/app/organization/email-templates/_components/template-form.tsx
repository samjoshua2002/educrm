"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { renderTemplate, useMergeFields } from "@/hooks/use-email-templates";
import { useEmailTemplateCategories } from "@/hooks/use-email-template-categories";
import {
  EDITABLE_ROLES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANGUAGES,
  TEMPLATE_MERGE_FIELDS,
  TEMPLATE_TYPES,
  type CommTemplate,
  type CommTemplateInput,
} from "@/types/communications";
import { Field, ReadOnlyField, SectionCard, StatusPill, formatDateTime, pill } from "../../communications/_components/comm-ui";
import { cn } from "@/lib/utils";

export const SAMPLE_CONTEXT: Record<string, string> = {
  name: "Aarav Sharma",
  student: "Aarav Sharma",
  first_name: "Aarav",
  program: "PGDM 2026-28",
  course: "PGDM 2026-28",
  application_id: "APP-2026-00123",
  application_no: "APP-2026-00123",
  date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  link: "https://portal.example.edu/apply",
  sender: "Admissions Office",
};

/** Role-based editing rights: org_admin always; others when listed on the template. */
export function canEditTemplate(t: Pick<CommTemplate, "editableByRoles" | "organizationId">, role: string) {
  if (role === "org_admin" || role === "superadmin") return true;
  return (t.editableByRoles || ["org_admin", "application_manager"]).includes(role);
}

type Part = "subject" | "header" | "body" | "footer" | "signature";

export function TemplateForm({
  initial,
  onSubmit,
  saving,
}: {
  initial?: CommTemplate | null;
  onSubmit: (dto: CommTemplateInput) => void;
  saving?: boolean;
}) {
  const role = useAuthStore((s) => s.user?.role) || "";
  const isAdmin = role === "org_admin" || role === "superadmin";
  const { data: categories = [] } = useEmailTemplateCategories();
  const { data: mergeFields = [] } = useMergeFields();

  const [form, setForm] = React.useState({
    name: initial?.name || "",
    channel: initial?.channel || "Email",
    templateCategory: initial?.templateCategory || "Reminder",
    categoryId: initial?.categoryId || "",
    language: initial?.language || "English",
    description: initial?.description || "",
    subject: initial?.subject || "",
    header: initial?.header || "",
    body: initial?.body || "",
    footer: initial?.footer || "",
    signature: initial?.signature || "",
    status: initial ? (initial.status === "active" ? "approved" : initial.status) : "draft",
    editableByRoles: initial?.editableByRoles?.length ? initial.editableByRoles : ["org_admin", "application_manager"],
  });
  const [focus, setFocus] = React.useState<Part>("body");
  const refs = {
    subject: React.useRef<HTMLInputElement>(null),
    header: React.useRef<HTMLTextAreaElement>(null),
    body: React.useRef<HTMLTextAreaElement>(null),
    footer: React.useRef<HTMLTextAreaElement>(null),
    signature: React.useRef<HTMLTextAreaElement>(null),
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const insertTag = (tag: string) => {
    const el = refs[focus].current;
    const cur = form[focus] || "";
    if (!el) return set(focus, `${cur}${tag}` as any);
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? cur.length;
    set(focus, `${cur.slice(0, start)}${tag}${cur.slice(end)}` as any);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const isEmail = form.channel === "Email";
  const lifecycle = categories.find((c) => c.id === form.categoryId);
  const tags = Array.from(
    new Set([
      ...(mergeFields.length ? mergeFields.map((m) => m.tag) : TEMPLATE_MERGE_FIELDS),
      ...(lifecycle?.variables || []).map((v) => v.tag),
    ]),
  );

  const valid = form.name.trim() && form.body.trim() && (!isEmail || form.subject.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      name: form.name.trim(),
      channel: form.channel,
      templateCategory: form.templateCategory,
      categoryId: form.categoryId || undefined,
      category: lifecycle?.name || form.templateCategory,
      language: form.language,
      description: form.description || undefined,
      subject: isEmail ? form.subject : "",
      header: form.header || undefined,
      body: form.body,
      footer: form.footer || undefined,
      signature: form.signature || undefined,
      status: form.status,
      editableByRoles: isAdmin ? form.editableByRoles : undefined,
    });
  };

  const chars = form.body.length;

  return (
    <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-8 flex flex-col gap-4">
        <SectionCard title="Template information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Template name" required className="sm:col-span-2">
              <Input className="h-10" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Template type" required>
              <Select value={form.channel} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category" required>
              <Select value={form.templateCategory} onValueChange={(v) => set("templateCategory", v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Language">
              <Select value={form.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([form.language, ...TEMPLATE_LANGUAGES])).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lifecycle trigger (automatic emails)" hint="Optional — used for system emails such as application submitted.">
              <Select value={form.categoryId || "none"} onValueChange={(v) => set("categoryId", v === "none" ? "" : v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Input className="h-10" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Content"
          description="Click a merge field to insert it where the cursor is."
          actions={<span className={pill.gray}>{isEmail ? "Email" : form.channel}</span>}
        >
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => insertTag(t)} className={cn(pill.blue, "cursor-pointer hover:opacity-80")}>
                {t}
              </button>
            ))}
          </div>
          {isEmail && (
            <Field label="Subject line" required>
              <Input ref={refs.subject} className="h-10" value={form.subject} onFocus={() => setFocus("subject")} onChange={(e) => set("subject", e.target.value)} />
            </Field>
          )}
          <Field label="Header">
            <Textarea ref={refs.header} rows={2} value={form.header} onFocus={() => setFocus("header")} onChange={(e) => set("header", e.target.value)} />
          </Field>
          <Field
            label={form.channel === "Call Script" ? "Call script" : "Body content"}
            required
            hint={!isEmail && form.channel !== "Call Script" ? `${chars} characters${form.channel === "SMS" ? ` · ${Math.max(1, Math.ceil(chars / 160))} SMS segment(s)` : ""}` : undefined}
          >
            <Textarea ref={refs.body} rows={isEmail ? 12 : 8} value={form.body} onFocus={() => setFocus("body")} onChange={(e) => set("body", e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Signature">
              <Textarea ref={refs.signature} rows={3} value={form.signature} onFocus={() => setFocus("signature")} onChange={(e) => set("signature", e.target.value)} />
            </Field>
            <Field label="Footer">
              <Textarea ref={refs.footer} rows={3} value={form.footer} onFocus={() => setFocus("footer")} onChange={(e) => set("footer", e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Preview" description="Merge fields filled with sample values.">
          {isEmail && (
            <p className="text-sm">
              <span className="text-muted-foreground">Subject:</span> <strong>{renderTemplate(form.subject, SAMPLE_CONTEXT) || "—"}</strong>
            </p>
          )}
          <div className="rounded-[8px] border border-border p-4 text-sm whitespace-pre-wrap break-words bg-muted/20">
            {form.header && <div className="mb-3 text-muted-foreground">{renderTemplate(form.header, SAMPLE_CONTEXT)}</div>}
            {renderTemplate(form.body, SAMPLE_CONTEXT) || <span className="text-muted-foreground">Body preview…</span>}
            {form.signature && <div className="mt-4">{renderTemplate(form.signature, SAMPLE_CONTEXT)}</div>}
            {form.footer && <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{renderTemplate(form.footer, SAMPLE_CONTEXT)}</div>}
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-4">
        <SectionCard title="Status & control">
          <Field
            label="Status"
            hint={isAdmin ? "Only organization admins can approve." : "An organization admin must approve before the template can be used."}
          >
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved" disabled={!isAdmin}>
                  Approved
                </SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role-based editing rights" hint={isAdmin ? "Organization admins can always edit." : "Only an organization admin can change this."}>
            <div className="flex flex-col gap-2">
              {EDITABLE_ROLES.map((r) => {
                const on = form.editableByRoles.includes(r.value);
                return (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={on || r.value === "org_admin"}
                      disabled={!isAdmin || r.value === "org_admin"}
                      onCheckedChange={(c) =>
                        set("editableByRoles", c ? [...form.editableByRoles, r.value] : form.editableByRoles.filter((x) => x !== r.value))
                      }
                    />
                    {r.label}
                  </label>
                );
              })}
            </div>
          </Field>
          {initial && (
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="Template ID" value={<span className="font-mono text-[11px]">{initial.id}</span>} />
              <ReadOnlyField label="Version number" value={`v${initial.versionNumber || 1}`} />
              <ReadOnlyField label="Current status" value={<StatusPill status={initial.status === "active" ? "approved" : initial.status} />} />
              <ReadOnlyField label="Created by" value={initial.createdByName} />
              <ReadOnlyField label="Approved by" value={initial.approvedByName} />
              <ReadOnlyField label="Approval date" value={initial.approvedAt ? formatDateTime(initial.approvedAt) : null} />
              <ReadOnlyField label="Last modified" value={formatDateTime(initial.updatedAt)} />
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button type="submit" disabled={!valid || saving} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save template
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/email-templates">Cancel</Link>
            </Button>
          </div>
          {initial && <p className="text-[11px] text-muted-foreground">Changing the subject, header, body, footer or signature creates a new version.</p>}
        </SectionCard>
      </div>
    </form>
  );
}
