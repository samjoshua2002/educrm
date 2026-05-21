/* eslint-disable max-lines */
"use client";

import * as React from "react";

import Link from "next/link";

import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  selectionStatus: "Confirmed" | "Not Selected" | "Pending";
  confirmedCampus: string;
};

const gdInterviews: GDInterview[] = [
  {
    id: 1,
    applicationNo: "CHN-2026-1101",
    name: "Aarav Mehta",
    email: "aarav.mehta@example.com",
    phone: "+91 98765 43210",
    interviewLocation: "Chennai",
    date: "2026-03-15",
    time: "10:00 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Confirmed",
    confirmedCampus: "PGDM Chennai",
  },
  {
    id: 2,
    applicationNo: "CHN-2026-1102",
    name: "Sneha Iyer",
    email: "sneha.iyer@example.com",
    phone: "+91 91234 56780",
    interviewLocation: "Bangalore",
    date: "2026-03-16",
    time: "11:30 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Pending",
    confirmedCampus: "—",
  },
  {
    id: 3,
    applicationNo: "CHN-2026-1103",
    name: "Rohan Desai",
    email: "rohan.desai@example.com",
    phone: "+91 99876 54321",
    interviewLocation: "Kochi",
    date: "2026-03-17",
    time: "02:00 PM",
    course: "PGDM 2026-28",
    selectionStatus: "Not Selected",
    confirmedCampus: "—",
  },
  {
    id: 4,
    applicationNo: "CHN-2026-1104",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+91 87654 32109",
    interviewLocation: "Chennai",
    date: "2026-03-15",
    time: "11:00 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Confirmed",
    confirmedCampus: "PGDM Kochi",
  },
  {
    id: 5,
    applicationNo: "CHN-2026-1105",
    name: "Karan Singh",
    email: "karan.singh@example.com",
    phone: "+91 90123 45678",
    interviewLocation: "Hyderabad",
    date: "2026-03-18",
    time: "09:30 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Pending",
    confirmedCampus: "—",
  },
  {
    id: 6,
    applicationNo: "APP-2026-0005",
    name: "Karan Singh",
    email: "karan.singh@example.com",
    phone: "+91 90123 45678",
    interviewLocation: "Hyderabad",
    date: "2026-03-18",
    time: "09:30 AM",
    course: "PGDM 2026-28",
    selectionStatus: "Pending",
    confirmedCampus: "—",
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

const selectionStatusStyles: Record<string, string> = {
  Pending:
    "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300",
  Confirmed:
    "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300",
  "Not Selected":
    "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GDInterviewPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState("all");
  const [locationDraft, setLocationDraft] = React.useState("all");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedStatus, setAppliedStatus] = React.useState("all");
  const [appliedLocation, setAppliedLocation] = React.useState("all");

  function applyFilters() {
    setAppliedSearch(searchQuery);
    setAppliedStatus(statusDraft);
    setAppliedLocation(locationDraft);
    setCurrentPage(1);
  }

  const filteredInterviews = React.useMemo(() => {
    return gdInterviews.filter((item) => {
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
      if (
        appliedLocation !== "all" &&
        item.interviewLocation !== appliedLocation
      )
        return false;
      return true;
    });
  }, [appliedSearch, appliedStatus, appliedLocation]);

  const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInterviews = filteredInterviews.slice(startIndex, endIndex);

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">GD & Interview</h1>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={applyFilters}
            >
              <Search className="size-4" />
              <span className="sr-only">Search</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusDraft} onValueChange={setStatusDraft}>
              <SelectTrigger className="w-[160px]" size="sm">
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
            <Select value={locationDraft} onValueChange={setLocationDraft}>
              <SelectTrigger className="w-[160px]" size="sm">
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
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="ps-4">App. No.</TableHead>
                <TableHead>Applicant Details</TableHead>
                <TableHead>Interview Location</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Selection</TableHead>
                <TableHead className="text-right pe-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInterviews.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No GD & Interviews found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInterviews.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="ps-4 font-mono text-sm text-muted-foreground uppercase">
                      {item.applicationNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-[13px] text-muted-foreground mt-0.5 opacity-60">
                          {item.email} <br /> {item.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">
                        {item.interviewLocation}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium">
                          {formatDate(item.date)}
                        </div>
                        <div className="text-[12px] text-muted-foreground/70">
                          {item.time}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.course}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        {item.selectionStatus === "Confirmed" ? (
                          <Badge
                            variant="outline"
                            className="text-[12px] h-5 px-1.5 border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
                          >
                            {item.confirmedCampus}
                          </Badge>
                        ) : item.selectionStatus === "Not Selected" ? (
                          <Badge
                            variant="outline"
                            className="text-[12px] h-5 px-1.5 border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                          >
                            Not Selected
                          </Badge>
                        ) : (
                          // Show nothing for Pending
                          <span className="text-muted-foreground w-4 border-b border-dashed border-muted-foreground inline-block"></span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pe-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="data-[state=open]:bg-muted text-muted-foreground flex size-8 ms-auto"
                            size="icon"
                          >
                            <EllipsisVertical />
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
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredInterviews.length === 0 ? 0 : startIndex + 1}–
            {Math.min(endIndex, filteredInterviews.length)} of{" "}
            {filteredInterviews.length} entries
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ),
              )}
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
