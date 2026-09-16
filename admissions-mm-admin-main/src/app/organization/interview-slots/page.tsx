"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Layers,
  Lock,
  Unlock,
  Trash2,
  MapPin,
  Video,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Pencil,
  Calendar,
  Clock,
  X,
  CalendarPlus,
  CalendarRange,
  CalendarClock,
  Users,
  CheckCircle2,
  Search,
  RotateCcw,
  EllipsisVertical,
  ExternalLink,
  Mail,
  Phone,
  GraduationCap,
  Eye,
  AlertTriangle,
  UserX,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { useTeam } from "@/hooks/use-team";
import { useLocations } from "@/hooks/use-locations";
import { apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  useInterviewSlots,
  useInterviews,
  useCreateSlot,
  useBulkCreateSlots,
  useBlockSlot,
  useUnblockSlot,
  useDeleteSlot,
  useUpdateSlot,
  useRescheduleInterview,
  type InterviewSlot,
  type Interview,
} from "@/hooks/use-interviews";

// Helper for rendering status badges
function renderStatusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "available") {
    return (
      <span className="bg-[#05966933] text-[#065F46] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-[#059669]" />
        Available
      </span>
    );
  }
  if (s === "booked") {
    return (
      <span className="bg-[#DBEAFE] text-[#1D4ED8] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-[#1D4ED8]" />
        Booked
      </span>
    );
  }
  if (s === "blocked") {
    return (
      <span className="bg-[#FEF3C7] text-[#9A3412] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-[#D97706]" />
        Blocked
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="bg-[#FEE2E2] text-[#B91C1C] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap">
        Cancelled
      </span>
    );
  }
  return (
    <span className="bg-slate-100 text-slate-700 font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap">
      {status || "Unknown"}
    </span>
  );
}

function renderTypeBadge(type?: string) {
  const t = (type || "").toUpperCase();
  if (t === "GD") {
    return (
      <span className="bg-[#EDE9FE] text-[#6D28D9] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap">
        GD
      </span>
    );
  }
  return (
    <span className="bg-[#DBEAFE] text-[#1D4ED8] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0 whitespace-nowrap">
      PI
    </span>
  );
}

