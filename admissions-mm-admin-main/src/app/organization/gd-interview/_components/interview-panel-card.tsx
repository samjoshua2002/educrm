"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, ClipboardCheck, Pencil, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInterviews, useUpdateInterview, useInterviewPicklists, type Interview } from "@/hooks/use-interviews";
import { useInterviewEvaluations } from "@/hooks/use-evaluations";
import { useInterviewCalendarEvent, useSyncInterviewCalendar } from "@/hooks/use-calendar-sync";
import { useTeam } from "@/hooks/use-team";

const STATUS_STYLES: Record<string, string> = {
  "Slot Available": "bg-slate-100 text-slate-700 border-slate-200",
  Scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Rescheduled: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  Completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "No Show": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Cancelled: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

type TeamUser = { id: string; name: string; email?: string; role?: string };

// Interviews of one candidate: status, schedule, assigned panel (editable;
// the API notifies newly added panel members), calendar sync and the panel's
// submitted feedback.
export function InterviewPanelCard({ applicationId }: { applicationId?: string }) {
  const { data: interviews = [], isLoading } = useInterviews(applicationId ? { applicationId } : undefined);
  const { data: teamResponse } = useTeam(1, 200);
  const team: TeamUser[] = React.useMemo(() => {
    const raw = (teamResponse as any)?.data ?? teamResponse ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [teamResponse]);
  const nameOf = React.useCallback((id: string) => team.find((u) => u.id === id)?.name ?? "Team member", [team]);

  const [editing, setEditing] = React.useState<Interview | null>(null);
  const list = (Array.isArray(interviews) ? interviews : []).filter((iv) => !applicationId || iv.applicationId === applicationId);

  if (!applicationId) return null;

  return (
    <Card className="w-full rounded-[8px] border border-[#D4D4D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden gap-0 py-0">
      <CardHeader className="flex flex-row space-y-0 justify-between items-center py-3.5 px-4 sm:px-5 border-b border-[#F8FAFC] bg-[#FAFAFA]">
        <CardTitle className="flex items-center gap-2 font-sans text-sm sm:text-[16px] font-bold leading-6 text-[#1E293B] m-0 p-0">
          <Users className="h-4 w-4 shrink-0" />
          Interviews &amp; Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading interviews...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interview has been created for this candidate yet.</p>
        ) : (
          list.map((iv) => <InterviewRow key={iv.id} interview={iv} nameOf={nameOf} onEdit={() => setEditing(iv)} />)
        )}
      </CardContent>

      <EditInterviewDialog interview={editing} team={team} onClose={() => setEditing(null)} />
    </Card>
  );
}

