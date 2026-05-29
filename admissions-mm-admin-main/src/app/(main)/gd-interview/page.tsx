/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";

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
  Download,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

type GDInterview = {
  id: number;
  applicationNo: string;
  name: string;
  email: string;
  phone: string;
  interviewLocation: string;
  date: string;
  time: string;
  course: string;
  selectionStatus: "Accepted" | "Rejected" | "In Progress";
  confirmedCampus: string;
};

const gdInterviews: GDInterview[] = [
  {
    id: 1,
    applicationNo: "APP-2026-0001",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 43210",
    interviewLocation: "Chennai",
    date: "2026-03-15",
    time: "10:00 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Accepted",
    confirmedCampus: "Main Campus",
  },
  {
    id: 2,
    applicationNo: "APP-2026-0002",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    phone: "+91 91234 56780",
    interviewLocation: "Bangalore",
    date: "2026-03-16",
    time: "11:30 AM",
    course: "PGDM 2026-28",
    selectionStatus: "In Progress",
    confirmedCampus: "—",
  },
  {
    id: 3,
    applicationNo: "APP-2026-0003",
    name: "Rohan Desai",
    email: "rohan.desai@example.com",
    phone: "+91 99876 54321",
    interviewLocation: "Kochi",
    date: "2026-03-17",
    time: "02:00 PM",
    course: "PGDM 2026-28",
    selectionStatus: "Rejected",
    confirmedCampus: "—",
  },
  {
    id: 4,
    applicationNo: "APP-2026-0004",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+91 87654 32109",
    interviewLocation: "Chennai",
    date: "2026-03-15",
    time: "11:00 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Accepted",
    confirmedCampus: "South Campus",
  },
  {
    id: 5,
    applicationNo: "APP-2026-0005",
    name: "Karan Singh",
    email: "karan.singh@example.com",
    phone: "+91 90123 45678",
    interviewLocation: "Hyderabad",
    date: "2026-03-18",
    time: "09:30 AM",
    course: "PGDM 2026-28",
    selectionStatus: "In Progress",
    confirmedCampus: "—",
  },
  {
    id: 6,
    applicationNo: "APP-2026-0006",
    name: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    phone: "+91 78901 23456",
    interviewLocation: "Kochi",
    date: "2026-03-19",
    time: "01:30 PM",
    course: "PGDM 2026-28",
    selectionStatus: "Accepted",
    confirmedCampus: "South Campus",
  },
  {
    id: 7,
    applicationNo: "APP-2026-0007",
    name: "Vikram Joshi",
    email: "vikram.joshi@example.com",
    phone: "+91 81234 56789",
    interviewLocation: "Chennai",
    date: "2026-03-20",
    time: "09:00 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Rejected",
    confirmedCampus: "—",
  },
  {
    id: 8,
    applicationNo: "APP-2026-0008",
    name: "Meera Gupta",
    email: "meera.gupta@example.com",
    phone: "+91 92345 67890",
    interviewLocation: "Bangalore",
    date: "2026-03-20",
    time: "12:00 PM",
    course: "PGDM 2026-28",
    selectionStatus: "Accepted",
    confirmedCampus: "City Campus",
  },
  {
    id: 9,
    applicationNo: "APP-2026-0009",
    name: "Arjun Patel",
    email: "arjun.patel@example.com",
    phone: "+91 85678 90123",
    interviewLocation: "Hyderabad",
    date: "2026-03-21",
    time: "11:15 AM",
    course: "PGDM 2026-28",
    selectionStatus: "In Progress",
    confirmedCampus: "—",
  },
  {
    id: 10,
    applicationNo: "APP-2026-0010",
    name: "Diya Reddy",
    email: "diya.reddy@example.com",
    phone: "+91 93456 78901",
    interviewLocation: "Chennai",
    date: "2026-03-22",
    time: "03:30 PM",
    course: "PGDM 2026-28",
    selectionStatus: "In Progress",
    confirmedCampus: "—",
  },
  {
    id: 11,
    applicationNo: "APP-2026-0011",
    name: "Ishaan Kumar",
    email: "ishaan.kumar@example.com",
    phone: "+91 76543 21098",
    interviewLocation: "Bangalore",
    date: "2026-03-23",
    time: "10:45 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Accepted",
    confirmedCampus: "City Campus",
  },
  {
    id: 12,
    applicationNo: "APP-2026-0012",
    name: "Tanya Bose",
    email: "tanya.bose@example.com",
    phone: "+91 88765 43210",
    interviewLocation: "Kochi",
    date: "2026-03-24",
    time: "02:15 PM",
    course: "PGDM 2026-28",
    selectionStatus: "Accepted",
    confirmedCampus: "Main Campus",
  },
];