function formatTime(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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

function toTimeInput(iso: string) {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

interface GroupedInterviewer {
  interviewerId: string;
  name: string;
  email?: string;
  role?: string;
  slots: InterviewSlot[];
  totalCount: number;
  availableCount: number;
  bookedCount: number;
  blockedCount: number;
  interviewTypes: string[];
  locations: string[];
}

export default function InterviewSlotsPage() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const queryClient = useQueryClient();

  const { data: teamResponse } = useTeam();
  const teamMembers = (teamResponse as any)?.data || [];

  const { data: interviewLocations } = useLocations({
    type: "Interview",
    isActive: true,
  });

  // Selected interviewer ID for the Popup Dialog
  const [selectedInterviewerId, setSelectedInterviewerId] = React.useState<string | null>(null);

  // Reschedule interview target state
  const [rescheduleTarget, setRescheduleTarget] = React.useState<{
    interview: Interview;
    currentSlot: InterviewSlot;
  } | null>(null);

  // Status Tabs in main view ("all" | "available" | "booked" | "blocked")
  const [mainStatusTab, setMainStatusTab] = React.useState<string>("all");

  // Status Tabs inside the Popup Dialog ("all" | "available" | "booked" | "blocked")
  const [popupStatusTab, setPopupStatusTab] = React.useState<string>("all");
  const [popupSearch, setPopupSearch] = React.useState<string>("");

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [locationFilter, setLocationFilter] = React.useState<string>("all");
  const [dateFilter, setDateFilter] = React.useState<string>("");
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);
  const [timeFilter, setTimeFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  // Pagination for main table
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(5);

  // Query all slots
  const { data: slots, isLoading: isSlotsLoading } = useInterviewSlots({
    interviewType: typeFilter !== "all" ? (typeFilter as "GD" | "PI") : undefined,
    dateFrom: dateFilter ? dateFilter : undefined,
    dateTo: dateFilter ? dateFilter : undefined,
  });

  // Query all interviews to map booked slots to candidate applications
  const { data: interviewsResponse, isLoading: isInterviewsLoading } = useInterviews();
  const interviews: Interview[] = Array.isArray(interviewsResponse)
    ? interviewsResponse
    : (interviewsResponse as any)?.data || [];

  // Map slotId -> Interview & Application
  const slotToInterviewMap = React.useMemo(() => {
    const map = new Map<string, Interview>();
    // Filter out Cancelled interviews so they never hijack active or newly assigned slots
    const validInterviews = interviews.filter(
      (inv) => inv.slotId && inv.status !== "Cancelled"
    );
    for (const inv of validInterviews) {
      const existing = map.get(inv.slotId!);
      if (!existing) {
        map.set(inv.slotId!, inv);
      } else {
        const isActive = ["Scheduled", "Rescheduled"].includes(inv.status);
        const isExistingActive = ["Scheduled", "Rescheduled"].includes(existing.status);
        if (isActive && !isExistingActive) {
          map.set(inv.slotId!, inv);
        } else if (new Date(inv.createdAt) > new Date(existing.createdAt)) {
          map.set(inv.slotId!, inv);
        }
      }
    }
    return map;
  }, [interviews]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, locationFilter, dateFilter, timeFilter, typeFilter, mainStatusTab]);

  // Slot action hooks
  const blockSlot = useBlockSlot();
  const unblockSlot = useUnblockSlot();
  const deleteSlot = useDeleteSlot();

  // Single Slot Delete
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteSlot.mutateAsync(deleteTargetId);
    setDeleteTargetId(null);
  };

  // Bulk Delete Available Slots for an Interviewer
  const [bulkDeleteInterviewer, setBulkDeleteInterviewer] = React.useState<GroupedInterviewer | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const handleConfirmBulkDeleteAvailable = async () => {
    if (!bulkDeleteInterviewer || !orgId) return;
    setIsBulkDeleting(true);
    try {
      const availableSlotsToDelete = bulkDeleteInterviewer.slots.filter(
        (s) => (s.status || "").toLowerCase() === "available"
      );

      if (availableSlotsToDelete.length === 0) {
        toast.info("No available slots to delete.");
        setBulkDeleteInterviewer(null);
        setSelectedInterviewerId(null);
        setIsBulkDeleting(false);
        return;
      }

      await Promise.all(
        availableSlotsToDelete.map((s) =>
          apiDelete(`/organizations/${orgId}/interview-slots/${s.id}`)
        )
      );

      await queryClient.invalidateQueries({ queryKey: ["interview-slots"] });
      toast.success(`${availableSlotsToDelete.length} available slots deleted successfully.`);
      setBulkDeleteInterviewer(null);
      setSelectedInterviewerId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete available slots.");
    } finally {
      setIsBulkDeleting(false);
    }
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
      description: "Manage interviewer schedules, track available & booked slots, and view applicant details.",
      customRightNode: (
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 h-10 px-4 border-[#D4D4D4] bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-[10px] text-sm shadow-2xs cursor-pointer"
          >
            <Layers className="size-4 text-slate-500" />
            <span className="hidden sm:inline">Bulk Create</span>
            <span className="sm:hidden">Bulk</span>
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-[10px] text-sm shadow-xs cursor-pointer border-0"
          >
            <Plus className="size-4" />
            <span>Add Slot</span>
          </Button>
        </div>
      ),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  const allSlots = React.useMemo(() => slots || [], [slots]);

  // Extract available locations
  const availableLocationOptions = React.useMemo(() => {
    const locSet = new Set<string>();
    (interviewLocations || []).forEach((loc) => {
      if (loc.name) locSet.add(loc.name);
    });
    allSlots.forEach((s) => {
      if (s.mode === "Virtual") {
        locSet.add("Virtual");
      } else if (s.location) {
        locSet.add(s.location);
      }
    });
    return Array.from(locSet).sort();
  }, [interviewLocations, allSlots]);

  // Overall statistics
  const stats = React.useMemo(() => {
    const total = allSlots.length;
    const available = allSlots.filter((s) => (s.status || "").toLowerCase() === "available").length;
    const booked = allSlots.filter((s) => (s.status || "").toLowerCase() === "booked").length;
    const blocked = allSlots.filter((s) => (s.status || "").toLowerCase() === "blocked").length;
    return { total, available, booked, blocked };
  }, [allSlots]);

  // Filter slots based on search, location, date, time, type
  const filteredSlots = React.useMemo(() => {
    let result = allSlots;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const interviewerName = (s.interviewer?.name || s.interviewerId || "").toLowerCase();
        const location = (s.location || "").toLowerCase();
        const mode = (s.mode || "").toLowerCase();
        const slotDate = (s.slotDate || "").toLowerCase();
        const inv = slotToInterviewMap.get(s.id);
        const applicantName = (inv?.application?.name || "").toLowerCase();
        const applicationNo = (inv?.application?.applicationNo || "").toLowerCase();

        return (
          interviewerName.includes(q) ||
          location.includes(q) ||
          mode.includes(q) ||
          slotDate.includes(q) ||
          applicantName.includes(q) ||
          applicationNo.includes(q)
        );
      });
    }

    if (locationFilter !== "all") {
      if (locationFilter === "Virtual") {
        result = result.filter((s) => s.mode === "Virtual");
      } else {
        result = result.filter(
          (s) => s.mode === "In-person" && s.location?.toLowerCase() === locationFilter.toLowerCase()
        );
      }
    }

    if (dateFilter) {
      result = result.filter((s) => s.slotDate === dateFilter);
    }

    if (timeFilter !== "all") {
      result = result.filter((s) => {
        try {
          const hour = new Date(s.startTime).getHours();
          if (timeFilter === "morning") return hour < 12;
          if (timeFilter === "afternoon") return hour >= 12 && hour < 16;
          if (timeFilter === "evening") return hour >= 16;
          return true;
        } catch {
          return true;
        }
      });
    }

    if (typeFilter !== "all") {
      result = result.filter((s) => s.interviewType === typeFilter);
    }

    return result;
  }, [allSlots, searchQuery, locationFilter, dateFilter, timeFilter, typeFilter, slotToInterviewMap]);

  // Group slots by Interviewer
  const allGroupedInterviewers: GroupedInterviewer[] = React.useMemo(() => {
    const map = new Map<string, GroupedInterviewer>();

    filteredSlots.forEach((slot) => {
      const interviewerId = slot.interviewerId || "unassigned";
      const member = teamMembers.find((m: any) => m.id === interviewerId);
      const name = slot.interviewer?.name || member?.name || "Assigned Faculty";
      const email = slot.interviewer?.email || member?.email || "";
      const role = member?.role || "Interviewer";

      if (!map.has(interviewerId)) {
        map.set(interviewerId, {
          interviewerId,
          name,
          email,
          role,
          slots: [],
          totalCount: 0,
          availableCount: 0,
          bookedCount: 0,
          blockedCount: 0,
          interviewTypes: [],
          locations: [],
        });
      }

      const group = map.get(interviewerId)!;
      group.slots.push(slot);
      group.totalCount += 1;

      const st = (slot.status || "").toLowerCase();
      if (st === "available") group.availableCount += 1;
      else if (st === "booked") group.bookedCount += 1;
      else if (st === "blocked") group.blockedCount += 1;

      if (!group.interviewTypes.includes(slot.interviewType)) {
        group.interviewTypes.push(slot.interviewType);
      }

      const locName = slot.mode === "Virtual" ? "Virtual" : slot.location || "In-person";
      if (!group.locations.includes(locName)) {
        group.locations.push(locName);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSlots, teamMembers]);

  // Filter grouped interviewers based on the main status tab
  const displayedGroupedInterviewers = React.useMemo(() => {
    if (mainStatusTab === "available") {
      return allGroupedInterviewers.filter((g) => g.availableCount > 0);
    }
    if (mainStatusTab === "booked") {
      return allGroupedInterviewers.filter((g) => g.bookedCount > 0);
    }
    if (mainStatusTab === "blocked") {
      return allGroupedInterviewers.filter((g) => g.blockedCount > 0);
    }
    return allGroupedInterviewers;
  }, [allGroupedInterviewers, mainStatusTab]);

  const hasActiveFilters =
    searchQuery !== "" ||
    locationFilter !== "all" ||
    dateFilter !== "" ||
    timeFilter !== "all" ||
    typeFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setLocationFilter("all");
    setDateFilter("");
    setTimeFilter("all");
    setTypeFilter("all");
  };

  // Pagination for main grouped interviewers
  const paginatedGroups = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayedGroupedInterviewers.slice(startIndex, startIndex + itemsPerPage);
  }, [displayedGroupedInterviewers, currentPage]);

  const totalPages = Math.ceil(displayedGroupedInterviewers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const mobileGroups = React.useMemo(() => {
    return displayedGroupedInterviewers.slice(0, mobileVisibleCount);
  }, [displayedGroupedInterviewers, mobileVisibleCount]);

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

  // Active selected interviewer object for popup
  const activeSelectedInterviewer = React.useMemo(() => {
    if (!selectedInterviewerId) return null;
    return allGroupedInterviewers.find((g) => g.interviewerId === selectedInterviewerId) || null;
  }, [selectedInterviewerId, allGroupedInterviewers]);

  // Filtered slots inside popup
  const popupDisplayedSlots = React.useMemo(() => {
    if (!activeSelectedInterviewer) return [];
    let list = activeSelectedInterviewer.slots;

    if (popupStatusTab !== "all") {
      list = list.filter((s) => (s.status || "").toLowerCase() === popupStatusTab.toLowerCase());
    }

    if (popupSearch.trim()) {
      const q = popupSearch.toLowerCase();
      list = list.filter((s) => {
        const inv = slotToInterviewMap.get(s.id);
        const name = (inv?.application?.name || "").toLowerCase();
        const appNo = (inv?.application?.applicationNo || "").toLowerCase();
        const prog = ((inv?.application as any)?.program || "").toLowerCase();
        const loc = (s.location || "").toLowerCase();
        return name.includes(q) || appNo.includes(q) || prog.includes(q) || loc.includes(q);
      });
    }

    return list;
  }, [activeSelectedInterviewer, popupStatusTab, popupSearch, slotToInterviewMap]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
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

      {/* ========================================================================= */}
      {/* ALL INTERVIEWERS TABLE CONTAINER */}
      {/* ========================================================================= */}
      <div className="border border-[#e5e5e5] rounded-[12px] bg-white shadow-sm flex flex-col w-full max-w-full overflow-hidden">
        {/* Top Unified Header: Status Tabs on Left, Filters on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border-b border-[#e2e8f0] gap-4">
          <Tabs
            value={mainStatusTab}
            onValueChange={setMainStatusTab}
            className="w-full lg:w-auto"
          >
            <TabsList className="bg-transparent border-0 p-0 h-auto flex flex-wrap sm:flex-nowrap items-center gap-x-5 gap-y-2 sm:gap-6 w-full lg:w-auto justify-start rounded-none">
              <TabsTrigger
                value="all"
                className={cn(
                  "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "font-medium text-slate-500 hover:text-slate-800",
                  "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#1e3a8a] pb-1.5 sm:pb-2"
                )}
              >
                All Interviewers ({allGroupedInterviewers.length})
              </TabsTrigger>
              <TabsTrigger
                value="available"
                className={cn(
                  "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "font-medium text-slate-500 hover:text-slate-800",
                  "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#1e3a8a] pb-1.5 sm:pb-2"
                )}
              >
                Available Slots
              </TabsTrigger>
              <TabsTrigger
                value="booked"
                className={cn(
                  "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "font-medium text-slate-500 hover:text-slate-800",
                  "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#1e3a8a] pb-1.5 sm:pb-2"
                )}
              >
                Booked Slots
              </TabsTrigger>
              <TabsTrigger
                value="blocked"
                className={cn(
                  "p-0 h-auto bg-transparent border-0 rounded-none text-xs sm:text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "font-medium text-slate-500 hover:text-slate-800",
                  "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#1e3a8a] pb-1.5 sm:pb-2"
                )}
              >
                Blocked Slots
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter controls: 2x2 Grid with Wording & Icons on Mobile, Inline Flex on Desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-[220px]">
              <Input
                placeholder="Search faculty or venue..."
                className="w-full pr-8 h-10 border-[#e2e8f0] rounded-[8px] bg-white text-sm shadow-2xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                <Search className="size-4" />
              </div>
            </div>

            {/* 2x2 Grid on Mobile, Flex Row on Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {/* 1. Location Select */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-10 text-xs sm:text-sm bg-white border-[#e2e8f0] rounded-[8px] text-slate-700 shadow-2xs">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {availableLocationOptions.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 2. Type Select */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[105px] h-10 text-xs sm:text-sm bg-white border-[#e2e8f0] rounded-[8px] text-slate-700 shadow-2xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="GD">GD</SelectItem>
                  <SelectItem value="PI">PI</SelectItem>
                </SelectContent>
              </Select>

              {/* 3. Date Filter (Visual Interactive Calendar Picker with Wording on Mobile) */}
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-10 h-10 px-3 sm:p-0 rounded-[8px] border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 relative cursor-pointer shadow-2xs flex items-center justify-between sm:justify-center font-normal",
                      dateFilter && "bg-blue-50/80 border-[#2563EB] text-[#2563EB] hover:bg-blue-100/80 font-medium"
                    )}
                    title={dateFilter ? `Filtered Date: ${formatDate(dateFilter)}` : "Filter by Date"}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="size-4 shrink-0 text-slate-500" />
                      <span className="text-xs sm:hidden truncate">
                        {dateFilter ? formatDate(dateFilter) : "All Dates"}
                      </span>
                    </div>
                    <ChevronDown className="size-3.5 opacity-50 shrink-0 sm:hidden" />
                    {dateFilter && (
                      <span className="absolute -top-1 -right-1 size-2.5 bg-[#2563EB] rounded-full border-2 border-white" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3">
                    <CalendarPicker
                      mode="single"
                      selected={dateFilter ? new Date(`${dateFilter}T00:00:00`) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          setDateFilter(`${y}-${m}-${d}`);
                        } else {
                          setDateFilter("");
                        }
                        setDatePopoverOpen(false);
                      }}
                      initialFocus
                    />
                  </div>
                  {dateFilter && (
                    <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium px-2">
                        Selected: <strong className="text-slate-800">{formatDate(dateFilter)}</strong>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateFilter("");
                          setDatePopoverOpen(false);
                        }}
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 px-3 cursor-pointer rounded-lg font-semibold"
                      >
                        Clear Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* 4. Time Filter (Dropdown Menu with Wording on Mobile) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-10 h-10 px-3 sm:p-0 rounded-[8px] border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-700 relative cursor-pointer shadow-2xs flex items-center justify-between sm:justify-center font-normal",
                      timeFilter !== "all" && "bg-blue-50/80 border-[#2563EB] text-[#2563EB] hover:bg-blue-100/80 font-medium"
                    )}
                    title={timeFilter !== "all" ? `Filtered Time: ${timeFilter}` : "Filter by Time Slot"}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="size-4 shrink-0 text-slate-500" />
                      <span className="text-xs sm:hidden truncate">
                        {timeFilter === "morning"
                          ? "Morning"
                          : timeFilter === "afternoon"
                          ? "Afternoon"
                          : timeFilter === "evening"
                          ? "Evening"
                          : "All Times"}
                      </span>
                    </div>
                    <ChevronDown className="size-3.5 opacity-50 shrink-0 sm:hidden" />
                    {timeFilter !== "all" && (
                      <span className="absolute -top-1 -right-1 size-2.5 bg-[#2563EB] rounded-full border-2 border-white" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border border-slate-200 rounded-xl p-1 z-50">
                  <DropdownMenuItem
                    className={cn("text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2", timeFilter === "all" && "font-bold text-[#2563EB] bg-blue-50")}
                    onClick={() => setTimeFilter("all")}
                  >
                    All Times
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2", timeFilter === "morning" && "font-bold text-[#2563EB] bg-blue-50")}
                    onClick={() => setTimeFilter("morning")}
                  >
                    Morning (&lt; 12 PM)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2", timeFilter === "afternoon" && "font-bold text-[#2563EB] bg-blue-50")}
                    onClick={() => setTimeFilter("afternoon")}
                  >
                    Afternoon (12 PM – 4 PM)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn("text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2", timeFilter === "evening" && "font-bold text-[#2563EB] bg-blue-50")}
                    onClick={() => setTimeFilter("evening")}
                  >
                    Evening (After 4 PM)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetFilters}
                  className="col-span-2 sm:col-span-1 h-10 w-full sm:w-10 rounded-[8px] border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                  title="Reset Filters"
                >
                  <RotateCcw className="size-3.5" />
                  <span className="text-xs sm:hidden">Reset Filters</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Interviewer / Faculty
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Type
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap text-center">
                  Total Slots
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap text-center">
                  Available
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap text-center">
                  Booked
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap text-center">
                  Blocked
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto whitespace-nowrap">
                  Locations / Modes
                </TableHead>
                <TableHead className="py-4 px-6 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto text-right w-[80px] whitespace-nowrap">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSlotsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-500 font-medium">
                    <Loader2 className="size-6 animate-spin text-primary inline mr-2" />
                    Loading interviewer slots...
                  </TableCell>
                </TableRow>
              ) : displayedGroupedInterviewers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-500 font-medium">
                    {hasActiveFilters
                      ? "No interviewers match your filter criteria."
                      : 'No interview slots found. Click "Add Slot" or "Bulk Create" to create some.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group) => {
                  return (
                    <TableRow
                      key={group.interviewerId}
                      className="border-b border-border/80 hover:bg-muted/15 dark:hover:bg-muted/5 transition-colors h-[64px]"
                    >
                      {/* Interviewer Name (Clickable link to popup) */}
                      <TableCell className="py-4 px-6 align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInterviewerId(group.interviewerId);
                            setPopupStatusTab("all");
                            setPopupSearch("");
                          }}
                          className="flex flex-col text-left group/btn focus:outline-hidden cursor-pointer"
                        >
                          <span className="font-semibold text-slate-900 group-hover/btn:text-[#1e3a8a] text-[14px] transition-colors">
                            {group.name}
                          </span>
                          {group.email && (
                            <span className="text-xs text-muted-foreground font-normal">
                              {group.email}
                            </span>
                          )}
                        </button>
                      </TableCell>

                      {/* Type Badges */}
                      <TableCell className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {group.interviewTypes.map((t) => (
                            <React.Fragment key={t}>{renderTypeBadge(t)}</React.Fragment>
                          ))}
                        </div>
                      </TableCell>

                      {/* Total Count */}
                      <TableCell className="py-4 px-6 align-middle text-center">
                        <span className="inline-flex items-center justify-center font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full text-xs min-w-[32px]">
                          {group.totalCount}
                        </span>
                      </TableCell>

                      {/* Available Count */}
                      <TableCell className="py-4 px-6 align-middle text-center">
                        <span className="inline-flex items-center justify-center font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full text-xs min-w-[32px]">
                          {group.availableCount}
                        </span>
                      </TableCell>

                      {/* Booked Count */}
                      <TableCell className="py-4 px-6 align-middle text-center">
                        <span className="inline-flex items-center justify-center font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full text-xs min-w-[32px]">
                          {group.bookedCount}
                        </span>
                      </TableCell>

                      {/* Blocked Count */}
                      <TableCell className="py-4 px-6 align-middle text-center">
                        <span className="inline-flex items-center justify-center font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full text-xs min-w-[32px]">
                          {group.blockedCount}
                        </span>
                      </TableCell>

                      {/* Locations */}
                      <TableCell className="py-4 px-6 align-middle text-foreground/80 text-[13px]">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-[220px]">
                          {group.locations.map((loc) => (
                            <span
                              key={loc}
                              className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded text-[11px]"
                            >
                              {loc === "Virtual" ? (
                                <Video className="size-3 text-blue-500" />
                              ) : (
                                <MapPin className="size-3 text-slate-400" />
                              )}
                              {loc}
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      {/* Action 3-Dot Dropdown Menu */}
                      <TableCell className="py-4 px-6 align-middle text-right">
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
                            <DropdownMenuContent align="end" className="w-48 z-50 bg-white shadow-lg border border-slate-200 rounded-xl p-1">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer font-medium text-xs text-slate-700 rounded-lg"
                                onClick={() => {
                                  setSingleForm((prev) => ({
                                    ...prev,
                                    interviewerId: group.interviewerId,
                                  }));
                                  setCreateOpen(true);
                                }}
                              >
                                <Plus className="size-4 text-[#2563EB]" />
                                Add Slot
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="gap-2 cursor-pointer font-medium text-xs text-slate-700 rounded-lg"
                                onClick={() => {
                                  setSelectedInterviewerId(group.interviewerId);
                                  setPopupStatusTab("all");
                                  setPopupSearch("");
                                }}
                              >
                                <Eye className="size-4 text-slate-500" />
                                View Slots ({group.totalCount})
                              </DropdownMenuItem>

                              {group.availableCount > 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2 cursor-pointer font-medium text-xs text-rose-600 focus:text-rose-700 rounded-lg"
                                    onClick={() => setBulkDeleteInterviewer(group)}
                                  >
                                    <Trash2 className="size-4 text-rose-600" />
                                    Delete Available ({group.availableCount})
                                  </DropdownMenuItem>
                                </>
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
        </div>

        {/* Mobile View - Cards */}
        <div className="flex flex-col gap-3.5 lg:hidden w-full p-4 bg-muted/10">
          {displayedGroupedInterviewers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No interviewers match the filters.
            </div>
          ) : (
            mobileGroups.map((group) => (
              <div
                key={group.interviewerId}
                className="bg-card border border-border/80 rounded-xl p-4 flex flex-col gap-3.5 hover:shadow-xs transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInterviewerId(group.interviewerId);
                        setPopupStatusTab("all");
                        setPopupSearch("");
                      }}
                      className="font-semibold text-foreground hover:text-[#2563EB] text-sm tracking-tight block text-left cursor-pointer transition-colors"
                    >
                      {group.name}
                    </button>
                    {group.email && (
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {group.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {group.interviewTypes.map((t) => (
                      <React.Fragment key={t}>{renderTypeBadge(t)}</React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium uppercase">Total</span>
                    <span className="text-sm font-bold text-slate-800">{group.totalCount}</span>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] text-emerald-600 font-medium uppercase">Avail</span>
                    <span className="text-sm font-bold text-emerald-700">{group.availableCount}</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] text-blue-600 font-medium uppercase">Booked</span>
                    <span className="text-sm font-bold text-blue-700">{group.bookedCount}</span>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] text-amber-600 font-medium uppercase">Block</span>
                    <span className="text-sm font-bold text-amber-700">{group.blockedCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-xs font-semibold bg-white hover:bg-blue-50 border-blue-200 text-[#2563EB] gap-1.5 cursor-pointer rounded-[8px]"
                    onClick={() => {
                      setSingleForm((prev) => ({
                        ...prev,
                        interviewerId: group.interviewerId,
                      }));
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add Slot
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 px-3 text-xs font-semibold bg-white hover:bg-slate-50 border-[#D4D4D4] text-slate-700 gap-1.5 cursor-pointer rounded-[8px]"
                    onClick={() => {
                      setSelectedInterviewerId(group.interviewerId);
                      setPopupStatusTab("all");
                      setPopupSearch("");
                    }}
                  >
                    <Eye className="size-3.5 text-slate-500" />
                    View ({group.totalCount})
                  </Button>
                  {group.availableCount > 0 && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer rounded-[8px]"
                      title="Delete Available Slots"
                      onClick={() => setBulkDeleteInterviewer(group)}
                    >
                      <Trash2 className="size-4 text-rose-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}

          {mobileVisibleCount < displayedGroupedInterviewers.length && (
            <Button
              variant="outline"
              className="w-full bg-background hover:bg-muted/50 border-border/80 text-foreground font-medium h-10 shadow-sm mt-2 cursor-pointer rounded-[8px]"
              onClick={() => setMobileVisibleCount((prev) => prev + 5)}
            >
              Load More Interviewers
            </Button>
          )}
        </div>

        {/* Desktop Pagination Footer */}
        {displayedGroupedInterviewers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
            <p className="text-sm text-muted-foreground font-normal">
              Showing{" "}
              <span className="font-medium text-foreground">
                {displayedGroupedInterviewers.length === 0 ? 0 : startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(endIndex, displayedGroupedInterviewers.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{displayedGroupedInterviewers.length}</span>{" "}
              interviewers
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="h-9 px-4 border border-[#e2e8f0] bg-white text-slate-700 text-sm font-medium rounded-[8px] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
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
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[8px] transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[#2563EB] border-[#2563EB] text-white font-semibold hover:bg-[#1D4ED8] shadow-xs"
                            : "border-[#e2e8f0] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
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
                  className="h-9 px-4 border border-[#e2e8f0] bg-white text-slate-700 text-sm font-medium rounded-[8px] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
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

      {/* ========================================================================= */}
      {/* POPUP MODAL DIALOG - MATCHING WEBSITE CLEAN UI */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedInterviewerId && activeSelectedInterviewer)}
        onOpenChange={(open) => !open && setSelectedInterviewerId(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[860px] w-[95vw] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          {activeSelectedInterviewer && (
            <div className="flex flex-col gap-4">
              {/* Header matching website standard */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F5F5F5] text-slate-900 border border-slate-200 rounded-[10px] flex items-center justify-center shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#0F172A] flex items-center gap-2">
                      {activeSelectedInterviewer.name}
                      <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {activeSelectedInterviewer.role || "Faculty"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeSelectedInterviewer.email || "Interview Slots & Booked Student Details"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInterviewerId(null)}
                  className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Quick 4 Stats Grid in Popup */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-[#e5e5e5] rounded-[10px] p-3 flex items-center gap-3 shadow-2xs">
                  <div className="size-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Calendar className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total</span>
                    <span className="text-base font-bold text-slate-900">{activeSelectedInterviewer.totalCount}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#e5e5e5] rounded-[10px] p-3 flex items-center gap-3 shadow-2xs">
                  <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Available</span>
                    <span className="text-base font-bold text-emerald-700">{activeSelectedInterviewer.availableCount}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#e5e5e5] rounded-[10px] p-3 flex items-center gap-3 shadow-2xs">
                  <div className="size-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Booked</span>
                    <span className="text-base font-bold text-blue-700">{activeSelectedInterviewer.bookedCount}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#e5e5e5] rounded-[10px] p-3 flex items-center gap-3 shadow-2xs">
                  <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Lock className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Blocked</span>
                    <span className="text-base font-bold text-amber-700">{activeSelectedInterviewer.blockedCount}</span>
                  </div>
                </div>
              </div>

              {/* Status Tabs and Search Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <Tabs
                  value={popupStatusTab}
                  onValueChange={setPopupStatusTab}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="bg-transparent border-0 p-0 h-auto flex flex-wrap sm:flex-nowrap gap-x-4 gap-y-2 sm:gap-6 justify-start rounded-none">
                    <TabsTrigger
                      value="all"
                      className={cn(
                        "p-0 h-auto bg-transparent border-0 rounded-none text-xs transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        "font-medium text-slate-500 hover:text-slate-800",
                        "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[2px] data-[state=active]:border-[#1e3a8a] pb-1.5"
                      )}
                    >
                      All Slots ({activeSelectedInterviewer.totalCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="available"
                      className={cn(
                        "p-0 h-auto bg-transparent border-0 rounded-none text-xs transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        "font-medium text-slate-500 hover:text-slate-800",
                        "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[2px] data-[state=active]:border-[#1e3a8a] pb-1.5"
                      )}
                    >
                      Available ({activeSelectedInterviewer.availableCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="booked"
                      className={cn(
                        "p-0 h-auto bg-transparent border-0 rounded-none text-xs transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        "font-medium text-slate-500 hover:text-slate-800",
                        "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[2px] data-[state=active]:border-[#1e3a8a] pb-1.5"
                      )}
                    >
                      Booked ({activeSelectedInterviewer.bookedCount})
                    </TabsTrigger>
                    <TabsTrigger
                      value="blocked"
                      className={cn(
                        "p-0 h-auto bg-transparent border-0 rounded-none text-xs transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                        "font-medium text-slate-500 hover:text-slate-800",
                        "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[2px] data-[state=active]:border-[#1e3a8a] pb-1.5"
                      )}
                    >
                      Blocked ({activeSelectedInterviewer.blockedCount})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-[220px]">
                  <Input
                    placeholder="Search candidate..."
                    value={popupSearch}
                    onChange={(e) => setPopupSearch(e.target.value)}
                    className="pl-8 h-9 text-xs border-[#d4d4d4] rounded-lg bg-white"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Scrollable Slots Cards Area */}
              <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {popupDisplayedSlots.length === 0 ? (
                  <div className="text-center py-14 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-semibold text-slate-700">No interview slots found</p>
                    <p className="text-xs text-slate-400">No slots match the selected status tab or query.</p>
                  </div>
                ) : (
                  popupDisplayedSlots.map((slot) => {
                    const statusLower = (slot.status || "").toLowerCase();
                    const isAvailable = statusLower === "available";
                    const isBooked = statusLower === "booked";
                    const isBlocked = statusLower === "blocked";

                    const bookedInterview = slotToInterviewMap.get(slot.id);
                    const app = bookedInterview?.application;

                    return (
                      <div
                        key={slot.id}
                        className={`border rounded-[12px] p-4 transition-all duration-200 flex flex-col gap-3 ${
                          isBooked
                            ? "bg-blue-50/20 border-blue-200 shadow-2xs"
                            : isAvailable
                            ? "bg-white border-[#e5e5e5] hover:border-slate-300 shadow-2xs"
                            : "bg-slate-50/70 border-[#e5e5e5]"
                        }`}
                      >
                        {/* Slot Summary Bar */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {formatDate(slot.slotDate)}
                              </span>
                              <span className="text-xs text-slate-600 font-medium flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                                <Clock className="size-3 text-slate-400" />
                                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                              </span>
                            </div>

                            {renderTypeBadge(slot.interviewType)}

                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              {slot.mode === "Virtual" ? (
                                <span className="inline-flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                  <Video className="size-3 text-blue-500" />
                                  Virtual {slot.meetingLink ? "(Link Available)" : ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  <MapPin className="size-3 text-slate-400" />
                                  {slot.location || "In-person"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {renderStatusBadge(slot.status)}

                            {/* 3-Dot Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
                                >
                                  <EllipsisVertical className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 z-50 bg-white shadow-lg border border-slate-200 rounded-xl p-1">
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer font-medium text-xs text-slate-700 rounded-lg"
                                  onClick={() => openEdit(slot)}
                                >
                                  <Pencil className="size-3.5 text-slate-500" />
                                  Edit Slot
                                </DropdownMenuItem>

                                {isAvailable && (
                                  <DropdownMenuItem
                                    className="gap-2 text-amber-600 focus:text-amber-700 cursor-pointer font-medium text-xs rounded-lg"
                                    onClick={() => blockSlot.mutate(slot.id)}
                                  >
                                    <Lock className="size-3.5 text-amber-600" />
                                    Block Slot
                                  </DropdownMenuItem>
                                )}

                                {isBlocked && (
                                  <DropdownMenuItem
                                    className="gap-2 text-emerald-600 focus:text-emerald-700 cursor-pointer font-medium text-xs rounded-lg"
                                    onClick={() => unblockSlot.mutate(slot.id)}
                                  >
                                    <Unlock className="size-3.5 text-emerald-600" />
                                    Unblock Slot
                                  </DropdownMenuItem>
                                )}

                                {isBooked && bookedInterview && (
                                  <DropdownMenuItem
                                    className="gap-2 text-[#2563EB] focus:text-[#1D4ED8] cursor-pointer font-medium text-xs rounded-lg"
                                    onClick={() => setRescheduleTarget({ interview: bookedInterview, currentSlot: slot })}
                                  >
                                    <Clock className="size-3.5 text-[#2563EB]" />
                                    Reschedule Interview
                                  </DropdownMenuItem>
                                )}

                                {!isBooked && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="gap-2 cursor-pointer font-medium text-xs text-rose-600 focus:text-rose-700 rounded-lg"
                                      onClick={() => setDeleteTargetId(slot.id)}
                                    >
                                      <Trash2 className="size-3.5 text-rose-600" />
                                      Delete Slot
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* If Booked: Student & Application Details Banner */}
                        {isBooked && (
                          app ? (
                            <div className="border-t border-blue-200/80 pt-3 mt-1 bg-blue-50/50 -mx-4 -mb-4 p-4 rounded-b-[12px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-sm shrink-0">
                                  {app?.name ? app.name.slice(0, 2).toUpperCase() : "ST"}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-sm">
                                      {app?.name || "Booked Student"}
                                    </span>
                                    {app?.applicationNo && (
                                      <Link
                                        href={`/organization/applications/${app.applicationNo}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-colors"
                                      >
                                        {app.applicationNo}
                                        <ExternalLink className="size-3" />
                                      </Link>
                                    )}
                                    {bookedInterview?.round && (
                                      <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                        Round {bookedInterview.round}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                                    {(app as any)?.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="size-3 text-slate-400" />
                                        {(app as any).email}
                                      </span>
                                    )}
                                    {(app as any)?.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="size-3 text-slate-400" />
                                        {(app as any).phone}
                                      </span>
                                    )}
                                    {(app as any)?.program && (
                                      <span className="flex items-center gap-1 font-medium text-slate-700">
                                        <GraduationCap className="size-3 text-slate-400" />
                                        {(app as any).program} {(app as any).campus ? `(${(app as any).campus})` : ""}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {bookedInterview && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRescheduleTarget({ interview: bookedInterview, currentSlot: slot })}
                                    className="h-9 px-3.5 rounded-[10px] bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    <Clock className="size-3.5 text-blue-600" />
                                    Reschedule
                                  </Button>
                                )}

                                {app?.applicationNo && (
                                  <Button
                                    asChild
                                    size="sm"
                                    className="h-9 px-3.5 rounded-[10px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                  >
                                    <Link href={`/organization/applications/${app.applicationNo}`} target="_blank">
                                      <Eye className="size-3.5" />
                                      View Application
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="border-t border-amber-200/80 pt-3 mt-1 bg-amber-50/50 -mx-4 -mb-4 p-4 rounded-b-[12px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">
                                  <UserX className="size-5 text-amber-600" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-amber-950 text-sm">
                                    Candidate Application Deleted
                                  </span>
                                  <span className="text-xs text-amber-700 mt-0.5">
                                    The application previously booked for this slot was deleted.
                                  </span>
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTargetId(slot.id)}
                                className="h-9 px-3.5 rounded-[10px] bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Trash2 className="size-3.5 text-red-600" />
                                Delete Slot
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dialog Bottom Action Buttons - Matching Rounded Style */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                <div>
                  {activeSelectedInterviewer.availableCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBulkDeleteInterviewer(activeSelectedInterviewer)}
                      className="h-10 px-4 rounded-[10px] text-xs font-semibold border-rose-300 text-rose-600 hover:bg-rose-50 cursor-pointer gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      Delete Available Slots ({activeSelectedInterviewer.availableCount})
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedInterviewerId(null)}
                    className="h-10 px-5 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setSingleForm((prev) => ({
                        ...prev,
                        interviewerId: activeSelectedInterviewer.interviewerId,
                      }));
                      setCreateOpen(true);
                    }}
                    className="h-10 px-6 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-xs gap-1.5"
                  >
                    <Plus className="size-4" />
                    Add Slot
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 1. Add Single Slot Dialog (Blue Rounded Primary Button) */}
      {/* ========================================================================= */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[560px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border border-slate-200 rounded-[10px] flex items-center justify-center shrink-0">
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

            {/* Date, Start Time, End Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Date *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="date"
                    value={singleForm.slotDate}
                    className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setSingleForm({ ...singleForm, slotDate: e.target.value })}
                  />
                  <Calendar className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
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
                    className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setSingleForm({ ...singleForm, startTime: e.target.value })}
                  />
                  <Clock className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
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
                    className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    onChange={(e) => setSingleForm({ ...singleForm, endTime: e.target.value })}
                  />
                  <Clock className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Location or Meeting Link */}
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                {singleForm.mode === "Virtual" ? "Meeting URL / Link" : "Venue / Location"}
              </Label>
              {singleForm.mode === "Virtual" ? (
                <Input
                  value={singleForm.meetingLink}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A] placeholder:text-slate-400"
                  placeholder="https://meet.google.com/... or Zoom link"
                  onChange={(e) => setSingleForm({ ...singleForm, meetingLink: e.target.value })}
                />
              ) : (
                <Select
                  value={singleForm.location}
                  onValueChange={(v) => setSingleForm({ ...singleForm, location: v })}
                >
                  <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                    <SelectValue placeholder="Select interview location" />
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

          <div className="flex items-center gap-3 justify-end mt-2 pt-3 border-t border-slate-100">
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
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-xs"
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

      {/* ========================================================================= */}
      {/* 2. Bulk Create Slots Dialog */}
      {/* ========================================================================= */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[580px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border border-slate-200 rounded-[10px] flex items-center justify-center shrink-0">
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
                    className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={bulkForm.slotDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, slotDate: e.target.value })}
                  />
                  <Calendar className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
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
                    className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={bulkForm.dayStartTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, dayStartTime: e.target.value })}
                  />
                  <Clock className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Day End Time *
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type="time"
                    className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    value={bulkForm.dayEndTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, dayEndTime: e.target.value })}
                  />
                  <Clock className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
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

            {/* Mode & Location */}
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
                  <Input
                    value={bulkForm.meetingLink}
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A] placeholder:text-slate-400"
                    onChange={(e) => setBulkForm({ ...bulkForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                ) : (
                  <Select
                    value={bulkForm.location}
                    onValueChange={(v) => setBulkForm({ ...bulkForm, location: v })}
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="Select location" />
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

          <div className="flex items-center gap-3 justify-end mt-2 pt-3 border-t border-slate-100">
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
              className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-xs"
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

      {/* ========================================================================= */}
      {/* 3. Edit Slot Dialog */}
      {/* ========================================================================= */}
      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[560px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F5F5F5] text-black border border-slate-200 rounded-[10px] flex items-center justify-center shrink-0">
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

              {/* Date, Start, End */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                    Date *
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      type="date"
                      value={editForm.slotDate}
                      className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      onChange={(e) => setEditForm({ ...editForm, slotDate: e.target.value })}
                    />
                    <Calendar className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
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
                      className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    />
                    <Clock className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
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
                      className="border-[#D4D4D4] rounded-[10px] h-11 pl-3.5 pr-10 text-sm bg-white text-[#0F172A] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    />
                    <Clock className="absolute right-3.5 size-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  {editForm.mode === "Virtual" ? "Meeting URL / Link" : "Venue / Location"}
                </Label>
                {editForm.mode === "Virtual" ? (
                  <Input
                    value={editForm.meetingLink}
                    className="border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A] placeholder:text-slate-400"
                    onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                ) : (
                  <Select
                    value={editForm.location}
                    onValueChange={(v) => setEditForm({ ...editForm, location: v })}
                  >
                    <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                      <SelectValue placeholder="Select interview location" />
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

              <div className="flex items-center gap-3 justify-end mt-2 pt-3 border-t border-slate-100">
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
                  className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-xs"
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

      {/* ========================================================================= */}
      {/* 4. Delete Single Slot Confirmation Dialog */}
      {/* ========================================================================= */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="bg-white rounded-2xl p-6 border border-slate-200 max-w-[460px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 border border-red-100 rounded-[10px] flex items-center justify-center shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-[#0F172A]">
                  Delete this slot?
                </AlertDialogTitle>
                <span className="text-xs text-slate-400">Permanent removal</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTargetId(null)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <AlertDialogDescription className="text-slate-600 text-sm py-2">
            Are you sure you want to permanently delete this interview slot? This action cannot be undone.
          </AlertDialogDescription>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-11 px-5 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer">
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

      {/* ========================================================================= */}
      {/* 5. Bulk Delete Available Slots Confirmation Dialog */}
      {/* ========================================================================= */}
      <AlertDialog
        open={!!bulkDeleteInterviewer}
        onOpenChange={(open) => !open && !isBulkDeleting && setBulkDeleteInterviewer(null)}
      >
        <AlertDialogContent className="bg-white rounded-2xl p-6 border border-slate-200 max-w-[480px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 border border-amber-100 rounded-[10px] flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-[#0F172A]">
                  Delete Available Slots?
                </AlertDialogTitle>
                <span className="text-xs text-slate-400">Bulk slots cleanup</span>
              </div>
            </div>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={() => setBulkDeleteInterviewer(null)}
              className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <AlertDialogDescription className="text-slate-600 text-sm py-2">
            This will permanently delete all{" "}
            <strong className="text-slate-900 font-bold">
              {bulkDeleteInterviewer?.availableCount || 0} available slot(s)
            </strong>{" "}
            for <strong className="text-slate-900 font-bold">{bulkDeleteInterviewer?.name}</strong>.
            <br />
            <br />
            <span className="text-xs text-slate-500">
              Note: Booked student slots will remain completely safe and untouched.
            </span>
          </AlertDialogDescription>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel
              disabled={isBulkDeleting}
              className="h-11 px-5 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isBulkDeleting}
              onClick={handleConfirmBulkDeleteAvailable}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold bg-[#EA2525] hover:bg-[#d61f1f] text-white cursor-pointer border-0 shadow-xs"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Deleting Slots...
                </>
              ) : (
                "Yes, delete available slots"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ========================================================================= */}
      {/* 6. Reschedule Interview Dialog */}
      {/* ========================================================================= */}
      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[560px] p-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left shadow-xl"
        >
          {rescheduleTarget && (
            <RescheduleInterviewModalContent
              target={rescheduleTarget}
              onClose={() => setRescheduleTarget(null)}
              allSlots={allSlots}
              teamMembers={teamMembers}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RescheduleInterviewModalContent({
  target,
  onClose,
  allSlots,
  teamMembers,
}: {
  target: { interview: Interview; currentSlot: InterviewSlot };
  onClose: () => void;
  allSlots: InterviewSlot[];
  teamMembers: any[];
}) {
  const reschedule = useRescheduleInterview();
  const [selectedSlotId, setSelectedSlotId] = React.useState<string>("");
  const [modeFilter, setModeFilter] = React.useState<"all" | "In-person" | "Virtual">("all");
  const [facultyFilter, setFacultyFilter] = React.useState<string>("all");

  const app = target.interview.application;

  // Filter available slots for the same interview type, excluding the current slot
  const availableSlots = React.useMemo(() => {
    return allSlots.filter((s) => {
      if (s.id === target.currentSlot.id) return false;
      if ((s.status || "").toLowerCase() !== "available") return false;
      if (s.interviewType !== target.interview.interviewType) return false;
      if (modeFilter !== "all" && s.mode !== modeFilter) return false;
      if (facultyFilter !== "all" && s.interviewerId !== facultyFilter) return false;
      return true;
    });
  }, [allSlots, target, modeFilter, facultyFilter]);

  const selectedSlot = React.useMemo(() => {
    return allSlots.find((s) => s.id === selectedSlotId);
  }, [allSlots, selectedSlotId]);

  const handleConfirmReschedule = async () => {
    if (!selectedSlotId) return;
    await reschedule.mutateAsync({
      id: target.interview.id,
      newSlotId: selectedSlotId,
    });
    onClose();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5F5F5] text-black border border-slate-200 rounded-[10px] flex items-center justify-center shrink-0">
            <CalendarClock className="size-5 text-slate-800" />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-[#0F172A]">Reschedule Interview</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a new available time slot for this candidate
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/60"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Candidate Card */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full bg-[#2563EB] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
              {app?.name ? app.name.slice(0, 2).toUpperCase() : "ST"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm truncate">{app?.name || "Student"}</span>
                {app?.applicationNo && (
                  <span className="text-xs font-mono font-semibold text-[#2563EB] bg-blue-100 px-2 py-0.5 rounded">
                    {app.applicationNo}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 block truncate mt-0.5">
                {(app as any)?.email || (app as any)?.phone || "Candidate"}
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {target.interview.interviewType} • Round {target.interview.round || 1}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-600 gap-2 flex-wrap">
          <span className="text-slate-400 font-medium">Current Slot:</span>
          <span className="font-semibold text-slate-800">
            {formatDate(target.currentSlot.slotDate)} ({formatTime(target.currentSlot.startTime)} – {formatTime(target.currentSlot.endTime)})
          </span>
          <span className="text-slate-500">
            • {target.currentSlot.interviewer?.name || "Assigned Faculty"}
          </span>
        </div>
      </div>

      {/* Filter Row: Mode & Faculty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
            Interview Mode
          </Label>
          <Select value={modeFilter} onValueChange={(v: any) => { setModeFilter(v); setSelectedSlotId(""); }}>
            <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
              <SelectValue placeholder="All Modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="In-person">In-person</SelectItem>
              <SelectItem value="Virtual">Virtual (Online)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
            Faculty / Interviewer
          </Label>
          <Select value={facultyFilter} onValueChange={(v) => { setFacultyFilter(v); setSelectedSlotId(""); }}>
            <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
              <SelectValue placeholder="All Faculty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faculty</SelectItem>
              {teamMembers.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Slot Selection Dropdown */}
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          New Available Slot * ({availableSlots.length} available)
        </Label>
        
        {availableSlots.length === 0 ? (
          <div className="border border-dashed border-slate-200 bg-slate-50/60 rounded-xl p-6 text-center flex flex-col items-center justify-center gap-2">
            <CalendarRange className="size-6 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700">
              No available {target.interview.interviewType} slots found
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Try switching Mode or Faculty filter to find openings, or add more slots in the Interview Slots dashboard.
            </p>
            {(modeFilter !== "all" || facultyFilter !== "all") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setModeFilter("all"); setFacultyFilter("all"); }}
                className="mt-1 h-8 text-xs font-semibold rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 cursor-pointer"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
            <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
              <SelectValue placeholder="Select an available time slot..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {availableSlots.map((slot) => {
                const interviewerName = slot.interviewer?.name || "Assigned Faculty";
                return (
                  <SelectItem key={slot.id} value={slot.id} className="cursor-pointer py-2">
                    <span className="font-semibold text-slate-900">{formatDate(slot.slotDate)}</span>
                    {" · "}
                    <span className="text-blue-600 font-medium">
                      {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                    </span>
                    {" · "}
                    <span className="text-slate-600">{slot.mode === "Virtual" ? "Virtual" : slot.location || "In-person"}</span>
                    {" · "}
                    <span className="text-slate-500">({interviewerName})</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selected Slot Highlight Card */}
      {selectedSlot && (
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-[#2563EB]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">
                {formatDate(selectedSlot.slotDate)} • {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                {selectedSlot.interviewer?.name || "Faculty"} • {selectedSlot.mode === "Virtual" ? "Virtual (Online)" : selectedSlot.location || "In-person"}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#2563EB] bg-blue-100 px-2.5 py-1 rounded-full shrink-0">
            Selected
          </span>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmReschedule}
          disabled={!selectedSlotId || reschedule.isPending}
          className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer border-0 shadow-xs"
        >
          {reschedule.isPending ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <CalendarClock className="size-4 mr-1.5" />
          )}
          Reschedule Interview
        </Button>
      </div>
    </div>
  );
}
