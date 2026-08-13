"use client";

import * as React from "react";
import {
  Download,
  Search,
  Calendar,
  SearchX,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useForm,
  useFormResponses,
} from "@/hooks/use-forms";
import { FormResponse } from "@/types/form";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePageHeaderStore } from "@/stores/page-header-store";

export default function OrganizationResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;

  // State
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");

  // API Hooks
  const { data: form, isLoading: isLoadingForm } = useForm(id);
  const { data: paginatedResponses, isLoading: isLoadingResponses } =
    useFormResponses(
      id,
      page,
      10,
      undefined,
      searchQuery.trim() !== "" ? searchQuery : undefined
    );

  const responses = paginatedResponses?.data || [];
  const pagination = paginatedResponses?.pagination;

  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  // Logic to find "Applicant Name", "Email", and "Phone" from data for display
  const getDisplayValue = React.useCallback((res: FormResponse, type: "name" | "email" | "phone") => {
    if (!form) return "";
    const field = form.fields.find(
      (f) => f.type === (type === "name" ? "text" : type === "email" ? "email" : "phone") || 
             f.id.toLowerCase() === type || 
             f.label.toLowerCase().includes(type)
    );
    if (field && res.data[field.id]) return res.data[field.id];

    // Fallback key search in raw data
    const keys = Object.keys(res.data);
    if (type === "name") {
      const nameKey = keys.find(
        (k) =>
          k.toLowerCase().includes("name") || k.toLowerCase().includes("full"),
      );
      return nameKey ? res.data[nameKey] : "Applicant";
    } else if (type === "email") {
      const emailKey = keys.find((k) => k.toLowerCase().includes("email"));
      return emailKey ? res.data[emailKey] : "—";
    } else {
      const phoneKey = keys.find(
        (k) =>
          k.toLowerCase().includes("phone") || k.toLowerCase().includes("mobile"),
      );
      return phoneKey ? res.data[phoneKey] : "—";
    }
  }, [form]);

  // CSV Export Handler
  const handleExportCSV = React.useCallback((data: FormResponse[]) => {
    if (!form || data.length === 0) return;

    const headers = [
      "Applicant Name",
      "Email",
      "Phone Number",
      "Submitted On",
    ];

    const escape = (val: any) => {
      const str = val === undefined || val === null ? "" : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = data.map((res) => {
      const name = getDisplayValue(res, "name");
      const email = getDisplayValue(res, "email");
      const phone = getDisplayValue(res, "phone");
      const date = res.submittedAt
        ? new Date(res.submittedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      return [name, email, phone, date].map(escape);
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.name.toLowerCase().replace(/\s+/g, "_")}_responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  }, [form, getDisplayValue]);

  // Page Header Setup
  React.useEffect(() => {
    if (form) {
      setHeader({
        title: "Form Responses",
        description: form.name,
        customLeftNode: null,
        customRightNode: null,
      });
    }
    return () => {
      clearHeader();
    };
  }, [form, setHeader, clearHeader]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoadingForm) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-14 border-b flex items-center px-6 gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-lg font-semibold">Form not found</p>
        <Link href="/organization/forms">
          <Button variant="outline">Back to Forms</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
        {/* Local Page Header Section with Back Button */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-3">
            <Link href="/organization/forms">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-xl border-border/80 text-muted-foreground hover:text-foreground bg-card flex items-center justify-center shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h2 className="text-[32px] font-medium tracking-tight text-[#120352] leading-[normal]">
              Form Responses
            </h2>
          </div>
          <p className="text-[#171717] text-[12px] leading-relaxed max-w-[566px]">
            Track and manage responses submitted to this form. View applicant contact details, submissions, and export data for campaigns.
          </p>
        </div>

        {/* Search Panel with Export CSV */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full min-w-0 mt-2">
          <div className="relative flex-1 w-full">
            <Input
              placeholder="Search submissions..."
              className="w-full pr-10 h-10"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
              <Search className="size-4" />
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto shrink-0 border border-[#D4D4D4] h-10 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-[8px]"
            onClick={() => handleExportCSV(responses)}
            disabled={responses.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  APPLICANT
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  EMAIL
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  PHONE NUMBER
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  SUBMITTED ON
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!mounted || isLoadingResponses) && responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading responses...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
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
                responses.map((res) => {
                  const applicantName = getDisplayValue(res, "name");
                  const applicantEmail = getDisplayValue(res, "email");
                  const applicantPhone = getDisplayValue(res, "phone");
                  return (
                    <TableRow
                      key={res.id}
                      className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors"
                    >
                      <TableCell className="py-[20px] px-[24px] align-middle">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] uppercase shrink-0">
                            {String(applicantName)
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <span className="font-semibold text-[#1e293b] text-[14px] truncate block">
                            {applicantName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-[20px] px-[24px] align-middle text-sm text-[#475569]">
                        {applicantEmail}
                      </TableCell>
                      <TableCell className="py-[20px] px-[24px] align-middle text-sm text-[#475569]">
                        {applicantPhone}
                      </TableCell>
                      <TableCell className="py-[20px] px-[24px] align-middle">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[12px] font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {res.submittedAt
                            ? format(
                                new Date(res.submittedAt),
                                "dd MMM yyyy, hh:mm a",
                              )
                            : "—"}
                        </div>
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
                {responses.length === 0 ? 0 : (page - 1) * 10 + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * 10, pagination?.total || 0)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {pagination?.total || 0}
              </span>{" "}
              entries
            </p>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1.5 px-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                    const isActive = p === page;
                    return (
                      <Button
                        key={p}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                          isActive
                            ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F]"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground font-normal"
                        }`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() =>
                    setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                  }
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Cards List Layout */}
        {(!mounted || isLoadingResponses) && responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading responses...</p>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">
                No results found
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 lg:hidden w-full">
            {responses.map((res) => {
              const applicantName = getDisplayValue(res, "name");
              const applicantEmail = getDisplayValue(res, "email");
              const applicantPhone = getDisplayValue(res, "phone");
              const initials = String(applicantName)
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={res.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Initials/Avatar, Name, Email */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {applicantName}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          {applicantEmail}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Details Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Phone:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {applicantPhone}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Submitted:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {res.submittedAt
                          ? format(new Date(res.submittedAt), "dd MMM, hh:mm a")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile Pagination Footer */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 py-4 mt-2 lg:hidden">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
                  Page {page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold uppercase"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold uppercase"
                    onClick={() =>
                      setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                    }
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
