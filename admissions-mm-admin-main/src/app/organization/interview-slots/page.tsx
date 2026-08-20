"use client";

import * as React from "react";
import { Plus, Layers, Lock, Unlock, Ban, MapPin, Video } from "lucide-react";

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

  const { data: slots, isLoading } = useInterviewSlots({
    interviewerId: interviewerFilter !== "all" ? interviewerFilter : undefined,
    interviewType: typeFilter !== "all" ? (typeFilter as "GD" | "PI") : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

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

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Filters + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-1 gap-2 flex-wrap">
          <Select value={interviewerFilter} onValueChange={setInterviewerFilter}>
            <SelectTrigger className="w-[200px] h-10">
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="GD">GD</SelectItem>
              <SelectItem value="PI">PI</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10">
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
            <Layers className="size-4" /> Bulk Create
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" /> Add Slot
          </Button>
        </div>
      </div>

      {/* Slots table */}
      <div className="border border-border/80 rounded-[12px] bg-card overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5">
            <TableRow>
              <TableHead className="px-6">Interviewer</TableHead>
              <TableHead className="px-6">Type</TableHead>
              <TableHead className="px-6">Date</TableHead>
              <TableHead className="px-6">Time</TableHead>
              <TableHead className="px-6">Location / Mode</TableHead>
              <TableHead className="px-6">Status</TableHead>
              <TableHead className="px-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Loading slots...
                </TableCell>
              </TableRow>
            ) : !slots || slots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No interview slots yet. Use "Add Slot" or "Bulk Create" to get started.
                </TableCell>
              </TableRow>
            ) : (
              slots.map((s: InterviewSlot) => (
                <TableRow key={s.id}>
                  <TableCell className="px-6 font-medium">{s.interviewer?.name || s.interviewerId}</TableCell>
                  <TableCell className="px-6">
                    <Badge variant="secondary">{s.interviewType}</Badge>
                  </TableCell>
                  <TableCell className="px-6">{s.slotDate}</TableCell>
                  <TableCell className="px-6">
                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-1.5 text-sm">
                      {s.mode === "Virtual" ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                      {s.location || (s.mode === "Virtual" ? "Online" : "—")}
                    </div>
                  </TableCell>
                  <TableCell className="px-6">
                    <Badge className={STATUS_STYLES[s.status] || ""}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <div className="flex justify-end gap-1">
                      {s.status === "Available" && (
                        <>
                          <Button variant="ghost" size="icon" title="Block" onClick={() => blockSlot.mutate(s.id)}>
                            <Lock className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Cancel" onClick={() => setCancelTargetId(s.id)}>
                            <Ban className="size-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {s.status === "Blocked" && (
                        <Button variant="ghost" size="icon" title="Unblock" onClick={() => unblockSlot.mutate(s.id)}>
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

      {/* Add single slot */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px] p-6 bg-white rounded-2xl gap-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Add Interview Slot</h3>

          <div className="flex flex-col gap-2">
            <Label>Interviewer</Label>
            <Select value={singleForm.interviewerId} onValueChange={(v) => setSingleForm({ ...singleForm, interviewerId: v })}>
              <SelectTrigger className="w-full h-11">
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
                <SelectTrigger className="w-full h-11">
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
                <SelectTrigger className="w-full h-11">
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
              <Input type="date" value={singleForm.slotDate} onChange={(e) => setSingleForm({ ...singleForm, slotDate: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Start</Label>
              <Input type="time" value={singleForm.startTime} onChange={(e) => setSingleForm({ ...singleForm, startTime: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>End</Label>
              <Input type="time" value={singleForm.endTime} onChange={(e) => setSingleForm({ ...singleForm, endTime: e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{singleForm.mode === "Virtual" ? "Meeting Link" : "Location"}</Label>
            {singleForm.mode === "Virtual" ? (
              <Input
                value={singleForm.meetingLink}
                onChange={(e) => setSingleForm({ ...singleForm, meetingLink: e.target.value })}
                placeholder="https://..."
              />
            ) : (
              <Select value={singleForm.location} onValueChange={(v) => setSingleForm({ ...singleForm, location: v })}>
                <SelectTrigger className="w-full h-11">
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

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSingle}
              disabled={!singleForm.interviewerId || !singleForm.slotDate || !singleForm.startTime || !singleForm.endTime}
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
              <SelectTrigger className="w-full h-11">
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
                <SelectTrigger className="w-full h-11">
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
              <Input type="date" value={bulkForm.slotDate} onChange={(e) => setBulkForm({ ...bulkForm, slotDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Day Start</Label>
              <Input type="time" value={bulkForm.dayStartTime} onChange={(e) => setBulkForm({ ...bulkForm, dayStartTime: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Day End</Label>
              <Input type="time" value={bulkForm.dayEndTime} onChange={(e) => setBulkForm({ ...bulkForm, dayEndTime: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={bulkForm.slotDurationMinutes}
                onChange={(e) => setBulkForm({ ...bulkForm, slotDurationMinutes: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Mode</Label>
              <Select value={bulkForm.mode} onValueChange={(v) => setBulkForm({ ...bulkForm, mode: v as "In-person" | "Virtual" })}>
                <SelectTrigger className="w-full h-11">
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
                  onChange={(e) => setBulkForm({ ...bulkForm, meetingLink: e.target.value })}
                  placeholder="https://..."
                />
              ) : (
                <Select value={bulkForm.location} onValueChange={(v) => setBulkForm({ ...bulkForm, location: v })}>
                  <SelectTrigger className="w-full h-11">
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

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
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
            >
              Generate Slots
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTargetId} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the slot as Cancelled and it will no longer be available for booking. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
