/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Sparkles,
  Info,
  Check,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCreateEmailTemplate,
  useEmailTemplates,
  renderTemplate,
} from "@/hooks/use-email-templates";
import {
  AVAILABLE_SHORTCUTS,
  CreateEmailTemplateInput,
} from "@/types/email-template";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [
  "Interview Schedule",
  "Admission Offer",
  "Document Request",
  "Payment Reminder",
  "General Notice",
];

const TIME_SLOT_PRESETS = [
  "09:30 AM - 10:30 AM IST",
  "10:30 AM - 11:30 AM IST",
  "11:30 AM - 12:30 PM IST",
  "02:00 PM - 03:00 PM IST",
  "03:30 PM - 04:30 PM IST",
  "05:00 PM - 06:00 PM IST",
];

export default function CreateEmailTemplatePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  usePageHeader({
    title: "Email Templates",
    description: "Create and manage email communication templates for admission campaigns",
  });

  const createMutation = useCreateEmailTemplate();
  const { data: allTemplates = [] } = useEmailTemplates();

  // Form State
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Interview Schedule");
  const [channel, setChannel] = React.useState<"Email" | "SMS" | "WhatsApp">("Email");
  const [status, setStatus] = React.useState<"active" | "draft">("active");
  const [description, setDescription] = React.useState("");
  const [subject, setSubject] = React.useState(
    "Interview Schedule: GD & Personal Interview Slot - {course} ({application_no})"
  );
  const [body, setBody] = React.useState(
    `Dear {student},

We are pleased to inform you that your application {application_no} for {course} has been shortlisted for the upcoming selection round.

Selection Round Details:
- Date: {date}
- Time Slot: {time}
- Venue: {venue}

Please carry a copy of your verified documents, admit card, and government identity proof.

Warm regards,
{sender}
Admissions Directorate`
  );

  // Custom Category State
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [newCategoryInput, setNewCategoryInput] = React.useState("");

  // Date & Time Popup State
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = React.useState("10:30 AM - 11:30 AM IST");
  const [selectedVenue, setSelectedVenue] = React.useState("Main Campus Seminar Hall A");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("educrm_email_template_categories");
      if (saved) {
        setCustomCategories(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Combined categories from defaults, database, and localStorage
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    customCategories.forEach((c) => set.add(c));
    allTemplates.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    if (category && category !== "__add_new__") set.add(category);
    return Array.from(set);
  }, [customCategories, allTemplates, category]);

  const handleSaveNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      toast.error("Please enter a category name");
      return;
    }
    const formatted = trimmed
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (!customCategories.includes(formatted)) {
      const updated = [...customCategories, formatted];
      setCustomCategories(updated);
      try {
        localStorage.setItem("educrm_email_template_categories", JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
    setCategory(formatted);
    setNewCategoryInput("");
    setAddCategoryOpen(false);
    toast.success(`Category "${formatted}" added and selected`);
  };

  const bodyTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = React.useRef<HTMLInputElement>(null);

  // Formatted date string (e.g. 15 Oct 2026)
  const formattedDateStr = React.useMemo(() => {
    if (!selectedDate) return "15 Oct 2026";
    const d = new Date(selectedDate);
    return isNaN(d.getTime())
      ? selectedDate
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  }, [selectedDate]);

  // Context for real-time live preview
  const candidateContext: Record<string, string> = {
    student: "Aarav Sharma",
    course: "PGDM (Two-Year, Full-Time)",
    application_no: "APP2026001",
    date: formattedDateStr,
    time: selectedTime,
    venue: selectedVenue,
    sender: user?.name || "Admissions Desk",
    organization: "Global Educational Institute",
    email: "aarav.sharma@gmail.com",
    phone: "+91 98765 43210",
  };

  // Helper to insert shortcut tag at cursor in body
  const insertShortcut = (shortcutKey: string) => {
    if (shortcutKey === "date" || shortcutKey === "time" || shortcutKey === "venue") {
      // Ask date and time in popup first
      setDateTimeDialogOpen(true);
      return;
    }

    const tag = `{${shortcutKey}}`;
    const textarea = bodyTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? body.length;
      const end = textarea.selectionEnd ?? body.length;
      const nextBody = body.substring(0, start) + tag + body.substring(end);
      setBody(nextBody);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      setBody((prev) => prev + " " + tag);
    }
  };

  const insertSubjectShortcut = (shortcutKey: string) => {
    if (shortcutKey === "date" || shortcutKey === "time") {
      setDateTimeDialogOpen(true);
      return;
    }
    const tag = `{${shortcutKey}}`;
    const input = subjectInputRef.current;
    if (input) {
      const start = input.selectionStart ?? subject.length;
      const end = input.selectionEnd ?? subject.length;
      const nextSubject = subject.substring(0, start) + tag + subject.substring(end);
      setSubject(nextSubject);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      setSubject((prev) => prev + " " + tag);
    }
  };

  // When Date/Time is saved from the popup dialog
  const handleApplyDateTime = () => {
    setDateTimeDialogOpen(false);
    toast.success(`Schedule set: ${formattedDateStr} at ${selectedTime}`);

    // If neither {date} nor {time} are in the body, insert them
    const textarea = bodyTextareaRef.current;
    if (textarea) {
      if (!body.includes("{date}") && !body.includes("{time}")) {
        const tag = "\n- Date: {date}\n- Time Slot: {time}\n- Venue: {venue}\n";
        const start = textarea.selectionStart ?? body.length;
        const end = textarea.selectionEnd ?? body.length;
        const nextBody = body.substring(0, start) + tag + body.substring(end);
        setBody(nextBody);
      }
    }
  };

  const handleSubmit = async (saveStatus?: "active" | "draft") => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter a subject line");
      return;
    }
    if (!body.trim()) {
      toast.error("Please enter email body content");
      return;
    }

    const matches = body.match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
    const subjectMatches = subject.match(/\{([a-zA-Z0-9_-]+)\}/g) || [];
    const rawVars = [...matches, ...subjectMatches].map((v) =>
      v.replace(/[{}]/g, "").trim().toLowerCase()
    );
    const variables = Array.from(new Set(rawVars));

    const payload: CreateEmailTemplateInput = {
      name: name.trim(),
      category,
      channel,
      subject: subject.trim(),
      body: body.trim(),
      description: description.trim() || undefined,
      variables,
      status: saveStatus || status,
    };

    try {
      await createMutation.mutateAsync(payload);
      router.push("/organization/email-templates");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1400px] mx-auto">
        {/* Top Header matching Forms Create page */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e5e5] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/organization/email-templates">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-[8px] border-[#e5e5e5] text-[#1e293b] hover:bg-slate-50 bg-white flex items-center justify-center shrink-0 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-[28px] font-medium tracking-tight text-[#120352] leading-[normal]">
                Create Email Template
              </h1>
            </div>
            <p className="text-[#64748b] text-[13px] leading-relaxed pl-11">
              Configure communication templates with dynamic variables for interview calls, offers, reminders, and notices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/organization/email-templates")}
              className="border border-[#a3a3a3] border-solid flex gap-[8px] items-center px-[17px] py-[7px] rounded-[6px] shrink-0 hover:bg-slate-50 transition-colors duration-150 bg-white cursor-pointer"
            >
              <span className="font-medium text-[#1e293b] text-[14px] leading-[16px]">
                Cancel
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={createMutation.isPending}
              className="border border-[#a3a3a3] border-solid flex gap-[8px] items-center px-[17px] py-[7px] rounded-[6px] shrink-0 hover:bg-slate-50 transition-colors duration-150 bg-white cursor-pointer"
            >
              <span className="font-medium text-[#1e293b] text-[14px] leading-[16px]">
                Save as Draft
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("active")}
              disabled={createMutation.isPending}
              className="bg-[#2563ea] text-white flex gap-[8px] items-center px-[18px] py-[8px] rounded-[6px] shrink-0 hover:bg-[#1d4ed8] transition-colors duration-150 cursor-pointer shadow-sm"
            >
              <span className="font-medium text-white text-[14px] leading-[16px]">
                {createMutation.isPending ? "Saving..." : "Save Template"}
              </span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Configuration */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Card 1: Basic Information */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] space-y-4">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-[15px] font-semibold text-[#1e293b]">
                  Template Details
                </h2>
                <p className="text-[12px] text-[#64748b] mt-0.5">
                  General classification and dispatch parameters.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#1e293b]">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. GD & Personal Interview Invitation"
                  className="h-10 border-[#e5e5e5] rounded-[6px] text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1 items-start">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between h-5">
                    <label className="text-[13px] font-medium text-[#1e293b] flex items-center">
                      Category <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddCategoryOpen(true)}
                      className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Category
                    </button>
                  </div>
                  <Select
                    value={category}
                    onValueChange={(val) => {
                      if (val === "__add_new__") {
                        setAddCategoryOpen(true);
                      } else {
                        setCategory(val);
                      }
                    }}
                  >
                    <SelectTrigger size="lg" className="w-full h-10 border-[#e5e5e5] rounded-[6px] text-[14px] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-[13px]">
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem
                        value="__add_new__"
                        className="text-[13px] text-[#2563EB] font-medium cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <Plus className="size-3.5" />
                          <span>+ Add New Category...</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="text-[13px] font-medium text-[#1e293b] h-5 flex items-center truncate">
                    Description / Purpose (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Sent when scheduling applicants for interview rounds"
                    className="w-full h-10 border-[#e5e5e5] rounded-[6px] text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Email Content & Variable Toolbar */}
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] space-y-4">
              <div className="border-b border-[#f1f5f9] pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1e293b]">
                    Email Content & Variables
                  </h2>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    Compose the subject and body using curly-bracket shortcuts.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDateTimeDialogOpen(true)}
                  className="h-8 text-xs font-medium border-[#e5e5e5] text-[#2563EB] hover:bg-blue-50/50 gap-1.5"
                >
                  <Clock className="size-3.5" />
                  Set Date & Time
                </Button>
              </div>

              {/* Subject Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#1e293b]">
                    Subject Line <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#64748b]">
                    Click pill to append shortcut:
                  </span>
                </div>
                <Input
                  ref={subjectInputRef}
                  placeholder="e.g. Interview Schedule: Selection Round - {course} ({application_no})"
                  className="h-10 border-[#e5e5e5] rounded-[6px] text-[14px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white font-medium"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {["student", "course", "application_no", "date"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => insertSubjectShortcut(k)}
                      className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-[4px] bg-[#fafafa] hover:bg-[#eff6ff] text-[#475569] hover:text-[#2563eb] border border-[#e2e8f0] transition-colors cursor-pointer"
                    >
                      +&#123;{k}&#125;
                    </button>
                  ))}
                </div>
              </div>

              {/* Variables Toolbar */}
              <div className="rounded-[8px] bg-[#fafafa] border border-[#e5e5e5] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#1e293b]">
                    Candidate & Schedule Variables
                  </span>
                  <span className="text-[11px] text-[#64748b]">
                    Hover to preview value • Click to insert
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_SHORTCUTS.map((sc) => (
                    <Tooltip key={sc.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => insertShortcut(sc.key)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-left transition-all cursor-pointer shadow-2xs ${
                            sc.key === "date" || sc.key === "time"
                              ? "bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] hover:bg-[#DBEAFE] font-medium"
                              : "bg-white border border-[#E2E8F0] hover:border-[#2563EB] text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <span className="font-mono text-[11px] font-bold text-[#2563EB]">
                            {sc.tag}
                          </span>
                          <span className="text-[11px] text-[#475569] font-medium">
                            {sc.label}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-white text-[#0F172A] border border-[#E2E8F0] shadow-[0px_6px_20px_rgba(0,0,0,0.08)] p-3 rounded-[8px] max-w-xs z-50 animate-in fade-in-0 zoom-in-95"
                      >
                        <div className="flex items-center gap-2 pb-1.5 border-b border-[#F1F5F9]">
                          <span className="font-mono text-[12px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#DBEAFE]">
                            {sc.tag}
                          </span>
                          <span className="text-[12px] font-bold text-[#0F172A]">{sc.label}</span>
                        </div>
                        <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">{sc.description}</p>
                        <div className="mt-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-[#64748B] font-medium">Resolves to:</span>
                          <span className="font-mono font-semibold text-[#2563EB]">
                            {sc.key === "sender" ? user?.name || "Admissions Desk" : sc.sampleValue}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Email Body Textarea */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#1e293b]">
                  Email Body Content <span className="text-red-500">*</span>
                </label>
                <Textarea
                  ref={bodyTextareaRef}
                  rows={13}
                  placeholder="Enter email template text..."
                  className="border-[#e5e5e5] rounded-[6px] text-[14px] leading-relaxed p-3.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white font-sans"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              {/* Dynamic note */}
              <div className="flex items-start gap-2.5 p-3 rounded-[6px] bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-[#475569]">
                <Info className="size-4 text-[#2563eb] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Personalized Sender:</strong> The <code className="text-[#1e293b] font-mono">&#123;sender&#125;</code> variable dynamically evaluates to the current authenticated counselor ({user?.name || "Admissions Desk"}) upon message dispatch.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Light Theme Email Preview */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.06)] overflow-hidden">
              {/* Email Client Header Bar */}
              <div className="bg-white border-b border-[#e5e5e5] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#2563EB]" />
                  <span className="text-[13px] font-semibold text-[#0F172A]">
                    Live Email Preview
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE] px-1.5 py-0.2">
                    Light Theme
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateTimeDialogOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-medium border-[#e2e8f0] bg-white hover:bg-slate-50 gap-1 text-[#2563EB]"
                >
                  <CalendarIcon className="size-3" />
                  Change Date & Time
                </Button>
              </div>

              {/* Message Header Info */}
              <div className="p-4 bg-white border-b border-[#f1f5f9] space-y-2 text-[12px]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[#64748b]">To:</span>
                  <span className="font-semibold text-[#0F172A]">
                    Aarav Sharma &lt;aarav.sharma@gmail.com&gt;
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[#64748b]">From:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {user?.name || "Admissions Desk"} &lt;{user?.email || "admissions@institute.edu"}&gt;
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[#64748b]">Category:</span>
                  <span className="font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-0.5 rounded-full text-[11px]">
                    {category}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#f1f5f9]">
                  <span className="text-[11px] text-[#64748b] block mb-0.5">Subject:</span>
                  <p className="font-bold text-[#0F172A] text-[14px] leading-snug">
                    {renderTemplate(subject, candidateContext) || (
                      <span className="text-[#94a3b8] italic">No subject entered</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Rendered Email Body */}
              <div className="p-5 min-h-[260px] max-h-[440px] overflow-y-auto bg-white">
                <div className="whitespace-pre-line text-[13px] text-[#1E293B] leading-relaxed font-sans select-text">
                  {renderTemplate(body, candidateContext) || (
                    <span className="text-[#94a3b8] italic">
                      Type template body on the left to see live evaluation...
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule pill indicator */}
              <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e5e5e5] flex items-center justify-between text-[11px] text-[#64748b]">
                <span>Date: <strong className="text-[#0F172A]">{formattedDateStr}</strong></span>
                <span>Time: <strong className="text-[#0F172A]">{selectedTime}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time Configuration Modal Popup */}
        <Dialog open={dateTimeDialogOpen} onOpenChange={setDateTimeDialogOpen}>
          <DialogContent className="max-w-md bg-white border border-[#e5e5e5] rounded-[12px] p-6 shadow-xl">
            <DialogHeader className="pb-3 border-b border-[#f1f5f9]">
              <DialogTitle className="text-[16px] font-semibold text-[#1e293b] flex items-center gap-2">
                <CalendarIcon className="size-4 text-[#2563eb]" />
                Select Schedule Date & Time
              </DialogTitle>
              <DialogDescription className="text-[12px] text-[#64748b]">
                Specify the date and time slot for this communication. These values will be dynamically inserted into &#123;date&#125; and &#123;time&#125;.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-[13px]">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#1e293b]">
                  Interview / Scheduled Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-10 border-[#e5e5e5] rounded-[6px] text-sm bg-white"
                />
                <span className="text-[11px] text-[#64748b]">
                  Evaluates to: <strong>{formattedDateStr}</strong>
                </span>
              </div>

              {/* Time Slot Input & Presets */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#1e293b]">
                  Time Slot <span className="text-red-500">*</span>
                </label>
                <Input
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  placeholder="e.g. 10:30 AM - 11:30 AM IST"
                  className="h-10 border-[#e5e5e5] rounded-[6px] text-sm bg-white"
                />
                {/* Presets */}
                <div className="pt-1">
                  <span className="text-[11px] text-[#64748b] block mb-1">Quick Select Slot:</span>
                  <div className="flex flex-wrap gap-1">
                    {TIME_SLOT_PRESETS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`text-[11px] px-2 py-0.5 rounded-[4px] border transition-colors ${
                          selectedTime === slot
                            ? "bg-blue-50 border-blue-300 text-[#2563eb] font-semibold"
                            : "bg-[#fafafa] border-[#e2e8f0] text-[#475569] hover:bg-slate-100"
                        }`}
                      >
                        {slot.replace(" IST", "")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Venue Input */}
              <div className="space-y-1.5">
                <label className="font-medium text-[#1e293b]">
                  Venue / Meeting Room / Online Link
                </label>
                <Input
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  placeholder="e.g. Main Campus Seminar Hall A or Google Meet link"
                  className="h-10 border-[#e5e5e5] rounded-[6px] text-sm bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#f1f5f9] flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateTimeDialogOpen(false)}
                className="h-9 px-4 text-xs font-medium border-[#e5e5e5]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyDateTime}
                className="h-9 px-4 text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                Apply Date & Time
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Custom Category Dialog */}
        <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Add Custom Category</DialogTitle>
              <DialogDescription>
                Create a custom category for classifying your templates. It will be immediately selected and saved for future templates.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#1e293b]">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Scholarship Award, Hostel Notice..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveNewCategory();
                    }
                  }}
                  autoFocus
                  className="h-10 border-[#e5e5e5] text-[14px]"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setAddCategoryOpen(false);
                  setNewCategoryInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                onClick={handleSaveNewCategory}
              >
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
