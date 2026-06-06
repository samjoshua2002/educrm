"use client";

import * as React from "react";
import { Plus, Search, Filter, EllipsisVertical, Pencil, Trash2, CalendarDays, ExternalLink, Loader2, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { useOrganizations } from "@/hooks/use-organizations";
import { Organization } from "@/types/organization";

const statusStyles = {
  Active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrganizationsPage() {
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  const { data: orgsResponse, isLoading, error } = useOrganizations(page, limit);

  const organizations = orgsResponse?.data || [];
  const pagination = orgsResponse?.pagination;

  const filteredOrganizations = React.useMemo(() => {
    return organizations.filter((org) => {
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matches =
          org.name.toLowerCase().includes(query) ||
          org.email.toLowerCase().includes(query) ||
          org.phone?.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (statusFilter !== "all" && org.status !== statusFilter) return false;
      return true;
    });
  }, [organizations, searchQuery, statusFilter]);

  const mobileOrganizations = React.useMemo(
    () => filteredOrganizations.slice(0, mobileVisibleCount),
    [filteredOrganizations, mobileVisibleCount],
  );

  React.useEffect(() => {
    setMobileVisibleCount(5);
  }, [searchQuery, statusFilter, organizations]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">Failed to load organizations</p>
        <p className="text-muted-foreground text-sm">Please check your connection or contact support.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 w-full">
          <div className="relative w-full">
            <Input
              placeholder="Search by name, email, phone or slug..."
              className="w-full pr-10 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 min-w-0 sm:w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          <Link href="/superadmin/organizations/create" className="w-full sm:w-auto">
            <Button className="h-[39px] w-full sm:w-auto">
              <Plus className="size-4 mr-2" />
              Create
            </Button>
          </Link>
        </div>
      </div>

      <div className="hidden lg:block overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                ORGANIZATION
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                CONTACT
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                STATUS
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                SUBSCRIPTION ENDS
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                CREATED AT
              </TableHead>
              <TableHead className="py-4 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px]">
                ACTION
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && organizations.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
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
            ) : filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((org: Organization) => (
                <TableRow
                  key={org.id}
                  className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                >
                  <TableCell className="py-5 px-6 align-middle">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-semibold text-foreground text-sm tracking-tight">{org.name}</div>
                      <div className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                        <code>/{org.slug}</code>
                        <ExternalLink className="size-3" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                    <div>{org.email}</div>
                    <div className="text-xs text-muted-foreground">{org.phone}</div>
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle">
                    <Badge
                      variant="secondary"
                      className={`border-0 ${statusStyles[org.status as keyof typeof statusStyles] || ""}`}
                    >
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground font-normal">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      {formatDate(org.subscriptionEnd)}
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 align-middle text-sm text-muted-foreground font-normal">
                    {formatDate(org.createdAt)}
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
                          <DropdownMenuItem className="gap-2">
                            <CalendarDays className="size-4" />
                            Extend Subscription
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" className="gap-2">
                            <Trash2 className="size-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <Search className="size-6 text-muted-foreground/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <p className="text-sm font-semibold text-foreground">No organizations found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your search or status filter.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing <span className="font-medium text-foreground">{filteredOrganizations.length === 0 ? 0 : 1}</span> to <span className="font-medium text-foreground">{Math.min(filteredOrganizations.length, limit)}</span> of <span className="font-medium text-foreground">{filteredOrganizations.length}</span> entries
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground font-medium px-2">
                Page {page} of {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3.5 lg:hidden w-full">
        {filteredOrganizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <Search className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">No organizations found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or status filter.</p>
            </div>
          </div>
        ) : (
          mobileOrganizations.map((org) => {
            const initials = org.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={org.id}
                className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm tracking-tight truncate">{org.name}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">/{org.slug}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <Badge
                      variant="secondary"
                      className={`border-0 ${statusStyles[org.status as keyof typeof statusStyles] || ""}`}
                    >
                      {org.status}
                    </Badge>

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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" className="gap-2">
                          <Trash2 className="size-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground/80 block">Email</span>
                    <span className="text-foreground/95 font-medium truncate">{org.email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground/80 block">Phone</span>
                    <span className="text-foreground/95 font-medium truncate">{org.phone}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground/80 block">Subscription</span>
                    <span className="text-foreground/95 font-medium truncate">{formatDate(org.subscriptionEnd)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground/80 block">Created</span>
                    <span className="text-foreground/95 font-medium truncate">{formatDate(org.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
