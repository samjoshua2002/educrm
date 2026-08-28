"use client";

import * as React from "react";
import { Plus, Layers, Lock, Unlock, Ban, MapPin, Video, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { useTeam } from "@/hooks/use-team";
import { useLocations } from "@/hooks/use-locations";
import {
  useInterviewSlots,
  useCreateSlot,
  useBulkCreateSlots,
  useBlockSlot,
  useUnblockSlot,
  useCancelSlot,
  type InterviewSlot,
} from "@/hooks/use-interviews";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Available: "bg-emerald-100 text-emerald-700 border-0",
  Booked: "bg-blue-100 text-blue-700 border-0",
  Blocked: "bg-amber-100 text-amber-700 border-0",
  Cancelled: "bg-red-100 text-red-700 border-0",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function InterviewSlotsPage() {
  usePageHeader({
    title: "Interview Slot Management",
    description: "Create and manage GD/PI interview slots per interviewer.",
  });

  const { data: teamResponse } = useTeam();
  const teamMembers = (teamResponse as any)?.data || [];

  // Interview venues come from the Location master (type="Interview"),
  // managed at /organization/settings/locations — not free text, so slot
  // locations stay consistent with what's actually configured.
  const { data: interviewLocations } = useLocations({ type: "Interview", isActive: true });

  const [interviewerFilter, setInterviewerFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  const { data: slots, isLoading } = useInterviewSlots({
    interviewerId: interviewerFilter !== "all" ? interviewerFilter : undefined,
    interviewType: typeFilter !== "all" ? (typeFilter as "GD" | "PI") : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [interviewerFilter, typeFilter, statusFilter]);

  const blockSlot = useBlockSlot();
  const unblockSlot = useUnblockSlot();
  const cancelSlot = useCancelSlot();

  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    await cancelSlot.mutateAsync(cancelTargetId);
    setCancelTargetId(null);
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
      location: singleForm.location || undefined,
      mode: singleForm.mode,
      meetingLink: singleForm.meetingLink || undefined,
    });
    setCreateOpen(false);
  };

  // Bulk create dialog (recurring pattern, e.g. every 30 min for a day)
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
      location: bulkForm.location || undefined,
      mode: bulkForm.mode,
      meetingLink: bulkForm.meetingLink || undefined,
    });
    setBulkOpen(false);
  };

  // Pagination Calculations
  const filteredSlots = React.useMemo(() => {
    return slots || [];
  }, [slots]);

  const paginatedSlots = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSlots.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSlots, currentPage]);

  const totalPages = Math.ceil(filteredSlots.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

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
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      {/* Filters + Actions Card */}
      <div className="border border-[#e5e5e5] rounded-[12px] bg-white p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="flex flex-col gap-1 w-full sm:w-[220px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interviewer</span>
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

          <div className="flex flex-col gap-1 w-full sm:w-[150px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</span>
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

          <div className="flex flex-col gap-1 w-full sm:w-[160px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
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
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
          <Button
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="gap-2 h-10 border-[#D4D4D4] hover:bg-slate-50 text-slate-700 font-medium rounded-[8px] text-[13px] cursor-pointer"
          >
            <Layers className="size-4" /> Bulk Create
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium h-10 px-5 rounded-[8px] text-[13px] cursor-pointer border-0 shadow-sm"
          >
            <Plus className="size-4" /> Add Slot
          </Button>
        </div>
      </div>

      {/* Slots Table & Cards container */}
      <div className="border border-[#e5e5e5] rounded-[12px] bg-white shadow-sm overflow-hidden flex flex-col w-full max-w-full">
        {/* Desktop Table View */}
        <div className="hidden lg:block w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Interviewer</TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Type</TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Date</TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Time</TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Location / Mode</TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Status</TableHead>
                <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-500 font-medium">
                    <Loader2 className="size-6 animate-spin text-primary inline mr-2" />
                    Loading slots...
                  </TableCell>
                </TableRow>
              ) : filteredSlots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-500 font-medium">
                    No interview slots yet. Use &quot;Add Slot&quot; or &quot;Bulk Create&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSlots.map((s: InterviewSlot) => (
                  <TableRow key={s.id} className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[64px]">
                    <TableCell className="py-[14px] px-[24px] align-middle font-semibold text-[#1e293b] text-[14px]">
                      {s.interviewer?.name || s.interviewerId}
                    </TableCell>
                    <TableCell className="py-[14px] px-[24px] align-middle">
                      <Badge variant="secondary" className="text-[11px] rounded-md px-2 py-0.5 font-semibold">
                        {s.interviewType}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">{s.slotDate}</TableCell>
                    <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">
                      {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </TableCell>
                    <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">
                      <div className="flex items-center gap-1.5 text-sm">
                        {s.mode === "Virtual" ? <Video className="size-3.5 text-slate-400" /> : <MapPin className="size-3.5 text-slate-400" />}
                        <span>{s.location || (s.mode === "Virtual" ? "Online" : "—")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-[14px] px-[24px] align-middle">
                      <Badge className={cn("border-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-3xs", STATUS_STYLES[s.status] || "")}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-[14px] px-[24px] align-middle text-right">
                      <div className="flex justify-end gap-1">
                        {s.status === "Available" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" title="Block" onClick={() => blockSlot.mutate(s.id)}>
                              <Lock className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" title="Cancel" onClick={() => setCancelTargetId(s.id)}>
                              <Ban className="size-4" />
                            </Button>
                          </>
                        )}
                        {s.status === "Blocked" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" title="Unblock" onClick={() => unblockSlot.mutate(s.id)}>
                            <Unlock className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block lg:hidden p-4 space-y-4 bg-slate-50/50">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500 font-medium bg-white rounded-xl border border-[#e5e5e5]">
              Loading slots...
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="py-10 text-center text-slate-500 font-medium bg-white rounded-xl border border-[#e5e5e5]">
              No interview slots yet. Use &quot;Add Slot&quot; or &quot;Bulk Create&quot; to get started.
            </div>
          ) : (
            paginatedSlots.map((s: InterviewSlot) => (
              <div
                key={s.id}
                className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex flex-col gap-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-[14px]">
                      {s.interviewer?.name || s.interviewerId}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {s.slotDate} · {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-semibold">
                      {s.interviewType}
                    </Badge>
                    <Badge className={cn("border-0 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-3xs", STATUS_STYLES[s.status] || "")}>
                      {s.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#e2e8f0]/80 pt-3 text-[12px]">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {s.mode === "Virtual" ? <Video className="size-3.5 text-slate-400" /> : <MapPin className="size-3.5 text-slate-400" />}
                    <span>{s.location || (s.mode === "Virtual" ? "Online" : "—")}</span>
                  </div>

                  <div className="flex justify-end gap-1">
                    {s.status === "Available" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" title="Block" onClick={() => blockSlot.mutate(s.id)}>
                          <Lock className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" title="Cancel" onClick={() => setCancelTargetId(s.id)}>
                          <Ban className="size-4" />
                        </Button>
                      </>
                    )}
                    {s.status === "Blocked" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" title="Unblock" onClick={() => unblockSlot.mutate(s.id)}>
                        <Unlock className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {filteredSlots.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#e2e8f0] bg-[#FCFDFD] dark:bg-muted/5 py-4 px-6 gap-4">
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
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs cursor-pointer"
                  onClick={() => {
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Prev
                </Button>
                <div className="flex items-center gap-1.5 px-1">
                  {visiblePages.map((page) => {
                    const isActive = page === currentPage;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[#2563EB] border-[#2563EB] text-white font-semibold hover:bg-[#1d4ed8] shadow-xs"
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
                  className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs cursor-pointer"
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

      {/* Add single slot */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px] p-6 bg-white rounded-2xl gap-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Add Interview Slot</h3>

          <div className="flex flex-col gap-2">
            <Label>Interviewer</Label>
            <Select value={singleForm.interviewerId} onValueChange={(v) => setSingleForm({ ...singleForm, interviewerId: v })}>
              <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                <SelectValue placeholder="Select interviewer" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={singleForm.interviewType} onValueChange={(v) => setSingleForm({ ...singleForm, interviewType: v as "GD" | "PI" })}>
                <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GD">GD</SelectItem>
                  <SelectItem value="PI">PI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Mode</Label>
              <Select value={singleForm.mode} onValueChange={(v) => setSingleForm({ ...singleForm, mode: v as "In-person" | "Virtual" })}>
                <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In-person">In-person</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" value={singleForm.slotDate} className="border-[#D4D4D4] rounded-[8px]" onChange={(e) => setSingleForm({ ...singleForm, slotDate: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Start</Label>
              <Input type="time" value={singleForm.startTime} className="border-[#D4D4D4] rounded-[8px]" onChange={(e) => setSingleForm({ ...singleForm, startTime: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>End</Label>
              <Input type="time" value={singleForm.endTime} className="border-[#D4D4D4] rounded-[8px]" onChange={(e) => setSingleForm({ ...singleForm, endTime: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{singleForm.mode === "Virtual" ? "Meeting Link" : "Location"}</Label>
            {singleForm.mode === "Virtual" ? (
              <Input
                value={singleForm.meetingLink}
                className="border-[#D4D4D4] rounded-[8px]"
                onChange={(e) => setSingleForm({ ...singleForm, meetingLink: e.target.value })}
                placeholder="https://..."
              />
            ) : (
              <Select value={singleForm.location} onValueChange={(v) => setSingleForm({ ...singleForm, location: v })}>
                <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                  <SelectValue
                    placeholder={
                      (interviewLocations || []).length === 0
                        ? "No interview locations configured"
                        : "Select an interview location"
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

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="border-[#D4D4D4] rounded-[8px] h-10 cursor-pointer" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSingle}
              disabled={!singleForm.interviewerId || !singleForm.slotDate || !singleForm.startTime || !singleForm.endTime}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-[8px] h-10 px-5 font-semibold transition-colors cursor-pointer border-0 shadow-sm"
            >
              Create Slot
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk create */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[560px] p-6 bg-white rounded-2xl gap-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Bulk Create Slots</h3>
          <p className="text-sm text-muted-foreground -mt-2">
            Generates back-to-back slots for one interviewer on one day (e.g. every 30 minutes from 10:00 to 17:00).
          </p>

          <div className="flex flex-col gap-2">
            <Label>Interviewer</Label>
            <Select value={bulkForm.interviewerId} onValueChange={(v) => setBulkForm({ ...bulkForm, interviewerId: v })}>
              <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                <SelectValue placeholder="Select interviewer" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select value={bulkForm.interviewType} onValueChange={(v) => setBulkForm({ ...bulkForm, interviewType: v as "GD" | "PI" })}>
                <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GD">GD</SelectItem>
                  <SelectItem value="PI">PI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Input type="date" className="border-[#D4D4D4] rounded-[8px]" value={bulkForm.slotDate} onChange={(e) => setBulkForm({ ...bulkForm, slotDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Day Start</Label>
              <Input type="time" className="border-[#D4D4D4] rounded-[8px]" value={bulkForm.dayStartTime} onChange={(e) => setBulkForm({ ...bulkForm, dayStartTime: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Day End</Label>
              <Input type="time" className="border-[#D4D4D4] rounded-[8px]" value={bulkForm.dayEndTime} onChange={(e) => setBulkForm({ ...bulkForm, dayEndTime: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                className="border-[#D4D4D4] rounded-[8px]"
                value={bulkForm.slotDurationMinutes}
                onChange={(e) => setBulkForm({ ...bulkForm, slotDurationMinutes: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Mode</Label>
              <Select value={bulkForm.mode} onValueChange={(v) => setBulkForm({ ...bulkForm, mode: v as "In-person" | "Virtual" })}>
                <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In-person">In-person</SelectItem>
                  <SelectItem value="Virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{bulkForm.mode === "Virtual" ? "Meeting Link" : "Location"}</Label>
              {bulkForm.mode === "Virtual" ? (
                <Input
                  value={bulkForm.meetingLink}
                  className="border-[#D4D4D4] rounded-[8px]"
                  onChange={(e) => setBulkForm({ ...bulkForm, meetingLink: e.target.value })}
                  placeholder="https://..."
                />
              ) : (
                <Select value={bulkForm.location} onValueChange={(v) => setBulkForm({ ...bulkForm, location: v })}>
                  <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white">
                    <SelectValue
                      placeholder={
                        (interviewLocations || []).length === 0
                          ? "No interview locations configured"
                          : "Select a location"
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

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="border-[#D4D4D4] rounded-[8px] h-10 cursor-pointer" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={
                !bulkForm.interviewerId ||
                !bulkForm.slotDate ||
                !bulkForm.dayStartTime ||
                !bulkForm.dayEndTime ||
                !bulkForm.slotDurationMinutes
              }
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-[8px] h-10 px-5 font-semibold transition-colors cursor-pointer border-0 shadow-sm"
            >
              Generate Slots
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTargetId} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <AlertDialogContent className="bg-white rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#0F172A]">Cancel this slot?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-sm">
              This will mark the slot as Cancelled and it will no longer be available for booking. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="border-[#D4D4D4] rounded-[8px] h-10 cursor-pointer">Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[8px] h-10 cursor-pointer"
            >
              Yes, cancel slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
