"use client";

import * as React from "react";
import { Search, SearchX, Filter, Check, Trash2, EllipsisVertical } from "lucide-react";
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
import { useBranches } from "@/hooks/use-branches";
import { useDeleteLead, useLeads, useUpdateLeadStatus } from "@/hooks/use-leads";
import { toast } from "sonner";

type Lead = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  state: string;
  location: string;
  source: string;
  medium: string;
  campaign: string;
  stage: string;
  status: "unverified" | "verified" | "disqualified";
  assignedTo: string;
};

const statusStyles: Record<Lead["status"], string> = {
  unverified:
    "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  verified:
    "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  disqualified:
    "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

export default function OrganizationLeadManagerPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const { data: branchesResponse } = useBranches(1, 100);
  const branches = branchesResponse?.data || [];
  const branchNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const { data: leadsResponse, isLoading } = useLeads(
    currentPage,
    itemsPerPage,
    searchQuery || undefined,
    undefined,
    "unverified"
  );

  const { mutate: updateStatus } = useUpdateLeadStatus();
  const { mutate: deleteLead } = useDeleteLead();

  const rows: Lead[] = React.useMemo(() => {
    const raw = leadsResponse?.data || [];
    return raw.map((item: any) => ({
      id: item.id,
      name: `${item.firstName || ""} ${item.lastName || ""}`.trim() || "N/A",
      email: item.email || "N/A",
      mobile: item.phone || "N/A",
      state: item.state || "N/A",
      location: branchNameById.get(item.branchId) || "N/A",
      source: item.source || "Direct",
      medium: item.utmMedium || "N/A",
      campaign: item.utmCampaign || "N/A",
      stage: item.isDuplicate ? "Duplicate" : "New",
      status: (item.status || "unverified") as Lead["status"],
      assignedTo: item.assignedTo || "Unassigned",
    }));
  }, [branchNameById, leadsResponse]);

  const filtered = React.useMemo(() => {
    return rows.filter((lead) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.mobile.includes(q);
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 min-w-0 sm:w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10" size="lg">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" className="h-[39px] w-[39px] shrink-0">
              <Filter className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  NAME
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  MOBILE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  LOCATION
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  STAGE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  STATUS
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  ASSIGNED TO
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  SOURCE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-6 text-muted-foreground/80" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No results found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                  >
                    <TableCell className="py-5 px-6">
                      <div className="font-semibold text-foreground text-sm tracking-tight">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.email}</div>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-sm text-foreground/80">{item.mobile}</TableCell>
                    <TableCell className="py-5 px-6 text-sm text-foreground/80">{item.location}</TableCell>
                    <TableCell className="py-5 px-6 text-sm text-foreground/80">{item.stage}</TableCell>
                    <TableCell className="py-5 px-6">
                      <span className={statusStyles[item.status]}>{item.status}</span>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-sm text-foreground/80">{item.assignedTo}</TableCell>
                    <TableCell className="py-5 px-6">
                      <div className="font-medium text-foreground text-sm tracking-tight">{item.source}</div>
                      <div className="text-xs text-muted-foreground">{item.medium} · {item.campaign}</div>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="size-8 rounded-md hover:bg-muted" size="icon">
                            <EllipsisVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            className="gap-2 text-emerald-600 focus:text-emerald-600 cursor-pointer font-medium"
                            onClick={() => updateStatus({ leadId: String(item.id), status: "verified" })}
                          >
                            <Check className="size-4 text-emerald-600" />
                            Verify
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
                            onClick={() =>
                              deleteLead(String(item.id), {
                                onSuccess: () => toast.success("Lead deleted"),
                              })
                            }
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
      </div>
    </>
  );
}
