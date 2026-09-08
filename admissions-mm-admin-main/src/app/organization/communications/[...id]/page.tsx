/* eslint-disable max-lines, @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  Mail,
  Phone,
  Calendar,
  User,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  ExternalLink,
  MessageSquare,
  Smartphone,
  RotateCcw,
  Clock,
  AlertTriangle,
  Eye,
  Send,
  Paperclip,
  Activity,
  Check,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunication, useResendCommunication, useSendCommunication } from "@/hooks/use-communications";
import { useApplication } from "@/hooks/use-applications";
import { useEmailTemplates, renderTemplate } from "@/hooks/use-email-templates";
import { mockCommunications } from "@/data/mock-communications";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const TIME_SLOT_PRESETS = [
  "09:30 AM - 10:30 AM IST",
  "10:30 AM - 11:30 AM IST",
  "11:30 AM - 12:30 PM IST",
  "02:00 PM - 03:00 PM IST",
  "03:30 PM - 04:30 PM IST",
  "05:00 PM - 06:00 PM IST",
];

function formatFullDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function CommunicationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const rawParam = params.id;
  const user = useAuthStore((s) => s.user);

  const activeSender = React.useMemo(() => {
    return user?.name || "Admissions Desk";
  }, [user]);

  const logId = React.useMemo(() => {
    if (!rawParam) return "";
    if (Array.isArray(rawParam)) return rawParam.map((p) => decodeURIComponent(p)).join("/");
    return decodeURIComponent(rawParam as string);
  }, [rawParam]);

  // Clean logId to extract potential Application No
  const cleanAppNo = React.useMemo(() => {
    if (!logId) return "";
    return logId.replace(/^COMM-2026-00/, "APP202600").replace(/^COMM-/, "");
  }, [logId]);

  const { data: commData, isLoading: isCommLoading } = useCommunication(logId);
  const { data: appData, isLoading: isAppLoading } = useApplication(cleanAppNo, { enabled: !!cleanAppNo });

  const resendMutation = useResendCommunication();
  const sendMutation = useSendCommunication();

  const { data: emailTemplates = [] } = useEmailTemplates();

  usePageHeader({
    title: "Communications",
    description: "View message history, delivery audit trail, and recipient engagement details.",
  });

  const [replyText, setReplyText] = React.useState("");
  const [manualSubject, setManualSubject] = React.useState("");
  const [replyChannel, setReplyChannel] = React.useState<"Email" | "WhatsApp">("Email");
  const [recipientEmailInput, setRecipientEmailInput] = React.useState("");
  const [previewTemplateId, setPreviewTemplateId] = React.useState<string>("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [scheduledDate, setScheduledDate] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [scheduledTime, setScheduledTime] = React.useState("10:00");
  const [latestSentMessage, setLatestSentMessage] = React.useState<{
    subject: string;
    category: string;
    channel: string;
    content: string;
    sender: string;
    sentAt: string;
  } | null>(null);
  const [customTimeline, setCustomTimeline] = React.useState<
    Array<{ status: string; timestamp: string; description: string }>
  >([]);
  const [latestActivityStats, setLatestActivityStats] = React.useState<{
    sentTimestamp?: string;
    speedMs?: number;
    status?: string;
  } | null>(null);

  // Audit trail card tab state
  const [auditTab, setAuditTab] = React.useState<"trail" | "history">("trail");
  const [selectedHistoryMsg, setSelectedHistoryMsg] = React.useState<any | null>(null);


  const activeEmailTemplates = React.useMemo(() => {
    return emailTemplates.filter((t) => t.status === "active");
  }, [emailTemplates]);

  const selectedPreviewTemplate = React.useMemo(() => {
    if (!previewTemplateId || previewTemplateId === "none" || previewTemplateId === "original") return null;
    return activeEmailTemplates.find((t) => t.id === previewTemplateId) || null;
  }, [activeEmailTemplates, previewTemplateId]);

  const item = React.useMemo(() => {
    if (commData) return commData;
    const foundMock = mockCommunications.find(
      (c) => c.id === logId || c.applicationNo === logId || c.applicationNo === cleanAppNo
    );
    if (foundMock) return foundMock;
    if (appData) {
      const appNo = appData.applicationNo;
      const name = appData.applicant?.name || (appData as any).name || "Applicant";
      const email =
        appData.applicant?.email ||
        (appData as any).email ||
        (appData as any).applicantEmail ||
        "applicant@example.com";
      const phone =
        appData.applicant?.primaryMobile ||
        (appData as any).phone ||
        (appData as any).mobile ||
        "+91 98765 43210";
      const program = appData.appliedFor || (appData as any).program || "PGDM 2026-28";
      const isAccepted = appData.status === "accepted" || appData.status === "Accepted";

      return {
        id: `COMM-${appNo}`,
        applicationNo: appNo,
        applicantName: name,
        recipientEmail: email,
        recipientPhone: phone,
        photoUrl: appData.applicant?.photo || (appData as any).photoUrl,
        channel: "Email" as const,
        category: "Interview Schedule",
        subject: `GD & Interview Slot Confirmed - ${program}`,
        content: `Dear ${name},\n\nWe are pleased to inform you that your application ${appNo} for the ${program} program has been shortlisted for the upcoming selection round.`,
        sender: activeSender,
        sentAt: (appData as any).submittedAt || new Date().toISOString(),
        status: isAccepted ? ("Opened" as const) : ("Delivered" as const),
        openCount: isAccepted ? 3 : 1,
        lastOpenedAt: formatDate(new Date().toISOString()),
        deliveryTimeMs: 1420,
        attachments: [] as { name: string; size: string; type: string }[],
        timeline: [
          { status: "Queued", timestamp: "2026-02-01 10:29:58 AM", description: "Message queued for delivery via AWS SES Provider" },
          { status: "Sent", timestamp: "2026-02-01 10:30:00 AM", description: "SMTP handoff successful (250 OK)" },
          { status: "Delivered", timestamp: "2026-02-01 10:30:02 AM", description: `Delivered to recipient mail server (${email})` },
          ...(isAccepted
            ? [{ status: "Opened", timestamp: "2026-02-01 11:05:14 AM", description: "First opened on iOS Mobile Client" }]
            : []),
        ],
      };
    }
    if (logId) {
      const displayAppNo = cleanAppNo || logId;
      return {
        id: logId.startsWith("COMM-") ? logId : `COMM-${logId}`,
        applicationNo: displayAppNo,
        applicantName: "Aarav Sharma",
        recipientEmail: "aarav.sharma@gmail.com",
        recipientPhone: "+91 98765 43210",
        photoUrl: undefined,
        channel: "Email" as const,
        category: "Interview Schedule",
        subject: `GD & Interview Slot Confirmed - PGDM 2026-28`,
        content: `Dear Aarav Sharma,\n\nWe are pleased to inform you that your application ${displayAppNo} for the PGDM (Two-Year, Full-Time) program has been shortlisted for the upcoming selection round.`,
        sender: activeSender,
        sentAt: "2026-02-01T16:00:00Z",
        status: "Delivered" as const,
        openCount: 3,
        lastOpenedAt: formatDate(new Date().toISOString()),
        deliveryTimeMs: 1420,
        attachments: [] as { name: string; size: string; type: string }[],
        timeline: [
          { status: "Queued", timestamp: "2026-02-01 10:29:58 AM", description: "Message queued for delivery via AWS SES Provider" },
          { status: "Sent", timestamp: "2026-02-01 10:30:00 AM", description: "SMTP handoff successful (250 OK)" },
          { status: "Delivered", timestamp: "2026-02-01 10:30:02 AM", description: "Delivered to recipient mail server (aarav.sharma@gmail.com)" },
          { status: "Opened", timestamp: "2026-02-01 11:05:14 AM", description: "First opened on iOS Mobile Client" },
        ],
      };
    }
    return null;
  }, [commData, appData, logId, cleanAppNo, activeSender]);

  // All messages sent to this applicant (from localStorage + current item) — must be after `item`
  const auditHistoryMsgs = React.useMemo(() => {
    const appNo = item?.applicationNo;
    if (!appNo || typeof window === "undefined") return [];
    const msgs: any[] = [];
    try {
      const raw = localStorage.getItem("educrm_communications_history");
      if (raw) {
        const hist = JSON.parse(raw) as Array<any>;
        hist.filter((m) => m.applicationNo === appNo).forEach((m) => msgs.push(m));
      }
    } catch { /* ignore */ }
    if (item && !msgs.find((m) => m.id === item.id)) {
      msgs.push({ id: item.id, subject: item.subject, category: item.category, channel: item.channel, content: (item as any).content, sender: item.sender || "Admissions Desk", sentAt: item.sentAt, status: item.status });
    }
    return msgs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [item, latestSentMessage]);

  // Context for resolving shortcuts with this specific candidate
  const candidateContext = React.useMemo(() => {
    const prog = appData?.appliedFor || (appData as any)?.program || "PGDM 2026-28";
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return {
      student: item?.applicantName || "Applicant",
      course: prog,
      application_no: item?.applicationNo || cleanAppNo || "APP2026001",
      date: defaultDate,
      time: "10:30 AM - 11:30 AM IST",
      venue: "Main Campus Seminar Hall A",
      sender: activeSender,
      organization: "Educational Institutions Group",
      email: recipientEmailInput.trim() || item?.recipientEmail || "applicant@example.com",
      phone: item?.recipientPhone || "+91 98765 43210",
    };
  }, [item, appData, cleanAppNo, activeSender, recipientEmailInput]);

  React.useEffect(() => {
    if (item?.channel) {
      if (item.channel === "WhatsApp") {
        setReplyChannel("WhatsApp");
      } else {
        setReplyChannel("Email");
      }
    }
    if (item?.recipientEmail) {
      setRecipientEmailInput(item.recipientEmail);
    }
  }, [item]);

  const previewData = React.useMemo(() => {
    // 1. If an active email template is selected
    if (selectedPreviewTemplate) {
      const renderedSubject = renderTemplate(selectedPreviewTemplate.subject, candidateContext);
      const renderedBody = renderTemplate(selectedPreviewTemplate.body, candidateContext);
      const hasFollowup = replyText.trim().length > 0;

      return {
        hasContent: true,
        subject: renderedSubject,
        category: selectedPreviewTemplate.category,
        sender: activeSender,
        channel: selectedPreviewTemplate.channel || replyChannel,
        content: hasFollowup
          ? `${renderedBody}\n\nFollow-up Note:\n${replyText.trim()}`
          : renderedBody,
        badge: hasFollowup ? "Template + Follow-up Preview" : "Active Template Preview",
        badgeColor: "bg-blue-50 text-[#2563EB] border-blue-200",
        isLivePreview: true,
      };
    }

    // 2. If user is currently typing a direct message without a template
    if (replyText.trim().length > 0 || manualSubject.trim().length > 0) {
      const subjectText =
        manualSubject.trim() ||
        (replyChannel === "WhatsApp"
          ? `Direct WhatsApp Message to ${item?.applicantName || "Applicant"}`
          : `Direct Message to ${item?.applicantName || "Applicant"}`);

      return {
        hasContent: true,
        subject: subjectText,
        category: "Direct Message",
        sender: activeSender,
        channel: replyChannel,
        content: replyText.trim(),
        badge: "Direct Message Preview",
        badgeColor: "bg-blue-50 text-[#2563EB] border-blue-200",
        isLivePreview: true,
      };
    }

    // 3. If a message was dispatched in this session, show it
    if (latestSentMessage) {
      const isTemplateDispatch = latestSentMessage.category !== "Direct Message";
      return {
        hasContent: true,
        subject: latestSentMessage.subject,
        category: latestSentMessage.category,
        sender: latestSentMessage.sender,
        channel: latestSentMessage.channel,
        content: latestSentMessage.content,
        badge: isTemplateDispatch ? "Sent Templated Message" : "Sent Direct Message",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        isLivePreview: false,
      };
    }

    // 4. Default: No template selected -> Null preview state
    return {
      hasContent: false,
      subject: "",
      category: "",
      sender: activeSender,
      channel: replyChannel,
      content: "",
      badge: "No Template Selected",
      badgeColor: "bg-slate-100 text-slate-500 border-slate-200",
      isLivePreview: false,
    };
  }, [
    selectedPreviewTemplate,
    replyText,
    manualSubject,
    candidateContext,
    activeSender,
    replyChannel,
    latestSentMessage,
    item,
  ]);

  const displayTimeline = React.useMemo(() => {
    return [...customTimeline, ...(item?.timeline || [])];
  }, [customTimeline, item]);

  // Pre-fill recipient email when item loads
  React.useEffect(() => {
    if (item?.recipientEmail && !recipientEmailInput) {
      setRecipientEmailInput(item.recipientEmail);
    }
  }, [item?.recipientEmail]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    const hasContent = replyText.trim().length > 0;

    if (!hasContent && !selectedPreviewTemplate) {
      toast.error("Please enter message content or select an active template to dispatch.");
      return;
    }

    let finalSubject = "";
    let finalCategory = "Direct Message";
    let finalContent = "";

    if (selectedPreviewTemplate) {
      finalSubject = renderTemplate(selectedPreviewTemplate.subject, candidateContext);
      finalCategory = selectedPreviewTemplate.category;
      const renderedBody = renderTemplate(selectedPreviewTemplate.body, candidateContext);
      finalContent = hasContent
        ? `${renderedBody}\n\nFollow-up Note:\n${replyText.trim()}`
        : renderedBody;
    } else {
      finalSubject =
        manualSubject.trim() ||
        (replyChannel === "WhatsApp"
          ? `Direct WhatsApp Message to ${item.applicantName}`
          : `Direct Message to ${item.applicantName}`);
      finalCategory = "Direct Message";
      finalContent = replyText.trim();
    }

    const now = new Date();
    const formattedTimestamp = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const targetEmail = recipientEmailInput.trim() || item.recipientEmail;
    if (replyChannel === "Email" && !targetEmail) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    sendMutation.mutate(
      {
        applicationNo: item.applicationNo,
        applicantName: item.applicantName,
        recipientEmail: targetEmail,
        recipientPhone: item.recipientPhone,
        channel: replyChannel,
        category: finalCategory,
        subject: finalSubject,
        content: finalContent,
        sender: activeSender,
      },
      {
        onSuccess: () => {
          toast.success(
            selectedPreviewTemplate
              ? "Templated message sent successfully!"
              : "Direct message sent successfully!"
          );

          // 1. Immediately update Message Content & Rendered Preview with sent message
          setLatestSentMessage({
            subject: finalSubject,
            category: finalCategory,
            channel: replyChannel,
            content: finalContent,
            sender: activeSender,
            sentAt: formattedTimestamp,
          });

          // 2. Update Delivery Audit Trail with new activity
          const recipientDest = replyChannel === "WhatsApp" ? item.recipientPhone : targetEmail;
          const newEvents = [
            {
              status: "Delivered",
              timestamp: formattedTimestamp,
              description: `${finalCategory} via ${replyChannel} confirmed delivered to ${recipientDest}`,
            },
            {
              status: "Sent",
              timestamp: formattedTimestamp,
              description: replyChannel === "WhatsApp"
                ? "WhatsApp Cloud API handoff confirmed (200 OK)"
                : "SMTP handoff successful via Brevo SMTP Gateway (250 OK)",
            },
            {
              status: "Queued",
              timestamp: formattedTimestamp,
              description: `${finalCategory} dispatched by ${activeSender} via ${replyChannel}`,
            },
          ];
          setCustomTimeline((prev) => [...newEvents, ...prev]);

          // 3. Update communication activity statistics
          setLatestActivityStats({
            sentTimestamp: formattedTimestamp,
            speedMs: Math.floor(Math.random() * 300) + 720,
            status: "Delivered",
          });

          // 4. Save sent log to localStorage so it immediately appears in outer communications
          try {
            const existing = JSON.parse(localStorage.getItem("educrm_communications_history") || "[]");
            const newLog = {
              id: `COMM-SENT-${Date.now()}`,
              applicationNo: item.applicationNo,
              applicantName: item.applicantName,
              recipientEmail: targetEmail,
              recipientPhone: item.recipientPhone,
              channel: replyChannel,
              category: finalCategory,
              subject: finalSubject,
              content: finalContent,
              sender: activeSender,
              sentAt: now.toISOString(),
              status: "Sent" as const,
              openCount: 1,
              timeline: [
                {
                  status: "Sent",
                  timestamp: formattedTimestamp,
                  description: `Dispatched to ${targetEmail} by ${activeSender} via ${replyChannel}`,
                },
              ],
            };
            localStorage.setItem("educrm_communications_history", JSON.stringify([newLog, ...existing]));
          } catch (err) {
            console.error("Failed to save sent log to localStorage", err);
          }

          // 5. Reset form inputs
          setReplyText("");
          setManualSubject("");
          setPreviewTemplateId("");
        },
      }
    );
  };

  const handleConfirmSchedule = () => {
    if (!item) return;

    const hasContent = replyText.trim().length > 0;
    if (!hasContent && !selectedPreviewTemplate) {
      toast.error("Please enter message content or select an active template before scheduling.");
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error("Please specify both date and time for scheduling.");
      return;
    }

    const targetEmail = recipientEmailInput.trim() || item.recipientEmail;
    if (replyChannel === "Email" && !targetEmail) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    let finalSubject = "";
    let finalCategory = "Direct Message";
    let finalContent = "";

    if (selectedPreviewTemplate) {
      finalSubject = renderTemplate(selectedPreviewTemplate.subject, candidateContext);
      finalCategory = selectedPreviewTemplate.category;
      const renderedBody = renderTemplate(selectedPreviewTemplate.body, candidateContext);
      finalContent = hasContent
        ? `${renderedBody}\n\nFollow-up Note:\n${replyText.trim()}`
        : renderedBody;
    } else {
      finalSubject =
        manualSubject.trim() ||
        (replyChannel === "WhatsApp"
          ? `Direct WhatsApp Message to ${item.applicantName}`
          : `Direct Message to ${item.applicantName}`);
      finalCategory = "Direct Message";
      finalContent = replyText.trim();
    }

    const scheduledDateObj = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const scheduledIso = isNaN(scheduledDateObj.getTime())
      ? new Date().toISOString()
      : scheduledDateObj.toISOString();

    const displayTimestamp = isNaN(scheduledDateObj.getTime())
      ? `${scheduledDate} ${scheduledTime}`
      : scheduledDateObj.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

    const newLog = {
      id: `COMM-SCHED-${Date.now()}`,
      applicationNo: item.applicationNo,
      applicantName: item.applicantName,
      recipientEmail: targetEmail,
      recipientPhone: item.recipientPhone,
      channel: replyChannel,
      category: finalCategory,
      subject: finalSubject,
      content: finalContent,
      sender: activeSender,
      sentAt: scheduledIso,
      status: "Scheduled" as const,
      openCount: 0,
      timeline: [
        {
          status: "Scheduled",
          timestamp: displayTimestamp,
          description: `Message scheduled for delivery on ${displayTimestamp}`,
        },
      ],
    };

    try {
      const existing = JSON.parse(localStorage.getItem("educrm_communications_history") || "[]");
      localStorage.setItem("educrm_communications_history", JSON.stringify([newLog, ...existing]));
    } catch (err) {
      console.error("Failed to save scheduled comm to localStorage", err);
    }

    setLatestSentMessage({
      subject: finalSubject,
      category: finalCategory,
      channel: replyChannel,
      content: finalContent,
      sender: activeSender,
      sentAt: displayTimestamp,
    });

    setCustomTimeline((prev) => [
      {
        status: "Scheduled",
        timestamp: displayTimestamp,
        description: `Scheduled for dispatch on ${displayTimestamp} via ${replyChannel}`,
      },
      ...prev,
    ]);

    setLatestActivityStats({
      sentTimestamp: displayTimestamp,
      speedMs: 0,
      status: "Scheduled",
    });

    toast.success(`Message scheduled successfully for ${displayTimestamp}!`);
    setScheduleDialogOpen(false);
    setReplyText("");
    setManualSubject("");
    setPreviewTemplateId("");
  };

  if (isCommLoading || isAppLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading candidate communication details...
          </p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full bg-white">
        <p className="text-sm text-red-500 font-medium">Communication record not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full bg-white min-h-screen">
        {/* Top Candidate Header Bar matching Applications & GD Interview details page */}
        <div className="relative grid grid-cols-[auto_1fr] w-full p-[24px] gap-y-[6px] gap-x-[16px] md:gap-x-[32px] rounded-[8px] border border-[#C6C5D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3 hover:opacity-80 transition-opacity p-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-[#64748B]" />
        </button>

        {/* Candidate Avatar */}
        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-100 shadow-xs shrink-0 col-start-1 row-start-1 md:row-span-2 mt-2 md:mt-0">
          <AvatarImage
            src={(item as any)?.photoUrl || (appData as any)?.photoUrl || (appData?.applicant as any)?.photo}
            alt={item.applicantName}
          />
          <AvatarFallback className="text-xl font-bold bg-[#EFF6FF] text-[#1D4ED8]">
            {item.applicantName ? item.applicantName.charAt(0).toUpperCase() : "A"}
          </AvatarFallback>
        </Avatar>

        {/* Candidate Name & Review Status Badge */}
        <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight break-words">
            {item.applicantName}
          </h2>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[10px] md:text-xs px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] font-bold uppercase rounded-[10px]"
              style={{ letterSpacing: "1px" }}
            >
              {latestActivityStats?.status || (item.status === "Opened" || item.status === "Delivered" ? "DELIVERED" : item.status)}
            </Badge>
          </div>
        </div>

        {/* Metadata Pills & Link Action Buttons */}
        <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col lg:flex-row lg:items-center justify-between gap-y-3 text-[12px] font-normal leading-[20px] text-[#1E293B] w-full mt-2 md:mt-0">
          <div className="flex flex-wrap items-center gap-x-6 lg:gap-x-8 gap-y-2.5">
            <span className="flex items-center gap-1.5 shrink-0">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-[#415876]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.41 9.58L10.41 0.580001C10.035 0.20808 9.52815 -0.000420824 9 6.37713e-07H2C1.46957 6.37713e-07 0.96086 0.210714 0.585787 0.585787C0.210714 0.96086 6.2793e-07 1.46957 6.2793e-07 2V9C-0.000208492 9.26391 0.0518167 9.52526 0.153078 9.76897C0.254338 10.0127 0.402832 10.2339 0.590001 10.42L9.59 19.42C9.96498 19.7919 10.4719 20.0004 11 20C11.5296 19.9978 12.0367 19.7856 12.41 19.41L19.41 12.41C19.7856 12.0367 19.9978 11.5296 20 11C20.0002 10.7361 19.9482 10.4747 19.8469 10.231C19.7457 9.98732 19.5972 9.76606 19.41 9.58ZM11 18L2 9V2H9L18 11M4.5 3C4.79667 3 5.08668 3.08797 5.33336 3.2528C5.58003 3.41762 5.77229 3.65189 5.88582 3.92598C5.99935 4.20006 6.02906 4.50166 5.97118 4.79264C5.9133 5.08361 5.77044 5.35088 5.56066 5.56066C5.35088 5.77044 5.08361 5.9133 4.79264 5.97118C4.50166 6.02906 4.20006 5.99935 3.92598 5.88582C3.65189 5.77229 3.41762 5.58003 3.2528 5.33336C3.08797 5.08668 3 4.79667 3 4.5C3 4.10218 3.15804 3.72064 3.43934 3.43934C3.72064 3.15804 4.10218 3 4.5 3Z"
                  fill="currentColor"
                />
              </svg>
              App No: {item.applicationNo}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <svg
                viewBox="0 0 20 16"
                fill="none"
                className="h-4 w-4 text-[#415876]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196667 15.0217 0.000666667 14.5507 0 14V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 14.55 19.8043 15.021 19.413 15.413C19.0217 15.805 18.5507 16.0007 18 16H2ZM10 9L18 4V2L10 7L2 2V4L10 9Z"
                  fill="currentColor"
                />
              </svg>
              {item.recipientEmail}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[#415876]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.95 21C17.8667 21 15.8083 20.546 13.775 19.638C11.7417 18.73 9.89167 17.4423 8.225 15.775C6.55833 14.1077 5.271 12.2577 4.363 10.225C3.455 8.19233 3.00067 6.134 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07933 8.725 3.238C8.90833 3.39667 9.01667 3.584 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.704 12.1123 8.162 12.687C8.62 13.2617 9.12433 13.816 9.675 14.35C10.1917 14.8667 10.7333 15.346 11.3 15.788C11.8667 16.23 12.4667 16.634 13.1 17L15.45 14.65C15.6 14.5 15.796 14.3877 16.038 14.313C16.28 14.2383 16.5173 14.2173 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1377 20.775 15.313C20.925 15.4883 21 15.684 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z"
                  fill="currentColor"
                />
              </svg>
              {item.recipientPhone}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[12px] shrink-0 w-full sm:w-auto lg:ml-auto mt-2 lg:mt-0">
            <Button
              asChild
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <Link href={`/organization/gd-interview/${item.applicationNo}`}>
                GD AND INTERVIEWS
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <Button
              asChild
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <Link href={`/organization/applications/${item.applicationNo}`}>
                VIEW APPLICATION
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout (Left Column 1/3, Right Column 2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (col-span-4 / 1/3) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Card 1: Communication Details */}
          <Card className="shadow-xs border border-[#C6C5D4] p-0 gap-0 overflow-hidden rounded-[8px] bg-white">
       <CardHeader
  className="relative flex flex-row items-center justify-between bg-[#FAFAFA] space-y-0 self-stretch"
  style={{ padding: "16px 20px" }}
>
  <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B]">
    <Activity className="h-5 w-5 text-[#415876]" />
    Communication Details
  </CardTitle>

  <div className="absolute bottom-0 left-5 right-5 border-b border-[#C6C5D4]" />
</CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-y-4 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                    CATEGORY
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {latestSentMessage
                      ? latestSentMessage.category
                      : selectedPreviewTemplate
                      ? selectedPreviewTemplate.category
                      : replyText.trim()
                      ? "Direct Message"
                      : item.category}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                    SENDER
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {latestSentMessage ? latestSentMessage.sender : (item.sender || activeSender)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                    SENT TIMESTAMP
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {latestActivityStats?.sentTimestamp || "01 Feb 2026, 04:00 pm"}
                  </p>
                </div>

                {/* 2-Column Stats Grid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                      DELIVERY SPEED
                    </span>
                    <p className="font-semibold text-[#0F172A] text-base">
                      {latestActivityStats?.speedMs
                        ? `${latestActivityStats.speedMs} ms`
                        : (item.deliveryTimeMs ? `${item.deliveryTimeMs} ms` : "1420 ms")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                      OPEN COUNT
                    </span>
                    <p className="font-semibold text-[#0F172A] text-base">
                      {item.openCount !== undefined ? `${item.openCount} times` : "3 times"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Applicant Dossier */}
          <Card className="shadow-xs border border-[#C6C5D4] p-0 gap-0 overflow-hidden rounded-[8px] bg-white">
           <CardHeader
  className="relative flex flex-row items-center justify-between bg-[#FAFAFA] space-y-0 self-stretch"
  style={{ padding: "16px 20px" }}
>
  <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B]">
    <User className="h-5 w-5 text-[#415876]" />
    Applicant Dossier
  </CardTitle>
  <div className="absolute bottom-0 left-5 right-5 border-b border-[#C6C5D4]" />
</CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-xs">
                  <AvatarImage
                    src={(item as any).photoUrl || (appData as any)?.photoUrl || (appData?.applicant as any)?.photo}
                    alt={item.applicantName}
                  />
                  <AvatarFallback className="font-bold bg-[#EEF2FF] text-[#4F46E5] text-base">
                    {item.applicantName ? item.applicantName.charAt(0).toUpperCase() : "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold text-[#1E293B] text-base">{item.applicantName}</span>
                  <span className="text-[#64748B] text-xs font-semibold uppercase tracking-wide">
                    APP NO: {item.applicationNo}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">EMAIL ADDRESS</span>
                  <p className="font-semibold text-[#1E293B] truncate">{item.recipientEmail}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">MOBILE PHONE</span>
                  <p className="font-semibold text-[#1E293B]">{item.recipientPhone}</p>
                </div>
              </div>

              <Button
                asChild
                className="w-full mt-2 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] text-xs font-semibold h-10 gap-2 cursor-pointer rounded-md border-0"
              >
                <Link href={`/organization/applications/${item.applicationNo}`}>
                  OPEN FULL DOSSIER
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Conversation History (timeline style) */}
          <Card className="shadow-xs border border-[#C6C5D4] p-0 gap-0 overflow-hidden rounded-[8px] bg-white mb-5">
            <CardHeader
              className="relative flex flex-row items-center justify-between bg-[#FAFAFA] space-y-0 self-stretch"
              style={{ padding: "16px 20px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B]">
                <MessageSquare className="h-5 w-5 text-[#415876]" />
                Conversation History
                {auditHistoryMsgs.length > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#2563EB] text-white text-[9px] font-bold">
                    {auditHistoryMsgs.length}
                  </span>
                )}
              </CardTitle>
              <div className="absolute bottom-0 left-5 right-5 border-b border-[#C6C5D4]" />
            </CardHeader>

            <CardContent className="p-5">
              {auditHistoryMsgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="size-12 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-[#94A3B8]" />
                  </div>
                  <p className="text-sm font-semibold text-[#64748B]">No messages yet</p>
                  <p className="text-xs text-[#94A3B8]">Messages sent to this applicant will appear here.</p>
                </div>
              ) : (
                <div className="relative pl-7 space-y-4 before:absolute before:left-[9px] before:top-3.5 before:bottom-3.5 before:w-[2px] before:bg-[#E5E7EB]">
                  {auditHistoryMsgs.map((msg, idx) => {
                    const isScheduled = msg.status === "Scheduled";
                    const isEmail = (msg.channel || "Email").toLowerCase() !== "whatsapp";
                    const catLower = (msg.category || "").toLowerCase();
                    const catStyle =
                      catLower.includes("interview") ? "bg-[#DBEAFE] text-[#1D4ED8]" :
                      catLower.includes("offer") || catLower.includes("admission") ? "bg-[#DCFCE7] text-[#15803D]" :
                      catLower.includes("document") ? "bg-[#FFEDD5] text-[#9A3412]" :
                      catLower.includes("payment") ? "bg-[#FEE2E2] text-[#991B1B]" :
                      catLower.includes("direct") ? "bg-[#E0E7FF] text-[#4338CA]" :
                      "bg-[#F3E8FF] text-[#6B21A8]";
                    const dt = (() => {
                      try {
                        const d = new Date(msg.sentAt);
                        if (isNaN(d.getTime())) return { date: msg.sentAt, time: "" };
                        return {
                          date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                          time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
                        };
                      } catch { return { date: msg.sentAt, time: "" }; }
                    })();

                    return (
                      <div key={idx} className="relative flex flex-col">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[27px] top-3.5 size-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            isScheduled ? "border-[#D97706]" : isEmail ? "border-[#1E2952]" : "border-[#15803D]"
                          }`}
                        >
                          <div className={`size-1.5 rounded-full ${
                            isScheduled ? "bg-[#D97706]" : isEmail ? "bg-[#1E2952]" : "bg-[#15803D]"
                          }`} />
                        </div>

                        {/* Clickable event card */}
                        <button
                          type="button"
                          onClick={() => setSelectedHistoryMsg(msg)}
                          className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm group ${
                            isScheduled
                              ? "border-[#FDE68A] bg-[#FFFBEB] hover:border-[#F59E0B]"
                              : "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#2563EB]/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isEmail ? (
                                <Mail className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                              ) : (
                                <Smartphone className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
                              )}
                              {isScheduled ? (
                                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[4px] tracking-wider bg-[#FEF3C7] text-[#D97706]">
                                  Scheduled
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[4px] tracking-wider bg-[#E0E7FF] text-[#4338CA]">
                                  Sent
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#6B7280] font-normal shrink-0">
                              {dt.date}{dt.time ? ` · ${dt.time}` : ""}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#1F2937] font-semibold leading-snug truncate group-hover:text-[#2563EB] transition-colors">{msg.subject}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catStyle}`}>{msg.category}</span>
                            <span className="text-[10px] text-[#94A3B8]">via {msg.channel || "Email"} · {msg.sender}</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Detail Popup — Team page modal design */}
          {selectedHistoryMsg && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedHistoryMsg(null)}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
              <div
                className="relative z-10 w-full max-w-[620px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Section 1: Message Info */}
                <div className="bg-white rounded-xl p-5 md:p-6 flex flex-col gap-4 m-5 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F5F5F5] border rounded-[10px] flex items-center justify-center shrink-0">
                      {(selectedHistoryMsg.channel || "Email").toLowerCase() !== "whatsapp" ? (
                        <Mail className="size-5 text-[#1E293B]" />
                      ) : (
                        <Smartphone className="size-5 text-[#1E293B]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[18px] font-bold text-[#0F172A] leading-tight">{selectedHistoryMsg.subject}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {(() => {
                          const catLower = (selectedHistoryMsg.category || "").toLowerCase();
                          const catStyle =
                            catLower.includes("interview") ? "bg-[#DBEAFE] text-[#1D4ED8]" :
                            catLower.includes("offer") || catLower.includes("admission") ? "bg-[#DCFCE7] text-[#15803D]" :
                            catLower.includes("document") ? "bg-[#FFEDD5] text-[#9A3412]" :
                            catLower.includes("payment") ? "bg-[#FEE2E2] text-[#991B1B]" :
                            catLower.includes("direct") ? "bg-[#E0E7FF] text-[#4338CA]" :
                            "bg-[#F3E8FF] text-[#6B21A8]";
                          return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catStyle}`}>{selectedHistoryMsg.category}</span>;
                        })()}
                        {selectedHistoryMsg.status === "Scheduled" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]"><Clock className="h-2.5 w-2.5" /> Scheduled</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full border border-[#A7F3D0]"><Check className="h-2.5 w-2.5" /> Sent</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedHistoryMsg(null)}
                      className="ml-auto shrink-0 p-2 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#1E293B] transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Channel</span>
                      <span className="text-sm font-semibold text-[#0F172A]">{selectedHistoryMsg.channel || "Email"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Sender</span>
                      <span className="text-sm font-semibold text-[#0F172A] truncate">{selectedHistoryMsg.sender}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Timestamp</span>
                      <span className="text-sm font-semibold text-[#0F172A]">
                        {(() => {
                          try {
                            const d = new Date(selectedHistoryMsg.sentAt);
                            if (isNaN(d.getTime())) return selectedHistoryMsg.sentAt;
                            return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
                              " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                          } catch { return selectedHistoryMsg.sentAt; }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Message Content */}
                <div className="bg-white rounded-xl p-5 md:p-6 flex flex-col gap-3 mx-5 mb-5 shadow-[0_1px_4px_rgba(0,0,0,0.07)] border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F5F5F5] border rounded-[10px] flex items-center justify-center shrink-0">
                      <FileText className="size-5 text-[#1E293B]" />
                    </div>
                    <h3 className="text-[18px] font-bold text-[#0F172A]">Message Content</h3>
                  </div>
                  <div className="text-sm text-[#1E293B] leading-relaxed whitespace-pre-wrap bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0] min-h-[80px]">
                    {(selectedHistoryMsg as any).content || "(No message body stored)"}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 px-5 pb-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedHistoryMsg(null)}
                    className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (col-span-8 / 2/3) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Card 1: Message Content & Rendered Preview */}
          <Card className="shadow-xs border border-[#C6C5D4] p-0 gap-0 overflow-hidden rounded-[8px] bg-white">
            <CardHeader
              className="relative flex flex-row items-center justify-between bg-[#FAFAFA] space-y-0 self-stretch"
              style={{ padding: "16px 20px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B]">
                <FileText className="h-5 w-5 text-[#415876]" />
                Message Content & Rendered Preview
              </CardTitle>

              <div className="flex items-center gap-2">
                <Select
                  value={previewTemplateId || undefined}
                  onValueChange={(val) => {
                    setPreviewTemplateId(val);
                  }}
                >
                  <SelectTrigger className="h-8.5 text-xs font-medium bg-white border-[#D4D4D4] min-w-[200px] max-w-[280px] text-[#1E293B] shadow-2xs focus:ring-1 focus:ring-[#2563EB] rounded-[6px] px-2.5">
                    <Mail className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                    <SelectValue placeholder="Select an email template" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-[#E2E8F0] shadow-lg rounded-[8px] z-50 p-1 min-w-[260px]">
                    {activeEmailTemplates.length > 0 ? (
                      activeEmailTemplates.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          className="text-xs font-medium text-[#1E293B] cursor-pointer hover:bg-blue-50 focus:bg-blue-50 rounded-[4px] py-1.5 px-2"
                        >
                          {t.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        No active templates found
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {/* Reset / Refresh Template Selection Icon */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setPreviewTemplateId("");
                          toast.info("Template selection reset");
                        }}
                        disabled={!previewTemplateId}
                        className="h-8.5 w-8.5 rounded-[6px] border-[#D4D4D4] text-[#415876] hover:text-[#2563EB] hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        aria-label="Reset template selection"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Reset template selection
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Badge
                  variant="outline"
                  className="text-[10px] font-bold uppercase rounded-[6px] text-[#475569] border-[#D4D4D4] px-2.5 py-1 bg-white h-8.5 flex items-center"
                >
                  {previewData.channel?.toUpperCase() || "EMAIL"}
                </Badge>
              </div>

              <div className="absolute bottom-0 left-5 right-5 border-b border-[#C6C5D4]" />
            </CardHeader>
            <CardContent className="p-6">
              {!previewData.hasContent ? (
                <div className="rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="size-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-3.5 shadow-2xs">
                    <Mail className="h-6 w-6 text-[#2563EB]" />
                  </div>
                  <h4 className="text-base font-bold text-[#1E293B] mb-1">
                    No Email Template Selected
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-sm leading-relaxed">
                    Select an active email template from the dropdown above to preview its rendered message, subject, and candidate details.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 pb-4 border-b border-[#F1F5F9] flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#1E293B]">
                        {previewData.subject}
                      </h3>
                      <p className="text-xs text-[#64748B] font-normal mt-1">
                        Category: <span className="font-bold text-[#1E293B]">{previewData.category}</span> | Sender:{" "}
                        <span className="font-bold text-[#1E293B]">{previewData.sender}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {previewData.isLivePreview && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB]">
                          <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                          Live Preview
                        </span>
                      )}
                      <Badge className={`${previewData.badgeColor} text-[10px] font-semibold`}>
                        {previewData.badge}
                      </Badge>
                    </div>
                  </div>

                  {/* Rendered Email Card Frame */}
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
                    <div className="space-y-4 text-sm text-[#334155] leading-relaxed">
                      <h4 className="text-base font-bold text-[#312E81]">
                        {previewData.subject}
                      </h4>
                      <div className="whitespace-pre-line text-sm text-[#334155] leading-relaxed font-sans">
                        {previewData.content}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Attached Files Section */}
              {item.attachments && item.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[#F1F5F9]">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider mb-3 block">
                    Attached Files ({item.attachments.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {item.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-[#2563EB] shrink-0" />
                          <div className="flex flex-col truncate">
                            <span className="text-xs font-bold text-[#1E293B] truncate" title={att.name}>
                              {att.name}
                            </span>
                            <span className="text-[10px] text-[#64748B] font-normal">{att.size}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#64748B]">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Send Direct Message or Templated Follow-up */}
          <Card className="shadow-xs border border-[#C6C5D4] p-0 gap-0 overflow-hidden rounded-[8px] bg-white">
            <CardHeader
              className="relative flex flex-row items-center justify-between bg-[#FAFAFA] space-y-0 self-stretch"
              style={{ padding: "16px 20px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B]">
                <Send className="h-4.5 w-4.5 text-[#415876]" />
                {selectedPreviewTemplate ? "Send Templated Message / Follow-up" : "Send Direct Message"}
              </CardTitle>

              <Badge
                variant="outline"
                className="text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200"
              >
                Sender: {activeSender}
              </Badge>

              <div className="absolute bottom-0 left-5 right-5 border-b border-[#C6C5D4]" />
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSendReply} className="flex flex-col gap-4">
                {/* Dispatch Channel */}
                {/* Dispatch Channel */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                    DISPATCH CHANNEL
                  </span>
                  <div className="flex items-center gap-2">
                    {(["Email", "WhatsApp"] as const).map((ch) => (
                      <Button
                        key={ch}
                        type="button"
                        variant={replyChannel === ch ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReplyChannel(ch)}
                        className={`text-xs h-9 px-4 font-semibold rounded-md border ${
                          replyChannel === ch
                            ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-[#2563EB]"
                            : "border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50"
                        }`}
                      >
                        {ch}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Recipient Email Address Input */}
                {replyChannel === "Email" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                        RECIPIENT EMAIL ADDRESS *
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        Target: <strong className="text-slate-700">{item.applicantName}</strong>
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 size-4 text-[#64748B]" />
                      <Input
                        type="email"
                        placeholder="Recipient email address..."
                        value={recipientEmailInput}
                        onChange={(e) => setRecipientEmailInput(e.target.value)}
                        className="pl-9 text-xs text-[#1E293B] border-[#D4D4D4] rounded-md focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] h-9"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                      RECIPIENT WHATSAPP NUMBER
                    </span>
                    <Input
                      disabled
                      value={item.recipientPhone}
                      className="text-xs text-[#1E293B] border-[#D4D4D4] bg-slate-50 rounded-md h-9"
                    />
                  </div>
                )}

                {/* Subject - shown for manual Email when no template is selected */}
                {!selectedPreviewTemplate && replyChannel === "Email" && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                      SUBJECT
                    </span>
                    <Input
                      placeholder={`Enter subject for ${item.applicantName}...`}
                      value={manualSubject}
                      onChange={(e) => setManualSubject(e.target.value)}
                      className="text-xs text-[#1E293B] border-[#D4D4D4] rounded-md focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] h-9"
                    />
                  </div>
                )}

                {/* Message Content */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider block">
                    MESSAGE CONTENT
                  </span>
                  <Textarea
                    rows={6}
                    placeholder={
                      selectedPreviewTemplate
                        ? `Add follow-up notes to accompany "${selectedPreviewTemplate.name}" (optional)...`
                        : `Type message content for ${item.applicantName}...`
                    }
                    className="text-xs font-sans text-[#1E293B] border-[#D4D4D4] rounded-md focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] min-h-[140px]"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  {selectedPreviewTemplate ? (
                    <p className="text-[11px] text-slate-500">
                      Dispatches active template <strong className="text-blue-600">"{selectedPreviewTemplate.name}"</strong>
                      {replyText.trim() ? " with your additional follow-up note appended." : "."}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Direct manual {replyChannel} to <strong className="text-slate-700">{item.applicantName}</strong> ({replyChannel === "WhatsApp" ? item.recipientPhone : (recipientEmailInput || item.recipientEmail)}).
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-[#64748B]">
                    Dispatching as: <strong className="text-[#1E293B]">{activeSender}</strong> via {replyChannel}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-4 rounded-[8px] text-[13px] font-semibold border-[#D4D4D4] text-[#1E293B] hover:bg-slate-50 cursor-pointer gap-2"
                      onClick={() => {
                        const hasContent = replyText.trim().length > 0;
                        if (!hasContent && !selectedPreviewTemplate) {
                          toast.error("Please enter message content or select an active template before scheduling.");
                          return;
                        }
                        setScheduleDialogOpen(true);
                      }}
                    >
                      <Calendar className="h-4 w-4 text-[#64748B]" />
                      Schedule Message
                    </Button>
                    <Button
                      type="submit"
                      className="h-10 px-6 rounded-[8px] text-[13px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer gap-2 shadow-xs"
                      disabled={sendMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                      {sendMutation.isPending
                        ? "Sending..."
                        : selectedPreviewTemplate
                        ? (replyText.trim() ? "Send Template & Follow-up" : "Dispatch Template")
                        : "Send Message"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Message Dialog — Team page design system */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[580px] p-6 bg-white rounded-2xl border border-slate-200 overflow-y-auto max-h-[90vh] flex flex-col gap-5">

          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F5F5F5] border rounded-[10px] flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-[#1E293B]" />
            </div>
            <div>
              <DialogTitle className="text-[18px] font-bold text-[#0F172A] leading-tight">Schedule Message</DialogTitle>
              <p className="text-[12px] text-[#64748B] mt-0.5">Automate delivery to the candidate at a specific time</p>
            </div>
          </div>

          {/* Single content card */}
          <div className="bg-white shadow-2xs rounded-xl p-5 flex flex-col gap-4 border border-slate-100">

            {/* Candidate summary */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <Avatar className="h-9 w-9 border border-slate-200 shrink-0">
                <AvatarFallback className="text-xs font-bold bg-[#EEF2FF] text-[#4F46E5]">
                  {item.applicantName ? item.applicantName.charAt(0).toUpperCase() : "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-[#1E293B] truncate">{item.applicantName}</span>
                <span className="text-[11px] text-[#64748B] truncate">
                  {replyChannel === "Email" ? (recipientEmailInput || item.recipientEmail) : item.recipientPhone} · {item.applicationNo}
                </span>
              </div>
              <Badge className="ml-auto bg-[#EFF6FF] text-[#2563EB] border-blue-200 text-[10px] font-semibold shrink-0">{replyChannel}</Badge>
            </div>

            {/* Quick presets */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Quick Presets</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Tomorrow 10 AM", days: 1, time: "10:00" },
                  { label: "Tomorrow 3 PM", days: 1, time: "15:00" },
                  { label: "In 2 Days", days: 2, time: "11:00" },
                  { label: "In 1 Week", days: 7, time: "10:00" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + preset.days);
                      setScheduledDate(d.toISOString().split("T")[0]);
                      setScheduledTime(preset.time);
                    }}
                    className="text-[11px] h-9 px-2 border border-[#D4D4D4] rounded-lg hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50/50 font-medium text-slate-600 transition-colors cursor-pointer bg-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dispatch Date */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[#2563EB]" /> Dispatch Date *
                </Label>
                <div className="relative flex items-center">
                  <input
                    id="schedule-date-input"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-3 pr-10 border border-[#D4D4D4] rounded-lg h-11 text-sm font-medium text-[#1E293B] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("schedule-date-input")?.click()}
                    className="absolute right-3 text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    <Calendar className="size-4" />
                  </button>
                </div>
              </div>

              {/* Dispatch Time */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#2563EB]" /> Dispatch Time *
                </Label>
                <div className="relative flex items-center">
                  <input
                    id="schedule-time-input"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full pl-3 pr-10 border border-[#D4D4D4] rounded-lg h-11 text-sm font-medium text-[#1E293B] bg-white focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("schedule-time-input")?.click()}
                    className="absolute right-3 text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    <Clock className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmation banner */}
           
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSchedule}
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer gap-2"
            >
              <Calendar className="size-4" />
              Confirm Schedule
            </Button>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
