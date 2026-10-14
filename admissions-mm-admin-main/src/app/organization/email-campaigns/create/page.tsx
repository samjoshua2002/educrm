"use client";

import { useRouter } from "next/navigation";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCreateEmailCampaign, useSetCampaignStatus } from "@/hooks/use-email-campaigns";
import { CampaignForm } from "../_components/campaign-form";

export default function CreateEmailCampaignPage() {
  usePageHeader({ title: "New email campaign", description: "Audience, content, automation and tracking for a targeted email campaign." });
  const router = useRouter();
  const create = useCreateEmailCampaign();
  const setStatus = useSetCampaignStatus();
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <CampaignForm
        saving={create.isPending || setStatus.isPending}
        onSave={(payload, activate) =>
          create.mutate(payload, {
            onSuccess: (c) => {
              if (activate && c?.id) {
                setStatus.mutate({ id: c.id, status: "Active" }, { onSettled: () => router.push(`/organization/email-campaigns/${c.id}`) });
              } else {
                router.push(c?.id ? `/organization/email-campaigns/${c.id}` : "/organization/email-campaigns");
              }
            },
          })
        }
      />
    </div>
  );
}
