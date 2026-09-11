"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLead, useUpdateLead } from "@/hooks/use-leads";
import { useForm } from "@/hooks/use-forms";
import { useTeam } from "@/hooks/use-team";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeader } from "@/hooks/use-page-header";
import { Role } from "@/types/auth";
import { SYSTEM_FIELD_IDS } from "@/lib/default-form-fields";
import { ChevronLeft, Check, Upload, Paperclip, FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
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

const STATUSES = ["Hot", "Warm", "Cold"] as const;

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
    campaign: "",
    stage: "New",
    status: "",
    assignedTo: "",
    notes: "",
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
        status: lead.scoreBand ? lead.scoreBand.charAt(0).toUpperCase() + lead.scoreBand.slice(1) : "Warm",
        assignedTo: lead.assignedTo || "",
        notes: lead.rawPayload?.notes || "",
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
        utmSource: form.source || undefined,
        utmCampaign: form.campaign || undefined,
        scoreBand: form.status ? form.status.toLowerCase() : undefined,
        status: form.stage === "Lost" ? "disqualified" : (form.stage === "Verified" ? "verified" : (lead?.status === "disqualified" && form.stage !== "Lost" ? "unverified" : lead?.status)),
        assignedTo: form.assignedTo || null,
        rawPayload: { ...lead?.rawPayload, ...extraPayload, notes: form.notes, stage: form.stage }
      }
    }, {
      onSuccess: () => {
        toast.success("Lead updated successfully");
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
                  {/* Form Submitted */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                      Form Submitted
                    </Label>
                    <div className="border border-input h-[40px] rounded-[8px] text-[12px] flex items-center px-3 bg-muted/30 text-foreground truncate" title={lead?.form?.name || "Not specified"}>
                      {lead?.form?.name || "Not specified"}
                    </div>
                  </div>
                  {/* Source */}
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="source"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Source
                    </Label>
                    <Select
                      value={
                        (SOURCES as readonly string[]).includes(form.source) && form.source !== "Other"
                          ? form.source
                          : form.source
                          ? "Other"
                          : ""
                      }
                      onValueChange={(v) => {
                        if (v === "Other") {
                          set("source", "Other");
                        } else {
                          set("source", v);
                        }
                      }}
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
                        {form.source && !(SOURCES as readonly string[]).includes(form.source) && (
                          <SelectItem value={form.source}>
                            {form.source} (Custom)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {(form.source === "Other" || (!((SOURCES as readonly string[]).includes(form.source)) && form.source !== "")) && (
                      <Input
                        placeholder="Type custom source (e.g. Newspaper, Seminar)..."
                        value={form.source === "Other" ? "" : form.source}
                        onChange={(e) => set("source", e.target.value)}
                        className="h-[38px] rounded-[8px] text-[12px] mt-1"
                        autoFocus={form.source === "Other"}
                      />
                    )}
                  </div>

                  {/* Campaign */}
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="campaign"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Campaign
                    </Label>
                    <Input
                      id="campaign"
                      placeholder="e.g. Fall 2027, Spring 2027, Direct Walk-in..."
                      value={form.campaign}
                      onChange={(e) => set("campaign", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full"
                    />
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
