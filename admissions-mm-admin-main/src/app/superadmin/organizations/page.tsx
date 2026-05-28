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

export default function OrganizationsPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const { data: orgsResponse, isLoading, error } = useOrganizations(page, limit);

  const organizations = orgsResponse?.data || [];
  const pagination = orgsResponse?.pagination;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">Failed to load organizations</p>
        <p className="text-muted-foreground text-sm">Please check your connection or contact support.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Organizations</h1>
          {isLoading && <Loader2 className="animate-spin size-4 text-muted-foreground" />}
        </div>
        <Link href="/superadmin/organizations/create">
          <Button size="sm">
            <Plus className="size-4" />
            Create
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" size="sm">
                <Filter className="mr-2 size-4 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="ps-4">Organization</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription Ends</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
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
              ) : organizations.length > 0 ? (
                organizations.map((org: Organization) => (
                  <TableRow key={org.id}>
                    <TableCell className="ps-4 font-medium">
                      <div>
                        <div className="font-semibold">{org.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <code>/{org.slug}</code>
                          <ExternalLink className="size-3" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{org.email}</div>
                        <div className="text-xs text-muted-foreground">{org.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border-0 ${statusStyles[org.status as keyof typeof statusStyles] || ""}`}
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {new Date(org.subscriptionEnd).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right pe-4">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 px-0"
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
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No organizations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination bar could be wired here with setPage(page) and pagination.page/totalPages */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-auto">
            <p className="text-sm text-muted-foreground">
              Total {pagination.total} records
            </p>
            <div className="flex items-center gap-2">
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground font-medium px-2">
                Page {page} of {pagination.totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
