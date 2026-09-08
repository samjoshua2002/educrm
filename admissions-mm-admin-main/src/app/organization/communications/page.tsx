/* eslint-disable max-lines, @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  useCommunications,
  useSendCommunication,
  useResendCommunication,
  useDeleteCommunication,
} from "@/hooks/use-communications";
import { useEmailTemplates, renderTemplate } from "@/hooks/use-email-templates";
import { useAuthStore } from "@/stores/auth-store";
import { CommunicationLog, mockCommunications } from "@/data/mock-communications";

import {
  Search,
  Mail,
  MessageSquare,
  Smartphone,
  Plus,
  Download,
  Filter,
  Eye,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Calendar,
  FileText,
  User,
  SlidersHorizontal,
  EllipsisVertical,
  SearchX,
  UsersRound,
  LayoutTemplate,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusPillStyles: Record<string, string> = {
  Sent:
    "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  Scheduled:
    "bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
};

const categoryPillStyles: Record<string, string> = {
  "interview schedule":
    "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "admission offer":
    "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "document request":
    "bg-[#FFEDD5] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "payment reminder":
    "bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "general notice":
    "bg-[#F3E8FF] text-[#6B21A8] dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "direct message":
    "bg-[#E0E7FF] text-[#4338CA] dark:bg-indigo-500/20 dark:text-indigo-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
};

const getCategoryStyle = (cat: string) => {
  const lower = (cat || "").toLowerCase();
  if (categoryPillStyles[lower]) return categoryPillStyles[lower];
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center";
};

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

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function formatFullDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: dateStr, time: "" };
    return {
      date: d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  } catch {
    return { date: dateStr, time: "" };
  }
}

function exportToCSV(data: CommunicationLog[], filename = "communication_logs.csv") {
  const headers = [
    "Log ID",
    "Application No",
    "Recipient Name",
    "Email",
    "Phone",
    "Channel",
    "Category",
    "Subject",
    "Status",
    "Sent At",
  ];

  const escape = (val: string | number | undefined) => {
    const str = String(val || "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((item) => [
    escape(item.id),
    escape(item.applicationNo),
    escape(item.applicantName),
    escape(item.recipientEmail),
    escape(item.recipientPhone),
    escape(item.channel),
    escape(item.category),
    escape(item.subject),
    escape(item.status),
    escape(item.sentAt),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

import { useApplications } from "@/hooks/use-applications";

import { checkAndDispatchScheduledCommunications } from "@/lib/scheduled-communications";

export default function CommunicationsPage() {
  const [composeOpen, setComposeOpen] = React.useState(false);

  usePageHeader({
    title: "Communications",
    description:
      "Manage and monitor all outbound and inbound communications with applicants and leads.",
    action: {
      label: "Compose Message",
      onClick: () => setComposeOpen(true),
    },
  });

  const { data: commsResponse, isLoading: isCommsLoading } = useCommunications();
  const { data: appsResponse, isLoading: isAppsLoading } = useApplications(1, 100);

  const appsList = React.useMemo(() => {
    return (appsResponse as any)?.data || appsResponse || null;
  }, [appsResponse]);

  const [localHistory, setLocalHistory] = React.useState<CommunicationLog[]>([]);

  const reloadHistory = React.useCallback(() => {
    try {
      const saved = localStorage.getItem("educrm_communications_history");
      if (saved) {
        setLocalHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  React.useEffect(() => {
    reloadHistory();

    // Check and auto-dispatch any overdue scheduled messages immediately
    checkAndDispatchScheduledCommunications().then((changed) => {
      if (changed) reloadHistory();
    });

    // Check every 5 seconds for newly due scheduled messages
    const timer = setInterval(() => {
      checkAndDispatchScheduledCommunications().then((changed) => {
        if (changed) reloadHistory();
      });
    }, 5000);

    const handleUpdate = () => reloadHistory();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("educrm_communications_updated", handleUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("educrm_communications_updated", handleUpdate);
    };
  }, [reloadHistory]);

  // All individual messages (not yet grouped)
  const allMessages: CommunicationLog[] = React.useMemo(() => {
    let baseList: CommunicationLog[] = [];
    const nowIso = new Date().toISOString();
    if (Array.isArray(appsList) && appsList.length > 0) {
      baseList = appsList.map((app: any, idx: number) => {
        const appNo = app.applicationNo || `APP202600${idx + 1}`;
        const appName = app.name || app.applicant?.name || "Applicant";
        const appEmail = app.email || app.applicant?.email || `applicant${idx + 1}@example.com`;
        const appPhone = app.phone || app.applicant?.primaryMobile || "+91 98765 43210";
        const category: "Interview Schedule" | "Admission Offer" | "Document Request" | "Payment Reminder" =
          idx % 4 === 0 ? "Interview Schedule"
          : idx % 4 === 1 ? "Admission Offer"
          : idx % 4 === 2 ? "Document Request"
          : "Payment Reminder";
        const status: "Sent" | "Scheduled" = "Sent";
        const sentAt = app.submittedAt || new Date(new Date(nowIso).getTime() - (idx + 1) * 86400000).toISOString();
        return {
          id: `COMM-2026-00${idx + 1}`,
          applicationNo: appNo,
          applicantName: appName,
          recipientEmail: appEmail,
          recipientPhone: appPhone,
          channel: "Email" as const,
          category,
          subject: `${category} - ${app.program || "PGDM 2026-28"} (${appNo})`,
          content: `Dear ${appName},\n\nThis is an official communication regarding your application (${appNo}) for ${app.program || "PGDM 2026-28"}.\n\nBest regards,\nAdmissions Office`,
          sender: "Admissions Directorate",
          sentAt,
          status,
          openCount: 1,
          timeline: [{ status: "Sent", timestamp: formatDate(app.submittedAt || nowIso), description: "Dispatched to gateway" }],
        };
      });
    } else {
      baseList = (commsResponse as any)?.data || commsResponse || mockCommunications;
    }
    // localHistory takes priority (dedup by unique id)
    const combined = [...localHistory, ...baseList];
    const seen = new Set<string>();
    return combined.filter((c) => {
      const key = c.id || `${c.applicationNo}-${c.sentAt}-${c.subject}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [appsList, commsResponse, localHistory]);

  // Group all messages by applicationNo → one row per applicant
  // The representative entry = active Scheduled (if any) else the most recent by sentAt
  const commsList: (CommunicationLog & { totalMessages: number })[] = React.useMemo(() => {
    const groups = new Map<string, CommunicationLog[]>();
    for (const msg of allMessages) {
      const key = msg.applicationNo;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(msg);
    }

    const rows: (CommunicationLog & { totalMessages: number })[] = [];
    for (const [, msgs] of groups) {
      const sorted = [...msgs].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      // Prefer a Scheduled entry if it exists, otherwise the latest
      const scheduled = sorted.find((m) => m.status === "Scheduled");
      const representative = scheduled || sorted[0];
      rows.push({ ...representative, totalMessages: msgs.length });
    }

    return rows.sort((a, b) => {
      const timeA = new Date(a.sentAt).getTime();
      const timeB = new Date(b.sentAt).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [allMessages]);

  const isLoading = isCommsLoading || isAppsLoading;

  const templatesQuery = useEmailTemplates();
  const templates = templatesQuery.data || [];
  const user = useAuthStore((s) => s.user);

  const sendMutation = useSendCommunication();
  const resendMutation = useResendCommunication();
  const deleteMutation = useDeleteCommunication();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState("all");

  // Advanced Filter Dialog
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advDateFrom, setAdvDateFrom] = React.useState("");
  const [advDateTo, setAdvDateTo] = React.useState("");
  const [advAppNo, setAdvAppNo] = React.useState("");

  // Pagination state (matching branches: 5 per page)
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  // Compose Modal state
  const [composeChannel, setComposeChannel] = React.useState<"Email" | "SMS" | "WhatsApp">("Email");
  const [composeAppNo, setComposeAppNo] = React.useState("");
  const [composeName, setComposeName] = React.useState("");
  const [composeEmail, setComposeEmail] = React.useState("");
  const [composePhone, setComposePhone] = React.useState("");
  const [composeCategory, setComposeCategory] = React.useState("General Notice");
  const [composeSubject, setComposeSubject] = React.useState("");
  const [composeContent, setComposeContent] = React.useState("");
  const [composeTemplateId, setComposeTemplateId] = React.useState("none");
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Filter computation
  const filteredComms = React.useMemo(() => {
    return commsList.filter((item) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matches =
          item.applicantName.toLowerCase().includes(q) ||
          item.recipientEmail.toLowerCase().includes(q) ||
          item.recipientPhone.toLowerCase().includes(q) ||
          item.applicationNo.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusDraft !== "all") {
        const itemStatus = item.status === "Scheduled" ? "Scheduled" : "Sent";
        if (itemStatus !== statusDraft) return false;
      }

      if (advAppNo && !item.applicationNo.toLowerCase().includes(advAppNo.toLowerCase())) return false;
      if (advDateFrom && item.sentAt < advDateFrom) return false;
      if (advDateTo && item.sentAt > advDateTo) return false;

      return true;
    });
  }, [commsList, searchQuery, statusDraft, advAppNo, advDateFrom, advDateTo]);

  const totalPages = Math.ceil(filteredComms.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComms = filteredComms.slice(startIndex, endIndex);

  const visiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > 5) {
      if (currentPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (currentPage + 2 >= totalPages) {
        startPage = totalPages - 4;
        endPage = totalPages;
      } else {
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [currentPage, totalPages]);

  const hasAdvancedFilters = advAppNo !== "" || advDateFrom !== "" || advDateTo !== "";

  // Statistics calculation: Total Sent and Scheduled only
  const sentCount = commsList.filter((c) => c.status === "Sent" || c.status === "Delivered" || c.status === "Opened").length;
  const scheduledCount = commsList.filter((c) => c.status === "Scheduled").length;
  const totalCount = commsList.length;

  function handleSelectTemplate(tmplId: string) {
    setComposeTemplateId(tmplId);
    if (tmplId === "none") return;
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      const candidateContext = {
        student: composeName || "Applicant",
        course: "PGDM 2026-28",
        application_no: composeAppNo || "APP2026001",
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: "10:30 AM - 12:00 PM IST",
        venue: "Main Campus Seminar Hall A",
        sender: user?.name || "Admissions Desk",
        organization: "Educational Institutions Group",
        email: composeEmail || "applicant@example.com",
        phone: composePhone || "+91 98765 43210",
      };
      setComposeChannel(tmpl.channel || "Email");
      setComposeCategory(tmpl.category);
      setComposeSubject(renderTemplate(tmpl.subject, candidateContext));
      setComposeContent(renderTemplate(tmpl.body, candidateContext));
      toast.success(`Loaded "${tmpl.name}" with personalized shortcuts`);
    }
  }

  function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!composeAppNo.trim() && !composeEmail.trim()) {
      toast.error("Please enter Recipient Application No or Email.");
      return;
    }
    if (!composeSubject.trim()) {
      toast.error("Please provide a subject title.");
      return;
    }

    sendMutation.mutate(
      {
        applicationNo: composeAppNo || "APP2026001",
        applicantName: composeName || "Applicant",
        recipientEmail: composeEmail || "applicant@example.com",
        recipientPhone: composePhone || "+91 98765 43210",
        channel: composeChannel,
        category: composeCategory,
        subject: composeSubject,
        content: composeContent,
        sender: user?.name || "Admissions Desk",
        scheduledAt: isScheduled ? scheduledAt : undefined,
      },
      {
        onSuccess: (data: any) => {
          if (data) {
            try {
              const existing = JSON.parse(localStorage.getItem("educrm_communications_history") || "[]");
              localStorage.setItem("educrm_communications_history", JSON.stringify([data, ...existing]));
              reloadHistory();
            } catch {
              // Ignore
            }
          }
          setComposeOpen(false);
          setComposeAppNo("");
          setComposeName("");
          setComposeEmail("");
          setComposePhone("");
          setComposeSubject("");
          setComposeContent("");
          setIsScheduled(false);
        },
      }
    );
  }


  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Quick Stats Dashboard matching Branch page cards */}
        {/* Quick Stats Dashboard: Total Sent & Scheduled */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Total Sent */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <Mail className="size-5 text-[#2563EB]" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                Total Sent
              </span>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">
                {sentCount}
              </span>
              <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#2563EB]/15">
                <div
                  className="h-full rounded-[9999px] transition-all duration-700"
                  style={{ width: "100%", backgroundColor: "#2563EB" }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Scheduled */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                <Clock className="size-5 text-[#D97706]" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                Scheduled
              </span>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">
                {scheduledCount}
              </span>
              <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#FDE68A]">
                <div
                  className="h-full rounded-[9999px] transition-all duration-700"
                  style={{
                    width: totalCount > 0 ? `${(scheduledCount / totalCount) * 100}%` : "0%",
                    backgroundColor: "#D97706",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar matching Branch page */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by recipient, email, app no or subject..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Search className="size-4" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Status Select */}
              <div className="flex-1 min-w-0 sm:w-[150px]">
                <Select
                  value={statusDraft}
                  onValueChange={(val) => {
                    setStatusDraft(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filter Button */}
              <Button
                variant="outline"
                size="icon"
                className="relative h-10 w-10 shrink-0 cursor-pointer"
                onClick={() => setAdvancedOpen(true)}
              >
                <Filter className="size-4" />
                {hasAdvancedFilters && (
                  <span className="absolute -top-1 -right-1 flex size-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-3 bg-primary"></span>
                  </span>
                )}
                <span className="sr-only">Advanced filters</span>
              </Button>

              {/* Export CSV Button */}
              <Button
                variant="outline"
                className="h-10 text-xs sm:text-sm font-medium gap-1.5 cursor-pointer"
                onClick={() => exportToCSV(filteredComms)}
              >
                <Download className="size-4 text-muted-foreground" />
                Export
              </Button>

              {/* Email Templates Module Button */}
              <Button
                asChild
                variant="outline"
                className="h-10 text-xs sm:text-sm font-medium border-border text-foreground hover:bg-accent hover:text-accent-foreground gap-2 cursor-pointer rounded-lg"
              >
                <Link href="/organization/email-templates">
                  <LayoutTemplate className="size-4 text-[#2563EB]" />
                  <span>Email Templates</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop View - Table matching Branch Table spacing & font styling */}
        <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  RECIPIENT & APP NO
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  EMAIL
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  CATEGORY
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  STATUS
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  TIMESTAMP
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && filteredComms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading communications...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredComms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-6 text-muted-foreground/80" />
                      </div>
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          No communications found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try adjusting your filters or search query.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComms.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors"
                  >
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1e293b] text-[14px]">
                          {item.applicantName}
                        </span>
                        {(item as any).totalMessages > 0 && (
                          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold border border-[#BFDBFE]">
                            {(item as any).totalMessages}
                          </span>
                        )}
                      </div>
                      <div className="text-[#475569] text-[12px] flex items-center gap-2 mt-0.5">
                        <Link
                          href={`/organization/communications/${item.applicationNo || item.id}`}
                          className="font-medium text-[#2563EB] hover:underline"
                        >
                          {item.applicationNo}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <div className="flex items-center gap-1.5 text-[#1e293b] text-[13px] font-medium">
                        <Mail className="size-3.5 text-[#2563EB] shrink-0" />
                        <span className="truncate max-w-[200px]" title={item.recipientEmail}>{item.recipientEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <span className={getCategoryStyle(item.category)}>
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      {(() => {
                        const displayStatus = item.status === "Scheduled" ? "Scheduled" : "Sent";
                        return (
                          <Badge className={statusPillStyles[displayStatus] || "bg-gray-100 text-gray-700 font-medium text-xs px-2.5 py-0.5 rounded-full border-0 inline-flex items-center"}>
                            {displayStatus}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      {(() => {
                        const dt = formatFullDateTime(item.sentAt);
                        return (
                          <div>
                            <div className="text-[#1e293b] text-[13px] font-medium">{dt.date}</div>
                            <div className="text-[#64748b] text-[11px] mt-0.5">{dt.time}</div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle text-right">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 rounded-md hover:bg-muted"
                              size="icon"
                            >
                              <EllipsisVertical className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 z-50">
                            <DropdownMenuItem className="gap-2" asChild>
                              <Link href={`/organization/communications/${item.applicationNo || item.id}`}>
                                <Eye className="size-4 text-muted-foreground" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => resendMutation.mutate(item.id)}
                            >
                              <RotateCcw className="size-4 text-blue-600" />
                              Resend Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => deleteMutation.mutate(item.id)}
                            >
                              <Trash2 className="size-4" />
                              Delete Log
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Desktop Pagination Footer matching Branches Page */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredComms.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredComms.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredComms.length}
              </span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Prev
                </Button>
                <div className="flex items-center gap-1.5 px-1">
                  {visiblePages.map((page) => {
                    const isActive = page === currentPage;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                          isActive
                            ? "bg-[#EA2525] border-[#EA2525] hover:bg-[#D61F1F] text-white font-semibold shadow-xs"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Cards */}
        <div className="flex flex-col gap-3 lg:hidden">
          {paginatedComms.map((item) => (
            <Card key={item.id} className="p-4 border border-border rounded-[12px] bg-card shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground text-sm">{item.applicantName}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Mail className="size-3 text-[#2563EB]" />
                    <span>{item.recipientEmail}</span>
                  </div>
                  <span className="text-xs text-primary font-medium mt-0.5">App: {item.applicationNo}</span>
                </div>
                {(() => {
                  const displayStatus = item.status === "Scheduled" ? "Scheduled" : "Sent";
                  return (
                    <Badge className={statusPillStyles[displayStatus] || ""}>
                      {displayStatus}
                    </Badge>
                  );
                })()}
              </div>
              <div className="mt-3 pt-2 border-t border-border flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground">{item.subject}</span>
                <div>
                  <span className={getCategoryStyle(item.category)}>
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {(() => {
                  const dt = formatFullDateTime(item.sentAt);
                  return (
                    <span className="text-xs text-muted-foreground">
                      {dt.date} • {dt.time}
                    </span>
                  );
                })()}
                <Button asChild size="sm" variant="outline" className="text-xs h-8">
                  <Link href={`/organization/communications/${item.applicationNo || item.id}`}>View Details</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Compose Communication Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Send className="size-5 text-primary" />
              Compose Communication
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSendSubmit} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Channel</Label>
              <Tabs
                value={composeChannel}
                onValueChange={(val) => setComposeChannel(val as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="Email" className="text-xs font-medium gap-1.5">
                    <Mail className="size-3.5" /> Email
                  </TabsTrigger>
                  <TabsTrigger value="SMS" className="text-xs font-medium gap-1.5">
                    <Smartphone className="size-3.5" /> SMS
                  </TabsTrigger>
                  <TabsTrigger value="WhatsApp" className="text-xs font-medium gap-1.5">
                    <MessageSquare className="size-3.5" /> WhatsApp
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Select Template (Optional)</Label>
              <Select value={composeTemplateId} onValueChange={handleSelectTemplate}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose a pre-saved template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom / Blank Message</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">Application Number</Label>
                <Input
                  placeholder="e.g. APP2026001"
                  className="h-9 text-xs"
                  value={composeAppNo}
                  onChange={(e) => setComposeAppNo(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">Applicant Name</Label>
                <Input
                  placeholder="Recipient Name"
                  className="h-9 text-xs"
                  value={composeName}
                  onChange={(e) => setComposeName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">Recipient Email</Label>
                <Input
                  type="email"
                  placeholder="student@example.com"
                  className="h-9 text-xs"
                  value={composeEmail}
                  onChange={(e) => setComposeEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">Recipient Mobile</Label>
                <Input
                  placeholder="+91 98765 43210"
                  className="h-9 text-xs"
                  value={composePhone}
                  onChange={(e) => setComposePhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Subject / Header Title</Label>
              <Input
                placeholder="Enter subject line..."
                className="h-9 text-xs"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Message Content</Label>
              <Textarea
                rows={5}
                placeholder="Type your message or edit template here..."
                className="text-xs font-mono"
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/40 border border-border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scheduleCheck"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded cursor-pointer"
                />
                <label htmlFor="scheduleCheck" className="text-xs font-semibold text-foreground cursor-pointer">
                  Schedule for later
                </label>
              </div>

              {isScheduled && (
                <Input
                  type="datetime-local"
                  className="h-8 w-48 text-xs bg-background"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComposeOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground text-xs font-semibold px-4 gap-1.5"
                disabled={sendMutation.isPending}
              >
                <Send className="size-3.5" />
                {isScheduled ? "Schedule Message" : "Send Immediately"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Advanced Filter Modal */}
      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              Filter Communications
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Application Number</Label>
              <Input
                placeholder="Filter by App No..."
                className="h-9 text-xs"
                value={advAppNo}
                onChange={(e) => setAdvAppNo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">From Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={advDateFrom}
                  onChange={(e) => setAdvDateFrom(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">To Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={advDateTo}
                  onChange={(e) => setAdvDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdvAppNo("");
                setAdvDateFrom("");
                setAdvDateTo("");
                setAdvancedOpen(false);
              }}
              className="text-xs"
            >
              Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={() => setAdvancedOpen(false)}
              className="bg-primary text-primary-foreground text-xs font-semibold"
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
