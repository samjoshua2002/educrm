"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, MessageCircle, MessageSquare, Phone, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageHeader } from "@/hooks/use-page-header";
import { apiGet } from "@/lib/api";
import { useCommunicationTimeline } from "@/hooks/use-communications";
import { useClickToCall } from "@/hooks/use-calls";
import { CommunicationTimeline } from "@/components/communication-timeline";
import { ComposeDialog } from "../_components/compose-dialog";
import { ReadOnlyField, SectionCard, StatRibbon } from "../_components/comm-ui";
import type { PickedRecipient } from "../_components/recipient-picker";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Communication history for one applicant / lead.
 * Routes: /organization/communications/app/<applicationId>
 *         /organization/communications/lead/<leadId>
 *         /organization/communications/<applicationNo>   (links from application pages)
 */
export default function CommunicationHistoryPage() {
  const params = useParams<{ id: string[] }>();
  const parts = (Array.isArray(params.id) ? params.id : [params.id]).map((p) => decodeURIComponent(p));
  const kind = parts[0] === "lead" ? "lead" : parts[0] === "app" ? "app" : "no";
  const raw = kind === "no" ? parts.join("/") : parts.slice(1).join("/");

  // Legacy links pass the application number — resolve it to the application id.
  const resolved = useQuery({
    queryKey: ["communications", "resolve-app", raw],
    queryFn: async () => {
      if (UUID.test(raw)) return { id: raw };
      const app = await apiGet<any>(`/applications/${encodeURIComponent(raw)}`);
      return { id: app?.id as string | undefined };
    },
    enabled: kind === "no" && !!raw,
  });

  const applicationId = kind === "app" ? raw : kind === "no" ? resolved.data?.id : undefined;
  const leadId = kind === "lead" ? raw : undefined;

  const { data } = useCommunicationTimeline({ applicationId, leadId });
  const applicant = data?.applicant;
  const entries = data?.entries || [];
  const callNow = useClickToCall();
  const [compose, setCompose] = React.useState<null | "Email" | "SMS" | "WhatsApp">(null);

  usePageHeader({
    title: applicant?.name ? `Communication history — ${applicant.name}` : "Communication history",
    description: "Chronological record of every Email, SMS, WhatsApp, call and system interaction.",
  });

  const recipient: PickedRecipient[] = applicant
    ? [
        {
          key: applicant.applicationId ? `app:${applicant.applicationId}` : `lead:${applicant.leadId}`,
          applicationId: applicant.applicationId || undefined,
          leadId: applicant.applicationId ? undefined : applicant.leadId || undefined,
          name: applicant.name || "Applicant",
          email: applicant.email,
          phone: applicant.phone,
          kind: applicant.applicationId ? "Applicant" : "Lead",
        },
      ]
    : [];

  const count = (c: string) => entries.filter((e) => e.channel === c).length;
  const lastContact = entries.find((e) => e.channel !== "System");

  if (kind === "no" && resolved.isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!applicationId && !leadId) {
    return (
      <div className="flex flex-col items-center gap-3 p-16 text-center">
        <p className="text-sm text-muted-foreground">This applicant could not be found.</p>
        <Button asChild variant="outline">
          <Link href="/organization/communications">Back to communications</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/organization/communications">
            <ArrowLeft className="size-4" /> Communications
          </Link>
        </Button>
        <div className="flex-1" />
        <Button variant="outline" className="gap-1.5" disabled={!applicant?.email} onClick={() => setCompose("Email")}>
          <Mail className="size-4 text-[#2563EB]" /> Email
        </Button>
        <Button variant="outline" className="gap-1.5" disabled={!applicant?.phone} onClick={() => setCompose("SMS")}>
          <MessageSquare className="size-4 text-[#7C3AED]" /> SMS
        </Button>
        <Button variant="outline" className="gap-1.5" disabled={!applicant?.phone} onClick={() => setCompose("WhatsApp")}>
          <MessageCircle className="size-4 text-[#059669]" /> WhatsApp
        </Button>
        <Button
          className="gap-1.5"
          disabled={!applicant?.phone || callNow.isPending}
          onClick={() => callNow.mutate({ applicationId: applicant?.applicationId || undefined, leadId: applicant?.applicationId ? undefined : applicant?.leadId || undefined })}
        >
          {callNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />} Call now
        </Button>
        <Button asChild variant="outline" className="gap-1.5">
          <Link
            href={`/organization/calls?log=1${applicant?.applicationId ? `&applicationId=${applicant.applicationId}` : applicant?.leadId ? `&leadId=${applicant.leadId}` : ""}`}
          >
            <Phone className="size-4 text-[#D97706]" /> Log a call
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <SectionCard title="Applicant">
            <div className="grid grid-cols-1 gap-3">
              <ReadOnlyField label="Name" value={applicant?.name} />
              <ReadOnlyField label="Application no" value={applicant?.applicationNo} />
              <ReadOnlyField label="Email" value={applicant?.email} />
              <ReadOnlyField label="Phone" value={applicant?.phone} />
              <ReadOnlyField label="Program" value={applicant?.program} />
              <ReadOnlyField label="Last contact" value={lastContact ? new Date(lastContact.dateTime).toLocaleString() : null} />
            </div>
            {applicant?.applicationId && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/organization/applications/${applicant.applicationNo || applicant.applicationId}`}>Open application</Link>
              </Button>
            )}
          </SectionCard>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-4">
          <StatRibbon
            items={[
              { label: "Total", value: entries.length },
              { label: "Email", value: count("Email") },
              { label: "SMS", value: count("SMS") },
              { label: "WhatsApp", value: count("WhatsApp") },
              { label: "Calls", value: count("Call") },
              { label: "System", value: count("System") },
            ]}
          />
          <SectionCard title="Timeline of interactions">
            <CommunicationTimeline applicationId={applicationId} leadId={leadId} />
          </SectionCard>
        </div>
      </div>

      {compose && (
        <ComposeDialog open={!!compose} onOpenChange={(o) => !o && setCompose(null)} initialChannel={compose} initialRecipients={recipient} />
      )}
    </div>
  );
}
