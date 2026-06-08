"use client";

import * as React from "react";
import {
  Plus,
  Search,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Users,
  LineChart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForms, useDuplicateForm, useDeleteForm } from "@/hooks/use-forms";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationFormsPage() {
  const router = useRouter();

  // State for filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 10;

  // Hooks
  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
  } = useForms(page, limit, searchQuery);
  const { mutate: duplicateForm } = useDuplicateForm();
  const { mutate: deleteForm } = useDeleteForm();

  const forms = paginatedData?.data || [];
  const pagination = paginatedData?.pagination;

  const totalResponses = 0; // Backend currently doesn't provide total across forms in list
  const activeForms = forms.filter((f) => f.status === "active").length;

  const handleDuplicate = (id: string) => {
    duplicateForm(id);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this form? This action cannot be undone.",
      )
    ) {
      deleteForm(id);
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <Trash2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load forms</h2>
        <p className="text-muted-foreground">
          {(error as any)?.message || "Something went wrong"}
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <div>
          <h1 className="text-xl font-semibold text-primary">
            Form Management
          </h1>
          <p className="text-xs text-muted-foreground italic">
            Create and manage admission forms for campaigns or websites.
          </p>
        </div>
        <Link href="/organization/forms/create">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Create New Form
          </Button>
        </Link>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 h-full w-24 bg-primary/5 -skew-x-12 translate-x-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Forms
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{activeForms}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Live forms accepting leads
              </p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 h-full w-24 bg-primary/5 -skew-x-12 translate-x-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Responses
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">0</div>
              )}
              <p className="text-xs text-muted-foreground">
                Across all active forms
              </p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden relative text-primary-foreground bg-primary">
            <div className="absolute top-0 right-0 h-full w-24 bg-white/10 -skew-x-12 translate-x-12" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <LineChart className="h-4 w-4 text-primary-foreground/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24.8%</div>
              <p className="text-xs text-primary-foreground/70">
                +3.1% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms by name..."
                className="pl-8 bg-muted/40 border-primary/10 focus-visible:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground italic">
                {pagination
                  ? `Showing ${forms.length} of ${pagination.total} forms`
                  : ""}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-primary/10 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40%]">Form Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : forms.length > 0 ? (
                  forms.map((form) => {
                    return (
                      <TableRow
                        key={form.id}
                        className="group hover:bg-primary/[0.02] transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div
                              className="cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/organization/forms/${form.id}/edit`,
                                )
                              }
                            >
                              <div className="font-semibold">{form.name}</div>
                              <div className="text-xs text-muted-foreground italic font-normal">
                                Last modified:{" "}
                                {form.updatedAt
                                  ? format(
                                      new Date(form.updatedAt),
                                      "MMM dd, yyyy",
                                    )
                                  : "No date"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              form.status === "active"
                                ? "default"
                                : form.status === "draft"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={`font-semibold rounded-full px-3 capitalize shadow-sm ${
                              form.status === "active"
                                ? "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                                : ""
                            }`}
                          >
                            {form.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground italic">
                          —
                        </TableCell>
                        <TableCell>
                          {form.campaignId ? (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal border-primary/20 text-primary"
                            >
                              {form.campaignId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 p-1"
                            >
                              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer focus:bg-primary focus:text-white rounded-md"
                                onClick={() =>
                                  router.push(
                                    `/organization/forms/${form.id}/responses`,
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Responses
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer focus:bg-primary focus:text-white rounded-md"
                                onClick={() =>
                                  router.push(
                                    `/organization/forms/${form.id}/edit`,
                                  )
                                }
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit Form
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer focus:bg-primary focus:text-white rounded-md"
                                onClick={() => handleDuplicate(form.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:bg-destructive focus:text-white rounded-md"
                                onClick={() => handleDelete(form.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Form
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 rounded-full bg-muted/50">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          No forms found matching your criteria.
                        </p>
                        <Link href="/organization/forms/create">
                          <Button variant="outline" size="sm">
                            Create your first form
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Simple Pagination Footer */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="text-xs text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                }
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
