"use client";

import * as React from "react";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  Search,
  Filter,
  Loader2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

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
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTeam, useCreateUser, useUpdateUser } from "@/hooks/use-team";
import { useBranches } from "@/hooks/use-branches";
import { Role, User } from "@/types/auth";

const ROLES = [
  Role.ORG_ADMIN,
  Role.COUNSELOR,
  Role.LEAD_MANAGER,
  Role.APPLICATION_MANAGER,
  Role.EXAM_MANAGER,
] as const;

const roleStyles: Record<string, string> = {
  [Role.LEAD_MANAGER]:
    "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  [Role.APPLICATION_MANAGER]:
    "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
  [Role.EXAM_MANAGER]:
    "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
  [Role.ORG_ADMIN]:
    "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300",
  [Role.SUPERADMIN]:
    "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
  [Role.COUNSELOR]:
    "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
};

const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function TeamPage() {
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // New Member Form State
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newBranch, setNewBranch] = React.useState<string>("none");
  const [newRole, setNewRole] = React.useState<string>(ROLES[0]);

  // Hook Data
  const { data: teamResponse, isLoading, error } = useTeam(page);
  const { data: branchesResponse } = useBranches(1, 100);
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser } = useUpdateUser();

  const team = teamResponse?.data || [];
  const pagination = teamResponse?.pagination;
  const branches = branchesResponse?.data || [];

  const handleCreateMember = () => {
    createUser(
      {
        name: newName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
        branchId: newBranch !== "none" ? newBranch : undefined,
        password: "initialPassword123", // Ideally handled by an invite flow or system default
      },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          setNewName("");
          setNewEmail("");
          setNewPhone("");
          setNewBranch("none");
        },
      },
    );
  };

  const handleToggleStatus = (user: User) => {
    updateUser({
      userId: user.id,
      data: { isActive: user.isActive === false }, // If it's false, set to true. If undefined/true, set to false.
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">
          Failed to load team
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
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Team Management</h1>
          {isLoading && (
            <Loader2 className="animate-spin size-4 text-muted-foreground" />
          )}
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Add Member
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" size="sm">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() +
                      role.slice(1).replace("_", " ")}
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
                <TableHead className="ps-4">Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && team.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-16">
                      <div className="animate-pulse flex items-center gap-3 ps-4">
                        <div className="rounded-full bg-muted size-8 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-2.5 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : team.length > 0 ? (
                team.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="ps-4">
                      <div className="font-semibold">{user.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3" /> {user.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3" /> {user.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {branches.find((b) => b.id === user.branchId)?.name ||
                          "Central"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          roleStyles[user.role] ?? "",
                        )}
                      >
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border-0",
                          user.isActive !== false
                            ? statusStyles.Active
                            : statusStyles.Inactive,
                        )}
                      >
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pe-4">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                              size="icon"
                            >
                              <EllipsisVertical className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="size-4" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.isActive !== false
                                ? "Deactivate User"
                                : "Activate User"}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-auto">
            <p className="text-sm text-muted-foreground">
              Total {pagination.total} staff members
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 align-top">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newRole}
                    onValueChange={(val) => setNewRole(val)}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() +
                            role.slice(1).replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch">Primary Branch</Label>
                  <Select value={newBranch} onValueChange={setNewBranch}>
                    <SelectTrigger id="branch" className="w-full">
                      <SelectValue placeholder="Central" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Central (No Branch)</SelectItem>
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
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateMember} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  "Invite Member"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
