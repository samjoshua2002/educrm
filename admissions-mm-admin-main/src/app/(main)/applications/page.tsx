"use client";

import * as React from "react";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Download,
} from "lucide-react";

import Link from "next/link";

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

type Application = {
  id: number;
  applicationNo: string;
  name: string;
  email: string;
  phone: string;
  formStatus: string;
  paymentStatus: string;
  paymentMode: string;
  paymentAmount: number;
  lastActivity: string;
  program: string;
  campus: string;
};

const applications: Application[] = [
  {
    id: 1,
    applicationNo: "APP-2026-0001",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 43210",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-18",
    program: "B.Tech Computer Science",
    campus: "Main Campus",
  },
  {
    id: 2,
    applicationNo: "APP-2026-0002",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    phone: "+91 91234 56780",
    formStatus: "In Progress",
    paymentStatus: "Pending",
    paymentMode: "—",
    paymentAmount: 0,
    lastActivity: "2026-02-17",
    program: "MBA Finance",
    campus: "City Campus",
  },
  {
    id: 3,
    applicationNo: "APP-2026-0003",
    name: "Rohan Desai",
    email: "rohan.desai@example.com",
    phone: "+91 99876 54321",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "UPI",
    paymentAmount: 1500,
    lastActivity: "2026-02-16",
    program: "B.Sc Physics",
    campus: "South Campus",
  },
  {
    id: 4,
    applicationNo: "APP-2026-0004",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+91 87654 32109",
    formStatus: "Under Review",
    paymentStatus: "Paid",
    paymentMode: "Net Banking",
    paymentAmount: 2000,
    lastActivity: "2026-02-15",
    program: "M.Tech AI & ML",
    campus: "Main Campus",
  },
  {
    id: 5,
    applicationNo: "APP-2026-0005",
    name: "Karan Singh",
    email: "karan.singh@example.com",
    phone: "+91 90123 45678",
    formStatus: "Incomplete",
    paymentStatus: "Pending",
    paymentMode: "—",
    paymentAmount: 0,
    lastActivity: "2026-02-14",
    program: "BBA",
    campus: "City Campus",
  },
  {
    id: 6,
    applicationNo: "APP-2026-0006",
    name: "Ananya Sharma",
    email: "ananya.sharma@example.com",
    phone: "+91 78901 23456",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "Credit Card",
    paymentAmount: 1500,
    lastActivity: "2026-02-13",
    program: "B.Tech Electronics",
    campus: "South Campus",
  },
  {
    id: 7,
    applicationNo: "APP-2026-0007",
    name: "Vikram Joshi",
    email: "vikram.joshi@example.com",
    phone: "+91 81234 56789",
    formStatus: "Rejected",
    paymentStatus: "Refunded",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-12",
    program: "MBA Marketing",
    campus: "Main Campus",
  },
  {
    id: 8,
    applicationNo: "APP-2026-0008",
    name: "Meera Gupta",
    email: "meera.gupta@example.com",
    phone: "+91 92345 67890",
    formStatus: "Accepted",
    paymentStatus: "Paid",
    paymentMode: "Debit Card",
    paymentAmount: 2000,
    lastActivity: "2026-02-11",
    program: "B.Sc Mathematics",
    campus: "City Campus",
  },
  {
    id: 9,
    applicationNo: "APP-2026-0009",
    name: "Arjun Patel",
    email: "arjun.patel@example.com",
    phone: "+91 85678 90123",
    formStatus: "Submitted",
    paymentStatus: "Paid",
    paymentMode: "UPI",
    paymentAmount: 1500,
    lastActivity: "2026-02-10",
    program: "B.Tech Mechanical",
    campus: "South Campus",
  },
  {
    id: 10,
    applicationNo: "APP-2026-0010",
    name: "Diya Reddy",
    email: "diya.reddy@example.com",
    phone: "+91 93456 78901",
    formStatus: "In Progress",
    paymentStatus: "Pending",
    paymentMode: "—",
    paymentAmount: 0,
    lastActivity: "2026-02-09",
    program: "M.Tech Data Science",
    campus: "Main Campus",
  },
  {
    id: 11,
    applicationNo: "APP-2026-0011",
    name: "Ishaan Kumar",
    email: "ishaan.kumar@example.com",
    phone: "+91 76543 21098",
    formStatus: "Under Review",
    paymentStatus: "Paid",
    paymentMode: "Net Banking",
    paymentAmount: 2000,
    lastActivity: "2026-02-08",
    program: "BBA",
    campus: "City Campus",
  },
  {
    id: 12,
    applicationNo: "APP-2026-0012",
    name: "Tanya Bose",
    email: "tanya.bose@example.com",
    phone: "+91 88765 43210",
    formStatus: "Accepted",
    paymentStatus: "Paid",
    paymentMode: "Online",
    paymentAmount: 1500,
    lastActivity: "2026-02-07",
    program: "B.Tech Computer Science",
    campus: "Main Campus",
  },
];

const FORM_STATUSES = ["Incomplete", "In Progress", "Submitted", "Under Review", "Accepted", "Rejected"] as const;
const PAYMENT_STATUSES = ["Pending", "Paid", "Refunded"] as const;
const PROGRAMS = [
  "B.Tech Computer Science",
  "B.Tech Electronics",
  "B.Tech Mechanical",
  "B.Sc Physics",
  "B.Sc Mathematics",
  "BBA",
  "MBA Finance",
  "MBA Marketing",
  "M.Tech AI & ML",
  "M.Tech Data Science",
] as const;
const CAMPUSES = ["Main Campus", "City Campus", "South Campus"] as const;

