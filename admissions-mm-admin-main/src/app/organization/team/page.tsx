"use client";

import * as React from "react";
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
  Mail,
  Phone,
  MapPin,
  Users,
  CheckCircle,
  UsersRound,
  Building2,
  Calendar,
  Lock,
  User as UserIcon,
  CalendarDays,
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
import { useTeam, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-team";
import { useBranches } from "@/hooks/use-branches";
import { Role, User } from "@/types/auth";
import { cn } from "@/lib/utils";

const ROLES = [Role.ORG_ADMIN, Role.COUNSELOR, Role.LEAD_MANAGER, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER] as const;

const roleStyles: Record<string, string> = {
  [Role.LEAD_MANAGER]: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  [Role.APPLICATION_MANAGER]: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  [Role.EXAM_MANAGER]: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  [Role.ORG_ADMIN]: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  [Role.SUPERADMIN]: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  [Role.COUNSELOR]: "bg-[#4F46E533] text-[#4F46E5] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

const statusStyles: Record<string, string> = {
  Active: "bg-[#05966933] text-[#065F46] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Inactive: "bg-[#D9770633] text-[#BD0F0F] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export default function TeamPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");

  // Mobile load more
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  // Delete dialog
  const [deleteUserId, setDeleteUserId] = React.useState<string | null>(null);

  // Create / Edit dialog
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formBranch, setFormBranch] = React.useState<string>("none");
  const [formRole, setFormRole] = React.useState<string>(ROLES[0]);

  // Hook Data — use page-by-page fetching matching original hook signature
  const { data: teamResponse, isLoading, error } = useTeam(currentPage);
  const { data: branchesResponse } = useBranches(1, 100);
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const team = teamResponse?.data || [];
  const pagination = teamResponse?.pagination;
  const branches = branchesResponse?.data || [];

  const isSubmitting = isCreating || isUpdating;

  function openCreateDialog() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("");
    setFormBranch("none");
    setFormRole(ROLES[0]);
    setFormDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || "");
    setFormPassword("");
    setFormBranch(user.branchId || "none");
    setFormRole(user.role);
    setFormDialogOpen(true);
  }

  function closeFormDialog() {
    setFormDialogOpen(false);
    setEditingUser(null);
  }

  const handleSubmit = () => {
    if (editingUser) {
      updateUser(
        {
          userId: editingUser.id,
          data: {
            name: formName,
            email: formEmail,
            phone: formPhone,
            role: formRole,
            branchId: formBranch !== "none" ? formBranch : undefined,
          },
        },
        { onSuccess: () => closeFormDialog() }
      );
    } else {
      createUser(
        {
          name: formName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          branchId: formBranch !== "none" ? formBranch : undefined,
          password: formPassword || "initialPassword123",
        },
        { onSuccess: () => closeFormDialog() }
      );
    }
  };

  const handleToggleStatus = (user: User) => {
    updateUser({
      userId: user.id,
      data: { isActive: user.isActive === false },
    });
  };

  const filteredTeam = React.useMemo(() => {
    return team.filter((user: User) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (
          !user.name.toLowerCase().includes(q) &&
          !user.email.toLowerCase().includes(q) &&
          !(user.phone || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      return true;
    });
  }, [team, searchQuery, roleFilter]);

  // Use server-side pagination totals; client-side filter on current page data
  const totalPages = pagination?.totalPages ?? 1;
  const totalCount = pagination?.total ?? team.length;
  const startIndex = (currentPage - 1) * 10;
  const endIndex = startIndex + filteredTeam.length;
  const paginatedTeam = filteredTeam;

  // Mobile: show up to mobileVisibleCount from current page
  const mobileTeam = React.useMemo(
    () => filteredTeam.slice(0, mobileVisibleCount),
    [filteredTeam, mobileVisibleCount]
  );

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
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [currentPage, totalPages]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeCount = team.filter((u: User) => u.isActive !== false).length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">Failed to load team</p>
        <p className="text-muted-foreground text-sm">Please check your connection or contact support.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Team Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Total Staff */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <UsersRound className="size-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Total Staff</span>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">{totalCount}</span>
              <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#2563EB]/15">
                <div
                  className="h-full rounded-[9999px] transition-all duration-700"
                  style={{ width: "100%", backgroundColor: "#2563EB" }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Active Staff */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: "#ECFDF5" }}>
                <CheckCircle className="size-5" style={{ color: "#10B981" }} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Active Now</span>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">{activeCount}</span>
              <div className="w-full h-[6px] rounded-[9999px] overflow-hidden" style={{ backgroundColor: "#D1FAE5" }}>
                <div
                  className="h-full rounded-[9999px] transition-all duration-700"
                  style={{
                    width: team.length > 0 ? `${(activeCount / team.length) * 100}%` : "0%",
                    backgroundColor: "#10B981",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, email, or phone..."
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 min-w-0 sm:w-[160px]">
                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    setRoleFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Add Member Button */}
            <Button
              variant="outline"
              className="w-full sm:w-auto shrink-0 border border-border h-[39px] text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 size-4" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  MEMBER
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  CONTACT
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  BRANCH
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  ROLE
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  STATUS
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!mounted || isLoading) && team.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading team members...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTeam.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-6 text-muted-foreground/80" />
                      </div>
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTeam.map((user: User) => (
                  <TableRow
                    key={user.id}
                    className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors"
                  >
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <div className="font-semibold text-[#1e293b] text-[14px]">{user.name}</div>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[#475569]">
                          <Mail className="size-3" /> {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-[#64748b]">
                            <Phone className="size-3" /> {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle text-[#475569] text-[14px]">
                      {branches.find((b) => b.id === user.branchId)?.name || "Central"}
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <Badge variant="secondary" className={roleStyles[user.role] || ""}>
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle">
                      <Badge
                        variant="secondary"
                        className={user.isActive !== false ? statusStyles.Active : statusStyles.Inactive}
                      >
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-[20px] px-[24px] align-middle text-right">
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
                          <DropdownMenuContent align="end" className="w-44 z-50">
                            <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(user)}>
                              <Pencil className="size-4" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.isActive !== false ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setDeleteUserId(user.id)}
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
                {filteredTeam.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredTeam.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{filteredTeam.length}</span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => { if (currentPage > 1) setCurrentPage(currentPage - 1); }}
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
                  onClick={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View */}
        {filteredTeam.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 lg:hidden w-full">
            {mobileTeam.map((user: User) => {
              const initials = user.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={user.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Avatar, Name, Role, Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {user.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          {formatRole(user.role)}
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
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(user)}>
                            <Pencil className="size-4" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleToggleStatus(user)}>
                            {user.isActive !== false ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        <Mail className="size-3" /> Email:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">{user.email}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        <Building2 className="size-3" /> Branch:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {branches.find((b) => b.id === user.branchId)?.name || "Central"}
                      </span>
                    </div>

                    {user.phone && (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                          <Phone className="size-3" /> Phone:
                        </span>
                        <span className="text-foreground/95 font-medium">{user.phone}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 flex items-center gap-1">
                        Status:
                      </span>
                      <Badge
                        variant="secondary"
                        className={user.isActive !== false ? statusStyles.Active : statusStyles.Inactive}
                      >
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Load More Footer */}
        {mobileVisibleCount < filteredTeam.length ? (
          <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
            <Button
              variant="outline"
              className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
            >
              Load More Members
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredTeam.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{filteredTeam.length}</span> entries
            </p>
          </div>
        ) : (
          filteredTeam.length > 0 && (
            <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
              <p className="text-xs text-muted-foreground font-normal">
                Showing all{" "}
                <span className="font-medium text-foreground">{filteredTeam.length}</span> of{" "}
                <span className="font-medium text-foreground">{filteredTeam.length}</span> entries
              </p>
            </div>
          )
        )}
      </div>

      {/* Add / Edit Member Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={(open) => { closeFormDialog();    }}>
        <DialogContent className="sm:max-w-[680px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">
          
          {/* Card 1: Member Details */}
          <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <UserIcon className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Member Details</h3>
            </div>

            {/* FULL NAME Field */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Full Name</Label>
              <Input
                placeholder="e.g. Dr. Sarah Jenkins"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                required
              />
            </div>

            {/* EMAIL & PHONE Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Email Address</Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 text-[#64748B] size-4 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="sarah.j@university.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Phone Number</Label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 text-[#64748B] size-4 pointer-events-none" />
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* PASSWORD Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Password</Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-[#64748B] size-4 pointer-events-none" />
                  <Input
                    type="password"
                    placeholder="************"
                    value={editingUser ? "************" : formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    disabled={!!editingUser}
                    className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                    required={!editingUser}
                  />
                </div>
              </div>
              {/* Empty placeholder to occupy right half of row */}
              <div className="hidden md:block" />
            </div>
          </div>

          {/* Card 2: Assignment */}
          <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border  rounded-[10px] flex items-center justify-center shrink-0">
                <CalendarDays className="size-5" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0F172A]">Assignment</h3>
            </div>

            {/* ROLE & PRIMARY BRANCH Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="Select institutional role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">Primary Branch</Label>
                <Select value={formBranch} onValueChange={setFormBranch}>
                  <SelectTrigger className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="Select primary location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select primary location</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action buttons at bottom */}
          <div className="flex items-center gap-3 justify-start mt-2 rounded-[10px] ml-5">
            <Button
              type="button"
              variant="outline"
              onClick={closeFormDialog}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
            >
              {isSubmitting ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Save"
              )}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This will permanently delete the team member from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-[8px]"
              disabled={deleteUserMutation.isPending}
              onClick={() => {
                if (deleteUserId) {
                  deleteUserMutation.mutate(deleteUserId, {
                    onSuccess: () => setDeleteUserId(null),
                  });
                }
              }}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
