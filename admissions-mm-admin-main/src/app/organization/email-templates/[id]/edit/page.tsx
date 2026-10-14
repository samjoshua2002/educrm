"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { useEmailTemplate, useUpdateEmailTemplate } from "@/hooks/use-email-templates";
import { TemplateForm, canEditTemplate } from "../../_components/template-form";

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role) || "";
  const { data: template, isLoading } = useEmailTemplate(id);
  const update = useUpdateEmailTemplate();
  usePageHeader({ title: template ? `Edit template — ${template.name}` : "Edit template" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!template) {
    return (
      <div className="flex flex-col items-center gap-3 p-16">
        <p className="text-sm text-muted-foreground">Template not found.</p>
        <Button asChild variant="outline">
          <Link href="/organization/email-templates">Back to templates</Link>
        </Button>
      </div>
    );
  }
  if (!canEditTemplate(template, role) || !template.organizationId) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <p className="text-sm text-muted-foreground">
          {template.organizationId ? "Your role is not allowed to edit this template." : "System templates cannot be edited — duplicate it instead."}
        </p>
        <Button asChild variant="outline">
          <Link href="/organization/email-templates">Back to templates</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <TemplateForm
        key={template.id + (template.updatedAt || "")}
        initial={template}
        saving={update.isPending}
        onSubmit={(dto) => update.mutate({ id: template.id, dto }, { onSuccess: () => router.push("/organization/email-templates") })}
      />
    </div>
  );
}