const formStatusStyles: Record<string, string> = {
  Incomplete: "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400",
  "In Progress": "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300",
  Submitted: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  "Under Review": "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
  Accepted: "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300",
  Rejected: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
};



function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}



export default function ApplicationsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [formStatusDraft, setFormStatusDraft] = React.useState("all");
  const [programDraft, setProgramDraft] = React.useState("all");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedFormStatus, setAppliedFormStatus] = React.useState("all");
  const [appliedProgram, setAppliedProgram] = React.useState("all");

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCampus, setAdvCampus] = React.useState("all");
  const [advPaymentStatus, setAdvPaymentStatus] = React.useState("all");
  const [advPaymentMode, setAdvPaymentMode] = React.useState("");
  const [advDateFrom, setAdvDateFrom] = React.useState("");
  const [advDateTo, setAdvDateTo] = React.useState("");
  const [advApplicationNo, setAdvApplicationNo] = React.useState("");

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    campus: "all",
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
    setAdvPaymentStatus("all");
    setAdvPaymentMode("");
    setAdvDateFrom("");
    setAdvDateTo("");
    setAdvApplicationNo("");
    setAppliedAdvanced({
      campus: "all",
      paymentStatus: "all",
      paymentMode: "",
      dateFrom: "",
      dateTo: "",
      applicationNo: "",
    });
    setCurrentPage(1);
  }

  const filteredApplications = React.useMemo(() => {
    return applications.filter((app) => {
      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        const matchesSearch =
          app.name.toLowerCase().includes(q) ||
          app.email.toLowerCase().includes(q) ||
          app.phone.toLowerCase().includes(q) ||
          app.applicationNo.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (appliedFormStatus !== "all" && app.formStatus !== appliedFormStatus) return false;
      if (appliedProgram !== "all" && app.program !== appliedProgram) return false;
      if (appliedAdvanced.campus !== "all" && app.campus !== appliedAdvanced.campus) return false;
      if (appliedAdvanced.paymentStatus !== "all" && app.paymentStatus !== appliedAdvanced.paymentStatus) return false;
      if (appliedAdvanced.paymentMode && !app.paymentMode.toLowerCase().includes(appliedAdvanced.paymentMode.toLowerCase())) return false;
      if (appliedAdvanced.applicationNo && !app.applicationNo.toLowerCase().includes(appliedAdvanced.applicationNo.toLowerCase())) return false;
      if (appliedAdvanced.dateFrom && app.lastActivity < appliedAdvanced.dateFrom) return false;
      if (appliedAdvanced.dateTo && app.lastActivity > appliedAdvanced.dateTo) return false;
      return true;
    });
  }, [appliedSearch, appliedFormStatus, appliedProgram, appliedAdvanced]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

  const hasAdvancedFilters =
    appliedAdvanced.campus !== "all" ||
    appliedAdvanced.paymentStatus !== "all" ||
    appliedAdvanced.paymentMode !== "" ||
    appliedAdvanced.dateFrom !== "" ||
    appliedAdvanced.dateTo !== "" ||
    appliedAdvanced.applicationNo !== "";

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Applications</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="size-4" />
            Export
          </Button>

        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Search by name, email, phone or application no..."
              className="max-w-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            />
            <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={applyFilters}>
              <Search className="size-4" />
              <span className="sr-only">Search</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={formStatusDraft} onValueChange={setFormStatusDraft}>
              <SelectTrigger className="w-[160px]" size="sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {FORM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={programDraft} onValueChange={setProgramDraft}>
              <SelectTrigger className="w-[200px]" size="sm">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {PROGRAMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="relative size-9 shrink-0"
              onClick={() => setAdvancedOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              <span className="sr-only">Advanced Search</span>
              {hasAdvancedFilters && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Search Dialog */}
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Advanced Search</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="adv-app-no">Application No.</Label>
                <Input
                  id="adv-app-no"
                  placeholder="e.g. APP-2026-0001"
                  value={advApplicationNo}
                  onChange={(e) => setAdvApplicationNo(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Campus</Label>
                  <Select value={advCampus} onValueChange={setAdvCampus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Campuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {CAMPUSES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Payment Status</Label>
                  <Select value={advPaymentStatus} onValueChange={setAdvPaymentStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-payment-mode">Payment Mode</Label>
                <Input
                  id="adv-payment-mode"
                  placeholder="e.g. Online, UPI, Net Banking"
                  value={advPaymentMode}
                  onChange={(e) => setAdvPaymentMode(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="adv-date-from">Activity From</Label>
                  <Input
                    id="adv-date-from"
                    type="date"
                    value={advDateFrom}
                    onChange={(e) => setAdvDateFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adv-date-to">Activity To</Label>
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
              <Button variant="outline" onClick={resetAdvancedFilters}>Reset</Button>
              <Button onClick={applyAdvancedFilters}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="ps-4">App. No.</TableHead>
                <TableHead>Applicant Details</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Form Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No applications found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="ps-4 font-mono text-sm text-muted-foreground uppercase">
                      {app.applicationNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{app.name}</div>
                        <div className="text-[13px] text-muted-foreground mt-0.5 opacity-60">
                          {app.email} <br /> {app.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm leading-tight font-medium">{app.program}</div>
                        <div className="text-[12px] text-muted-foreground/70">{app.campus}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[12px] h-5 px-1.5 ${formStatusStyles[app.formStatus] ?? ""}`}>
                        {app.formStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {app.paymentMode !== "—" ? app.paymentMode : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(app.lastActivity)}
                    </TableCell>
                    <TableCell className="text-right pe-4">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                              size="icon"
                            >
                              <EllipsisVertical />
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
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" className="gap-2">
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
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredApplications.length === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, filteredApplications.length)} of {filteredApplications.length} applications
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
