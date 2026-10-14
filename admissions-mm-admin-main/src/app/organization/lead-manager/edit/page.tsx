"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAssignLead,
  useLead,
  useLeadActivities,
  useRecordEngagement,
  useRerouteLead,
  useRescoreLead,
  useUpdateLead,
} from "@/hooks/use-leads";
import { useCourses } from "@/hooks/use-courses";
import { CHANNEL_SOURCES, ENGAGEMENT_TYPES, FOLLOW_UP_STATUSES, SOURCE_TYPES } from "@/types/lead-management";
import { BandBadge, ReadOnlyField, formatDateTime, pillStyles } from "../_components/lm-ui";
import { MergeDialog } from "../_components/merge-dialog";
import { useForm } from "@/hooks/use-forms";
import { useTeam } from "@/hooks/use-team";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeader } from "@/hooks/use-page-header";
import { Role } from "@/types/auth";
import { SYSTEM_FIELD_IDS } from "@/lib/default-form-fields";
import { ChevronLeft, Check, Upload, Paperclip, FileText, Trash2, ExternalLink, Loader2, RefreshCw, GitMerge, Route } from "lucide-react";
import { toast } from "sonner";

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
  "Website",
  "Instagram",
  "LinkedIn",
  "Facebook",
  "X (Twitter)",
  "WhatsApp",
  "YouTube",
  "Google Ads",
  "Direct",
  "Referral",
  "Other",
] as const;


const STAGES = [
  "New",
  "Contacted",
  "Interested",
  "Verified",
  "Converted",
  "Duplicate",
  "Lost",
] as const;


function toLocalInput(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Lead captured",
  reentry: "Submitted again",
  auto_assigned: "Auto-assigned",
  assigned: "Assigned",
  reassigned: "Reassigned",
  duplicate_flagged: "Duplicate flagged",
  duplicate_dismissed: "Duplicate dismissed",
  merged: "Merged",
  status_changed: "Status changed",
  follow_up_status: "Follow-up",
  engagement: "Engagement",
  rescored: "Rescored",
  note: "Note",
  updated: "Updated",
};

