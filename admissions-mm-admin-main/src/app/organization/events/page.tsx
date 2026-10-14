"use client";

import * as React from "react";
import Link from "next/link";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  Search,
  Filter,
  Check,
  SearchX,
  Calendar,
  Megaphone,
  Radio,
  Send,
  Eye,
  Bell,
  Mail,
  MessageSquare,
  MapPin,
  Video,
  Clock,
  ArrowUpDown,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  useEvents,
  useDeleteEvent,
  useBroadcastEvent,
} from "@/hooks/use-events";
import { AnnouncementEventItem } from "@/types/events";
import { useAuthStore } from "@/stores/auth-store";

const CATEGORIES = [
  "Exam",
  "Admissions",
  "GD & Interview",
  "Academic",
  "Orientation",
  "Webinar",
  "Holiday",
  "General",
] as const;

const ROLE_OPTIONS = [
  { value: "all", label: "All Audiences" },
  { value: "student", label: "Enrolled Students" },
  { value: "staff", label: "All Staff" },
  { value: "lead", label: "Leads" },
  { value: "applicant", label: "Applicants" },
  { value: "counselor", label: "Counselors" },
  { value: "lead_manager", label: "Lead Managers" },
  { value: "org_admin", label: "Admins" },
  { value: "application_manager", label: "Application Managers" },
  { value: "exam_manager", label: "Exam Managers" },
] as const;

