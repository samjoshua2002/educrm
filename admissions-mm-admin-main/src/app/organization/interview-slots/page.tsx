"use client";

import * as React from "react";
import {
  Plus,
  Layers,
  Lock,
  Unlock,
  Ban,
  Trash2,
  MapPin,
  Video,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Calendar,
  Clock,
  X,
  CalendarPlus,
  CalendarRange,
  Users,
  CheckCircle2,
  Search,
  RotateCcw,
  EllipsisVertical,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { usePageHeaderStore } from "@/stores/page-header-store";
import { useTeam } from "@/hooks/use-team";
import { useLocations } from "@/hooks/use-locations";
import {
  useInterviewSlots,
  useCreateSlot,
  useBulkCreateSlots,
  useBlockSlot,
  useUnblockSlot,
  useCancelSlot,
  useDeleteSlot,
  useUpdateSlot,
  type InterviewSlot,
} from "@/hooks/use-interviews";

// Helper for rendering badges matching lead-manager
function renderStatusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "available") {
    return (
      <span className="bg-[#05966933] text-[#065F46] dark:bg-emerald-500/20 dark:text-emerald-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
        Available
      </span>
    );
  }
  if (s === "booked") {
    return (
      <span className="bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
        Booked
      </span>
    );
  }
  if (s === "blocked") {
    return (
      <span className="bg-[#FEF3C7] text-[#9A3412] dark:bg-amber-500/20 dark:text-amber-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
        Blocked
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-500/20 dark:text-red-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
        Cancelled
      </span>
    );
  }
  return (
    <span className="bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
      {status || "Unknown"}
    </span>
  );
}

