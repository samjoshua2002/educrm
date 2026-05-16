"use client";

import * as React from "react";
import { EllipsisVertical, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
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

type Lead = {
  id: number;
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

const leads: Lead[] = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    mobile: "+1 234 567 890",
    state: "California",
    city: "Los Angeles",
    source: "Google Ads",
    medium: "CPC",
    campaign: "Spring 2025",
    stage: "New",
    status: "Hot",
    assignedTo: "Alice Brown",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@example.com",
    mobile: "+1 234 567 891",
    state: "Texas",
    city: "Houston",
    source: "Facebook",
    medium: "Social",
    campaign: "Summer 2025",
    stage: "Contacted",
    status: "Warm",
    assignedTo: "Bob Wilson",
  },
  {
    id: 3,
    name: "Robert Johnson",
    email: "robert.j@example.com",
    mobile: "+1 234 567 892",
    state: "New York",
    city: "New York City",
    source: "Website",
    medium: "Organic",
    campaign: "Fall 2025",
    stage: "Interested",
    status: "Cold",
    assignedTo: "Alice Brown",
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@example.com",
    mobile: "+1 234 567 893",
    state: "Florida",
    city: "Miami",
    source: "Instagram",
    medium: "Social",
    campaign: "Spring 2025",
    stage: "Qualified",
    status: "Hot",
    assignedTo: "Bob Wilson",
  },
  {
    id: 5,
    name: "Michael Chen",
    email: "michael.chen@example.com",
    mobile: "+1 234 567 894",
    state: "Illinois",
    city: "Chicago",
    source: "Referral",
    medium: "Word of Mouth",
    campaign: "Summer 2025",
    stage: "New",
    status: "Warm",
    assignedTo: "Alice Brown",
  },
  {
    id: 6,
    name: "Sarah Williams",
    email: "sarah.w@example.com",
    mobile: "+1 234 567 895",
    state: "Washington",
    city: "Seattle",
    source: "Google Ads",
    medium: "CPC",
    campaign: "Fall 2025",
    stage: "Converted",
    status: "Hot",
    assignedTo: "Carol Martinez",
  },
  {
    id: 7,
    name: "David Kumar",
    email: "david.kumar@example.com",
    mobile: "+1 234 567 896",
    state: "Massachusetts",
    city: "Boston",
    source: "LinkedIn",
    medium: "Social",
    campaign: "Spring 2025",
    stage: "Contacted",
    status: "Cold",
    assignedTo: "Carol Martinez",
  },
  {
    id: 8,
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    mobile: "+1 234 567 897",
    state: "Georgia",
    city: "Atlanta",
    source: "Website",
    medium: "Organic",
    campaign: "Summer 2025",
    stage: "Interested",
    status: "Warm",
    assignedTo: "Bob Wilson",
  },
  {
    id: 9,
    name: "James Taylor",
    email: "james.t@example.com",
    mobile: "+1 234 567 898",
    state: "Colorado",
    city: "Denver",
    source: "Facebook",
    medium: "Social",
    campaign: "Fall 2025",
    stage: "Lost",
    status: "Cold",
    assignedTo: "Alice Brown",
  },
  {
    id: 10,
    name: "Anita Patel",
    email: "anita.patel@example.com",
    mobile: "+1 234 567 899",
    state: "Arizona",
    city: "Phoenix",
    source: "Google Ads",
    medium: "CPC",
    campaign: "Spring 2025",
    stage: "New",
    status: "Hot",
    assignedTo: "Carol Martinez",
  },
];

const STAGES = ["New", "Contacted", "Interested", "Qualified", "Converted", "Lost"] as const;
const STATUSES = ["Hot", "Warm", "Cold"] as const;

const stageStyles: Record<string, string> = {
  New: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  Contacted: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300",
  Interested: "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
  Qualified: "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
  Converted: "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300",
  Lost: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
};

const statusStyles: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Warm: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Cold: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
};

