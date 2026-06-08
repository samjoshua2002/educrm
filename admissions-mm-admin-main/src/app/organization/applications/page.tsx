/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  EllipsisVertical,
  Search,
  SearchX,
  Filter,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/auth-store";
import { Role } from "@/types/auth";

type Application = {
  id: string;
  applicationNo: string;
  name: string;
  email: string;
  program: string;
  formStatus: "Rejected" | "In Progress" | "Accepted" | "Submitted";
  payment: string;
  lastActivity: string;
};

const DUMMY_APPLICATIONS: Application[] = [
  {
    id: "APP-2026-0001",
    applicationNo: "APP-2026-0001",
    name: "Alice Smith",
    email: "alice.s@email.com",
    program: "B.Tech Computer Science",
    formStatus: "Rejected",
    payment: "Online",
    lastActivity: "12 Feb 2026",
  },
  {
    id: "APP-2026-0002",
    applicationNo: "APP-2026-0002",
    name: "Bob Knight",
    email: "bob.k@email.com",
    program: "B.Tech Computer Science",
    formStatus: "In Progress",
    payment: "Online",
    lastActivity: "12 Feb 2026",
  },
  {
    id: "APP-2026-0003",
    applicationNo: "APP-2026-0003",
    name: "Cathy Reed",
    email: "cathy.reed@email.com",
    program: "B.Tech Computer Science",
    formStatus: "Accepted",
    payment: "Net Banking",
    lastActivity: "12 Feb 2026",
  },
  {
    id: "APP-2026-0004",
    applicationNo: "APP-2026-0004",
    name: "Cathy Reed",
    email: "cathy.reed@email.com",
    program: "B.Tech Computer Science",
    formStatus: "Submitted",
    payment: "Net Banking",
    lastActivity: "12 Feb 2026",
  },
  {
    id: "APP-2026-0005",
    applicationNo: "APP-2026-0005",
    name: "Cathy Reed",
    email: "cathy.reed@email.com",
    program: "B.Tech Computer Science",
    formStatus: "Accepted",
    payment: "Debit Card",
    lastActivity: "12 Feb 2026",
  },
  {
    id: "APP-2026-0006",
    applicationNo: "APP-2026-0006",
    name: "Cathy Reed",
    email: "cathy.reed@email.com",
    program: "B.Tech Computer Science",
    formStatus: "Submitted",
    payment: "Debit Card",
    lastActivity: "12 Feb 2026",
  },
];

export default function OrganizationApplicationsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allowed =
    user?.role === Role.ORG_ADMIN || user?.role === Role.APPLICATION_MANAGER;

  React.useEffect(() => {
    if (user && !allowed) router.replace("/unauthorized");
  }, [allowed, router, user]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const data = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DUMMY_APPLICATIONS.filter((a) => {
      const matchesSearch =
        q.length === 0 ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.applicationNo.toLowerCase().includes(q);
      const matchesStage =
        stageFilter === "all" || a.formStatus === stageFilter;
      const matchesStatus =
        statusFilter === "all" || a.formStatus === statusFilter;
      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [searchQuery, stageFilter, statusFilter]);

  if (!user) return null;
  if (!allowed) return null;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Applications</h1>
        <Button className="h-9 px-4 font-semibold">+ New Applications</Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 w-full">
          <div className="relative w-full">
            <Input
              placeholder="Search by name, email or phone..."
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
            <div className="flex-1 min-w-0 sm:w-[140px]">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full h-10" size="lg">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-0 sm:w-[140px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10" size="lg">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="relative h-[39px] w-[39px] shrink-0"
            >
              <Filter className="size-4" />
              <span className="sr-only">Advanced Filters</span>
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full sm:w-auto shrink-0 h-[39px] gap-2"
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                APPLICATION DETAIL
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                APPLICATION NO.
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                PROGRAM
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                FORM STATUS
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                PAYMENT
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                LAST ACTIVITY
              </TableHead>
              <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase text-right w-[85px]">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                      <SearchX className="size-6 text-muted-foreground/80" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      No results found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                >
                  <TableCell className="py-5 px-6">
                    <div className="font-semibold text-foreground text-sm tracking-tight">
                      {row.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.email}
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6 text-sm text-foreground/80">
                    {row.applicationNo}
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="font-medium text-foreground text-sm tracking-tight">
                      {row.program}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.email}
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <StatusBadge status={row.formStatus} />
                  </TableCell>
                  <TableCell className="py-5 px-6 text-sm text-foreground/80">
                    {row.payment}
                  </TableCell>
                  <TableCell className="py-5 px-6 text-sm text-foreground/80">
                    {row.lastActivity}
                  </TableCell>
                  <TableCell className="py-5 px-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="size-8 rounded-md hover:bg-muted"
                          size="icon"
                        >
                          <EllipsisVertical className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/organization/applications/${row.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-muted-foreground">
                          More actions later
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
  );
}
