"use client";

import * as React from "react";
import Link from "next/link";
import {
  IndianRupee,
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  SearchX,
  TrendingUp,
  Receipt,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { usePayments, usePaymentStats, type PaymentRecord } from "@/hooks/use-payments";
import { usePageHeader } from "@/hooks/use-page-header";

const paymentStatusStyles: Record<string, string> = {
  Pending:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  pending:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  created:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  Paid: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  paid: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  success: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  Refunded:
    "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  refunded:
    "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  Failed:
    "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
  failed:
    "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-block text-center",
};

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const hasZOrT = typeof dateStr === "string" && (dateStr.includes("T") || dateStr.includes("Z"));
  return d.toLocaleString("en-IN", {
    timeZone: hasZOrT ? "UTC" : undefined,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function exportToCSV(data: PaymentRecord[], filename = "payments.csv") {
  const headers = [
    "Application No",
    "Candidate Name",
    "Email",
    "Phone",
    "Program",
    "Campus",
    "Paid Amount (₹)",
    "Status",
    "Purpose",
    "Payment Gateway",
    "Razorpay Payment ID",
    "Razorpay Order ID",
    "Payment Timestamp",
  ];

  const escape = (val: string | number | undefined) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((p) => [
    escape(p.applicationNo),
    escape(p.applicantName),
    escape(p.applicantEmail),
    escape(p.applicantPhone),
    escape(p.program),
    escape(p.campus),
    escape(p.amount),
    escape(p.status.toUpperCase()),
    escape(p.purpose === "application_fee" ? "Application Fee" : "Seat Booking Fee"),
    escape(p.method),
    escape(p.razorpayPaymentId),
    escape(p.razorpayOrderId),
    escape(formatDateTime(p.paidAt || p.createdAt)),
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

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const itemsPerPage = 10;

  usePageHeader({
    title: "Payments & Collections",
    description: "Track all student fee payments, Razorpay order IDs, timestamps, and real-time revenue collection.",
    action: {
      label: "Fee Settings",
      href: "/organization/settings/fees",
    },
  });

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: paymentsResponse, isLoading } = usePayments({
    page: 1,
    limit: 500,
    search: appliedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: statsData } = usePaymentStats();

  const allPayments = React.useMemo(() => {
    const raw = paymentsResponse?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [paymentsResponse]);

  const filteredPayments = React.useMemo(() => {
    return allPayments.filter((p) => {
      const pStatus = (p.status || "").toLowerCase();
      if (statusFilter !== "all") {
        const sFilter = statusFilter.toLowerCase();
        if (sFilter === "pending" || sFilter === "created") {
          if (pStatus !== "pending" && pStatus !== "created") return false;
        } else if (pStatus !== sFilter) {
          return false;
        }
      }
      return true;
    });
  }, [allPayments, statusFilter]);

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);
  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [appliedSearch, statusFilter]);

  const mobilePayments = React.useMemo(() => {
    return filteredPayments.slice(0, mobileVisibleCount);
  }, [filteredPayments, mobileVisibleCount]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Summary Metrics calculated from data / stats endpoint
  const stats = React.useMemo(() => {
    const successful = allPayments.filter((p) => {
      const s = (p.status || "").toLowerCase();
      return s === "paid" || s === "success";
    });
    const totalCollected = successful.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pending = allPayments.filter((p) => {
      const s = (p.status || "").toLowerCase();
      return s === "pending" || s === "created";
    }).length;
    const failed = allPayments.filter((p) => (p.status || "").toLowerCase() === "failed").length;

    return {
      totalCollected: statsData?.totalCollected ?? totalCollected,
      successfulCount: statsData?.successfulCount ?? (statsData as any)?.successfulOrders ?? successful.length,
      pendingCount: statsData?.pendingCount ?? pending,
      failedCount: statsData?.failedCount ?? failed,
    };
  }, [allPayments, statsData]);

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
    return Array.from({ length: Math.max(1, endPage - startPage + 1) }, (_, i) => startPage + i);
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-full min-w-0">
      {/* 3 Summary Stats Cards matching /organization/team styling */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Revenue Collected */}
        <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex flex-col items-start gap-1 shrink-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#ECFDF5] flex items-center justify-center text-[#10B981]">
              <IndianRupee className="size-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Total Revenue</span>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="text-[28px] font-bold leading-none text-[#0F172A] dark:text-foreground truncate">
              {formatCurrency(stats.totalCollected)}
            </span>
            <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#10B981]/15">
              <div
                className="h-full rounded-[9999px] transition-all duration-700"
                style={{ width: "100%", backgroundColor: "#10B981" }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Successful Payments */}
        <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex flex-col items-start gap-1 shrink-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
              <CheckCircle2 className="size-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Paid & Confirmed</span>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="text-[28px] font-bold leading-none text-[#0F172A] dark:text-foreground">
              {stats.successfulCount}
            </span>
            <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#2563EB]/15">
              <div
                className="h-full rounded-[9999px] transition-all duration-700"
                style={{
                  width: allPayments.length > 0 ? `${Math.min(100, (stats.successfulCount / allPayments.length) * 100)}%` : "0%",
                  backgroundColor: "#2563EB",
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Pending / In Checkout */}
        <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex flex-col items-start gap-1 shrink-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
              <Clock className="size-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Pending Fee</span>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <span className="text-[28px] font-bold leading-none text-[#0F172A] dark:text-foreground">
              {stats.pendingCount}
            </span>
            <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#D97706]/15">
              <div
                className="h-full rounded-[9999px] transition-all duration-700"
                style={{
                  width: allPayments.length > 0 ? `${Math.min(100, (stats.pendingCount / allPayments.length) * 100)}%` : "0%",
                  backgroundColor: "#D97706",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Actions Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search Bar */}
        <div className="flex flex-1 w-full">
          <div className="relative w-full">
            <Input
              placeholder="Search by candidate name, email, application no, or transaction ID..."
              className="w-full pr-10 h-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2 hover:bg-transparent"
            >
              <Search className="size-4 text-muted-foreground" />
              <span className="sr-only">Search</span>
            </Button>
          </div>
        </div>

        {/* Controls: Status & Export CSV */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Status Quick Select */}
          <div className="w-full sm:w-[150px]">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            onClick={() => exportToCSV(filteredPayments)}
            className="h-10 px-3.5 border-border/80 bg-background hover:bg-muted/50 text-foreground flex items-center justify-center gap-2 shadow-2xs"
          >
            <Download className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                APPLICANT DETAIL
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                APPLICATION NO.
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                AMOUNT PAID
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                PURPOSE
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                PAYMENT STATUS
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                TRANSACTION / ORDER ID
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                DATE & TIME
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground font-medium">Searching...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        No results found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your filters or search query.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayments.map((payment) => {
                const statusKey = (payment.status || "pending").toLowerCase();
                const displayStatus =
                  statusKey === "paid" || statusKey === "success"
                    ? "Paid"
                    : statusKey === "failed"
                    ? "Failed"
                    : statusKey === "refunded"
                    ? "Refunded"
                    : "Pending";

                return (
                  <TableRow
                    key={payment.id}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                  >
                    {/* Applicant Detail */}
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/organization/applications/${encodeURIComponent(payment.applicationNo)}`}
                          className="font-semibold text-foreground hover:underline text-sm tracking-tight cursor-pointer"
                        >
                          {payment.applicantName}
                        </Link>
                        <div className="text-xs text-muted-foreground font-normal">
                          {payment.applicantEmail}
                        </div>
                      </div>
                    </TableCell>

                    {/* Application No */}
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      <Link
                        href={`/organization/applications/${encodeURIComponent(payment.applicationNo)}`}
                        className="text-foreground hover:underline font-medium cursor-pointer"
                      >
                        {payment.applicationNo}
                      </Link>
                    </TableCell>

                    {/* Exact Paid Amount */}
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground text-sm tracking-tight">
                          {formatCurrency(payment.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal uppercase">
                          {payment.currency || "INR"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Purpose */}
                    <TableCell className="py-5 px-6 align-middle">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0"
                      >
                        {payment.purpose === "seat_booking_fee" ? "Seat Booking" : "Application Fee"}
                      </Badge>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="py-5 px-6 align-middle">
                      <span
                        className={paymentStatusStyles[statusKey] || paymentStatusStyles.pending}
                      >
                        {displayStatus}
                      </span>
                    </TableCell>

                    {/* Razorpay Reference IDs */}
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm font-normal text-foreground">
                          <span>{payment.razorpayPaymentId && payment.razorpayPaymentId !== "—" ? payment.razorpayPaymentId : payment.razorpayOrderId}</span>
                          {payment.razorpayPaymentId && payment.razorpayPaymentId !== "—" && (
                            <button
                              type="button"
                              onClick={() => handleCopy(payment.razorpayPaymentId, payment.id + "-pay")}
                              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
                              title="Copy Payment ID"
                            >
                              {copiedId === payment.id + "-pay" ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {payment.method || "Razorpay Gateway"}
                        </div>
                      </div>
                    </TableCell>

                    {/* Timestamp */}
                    <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground font-normal">
                      {formatDateTime(payment.paidAt || payment.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Desktop Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
          <p className="text-sm text-muted-foreground font-normal">
            Showing{" "}
            <span className="font-medium text-foreground">
              {filteredPayments.length === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(endIndex, filteredPayments.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {filteredPayments.length}
            </span>{" "}
            entries
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 shadow-2xs"
                onClick={() => {
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {visiblePages.map((page) => {
                  const isActive = currentPage === page;
                  return (
                    <Button
                      key={page}
                      variant={isActive ? "default" : "outline"}
                      className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                        isActive
                          ? "bg-[#2563EB] border-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8]"
                          : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground font-normal"
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
                className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 shadow-2xs"
                onClick={() => {
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card View (Optimized for Small Screens) */}
      <div className="lg:hidden flex flex-col gap-3.5 w-full">
        {isLoading ? (
          <div className="py-16 text-center border border-border/80 bg-card rounded-xl">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">No payments found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          </div>
        ) : (
          mobilePayments.map((payment) => {
            const statusKey = (payment.status || "pending").toLowerCase();
            const displayStatus =
              statusKey === "paid" || statusKey === "success"
                ? "Paid"
                : statusKey === "failed"
                ? "Failed"
                : statusKey === "refunded"
                ? "Refunded"
                : "Pending";
            const initials = payment.applicantName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={payment.id}
                className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 shadow-xs"
              >
                {/* Header Row: Avatar, Name, Email, Status */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                      {initials || "AP"}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/organization/applications/${encodeURIComponent(payment.applicationNo)}`}
                        className="font-semibold text-foreground hover:underline text-sm tracking-tight truncate block cursor-pointer"
                      >
                        {payment.applicantName}
                      </Link>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {payment.applicantEmail}
                      </span>
                    </div>
                  </div>

                  <span
                    className={paymentStatusStyles[statusKey] || paymentStatusStyles.pending}
                  >
                    {displayStatus}
                  </span>
                </div>

                {/* Grid of Key Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground/80">Application No:</span>
                    <Link
                      href={`/organization/applications/${encodeURIComponent(payment.applicationNo)}`}
                      className="text-foreground hover:underline font-mono font-semibold"
                    >
                      {payment.applicationNo}
                    </Link>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground/80">Amount Paid:</span>
                    <span className="text-foreground font-mono font-bold text-sm text-emerald-600">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground/80">Purpose:</span>
                    <span className="text-foreground font-medium">
                      {payment.purpose === "seat_booking_fee" ? "Seat Booking" : "Application Fee"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground/80">Transaction ID:</span>
                    <span className="text-foreground font-mono text-[11px] truncate">
                      {payment.razorpayPaymentId && payment.razorpayPaymentId !== "—" ? payment.razorpayPaymentId : payment.razorpayOrderId}
                    </span>
                  </div>

                  <div className="col-span-2 flex flex-col gap-0.5 border-t border-border/30 pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground/80">Date & Time:</span>
                    <span className="text-foreground font-medium">
                      {formatDateTime(payment.paidAt || payment.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Load More */}
        {filteredPayments.length > mobileVisibleCount && (
          <Button
            variant="outline"
            onClick={() => setMobileVisibleCount((prev) => prev + 5)}
            className="w-full h-11 border-border/80 text-sm font-semibold rounded-xl bg-card shadow-2xs mt-1"
          >
            Load More Transactions ({filteredPayments.length - mobileVisibleCount} remaining)
          </Button>
        )}
      </div>
    </div>
  );
}
