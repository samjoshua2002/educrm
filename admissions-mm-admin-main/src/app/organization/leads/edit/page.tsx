"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLead, useUpdateLead } from "@/hooks/use-leads";
import { useTeam } from "@/hooks/use-team";
import { useAuthStore } from "@/stores/auth-store";
import { Role } from "@/types/auth";
import { SYSTEM_FIELD_IDS } from "@/lib/default-form-fields";
import { ChevronLeft, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INDIAN_STATES } from "@/lib/locations";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SOURCES = [
  "Google Ads",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Website",
  "Referral",
  "Other",
] as const;
const MEDIUMS = [
  "CPC",
  "Social",
  "Organic",
  "Word of Mouth",
  "Email",
  "Other",
] as const;
const CAMPAIGNS = [
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Winter 2025",
  "Spring 2026",
] as const;

const STAGES = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Converted",
  "Lost",
] as const;
const STATUSES = ["Hot", "Warm", "Cold"] as const;

function EditLeadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");

  const { data: lead, isLoading } = useLead(leadId || "");
  const updateLead = useUpdateLead();
  const { data: teamData } = useTeam(1, 100);
  const teamMembers = teamData?.data || [];
  const currentUser = useAuthStore((s) => s.user);
  const canEditAssignedTo = currentUser?.role !== Role.LEAD_MANAGER;

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    state: "",
    country: "",
    source: "",
    medium: "",
    campaign: "",
    stage: "New",
    status: "",
    assignedTo: "",
    notes: "",
  });

  React.useEffect(() => {
    if (lead) {
      setForm({
        name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
        email: lead.email || "",
        mobile: lead.phone || "",
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "India",
        source: lead.source || "",
        medium: lead.utmMedium || "",
        campaign: lead.utmCampaign || "",
        stage: lead.rawPayload?.stage || "New",
        status: lead.scoreBand ? lead.scoreBand.charAt(0).toUpperCase() + lead.scoreBand.slice(1) : "Warm",
        assignedTo: lead.assignedTo || "",
        notes: lead.rawPayload?.notes || "",
      });
    }
  }, [lead]);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const EXCLUDED_RAW_KEYS = new Set<string>([...SYSTEM_FIELD_IDS, "stage", "notes"]);
  const extraFields = Object.entries(lead?.rawPayload || {}).filter(
    ([key, value]) =>
      !EXCLUDED_RAW_KEYS.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== "",
  );

  function formatFieldLabel(key: string) {
    return key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatFieldValue(value: any) {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) return;

    const nameParts = form.name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    updateLead.mutate({
      leadId,
      data: {
        firstName,
        lastName,
        email: form.email || undefined,
        phone: form.mobile || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        source: form.source || undefined,
        utmSource: form.source || undefined,
        utmMedium: form.medium || undefined,
        utmCampaign: form.campaign || undefined,
        scoreBand: form.status ? form.status.toLowerCase() : undefined,
        assignedTo: form.assignedTo || null,
        rawPayload: { ...lead?.rawPayload, notes: form.notes, stage: form.stage }
      }
    }, {
      onSuccess: () => {
        router.push("/organization/leads");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 gap-3  border-border/80">
        <Link href="/organization/leads">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Lead: {form.name}</h1>
      </div>

      <div className="px-4 md:px-6 py-2 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left — col 8 */}
          <Card className="lg:col-span-8 bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-input px-6">
              <CardTitle className="text-[18px] font-medium text-foreground">
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 flex flex-col divide-y divide-input">
              {/* Personal Info */}
              <section className="flex flex-col gap-5 pb-6">
                <div className="flex flex-col gap-1 ">
                  <p className="text-[16px] font-medium text-foreground">
                    Personal Information
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Basic contact details of the lead.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="name"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Sam Joshua"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="email"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., Sam@gmail.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="mobile"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Mobile
                    </Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="e.g., +91 9876543210"
                      value={form.mobile}
                      onChange={(e) => set("mobile", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </section>

              {/* Location */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Location
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Where is the lead based
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="country"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Country
                    </Label>
                    <Input
                      id="country"
                      placeholder="e.g., India"
                      value={form.country}
                      onChange={(e) => set("country", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="state"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      State
                    </Label>
                    <Select
                      value={form.state}
                      onValueChange={(val) => setForm({ ...form, state: val })}
                    >
                      <SelectTrigger
                        id="state"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="city"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      City
                    </Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                      Preferred Branch
                    </Label>
                    <div className="border border-input h-[40px] rounded-[8px] text-[12px] flex items-center px-3 bg-muted/30 text-foreground">
                      {lead?.branch?.name || "Not specified"}
                    </div>
                  </div>
                </div>
              </section>

              {/* Lead Source */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Lead Source
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Where did this lead come from?
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                      Form Submitted
                    </Label>
                    <div className="border border-input h-[40px] rounded-[8px] text-[12px] flex items-center px-3 bg-muted/30 text-foreground">
                      {lead?.form?.name || "Not specified"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="source"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Source
                    </Label>
                    <Select
                      value={form.source}
                      onValueChange={(v) => set("source", v)}
                    >
                      <SelectTrigger
                        id="source"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="medium"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Medium
                    </Label>
                    <Select
                      value={form.medium}
                      onValueChange={(v) => set("medium", v)}
                    >
                      <SelectTrigger
                        id="medium"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Medium" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIUMS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="campaign"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Campaign
                    </Label>
                    <Select
                      value={form.campaign}
                      onValueChange={(v) => set("campaign", v)}
                    >
                      <SelectTrigger
                        id="campaign"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGNS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Additional Form Fields */}
              <section className="flex flex-col gap-5 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Additional Form Fields
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Extra fields captured from the submitted form, beyond the standard fields above.
                  </p>
                </div>
                {extraFields.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">
                    No additional fields were submitted.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {extraFields.map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-2">
                        <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                          {formatFieldLabel(key)}
                        </Label>
                        <div className="border border-input min-h-[40px] rounded-[8px] text-[12px] flex items-center px-3 bg-muted/30 text-foreground break-all">
                          {formatFieldValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>

          {/* Right — col 4 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* CRM Detail Card */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-6">
              <h2 className="text-[18px] font-medium text-foreground">
                CRM Detail
              </h2>

              <div className="flex flex-col gap-5">
                {/* Stage */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="crm-stage"
                    className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                  >
                    Stage
                  </Label>
                  <Select
                    value={form.stage}
                    onValueChange={(v) => set("stage", v)}
                  >
                    <SelectTrigger
                      id="crm-stage"
                      className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                    >
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="crm-status"
                    className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                  >
                    Status
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => set("status", v)}
                  >
                    <SelectTrigger
                      id="crm-status"
                      className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                    >
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="crm-assigned"
                    className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                  >
                    Assigned To
                  </Label>
                  <Select
                    value={form.assignedTo || "unassigned"}
                    onValueChange={(v) => set("assignedTo", v === "unassigned" ? "" : v)}
                    disabled={!canEditAssignedTo}
                  >
                    <SelectTrigger
                      id="crm-assigned"
                      className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <Button
                  className="w-full bg-ring hover:bg-ring/90 text-primary-foreground flex items-center justify-center gap-2 h-11 text-base font-medium rounded-[8px]"
                  onClick={handleSubmit}
                  disabled={updateLead.isPending}
                >
                  <Check className="size-5" />
                  {updateLead.isPending ? "Saving..." : "Save Lead"}
                </Button>
                <Link href="/organization/leads" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full border border-border h-11 text-base font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>

            {/* Follow up Note Card */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-medium text-foreground">
                  Follow up Note
                </h2>
                <p className="text-[14px] text-muted-foreground">
                  Any additional remarks about this lead.
                </p>
              </div>
              <Textarea
                placeholder="Add a follow up note about this lead...."
                className="border border-input min-h-[137px] rounded-[8px] text-[12px] placeholder:text-muted-foreground resize-none"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {/* Protip Card */}
            <div className="bg-accent flex flex-col gap-4 p-6 rounded-[8px]">
              <p className="text-accent-foreground text-[18px] font-semibold leading-normal">
                Protip
              </p>
              <p className="text-foreground text-[12px] font-medium leading-[20px] tracking-[0.6px]">
                Completing the Lead Source details helps the AI system better
                predict conversion rates for this campaign.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function EditLeadPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <EditLeadForm />
    </React.Suspense>
  );
}
