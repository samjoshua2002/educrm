"use client";

import { useRouter } from "next/navigation";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCreateEmailTemplate } from "@/hooks/use-email-templates";
import { TemplateForm } from "../_components/template-form";

export default function CreateTemplatePage() {
  usePageHeader({ title: "New template", description: "Email, SMS, WhatsApp or call-script template with merge fields." });
  const router = useRouter();
  const create = useCreateEmailTemplate();
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <TemplateForm
        saving={create.isPending}
        onSubmit={(dto) => create.mutate(dto, { onSuccess: () => router.push("/organization/email-templates") })}
      />
    </div>
  );
}
