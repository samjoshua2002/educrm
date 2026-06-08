"use client";

import * as React from "react";
import { 
  EllipsisVertical, 
  Pencil, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  Mail, 
  Phone, 
  ChevronLeft, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { useOrganization } from "@/hooks/use-organizations";
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
    "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20",
  [Role.APPLICATION_MANAGER]:
    "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20",
  [Role.EXAM_MANAGER]:
    "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20",
  [Role.ORG_ADMIN]:
    "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300 bg-orange-50/50 dark:bg-orange-950/20",
  [Role.SUPERADMIN]:
    "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20",
  [Role.COUNSELOR]:
    "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/20",
};

const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function SuperadminOrganizationUsersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const orgId = unwrappedParams.orgId;
  const router = useRouter();

  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Form Fields State
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [branch, setBranch] = React.useState<string>("none");
  const [role, setRole] = React.useState<string>(ROLES[0]);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // API Hooks with explicit orgId
  const { data: orgData, isLoading: isLoadingOrg } = useOrganization(orgId);
  const {
    data: teamResponse,
    isLoading: isLoadingTeam,
    error,
  } = useTeam(orgId, page);
  const { data: branchesResponse } = useBranches(orgId, 1, 100);
  const { mutate: createUser, isPending: isCreating } = useCreateUser(orgId);
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser(orgId);

  const team = teamResponse?.data || [];
  const pagination = teamResponse?.pagination;
  const branches = branchesResponse?.data || [];
  const orgName = orgData?.name || "Organization";

  const isPending = isCreating || isUpdating;

  // Handle open dialog for Create User
  const handleOpenCreate = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPhone("");
    setBranch("none");
    setRole(ROLES[0]);
    setPassword("");
    setShowPassword(false);
    setDialogOpen(true);
  };

  // Handle open dialog for Edit User
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || "");
    setBranch(user.branchId || "none");
    setRole(user.role);
    setDialogOpen(true);
  };

  // Submit Handler
  const handleSaveUser = () => {
    if (editingUser) {
      updateUser(
        {
          userId: editingUser.id,
          data: {
            name,
            email,
            phone,
            role,
            branchId: branch !== "none" ? branch : undefined,
          },
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
          },
        },
      );
    } else {
      createUser(
        {
          name,
          email,
          phone,
          role,
          branchId: branch !== "none" ? branch : undefined,
        }
      }, {
        onSuccess: () => {
          setDialogOpen(false);
        }
      });
    } else {
      createUser({
        name,
        email,
        phone,
        role,
        branchId: branch !== "none" ? branch : undefined,
        password: password,
      }, {
        onSuccess: () => {
          setDialogOpen(false);
        }
      });
    }
  };

  // Toggle user state active/inactive
  const handleToggleStatus = (user: User) => {
    updateUser({
      userId: user.id,
      data: { isActive: user.isActive === false },
    });
  };

  // Client-side filtering fallback for search/roles filter on page records
  const filteredTeam = team.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.includes(searchQuery));

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-background">
        <ShieldAlert className="size-12 text-destructive mb-3" />
        <p className="text-destructive font-semibold mb-2">
          Failed to load organization staff
        </p>
        <p className="text-muted-foreground text-sm">
          Please check authorization rights or network connection.
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky Header with breadcrumb */}
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link href="/superadmin/organizations">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
              <span>Superadmin</span>
              <span>/</span>
              <span>Organizations</span>
              <span>/</span>
              <span className="text-foreground font-bold">{orgName}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-0.5">
              Staff Management
            </h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="shadow-lg shadow-primary/10"
        >
          <Plus className="size-4 mr-1.5" />
          Add Staff Member
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6 h-full flex-1">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-8 bg-muted/30 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" size="sm">
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

        {/* User Table */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="ps-4">Member Info</TableHead>
                <TableHead>Contact Channels</TableHead>
                <TableHead>Assigned Branch</TableHead>
                <TableHead>Platform Role</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTeam ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-16">
                      <div className="animate-pulse flex items-center gap-3 ps-4">
                        <div className="rounded-full bg-muted size-8 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-muted rounded w-1/3" />
                          <div className="h-2 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredTeam.length > 0 ? (
                filteredTeam.map((user) => (
                  <TableRow key={user.id} className="hover:bg-primary/[0.01]">
                    <TableCell className="ps-4 font-medium">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3" /> {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="size-3" /> {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {branches.find((b) => b.id === user.branchId)?.name ||
                          "Central (No Branch)"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize font-semibold rounded-full px-2.5 py-0.5",
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
                          "border-0 rounded-full font-bold px-3 py-0.5",
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
                              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 px-0"
                              size="icon"
                            >
                              <EllipsisVertical className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 p-1">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => handleOpenEdit(user)}
                            >
                              <Pencil className="size-4 text-muted-foreground" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer font-medium"
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.isActive !== false ? (
                                <>
                                  <UserX className="size-4 text-destructive" />
                                  <span className="text-destructive">
                                    Deactivate Staff
                                  </span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="size-4 text-emerald-600" />
                                  <span className="text-emerald-600">
                                    Activate Staff
                                  </span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center p-6 space-y-2">
                      <p className="text-sm text-muted-foreground italic">
                        No staff members found.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenCreate}
                      >
                        Create first staff
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-auto pt-2">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {pagination.totalPages} ({pagination.total}{" "}
              staff members)
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
              <div className="text-sm font-semibold px-2">{page}</div>
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
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingUser ? "Edit Staff Profile" : "Add Staff Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/10 focus-visible:ring-primary/20"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@org.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/10 focus-visible:ring-primary/20"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="phone"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="+91 99887 76655"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-muted/10 focus-visible:ring-primary/20"
              />
            </div>
            {!editingUser && (
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/10 focus-visible:ring-primary/20 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="role"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Role
                </Label>
                <Select value={role} onValueChange={(val) => setRole(val)}>
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
                <Label
                  htmlFor="branch"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Primary Branch
                </Label>
                <Select value={branch} onValueChange={setBranch}>
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
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={isPending}
              className="font-semibold shadow-lg shadow-primary/10"
            >
              {isPending && <Loader2 className="animate-spin size-4 mr-2" />}
              {editingUser ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
