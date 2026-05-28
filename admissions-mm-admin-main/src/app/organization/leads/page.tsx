"use client";

import * as React from "react";

import Link from "next/link";

import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Filter,
  Check,
  SearchX,
  Loader2,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useLeads, useDeleteLead, useUpdateLeadStatus } from "@/hooks/use-leads";
import { useBranches } from "@/hooks/use-branches";
import { toast } from "sonner";

type Lead = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  state: string;
  city: string;
  source: string;
  medium: string;
  campaign: string;
  stage: string;
  status: string;
  assignedTo: string;
};

const STAGES = [
  "New",
  "Contacted",
  "Interested",
  "Qualified",
  "Converted",
  "Lost",
] as const;
const STATUSES = ["Hot", "Warm", "Cold"] as const;

const SOURCES = [
  "Google Ads",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Website",
  "Referral",
  "Other",
] as const;
const MEDIUMS = [
  "CPC",
  "Social",
  "Organic",
  "Word of Mouth",
  "Email",
  "Other",
] as const;
const CAMPAIGNS = [
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Winter 2025",
  "Spring 2026",
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
] as const;

const stageStyles: Record<string, string> = {
  New: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Contacted:
    "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Interested:
    "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Qualified:
    "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Converted:
    "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Lost: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Duplicate: "bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

const statusStyles: Record<string, string> = {
  Hot: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Warm: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Cold: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  unverified: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  verified: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  disqualified: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

export default function LeadsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageDraft, setStageDraft] = React.useState("all");
  const [statusDraft, setStatusDraft] = React.useState("all");

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCity, setAdvCity] = React.useState("");
  const [advState, setAdvState] = React.useState("");
  const [advSource, setAdvSource] = React.useState("");
  const [advAssignedTo, setAdvAssignedTo] = React.useState("");
  const [advStatus, setAdvStatus] = React.useState("all");

  const [editingLeadId, setEditingLeadId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<any | null>(null);
  const [deleteLeadId, setDeleteLeadId] = React.useState<string | null>(null);

  // Hook API Calls
  const { data: leadsResponse, isLoading, error } = useLeads(
    currentPage,
    itemsPerPage,
    searchQuery || undefined,
    undefined,
    "verified"
  );

  const { mutate: updateStatus } = useUpdateLeadStatus();
  const { mutate: deleteLead } = useDeleteLead();
  const { data: branchesResponse } = useBranches(1, 100);
  const branches = branchesResponse?.data || [];
  const branchNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const leadsState = React.useMemo(() => {
    const raw = leadsResponse?.data || [];
    return raw.map((item: any) => ({
      id: item.id,
      name: `${item.firstName || ""} ${item.lastName || ""}`.trim() || "N/A",
      email: item.email || "N/A",
      mobile: item.phone || "N/A",
      state: item.state || "N/A",
      city: branchNameById.get(item.branchId) || "N/A",
      source: item.source || "Direct",
      medium: item.utmMedium || "N/A",
      campaign: item.utmCampaign || "N/A",
      stage: item.isDuplicate ? "Duplicate" : "New",
      status: item.status || "verified",
      assignedTo: item.assignedTo || "Unassigned",
      rawLead: item
    }));
  }, [branchNameById, leadsResponse]);

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    city: "",
    state: "",
    source: "",
    assignedTo: "",
    status: "all",
  });

  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [searchQuery, stageDraft, statusDraft, appliedAdvanced]);

  function handleStartEdit(lead: any) {
    setEditingLeadId(lead.id);
    setEditForm({ ...lead, notes: lead.notes || "" });
  }

  function handleSaveEdit() {
    setEditingLeadId(null);
    setEditForm(null);
  }

  function setEditField(key: string, value: any) {
    if (!editForm) return;
    setEditForm((prev: any) => (prev ? { ...prev, [key]: value } : null));
  }

  function handleDeleteLead(id: string) {
    deleteLead(id, {
      onSuccess: () => {
        setDeleteLeadId(null);
      }
    });
  }

  function applyFilters() {
    setCurrentPage(1);
  }

  function applyAdvancedFilters() {
    setAppliedAdvanced({
      city: advCity,
      state: advState,
      source: advSource,
      assignedTo: advAssignedTo,
      status: advStatus,
    });
    setAdvancedOpen(false);
    setCurrentPage(1);
  }

  function resetAdvancedFilters() {
    setAdvCity("");
    setAdvState("");
    setAdvSource("");
    setAdvAssignedTo("");
    setAdvStatus("all");
    setAppliedAdvanced({
      city: "",
      state: "",
      source: "",
      assignedTo: "",
      status: "all",
    });
    setCurrentPage(1);
  }

  const filteredLeads = leadsState;
  const paginatedLeads = leadsState;

  const totalPages = leadsResponse?.pagination?.totalPages || 1;
  const totalCount = leadsResponse?.pagination?.total || 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + paginatedLeads.length;

  const mobileLeads = React.useMemo(() => {
    return filteredLeads.slice(0, mobileVisibleCount);
  }, [filteredLeads, mobileVisibleCount]);

  const hasAdvancedFilters =
    appliedAdvanced.city !== "" ||
    appliedAdvanced.state !== "" ||
    appliedAdvanced.source !== "" ||
    appliedAdvanced.assignedTo !== "" ||
    appliedAdvanced.status !== "all";

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

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, email or phone..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
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
              {/* Stage Select Container */}
              <div className="flex-1 min-w-0 sm:w-[140px]">
                <Select
                  value={stageDraft}
                  onValueChange={(val) => {
                    setStageDraft(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>

                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Select Container */}
              <div className="flex-1 min-w-0 sm:w-[130px]">
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

                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
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

            {/* Add Lead Button */}
            <Link
              href="/lead-manager/create"
              className="w-full sm:w-auto shrink-0"
            >
              <Button
                variant="outline"
                className="w-full border border-border h-[39px] text-sm font-medium text-foreground  hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="size-4" />
                Add Lead
              </Button>
            </Link>
          </div>
        </div>

        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="sm:max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle>Advanced Filters</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="adv-city">City</Label>
                <Input
                  id="adv-city"
                  placeholder="Filter by city"
                  value={advCity}
                  onChange={(e) => setAdvCity(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-state">State</Label>
                <Input
                  id="adv-state"
                  placeholder="Filter by state"
                  value={advState}
                  onChange={(e) => setAdvState(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-source">Source</Label>
                <Input
                  id="adv-source"
                  placeholder="Filter by source"
                  value={advSource}
                  onChange={(e) => setAdvSource(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-assigned">Assigned To</Label>
                <Input
                  id="adv-assigned"
                  placeholder="Filter by counselor"
                  value={advAssignedTo}
                  onChange={(e) => setAdvAssignedTo(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Lead Status</Label>
                <Select value={advStatus} onValueChange={setAdvStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  NAME
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  MOBILE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  CITY
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  STAGE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  STATUS
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  ASSIGNED TO
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  SOURCE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading leads...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
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
                paginatedLeads.map((item) => (
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
                          {item.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {item.mobile}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {item.city}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <span className={stageStyles[item.stage] ?? ""}>
                        {item.stage}
                      </span>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <span className={statusStyles[item.status] ?? ""}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {item.assignedTo}
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground text-sm tracking-tight">
                          {item.source}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {item.medium} · {item.campaign}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-right">
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
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem className="gap-2" asChild>
                              <Link href={`/lead-manager/edit?id=${item.id}`}>
                                <Pencil className="size-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer font-medium"
                              onClick={() => updateStatus({ leadId: String(item.id), status: "disqualified" })}
                            >
                              <Trash2 className="size-4 text-rose-600" />
                              Disqualify
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2 cursor-pointer"
                              onClick={() => setDeleteLeadId(item.id)}
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
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalCount}
              </span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Previous button */}
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {visiblePages.map((page) => {
                    const isActive = currentPage === page;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                          isActive
                            ? "bg-background border-border text-foreground font-semibold hover:bg-muted/15 dark:hover:bg-muted/5 shadow-xs"
                            : "border-border/80 bg-transparent text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                {/* Next button */}
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
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

        {/* Mobile View - Ultra-Compact List Layout displaying all requested details */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
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
            {mobileLeads.map((item) => {
              // Generate initials for avatar
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
                    {/* Avatar & Text block */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Initials Avatar */}
                      <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
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

                    {/* Badge & Action */}
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <span className={stageStyles[item.stage] ?? ""}>
                        {item.stage}
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

                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem className="gap-2" asChild>
                            <Link href={`/lead-manager/edit?id=${item.id}`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer font-medium"
                            onClick={() => updateStatus({ leadId: String(item.id), status: "disqualified" })}
                          >
                            <Trash2 className="size-4 text-rose-600" />
                            Disqualify
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2 cursor-pointer"
                            onClick={() => setDeleteLeadId(item.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Two-column grid of key details (two 2: 2) */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Mobile:
                      </span>
                      <span className="text-foreground/95 font-medium">
                        {item.mobile}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Location:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.city}, {item.state}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Status & Counselor:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={statusStyles[item.status] ?? ""}>
                          {item.status}
                        </span>
                        <span className="text-foreground/95 font-medium">
                          · {item.assignedTo}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Source:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.source} · {item.medium}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile & Tablet Load More Footer */}
        {mobileVisibleCount < filteredLeads.length ? (
          <div className="flex flex-col items-center gap-3 py-4 mt-2 lg:hidden">
            <Button
              variant="outline"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              className="w-full h-10 border border-border bg-background text-foreground font-medium rounded-[8px] hover:bg-accent hover:text-accent-foreground shadow-2xs transition-colors"
            >
              Load More Leads
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredLeads.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredLeads.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : (
          <div className="text-center py-4 mt-2 lg:hidden border-t border-border/40">
            <p className="text-xs text-muted-foreground font-normal">
              Showing all{" "}
              <span className="font-medium text-foreground">
                {filteredLeads.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredLeads.length}
              </span>{" "}
              entries
            </p>
          </div>
        )}
      </div>

      {/* Shadcn Alert Dialog for Lead Deletion Warning Confirmation */}
      <AlertDialog
        open={deleteLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteLeadId(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently delete the
              lead from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium border border-border bg-background text-foreground hover:bg-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => {
                if (deleteLeadId !== null) {
                  handleDeleteLead(deleteLeadId);
                  setDeleteLeadId(null);
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
