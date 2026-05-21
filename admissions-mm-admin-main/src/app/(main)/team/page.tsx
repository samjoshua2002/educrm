"use client";

import * as React from "react";

import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Check,
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
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";

type TeamMember = {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  role:
    | "Lead Manager"
    | "Application Manager"
    | "Interview Manager"
    | "Admin"
    | "Full Access";
  status: "Active" | "Inactive";
};

const initialTeam: TeamMember[] = [
  {
    id: 1,
    name: "Arham Khan",
    email: "hello@arhamkhnz.com",
    phone: "+91 9876543210",
    location: "New Delhi",
    role: "Admin",
    status: "Active",
  },
  {
    id: 2,
    name: "Alice Brown",
    email: "alice.brown@example.com",
    phone: "+1 234 567 8901",
    location: "New York",
    role: "Lead Manager",
    status: "Active",
  },
  {
    id: 3,
    name: "Bob Wilson",
    email: "bob.wilson@example.com",
    phone: "+1 234 567 8902",
    location: "London",
    role: "Application Manager",
    status: "Active",
  },
  {
    id: 4,
    name: "Carol Martinez",
    email: "carol.m@example.com",
    phone: "+1 234 567 8903",
    location: "Madrid",
    role: "Interview Manager",
    status: "Inactive",
  },
];

const LOCATIONS = [
  "New Delhi",
  "New York",
  "London",
  "Madrid",
  "Paris",
  "Dubai",
  "Singapore",
] as const;

const ROLES = [
  "Full Access",
  "Lead Manager",
  "Application Manager",
  "Interview Manager",
  "Admin",
] as const;

const roleStyles: Record<string, string> = {
  "Lead Manager":
    "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
  "Application Manager":
    "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
  "Interview Manager":
    "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
  Admin:
    "border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300",
  "Full Access":
    "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
};

const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Inactive: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function TeamPage() {
  const [team, setTeam] = React.useState<TeamMember[]>(initialTeam);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // New Member Form State
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newLocations, setNewLocations] = React.useState<string[]>([]);
  const [newRole, setNewRole] = React.useState<TeamMember["role"]>(ROLES[0]);

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery);
  };

  const filteredTeam = React.useMemo(() => {
    return team.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
        member.phone.includes(appliedSearchQuery) ||
        member.location
          .toLowerCase()
          .includes(appliedSearchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [team, appliedSearchQuery, roleFilter]);

  const handleCreateMember = () => {
    const newMember: TeamMember = {
      id: team.length + 1,
      name: newName,
      email: newEmail,
      phone: newPhone,
      location:
        newLocations.length > 0 ? newLocations.join(", ") : "Not Specified",
      role: newRole,
      status: "Active",
    };
    setTeam([...team, newMember]);
    setCreateDialogOpen(false);
    // Reset form
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewLocations([]);
    setNewRole(ROLES[0]);
  };

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Team Management</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          Create Team Member
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full max-w-sm flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone, location..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
              </div>
              <Button size="icon" variant="outline" onClick={handleSearch}>
                <Search className="size-4" />
                <span className="sr-only">Search</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Team Member</DialogTitle>
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
                  placeholder="+1 234 567 890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 align-top">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newRole}
                    onValueChange={(val) =>
                      setNewRole(val as TeamMember["role"])
                    }
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">
                    {newRole === "Interview Manager"
                      ? "Interview Location"
                      : "Center Location"}
                  </Label>
                  <MultiSelect
                    values={newLocations}
                    onValuesChange={setNewLocations}
                  >
                    <MultiSelectTrigger id="location" className="w-full">
                      <MultiSelectValue placeholder="Select locations" />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      {LOCATIONS.map((loc) => (
                        <MultiSelectItem key={loc} value={loc}>
                          {loc}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateMember}>Create Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="ps-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pe-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeam.length > 0 ? (
                filteredTeam.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="ps-4 font-medium">
                      {member.name}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>{member.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={roleStyles[member.role] ?? ""}
                      >
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border-0 ${statusStyles[member.status] ?? ""}`}
                      >
                        {member.status}
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
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem className="gap-2">
                              <Pencil className="size-4" />
                              Edit
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {filteredTeam.length} members
        </p>
      </div>
    </>
  );
}
