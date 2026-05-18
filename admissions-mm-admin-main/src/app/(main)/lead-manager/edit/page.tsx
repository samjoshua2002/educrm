"use client";

import * as React from "react";
import { ChevronLeft, Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SOURCES = ["Google Ads", "Facebook", "Instagram", "LinkedIn", "Website", "Referral", "Other"] as const;
const MEDIUMS = ["CPC", "Social", "Organic", "Word of Mouth", "Email", "Other"] as const;
const CAMPAIGNS = ["Spring 2025", "Summer 2025", "Fall 2025", "Winter 2025", "Spring 2026"] as const;

const STAGES = ["New", "Contacted", "Interested", "Qualified", "Converted", "Lost"] as const;
const STATUSES = ["Hot", "Warm", "Cold"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
] as const;

// Comprehensive mock database matching page.tsx for direct ID lookup
const MOCK_LEADS = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    mobile: "+1 234 567 890",
    state: "California",
    city: "Los Angeles",
    source: "Google Ads",
    medium: "CPC",
    campaign: "Spring 2025",
    stage: "New",
    status: "Hot",
    assignedTo: "Alice Brown",
    notes: "Interested in the standard program.",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    mobile: "+1 234 567 891",
    state: "Texas",
    city: "Houston",
    source: "Facebook",
    medium: "Social",
    campaign: "Summer 2025",
    stage: "Contacted",
    status: "Warm",
    assignedTo: "Bob Wilson",
    notes: "Requires follow-up next Tuesday.",
  },
  {
    id: 11,
    name: "Samjoshua",
    email: "samjoshua@example.com",
    mobile: "+91 7902089317",
    state: "Kerala",
    city: "Trivandrum",
    source: "Google Ads",
    medium: "Organic",
    campaign: "Summer 2025",
    stage: "Converted",
    status: "Hot",
    assignedTo: "Carol Martinez",
    notes: "Premium lead with high conversion rate.",
  }
];

function EditLeadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");

  // Lookup lead or default to Samjoshua
  const matchedLead = React.useMemo(() => {
    if (!leadId) return MOCK_LEADS[2]; // Default to Samjoshua
    const found = MOCK_LEADS.find((l) => l.id.toString() === leadId);
    return found || MOCK_LEADS[2];
  }, [leadId]);

  const [form, setForm] = React.useState({
    name: matchedLead.name,
    email: matchedLead.email,
    mobile: matchedLead.mobile,
    city: matchedLead.city,
    state: matchedLead.state,
    source: matchedLead.source,
    medium: matchedLead.medium,
    campaign: matchedLead.campaign,
    stage: matchedLead.stage,
    status: matchedLead.status,
    assignedTo: matchedLead.assignedTo,
    notes: matchedLead.notes || "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Saving updated lead:", form);
    
    // Save locally or execute callback logic (frontend focus)
    // We navigate back to the main manager page
    router.push("/lead-manager");
  }

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 gap-3 border-b border-border/80">
        <Link href="/lead-manager">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Lead: {form.name}</h1>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left — col 8 */}
          <Card className="lg:col-span-8 bg-card border border-border rounded-[8px] shadow-sm overflow-hidden" >
            <CardHeader className="border-b border-input px-6 py-4 bg-muted/20">
              <CardTitle className="text-[18px] font-medium text-foreground">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="px-6 flex flex-col divide-y divide-input">

              {/* Personal Info */}
              <section className="flex flex-col gap-5 pb-6 pt-6">
                <div className="flex flex-col gap-1 ">
                  <p className="text-[16px] font-medium text-foreground">Personal Information</p>
                  <p className="text-[14px] text-muted-foreground">Basic contact details of the lead.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Full Name</Label>
                    <Input id="name" placeholder="e.g., Sam Joshua" value={form.name} onChange={(e) => set("name", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Email</Label>
                    <Input id="email" type="email" placeholder="e.g., Sam@gmail.com" value={form.email} onChange={(e) => set("email", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="mobile" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Mobile</Label>
                    <Input id="mobile" type="tel" placeholder="e.g., +91 9876543210" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                </div>
              </section>

              {/* Location */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">Location</p>
                  <p className="text-[14px] text-muted-foreground">Where is the lead based</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="state" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">State</Label>
                    <Input id="state" placeholder="e.g., Kerala" value={form.state} onChange={(e) => set("state", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="city" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">City</Label>
                    <Input id="city" placeholder="e.g., Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                </div>
              </section>

              {/* Lead Source */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">Lead Source</p>
                  <p className="text-[14px] text-muted-foreground">Where did this lead come from?</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="source" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Source</Label>
                    <Select value={form.source} onValueChange={(v) => set("source", v)}>
                      <SelectTrigger id="source" className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                        <SelectValue placeholder="Select Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="medium" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Medium</Label>
                    <Select value={form.medium} onValueChange={(v) => set("medium", v)}>
                      <SelectTrigger id="medium" className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                        <SelectValue placeholder="Select Medium" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIUMS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="campaign" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Campaign</Label>
                    <Select value={form.campaign} onValueChange={(v) => set("campaign", v)}>
                      <SelectTrigger id="campaign" className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                        <SelectValue placeholder="Select Campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGNS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Notes */}
              <section className="flex flex-col gap-5 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">Notes</p>
                  <p className="text-[14px] text-muted-foreground">Any additional remarks about this lead.</p>
                </div>
                <div>
                  <Textarea
                    placeholder="Add notes about this lead...."
                    className="border border-input min-h-[137px] rounded-[8px] text-[12px] placeholder:text-muted-foreground resize-none"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </div>
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
                  <Label htmlFor="crm-stage" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                    <SelectTrigger id="crm-stage" className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                      <SelectValue placeholder="Select Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="crm-status" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger id="crm-status" className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="crm-assigned" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Assigned To</Label>
                  <Input id="crm-assigned" placeholder="e.g., Carol Martinez" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px]" />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 h-11 text-base font-medium rounded-[8px]"
                  onClick={handleSubmit}
                >
                  <Check className="size-5" />
                  Save Lead
                </Button>
                <Link href="/lead-manager" className="w-full">
                  <Button variant="outline" className="w-full border border-border h-11 text-base font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>

            {/* Protip Card */}
            <div className="bg-accent flex flex-col gap-4 p-6 rounded-[8px]">
              <p className="text-accent-foreground text-[18px] font-semibold leading-normal">
                Protip
              </p>
              <p className="text-foreground text-[12px] font-medium leading-[20px] tracking-[0.6px]">
                Completing the Lead Source details helps the AI system better predict conversion rates for this campaign.
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
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <EditLeadForm />
    </React.Suspense>
  );
}