export default function LeadManagerPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageDraft, setStageDraft] = React.useState("all");
  const [statusDraft, setStatusDraft] = React.useState("all");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedStage, setAppliedStage] = React.useState("all");
  const [appliedStatus, setAppliedStatus] = React.useState("all");

  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCity, setAdvCity] = React.useState("");
  const [advState, setAdvState] = React.useState("");
  const [advSource, setAdvSource] = React.useState("");
  const [advAssignedTo, setAdvAssignedTo] = React.useState("");
  const [advStatus, setAdvStatus] = React.useState("all");

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    city: "",
    state: "",
    source: "",
    assignedTo: "",
    status: "all",
  });

  function applyFilters() {
    setAppliedSearch(searchQuery);
    setAppliedStage(stageDraft);
    setAppliedStatus(statusDraft);
    setCurrentPage(1);
  }

  function applyAdvancedFilters() {
    setAppliedAdvanced({ city: advCity, state: advState, source: advSource, assignedTo: advAssignedTo, status: advStatus });
    setAdvancedOpen(false);
    setCurrentPage(1);
  }

  function resetAdvancedFilters() {
    setAdvCity("");
    setAdvState("");
    setAdvSource("");
    setAdvAssignedTo("");
    setAdvStatus("all");
    setAppliedAdvanced({ city: "", state: "", source: "", assignedTo: "", status: "all" });
    setCurrentPage(1);
  }

  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        const matchesSearch =
          lead.name.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.mobile.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (appliedStage !== "all" && lead.stage !== appliedStage) return false;
      if (appliedStatus !== "all" && lead.status !== appliedStatus) return false;
      if (appliedAdvanced.city && !lead.city.toLowerCase().includes(appliedAdvanced.city.toLowerCase())) return false;
      if (appliedAdvanced.state && !lead.state.toLowerCase().includes(appliedAdvanced.state.toLowerCase())) return false;
      if (appliedAdvanced.source && !lead.source.toLowerCase().includes(appliedAdvanced.source.toLowerCase())) return false;
      if (appliedAdvanced.assignedTo && !lead.assignedTo.toLowerCase().includes(appliedAdvanced.assignedTo.toLowerCase())) return false;
      if (appliedAdvanced.status !== "all" && lead.status !== appliedAdvanced.status) return false;
      return true;
    });
  }, [appliedSearch, appliedStage, appliedStatus, appliedAdvanced]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const hasAdvancedFilters = appliedAdvanced.city !== "" || appliedAdvanced.state !== "" || appliedAdvanced.source !== "" || appliedAdvanced.assignedTo !== "" || appliedAdvanced.status !== "all";

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Lead Manager</h1>
        <Link href="/lead-manager/create">
          <Button>
            <Plus className="size-4" />
            Add Lead
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-6">

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="Search by name, email or phone..."
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
            <Select value={stageDraft} onValueChange={setStageDraft}>
              <SelectTrigger className="w-[150px]" size="sm">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusDraft} onValueChange={setStatusDraft}>
              <SelectTrigger className="w-[140px]" size="sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="relative size-9 shrink-0" onClick={() => setAdvancedOpen(true)}>
              <SlidersHorizontal className="size-4" />
              <span className="sr-only">Advanced Filters</span>
              {hasAdvancedFilters && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>

        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Advanced Filters</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="adv-city">City</Label>
                <Input id="adv-city" placeholder="Filter by city" value={advCity} onChange={(e) => setAdvCity(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-state">State</Label>
                <Input id="adv-state" placeholder="Filter by state" value={advState} onChange={(e) => setAdvState(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-source">Source</Label>
                <Input id="adv-source" placeholder="Filter by source" value={advSource} onChange={(e) => setAdvSource(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adv-assigned">Assigned To</Label>
                <Input id="adv-assigned" placeholder="Filter by counsellor" value={advAssignedTo} onChange={(e) => setAdvAssignedTo(e.target.value)} />
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
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <TableHead className="ps-4">Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="ps-4">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{item.mobile}</TableCell>
                  <TableCell>
                    <div>
                      <div>{item.city}</div>
                      <div className="text-xs text-muted-foreground">{item.state}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={stageStyles[item.stage] ?? ""}>
                      {item.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`border-0 ${statusStyles[item.status] ?? ""}`}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{item.source}</div>
                      <div className="text-xs text-muted-foreground">{item.medium} · {item.campaign}</div>
                    </div>
                  </TableCell>
                  <TableCell>{item.assignedTo}</TableCell>
                  <TableCell className="text-right pe-4">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
                            <EllipsisVertical />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem className="gap-2" asChild>
                            <Link href={`/lead/${item.id}`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
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
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}–{Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} leads
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