function InterviewRow({
  interview,
  nameOf,
  onEdit,
}: {
  interview: Interview;
  nameOf: (id: string) => string;
  onEdit: () => void;
}) {
  const { data: evaluations = [] } = useInterviewEvaluations(interview.id);
  const { data: calendarEvent } = useInterviewCalendarEvent(interview.id);
  const syncCalendar = useSyncInterviewCalendar();
  const start = interview.startTime ?? interview.slot?.startTime ?? null;
  const meetingLink = interview.meetingLink ?? interview.slot?.meetingLink ?? null;
  const location = interview.location ?? interview.slot?.location ?? null;

  return (
    <div className="rounded-[8px] border border-[#E2E8F0] p-3 sm:p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-[#1E293B]">
            {interview.interviewType === "GD" ? "Group Discussion" : "Personal Interview"} · Round {interview.round}
          </span>
          {interview.interviewNumber ? <span className="text-xs text-muted-foreground">INT-{interview.interviewNumber}</span> : null}
          <Badge variant="outline" className={`text-xs ${STATUS_STYLES[interview.status] ?? ""}`}>
            {interview.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs cursor-pointer"
            disabled={syncCalendar.isPending}
            onClick={() => syncCalendar.mutate(interview.id)}
            title="Create / update the calendar event now"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync calendar
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={onEdit} title="Edit interview & panel">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="block text-muted-foreground">When</span>
          <span className="font-medium text-[#1E293B]">{formatDateTime(start)}</span>
          {interview.interviewMode && <span className="block text-muted-foreground">{interview.interviewMode}</span>}
        </div>
        <div>
          <span className="block text-muted-foreground">Where</span>
          {meetingLink ? (
            <a href={meetingLink} target="_blank" rel="noreferrer" className="font-medium text-primary underline break-all">
              Meeting link
            </a>
          ) : (
            <span className="font-medium text-[#1E293B]">{location || "-"}</span>
          )}
        </div>
        <div>
          <span className="block text-muted-foreground">Calendar</span>
          <span className="font-medium text-[#1E293B]">{calendarEvent?.syncStatus ?? "Not Connected"}</span>
          {calendarEvent?.lastError && <span className="block text-rose-600">{calendarEvent.lastError}</span>}
        </div>
      </div>

      <div className="text-xs">
        <span className="block text-muted-foreground mb-1">Assigned panel</span>
        {interview.assignedPanel?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {interview.assignedPanel.map((id) => (
              <Badge key={id} variant="outline" className="text-xs font-normal">
                {nameOf(id)}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">No panel assigned</span>
        )}
      </div>

      <div className="text-xs border-t border-[#F1F5F9] pt-2">
        <span className="flex items-center gap-1 text-muted-foreground mb-1">
          <ClipboardCheck className="h-3.5 w-3.5" /> Panel feedback
        </span>
        {evaluations.length === 0 ? (
          <span className="text-muted-foreground">No feedback yet.</span>
        ) : (
          <div className="flex flex-col gap-1">
            {evaluations.map((ev) => (
              <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-[#1E293B]">{ev.evaluatorName ?? nameOf(ev.evaluatorId)}</span>
                <span className="text-muted-foreground">
                  {ev.status === "submitted" ? "Submitted" : "Draft"}
                  {ev.overallRecommendation ? ` · ${ev.overallRecommendation}` : ""}
                  {ev.totalWeightedScore !== undefined ? ` · Weighted ${ev.totalWeightedScore}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link href={`/organization/gd-interview/evaluate/${interview.id}`} className="inline-block mt-2 text-primary underline">
          Open evaluator portal
        </Link>
      </div>
    </div>
  );
}

function EditInterviewDialog({
  interview,
  team,
  onClose,
}: {
  interview: Interview | null;
  team: TeamUser[];
  onClose: () => void;
}) {
  const updateInterview = useUpdateInterview();
  const { data: picklists } = useInterviewPicklists();
  const [panel, setPanel] = React.useState<string[]>([]);
  const [mode, setMode] = React.useState<string>("In-person");
  const [meetingLink, setMeetingLink] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [round, setRound] = React.useState("1");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!interview) return;
    setPanel(interview.assignedPanel ?? []);
    setMode(interview.interviewMode ?? interview.slot?.mode ?? "In-person");
    setMeetingLink(interview.meetingLink ?? "");
    setLocation(interview.location ?? "");
    setRound(String(interview.round ?? 1));
    setSearch("");
  }, [interview]);

  const candidates = team.filter(
    (u) => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const save = () => {
    if (!interview) return;
    updateInterview.mutate(
      {
        id: interview.id,
        data: {
          assignedPanel: panel,
          interviewMode: mode as "In-person" | "Virtual",
          meetingLink: meetingLink || undefined,
          location: location || undefined,
          round: Number(round) || 1,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={interview !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px] w-[95%] rounded-[12px] p-6 bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Interview</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#64748B]">Interview Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(picklists?.interviewModes ?? ["In-person", "Virtual"]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#64748B]">Interview Round</Label>
              <Input type="number" min={1} value={round} onChange={(e) => setRound(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Meeting Link</Label>
            <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://..." className="h-9" />
            <p className="text-[11px] text-muted-foreground">Left empty, a connected calendar can create one automatically.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[#64748B]">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-9" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-[#64748B]">Assigned Panel</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members" className="h-9" />
            <div className="max-h-[220px] overflow-y-auto rounded-[8px] border border-[#E2E8F0] divide-y">
              {candidates.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">No team members found.</p>
              ) : (
                candidates.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                    <Checkbox
                      checked={panel.includes(u.id)}
                      onCheckedChange={(checked) =>
                        setPanel((prev) => (checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))
                      }
                    />
                    <span className="flex-1">
                      {u.name}
                      <span className="block text-[11px] text-muted-foreground">{u.email}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Newly added panel members get an in-app notification.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="h-9 rounded-[8px] text-xs cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={updateInterview.isPending}
              className="h-9 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs cursor-pointer"
            >
              {updateInterview.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
