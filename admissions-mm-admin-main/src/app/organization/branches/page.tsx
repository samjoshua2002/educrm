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
  Filter,
  SearchX,
  MapPin,
  Building2,
  Calendar,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBranches, useDeleteBranch, Branch } from "@/hooks/use-branches";

const statusStyles: Record<string, string> = {
  Active:
    "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Inactive:
    "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

export default function BranchesPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState("all");

  // Advanced Filters
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCity, setAdvCity] = React.useState("");
  const [advState, setAdvState] = React.useState("");
  const [advStatus, setAdvStatus] = React.useState("all");

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    city: "",
    state: "",
    status: "all",
  });

  // Mobile load more
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  const [deleteBranchId, setDeleteBranchId] = React.useState<string | null>(
    null,
  );

  const { data: branchesResponse, isLoading, error } = useBranches(1, 50); // fetch 50 per request
  const deleteBranch = useDeleteBranch();

  const allBranches = branchesResponse?.data || [];

  function applyAdvancedFilters() {
    setAppliedAdvanced({
      city: advCity,
      state: advState,
      status: advStatus,
    });
    setAdvancedOpen(false);
    setCurrentPage(1);
  }

  function resetAdvancedFilters() {
    setAdvCity("");
    setAdvState("");
    setAdvStatus("all");
    setAppliedAdvanced({
      city: "",
      state: "",
      status: "all",
    });
    setCurrentPage(1);
  }

  function handleDeleteConfirm() {
    if (deleteBranchId) {
      deleteBranch.mutate(deleteBranchId);
      setDeleteBranchId(null);
    }
  }

  const filteredBranches = React.useMemo(() => {
    return allBranches.filter((branch: Branch) => {
      // 1. Search filter
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (
          !branch.name.toLowerCase().includes(q) &&
          !branch.code.toLowerCase().includes(q) &&
          !branch.city.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // 2. Quick filters
      if (statusDraft !== "all" && branch.status !== statusDraft) return false;

      // 3. Advanced filters
      if (
        appliedAdvanced.city &&
        !branch.city.toLowerCase().includes(appliedAdvanced.city.toLowerCase())
      )
        return false;
      if (
        appliedAdvanced.state &&
        !branch.state
          .toLowerCase()
          .includes(appliedAdvanced.state.toLowerCase())
      )
        return false;
      if (
        appliedAdvanced.status !== "all" &&
        branch.status !== appliedAdvanced.status
      )
        return false;

      return true;
    });
  }, [allBranches, searchQuery, statusDraft, appliedAdvanced]);

  // Desktop Pagination (10 per page)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

  // Mobile load more logic
  const mobileBranches = React.useMemo(() => {
    return filteredBranches.slice(0, mobileVisibleCount);
  }, [filteredBranches, mobileVisibleCount]);

  const hasAdvancedFilters =
    appliedAdvanced.city !== "" ||
    appliedAdvanced.state !== "" ||
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">
          Failed to load branches
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
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, code or city..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Search className="size-4" />
              </div>
            </div>
          </div>

          {/* Filters & Actions Section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Status Select Container */}
              <div className="flex-1 min-w-0 sm:w-[140px]">
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
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
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
                {hasAdvancedFilters && (
                  <span className="absolute -top-1 -right-1 flex size-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-3 bg-primary"></span>
                  </span>
                )}
                <span className="sr-only">Advanced filters</span>
              </Button>
            </div>

            {/* Add Branch Button */}
            <Link
              href="/organization/branches/create"
              className="w-full sm:w-auto shrink-0"
            >
              <Button
                variant="outline"
                className="w-full border border-border h-[39px] text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="mr-2 size-4" />
                Add Branch
              </Button>
            </Link>
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block border border-border/80 rounded-xl bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  BRANCH NAME
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  CODE
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  LOCATION
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  STATUS
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  CREATED AT
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && allBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading branches...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredBranches.length === 0 ? (
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
                          Try adjusting your filters or search query.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBranches.map((item: Branch) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                  >
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="font-semibold text-foreground text-sm tracking-tight">
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      <Badge variant="outline">{item.code}</Badge>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground text-sm tracking-tight truncate max-w-[200px]">
                          {item.city}, {item.state}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal truncate max-w-[200px]">
                          {item.address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle">
                      <Badge
                        variant="secondary"
                        className={statusStyles[item.status] || ""}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-5 px-6 align-middle text-sm text-foreground/80 font-normal">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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
                          <DropdownMenuContent
                            align="end"
                            className="w-40 z-50"
                          >
                            <DropdownMenuItem className="gap-2" asChild>
                              <Link
                                href={`/organization/branches/edit?id=${item.id}`}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setDeleteBranchId(item.id)}
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
                {filteredBranches.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredBranches.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredBranches.length}
              </span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Prev
                </Button>
                <div className="flex items-center gap-1.5 px-1">
                  {visiblePages.map((page) => {
                    const isActive = page === currentPage;
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
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Ultra-Compact List Layout */}
        {filteredBranches.length === 0 && !isLoading ? (
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
            {mobileBranches.map((item: Branch) => {
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
                  {/* Row 1: Avatar, Name, Code, Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          {item.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-center">
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
                            <Link
                              href={`/organization/branches/edit?id=${item.id}`}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setDeleteBranchId(item.id)}
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
                      <span className="font-medium text-muted-foreground/80 block flex items-center gap-1">
                        <MapPin className="size-3" /> Location:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.city}, {item.state}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block flex items-center gap-1">
                        <Building2 className="size-3" /> Status:
                      </span>
                      <span className="text-foreground/95 font-medium">
                        <Badge
                          variant="secondary"
                          className={statusStyles[item.status] || ""}
                        >
                          {item.status}
                        </Badge>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="font-medium text-muted-foreground/80 block flex items-center gap-1">
                        <Calendar className="size-3" /> Created:
                      </span>
                      <span className="text-foreground/95 font-medium">
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile & Tablet Load More Footer */}
        {mobileVisibleCount < filteredBranches.length ? (
          <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
            <Button
              variant="outline"
              className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
            >
              Load More Branches
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredBranches.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredBranches.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : (
          filteredBranches.length > 0 && (
            <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
              <p className="text-xs text-muted-foreground font-normal">
                Showing all{" "}
                <span className="font-medium text-foreground">
                  {filteredBranches.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {filteredBranches.length}
                </span>{" "}
                entries
              </p>
            </div>
          )
        )}
      </div>

      {/* Advanced Filter Dialog */}
      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
              <Label>Branch Status</Label>
              <Select value={advStatus} onValueChange={setAdvStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
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

      {/* Shadcn Alert Dialog for Branch Deletion Confirmation */}
      <AlertDialog
        open={deleteBranchId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteBranchId(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently delete the
              branch from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-[8px]"
              onClick={handleDeleteConfirm}
            >
              Delete Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
