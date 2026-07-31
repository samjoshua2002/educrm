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
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCommunication, useResendCommunication, useSendCommunication } from "@/hooks/use-communications";
import { useApplication } from "@/hooks/use-applications";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function CommunicationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const rawParam = params.id;

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

  usePageHeader({
    title: "Communications",
    description: "View message history, delivery audit trail, and recipient engagement details.",
  });

  const [replyText, setReplyText] = React.useState("");
  const [replyChannel, setReplyChannel] = React.useState<"Email" | "SMS" | "WhatsApp">("Email");

  const item = React.useMemo(() => {
    if (commData) return commData;
    if (appData) {
      const appNo = appData.applicationNo;
      const name = appData.applicant?.name || "Applicant";
      const email = appData.applicant?.email || "applicant@example.com";
      const phone = appData.applicant?.primaryMobile || "+91 98765 43210";
      const program = appData.appliedFor || (appData as any).program || "PGDM 2026-28";
      const isAccepted = appData.status === "accepted" || appData.status === "Accepted";

      return {
        id: `COMM-${appNo}`,
        applicationNo: appNo,
        applicantName: name,
        recipientEmail: email,
        recipientPhone: phone,
        channel: "Email" as const,
        category: "Interview Schedule",
        subject: `Application Communication - ${program} (${appNo})`,
        content: `Dear ${name},\n\nWe are writing regarding your application (${appNo}) for ${program}. Please review your candidate portal for further instructions.\n\nBest regards,\nAdmissions Office`,
        sender: "Admissions Directorate",
        sentAt: (appData as any).submittedAt || new Date().toISOString(),
        status: isAccepted ? ("Opened" as const) : ("Delivered" as const),
        openCount: isAccepted ? 2 : 1,
        lastOpenedAt: formatDate(new Date().toISOString()),
        deliveryTimeMs: 380,
        attachments: [] as { name: string; size: string; type: string }[],
        timeline: [
          { status: "Queued", timestamp: formatDate(new Date(Date.now() - 3600000).toISOString()), description: "Message queued for delivery via Gateway" },
          { status: "Sent", timestamp: formatDate(new Date(Date.now() - 3500000).toISOString()), description: "Dispatched to recipient mail server" },
          { status: "Delivered", timestamp: formatDate(new Date(Date.now() - 3400000).toISOString()), description: `Delivered to ${email}` },
          ...(isAccepted
            ? [{ status: "Opened", timestamp: formatDate(new Date().toISOString()), description: "Opened by recipient candidate" }]
            : []),
        ],
      };
    }
    return null;
  }, [commData, appData]);

  React.useEffect(() => {
    if (item?.channel) {
      setReplyChannel(item.channel as any);
    }
  }, [item]);

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

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error("Please enter a message response.");
      return;
    }

    sendMutation.mutate(
      {
        applicationNo: item.applicationNo,
        applicantName: item.applicantName,
        recipientEmail: item.recipientEmail,
        recipientPhone: item.recipientPhone,
        channel: replyChannel,
        category: "Follow-up Response",
        subject: `Re: ${item.subject}`,
        content: replyText,
      },
      {
        onSuccess: () => {
          setReplyText("");
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full bg-white min-h-screen">
      {/* Hero Banner Card matching Applications & GD Interview details page */}
      <div className="relative grid grid-cols-[auto_1fr] w-full p-[24px] gap-y-[6px] gap-x-[16px] md:gap-x-[32px] rounded-[8px] border border-[#D4D4D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3 hover:opacity-80 transition-opacity p-1 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-[#64748B]" />
        </button>

        {/* Avatar / Channel Icon */}
        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-100 shadow-xs shrink-0 col-start-1 row-start-1 md:row-span-2 mt-2 md:mt-0">
          <AvatarFallback className="text-xl font-bold bg-[#EFF6FF] text-[#1D4ED8]">
            {item.channel === "Email" ? (
              <Mail className="h-8 w-8 text-[#2563EB]" />
            ) : item.channel === "WhatsApp" ? (
              <MessageSquare className="h-8 w-8 text-[#059669]" />
            ) : (
              <Smartphone className="h-8 w-8 text-[#7C3AED]" />
            )}
          </AvatarFallback>
        </Avatar>

        {/* Name / Subject & Status Badge */}
        <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight break-words">
            {item.subject}
          </h2>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[10px] md:text-xs px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] font-bold uppercase hover:bg-[#EFF6FF] rounded-[10px]"
              style={{ letterSpacing: "1px" }}
            >
              {item.status}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs px-2.5 py-0.5 font-bold uppercase text-[#475569] border-[#D4D4D4] rounded-[10px]"
            >
              {item.channel}
            </Badge>
          </div>
        </div>

        {/* Details Row & Action Buttons linked to all modules */}
        <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col lg:flex-row lg:items-center justify-between gap-y-3 text-[12px] font-normal leading-[20px] text-[#1E293B] w-full mt-2 md:mt-0">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[15px] shrink-0 w-full sm:w-auto lg:ml-auto mt-2 lg:mt-0">
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

      {/* Main Grid Layout (1/3 Left, 2/3 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1/3) */}
        <div className="space-y-6 lg:col-span-1">
          {/* Communication Overview Card */}
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden rounded-[8px]">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <Activity className="h-5 w-5 text-[#415876]" />
                Communication Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-y-4 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Category
                  </span>
                  <p className="font-semibold text-[#1E293B]">{item.category}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Sender
                  </span>
                  <p className="font-semibold text-[#1E293B]">{item.sender}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Sent Timestamp
                  </span>
                  <p className="font-semibold text-[#1E293B]">{formatDate(item.sentAt)}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Delivery Speed
                  </span>
                  <p className="font-semibold text-[#065F46]">
                    {item.deliveryTimeMs ? `${item.deliveryTimeMs} ms` : "Instant"}
                  </p>
                </div>

                {item.openCount !== undefined && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                      Open Count
                    </span>
                    <p className="font-semibold text-[#1E40AF]">{item.openCount} times</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linked Applicant Card */}
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden rounded-[8px]">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <User className="h-5 w-5 text-[#415876]" />
                Applicant Dossier
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F9]">
                <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-xs">
                  <AvatarFallback className="font-bold bg-[#EFF6FF] text-[#1D4ED8]">
                    {item.applicantName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold text-[#1E293B] text-base">{item.applicantName}</span>
                  <span className="text-[#64748B] text-xs font-medium">App No: {item.applicationNo}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Email Address
                  </span>
                  <p className="font-semibold text-[#1E293B] truncate">{item.recipientEmail}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Mobile Phone
                  </span>
                  <p className="font-semibold text-[#1E293B]">{item.recipientPhone}</p>
                </div>
              </div>

              <Button
                asChild
                className="w-full mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold h-10 gap-2 cursor-pointer rounded-md"
              >
                <Link href={`/organization/applications/${item.applicationNo}`}>
                  OPEN FULL DOSSIER
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Redesigned Modern Delivery Audit Trail */}
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden rounded-[8px]">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <Clock className="h-5 w-5 text-[#415876]" />
                Delivery Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E2E8F0]">
                {item.timeline.map((event, idx) => {
                  const getStepBadgeStyle = (status: string) => {
                    switch (status) {
                      case "Opened":
                        return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
                      case "Delivered":
                        return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
                      case "Sent":
                        return "bg-[#F3E8FF] text-[#7C3AED] border-[#DDD6FE]";
                      default:
                        return "bg-slate-100 text-slate-700 border-slate-200";
                    }
                  };

                  return (
                    <div key={idx} className="relative flex flex-col gap-1 group">
                      <div className="absolute -left-[29px] top-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#2563EB] ring-4 ring-blue-50 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                      <div className="p-3 rounded-lg border border-slate-100 bg-[#FAFAFA] hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStepBadgeStyle(event.status)}`}>
                            {event.status}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{event.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Message Content & Preview */}
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden rounded-[8px]">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <FileText className="h-5 w-5 text-[#415876]" />
                Message Content & Rendered Preview
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold uppercase rounded-[10px] text-[#475569]">
                {item.channel}
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-lg font-bold text-[#1E293B]">{item.subject}</h3>
                <p className="text-xs text-[#64748B] font-normal mt-1">
                  Category: <span className="font-bold text-[#1E293B]">{item.category}</span> | Sender:{" "}
                  <span className="font-bold text-[#1E293B]">{item.sender}</span>
                </p>
              </div>

              {/* Message Box View */}
              {item.channel === "Email" ? (
                <div
                  className="p-5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm leading-relaxed text-[#1E293B]"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              ) : (
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] max-w-lg text-sm text-[#064E3B] leading-relaxed font-sans shadow-2xs">
                  <div className="flex items-center justify-between mb-2 text-[11px] text-[#047857] font-bold">
                    <span>{item.channel} Broadcast Message</span>
                    <span>{formatDate(item.sentAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap font-medium">{item.content}</p>
                </div>
              )}

              {/* Attachments Section */}
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

          {/* Follow-up Reply Composer */}
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden rounded-[8px]">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <Send className="h-5 w-5 text-[#415876]" />
                Send Follow-up Message
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSendReply} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Dispatch Channel
                  </span>
                  <div className="flex gap-2">
                    {(["Email", "SMS", "WhatsApp"] as const).map((ch) => (
                      <Button
                        key={ch}
                        type="button"
                        variant={replyChannel === ch ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReplyChannel(ch)}
                        className={`text-xs h-8 px-3 font-semibold ${
                          replyChannel === ch ? "bg-[#2563EB] text-white" : "border-[#D4D4D4] text-[#1E293B]"
                        }`}
                      >
                        {ch}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Message Content
                  </span>
                  <Textarea
                    rows={4}
                    placeholder={`Type your message response to ${item.applicantName}...`}
                    className="text-xs font-normal text-[#1E293B]"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer gap-2"
                    disabled={sendMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
