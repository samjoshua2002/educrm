"use client";

import * as React from "react";
import {
  Search,
  EllipsisVertical,
  Pencil,
  Trash2,
  CalendarDays,
  ExternalLink,
  Users,
  SearchX,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useOrganizations, useDeactivateOrganization, useActivateOrganization, useUpdateOrganizationGeneric } from "@/hooks/use-organizations";
import { Organization } from "@/types/organization";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const orgStatusStyles: Record<string, string> = {
  Active: "bg-[rgba(5,150,105,0.2)] text-[#065f46] hover:bg-[rgba(5,150,105,0.3)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Inactive: "bg-[rgba(217,119,6,0.2)] text-[#bd0f0f] hover:bg-[rgba(217,119,6,0.3)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Expired: "bg-[rgba(217,119,6,0.2)] text-[#bd0f0f] hover:bg-[rgba(217,119,6,0.3)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Pending: "bg-[#fef3c7] text-[#9a3412] hover:bg-[#fde68a] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Suspended: "bg-[rgba(220,38,38,0.15)] text-[#dc2626] hover:bg-[rgba(220,38,38,0.25)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

function OrgStatusBadge({ status, className }: { status: string; className?: string }) {
  const baseStyle = "inline-block text-center whitespace-nowrap";
    
  // Ensure we match regardless of case ("active", "ACTIVE" -> "Active")
  const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "";
  
  const statusStyle =
    orgStatusStyles[normalizedStatus] || orgStatusStyles[status] || "bg-gray-500/10 text-gray-700";
    
  return (
    <span className={cn(baseStyle, statusStyle, className)}>{status}</span>
  );
}

export default function OrganizationsPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(8);
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [actionState, setActionState] = React.useState<{ id: string; type: "activate" | "deactivate" } | null>(null);

  const {
    data: orgsResponse,
    isLoading,
    error,
  } = useOrganizations(page, limit);

  const { mutate: deactivateOrg, isPending: isDeactivating } = useDeactivateOrganization();
  const { mutate: activateOrg, isPending: isActivating } = useActivateOrganization();
  const { mutate: updateOrgGeneric, isPending: isUpdatingOrg } = useUpdateOrganizationGeneric();

  const [extendOrg, setExtendOrg] = React.useState<Organization | null>(null);
  const [extendDate, setExtendDate] = React.useState<string>("");

  const handleQuickExtend = (months: number) => {
    if (!extendDate) return;
    const current = new Date(extendDate);
    current.setMonth(current.getMonth() + months);
    setExtendDate(current.toISOString().split("T")[0]);
  };

  const handleExtendSubscription = () => {
    if (!extendOrg) return;
    updateOrgGeneric(
      {
        id: extendOrg.id,
        data: {
          subscriptionEnd: new Date(extendDate).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setExtendOrg(null);
        },
      }
    );
  };

  const organizations = orgsResponse?.data || [];
  const pagination = orgsResponse?.pagination;

  const filteredOrganizations = React.useMemo(() => {
    return organizations.filter((item) => {
      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        const matchesSearch =
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter)
        return false;
      return true;
    });
  }, [appliedSearch, statusFilter, organizations]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">
          Failed to load organizations
        </p>
        <p className="text-muted-foreground text-sm">
          Please check your connection or contact support.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, slug, email or phone..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAppliedSearch(e.target.value);
                  setPage(1);
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 min-w-0 sm:w-[140px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  Organization
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  Contact
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  Status
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  Subscription Ends
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  Created At
                </TableHead>
                <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && filteredOrganizations.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/80">
                    <TableCell colSpan={6} className="h-16">
                      <div className="animate-pulse flex items-center gap-3 ps-4">
                        <div className="rounded bg-muted size-8 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-2.5 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredOrganizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-6 text-muted-foreground/80" />
                      </div>
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          No results found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Try adjusting your search query or filters.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrganizations.map((org: Organization) => (
                  <TableRow
                    key={org.id}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors h-[86px]"
                  >
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-foreground text-sm tracking-tight flex items-center gap-2">
                          {org.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                          <code>/{org.slug}</code>
                          <ExternalLink className="size-3" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground text-sm tracking-tight">
                          {org.email}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {org.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <OrgStatusBadge status={org.status} />
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle text-sm text-foreground/80 font-normal">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {new Date(org.subscriptionEnd).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle text-sm text-foreground/80 font-normal">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle text-right">
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
                              <Link
                                href={`/superadmin/organizations/create?id=${org.id}`}
                              >
                                <Pencil className="size-4" />
                                Edit Settings
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" asChild>
                              <Link
                                href={`/superadmin/organizations/${org.id}/users`}
                              >
                                <Users className="size-4" />
                                Manage Users
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => {
                                setExtendOrg(org);
                                setExtendDate(org.subscriptionEnd.split("T")[0]);
                              }}
                            >
                              <CalendarDays className="size-4" />
                              Extend Subscription
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {org.status?.toLowerCase() === "active" ? (
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2"
                                onClick={() => setActionState({ id: org.id, type: "deactivate" })}
                              >
                                <Trash2 className="size-4" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="gap-2 text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950 dark:text-green-500 dark:focus:text-green-400"
                                onClick={() => setActionState({ id: org.id, type: "activate" })}
                              >
                                <CheckCircle className="size-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
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
          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
              <p className="text-sm text-muted-foreground font-normal">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {filteredOrganizations.length === 0 ? 0 : (page - 1) * limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(page * limit, pagination.total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {pagination.total}
                </span>{" "}
                entries
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                      const isActive = page === p;
                      return (
                        <Button
                          key={p}
                          variant={isActive ? "default" : "outline"}
                          className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                            isActive
                              ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                              : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
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
                    className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile View - Ultra-Compact List Layout */}
        {filteredOrganizations.length === 0 && !isLoading ? (
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
            {filteredOrganizations.map((org: Organization) => {
              const initials = org.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={org.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Avatar, Name, Slug, Status & Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0 flex flex-col">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {org.name}
                        </span>
                        <div className="text-xs text-muted-foreground font-normal flex items-center gap-1 mt-0.5 truncate">
                          <code>/{org.slug}</code>
                          <ExternalLink className="size-3 shrink-0" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <OrgStatusBadge status={org.status} />

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
                            <Link href={`/superadmin/organizations/create?id=${org.id}`}>
                              <Pencil className="size-4" />
                              Edit Settings
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" asChild>
                            <Link href={`/superadmin/organizations/${org.id}/users`}>
                              <Users className="size-4" />
                              Manage Users
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => {
                              setExtendOrg(org);
                              setExtendDate(org.subscriptionEnd.split("T")[0]);
                            }}
                          >
                            <CalendarDays className="size-4" />
                            Extend Subscription
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {org.status?.toLowerCase() === "active" ? (
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setActionState({ id: org.id, type: "deactivate" })}
                            >
                              <Trash2 className="size-4" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2 text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-950 dark:text-green-500 dark:focus:text-green-400"
                              onClick={() => setActionState({ id: org.id, type: "activate" })}
                            >
                              <CheckCircle className="size-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Grid of key details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Contact Name:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {org.email}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Phone:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {org.phone}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Created At:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Subscription Ends:
                      </span>
                      <span className="text-foreground/95 font-medium truncate flex items-center gap-1">
                        <CalendarDays className="size-3 text-muted-foreground" />
                        {new Date(org.subscriptionEnd).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile Pagination Footer (Simplified) */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px]"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground font-medium">
                  Page {page} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px]"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={actionState !== null}
        onOpenChange={(open) => {
          if (!open) setActionState(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {actionState?.type === "deactivate"
                ? "This action cannot be undone. This will permanently deactivate the Organization record from the system."
                : "This will activate the Organization record, granting them full access to the system again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium border border-border bg-background text-foreground hover:bg-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium text-white disabled:opacity-70 disabled:cursor-not-allowed",
                actionState?.type === "deactivate"
                  ? "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              )}
              disabled={isDeactivating || isActivating}
              onClick={(e) => {
                e.preventDefault();
                if (actionState?.type === "deactivate") {
                  deactivateOrg(actionState.id, {
                    onSuccess: () => setActionState(null),
                  });
                } else if (actionState?.type === "activate") {
                  activateOrg(actionState.id, {
                    onSuccess: () => setActionState(null),
                  });
                }
              }}
            >
              {isDeactivating || isActivating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {actionState?.type === "deactivate" ? "Confirm Deactivate" : "Confirm Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Subscription Dialog */}
      <Dialog
        open={extendOrg !== null}
        onOpenChange={(open) => {
          if (!open) setExtendOrg(null);
        }}
      >
        <DialogContent className="w-[92%] sm:w-full sm:max-w-[450px] rounded-xl p-6 bg-white gap-5 border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f172a]">
              Extend Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Organization Name
              </span>
              <span className="text-sm font-semibold text-foreground">
                {extendOrg?.name}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Expiration
              </span>
              <span className="text-sm font-medium text-foreground">
                {extendOrg ? new Date(extendOrg.subscriptionEnd).toLocaleDateString() : ""}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Subscription End Date
              </Label>
              <Input
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-white"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Extend
              </span>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExtend(1)}
                  className="text-xs h-9 rounded-md border border-border bg-background hover:bg-muted/50"
                >
                  +1 M
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExtend(3)}
                  className="text-xs h-9 rounded-md border border-border bg-background hover:bg-muted/50"
                >
                  +3 M
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExtend(6)}
                  className="text-xs h-9 rounded-md border border-border bg-background hover:bg-muted/50"
                >
                  +6 M
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickExtend(12)}
                  className="text-xs h-9 rounded-md border border-border bg-background hover:bg-muted/50"
                >
                  +1 Y
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExtendOrg(null)}
              className="h-10 px-5 rounded-lg text-sm font-semibold border-border hover:bg-muted/30"
              disabled={isUpdatingOrg}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExtendSubscription}
              className="h-10 px-6 rounded-lg text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={isUpdatingOrg}
            >
              {isUpdatingOrg ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
