"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  SearchX,
  FileText,
  Users,
  LineChart,
  Eye,
  Copy,
  Calendar,
  LayoutTemplate,
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
import { ActiveFormIcon } from "@/components/icons/active-form-icon";
import { TotalResponseIcon } from "@/components/icons/total-response-icon";
import { ConversionRateIcon } from "@/components/icons/conversion-rate-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useForms,
  useDuplicateForm,
  useDeleteForm,
  useCreateTemplateFromForm,
  useFormTemplates,
  useRemoveTemplateByFormId,
} from "@/hooks/use-forms";
import { Form } from "@/types/form";
import { usePageHeader } from "@/hooks/use-page-header";

const statusStyles: Record<string, string> = {
  active: "bg-[rgba(5,150,105,0.2)] text-[#065f46] hover:bg-[rgba(5,150,105,0.3)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  draft: "bg-[rgba(139,92,246,0.2)] text-[#6d28d9] hover:bg-[rgba(139,92,246,0.3)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  archived: "bg-[rgba(217,119,6,0.2)] text-[#bd0f0f] hover:bg-[rgba(217,119,6,0.3)] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

export default function OrganizationFormsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  usePageHeader({
    title: "Form Creation",
    description: "Create and manage admission forms for campaigns",
    action: {
      label: "Create Form",
      href: "/organization/forms/create",
    },
  });

  const router = useRouter();

  // Mobile load more
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);
  const [deleteFormId, setDeleteFormId] = React.useState<string | null>(null);

  // Pagination for API (we fetch 50 at a time for search/filter consistency in frontend like branches)
  const itemsPerPage = 5;
  const { data: formsResponse, isLoading, error } = useForms(1, 50, searchQuery);
  const { data: templatesResponse } = useFormTemplates();
  const { mutate: duplicateForm } = useDuplicateForm();
  const deleteFormMutation = useDeleteForm();
  const { mutate: saveAsTemplate, isPending: isSavingTemplate } = useCreateTemplateFromForm();
  const { mutate: removeTemplateByFormId, isPending: isRemovingTemplate } = useRemoveTemplateByFormId();

  const templates = templatesResponse?.data || [];
  const isTemplateMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    templates.forEach((t) => {
      if (t.originalFormId) {
        map.set(t.originalFormId, true);
      }
    });
    return map;
  }, [templates]);

  const allForms = formsResponse?.data || [];
  
  const activeForms = allForms.filter((f: Form) => f.status === "active").length;
  const totalResponses = 0; // Mocked for now

  function handleDeleteConfirm() {
    if (deleteFormId) {
      deleteFormMutation.mutate(deleteFormId);
      setDeleteFormId(null);
    }
  }

  function handleDuplicate(id: string) {
    duplicateForm(id);
  }

  function handleSaveAsTemplate(id: string) {
    saveAsTemplate(id, {
      onSuccess: () => {
        router.push("/organization/forms/create");
      },
    });
  }

  function handleRemoveTemplate(id: string) {
    removeTemplateByFormId(id);
  }

  const filteredForms = React.useMemo(() => {
    return allForms.filter((form: Form) => {
      // 1. Search filter is handled by API mostly, but keeping it here for safety
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (!form.name.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== "all" && form.status !== statusFilter) return false;

      return true;
    });
  }, [allForms, searchQuery, statusFilter]);

  // Desktop Pagination (10 per page)
  const totalPages = Math.ceil(filteredForms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedForms = filteredForms.slice(startIndex, endIndex);

  // Mobile load more logic
  const mobileForms = React.useMemo(() => {
    return filteredForms.slice(0, mobileVisibleCount);
  }, [filteredForms, mobileVisibleCount]);

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

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">
          Failed to load forms
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
        {/* Branch-style Quick Stats Dashboard - Adapted for Forms */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Active Forms */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Left: icon + label */}
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <ActiveFormIcon className="size-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Active Forms</span>
            </div>
            {/* Right: number + text */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 mt-1">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">{activeForms}</span>
              <span className="text-[11px] text-muted-foreground">Live forms accepting leads</span>
            </div>
          </div>

          {/* Card 2: Total Response */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Left: icon + label */}
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center bg-[#ECFDF5] text-[#059669]">
                <TotalResponseIcon className="size-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Total Response</span>
            </div>
            {/* Right: number + text */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 mt-1">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">{totalResponses}</span>
              <span className="text-[11px] text-muted-foreground">Live forms accepting leads</span>
            </div>
          </div>

          {/* Card 3: Conversion Rate */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Left: icon + label */}
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center bg-[#EEF2FF] text-[#4F46E5]">
                <ConversionRateIcon className="size-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Conversion Rate</span>
            </div>
            {/* Right: number + bar */}
            <div className="flex flex-col gap-2 flex-1 min-w-0 mt-1">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">24.8%</span>
              {/* Progress bar */}
              <div className="w-full h-[6px] rounded-[9999px] overflow-hidden bg-[#10B981]/15">
                <div
                  className="h-full rounded-[9999px] transition-all duration-700"
                  style={{ width: "24.8%", backgroundColor: "#10B981" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by name, email or phone..."
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

          {/* Filters & Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 min-w-0 sm:w-[160px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="Sort by: Name (A-Z)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sort by: Name (A-Z)</SelectItem>
                    <SelectItem value="active">Status: Active</SelectItem>
                    <SelectItem value="draft">Status: Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  FORM NAME
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  STATUS
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  RESPONSE
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  CAMPAIGN
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!mounted || isLoading) && allForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading forms...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
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
                paginatedForms.map((item: Form) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors"
                  >
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <div className="font-semibold text-[#1e293b] text-[14px]">
                        {item.name}
                      </div>
                      <div className="text-[#64748b] text-[12px] mt-0.5">
                        Last modifies: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }) : "No date"}
                      </div>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <Badge
                        variant="secondary"
                        className={statusStyles[item.status.toLowerCase()] || ""}
                      >
                        <span className="capitalize">{item.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <div className="inline-flex size-7 items-center justify-center rounded-full bg-[#dcfce7] text-[#166534] font-semibold text-[13px]">
                        5
                      </div>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle">
                      <div className="text-[#475569] text-[14px]">
                        {item.campaignId || "Campaign Name"}
                      </div>
                    </TableCell>
                    <TableCell className="py-[24px] px-[24px] align-middle text-right">
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
                            <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                              <Link href={`/organization/forms/${item.id}/responses`}>
                                <Eye className="size-4" />
                                View Responses
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                              <Link href={`/organization/forms/${item.id}/edit`}>
                                <Pencil className="size-4" />
                                Edit Form
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-[13px]" onClick={() => handleDuplicate(item.id)}>
                              <Copy className="size-4" />
                              Duplicate
                            </DropdownMenuItem>
                             {isTemplateMap.has(item.id) ? (
                              <DropdownMenuItem
                                className="gap-2 text-[13px] text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => handleRemoveTemplate(item.id)}
                                disabled={isRemovingTemplate}
                              >
                                <Trash2 className="size-4" />
                                Remove Template
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="gap-2 text-[13px]"
                                onClick={() => handleSaveAsTemplate(item.id)}
                                disabled={isSavingTemplate}
                              >
                                <LayoutTemplate className="size-4" />
                                Make as Template
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2 text-[13px]"
                              onClick={() => setDeleteFormId(item.id)}
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
                {filteredForms.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredForms.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredForms.length}
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
                  Previous
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
                            ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
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
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Ultra-Compact List Layout */}
        {(!mounted || isLoading) && allForms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading forms...</p>
          </div>
        ) : filteredForms.length === 0 ? (
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
            {mobileForms.map((item: Form) => {
              return (
                <div
                  key={item.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Avatar, Name, Code, Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          Last modifies: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }) : "No date"}
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
                        <DropdownMenuContent align="end" className="w-40 z-50">
                          <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                            <Link href={`/organization/forms/${item.id}/responses`}>
                              <Eye className="size-4" />
                              View Responses
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                            <Link href={`/organization/forms/${item.id}/edit`}>
                              <Pencil className="size-4" />
                              Edit Form
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-[13px]" onClick={() => handleDuplicate(item.id)}>
                            <Copy className="size-4" />
                            Duplicate
                          </DropdownMenuItem>
                           {isTemplateMap.has(item.id) ? (
                            <DropdownMenuItem
                              className="gap-2 text-[13px] text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleRemoveTemplate(item.id)}
                              disabled={isRemovingTemplate}
                            >
                              <Trash2 className="size-4" />
                              Remove Template
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2 text-[13px]"
                              onClick={() => handleSaveAsTemplate(item.id)}
                              disabled={isSavingTemplate}
                            >
                              <LayoutTemplate className="size-4" />
                              Make as Template
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2 text-[13px]"
                            onClick={() => setDeleteFormId(item.id)}
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
                         Status:
                      </span>
                      <span className="text-foreground/95 font-medium">
                        <Badge
                          variant="secondary"
                          className={statusStyles[item.status.toLowerCase()] || ""}
                        >
                          <span className="capitalize">{item.status}</span>
                        </Badge>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block flex items-center gap-1">
                         Response:
                      </span>
                      <div className="inline-flex size-6 items-center justify-center rounded-full bg-[#dcfce7] text-[#166534] font-semibold text-[11px]">
                        5
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="font-medium text-muted-foreground/80 block flex items-center gap-1">
                         Campaign:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.campaignId || "Campaign Name"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile & Tablet Load More Footer */}
        {mobileVisibleCount < filteredForms.length ? (
          <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
            <Button
              variant="outline"
              className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
            >
              Load More Forms
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredForms.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredForms.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : (
          filteredForms.length > 0 && (
            <div className="flex lg:hidden flex-col items-center justify-center gap-3 mt-2">
              <p className="text-xs text-muted-foreground font-normal">
                Showing all{" "}
                <span className="font-medium text-foreground">
                  {filteredForms.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {filteredForms.length}
                </span>{" "}
                entries
              </p>
            </div>
          )
        )}
      </div>

      {/* Delete Confirmation Popup */}
      <AlertDialog
        open={!!deleteFormId}
        onOpenChange={(open) => !open && setDeleteFormId(null)}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the form
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