function renderTypeBadge(type?: string) {
  const t = (type || "").toUpperCase();
  if (t === "GD") {
    return (
      <span className="bg-[#EDE9FE] text-[#6D28D9] dark:bg-purple-500/20 dark:text-purple-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
        GD
      </span>
    );
  }
  return (
    <span className="bg-[#DBEAFE] text-[#1D4ED8] dark:bg-blue-500/20 dark:text-blue-300 font-medium px-2.5 py-0.5 rounded-full text-xs border-0 whitespace-nowrap">
      PI
    </span>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ISO timestamp -> "HH:MM" in local time, for <input type="time">
function toTimeInput(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function InterviewSlotsPage() {
  const { data: teamResponse } = useTeam();
  const teamMembers = (teamResponse as any)?.data || [];

  const { data: interviewLocations } = useLocations({
    type: "Interview",
    isActive: true,
  });

  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [interviewerFilter, setInterviewerFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  const { data: slots, isLoading } = useInterviewSlots({
    interviewerId: interviewerFilter !== "all" ? interviewerFilter : undefined,
    interviewType: typeFilter !== "all" ? (typeFilter as "GD" | "PI") : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, interviewerFilter, typeFilter, statusFilter]);

  const blockSlot = useBlockSlot();
  const unblockSlot = useUnblockSlot();
  const cancelSlot = useCancelSlot();
  const deleteSlot = useDeleteSlot();

  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    await cancelSlot.mutateAsync(cancelTargetId);
    setCancelTargetId(null);
  };

  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteSlot.mutateAsync(deleteTargetId);
    setDeleteTargetId(null);
  };

  // Edit slot dialog
  const updateSlot = useUpdateSlot();
  const [editForm, setEditForm] = React.useState<{
    id: string;
    interviewerId: string;
    interviewType: "GD" | "PI";
    slotDate: string;
    startTime: string;
    endTime: string;
    location: string;
    mode: "In-person" | "Virtual";
    meetingLink: string;
  } | null>(null);

  const openEdit = (s: InterviewSlot) => {
    setEditForm({
      id: s.id,
      interviewerId: s.interviewerId,
      interviewType: s.interviewType,
      slotDate: s.slotDate,
      startTime: toTimeInput(s.startTime),
      endTime: toTimeInput(s.endTime),
      location: s.location || "",
      mode: s.mode,
      meetingLink: s.meetingLink || "",
    });
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    await updateSlot.mutateAsync({
      id: editForm.id,
      data: {
        interviewerId: editForm.interviewerId,
        interviewType: editForm.interviewType,
        slotDate: editForm.slotDate,
        startTime: new Date(`${editForm.slotDate}T${editForm.startTime}`).toISOString(),
        endTime: new Date(`${editForm.slotDate}T${editForm.endTime}`).toISOString(),
        location: editForm.mode === "Virtual" ? undefined : editForm.location || undefined,
        mode: editForm.mode,
        meetingLink: editForm.mode === "Virtual" ? editForm.meetingLink || undefined : undefined,
      },
    });
    setEditForm(null);
  };

  // Single-slot create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const createSlot = useCreateSlot();
  const [singleForm, setSingleForm] = React.useState({
    interviewerId: "",
    interviewType: "GD" as "GD" | "PI",
    slotDate: "",
    startTime: "",
    endTime: "",
    location: "",
    mode: "In-person" as "In-person" | "Virtual",
    meetingLink: "",
  });

  const handleCreateSingle = async () => {
    await createSlot.mutateAsync({
      interviewerId: singleForm.interviewerId,
      interviewType: singleForm.interviewType,
      slotDate: singleForm.slotDate,
      startTime: new Date(`${singleForm.slotDate}T${singleForm.startTime}`).toISOString(),
      endTime: new Date(`${singleForm.slotDate}T${singleForm.endTime}`).toISOString(),
      location: singleForm.mode === "Virtual" ? undefined : singleForm.location || undefined,
      mode: singleForm.mode,
      meetingLink: singleForm.mode === "Virtual" ? singleForm.meetingLink || undefined : undefined,
    });
    setCreateOpen(false);
    setSingleForm({
      interviewerId: "",
      interviewType: "GD",
      slotDate: "",
      startTime: "",
      endTime: "",
      location: "",
      mode: "In-person",
      meetingLink: "",
    });
  };

  // Bulk create dialog
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const bulkCreateSlots = useBulkCreateSlots();
  const [bulkForm, setBulkForm] = React.useState({
    interviewerId: "",
    interviewType: "GD" as "GD" | "PI",
    slotDate: "",
    dayStartTime: "",
    dayEndTime: "",
    slotDurationMinutes: "30",
    location: "",
    mode: "In-person" as "In-person" | "Virtual",
    meetingLink: "",
  });

  const handleBulkCreate = async () => {
    await bulkCreateSlots.mutateAsync({
      interviewerId: bulkForm.interviewerId,
      interviewType: bulkForm.interviewType,
      slotDate: bulkForm.slotDate,
      dayStartTime: new Date(`${bulkForm.slotDate}T${bulkForm.dayStartTime}`).toISOString(),
      dayEndTime: new Date(`${bulkForm.slotDate}T${bulkForm.dayEndTime}`).toISOString(),
      slotDurationMinutes: Number(bulkForm.slotDurationMinutes),
      location: bulkForm.mode === "Virtual" ? undefined : bulkForm.location || undefined,
      mode: bulkForm.mode,
      meetingLink: bulkForm.mode === "Virtual" ? bulkForm.meetingLink || undefined : undefined,
    });
    setBulkOpen(false);
    setBulkForm({
      interviewerId: "",
      interviewType: "GD",
      slotDate: "",
      dayStartTime: "",
      dayEndTime: "",
      slotDurationMinutes: "30",
      location: "",
      mode: "In-person",
      meetingLink: "",
    });
  };

  // Register Header actions into DynamicHeader Layout
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  React.useEffect(() => {
    setHeader({
      title: "Interview Slots",
      description: "Create and manage GD/PI interview slots per interviewer.",
      customRightNode: (
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 h-9 px-3.5 border-[#D4D4D4] bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-[8px] text-[13px] shadow-2xs cursor-pointer"
          >
            <Layers className="size-4 text-slate-500" />
            <span className="hidden sm:inline">Bulk Create</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-[#ea2525] hover:bg-[#bb1e1e] text-white font-medium rounded-[8px] text-[13px] shadow-xs cursor-pointer border-0"
          >
            <Plus className="size-4" />
            <span>Add Slot</span>
          </Button>
        </div>
      ),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  // Client-side text search & filter
  const allSlots = React.useMemo(() => slots || [], [slots]);

  const filteredSlots = React.useMemo(() => {
    let result = allSlots;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const interviewerName = (s.interviewer?.name || s.interviewerId || "").toLowerCase();
        const location = (s.location || "").toLowerCase();
        const mode = (s.mode || "").toLowerCase();
        return (
          interviewerName.includes(q) ||
          location.includes(q) ||
          mode.includes(q) ||
          s.slotDate.includes(q)
        );
      });
    }
    return result;
  }, [allSlots, searchQuery]);

  // Slot statistics
  const stats = React.useMemo(() => {
    const total = allSlots.length;
    const available = allSlots.filter((s) => (s.status || "").toLowerCase() === "available").length;
    const booked = allSlots.filter((s) => (s.status || "").toLowerCase() === "booked").length;
    const blocked = allSlots.filter((s) => (s.status || "").toLowerCase() === "blocked").length;
    return { total, available, booked, blocked };
  }, [allSlots]);

  const hasActiveFilters =
    searchQuery !== "" ||
    interviewerFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setInterviewerFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const paginatedSlots = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSlots.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSlots, currentPage]);

  const totalPages = Math.ceil(filteredSlots.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const mobileSlots = React.useMemo(() => {
    return filteredSlots.slice(0, mobileVisibleCount);
  }, [filteredSlots, mobileVisibleCount]);

  const visiblePages = React.useMemo(() => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    for (let i = adjustedStart; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-full min-w-0">
      {/* Top Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Calendar className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Slots
            </span>
            <span className="text-xl font-bold text-slate-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available
            </span>
            <span className="text-xl font-bold text-emerald-700">{stats.available}</span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Booked
            </span>
            <span className="text-xl font-bold text-blue-700">{stats.booked}</span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="size-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Blocked
            </span>
            <span className="text-xl font-bold text-amber-700">{stats.blocked}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar Card */}
      <div className="border border-[#e5e5e5] rounded-[12px] bg-white p-4 md:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Text Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search interviewer or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-[#D4D4D4] rounded-[8px] bg-white text-sm"
            />
          </div>

          {/* Interviewer filter */}
          <div className="w-full sm:w-[200px]">
            <Select value={interviewerFilter} onValueChange={setInterviewerFilter}>
              <SelectTrigger className="w-full h-10 border-[#D4D4D4] rounded-[8px] bg-white text-[13px]">
                <SelectValue placeholder="All Interviewers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Interviewers</SelectItem>
                {teamMembers.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div className="w-[130px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full h-10 border-[#D4D4D4] rounded-[8px] bg-white text-[13px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="GD">GD</SelectItem>
                <SelectItem value="PI">PI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div className="w-[140px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full h-10 border-[#D4D4D4] rounded-[8px] bg-white text-[13px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Booked">Booked</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-10 text-slate-500 hover:text-slate-800 text-xs gap-1.5 px-3 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Slots Table & Cards container */}
      <div className="border border-border bg-card rounded-[12px] shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col w-full max-w-full">
        {/* Desktop Table View */}
        <div className="hidden lg:block w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Interviewer
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Type
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Date
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Time Slot
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Location / Mode
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Status
                </TableHead>
                <TableHead className="py-4 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[85px] whitespace-nowrap">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-500 font-medium">
                    <Loader2 className="size-6 animate-spin text-primary inline mr-2" />
                    Loading interview slots...
                  </TableCell>
                </TableRow>
              ) : filteredSlots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-500 font-medium">
                    {hasActiveFilters
                      ? "No interview slots match your filters."
                      : 'No interview slots found. Click "Add Slot" or "Bulk Create" to create some.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSlots.map((s: InterviewSlot) => {
                  const interviewerName = s.interviewer?.name || s.interviewerId || "Assigned Faculty";

                  const statusLower = (s.status || "").toLowerCase();
                  const isAvailable = statusLower === "available";
                  const isBlocked = statusLower === "blocked";
                  const isBooked = statusLower === "booked";
                  const isCancelled = statusLower === "cancelled";

                  return (
                    <TableRow
                      key={s.id}
                      className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors h-[64px]"
                    >
                      {/* Interviewer column — clean text without circular avatar profile icon */}
                      <TableCell className="py-4 px-6 align-middle">
                        <span className="font-semibold text-foreground text-[14px] whitespace-nowrap">
                          {interviewerName}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 px-6 align-middle">
                        {renderTypeBadge(s.interviewType)}
                      </TableCell>

                      <TableCell className="py-4 px-6 align-middle text-foreground/80 text-[14px] font-normal whitespace-nowrap">
                        {formatDate(s.slotDate)}
                      </TableCell>

                      <TableCell className="py-4 px-6 align-middle text-foreground/80 text-[14px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="size-3.5 text-muted-foreground" />
                          <span>
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 align-middle text-foreground/80 text-[14px]">
                        <div className="flex items-center gap-1.5 text-sm">
                          {s.mode === "Virtual" ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium whitespace-nowrap">
                              <Video className="size-3.5 text-blue-500" />
                              Virtual {s.meetingLink ? "(Link set)" : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 whitespace-nowrap">
                              <MapPin className="size-3.5 text-slate-400" />
                              {s.location || "In-person"}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 px-6 align-middle">
                        {renderStatusBadge(s.status)}
                      </TableCell>

                      <TableCell className="py-4 px-4 align-middle text-right">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="data-[state=open]:bg-muted text-muted-foreground flex size-8 rounded-md hover:bg-muted cursor-pointer"
                                size="icon"
                              >
                                <EllipsisVertical className="size-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg border border-slate-200 rounded-lg p-1.5 z-50">
                              <DropdownMenuItem
                                className="gap-2.5 cursor-pointer font-medium text-xs px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                onClick={() => openEdit(s)}
                              >
                                <Pencil className="size-3.5 text-slate-500" />
                                Edit Slot
                              </DropdownMenuItem>

                              {isAvailable && (
                                <>
                                  <DropdownMenuItem
                                    className="gap-2.5 text-amber-600 focus:text-amber-700 hover:bg-amber-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                    onClick={() => blockSlot.mutate(s.id)}
                                  >
                                    <Lock className="size-3.5 text-amber-600" />
                                    Block Slot
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2.5 text-orange-600 focus:text-orange-700 hover:bg-orange-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                    onClick={() => setCancelTargetId(s.id)}
                                  >
                                    <Ban className="size-3.5 text-orange-600" />
                                    Cancel Slot
                                  </DropdownMenuItem>
                                </>
                              )}

                              {isBlocked && (
                                <>
                                  <DropdownMenuItem
                                    className="gap-2.5 text-emerald-600 focus:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                    onClick={() => unblockSlot.mutate(s.id)}
                                  >
                                    <Unlock className="size-3.5 text-emerald-600" />
                                    Unblock Slot
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2.5 text-orange-600 focus:text-orange-700 hover:bg-orange-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                    onClick={() => setCancelTargetId(s.id)}
                                  >
                                    <Ban className="size-3.5 text-orange-600" />
                                    Cancel Slot
                                  </DropdownMenuItem>
                                </>
                              )}

                              {isBooked && (
                                <DropdownMenuItem
                                  className="gap-2.5 text-orange-600 focus:text-orange-700 hover:bg-orange-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                  onClick={() => setCancelTargetId(s.id)}
                                >
                                  <Ban className="size-3.5 text-orange-600" />
                                  Cancel Slot
                                </DropdownMenuItem>
                              )}

                              {isCancelled && (
                                <DropdownMenuItem
                                  className="gap-2.5 text-emerald-600 focus:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                  onClick={() => unblockSlot.mutate(s.id)}
                                >
                                  <Unlock className="size-3.5 text-emerald-600" />
                                  Re-open Slot
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator className="my-1 bg-slate-100" />
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2.5 text-rose-600 focus:text-rose-700 hover:bg-rose-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                onClick={() => setDeleteTargetId(s.id)}
                              >
                                <Trash2 className="size-3.5 text-rose-600" />
                                Delete Slot
                              </DropdownMenuItem>
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
        </div>

        {/* Mobile View - Responsive Cards */}
        {filteredSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 border border-border/80 bg-card rounded-xl lg:hidden text-center px-4 w-full">
            <p className="text-sm font-semibold text-foreground">No interview slots found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 lg:hidden w-full p-4 bg-muted/10">
            {mobileSlots.map((s: InterviewSlot) => {
              const interviewerName = s.interviewer?.name || s.interviewerId || "Assigned Faculty";

              const statusLower = (s.status || "").toLowerCase();
              const isAvailable = statusLower === "available";
              const isBlocked = statusLower === "blocked";
              const isBooked = statusLower === "booked";
              const isCancelled = statusLower === "cancelled";

              return (
                <div
                  key={s.id}
                  className="bg-card border border-border/80 rounded-xl p-4 flex flex-col gap-3 hover:shadow-xs transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground text-sm tracking-tight truncate block">
                        {interviewerName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {formatDate(s.slotDate)} · {formatTime(s.startTime)} – {formatTime(s.endTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderStatusBadge(s.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-muted-foreground flex size-8 rounded-md hover:bg-muted cursor-pointer"
                            size="icon"
                          >
                            <EllipsisVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg border border-slate-200 rounded-lg p-1.5 z-50">
                          <DropdownMenuItem
                            className="gap-2.5 cursor-pointer font-medium text-xs px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="size-3.5 text-slate-500" />
                            Edit Slot
                          </DropdownMenuItem>

                          {isAvailable && (
                            <>
                              <DropdownMenuItem
                                className="gap-2.5 text-amber-600 focus:text-amber-700 hover:bg-amber-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                onClick={() => blockSlot.mutate(s.id)}
                              >
                                <Lock className="size-3.5 text-amber-600" />
                                Block Slot
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2.5 text-orange-600 focus:text-orange-700 hover:bg-orange-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                onClick={() => setCancelTargetId(s.id)}
                              >
                                <Ban className="size-3.5 text-orange-600" />
                                Cancel Slot
                              </DropdownMenuItem>
                            </>
                          )}

                          {isBlocked && (
                            <>
                              <DropdownMenuItem
                                className="gap-2.5 text-emerald-600 focus:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                onClick={() => unblockSlot.mutate(s.id)}
                              >
                                <Unlock className="size-3.5 text-emerald-600" />
                                Unblock Slot
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2.5 text-orange-600 focus:text-orange-700 hover:bg-orange-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                                onClick={() => setCancelTargetId(s.id)}
                              >
                                <Ban className="size-3.5 text-orange-600" />
                                Cancel Slot
                              </DropdownMenuItem>
                            </>
                          )}

                          {isBooked && (
                            <DropdownMenuItem
                              className="gap-2.5 text-orange-600 focus:text-orange-700 hover:bg-orange-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                              onClick={() => setCancelTargetId(s.id)}
                            >
                              <Ban className="size-3.5 text-orange-600" />
                              Cancel Slot
                            </DropdownMenuItem>
                          )}

                          {isCancelled && (
                            <DropdownMenuItem
                              className="gap-2.5 text-emerald-600 focus:text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                              onClick={() => unblockSlot.mutate(s.id)}
                            >
                              <Unlock className="size-3.5 text-emerald-600" />
                              Re-open Slot
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator className="my-1 bg-slate-100" />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2.5 text-rose-600 focus:text-rose-700 hover:bg-rose-50 cursor-pointer font-medium text-xs px-3 py-2 rounded-md transition-colors"
                            onClick={() => setDeleteTargetId(s.id)}
                          >
                            <Trash2 className="size-3.5 text-rose-600" />
                            Delete Slot
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    {renderTypeBadge(s.interviewType)}
                    <div className="flex items-center gap-1">
                      {s.mode === "Virtual" ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                          <Video className="size-3 text-blue-500" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <MapPin className="size-3 text-slate-400" />
                          {s.location || "In-person"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {mobileVisibleCount < filteredSlots.length && (
              <Button
                variant="outline"
                className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm mt-2 cursor-pointer"
                onClick={() => setMobileVisibleCount((prev) => prev + 5)}
              >
                Load More Slots
              </Button>
            )}
          </div>
        )}

        {/* Desktop Pagination Footer matching lead-manager */}
        {filteredSlots.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredSlots.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, filteredSlots.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{filteredSlots.length}</span>{" "}
              entries
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs cursor-pointer"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {visiblePages.map((page) => {
                    const isActive = page === currentPage;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors cursor-pointer ${
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
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 hover:text-[var(--primary)] dark:hover:bg-muted/10 transition-colors shadow-2xs cursor-pointer"
                  onClick={() => {
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Add Single Slot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[580px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          {/* Header with styled Icon and Close Button placed at right end */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <CalendarPlus className="size-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#0F172A]">Add Interview Slot</h3>
                <p className="text-xs text-slate-500">Configure a single interview time slot for an interviewer</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Interviewer */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Interviewer *
              </Label>
              <Select
                value={singleForm.interviewerId}
                onValueChange={(v) => setSingleForm({ ...singleForm, interviewerId: v })}
              >
                <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                  <SelectValue placeholder="Select faculty / interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.role ? `(${m.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type & Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Type *
                </Label>
                <Select
                  value={singleForm.interviewType}
                  onValueChange={(v) =>
                    setSingleForm({ ...singleForm, interviewType: v as "GD" | "PI" })
                  }
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GD">Group Discussion (GD)</SelectItem>
                    <SelectItem value="PI">Personal Interview (PI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Mode *
                </Label>
                <Select
                  value={singleForm.mode}
                  onValueChange={(v) =>
                    setSingleForm({ ...singleForm, mode: v as "In-person" | "Virtual" })
                  }
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In-person">In-person</SelectItem>
                    <SelectItem value="Virtual">Virtual (Online)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date, Start Time, End Time with right-aligned icons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Date *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="date"
                    value={singleForm.slotDate}
                    className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setSingleForm({ ...singleForm, slotDate: e.target.value })}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Start Time *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="time"
                    value={singleForm.startTime}
                    className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setSingleForm({ ...singleForm, startTime: e.target.value })}
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  End Time *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="time"
                    value={singleForm.endTime}
                    className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setSingleForm({ ...singleForm, endTime: e.target.value })}
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Location or Meeting Link */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                {singleForm.mode === "Virtual" ? "Meeting URL / Link" : "Venue / Location"}
              </Label>
              {singleForm.mode === "Virtual" ? (
                <div className="relative flex items-center">
                  <Video className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={singleForm.meetingLink}
                    className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm bg-white text-[#0F172A] placeholder:text-slate-400"
                    placeholder="https://meet.google.com/... or Zoom link"
                    onChange={(e) => setSingleForm({ ...singleForm, meetingLink: e.target.value })}
                  />
                </div>
              ) : (
                <Select
                  value={singleForm.location}
                  onValueChange={(v) => setSingleForm({ ...singleForm, location: v })}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue
                      placeholder={
                        (interviewLocations || []).length === 0
                          ? "No interview locations configured (Settings)"
                          : "Select interview location"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(interviewLocations || []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.city ? `— ${loc.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Dialog Action Buttons - Blue Rounded */}
          <div className="flex items-center gap-3 justify-start mt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSingle}
              disabled={
                createSlot.isPending ||
                !singleForm.interviewerId ||
                !singleForm.slotDate ||
                !singleForm.startTime ||
                !singleForm.endTime
              }
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-sm"
            >
              {createSlot.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="size-4 mr-1.5" />
              )}
              Create Slot
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Bulk Create Slots Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[600px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          {/* Header with styled Icon and Close Button placed at right end */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <CalendarRange className="size-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#0F172A]">Bulk Create Slots</h3>
                <p className="text-xs text-slate-500">Generate back-to-back interview slots across a whole day</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Interviewer */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Interviewer *
              </Label>
              <Select
                value={bulkForm.interviewerId}
                onValueChange={(v) => setBulkForm({ ...bulkForm, interviewerId: v })}
              >
                <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                  <SelectValue placeholder="Select faculty / interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.role ? `(${m.role})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Type *
                </Label>
                <Select
                  value={bulkForm.interviewType}
                  onValueChange={(v) =>
                    setBulkForm({ ...bulkForm, interviewType: v as "GD" | "PI" })
                  }
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GD">Group Discussion (GD)</SelectItem>
                    <SelectItem value="PI">Personal Interview (PI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Slot Date *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="date"
                    className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={bulkForm.slotDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, slotDate: e.target.value })}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Day Start, Day End, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Day Start Time *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="time"
                    className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={bulkForm.dayStartTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, dayStartTime: e.target.value })}
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Day End Time *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="time"
                    className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={bulkForm.dayEndTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, dayEndTime: e.target.value })}
                  />
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Duration (mins) *
                </Label>
                <Select
                  value={bulkForm.slotDurationMinutes}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, slotDurationMinutes: v })}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 mins</SelectItem>
                    <SelectItem value="20">20 mins</SelectItem>
                    <SelectItem value="30">30 mins</SelectItem>
                    <SelectItem value="45">45 mins</SelectItem>
                    <SelectItem value="60">60 mins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mode & Location/Meeting Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Mode *
                </Label>
                <Select
                  value={bulkForm.mode}
                  onValueChange={(v) =>
                    setBulkForm({ ...bulkForm, mode: v as "In-person" | "Virtual" })
                  }
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In-person">In-person</SelectItem>
                    <SelectItem value="Virtual">Virtual (Online)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  {bulkForm.mode === "Virtual" ? "Meeting URL / Link" : "Venue / Location"}
                </Label>
                {bulkForm.mode === "Virtual" ? (
                  <div className="relative flex items-center">
                    <Video className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      value={bulkForm.meetingLink}
                      className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm bg-white text-[#0F172A] placeholder:text-slate-400"
                      onChange={(e) => setBulkForm({ ...bulkForm, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                ) : (
                  <Select
                    value={bulkForm.location}
                    onValueChange={(v) => setBulkForm({ ...bulkForm, location: v })}
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue
                        placeholder={
                          (interviewLocations || []).length === 0
                            ? "No interview locations configured"
                            : "Select location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(interviewLocations || []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name} {loc.city ? `— ${loc.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Dialog Action Buttons - Blue Rounded */}
          <div className="flex items-center gap-3 justify-start mt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
              onClick={() => setBulkOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={
                bulkCreateSlots.isPending ||
                !bulkForm.interviewerId ||
                !bulkForm.slotDate ||
                !bulkForm.dayStartTime ||
                !bulkForm.dayEndTime ||
                !bulkForm.slotDurationMinutes
              }
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-sm"
            >
              {bulkCreateSlots.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Layers className="size-4 mr-1.5" />
              )}
              Generate Slots
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Edit Slot Dialog */}
      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[580px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          {/* Header with styled Icon and Close Button placed at right end */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <Pencil className="size-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#0F172A]">Edit Interview Slot</h3>
                <p className="text-xs text-slate-500">Update schedule, interviewer, or venue details</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditForm(null)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {editForm && (
            <div className="flex flex-col gap-4">
              {/* Interviewer */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Interviewer *
                </Label>
                <Select
                  value={editForm.interviewerId}
                  onValueChange={(v) => setEditForm({ ...editForm, interviewerId: v })}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="Select faculty / interviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} {m.role ? `(${m.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Type *
                  </Label>
                  <Select
                    value={editForm.interviewType}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, interviewType: v as "GD" | "PI" })
                    }
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GD">Group Discussion (GD)</SelectItem>
                      <SelectItem value="PI">Personal Interview (PI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Mode *
                  </Label>
                  <Select
                    value={editForm.mode}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, mode: v as "In-person" | "Virtual" })
                    }
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In-person">In-person</SelectItem>
                      <SelectItem value="Virtual">Virtual (Online)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date, Start, End with right-aligned styled icons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Date *
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      type="date"
                      value={editForm.slotDate}
                      className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      onChange={(e) => setEditForm({ ...editForm, slotDate: e.target.value })}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Start Time *
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      type="time"
                      value={editForm.startTime}
                      className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    End Time *
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      type="time"
                      value={editForm.endTime}
                      className="border-[#D4D4D4] rounded-lg h-11 px-3 pr-10 text-sm bg-white text-[#0F172A] [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Location or Meeting Link */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  {editForm.mode === "Virtual" ? "Meeting URL / Link" : "Venue / Location"}
                </Label>
                {editForm.mode === "Virtual" ? (
                  <div className="relative flex items-center">
                    <Video className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <Input
                      value={editForm.meetingLink}
                      className="border-[#D4D4D4] rounded-lg h-11 pl-10 text-sm bg-white text-[#0F172A] placeholder:text-slate-400"
                      onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                ) : (
                  <Select
                    value={editForm.location}
                    onValueChange={(v) => setEditForm({ ...editForm, location: v })}
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue
                        placeholder={
                          (interviewLocations || []).length === 0
                            ? "No interview locations configured"
                            : "Select interview location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(interviewLocations || []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.name}>
                          {loc.name} {loc.city ? `— ${loc.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Dialog Action Buttons - Blue Rounded */}
              <div className="flex items-center gap-3 justify-start mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
                  onClick={() => setEditForm(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSave}
                  disabled={
                    updateSlot.isPending ||
                    !editForm.interviewerId ||
                    !editForm.slotDate ||
                    !editForm.startTime ||
                    !editForm.endTime
                  }
                  className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-sm"
                >
                  {updateSlot.isPending ? (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. Cancel Slot Confirmation Alert Dialog */}
      <AlertDialog open={!!cancelTargetId} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <AlertDialogContent className="bg-white rounded-2xl p-6 border border-slate-200 max-w-[480px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
                <Ban className="size-5 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-[17px] font-bold text-[#0F172A]">
                  Cancel this slot?
                </AlertDialogTitle>
                <span className="text-xs text-slate-400">Marks slot as Cancelled</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCancelTargetId(null)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <AlertDialogDescription className="text-slate-600 text-sm py-2">
            This will mark the interview slot as <strong className="text-orange-600">Cancelled</strong> and it will no longer be available for student bookings.
          </AlertDialogDescription>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer">
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold bg-[#EA2525] hover:bg-[#d61f1f] text-white cursor-pointer border-0 shadow-xs"
            >
              Yes, cancel slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 5. Delete Slot Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white rounded-2xl p-6 border border-slate-200 max-w-[480px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 border border-red-100 rounded-[10px] flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-[17px] font-bold text-[#0F172A]">
                  Delete this slot?
                </AlertDialogTitle>
                <span className="text-xs text-slate-400">Permanent removal</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTargetId(null)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <AlertDialogDescription className="text-slate-600 text-sm py-2">
            Are you sure you want to permanently delete this interview slot? This action cannot be undone.
          </AlertDialogDescription>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold bg-[#EA2525] hover:bg-[#d61f1f] text-white cursor-pointer border-0 shadow-xs"
            >
              Yes, delete slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
