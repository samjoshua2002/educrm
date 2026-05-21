"use client";

import Link from "next/link";

import { Calendar, Eye, MoreVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
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

import { recentApplicationsData } from "./dashboard.config";

const statusStyles: Record<string, string> = {
  Verified: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Pending:
    "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function RecentApplications() {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Latest submissions across all forms.
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" asChild>
              <Link href="/organization/forms">View All</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="ps-4">Applicant</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pe-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentApplicationsData.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-primary font-semibold text-xs">
                          {app.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {app.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {app.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {app.course}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {app.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Calendar className="h-3.5 w-3.5" />
                        {app.submittedAt}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border-0 ${statusStyles[app.status] ?? ""}`}
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pe-4">
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          asChild
                        >
                          <Link
                            href={`/organization/forms/${app.id}/responses`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="data-[state=open]:bg-muted text-muted-foreground h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="cursor-pointer">
                              Verify Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="cursor-pointer"
                            >
                              Reject Application
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
