"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Megaphone,
  Calendar,
  Send,
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Users,
} from "lucide-react";
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
import { usePageHeader } from "@/hooks/use-page-header";
import { useCreateEvent } from "@/hooks/use-events";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useCourses } from "@/hooks/use-courses";
import { EventPosterUploader } from "@/components/events/event-poster-uploader";
import {
  EventType,
  EventPriority,
  EventCategory,
  EventStatus,
  VenueType,
} from "@/types/events";

const CATEGORIES: EventCategory[] = [
  "Exam",
  "Admissions",
  "GD & Interview",
  "Academic",
  "Orientation",
  "Webinar",
  "Holiday",
  "General",
];

const TARGET_ROLES = [
  { id: "all", label: "All Users (Staff + Students)" },
  { id: "student", label: "Enrolled Students" },
  { id: "lead", label: "Leads & Applicants" },
  { id: "counselor", label: "Counselors" },
  { id: "org_admin", label: "Admins & Staff" },
  { id: "application_manager", label: "Application Managers" },
  { id: "exam_manager", label: "Exam Managers" },
];

const LEAD_STAGES = [
  "New",
  "Contacted",
  "Interested",
  "Verified",
  "Converted",
];

export default function CreateAnnouncementEventPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const { data: templates = [] } = useEmailTemplates();
  const { data: coursesData } = useCourses(1, 50);
  const coursesList = coursesData?.data || [];

  usePageHeader({
    title: "Create Announcement / Event",
    description: "Draft, schedule, and publish notices or events targeted to staff, students, and leads.",
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [form, setForm] = React.useState({
    title: "",
    type: "announcement" as EventType,
    category: "General" as EventCategory,
    description: "",
    priority: "Medium" as EventPriority,
    targetAudience: ["all"] as string[],
    targetLeadStages: [] as string[],
    targetCourseId: "all",
    targetCourseName: "All Programs",
    eventStartDate: "",
    eventEndDate: "",
    eventStartTime: "",
    eventEndTime: "",
    venueType: "in_person" as VenueType,
    venueLocation: "",
    status: "Published" as EventStatus,
    publishMode: "now" as "now" | "schedule",
    scheduledPublishDate: "",
    scheduledPublishTime: "",
    sendInAppNotification: true,
    sendEmailBroadcast: false,
    sendWhatsapp: false,
    emailTemplateId: "",
    attachmentName: "",
    attachmentUrl: "",
    attachmentType: "other" as "image" | "pdf" | "other",
    posterUrl: "",
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function toggleRole(roleId: string) {
    setForm((prev) => {
      let updated: string[];
      if (roleId === "all") {
        updated = ["all"];
      } else {
        const withoutAll = prev.targetAudience.filter((r) => r !== "all");
        if (withoutAll.includes(roleId)) {
          updated = withoutAll.filter((r) => r !== roleId);
          if (updated.length === 0) updated = ["all"];
        } else {
          updated = [...withoutAll, roleId];
        }
      }
      return { ...prev, targetAudience: updated };
    });
  }

  function toggleLeadStage(stage: string) {
    setForm((prev) => {
      const current = prev.targetLeadStages || [];
      const updated = current.includes(stage)
        ? current.filter((s) => s !== stage)
        : [...current, stage];
      return { ...prev, targetLeadStages: updated };
    });
  }

  function handleSubmit(statusToSave: EventStatus) {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      title: form.title.trim(),
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      priority: form.priority,
      targetAudience: form.targetAudience,
      targetLeadStages: form.targetAudience.includes("lead") ? form.targetLeadStages : [],
      targetCourseId: form.targetCourseId !== "all" ? form.targetCourseId : undefined,
      targetCourseName:
        form.targetCourseId !== "all"
          ? coursesList.find((c: any) => c.id === form.targetCourseId)?.name || form.targetCourseName
          : "All Programs",
      eventStartDate: form.eventStartDate || undefined,
      eventEndDate: form.eventEndDate || undefined,
      eventStartTime: form.eventStartTime || undefined,
      eventEndTime: form.eventEndTime || undefined,
      venueType: form.venueType,
      venueLocation: form.venueLocation || undefined,
      status: statusToSave,
      scheduledPublishDate: form.publishMode === "schedule" ? form.scheduledPublishDate : undefined,
      scheduledPublishTime: form.publishMode === "schedule" ? form.scheduledPublishTime : undefined,
      sendInAppNotification: form.sendInAppNotification,
      sendEmailBroadcast: form.sendEmailBroadcast,
      sendWhatsapp: form.sendWhatsapp,
      emailTemplateId: form.sendEmailBroadcast ? form.emailTemplateId || undefined : undefined,
      attachmentName: form.attachmentName || undefined,
      attachmentUrl: form.attachmentUrl || undefined,
      attachmentType: form.attachmentType,
      posterUrl: form.posterUrl || undefined,
      createdByName: "Admissions Team",
    };

    createEvent.mutate(payload, {
      onSuccess: () => {
        router.push("/organization/events");
      },
    });
  }

  return (
    <>
      {/* Sticky Top Header - Matching lead-manager */}
      <div className="sticky top-0 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 gap-3 border-b border-border/80">
        <Link href="/organization/events">
          <Button variant="ghost" size="icon" className="size-9 rounded-md">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          Create Announcement / Event
        </h1>
      </div>

      <div className="px-4 md:px-6 py-2 md:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols) - Exact match with lead-manager card styling */}
          <Card className="lg:col-span-8 bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-input px-6 py-4">
              <CardTitle className="text-[18px] font-medium text-foreground">
                Event & Announcement Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 flex flex-col divide-y divide-input">
              {/* Section 1: Basic Information */}
              <section className="flex flex-col gap-5 pb-6 pt-2">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Basic Information
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Title, content type, category, and priority level.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Title (Span 2) */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label
                      htmlFor="title"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Title / Subject *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., National Entrance Exam Phase-I Hall Tickets Released"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      className={`border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground ${
                        errors.title ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                    />
                    {errors.title && (
                      <span className="text-[11px] text-red-500 font-medium">
                        {errors.title}
                      </span>
                    )}
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="type"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Content Type
                    </Label>
                    <Select
                      value={form.type}
                      onValueChange={(val) => setField("type", val as EventType)}
                    >
                      <SelectTrigger
                        id="type"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement / Notice</SelectItem>
                        <SelectItem value="event">Event (Exam, GD/PI, Webinar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="category"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Category
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(val) => setField("category", val as EventCategory)}
                    >
                      <SelectTrigger
                        id="category"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="priority"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Priority Level
                    </Label>
                    <Select
                      value={form.priority}
                      onValueChange={(val) => setField("priority", val as EventPriority)}
                    >
                      <SelectTrigger
                        id="priority"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Course / Program */}
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="course"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Target Program / Course
                    </Label>
                    <Select
                      value={form.targetCourseId}
                      onValueChange={(val) => setField("targetCourseId", val)}
                    >
                      <SelectTrigger
                        id="course"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="All Programs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programs</SelectItem>
                        {coursesList.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Section 2: Schedule & Location */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Schedule & Location
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Date, timing, venue or virtual meeting links.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="startDate"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Start Date
                    </Label>
                    <div className="relative">
                      <Input
                        id="startDate"
                        type="date"
                        value={form.eventStartDate}
                        onChange={(e) => setField("eventStartDate", e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                        <Calendar className="size-4 text-muted-foreground" />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="endDate"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      End Date (Optional)
                    </Label>
                    <div className="relative">
                      <Input
                        id="endDate"
                        type="date"
                        value={form.eventEndDate}
                        onChange={(e) => setField("eventEndDate", e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                        <Calendar className="size-4 text-muted-foreground" />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="startTime"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Start Time
                    </Label>
                    <div className="relative">
                      <Input
                        id="startTime"
                        type="time"
                        value={form.eventStartTime}
                        onChange={(e) => setField("eventStartTime", e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                        <Clock className="size-4 text-muted-foreground" />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="endTime"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      End Time
                    </Label>
                    <div className="relative">
                      <Input
                        id="endTime"
                        type="time"
                        value={form.eventEndTime}
                        onChange={(e) => setField("eventEndTime", e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground pr-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                        <Clock className="size-4 text-muted-foreground" />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="venueType"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      Venue Type
                    </Label>
                    <Select
                      value={form.venueType}
                      onValueChange={(val) => setField("venueType", val as VenueType)}
                    >
                      <SelectTrigger
                        id="venueType"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select Venue Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">Campus / In-Person</SelectItem>
                        <SelectItem value="virtual">Virtual (Meet / Zoom)</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="venueLocation"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      {form.venueType === "virtual"
                        ? "Virtual Meeting Link (URL)"
                        : "Campus Venue / Room"}
                    </Label>
                    <Input
                      id="venueLocation"
                      placeholder={
                        form.venueType === "virtual"
                          ? "https://meet.google.com/xyz-abcd-efg"
                          : "Main Auditorium, Block C"
                      }
                      value={form.venueLocation}
                      onChange={(e) => setField("venueLocation", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </section>

              {/* Section 3: Target Audience & Roles */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Target Audience
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Select roles and applicant segments who should view this notice.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TARGET_ROLES.map((role) => {
                    const isSelected = form.targetAudience.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={`border border-input h-[42px] rounded-[8px] text-[12px] flex items-center px-3 gap-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-muted/40 font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRole(role.id)}
                          className="size-4 rounded accent-primary cursor-pointer"
                        />
                        <span>{role.label}</span>
                      </label>
                    );
                  })}
                </div>

                {form.targetAudience.includes("lead") && (
                  <div className="flex flex-col gap-2 mt-2">
                    <Label className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                      Filter by Lead Stage
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {LEAD_STAGES.map((stg) => {
                        const isSelected = form.targetLeadStages.includes(stg);
                        return (
                          <button
                            key={stg}
                            type="button"
                            onClick={() => toggleLeadStage(stg)}
                            className={`px-3 py-1 rounded-[6px] text-[12px] font-medium border transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/30 text-muted-foreground border-input hover:bg-muted/60"
                            }`}
                          >
                            {stg}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Section 4: Notice Message */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Announcement Message
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Full body instructions, agenda, document requirements, and guidelines.
                  </p>
                </div>
                <Textarea
                  placeholder="Type the full announcement message or event details..."
                  className="border border-input min-h-[140px] rounded-[8px] text-[12px] placeholder:text-muted-foreground leading-relaxed"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </section>

              {/* Section 5: Poster & Attachments (S3 R2 Attached) */}
              <section className="flex flex-col gap-5 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-[16px] font-medium text-foreground">
                    Poster & Circular Attachment (Cloud Storage)
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    Upload an event flyer, poster banner, or official circular PDF via Cloudflare R2 / S3.
                  </p>
                </div>
                <EventPosterUploader
                  posterUrl={form.posterUrl}
                  attachmentUrl={form.attachmentUrl}
                  attachmentName={form.attachmentName}
                  attachmentType={form.attachmentType}
                  onChange={({ posterUrl, attachmentUrl, attachmentName, attachmentType }) => {
                    setForm((prev) => ({
                      ...prev,
                      posterUrl: posterUrl ?? prev.posterUrl,
                      attachmentUrl: attachmentUrl ?? prev.attachmentUrl,
                      attachmentName: attachmentName ?? prev.attachmentName,
                      attachmentType: attachmentType ?? prev.attachmentType,
                    }));
                  }}
                />
              </section>
            </CardContent>
          </Card>

          {/* Right Column (4 cols) - CRM / Status Sidebar matching lead-manager */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Card 1: Publishing Status */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-6">
              <h2 className="text-[18px] font-medium text-foreground">
                Publishing Status
              </h2>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="publishMode"
                    className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                  >
                    Publish Mode
                  </Label>
                  <Select
                    value={form.publishMode}
                    onValueChange={(val) => setField("publishMode", val as "now" | "schedule")}
                  >
                    <SelectTrigger
                      id="publishMode"
                      className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                    >
                      <SelectValue placeholder="Select Publish Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Publish Immediately</SelectItem>
                      <SelectItem value="schedule">Schedule for Specific Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.publishMode === "schedule" && (
                  <div className="flex flex-col gap-3 p-3.5 bg-muted/30 rounded-[8px] border border-input">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Scheduled Release Date
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={form.scheduledPublishDate}
                          onChange={(e) => setField("scheduledPublishDate", e.target.value)}
                          onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                          className="border border-input h-[38px] rounded-[8px] text-[12px] pr-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                        />
                        <span className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-muted-foreground">
                          <Calendar className="size-3.5 text-muted-foreground" />
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Scheduled Release Time
                      </Label>
                      <div className="relative">
                        <Input
                          type="time"
                          value={form.scheduledPublishTime}
                          onChange={(e) => setField("scheduledPublishTime", e.target.value)}
                          onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                          className="border border-input h-[38px] rounded-[8px] text-[12px] pr-9 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                        />
                        <span className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-muted-foreground">
                          <Clock className="size-3.5 text-muted-foreground" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Exact match with lead-manager */}
              <div className="flex flex-col gap-3 mt-2">
                <Button
                  className="w-full bg-ring hover:bg-ring/90 text-primary-foreground flex items-center justify-center gap-2 h-11 text-base font-medium rounded-[8px] cursor-pointer"
                  onClick={() =>
                    handleSubmit(form.publishMode === "schedule" ? "Scheduled" : "Published")
                  }
                  disabled={createEvent.isPending}
                >
                  <Check className="size-5" />
                  {createEvent.isPending
                    ? "Saving..."
                    : form.publishMode === "schedule"
                    ? "Schedule Event / Notice"
                    : "Publish Announcement / Event"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border border-border h-11 text-base font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  disabled={createEvent.isPending}
                  onClick={() => handleSubmit("Draft")}
                >
                  Save as Draft
                </Button>

                <Link href="/organization/events" className="w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-10 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel & Return
                  </Button>
                </Link>
              </div>
            </div>

            {/* Card 2: Multi-channel Broadcast Settings */}
            <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-[18px] font-medium text-foreground">
                  Broadcast Channels
                </h2>
                <p className="text-[14px] text-muted-foreground">
                  Multi-channel delivery settings.
                </p>
              </div>

              <div className="flex flex-col gap-3 text-[12px]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendInAppNotification}
                    onChange={(e) => setField("sendInAppNotification", e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="font-medium text-foreground">In-App Notification Alert</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendEmailBroadcast}
                    onChange={(e) => setField("sendEmailBroadcast", e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="font-medium text-foreground">Email Broadcast</span>
                </label>

                {form.sendEmailBroadcast && (
                  <div className="flex flex-col gap-1.5 pl-6 pt-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Email Template
                    </Label>
                    <Select
                      value={form.emailTemplateId}
                      onValueChange={(val) => setField("emailTemplateId", val)}
                    >
                      <SelectTrigger className="border border-input h-[38px] rounded-[8px] text-[12px] w-full">
                        <SelectValue placeholder="Standard Announcement Layout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Template</SelectItem>
                        {templates.map((tmpl) => (
                          <SelectItem key={tmpl.id} value={tmpl.id}>
                            {tmpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendWhatsapp}
                    onChange={(e) => setField("sendWhatsapp", e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="font-medium text-foreground">WhatsApp / SMS Summary</span>
                </label>
              </div>
            </div>

            {/* Card 3: Protip Card - Exact match with lead-manager */}
            <div className="bg-accent flex flex-col gap-4 p-6 rounded-[8px]">
              <p className="text-accent-foreground text-[18px] font-semibold leading-normal">
                Protip
              </p>
              <p className="text-foreground text-[12px] font-medium leading-[20px] tracking-[0.6px]">
                Attaching an official poster banner or circular PDF via Cloudflare R2 storage ensures instant visual previews across the student portal and email notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