// Exact pill styles matching lead-manager (no red highlight)
const priorityStyles: Record<string, string> = {
  Urgent:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  High: "bg-[#D9770633] text-[#9A3412] dark:bg-orange-500/20 dark:text-orange-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Medium:
    "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Low: "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

const statusStyles: Record<string, string> = {
  Published:
    "bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Scheduled:
    "bg-[#1E40AF33] text-[#1E3A8A] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Draft:
    "bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
  Archived:
    "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0",
};

function formatEventDisplayDate(item: AnnouncementEventItem) {
  if (item.type === "event" && item.eventStartDate) {
    try {
      const d = new Date(item.eventStartDate);
      return format(d, "dd MMM yyyy");
    } catch {
      return item.eventStartDate;
    }
  }
  if (item.scheduledPublishDate) {
    try {
      const d = new Date(item.scheduledPublishDate);
      return format(d, "dd MMM yyyy");
    } catch {
      return item.scheduledPublishDate;
    }
  }
  if (item.createdAt) {
    try {
      const d = new Date(item.createdAt);
      return format(d, "dd MMM yyyy");
    } catch {
      return item.createdAt;
    }
  }
  return "N/A";
}

function getAudienceBadge(role: string) {
  switch (role) {
    case "student":
      return "Students";
    case "lead":
      return "Leads";
    case "applicant":
      return "Applicants";
    case "staff":
      return "All Staff";
    case "lead_manager":
      return "Lead Managers";
    case "application_manager":
      return "Application Managers";
    case "exam_manager":
      return "Exam Managers";
    case "counselor":
      return "Counselors";
    case "org_admin":
      return "Admins";
    case "all":
      return "All Audiences";
    default:
      return role.replace(/_/g, " ");
  }
}

export default function AnnouncementsEventsPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  usePageHeader({
    title: "Announcements & Events",
    description:
      "Publish notices, schedule webinars, exams, and campus events for students, staff, and leads.",
    action: {
      label: "Create",
      href: "/organization/events/create",
    },
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortOrder, setSortOrder] = React.useState<"DESC" | "ASC">("DESC");

  // Advanced Filter Dialog State
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advCategory, setAdvCategory] = React.useState("all");
  const [advPriority, setAdvPriority] = React.useState("all");
  const [advVenueType, setAdvVenueType] = React.useState("all");
  const [advChannel, setAdvChannel] = React.useState("all");

  const [appliedAdvanced, setAppliedAdvanced] = React.useState({
    category: "all",
    priority: "all",
    venueType: "all",
    channel: "all",
  });

  // Poster Lightbox Modal State
  const [lightboxPoster, setLightboxPoster] = React.useState<{
    url: string;
    title: string;
    isPdf?: boolean;
    name?: string;
  } | null>(null);

  // Preview Dialog State
  const [previewItem, setPreviewItem] = React.useState<AnnouncementEventItem | null>(null);
  // Delete Dialog State
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Hook Calls
  const { data: events = [] } = useEvents();
  const deleteEvent = useDeleteEvent();
  const broadcastEvent = useBroadcastEvent();
  // Backend: broadcast needs superadmin/org_admin/application_manager/lead_manager; delete drops lead_manager.
  const currentRole = useAuthStore((s) => s.user?.role) || "";
  const canBroadcast = ["superadmin", "org_admin", "application_manager", "lead_manager"].includes(currentRole);
  const canDelete = ["superadmin", "org_admin", "application_manager"].includes(currentRole);

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    return events.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesLocation = item.venueLocation?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLocation && !matchesCategory) {
          return false;
        }
      }

      // Type Filter
      if (typeFilter !== "all" && item.type !== typeFilter) {
        return false;
      }

      // Role / Audience Filter
      if (roleFilter !== "all") {
        const hasRole =
          item.targetAudience?.includes("all") ||
          item.targetAudience?.includes(roleFilter);
        if (!hasRole) return false;
      }

      // Status Filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Advanced Category Filter
      if (
        appliedAdvanced.category !== "all" &&
        item.category !== appliedAdvanced.category
      ) {
        return false;
      }

      // Advanced Priority Filter
      if (
        appliedAdvanced.priority !== "all" &&
        item.priority !== appliedAdvanced.priority
      ) {
        return false;
      }

      // Advanced Venue Type Filter
      if (
        appliedAdvanced.venueType !== "all" &&
        item.venueType !== appliedAdvanced.venueType
      ) {
        return false;
      }

      // Advanced Channel Filter
      if (appliedAdvanced.channel === "email" && !item.sendEmailBroadcast) return false;
      if (appliedAdvanced.channel === "in_app" && !item.sendInAppNotification) return false;
      if (appliedAdvanced.channel === "whatsapp" && !item.sendWhatsapp) return false;

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
    });
  }, [events, searchQuery, typeFilter, roleFilter, statusFilter, appliedAdvanced, sortOrder]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const mobileItems = React.useMemo(() => {
    return filteredItems.slice(0, mobileVisibleCount);
  }, [filteredItems, mobileVisibleCount]);

  const hasAdvancedFilters =
    appliedAdvanced.category !== "all" ||
    appliedAdvanced.priority !== "all" ||
    appliedAdvanced.venueType !== "all" ||
    appliedAdvanced.channel !== "all";

  function applyAdvancedFilters() {
    setAppliedAdvanced({
      category: advCategory,
      priority: advPriority,
      venueType: advVenueType,
      channel: advChannel,
    });
    setAdvancedOpen(false);
    setCurrentPage(1);
  }

  function resetAdvancedFilters() {
    setAdvCategory("all");
    setAdvPriority("all");
    setAdvVenueType("all");
    setAdvChannel("all");
    setAppliedAdvanced({
      category: "all",
      priority: "all",
      venueType: "all",
      channel: "all",
    });
    setCurrentPage(1);
  }

  function handleDelete(id: string) {
    deleteEvent.mutate(id, {
      onSuccess: () => {
        setDeleteId(null);
      },
    });
  }

  // Statistics Counters
  const stats = React.useMemo(() => {
    const published = events.filter((e) => e.status === "Published").length;
    const scheduled = events.filter((e) => e.status === "Scheduled").length;
    const drafts = events.filter((e) => e.status === "Draft").length;
    const totalEvents = events.filter((e) => e.type === "event").length;
    return { published, scheduled, drafts, totalEvents, total: events.length };
  }, [events]);

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
      (_, i) => startPage + i
    );
  }, [currentPage, totalPages]);

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:px-6 py-2 md:py-4">
        {/* Search & Filter Toolbar - Exactly matching lead-manager */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Section */}
          <div className="flex flex-1 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Search announcements, events, exams, webinars, venues..."
                className="w-full pr-10 h-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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

          {/* Filters + Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Type Select */}
              <div className="flex-1 min-w-0 sm:w-[130px]">
                <Select
                  value={typeFilter}
                  onValueChange={(val) => {
                    setTypeFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="announcement">Announcements</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience / Role Select */}
              <div className="flex-1 min-w-0 sm:w-[150px]">
                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    setRoleFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Select */}
              <div className="flex-1 min-w-0 sm:w-[130px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full h-10" size="lg">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
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
                <span className="sr-only">Advanced Filters</span>
                {hasAdvancedFilters && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                )}
              </Button>

              {/* Sort Order Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative h-[39px] w-[39px] shrink-0"
                    title={`Sorted by ${sortOrder === "DESC" ? "Newest First" : "Oldest First"}`}
                  >
                    <ArrowUpDown className="size-4" />
                    <span className="sr-only">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer font-medium text-xs py-2"
                    onClick={() => {
                      setSortOrder("DESC");
                      setCurrentPage(1);
                    }}
                  >
                    <span>Newest First (Recent)</span>
                    {sortOrder === "DESC" && <Check className="size-4 text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer font-medium text-xs py-2"
                    onClick={() => {
                      setSortOrder("ASC");
                      setCurrentPage(1);
                    }}
                  >
                    <span>Oldest First</span>
                    {sortOrder === "ASC" && <Check className="size-4 text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Advanced Filters Dialog - Matching lead-manager style */}
        <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DialogContent className="sm:max-w-[580px] px-6 bg-white dark:bg-card rounded-2xl gap-5 border border-slate-200 dark:border-border overflow-y-auto max-h-[90vh] text-left">
            {/* Card 1: Content & Audience */}
            <div className="bg-white dark:bg-card shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4 border border-input">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-[#F5F5F5] dark:bg-muted text-foreground border rounded-[10px] flex items-center justify-center shrink-0">
                  <Megaphone className="size-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#0F172A] dark:text-foreground">
                  Content & Category Filters
                </h3>
              </div>

              {/* Category */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Category
                </Label>
                <Select value={advCategory} onValueChange={setAdvCategory}>
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white dark:bg-background text-[#0F172A] dark:text-foreground">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Priority
                </Label>
                <Select value={advPriority} onValueChange={setAdvPriority}>
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white dark:bg-background text-[#0F172A] dark:text-foreground">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Card 2: Venue & Broadcast Channel */}
            <div className="bg-white dark:bg-card shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4 border border-input">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-[#F5F5F5] dark:bg-muted text-foreground border rounded-[10px] flex items-center justify-center shrink-0">
                  <Radio className="size-5" />
                </div>
                <h3 className="text-[17px] font-bold text-[#0F172A] dark:text-foreground">
                  Venue & Communication Channels
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Venue Type
                  </Label>
                  <Select value={advVenueType} onValueChange={setAdvVenueType}>
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white dark:bg-background text-[#0F172A] dark:text-foreground">
                      <SelectValue placeholder="All Venues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Venues</SelectItem>
                      <SelectItem value="in_person">In-Person (Campus)</SelectItem>
                      <SelectItem value="virtual">Virtual (Meet/Zoom)</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Dispatched Via
                  </Label>
                  <Select value={advChannel} onValueChange={setAdvChannel}>
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white dark:bg-background text-[#0F172A] dark:text-foreground">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      <SelectItem value="email">Email Broadcast</SelectItem>
                      <SelectItem value="in_app">In-App Notification</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 justify-start mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetAdvancedFilters}
                className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] dark:text-foreground bg-white dark:bg-muted hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </Button>
              <Button
                onClick={applyAdvancedFilters}
                className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
              >
                Apply Filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Desktop View Table - Compact, non-overflowing table matching lead-manager */}
        <div className="hidden lg:block overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <Table className="w-full">
            <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                <TableHead className="py-3 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto">
                  TITLE
                </TableHead>
                <TableHead className="py-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  CATEGORY
                </TableHead>
                <TableHead className="py-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  AUDIENCE
                </TableHead>
                <TableHead className="py-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  DATE & TIME
                </TableHead>
                <TableHead className="py-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  LOCATION
                </TableHead>
                <TableHead className="py-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  STATUS
                </TableHead>
                <TableHead className="py-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[60px] whitespace-nowrap">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="flex size-11 items-center justify-center rounded-full bg-muted/40">
                        <SearchX className="size-5 text-muted-foreground/80" />
                      </div>
                      <div className="flex flex-col gap-0.5 text-center">
                        <p className="text-sm font-semibold text-foreground">
                          No announcements or events found
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {events.length === 0
                            ? "Get started by publishing your first announcement or scheduling an event."
                            : "Try adjusting your search query, type, or audience filters."}
                        </p>
                      </div>
                      {events.length === 0 && (
                        <Link href="/organization/events/create" className="mt-1">
                          <Button size="sm" className="bg-primary text-primary-foreground gap-1.5 h-8 text-xs cursor-pointer">
                            <Plus className="size-3.5" /> Create
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  const hasPoster = Boolean(item.posterUrl || (item.attachmentType === "image" && item.attachmentUrl));
                  const isPdfDoc = item.attachmentType === "pdf" || item.attachmentName?.toLowerCase().endsWith(".pdf");
                  const posterSrc = item.posterUrl || (item.attachmentType === "image" ? item.attachmentUrl : undefined);

                  return (
                    <TableRow
                      key={item.id}
                      className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors"
                    >
                      {/* POSTER & TITLE with Instant Preview */}
                      <TableCell className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Compact Poster Thumbnail Preview */}
                          {hasPoster && posterSrc ? (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxPoster({
                                  url: posterSrc,
                                  title: item.title,
                                  isPdf: false,
                                  name: item.attachmentName,
                                })
                              }
                              className="group relative size-9 rounded-md overflow-hidden border border-border shrink-0 bg-muted/30 cursor-pointer hover:ring-1 hover:ring-primary transition-all shadow-2xs"
                              title="Click to view full poster preview"
                            >
                              <img
                                src={posterSrc}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="size-3" />
                              </div>
                            </button>
                          ) : isPdfDoc ? (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxPoster({
                                  url: item.attachmentUrl || "",
                                  title: item.title,
                                  isPdf: true,
                                  name: item.attachmentName,
                                })
                              }
                              className="group size-9 rounded-md border border-border bg-muted/40 shrink-0 flex items-center justify-center cursor-pointer hover:border-primary transition-all shadow-2xs text-muted-foreground hover:text-foreground"
                              title="Click to preview PDF document"
                            >
                              <FileText className="size-4" />
                            </button>
                          ) : (
                            <div className="size-9 rounded-md border border-border bg-muted/30 shrink-0 flex items-center justify-center text-muted-foreground/60">
                              {item.type === "event" ? (
                                <Calendar className="size-4 text-blue-500/80" />
                              ) : (
                                <Megaphone className="size-4 text-purple-500/80" />
                              )}
                            </div>
                          )}

                          {/* Text info */}
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <Link
                              href={`/organization/events/edit?id=${item.id}`}
                              className="font-semibold text-foreground hover:underline text-sm tracking-tight truncate block max-w-[280px]"
                              title={item.title}
                            >
                              {item.title}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                              {item.type === "event" ? (
                                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                  Event
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                  Notice
                                </span>
                              )}
                              <span>·</span>
                              <span className="truncate">{item.createdByName || "Admissions"}</span>
                              {(item.sendInAppNotification || item.sendEmailBroadcast || item.sendWhatsapp) && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1">
                                    {item.sendInAppNotification && (
                                      <span title="In-App notification">
                                        <Bell className="size-2.5 text-muted-foreground" />
                                      </span>
                                    )}
                                    {item.sendEmailBroadcast && (
                                      <span title="Email broadcast">
                                        <Mail className="size-2.5 text-blue-600" />
                                      </span>
                                    )}
                                    {item.sendWhatsapp && (
                                      <span title="WhatsApp alert">
                                        <MessageSquare className="size-2.5 text-emerald-600" />
                                      </span>
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* CATEGORY */}
                      <TableCell className="py-3 px-3 align-middle text-xs whitespace-nowrap">
                        <span className="font-medium text-foreground/90">
                          {item.category}
                        </span>
                      </TableCell>

                      {/* TARGET AUDIENCE / ROLES */}
                      <TableCell className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {item.targetAudience?.slice(0, 2).map((role) => (
                            <span
                              key={role}
                              className="bg-muted text-foreground/80 px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium whitespace-nowrap"
                            >
                              {getAudienceBadge(role)}
                            </span>
                          ))}
                          {(item.targetAudience?.length || 0) > 2 && (
                            <span className="text-[10px] text-muted-foreground font-medium self-center">
                              +{item.targetAudience.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* SCHEDULE / EVENT DATE */}
                      <TableCell className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <div className="font-medium text-foreground tracking-tight">
                            {formatEventDisplayDate(item)}
                          </div>
                          {item.eventStartTime && (
                            <div className="text-muted-foreground text-[11px]">
                              {item.eventStartTime} {item.eventEndTime ? `- ${item.eventEndTime}` : ""}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* LOCATION / VENUE */}
                      <TableCell className="py-3 px-3 align-middle text-xs whitespace-nowrap">
                        {item.venueType === "virtual" ? (
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 max-w-[140px] truncate">
                            <Video className="size-3 shrink-0" />
                            <span className="truncate font-medium">Virtual</span>
                          </div>
                        ) : item.venueLocation ? (
                          <div className="flex items-center gap-1 text-foreground/80 max-w-[140px] truncate" title={item.venueLocation}>
                            <MapPin className="size-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{item.venueLocation}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">Notice Board</span>
                        )}
                      </TableCell>

                      {/* STATUS */}
                      <TableCell className="py-3 px-3 align-middle whitespace-nowrap">
                        <span className={statusStyles[item.status] || statusStyles.Draft}>
                          {item.status}
                        </span>
                      </TableCell>

                      {/* ACTION DROPDOWN */}
                      <TableCell className="py-3 px-3 align-middle text-right">
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
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => setPreviewItem(item)}
                              >
                                <Eye className="size-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" asChild>
                                <Link href={`/organization/events/edit?id=${item.id}`}>
                                  <Pencil className="size-4" />
                                  Edit Details
                                </Link>
                              </DropdownMenuItem>
                              {canBroadcast && (
                              <DropdownMenuItem
                                className="gap-2 text-blue-600 focus:text-blue-600 cursor-pointer font-medium"
                                onClick={() => broadcastEvent.mutate(item)}
                              >
                                <Send className="size-4 text-blue-600" />
                                Broadcast Now
                              </DropdownMenuItem>
                              )}
                              {canDelete && <DropdownMenuSeparator />}
                              {canDelete && (
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2 cursor-pointer"
                                onClick={() => setDeleteId(item.id)}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Desktop Pagination Footer - Matching lead-manager with NO red highlight */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-3 px-4 md:px-6 gap-3">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredItems.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredItems.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredItems.length}
              </span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  className="h-8.5 px-3 border border-border/80 bg-background text-foreground text-xs font-normal rounded-[6px] hover:bg-muted/30 hover:text-foreground dark:hover:bg-muted/10 transition-colors shadow-2xs"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {visiblePages.map((page) => {
                    const isActive = currentPage === page;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-8.5 w-8.5 p-0 text-xs border shadow-2xs rounded-[6px] transition-colors ${
                          isActive
                            ? "bg-primary border-primary text-primary-foreground font-semibold shadow-xs"
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
                  className="h-8.5 px-3 border border-border/80 bg-background text-foreground text-xs font-normal rounded-[6px] hover:bg-muted/30 hover:text-foreground dark:hover:bg-muted/10 transition-colors shadow-2xs"
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

        {/* Mobile View Cards - Compact matching lead-manager cards */}
        <div className="flex flex-col gap-3 lg:hidden">
          {mobileItems.map((item) => {
            const hasPoster = Boolean(item.posterUrl || (item.attachmentType === "image" && item.attachmentUrl));
            const isPdfDoc = item.attachmentType === "pdf" || item.attachmentName?.toLowerCase().endsWith(".pdf");
            const posterSrc = item.posterUrl || (item.attachmentType === "image" ? item.attachmentUrl : undefined);

            return (
              <div
                key={item.id}
                className="bg-card border border-border/80 rounded-xl p-3.5 flex flex-col gap-3 hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Compact 40px Thumbnail */}
                    {hasPoster && posterSrc ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxPoster({
                            url: posterSrc,
                            title: item.title,
                            isPdf: false,
                            name: item.attachmentName,
                          })
                        }
                        className="size-10 rounded-lg overflow-hidden border border-border shrink-0 bg-muted/30 cursor-pointer"
                        title="View poster"
                      >
                        <img src={posterSrc} alt={item.title} className="w-full h-full object-cover" />
                      </button>
                    ) : isPdfDoc ? (
                      <div className="size-10 rounded-lg border border-border bg-muted/40 shrink-0 flex items-center justify-center text-muted-foreground">
                        <FileText className="size-5" />
                      </div>
                    ) : (
                      <div className="size-10 rounded-lg border border-border bg-muted/30 shrink-0 flex items-center justify-center">
                        {item.type === "event" ? (
                          <Calendar className="size-5 text-blue-500/80" />
                        ) : (
                          <Megaphone className="size-5 text-purple-500/80" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0">
                      <Link
                        href={`/organization/events/edit?id=${item.id}`}
                        className="font-semibold text-foreground hover:underline text-sm tracking-tight truncate block"
                      >
                        {item.title}
                      </Link>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {item.category} · {formatEventDisplayDate(item)}
                      </span>
                    </div>
                  </div>

                  {/* Badge & Action */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={statusStyles[item.status] || statusStyles.Draft}>
                      {item.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewItem(item)}>
                          <Eye className="size-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/organization/events/edit?id=${item.id}`}>
                            <Pencil className="size-4 mr-2" /> Edit Details
                          </Link>
                        </DropdownMenuItem>
                        {canDelete && (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Compact bottom info strip */}
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/40 pt-2 text-muted-foreground">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Audience:</span>
                    <span className="font-medium text-foreground">
                      {item.targetAudience?.map(getAudienceBadge).join(", ") || "All"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Location:</span>
                    <span className="font-medium text-foreground truncate block">
                      {item.venueType === "virtual" ? "Virtual Meeting" : item.venueLocation || "Notice Board"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Load More Footer */}
          {mobileVisibleCount < filteredItems.length && (
            <div className="flex flex-col items-center gap-3 py-4 mt-2">
              <Button
                variant="outline"
                onClick={() => setMobileVisibleCount((prev) => prev + 5)}
                className="w-full h-10 border border-border bg-background text-foreground font-medium rounded-[8px] hover:bg-accent hover:text-accent-foreground shadow-2xs transition-colors"
              >
                Load More
              </Button>
              <p className="text-xs text-muted-foreground font-normal">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {Math.min(mobileVisibleCount, filteredItems.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {filteredItems.length}
                </span>{" "}
                entries
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Poster Lightbox Dialog */}
      <Dialog
        open={lightboxPoster !== null}
        onOpenChange={(open) => !open && setLightboxPoster(null)}
      >
        <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden rounded-2xl bg-card border border-border shadow-xl">
          {lightboxPoster && (
            <div className="flex flex-col">
              <div className="p-4 pr-14 border-b border-border flex items-center justify-between gap-3 bg-card">
                <div className="min-w-0 pr-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {lightboxPoster.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {lightboxPoster.name || "Event Poster / Circular Attachment"}
                  </p>
                </div>
                {lightboxPoster.url && (
                  <Button variant="outline" size="sm" asChild className="h-8 px-2.5 text-xs shrink-0 cursor-pointer">
                    <a href={lightboxPoster.url} target="_blank" rel="noreferrer">
                      Open Original <ExternalLink className="size-3.5 ml-1.5" />
                    </a>
                  </Button>
                )}
              </div>

              {lightboxPoster.isPdf ? (
                <div className="p-8 flex flex-col items-center justify-center gap-4 bg-muted/20">
                  <FileText className="size-16 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground text-center">
                    {lightboxPoster.name || "PDF Document"}
                  </p>
                  <Button asChild size="sm" className="cursor-pointer">
                    <a href={lightboxPoster.url} target="_blank" rel="noreferrer">
                      Open PDF in New Tab
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="bg-muted/30 dark:bg-zinc-950/80 flex items-center justify-center max-h-[75vh] p-4 overflow-hidden">
                  <img
                    src={lightboxPoster.url}
                    alt={lightboxPoster.title}
                    className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Detail / Preview Modal */}
      <Dialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-[620px] rounded-[16px] p-6 max-h-[85vh] overflow-y-auto">
          {previewItem && (
            <div className="flex flex-col gap-4">
              {/* If poster exists, show full banner */}
              {previewItem.posterUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden border border-border -mt-1 bg-muted/40">
                  <img
                    src={previewItem.posterUrl}
                    alt={previewItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className={statusStyles[previewItem.status]}>
                  {previewItem.status}
                </span>
                <span className={priorityStyles[previewItem.priority]}>
                  {previewItem.priority} Priority
                </span>
                <Badge variant="outline" className="text-xs">
                  {previewItem.category}
                </Badge>
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {previewItem.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Published by {previewItem.createdByName || "Admissions Team"} · {formatEventDisplayDate(previewItem)}
                </p>
              </div>

              {/* Event Schedule Info */}
              {(previewItem.eventStartDate || previewItem.venueLocation) && (
                <div className="bg-muted/40 rounded-[10px] p-3.5 flex flex-col gap-2 border border-border/60 text-xs">
                  {previewItem.eventStartDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-primary shrink-0" />
                      <span>
                        <strong>Event Date:</strong> {previewItem.eventStartDate}{" "}
                        {previewItem.eventEndDate && previewItem.eventEndDate !== previewItem.eventStartDate
                          ? `to ${previewItem.eventEndDate}`
                          : ""}
                        {previewItem.eventStartTime ? ` (${previewItem.eventStartTime} - ${previewItem.eventEndTime || ""})` : ""}
                      </span>
                    </div>
                  )}
                  {previewItem.venueLocation && (
                    <div className="flex items-center gap-2">
                      {previewItem.venueType === "virtual" ? (
                        <Video className="size-4 text-blue-500 shrink-0" />
                      ) : (
                        <MapPin className="size-4 text-emerald-500 shrink-0" />
                      )}
                      <span>
                        <strong>Location:</strong> {previewItem.venueLocation}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Body Content */}
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap border-t border-border/60 pt-3">
                {previewItem.description}
              </div>

              {/* Audience Tagging */}
              <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 text-xs">
                <span className="font-semibold text-muted-foreground">Target Recipients:</span>
                <div className="flex flex-wrap gap-1.5">
                  {previewItem.targetAudience?.map((r) => (
                    <span key={r} className="bg-muted px-2.5 py-1 rounded text-xs font-medium">
                      {getAudienceBadge(r)}
                    </span>
                  ))}
                  {previewItem.targetCourseName && (
                    <span className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 rounded text-xs font-medium">
                      Course: {previewItem.targetCourseName}
                    </span>
                  )}
                  {previewItem.targetLeadStages && previewItem.targetLeadStages.length > 0 && (
                    <span className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded text-xs font-medium">
                      Lead stages: {previewItem.targetLeadStages.join(", ")}
                    </span>
                  )}
                  {previewItem.targetLeadSources && previewItem.targetLeadSources.length > 0 && (
                    <span className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded text-xs font-medium">
                      Lead sources: {previewItem.targetLeadSources.join(", ")}
                    </span>
                  )}
                  {previewItem.targetApplicationStatuses && previewItem.targetApplicationStatuses.length > 0 && (
                    <span className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2.5 py-1 rounded text-xs font-medium">
                      Application status: {previewItem.targetApplicationStatuses.join(", ")}
                    </span>
                  )}
                  {previewItem.targetAcademicSession && (
                    <span className="bg-muted px-2.5 py-1 rounded text-xs font-medium">
                      Session: {previewItem.targetAcademicSession}
                    </span>
                  )}
                  {previewItem.targetBranchIds && previewItem.targetBranchIds.length > 0 && (
                    <span className="bg-muted px-2.5 py-1 rounded text-xs font-medium">
                      {previewItem.targetBranchIds.length} branch(es)
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery summary (in-app / email / WhatsApp, also logged in Communications) */}
              {previewItem.deliveryStatus && (
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Delivery: <span className="capitalize text-foreground">{previewItem.deliveryStatus.replace(/_/g, " ")}</span>
                    {previewItem.lastDeliveredAt && ` · ${format(new Date(previewItem.lastDeliveredAt), "dd MMM yyyy, hh:mm a")}`}
                  </span>
                  {previewItem.deliveryStats && (
                    <div className="flex flex-wrap gap-1.5">
                      {previewItem.deliveryStats.recipients && (
                        <span className="bg-muted px-2.5 py-1 rounded font-medium">
                          Recipients: {previewItem.deliveryStats.recipients.staff ?? 0} staff · {previewItem.deliveryStats.recipients.students ?? 0} students · {previewItem.deliveryStats.recipients.leads ?? 0} leads · {previewItem.deliveryStats.recipients.applicants ?? 0} applicants
                        </span>
                      )}
                      {typeof previewItem.deliveryStats.inApp === "number" && (
                        <span className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 rounded font-medium">
                          In-app: {previewItem.deliveryStats.inApp}
                        </span>
                      )}
                      {previewItem.deliveryStats.email && (previewItem.deliveryStats.email.sent > 0 || previewItem.deliveryStats.email.failed > 0) && (
                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded font-medium">
                          Email: {previewItem.deliveryStats.email.sent} sent, {previewItem.deliveryStats.email.failed} failed
                        </span>
                      )}
                      {previewItem.deliveryStats.whatsapp && (previewItem.deliveryStats.whatsapp.sent > 0 || previewItem.deliveryStats.whatsapp.failed > 0) && (
                        <span className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-2.5 py-1 rounded font-medium">
                          WhatsApp: {previewItem.deliveryStats.whatsapp.sent} sent, {previewItem.deliveryStats.whatsapp.failed} failed
                        </span>
                      )}
                      {previewItem.deliveryStats.error && (
                        <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded font-medium">{previewItem.deliveryStats.error}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Attachment link if exists */}
              {previewItem.attachmentName && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <span className="font-medium">{previewItem.attachmentName}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={previewItem.attachmentUrl || "#"} target="_blank" rel="noreferrer">
                      Download <ExternalLink className="size-3.5 ml-1" />
                    </a>
                  </Button>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                <Button
                  variant="outline"
                  onClick={() => setPreviewItem(null)}
                >
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/organization/events/edit?id=${previewItem.id}`}>
                    <Pencil className="size-3.5 mr-1.5" /> Edit Event
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action cannot be undone. This announcement or event will be permanently removed from staff and student views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium border border-border bg-background text-foreground hover:bg-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto h-9.5 rounded-[8px] text-xs font-medium bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => {
                if (deleteId) handleDelete(deleteId);
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