const SELECTION_STATUSES = ["Confirmed", "Not Selected", "Pending"] as const;
const INTERVIEW_LOCATIONS = [
  "Chennai",
  "Bangalore",
  "Kochi",
  "Hyderabad",
  "Delhi",
] as const;
const COURSES = ["PGDM 2026-28"] as const;

const selectionStatusStyles: Record<string, string> = {
  "In Progress":
    "bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Accepted:
    "bg-[#05966933] text-[#065F46] dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Rejected:
    "bg-[#D9770633] text-[#BD0F0F] dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function exportToCSV(data: GDInterview[], filename = "gd_interviews.csv") {
  const headers = [
    "Application No",
    "Name",
    "Email",
    "Phone",
    "Interview Location",
    "Date",
    "Time",
    "Course",
    "Selection Status",
    "Confirmed Campus",
  ];

  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((item) => [
    escape(item.applicationNo),
    escape(item.name),
    escape(item.email),
    escape(item.phone),
    escape(item.interviewLocation),
    escape(item.date),
    escape(item.time),
    escape(item.course),
    escape(item.selectionStatus),
    escape(item.confirmedCampus),
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

export default function GDInterviewPage() {
  const [interviewsState, setInterviewsState] =
    React.useState<GDInterview[]>(gdInterviews);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  function handleDelete(id: number) {
    setInterviewsState((prev) => prev.filter((item) => item.id !== id));
  }

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState("all");
  const [locationDraft, setLocationDraft] = React.useState("all");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedStatus, setAppliedStatus] = React.useState("all");
  const [appliedLocation, setAppliedLocation] = React.useState("all");

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCourse, setAdvCourse] = React.useState("all");
  const [advDateFrom, setAdvDateFrom] = React.useState("");
  const [advDateTo, setAdvDateTo] = React.useState("");
  const [advApplicationNo, setAdvApplicationNo] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const appNoSuggestions = React.useMemo(() => {
    if (!advApplicationNo.trim()) return [];
    const q = advApplicationNo.toLowerCase();
    const matches = interviewsState
      .map((item) => item.applicationNo)
      .filter(
        (no, index, self) =>
          self.indexOf(no) === index && no.toLowerCase().includes(q),
      );
    return matches.slice(0, 5);
  }, [advApplicationNo, interviewsState]);

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    course: "all",
    dateFrom: "",
    dateTo: "",
    applicationNo: "",
  });

  function applyFilters() {
    setAppliedSearch(searchQuery);
    setAppliedStatus(statusDraft);
    setAppliedLocation(locationDraft);
    setCurrentPage(1);
  }

  function applyAdvancedFilters() {
    setAppliedAdvanced({
      course: advCourse,
      dateFrom: advDateFrom,
      dateTo: advDateTo,
      applicationNo: advApplicationNo,
    });
    setAdvancedOpen(false);
    setCurrentPage(1);
  }

  function resetAdvancedFilters() {
    setAdvCourse("all");
    setAdvDateFrom("");
    setAdvDateTo("");
    setAdvApplicationNo("");
    setAppliedAdvanced({
      course: "all",
      dateFrom: "",
      dateTo: "",
      applicationNo: "",
    });
    setCurrentPage(1);
  }

  const filteredInterviews = React.useMemo(() => {
    return interviewsState.filter((item) => {
      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          item.applicationNo.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (appliedStatus !== "all" && item.selectionStatus !== appliedStatus)
        return false;
      if (appliedLocation !== "all" && item.interviewLocation !== appliedLocation)
        return false;
      if (appliedAdvanced.course !== "all" && item.course !== appliedAdvanced.course)
        return false;
      if (
        appliedAdvanced.applicationNo &&
        !item.applicationNo
          .toLowerCase()
          .includes(appliedAdvanced.applicationNo.toLowerCase())
      )
        return false;
      if (appliedAdvanced.dateFrom && item.date < appliedAdvanced.dateFrom)
        return false;
      if (appliedAdvanced.dateTo && item.date > appliedAdvanced.dateTo)
        return false;
      return true;
    });
  }, [
    appliedSearch,
    appliedStatus,
    appliedLocation,
    appliedAdvanced,
    interviewsState,
  ]);

  const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInterviews = filteredInterviews.slice(startIndex, endIndex);

  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [appliedSearch, appliedStatus, appliedLocation, appliedAdvanced]);

  const mobileInterviews = React.useMemo(() => {
    return filteredInterviews.slice(0, mobileVisibleCount);
  }, [filteredInterviews, mobileVisibleCount]);

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
    appliedAdvanced.course !== "all" ||
    appliedAdvanced.dateFrom !== "" ||
    appliedAdvanced.dateTo !== "" ||
    appliedAdvanced.applicationNo !== "";

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
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
              {/* Selection Status Select */}
              <div className="flex-1 min-w-0 sm:w-[140px]">
                <Select
                  value={statusDraft}
                  onValueChange={(val) => {
                    setStatusDraft(val);
                    setAppliedStatus(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {SELECTION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Select */}
              <div className="flex-1 min-w-0 sm:w-[180px]">
                <Select
                  value={locationDraft}
                  onValueChange={(val) => {
                    setLocationDraft(val);
                    setAppliedLocation(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {INTERVIEW_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
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
              onClick={() => exportToCSV(filteredInterviews)}
              disabled={filteredInterviews.length === 0}
            >
              <Download className="size-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Advanced Search Dialog */}
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="sm:max-w-lg rounded-xl">
            <DialogHeader>
              <DialogTitle>Advanced Search</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2 relative">
                <Label htmlFor="adv-app-no">Application No.</Label>
                <div className="relative">
                  <Input
                    id="adv-app-no"
                    placeholder="e.g. CHN-2026-1101"
                    value={advApplicationNo}
                    onChange={(e) => {
                      setAdvApplicationNo(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full h-10"
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
              <div className="grid gap-2">
                <Label>Course</Label>
                <Select value={advCourse} onValueChange={setAdvCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="adv-date-from">Interview From</Label>
                  <Input
                    id="adv-date-from"
                    type="date"
                    value={advDateFrom}
                    onChange={(e) => setAdvDateFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adv-date-to">Interview To</Label>
                  <Input
                    id="adv-date-to"
                    type="date"
                    value={advDateTo}
                    onChange={(e) => setAdvDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetAdvancedFilters}>
                Reset
              </Button>
              <Button onClick={applyAdvancedFilters}>Apply Filters</Button>
            </DialogFooter>
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
                LOCATION
                </TableHead>
            
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  COURSE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  SELECTION 
                </TableHead>
                    <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  DATE & TIME
                </TableHead>
                <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterviews.length === 0 ? (
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
                paginatedInterviews.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                  >
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-foreground text-sm tracking-tight">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {item.email} · {item.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {item.applicationNo}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {item.interviewLocation}
                    </TableCell>
                  
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {item.course}
                    </TableCell>
                   <TableCell className="py-5 px-6 align-middle">
  {item.selectionStatus === "Accepted" ? (
    <div className="flex flex-col items-start gap-1">
      <span className={selectionStatusStyles[item.selectionStatus] ?? ""}>
        {item.selectionStatus}
      </span>
    </div>
  ) : item.selectionStatus === "Rejected" ? (
    <span className={selectionStatusStyles[item.selectionStatus] ?? ""}>
      {item.selectionStatus}
    </span>
  ) : item.selectionStatus === "In Progress" ? (
    <span className={selectionStatusStyles[item.selectionStatus] ?? ""}>
      {item.selectionStatus}
    </span>
  ) : (
    <span className={selectionStatusStyles[item.selectionStatus] ?? ""}>
      {item.selectionStatus}
    </span>
  )}
</TableCell>
                      <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground text-sm tracking-tight">
                          {formatDate(item.date)}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {item.time}
                        </div>
                      </div>
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
                              <Link href={`/gd-interview/${item.applicationNo}`}>
                                <Eye className="size-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setDeleteId(item.id)}
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
              <span className="font-medium text-foreground">
                {filteredInterviews.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredInterviews.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredInterviews.length}
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
        {filteredInterviews.length === 0 ? (
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
            {mobileInterviews.map((item) => {
              const initials = item.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={item.id}
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
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          {item.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <span className={selectionStatusStyles[item.selectionStatus] ?? ""}>
                        {item.selectionStatus}
                      </span>

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
                            <Link href={`/gd-interview/${item.applicationNo}`}>
                              <Eye className="size-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setDeleteId(item.id)}
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
                        {item.applicationNo}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Location:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.interviewLocation}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Course:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.course}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Date & Time:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {formatDate(item.date)} ({item.time})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile & Tablet Load More Footer */}
        {mobileVisibleCount < filteredInterviews.length ? (
          <div className="flex flex-col items-center gap-3 py-4 mt-2 lg:hidden">
            <Button
              variant="outline"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              className="w-full h-10 border border-border bg-background text-foreground font-medium rounded-[8px] hover:bg-accent hover:text-accent-foreground shadow-2xs transition-colors"
            >
              Load More GD & Interviews
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredInterviews.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredInterviews.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : (
          <div className="text-center py-4 mt-2 lg:hidden border-t border-border/40">
            <p className="text-xs text-muted-foreground font-normal">
              Showing all{" "}
              <span className="font-medium text-foreground">
                {filteredInterviews.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredInterviews.length}
              </span>{" "}
              entries
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently delete the
              GD & Interview record from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium border border-border bg-background text-foreground hover:bg-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => {
                if (deleteId !== null) {
                  handleDelete(deleteId);
                  setDeleteId(null);
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
