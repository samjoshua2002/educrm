"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/hooks/use-page-header";
import { useEmailCampaign, useSetCampaignStatus, useUpdateEmailCampaign } from "@/hooks/use-email-campaigns";
import { CampaignForm } from "../../_components/campaign-form";

export default function EditEmailCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign, isLoading } = useEmailCampaign(id);
  const update = useUpdateEmailCampaign();
  const setStatus = useSetCampaignStatus();
  usePageHeader({ title: campaign ? `Edit campaign — ${campaign.name}` : "Edit campaign" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!campaign || campaign.status === "Completed") {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <p className="text-sm text-muted-foreground">{campaign ? "Completed campaigns cannot be edited — duplicate it instead." : "Campaign not found."}</p>
        <Button asChild variant="outline">
          <Link href="/organization/email-campaigns">Back to campaigns</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <CampaignForm
        key={campaign.id}
        initial={campaign}
        saving={update.isPending || setStatus.isPending}
        onSave={(payload, activate) =>
          update.mutate(
            { id: campaign.id, ...payload },
            {
              onSuccess: () => {
                if (activate) setStatus.mutate({ id: campaign.id, status: "Active" }, { onSettled: () => router.push(`/organization/email-campaigns/${campaign.id}`) });
                else router.push(`/organization/email-campaigns/${campaign.id}`);
              },
            },
          )
        }
      />
    </div>
  );
}
