/* eslint-disable max-lines, @typescript-eslint/no-explicit-any */
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
  SearchX,
  Eye,
  Copy,
  Mail,
  Layers,
  Sparkles,
  Send,
  Plus,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import {
  useEmailTemplates,
  useDeleteEmailTemplate,
  useDuplicateEmailTemplate,
  useSendTemplatedEmail,
  renderTemplate,
} from "@/hooks/use-email-templates";
import { EmailTemplate, AVAILABLE_SHORTCUTS } from "@/types/email-template";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  active:
    "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  draft:
    "bg-[#F3E8FF] text-[#6B21A8] dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
};

const categoryPillStyles: Record<string, string> = {
  "interview schedule":
    "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "admission offer":
    "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "document request":
    "bg-[#FFEDD5] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "payment reminder":
    "bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-500/20 dark:text-rose-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
  "general notice":
    "bg-[#F3E8FF] text-[#6B21A8] dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center",
};

const getCategoryStyle = (cat: string) => {
  const lower = (cat || "").toLowerCase();
  if (categoryPillStyles[lower]) return categoryPillStyles[lower];
  const leadManagerPalettes = [
    "bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300",
    "bg-[#F3E8FF] text-[#6B21A8] dark:bg-purple-500/20 dark:text-purple-300",
    "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300",
    "bg-[#FFEDD5] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300",
    "bg-[#CFFAFE] text-[#155E75] dark:bg-cyan-500/20 dark:text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = lower.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % leadManagerPalettes.length;
  return `${leadManagerPalettes[index]} font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center`;
};

export default function OrganizationEmailTemplatesPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const user = useAuthStore((s) => s.user);

  usePageHeader({
    title: "Email Templates",
    description: "Create and manage email communication templates for admission campaigns",
    action: {
      label: "Create Template",
      href: "/organization/email-templates/create",
    },
  });

  const router = useRouter();

  // Mobile load more
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);
  const [deleteTemplateId, setDeleteTemplateId] = React.useState<string | null>(null);

  // Quick preview & test send modals
  const [previewTemplate, setPreviewTemplate] = React.useState<EmailTemplate | null>(null);
  const [testSendTemplate, setTestSendTemplate] = React.useState<EmailTemplate | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = React.useState("");
  const [testCandidateName, setTestCandidateName] = React.useState("Aarav Sharma");
  const [testAppNo, setTestAppNo] = React.useState("APP2026001");

  const itemsPerPage = 5;

  const { data: allTemplates = [], isLoading, error } = useEmailTemplates(
    searchQuery,
    categoryFilter,
    statusFilter
  );

  const filterCategories = React.useMemo(() => {
    const set = new Set<string>([
      "Interview Schedule",
      "Admission Offer",
      "Document Request",
      "Payment Reminder",
      "General Notice",
    ]);
    allTemplates.forEach((t: EmailTemplate) => {
      if (t.category) set.add(t.category);
    });
    try {
      const saved = localStorage.getItem("educrm_email_template_categories");
      if (saved) {
        JSON.parse(saved).forEach((c: string) => set.add(c));
      }
    } catch {
      // Ignore
    }
    return Array.from(set);
  }, [allTemplates]);

  const { mutate: duplicateTemplate } = useDuplicateEmailTemplate();
  const deleteTemplateMutation = useDeleteEmailTemplate();
  const sendEmailMutation = useSendTemplatedEmail();

  const activeTemplates = allTemplates.filter((t) => t.status === "active").length;
  const totalTemplates = allTemplates.length;

  function handleDeleteConfirm() {
    if (deleteTemplateId) {
      deleteTemplateMutation.mutate(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  }

  function handleDuplicate(id: string) {
    duplicateTemplate(id);
  }

  const filteredTemplates = React.useMemo(() => {
    return allTemplates.filter((item: EmailTemplate) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.subject.toLowerCase().includes(q) &&
          !item.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      if (categoryFilter !== "all" && item.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [allTemplates, searchQuery, categoryFilter, statusFilter]);

  // Desktop Pagination (matching forms module: 5 per page)
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  // Mobile load more logic
  const mobileTemplates = React.useMemo(() => {
    return filteredTemplates.slice(0, mobileVisibleCount);
  }, [filteredTemplates, mobileVisibleCount]);

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

  // Candidate sample context for preview
  const sampleCandidateContext: Record<string, string> = {
    student: "Aarav Sharma",
    course: "PGDM (Two-Year, Full-Time)",
    application_no: "APP2026001",
    date: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: "10:30 AM - 12:00 PM IST",
    venue: "Main Campus Seminar Hall A",
    sender: user?.name || "Admissions Desk",
    organization: "Global Educational Institute",
    email: "aarav.sharma@gmail.com",
    phone: "+91 98765 43210",
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <p className="text-destructive font-semibold mb-2">Failed to load email templates</p>
        <p className="text-muted-foreground text-sm">Please check your connection or contact support.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Quick Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Active Templates */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Left: icon + label */}
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <ActiveFormIcon className="size-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                Active Templates
              </span>
            </div>
            {/* Right: number + text */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 mt-1">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">
                {activeTemplates}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Live templates ready to send
              </span>
            </div>
          </div>

          {/* Card 2: Total Templates */}
          <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
            {/* Left: icon + label */}
            <div className="flex flex-col items-start gap-1 shrink-0">
              <div className="w-11 h-11 rounded-[10px] flex items-center justify-center bg-[#ECFDF5] text-[#059669]">
                <TotalResponseIcon className="size-5" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                Total Templates
              </span>
            </div>
            {/* Right: number + text */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 mt-1">
              <span className="text-[28px] font-bold leading-none text-[#0F172A]">
                {totalTemplates}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Configured categories & layouts
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filters Bar matching Forms */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search by template name, category or subject..."
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
              <div className="flex-1 min-w-0 sm:w-[190px]">
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    setCategoryFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Category: All</SelectItem>
                    {filterCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-0 sm:w-[160px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Status: All</SelectItem>
                    <SelectItem value="active">Status: Active</SelectItem>
                    <SelectItem value="draft">Status: Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop View - Table matching Forms module exactly */}
        <div className="hidden lg:block border border-[#e5e5e5] rounded-[12px] bg-white overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  TEMPLATE NAME
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  CATEGORY
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  SUBJECT LINE & SHORTCUTS
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                  STATUS
                </TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!mounted || isLoading) && allTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                      <p>Loading email templates...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-6 text-muted-foreground/80" />
                      </div>
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">No templates found</p>
                        <p className="text-xs text-muted-foreground">
                          Try adjusting your filters or create a new template.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTemplates.map((item: EmailTemplate) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors"
                  >
                    <TableCell className="py-5 px-6 align-middle">
                      <div className="font-semibold text-[#1e293b] text-[14px]">
                        {item.name}
                      </div>
                      <div className="text-[#64748b] text-[12px] mt-0.5">
                        Last modified:{" "}
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "No date"}
                      </div>
                    </TableCell>

                    <TableCell className="py-5 px-6 align-middle">
                      <span className={getCategoryStyle(item.category)}>
                        {item.category}
                      </span>
                    </TableCell>

                    <TableCell className="py-5 px-6 align-middle">
                      <div className="flex flex-col gap-1 max-w-[400px]">
                        <span className="text-[13px] font-medium text-[#1e293b] truncate">
                          {item.subject}
                        </span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          {item.variables && item.variables.length > 0 ? (
                            item.variables.map((v) => {
                              const sc = AVAILABLE_SHORTCUTS.find((s) => s.key.toLowerCase() === v.toLowerCase());
                              return (
                                <Tooltip key={v}>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50/60 border border-blue-200 text-[#2563EB] font-mono text-[10px] font-semibold hover:bg-blue-100 transition-colors">
                                      {`{${v}}`}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="bg-white text-[#0F172A] border border-[#E2E8F0] shadow-[0px_6px_20px_rgba(0,0,0,0.08)] p-3 rounded-[8px] max-w-xs z-50 animate-in fade-in-0 zoom-in-95"
                                  >
                                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#F1F5F9]">
                                      <span className="font-mono text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#DBEAFE]">
                                        {`{${v}}`}
                                      </span>
                                      <span className="text-[12px] font-bold text-[#0F172A]">{sc?.label || v}</span>
                                    </div>
                                    <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">{sc?.description || "Variable shortcut"}</p>
                                    {sc && (
                                      <div className="mt-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px] px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                                        <span className="text-[#64748B] font-medium">Resolves to:</span>
                                        <span className="font-mono font-semibold text-[#2563EB]">
                                          "{sc.sampleValue}"
                                        </span>
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard Text</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-5 px-6 align-middle">
                      <span
                        className={
                          statusStyles[item.status.toLowerCase()] ||
                          "bg-muted text-muted-foreground font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center"
                        }
                      >
                        <span className="capitalize">{item.status}</span>
                      </span>
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
                          <DropdownMenuContent align="end" className="w-44 z-50">
                            <DropdownMenuItem
                              className="gap-2 text-[13px] cursor-pointer"
                              onClick={() => setPreviewTemplate(item)}
                            >
                              <Eye className="size-4 text-blue-600" />
                              View Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                              <Link href={`/organization/email-templates/${item.id}/edit`}>
                                <Pencil className="size-4" />
                                Edit Template
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-[13px] cursor-pointer"
                              onClick={() => handleDuplicate(item.id)}
                            >
                              <Copy className="size-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-[13px] cursor-pointer text-[#2563EB]"
                              onClick={() => {
                                setTestSendTemplate(item);
                                setTestRecipientEmail("");
                              }}
                            >
                              <Send className="size-4" />
                              Test Dispatch
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2 text-[13px] cursor-pointer"
                              onClick={() => setDeleteTemplateId(item.id)}
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

          {/* Desktop Pagination Footer matching Forms & Lead Manager module */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredTemplates.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredTemplates.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredTemplates.length}
              </span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
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
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View - Ultra-Compact List Layout matching Lead Manager */}
        {(!mounted || isLoading) && allTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p className="text-xs text-muted-foreground">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
              <SearchX className="size-6 text-muted-foreground/80" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">
                No templates found
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 lg:hidden w-full">
            {mobileTemplates.map((item: EmailTemplate) => {
              // Generate initials for avatar
              const initials =
                item.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "ET";

              return (
                <div
                  key={item.id}
                  className="bg-card border border-border/80 rounded-xl p-4 md:p-5 flex flex-col gap-4 hover:shadow-xs transition-all duration-200"
                >
                  {/* Row 1: Avatar, Name, Subject & Action */}
                  <div className="flex items-center justify-between gap-4 min-w-0">
                    {/* Avatar & Text block */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Initials Avatar */}
                      <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block mt-0.5">
                          {item.subject}
                        </span>
                      </div>
                    </div>

                    {/* Badge & Action */}
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <span
                        className={
                          statusStyles[item.status.toLowerCase()] ||
                          "bg-muted text-muted-foreground font-medium px-2.5 py-0.5 rounded-full text-xs border-0 inline-flex items-center"
                        }
                      >
                        <span className="capitalize">{item.status}</span>
                      </span>

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

                        <DropdownMenuContent align="end" className="w-44 z-50">
                          <DropdownMenuItem
                            className="gap-2 text-[13px] cursor-pointer"
                            onClick={() => setPreviewTemplate(item)}
                          >
                            <Eye className="size-4 text-blue-600" />
                            View Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-[13px]" asChild>
                            <Link href={`/organization/email-templates/${item.id}/edit`}>
                              <Pencil className="size-4" />
                              Edit Template
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-[13px] cursor-pointer"
                            onClick={() => handleDuplicate(item.id)}
                          >
                            <Copy className="size-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-[13px] cursor-pointer text-[#2563EB]"
                            onClick={() => {
                              setTestSendTemplate(item);
                              setTestRecipientEmail("");
                            }}
                          >
                            <Send className="size-4" />
                            Test Dispatch
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2 text-[13px] cursor-pointer"
                            onClick={() => setDeleteTemplateId(item.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Two-column grid of key details */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-t border-border/40 pt-3 text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Category:
                      </span>
                      <div>
                        <span className={getCategoryStyle(item.category)}>
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-muted-foreground/80 block">
                        Last Modified:
                      </span>
                      <span className="text-foreground/95 font-medium truncate">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString("en-GB")
                          : "No date"}
                      </span>
                    </div>

                    <div className="col-span-2 flex flex-col gap-1.5">
                      <span className="font-medium text-muted-foreground/80 block">
                        Variables & Shortcuts:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.variables && item.variables.length > 0 ? (
                          item.variables.slice(0, 4).map((v: string) => (
                            <span
                              key={v}
                              className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Standard Text</span>
                        )}
                        {item.variables && item.variables.length > 4 && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            +{item.variables.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile & Tablet Load More Footer */}
        {mobileVisibleCount < filteredTemplates.length ? (
          <div className="flex flex-col items-center gap-3 py-4 mt-2 lg:hidden">
            <Button
              variant="outline"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              className="w-full h-10 border border-border bg-background text-foreground font-medium rounded-[8px] hover:bg-accent hover:text-accent-foreground shadow-2xs transition-colors"
            >
              Load More Templates
            </Button>
            <p className="text-xs text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min(mobileVisibleCount, filteredTemplates.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredTemplates.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : filteredTemplates.length > 0 ? (
          <div className="text-center py-4 mt-2 lg:hidden border-t border-border/40">
            <p className="text-xs text-muted-foreground font-normal">
              Showing all{" "}
              <span className="font-medium text-foreground">
                {filteredTemplates.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredTemplates.length}
              </span>{" "}
              entries
            </p>
          </div>
        ) : null}

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this template?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Communications already sent using this template will preserve their original text.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Modal Dialog */}
        {previewTemplate && (
          <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Eye className="size-4 text-[#2563EB]" />
                  Template Preview: {previewTemplate.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Evaluated with live applicant variables and authenticated sender profile.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-4 my-2">
                <div className="pb-3 border-b border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    SUBJECT
                  </span>
                  <h3 className="text-sm md:text-base font-bold text-slate-900">
                    {renderTemplate(previewTemplate.subject, sampleCandidateContext)}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span>
                      Category: <strong className="text-slate-800">{previewTemplate.category}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      Sender: <strong className="text-slate-800">{user?.name || "Admissions Desk"}</strong>
                    </span>
                  </div>
                </div>

                <div className="whitespace-pre-line text-xs md:text-sm text-slate-700 leading-relaxed font-sans">
                  {renderTemplate(previewTemplate.body, sampleCandidateContext)}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)} className="text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-[#2563EB] text-white text-xs gap-1.5"
                  asChild
                >
                  <Link href={`/organization/email-templates/${previewTemplate.id}/edit`}>
                    <Pencil className="size-3.5" />
                    Edit This Template
                  </Link>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Test Send Dialog */}
        {testSendTemplate && (
          <Dialog open={!!testSendTemplate} onOpenChange={() => setTestSendTemplate(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Send className="size-4 text-[#2563EB]" />
                  Dispatch Test Email
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Send a sample email to verify shortcut resolution and formatting.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Recipient Email *</label>
                  <Input
                    type="email"
                    placeholder="e.g. test@example.com"
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Candidate Name</label>
                    <Input
                      value={testCandidateName}
                      onChange={(e) => setTestCandidateName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Application No</label>
                    <Input
                      value={testAppNo}
                      onChange={(e) => setTestAppNo(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                  <p className="font-semibold text-slate-900">
                    Subject:{" "}
                    {renderTemplate(testSendTemplate.subject, {
                      student: testCandidateName,
                      course: "PGDM 2026-28",
                      application_no: testAppNo,
                      date: new Date().toLocaleDateString("en-IN"),
                      sender: user?.name || "Admissions Desk",
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sender: <strong>{user?.name || "Admissions Desk"}</strong>
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setTestSendTemplate(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#2563EB] text-white text-xs gap-1.5"
                  disabled={sendEmailMutation.isPending || !testRecipientEmail}
                  onClick={() => {
                    const ctx = {
                      student: testCandidateName,
                      course: "PGDM 2026-28",
                      application_no: testAppNo,
                      date: new Date().toLocaleDateString("en-IN"),
                      time: "10:00 AM IST",
                      venue: "Main Campus Seminar Hall A",
                      sender: user?.name || "Admissions Desk",
                      organization: "Global Educational Institute",
                    };
                    sendEmailMutation.mutate(
                      {
                        to: testRecipientEmail,
                        subject: renderTemplate(testSendTemplate.subject, ctx),
                        body: renderTemplate(testSendTemplate.body, ctx),
                        category: testSendTemplate.category,
                        templateId: testSendTemplate.id,
                        senderName: user?.name || "Admissions Desk",
                        applicationNo: testAppNo,
                        applicantName: testCandidateName,
                      },
                      {
                        onSuccess: () => setTestSendTemplate(null),
                      }
                    );
                  }}
                >
                  <Send className="size-3.5" />
                  Dispatch Email
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
