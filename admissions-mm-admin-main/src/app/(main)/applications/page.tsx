"use client";

import * as React from "react";

import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

import {
  EllipsisVertical,
  Filter,
  SearchX,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Download,
  Hash,
  CalendarRange,
  CreditCard,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { type Application } from "@/data/mock-applications";
import {
  useApplications,
  useDeleteApplication,
} from "@/hooks/use-applications";


const paymentStatusStyles: Record<string, string> = {
  Pending:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Paid: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Refunded:
    "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportToCSV(data: Application[], filename = "applications.csv") {
  const headers = [
    "Application No",
    "Name",
    "Email",
    "Phone",
    "Program",
    "Campus",
    "Form Status",
    "Payment Status",
    "Payment Mode",
    "Payment Amount (₹)",
    "Last Activity",
  ];

  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((app) => [
    escape(app.applicationNo),
    escape(app.name),
    escape(app.email),
    escape(app.phone),
    escape(app.program),
    escape(app.campus),
    escape(app.formStatus),
    escape(app.paymentStatus),
    escape(app.paymentMode),
    escape(app.paymentAmount),
    escape(app.lastActivity),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ApplicationsPage() {
  const { data: applicationsResponse, isLoading } = useApplications();
  const deleteMutation = useDeleteApplication();

  const applicationsState = React.useMemo(() => {
    return applicationsResponse?.data || [];
  }, [applicationsResponse]);

  const [deleteAppId, setDeleteAppId] = React.useState<number | null>(null);

  function handleDeleteApplication(id: number) {
    deleteMutation.mutate(id);
  }
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [formStatusDraft, setFormStatusDraft] = React.useState("all");
  const [programDraft, setProgramDraft] = React.useState("all");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedFormStatus, setAppliedFormStatus] = React.useState("all");
  const [appliedProgram, setAppliedProgram] = React.useState("all");

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCampus, setAdvCampus] = React.useState("all");
  const [advProgram, setAdvProgram] = React.useState("all");
  const [advPaymentStatus, setAdvPaymentStatus] = React.useState("all");
  const [advPaymentMode, setAdvPaymentMode] = React.useState("");
  const [advDateFrom, setAdvDateFrom] = React.useState("");
  const [advDateTo, setAdvDateTo] = React.useState("");
  const [advApplicationNo, setAdvApplicationNo] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const appNoSuggestions = React.useMemo(() => {
    if (!advApplicationNo.trim()) return [];
    const q = advApplicationNo.toLowerCase();
    const matches = applicationsState
      .map((app) => app.applicationNo)
      .filter(
        (no, index, self) =>
          self.indexOf(no) === index && no.toLowerCase().includes(q),
      );
    return matches.slice(0, 5);
  }, [advApplicationNo, applicationsState]);

  // Dynamic filter options derived from actual data
  const uniqueFormStatuses = React.useMemo(() =>
    Array.from(new Set(applicationsState.map((a) => a.formStatus))).sort(),
  [applicationsState]);

  const uniquePrograms = React.useMemo(() =>
    Array.from(new Set(applicationsState.map((a) => a.program))).sort(),
  [applicationsState]);

  const uniqueCampuses = React.useMemo(() =>
    Array.from(new Set(applicationsState.map((a) => a.campus))).sort(),
  [applicationsState]);

  const uniquePaymentStatuses = React.useMemo(() =>
    Array.from(new Set(applicationsState.map((a) => a.paymentStatus))).sort(),
  [applicationsState]);

  const uniquePaymentModes = React.useMemo(() =>
    Array.from(new Set(applicationsState.map((a) => a.paymentMode))).filter(Boolean).sort(),
  [applicationsState]);

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    campus: "all",
    program: "all",
    paymentStatus: "all",
    paymentMode: "",
    dateFrom: "",
    dateTo: "",
    applicationNo: "",
  });

  function applyFilters() {
    setAppliedSearch(searchQuery);
    setAppliedFormStatus(formStatusDraft);
    setAppliedProgram(programDraft);
    setCurrentPage(1);
  }

  function applyAdvancedFilters() {
    setAppliedAdvanced({
      campus: advCampus,
      program: advProgram,
      paymentStatus: advPaymentStatus,
      paymentMode: advPaymentMode,
      dateFrom: advDateFrom,
      dateTo: advDateTo,
      applicationNo: advApplicationNo,
    });
    setAdvancedOpen(false);
    setCurrentPage(1);
  }

  function resetAdvancedFilters() {
    setAdvCampus("all");
    setAdvProgram("all");
    setAdvPaymentStatus("all");
    setAdvPaymentMode("");
    setAdvDateFrom("");
    setAdvDateTo("");
    setAdvApplicationNo("");
    setAppliedAdvanced({
      campus: "all",
      program: "all",
      paymentStatus: "all",
      paymentMode: "",
      dateFrom: "",
      dateTo: "",
      applicationNo: "",
    });
    setCurrentPage(1);
  }

  const filteredApplications = React.useMemo(() => {
    return applicationsState.filter((app) => {
      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        const matchesSearch =
          app.name.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q) ||
          app.phone.toLowerCase().includes(q) ||
          app.applicationNo.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (appliedFormStatus !== "all" && app.formStatus !== appliedFormStatus)
        return false;
      if (appliedProgram !== "all" && app.program !== appliedProgram)
        return false;
      if (
        appliedAdvanced.campus !== "all" &&
        app.campus !== appliedAdvanced.campus
      )
        return false;
      if (
        appliedAdvanced.program !== "all" &&
        app.program !== appliedAdvanced.program
      )
        return false;
      if (
        appliedAdvanced.paymentStatus !== "all" &&
        app.paymentStatus !== appliedAdvanced.paymentStatus
      )
        return false;
      if (
        appliedAdvanced.paymentMode &&
        !app.paymentMode
          .toLowerCase()
          .includes(appliedAdvanced.paymentMode.toLowerCase())
      )
        return false;
      if (
        appliedAdvanced.applicationNo &&
        !app.applicationNo
          .toLowerCase()
          .includes(appliedAdvanced.applicationNo.toLowerCase())
      )
        return false;
      if (
        appliedAdvanced.dateFrom &&
        app.lastActivity < appliedAdvanced.dateFrom
      )
        return false;
      if (appliedAdvanced.dateTo && app.lastActivity > appliedAdvanced.dateTo)
        return false;
      return true;
    });
  }, [
    appliedSearch,
    appliedFormStatus,
    appliedProgram,
    appliedAdvanced,
    applicationsState,
  ]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = filteredApplications.slice(
    startIndex,
    endIndex,
  );

  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [appliedSearch, appliedFormStatus, appliedProgram, appliedAdvanced]);

  const mobileApplications = React.useMemo(() => {
    return filteredApplications.slice(0, mobileVisibleCount);
  }, [filteredApplications, mobileVisibleCount]);

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
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i,
    );
  }, [currentPage, totalPages]);

  const hasAdvancedFilters =
    appliedAdvanced.campus !== "all" ||
    appliedAdvanced.program !== "all" ||
    appliedAdvanced.paymentStatus !== "all" ||
    appliedAdvanced.paymentMode !== "" ||
    appliedAdvanced.dateFrom !== "" ||
    appliedAdvanced.dateTo !== "" ||
    appliedAdvanced.applicationNo !== "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading applications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0 ">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, email, phone or application no..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAppliedSearch(e.target.value);
                  setCurrentPage(1);
                }}
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

          {/* Filters + Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Form Status Select */}
              <div className="flex-1 min-w-0 sm:w-[140px]">
                <Select
                  value={formStatusDraft}
                  onValueChange={(val) => {
                    setFormStatusDraft(val);
                    setAppliedFormStatus(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueFormStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Program Select */}
              <div className="flex-1 min-w-0 sm:w-[180px]">
                <Select
                  value={programDraft}
                  onValueChange={(val) => {
                    setProgramDraft(val);
                    setAppliedProgram(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {uniquePrograms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filter Button */}
              <Button
                variant="outline"
                size="icon"
                className="relative h-[39px] w-[39px] shrink-0"
                onClick={() => setAdvancedOpen(true)}
              >
                <Filter className="size-4" />
                <span className="sr-only">Advanced Filters</span>
                {hasAdvancedFilters && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                )}
              </Button>
            </div>

            {/* Export Button */}
            <Button
              variant="outline"
              className="w-full sm:w-auto shrink-0 border border-border h-[39px] text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => exportToCSV(filteredApplications)}
              disabled={filteredApplications.length === 0}
            >
              <Download className="size-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Advanced Search Dialog */}
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="sm:max-w-[580px]  px-6  bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">

            {/* Card 1: Search Criteria */}
            <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4 ">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                  <Hash className="size-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#0F172A]">Search Criteria</h3>
              </div>

              {/* Application No. — full width */}
              <div className="flex flex-col gap-2 relative">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Application No.
                </Label>
                <div className="relative">
                  <Input
                    id="adv-app-no"
                    placeholder="e.g. APP-2026-0001"
                    value={advApplicationNo}
                    onChange={(e) => {
                      setAdvApplicationNo(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                    autoComplete="off"
                  />
                  {showSuggestions && appNoSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-md max-h-48 overflow-y-auto py-1 animate-in fade-in duration-100">
                      {appNoSuggestions.map((no) => (
                        <button
                          key={no}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors font-medium text-foreground"
                          onMouseDown={() => {
                            setAdvApplicationNo(no);
                            setShowSuggestions(false);
                          }}
                        >
                          {no}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Program — full width */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Program
                </Label>
                <Select value={advProgram} onValueChange={setAdvProgram}>
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="All Programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {uniquePrograms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campus & Payment Status — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Campus
                  </Label>
                  <Select value={advCampus} onValueChange={setAdvCampus}>
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="All Campuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {uniqueCampuses.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Payment Status
                  </Label>
                  <Select value={advPaymentStatus} onValueChange={setAdvPaymentStatus}>
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniquePaymentStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Mode — full width */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Payment Mode
                </Label>
                <Select
                  value={advPaymentMode || "all"}
                  onValueChange={(val) => setAdvPaymentMode(val === "all" ? "" : val)}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="All Payment Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Modes</SelectItem>
                    {uniquePaymentModes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Card 2: Date Range */}
            <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4 ">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                  <CalendarRange className="size-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#0F172A]">Activity Date Range</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="adv-date-from" className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    From Date
                  </Label>
                  <Input
                    id="adv-date-from"
                    type="date"
                    value={advDateFrom}
                    onChange={(e) => setAdvDateFrom(e.target.value)}
                    className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="adv-date-to" className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    To Date
                  </Label>
                  <Input
                    id="adv-date-to"
                    type="date"
                    value={advDateTo}
                    onChange={(e) => setAdvDateTo(e.target.value)}
                    className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 justify-start mt-2 ml-5">
              <Button
                type="button"
                variant="outline"
                onClick={resetAdvancedFilters}
                className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </Button>
              <Button
                onClick={applyAdvancedFilters}
                className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
              >
                Apply Filters
              </Button>
            </div>

          </DialogContent>
        </Dialog>

        {/* Desktop View Table */}
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
                  PROGRAM
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  FORM STATUS
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  PAYMENT STATUS
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  LAST ACTIVITY
                </TableHead>
                <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length === 0 ? (
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
                paginatedApplications.map((app) => (
                  <TableRow
                    key={app.id}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                  >
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-foreground text-sm tracking-tight">
                          {app.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {app.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {app.applicationNo}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground text-sm tracking-tight">
                          {app.program}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {app.campus}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <StatusBadge status={app.formStatus} />
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <span
                        className={paymentStatusStyles[app.paymentStatus] ?? ""}
                      >
                        {app.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground font-normal">
                      {formatDate(app.lastActivity)}
                    </TableCell>
                    <TableCell className="py-5 px-3 align-middle text-right">
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
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2" asChild>
                              <Link href={`/applications/${app.applicationNo}`}>
                                <Eye className="size-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setDeleteAppId(app.id)}
                            >
                              <Trash2 className="size-4" />
                              Delete
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

          {/* Desktop Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground ">
                {filteredApplications.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredApplications.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredApplications.length}
              </span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
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
                            ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
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
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage < totalPages)
                      setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Ultra-Compact List Layout */}
        {filteredApplications.length === 0 ? (
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
            {mobileApplications.map((app) => {
              const initials = app.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={app.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Avatar, Name, Email, Stage & Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {app.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          {app.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <StatusBadge status={app.formStatus} />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-muted-foreground flex size-8 rounded-md hover:bg-muted p-0 shrink-0"
                            size="icon"
                          >
                            <EllipsisVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" asChild>
                            <Link href={`/applications/${app.applicationNo}`}>
                              <Eye className="size-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setDeleteAppId(app.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Grid of key details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        App No:
                      </span>
                      <span className="text-foreground/95 font-medium">
                        {app.applicationNo}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Program:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {app.program}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Payment Mode:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-foreground/95 font-medium">
                          {app.paymentMode !== "—" ? app.paymentMode : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Last Activity:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {formatDate(app.lastActivity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile & Tablet Load More Footer */}
        {mobileVisibleCount < filteredApplications.length ? (
          <div className="flex flex-col items-center gap-3 py-4 mt-2 lg:hidden">
            <Button
              variant="outline"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              className="w-full h-10 border border-border bg-background text-foreground font-medium rounded-[8px] hover:bg-accent hover:text-accent-foreground shadow-2xs transition-colors"
            >
              Load More Applications
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredApplications.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredApplications.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : (
          <div className="text-center py-4 mt-2 lg:hidden border-t border-border/40">
            <p className="text-xs text-muted-foreground font-normal">
              Showing all{" "}
              <span className="font-medium text-foreground">
                {filteredApplications.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredApplications.length}
              </span>{" "}
              entries
            </p>
          </div>
        )}
      </div>
      {/* Shadcn Alert Dialog for Application Deletion Warning Confirmation */}
      <AlertDialog
        open={deleteAppId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteAppId(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently delete the
              application from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium border border-border bg-background text-foreground hover:bg-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => {
                if (deleteAppId !== null) {
                  handleDeleteApplication(deleteAppId);
                  setDeleteAppId(null);
                }
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
