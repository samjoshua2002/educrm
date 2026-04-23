"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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
import { Separator } from "@/components/ui/separator";

const STAGES = ["New", "Contacted", "Interested", "Qualified", "Converted", "Lost"] as const;
const STATUSES = ["Hot", "Warm", "Cold"] as const;
const COUNSELLORS = ["Alice Brown", "Bob Wilson", "Carol Martinez", "David Lee", "Eva Singh"] as const;
const SOURCES = ["Google Ads", "Facebook", "Instagram", "LinkedIn", "Website", "Referral", "Other"] as const;
const MEDIUMS = ["CPC", "Social", "Organic", "Word of Mouth", "Email", "Other"] as const;
const CAMPAIGNS = ["Spring 2025", "Summer 2025", "Fall 2025", "Winter 2025", "Spring 2026"] as const;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
] as const;

export default function AddLeadPage() {
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    state: "",
    source: "",
    medium: "",
    campaign: "",
    stage: "New",
    status: "Warm",
    assignedTo: "",
    notes: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: submit to API
    console.log(form);
  }

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b gap-3">
        <Link href="/lead-manager">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Add Lead</h1>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* Left — col 8 */}
          <Card className="lg:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">

              {/* Personal Info */}
              <section className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Personal Information</p>
                  <p className="text-xs text-muted-foreground">Basic contact details of the lead.</p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                    <Input id="name" placeholder="e.g. Arjun Sharma" value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input id="email" type="email" placeholder="e.g. arjun@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="mobile" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile</Label>
                    <Input id="mobile" type="tel" placeholder="e.g. +91 98765 43210" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Location */}
              <section className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Location</p>
                  <p className="text-xs text-muted-foreground">Where is the lead based?</p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</Label>
                    <Select value={form.state} onValueChange={(v) => set("state", v)}>
                      <SelectTrigger id="state" className="w-full">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label>
                    <Input id="city" placeholder="e.g. Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </div>
                </div>
              </section>

              {/* Lead Source */}
              <section className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Lead Source</p>
                  <p className="text-xs text-muted-foreground">Where did this lead come from?</p>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="source" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</Label>
                    <Select value={form.source} onValueChange={(v) => set("source", v)}>
                      <SelectTrigger id="source" className="w-full">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="medium" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medium</Label>
                    <Select value={form.medium} onValueChange={(v) => set("medium", v)}>
                      <SelectTrigger id="medium" className="w-full">
                        <SelectValue placeholder="Select medium" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIUMS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="campaign" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign</Label>
                    <Select value={form.campaign} onValueChange={(v) => set("campaign", v)}>
                      <SelectTrigger id="campaign" className="w-full">
                        <SelectValue placeholder="Select campaign" />
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
              <section className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Notes</p>
                  <p className="text-xs text-muted-foreground">Any additional remarks about this lead.</p>
                </div>
                <Separator />
                <Textarea
                  placeholder="Add notes about this lead..."
                  className="min-h-24 resize-none"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </section>

            </CardContent>
          </Card>

          {/* Right — col 4 */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CRM Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="stage" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</Label>
                <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                  <SelectTrigger id="stage" className="w-full">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="assignedTo" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</Label>
                <Select value={form.assignedTo} onValueChange={(v) => set("assignedTo", v)}>
                  <SelectTrigger id="assignedTo" className="w-full">
                    <SelectValue placeholder="Select counsellor" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNSELLORS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={handleSubmit}>Save Lead</Button>
                <Link href="/lead-manager" className="w-full">
                  <Button variant="outline" className="w-full">Cancel</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
}
