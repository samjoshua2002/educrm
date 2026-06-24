"use client";

import * as React from "react";

import Link from "next/link";

import { Search, Filter, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { type Application } from "@/data/mock-applications";
import { cn } from "@/lib/utils";

import { DashboardFilterDialog } from "./dashboard-filter-dialog";
import { DashboardPagination } from "./dashboard-pagination";
import {
  formatDate,
  matchesSearch,
  matchesProgram,
  matchesCampus,
  matchesStatus,
  getBadgeStyles,
} from "./dashboard-utils";

interface TableProps {
  readonly applications: Application[];
  readonly isLoading: boolean;
  readonly mounted: boolean;
}

export function RecentApplicationsTable({
  applications,
  isLoading,
  mounted,
}: TableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const [filterProgram, setFilterProgram] = React.useState("");
  const [filterCampus, setFilterCampus] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");

  const [appliedFilters, setAppliedFilters] = React.useState({
    program: "",
    campus: "",
    status: "all",
  });

  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [searchQuery, appliedFilters]);

  const showLoader = !mounted || isLoading;

  const filteredApplications = React.useMemo(() => {
    const q = searchQuery.trim();
    return applications.filter(
      (app) =>
        matchesSearch(app, q) &&
        matchesProgram(app, appliedFilters.program) &&
        matchesCampus(app, appliedFilters.campus) &&
        matchesStatus(app, appliedFilters.status),
    );
  }, [applications, searchQuery, appliedFilters]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage) || 1;

  const paginatedApplications = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredApplications.length,
  );

  const mobileApplications = React.useMemo(() => {
    return filteredApplications.slice(0, mobileVisibleCount);
  }, [filteredApplications, mobileVisibleCount]);

  const uniquePrograms = React.useMemo(
    () =>
      Array.from(new Set(applications.map((a) => a.program)))
        .filter(Boolean)
        .sort(),
    [applications],
  );

  const uniqueCampuses = React.useMemo(
    () =>
      Array.from(new Set(applications.map((a) => a.campus)))
        .filter(Boolean)
        .sort(),
    [applications],
  );

  const handleApplyFilters = () => {
    setAppliedFilters({
      program: filterProgram,
      campus: filterCampus,
      status: filterStatus,
    });
    setAdvancedOpen(false);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterProgram("");
    setFilterCampus("");
    setFilterStatus("all");
    setAppliedFilters({ program: "", campus: "", status: "all" });
    setAdvancedOpen(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    appliedFilters.program !== "" ||
    appliedFilters.campus !== "" ||
    appliedFilters.status !== "all";

  const TABLE_HEADS = [
    "STUDENT NAME",
    "APPLICATION ID",
    "STREAM",
    "STATUS",
    "DATE APPLIED",
    "ACTION",
  ];

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-sm flex flex-col overflow-hidden">
      <div className="border-b border-[#e2e8f0]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 px-6">
          <h3 className="text-[18px] font-bold text-[#1E293B]">
            Recent Applications
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Input
                placeholder="Search applications..."
                className="w-full pl-9 h-10 border border-[#e2e8f0] rounded-[8px]"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10 shrink-0 border border-[#e2e8f0] rounded-[8px]"
              onClick={() => setAdvancedOpen(true)}
            >
              <Filter className="size-4 text-[#475569]" />
              <span className="sr-only">Filters</span>
              {hasActiveFilters && (
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#2563EB] border border-white" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <TableRow>
              {TABLE_HEADS.map((h, i) => (
                <TableHead
                  key={h}
                  className={cn(
                    "py-4 px-6 text-[12px] font-semibold tracking-wider text-[#64748B] uppercase h-auto",
                    i === 5 && "text-right w-[140px]",
                  )}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoader ? (
              [...Array(5)].map((_, idx) => (
                <TableRow key={idx}>
                  {[...Array(6)].map((_, col) => (
                    <TableCell key={col} className="py-5 px-6">
                      <div className="h-5 w-24 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        No applications found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your filters or search query.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedApplications.map((app) => {
                let mappedStatus = "Pending";
                if (app.formStatus === "Accepted") mappedStatus = "Verified";
                else if (app.formStatus === "Rejected")
                  mappedStatus = "Rejected";
                const badgeStyles = getBadgeStyles(mappedStatus);

                return (
                  <TableRow
                    key={app.id}
                    className="border-b border-[#e2e8f0]/80 hover:bg-slate-50 transition-colors duration-150"
                  >
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-[#1E293B] text-sm tracking-tight">
                          {app.name}
                        </span>
                        <span className="text-xs text-[#64748B] font-normal">
                          {app.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle font-mono text-sm text-[#475569]">
                      #{app.applicationNo}
                    </TableCell>
                    <TableCell
                      className="py-5 px-6 align-middle text-sm text-[#475569] font-normal max-w-[200px] truncate"
                      title={app.program}
                    >
                      {app.program}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <Badge
                        className={cn(
                          "border-0 font-medium px-2.5 py-0.5 rounded-full text-xs shadow-none",
                          badgeStyles,
                        )}
                      >
                        {mappedStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-[#475569]">
                      {formatDate(app.lastActivity)}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-right">
                      <Link href={`/applications/${app.applicationNo}`}>
                        <span className="text-[#2563EB] hover:text-[#1d4ed8] text-sm font-semibold cursor-pointer hover:underline">
                          View Details
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!showLoader && filteredApplications.length > 0 && (
        <div className="hidden lg:block">
          <DashboardPagination
            startIndex={startIndex}
            endIndex={endIndex}
            totalCount={filteredApplications.length}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}

      {/* Mobile View - Card Layout */}
      <div className="flex flex-col gap-3 p-4 lg:hidden w-full bg-slate-50/50">
        {showLoader ? (
          [...Array(5)].map((_, idx) => (
            <div key={idx} className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">
                No applications found
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
            </div>
          </div>
        ) : (
          mobileApplications.map((app) => {
            let mappedStatus = "Pending";
            if (app.formStatus === "Accepted") mappedStatus = "Verified";
            else if (app.formStatus === "Rejected") mappedStatus = "Rejected";
            const badgeStyles = getBadgeStyles(mappedStatus);

            // Generate initials for avatar
            const initials = app.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={app.id}
                className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex flex-col gap-4 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-semibold text-sm shrink-0 border border-blue-100">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-[#1E293B] text-sm tracking-tight truncate block">
                        {app.name}
                      </span>
                      <span className="text-xs text-[#64748B] truncate block mt-0.5">
                        {app.email}
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      "border-0 font-medium px-2.5 py-0.5 rounded-full text-[10px] shadow-none shrink-0",
                      badgeStyles,
                    )}
                  >
                    {mappedStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-[#e2e8f0]/60 pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#64748B]">App ID:</span>
                    <span className="text-[#475569] font-mono">
                      #{app.applicationNo}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#64748B]">Date Applied:</span>
                    <span className="text-[#475569]">
                      {formatDate(app.lastActivity)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="font-medium text-[#64748B]">Stream:</span>
                    <span className="text-[#475569] truncate" title={app.program}>
                      {app.program}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#e2e8f0]/60 pt-3 flex justify-end">
                  <Link href={`/applications/${app.applicationNo}`}>
                    <span className="text-[#2563EB] hover:text-[#1d4ed8] text-sm font-semibold cursor-pointer">
                      View Details
                    </span>
                  </Link>
                </div>
              </div>
            );
          })
        )}

        {!showLoader && mobileVisibleCount < filteredApplications.length && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              className="w-full h-10 border border-[#e2e8f0] bg-white text-[#1E293B] font-medium rounded-[8px] hover:bg-slate-50 shadow-sm transition-colors"
            >
              Load More Applications
            </Button>
          </div>
        )}
      </div>

      <DashboardFilterDialog
        isOpen={advancedOpen}
        onOpenChange={setAdvancedOpen}
        uniquePrograms={uniquePrograms}
        uniqueCampuses={uniqueCampuses}
        filterProgram={filterProgram}
        setFilterProgram={setFilterProgram}
        filterCampus={filterCampus}
        setFilterCampus={setFilterCampus}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </div>
  );
}