function EditLeadForm() {
  usePageHeader({
    title: "Lead Details",
    description: "Update the lead's personal, location, and campaign details.",
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");

  const { data: lead, isLoading } = useLead(leadId || "");
  const formId = lead?.formId || lead?.form?.id || "";
  const { data: formData } = useForm(formId);
  const formFields = lead?.form?.fields || formData?.fields || [];

  const updateLead = useUpdateLead();
  const { data: activities = [] } = useLeadActivities(leadId);
  const rescore = useRescoreLead();
  const reroute = useRerouteLead();
  const recordEngagement = useRecordEngagement();
  const [engagementType, setEngagementType] = React.useState("webinar");
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const { data: coursesData } = useCourses(1, 200);
  const courses: any[] = (coursesData as any)?.data || [];
  const { data: teamData } = useTeam(1, 100);
  const teamMembers = teamData?.data || [];
  const currentUser = useAuthStore((s) => s.user);
  // Backend: org admins/superadmins reassign through PATCH /leads/:id; lead managers only through
  // PATCH /leads/:id/assign (PATCH /leads/:id ignores assignedTo for them); counselors cannot reassign.
  // Rescore, re-route and merge are allowed for superadmin, org_admin and lead_manager only.
  const isLeadManager = currentUser?.role === Role.LEAD_MANAGER;
  const canManageLead =
    currentUser?.role === Role.SUPERADMIN || currentUser?.role === Role.ORG_ADMIN || isLeadManager;
  const canEditAssignedTo = canManageLead;
  const assignLead = useAssignLead();

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    state: "",
    country: "",
    source: "",
    campaign: "",
    stage: "New",
    assignedTo: "",
    notes: "",
    dateOfBirth: "",
    studentId: "",
    courseId: "",
    programInterest: "",
    intake: "",
    formName: "",
    channelSource: "",
    sourceType: "",
    subSource: "",
    campaignName: "",
    utmSource: "",
    utmMedium: "",
    testType: "",
    testScore: "",
    gpa: "",
    workExperienceYears: "",
    followUpStatus: "Pending",
    nextFollowUpAt: "",
  });

  const [extraPayload, setExtraPayload] = React.useState<Record<string, any>>({});
  const [uploadingField, setUploadingField] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (lead) {
      setForm({
        name: `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
        email: lead.email || "",
        mobile: lead.phone || "",
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "India",
        source: lead.source || lead.utmSource || "",
        campaign: lead.utmCampaign || lead.campaignId || (lead.form as any)?.campaignId || (lead.form as any)?.campaign || (lead as any)?.campaign?.name || "",
        stage: (lead.status === "disqualified" || lead.rawPayload?.stage === "Lost" || lead.rawPayload?.stage === "lost") ? "Lost" : (lead.rawPayload?.stage || "New"), 
        assignedTo: lead.assignedTo || "",
        notes: lead.rawPayload?.notes || "",
        dateOfBirth: lead.dateOfBirth || "",
        studentId: lead.studentId || "",
        courseId: lead.courseId || "",
        programInterest: lead.programInterest || "",
        intake: lead.intake || "",
        formName: lead.formName || lead.form?.name || "",
        channelSource: lead.channelSource || "",
        sourceType: lead.sourceType || "",
        subSource: lead.subSource || "",
        campaignName: lead.campaignName || "",
        utmSource: lead.utmSource || "",
        utmMedium: lead.utmMedium || "",
        testType: lead.testType || "",
        testScore: lead.testScore !== null && lead.testScore !== undefined ? String(lead.testScore) : "",
        gpa: lead.gpa !== null && lead.gpa !== undefined ? String(lead.gpa) : "",
        workExperienceYears:
          lead.workExperienceYears !== null && lead.workExperienceYears !== undefined ? String(lead.workExperienceYears) : "",
        followUpStatus: lead.followUpStatus || "Pending",
        nextFollowUpAt: lead.nextFollowUpAt ? toLocalInput(lead.nextFollowUpAt) : "",
      });
      setExtraPayload(lead.rawPayload || {});
    }
  }, [lead]);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const EXCLUDED_RAW_KEYS = new Set<string>([...SYSTEM_FIELD_IDS, "stage", "notes"]);

  const fieldLabelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const f of formFields) {
      if (f.id && f.label) {
        map.set(f.id, f.label);
      }
    }
    return map;
  }, [formFields]);

  function formatFieldLabel(key: string) {
    if (fieldLabelMap.has(key)) {
      return fieldLabelMap.get(key)!;
    }
    return key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const isFileField = React.useCallback((key: string, value: any) => {
    const fieldDef = formFields.find((f: any) => f.id === key);
    if (fieldDef?.type === "file") return true;
    if (typeof value === "string") {
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/api/upload")) {
        return true;
      }
      const cleanUrl = value.split("?")[0].toLowerCase();
      if (/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|svg|zip|csv)$/i.test(cleanUrl)) {
        return true;
      }
    }
    if (value && typeof value === "object") {
      if (typeof value.url === "string") return true;
      if (Array.isArray(value) && value.length > 0) {
        if (typeof value[0] === "string" && (value[0].startsWith("http") || /\.(pdf|docx?|png|jpe?g)/i.test(value[0]))) return true;
        if (value[0] && typeof value[0].url === "string") return true;
      }
    }
    return false;
  }, [formFields]);

  const getFileUrl = React.useCallback((val: any): string => {
    if (typeof val === "string") return val;
    if (val && typeof val.url === "string") return val.url;
    return "";
  }, []);

  const extractDocName = React.useCallback((val: any, fallbackKey: string): string => {
    if (val && typeof val === "object" && val.name) return val.name;
    const url = getFileUrl(val);
    if (url) {
      try {
        const pathname = new URL(url).pathname;
        const last = pathname.split("/").pop() || "";
        return decodeURIComponent(last.replace(/^\d+-[a-z0-9]+-/, "")) || `${formatFieldLabel(fallbackKey)} Document`;
      } catch {
        return url.split("/").pop() || `${formatFieldLabel(fallbackKey)} Document`;
      }
    }
    return `${formatFieldLabel(fallbackKey)} Document`;
  }, [getFileUrl, formatFieldLabel]);

  const handleFileUpload = async (key: string, file: File) => {
    try {
      setUploadingField(key);
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("category", "leadAttachments");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });
      const data = await res.json();
      if (data.url) {
        setExtraPayload((prev) => ({
          ...prev,
          [key]: data.url,
        }));
        toast.success("Attachment updated successfully");
      } else {
        toast.error(data.error || "Failed to upload document");
      }
    } catch (err) {
      console.error(err);
      toast.error("Document upload failed");
    } finally {
      setUploadingField(null);
    }
  };

  const extraFieldKeys = React.useMemo(() => {
    const keys = new Set<string>();
    Object.keys(extraPayload || {}).forEach((k) => {
      if (!EXCLUDED_RAW_KEYS.has(k)) keys.add(k);
    });
    formFields.forEach((f: any) => {
      if (f.id && !EXCLUDED_RAW_KEYS.has(f.id) && f.type !== "banner" && f.id !== "form_metadata") {
        keys.add(f.id);
      }
    });
    return Array.from(keys);
  }, [extraPayload, formFields]);

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
        utmSource: form.utmSource || undefined,
        utmMedium: form.utmMedium || undefined,
        utmCampaign: form.campaign || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        studentId: form.studentId || undefined,
        courseId: form.courseId || undefined,
        programInterest: form.programInterest || undefined,
        intake: form.intake || undefined,
        formName: form.formName || undefined,
        channelSource: form.channelSource || undefined,
        sourceType: form.sourceType || undefined,
        subSource: form.subSource || undefined,
        campaignName: form.campaignName || undefined,
        testType: form.testType || undefined,
        testScore: form.testScore !== "" ? Number(form.testScore) : undefined,
        gpa: form.gpa !== "" ? Number(form.gpa) : undefined,
        workExperienceYears: form.workExperienceYears !== "" ? Number(form.workExperienceYears) : undefined,
        followUpStatus: form.followUpStatus || undefined,
        nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined,
        status: form.stage === "Lost" ? "disqualified" : (form.stage === "Verified" ? "verified" : (lead?.status === "disqualified" && form.stage !== "Lost" ? "unverified" : lead?.status)),
        assignedTo: form.assignedTo || null,
        rawPayload: { ...lead?.rawPayload, ...extraPayload, notes: form.notes, stage: form.stage }
      }
    }, {
      onSuccess: async () => {
        if (isLeadManager && form.assignedTo && form.assignedTo !== (lead?.assignedTo || "")) {
          try {
            await assignLead.mutateAsync({ leadId, assignedTo: form.assignedTo });
          } catch {
            return;
          }
        }
        router.push("/organization/lead-manager");
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
        <Link href="/organization/lead-manager">
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

              {/* Program & Academic */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">Program &amp; Academic</p>
                  <p className="text-[14px] text-muted-foreground">Program interest, intake and the details used for scoring.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Program / Course Interest</Label>
                    <Select
                      value={form.courseId || "none"}
                      onValueChange={(v) => {
                        const c = courses.find((x: any) => x.id === v);
                        setForm((prev) => ({ ...prev, courseId: v === "none" ? "" : v, programInterest: c ? c.name : prev.programInterest }));
                      }}
                    >
                      <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{form.programInterest ? `${form.programInterest} (not in catalog)` : "Not specified"}</SelectItem>
                        {courses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Intake / Session</Label>
                    <Input value={form.intake} placeholder="e.g. Fall 2026" onChange={(e) => set("intake", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Date of Birth</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Student ID</Label>
                    <Input value={form.studentId} onChange={(e) => set("studentId", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Test (GMAT / GRE)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={form.testType} placeholder="GMAT" onChange={(e) => set("testType", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                      <Input type="number" value={form.testScore} placeholder="Score" onChange={(e) => set("testScore", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Work Exp. (yrs)</Label>
                      <Input type="number" value={form.workExperienceYears} onChange={(e) => set("workExperienceYears", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">GPA</Label>
                      <Input type="number" value={form.gpa} onChange={(e) => set("gpa", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                    </div>
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
                  <p className="text-[16px] font-medium text-foreground">Lead Source</p>
                  <p className="text-[14px] text-muted-foreground">Where did this lead come from? First touch and last touch are both kept.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Form Name</Label>
                    <Input value={form.formName} onChange={(e) => set("formName", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Channel Source</Label>
                    <Select value={form.channelSource || "none"} onValueChange={(v) => set("channelSource", v === "none" ? "" : v)}>
                      <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {CHANNEL_SOURCES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Source Type</Label>
                    <Select value={form.sourceType || "none"} onValueChange={(v) => set("sourceType", v === "none" ? "" : v)}>
                      <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                        <SelectValue placeholder="Select source type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {SOURCE_TYPES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Sub-source</Label>
                    <Input value={form.subSource} placeholder="e.g. Google, Facebook, Shiksha" onChange={(e) => set("subSource", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Campaign Name</Label>
                    <Input value={form.campaignName} onChange={(e) => set("campaignName", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Source (legacy)</Label>
                    <Input value={form.source} onChange={(e) => set("source", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">UTM Source</Label>
                    <Input value={form.utmSource} onChange={(e) => set("utmSource", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">UTM Medium</Label>
                    <Input value={form.utmMedium} onChange={(e) => set("utmMedium", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">UTM Campaign</Label>
                    <Input value={form.campaign} onChange={(e) => set("campaign", e.target.value)} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ReadOnlyField label="Created From" value={lead?.createdFrom} />
                  <ReadOnlyField label="Lead Owner" value={lead?.assignedToUser?.name} />
                  <ReadOnlyField label="Touches" value={lead?.touchCount ?? 1} />
                  <ReadOnlyField label="UTM Term / Content" value={[lead?.utmTerm, lead?.utmContent].filter(Boolean).join(" · ")} />
                  <div className="md:col-span-2">
                    <ReadOnlyField label="Submission URL" value={lead?.submissionUrl} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(["firstTouch", "lastTouch"] as const).map((k) => {
                    const t = lead?.[k];
                    return (
                      <div key={k} className="rounded-[8px] border border-input p-4 flex flex-col gap-1 text-[12px]">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                          {k === "firstTouch" ? "First touch" : "Last touch"}
                        </p>
                        {t ? (
                          <>
                            <p className="font-medium text-foreground">{formatDateTime(t.at)}</p>
                            <p>{[t.channelSource, t.sourceType, t.subSource].filter(Boolean).join(" · ") || "—"}</p>
                            <p className="text-muted-foreground">{[t.utmSource, t.utmMedium, t.utmCampaign].filter(Boolean).join(" / ") || "No UTM"}</p>
                            {t.campaignName && <p className="text-muted-foreground">Campaign: {t.campaignName}</p>}
                            {t.formName && <p className="text-muted-foreground">Form: {t.formName}</p>}
                          </>
                        ) : (
                          <p className="text-muted-foreground">Not recorded</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Additional Form Fields */}
              <section className="flex flex-col gap-5 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Additional Form Fields
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Extra fields and attachments captured from the submitted form, beyond the standard fields above.
                  </p>
                </div>
                {extraFieldKeys.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground italic">
                    No additional fields were submitted.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {extraFieldKeys.map((key) => {
                      const value = extraPayload[key];
                      const isFile = isFileField(key, value);
                      const isUploading = uploadingField === key;

                      if (isFile) {
                        const fileUrls: string[] = Array.isArray(value)
                          ? value.map((v: any) => getFileUrl(v)).filter(Boolean)
                          : getFileUrl(value)
                          ? [getFileUrl(value)]
                          : [];

                        return (
                          <div key={key} className="flex flex-col gap-2">
                            <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                              {formatFieldLabel(key)}
                            </Label>

                            {fileUrls.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {fileUrls.map((url, idx) => (
                                  <div
                                    key={url + idx}
                                    className="border border-input rounded-[8px] p-2.5 bg-muted/20 flex items-center justify-between gap-2 min-h-[44px]"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className="w-7 h-7 rounded-[6px] bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <FileText className="size-4" />
                                      </div>
                                      <span
                                        className="text-[12px] font-medium text-foreground truncate"
                                        title={extractDocName(url, key)}
                                      >
                                        {extractDocName(url, key)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-[6px] transition-colors"
                                      >
                                        <ExternalLink className="size-3" /> View
                                      </a>

                                      <label
                                        htmlFor={`replace-file-${key}-${idx}`}
                                        className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-input px-2 py-1 rounded-[6px] transition-colors"
                                      >
                                        {isUploading ? (
                                          <Loader2 className="size-3 animate-spin text-blue-600" />
                                        ) : (
                                          <Upload className="size-3 text-slate-600" />
                                        )}
                                        <span>Replace</span>
                                        <input
                                          id={`replace-file-${key}-${idx}`}
                                          type="file"
                                          disabled={isUploading}
                                          className="hidden"
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileUpload(key, f);
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (Array.isArray(value)) {
                                            const next = fileUrls.filter((_, i) => i !== idx);
                                            setExtraPayload((prev) => ({ ...prev, [key]: next }));
                                          } else {
                                            setExtraPayload((prev) => ({ ...prev, [key]: "" }));
                                          }
                                        }}
                                        className="h-7 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div>
                                <label
                                  htmlFor={`upload-new-${key}`}
                                  className="cursor-pointer border border-dashed border-input hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-[8px] h-[40px] px-3 flex items-center justify-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="size-4 animate-spin text-primary" />
                                      <span>Uploading to cloud...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="size-4 text-primary" />
                                      <span>Upload / Attach File</span>
                                    </>
                                  )}
                                  <input
                                    id={`upload-new-${key}`}
                                    type="file"
                                    disabled={isUploading}
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleFileUpload(key, f);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="flex flex-col gap-2">
                          <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                            {formatFieldLabel(key)}
                          </Label>
                          <Input
                            value={
                              typeof value === "object"
                                ? JSON.stringify(value)
                                : value !== undefined && value !== null
                                ? String(value)
                                : ""
                            }
                            onChange={(e) =>
                              setExtraPayload((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground bg-background"
                            placeholder={`Enter ${formatFieldLabel(key)}`}
                          />
                        </div>
                      );
                    })}
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

                {/* Follow-up Status */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="crm-followup" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Follow-up Status</Label>
                  <Select value={form.followUpStatus} onValueChange={(v) => set("followUpStatus", v)}>
                    <SelectTrigger id="crm-followup" className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOW_UP_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="crm-next" className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Next Follow-up</Label>
                  <Input
                    id="crm-next"
                    type="datetime-local"
                    value={form.nextFollowUpAt}
                    onChange={(e) => set("nextFollowUpAt", e.target.value)}
                    className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                  />
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
                  <p className="text-[12px] text-muted-foreground">
                    Assigned {formatDateTime(lead?.assignedAt)}
                  </p>
                  {lead?.assignmentRule && (
                    <p className="text-[12px] text-muted-foreground">Rule: {lead.assignmentRule}</p>
                  )}
                  {canEditAssignedTo && leadId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 text-xs"
                      disabled={reroute.isPending}
                      onClick={() => reroute.mutate(leadId)}
                    >
                      <Route className="size-4" /> Re-run routing rules
                    </Button>
                  )}
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
                <Link href="/organization/lead-manager" className="w-full">
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

            {/* Lead Score Card */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-medium text-foreground">Lead Score</h2>
                <BandBadge band={lead?.scoreBand} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[8px] border border-input p-3">
                  <p className="text-[20px] font-bold text-foreground">{lead?.score ?? "—"}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead</p>
                </div>
                <div className="rounded-[8px] border border-input p-3">
                  <p className="text-[20px] font-bold text-foreground">{lead?.academicScore ?? "—"}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Academic</p>
                </div>
                <div className="rounded-[8px] border border-input p-3">
                  <p className="text-[20px] font-bold text-foreground">{lead?.engagementScore ?? "—"}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Engagement</p>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground">Last scored: {formatDateTime(lead?.lastScoredAt)}</p>
              {(lead?.scoreBreakdown || []).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {(lead?.scoreBreakdown || []).map((b) => (
                    <div key={b.ruleId} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-foreground/90">{b.label}</span>
                      <span className={b.points >= 0 ? pillStyles.green : pillStyles.red}>
                        {b.points > 0 ? `+${b.points}` : b.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Select value={engagementType} onValueChange={setEngagementType}>
                  <SelectTrigger className="border border-input h-[36px] rounded-[8px] text-[12px] flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGAGEMENT_TYPES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={!leadId || recordEngagement.isPending}
                  onClick={() => leadId && recordEngagement.mutate({ leadId, type: engagementType })}
                >
                  Record
                </Button>
              </div>
              {canEditAssignedTo && leadId && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={rescore.isPending}
                  onClick={() => rescore.mutate(leadId)}
                >
                  <RefreshCw className="size-4" /> Rescore now
                </Button>
              )}
            </div>

            {/* Duplicate Card */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-medium text-foreground">Duplicate Check</h2>
                <span className={lead?.status === "merged" ? pillStyles.purple : lead?.isDuplicate ? pillStyles.red : pillStyles.green}>
                  {lead?.status === "merged" ? "Merged" : lead?.isDuplicate ? "Flagged" : "Unique"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <span className="text-muted-foreground">Duplicate Flag</span>
                <span className="text-right">{lead?.isDuplicate ? "Yes" : "No"}</span>
                <span className="text-muted-foreground">Confidence</span>
                <span className="text-right">{lead?.duplicateConfidence !== null && lead?.duplicateConfidence !== undefined ? `${lead.duplicateConfidence}%` : "—"}</span>
                <span className="text-muted-foreground">Master Lead</span>
                <span className="text-right truncate">
                  {lead?.masterLeadId ? (
                    <Link className="text-primary underline" href={`/organization/lead-manager/edit?id=${lead.masterLeadId}`}>
                      Open master
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="text-muted-foreground">Merge Date</span>
                <span className="text-right">{formatDateTime(lead?.mergedAt)}</span>
                <span className="text-muted-foreground">Re-entries</span>
                <span className="text-right">{lead?.duplicateCount ?? 0}</span>
              </div>
              {lead?.duplicateReason && <p className="text-[12px] text-muted-foreground">Matched on: {lead.duplicateReason}</p>}
              {lead?.isDuplicate && lead?.masterLeadId && lead?.status !== "merged" && canEditAssignedTo && (
                <Button type="button" className="h-9 text-xs" onClick={() => setMergeOpen(true)}>
                  <GitMerge className="size-4" /> Review &amp; merge
                </Button>
              )}
            </div>

            {/* Activity Card */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-4">
              <h2 className="text-[18px] font-medium text-foreground">Activity &amp; Assignment History</h2>
              {activities.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {activities.map((a) => (
                    <div key={a.id} className="border-l-2 border-primary/30 pl-3 flex flex-col gap-0.5">
                      <p className="text-[12px] font-semibold text-foreground">
                        {ACTION_LABELS[a.action] || a.action.replace(/_/g, " ")}
                        {a.newAssignedToName ? ` → ${a.newAssignedToName}` : ""}
                      </p>
                      {a.content && <p className="text-[12px] text-foreground/80">{a.content}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(a.createdAt)}
                        {a.actorName ? ` · ${a.actorName}` : ""}
                        {a.mergedFromLeadId ? " · from merged lead" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <MergeDialog
        review={mergeOpen && lead?.masterLeadId && leadId ? { masterId: lead.masterLeadId, duplicateId: leadId } : null}
        onClose={() => setMergeOpen(false)}
      />
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
