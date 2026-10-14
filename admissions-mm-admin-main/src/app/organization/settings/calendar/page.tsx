"use client";

import * as React from "react";
import { CalendarCheck, Link2, Loader2, Pencil, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { useInterviewPicklists } from "@/hooks/use-interviews";
import {
  useCalendarConnections,
  useCalendarSettings,
  useConnectCalendar,
  useDisconnectCalendar,
  useRefreshAvailability,
  useRunCalendarSync,
  useUpdateCalendarConnection,
  useUpdateCalendarSettings,
  type CalendarProvider,
  type InterviewCalendarSync,
  type UpdateCalendarSettingsInput,
} from "@/hooks/use-calendar-sync";

const ADMIN_ROLES = ["superadmin", "org_admin"];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    Connected: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    Synced: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    Failed: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    Disconnected: "bg-slate-100 text-slate-600 border-slate-200",
    "Not Connected": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  padding: "16px 20px",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #F8FAFC",
  background: "#FAFAFA",
};

export default function CalendarIntegrationSettingsPage() {
  usePageHeader({
    title: "Calendar Integration",
    description: "Sync interviews with Google Calendar and Outlook, and read interviewer availability.",
  });

  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = !!role && ADMIN_ROLES.includes(role);
  // POST calendar-sync/run also allows exam_manager.
  const canRunSync = isAdmin || role === "exam_manager";

  const { data: settings, isLoading: settingsLoading } = useCalendarSettings();
  const updateSettings = useUpdateCalendarSettings();
  const { data: connections = [], isLoading: connectionsLoading } = useCalendarConnections();
  const connect = useConnectCalendar();
  const runSync = useRunCalendarSync();
  const refreshAvailability = useRefreshAvailability();
  const disconnect = useDisconnectCalendar();
  const updateConnection = useUpdateCalendarConnection();
  const { data: picklists } = useInterviewPicklists();

  const [form, setForm] = React.useState<UpdateCalendarSettingsInput>({});
  const [editingSettings, setEditingSettings] = React.useState(false);
  const [editConnection, setEditConnection] = React.useState<InterviewCalendarSync | null>(null);
  const [connectionForm, setConnectionForm] = React.useState({ calendarEmail: "", availabilityWindow: "" });

  // Result of the OAuth redirect (/organization/settings/calendar?calendar=...)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("calendar");
    if (!result) return;
    if (result === "connected") toast.success(`${params.get("provider") ?? "Calendar"} connected`);
    else toast.error(params.get("message") || "Calendar connection failed");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const openSettingsEditor = () => {
    if (!settings) return;
    setForm({
      googleEnabled: settings.googleEnabled,
      googleClientId: settings.googleClientId ?? "",
      googleClientSecret: "",
      microsoftEnabled: settings.microsoftEnabled,
      microsoftClientId: settings.microsoftClientId ?? "",
      microsoftClientSecret: "",
      microsoftTenantId: settings.microsoftTenantId ?? "common",
      redirectUri: settings.redirectUri ?? "",
      autoMeetingLink: settings.autoMeetingLink,
      inviteCandidate: settings.inviteCandidate,
      availabilityDays: settings.availabilityDays,
      workdayStart: settings.workdayStart,
      workdayEnd: settings.workdayEnd,
      timeZone: settings.timeZone,
    });
    setEditingSettings(true);
  };

  const saveSettings = () => {
    const payload: UpdateCalendarSettingsInput = { ...form };
    // Empty secret = keep the stored one.
    if (!payload.googleClientSecret) delete payload.googleClientSecret;
    if (!payload.microsoftClientSecret) delete payload.microsoftClientSecret;
    if (payload.availabilityDays !== undefined) payload.availabilityDays = Number(payload.availabilityDays);
    updateSettings.mutate(payload, { onSuccess: () => setEditingSettings(false) });
  };

  const startConnect = (provider: CalendarProvider) => {
    connect.mutate(
      { provider },
      {
        onSuccess: (res) => {
          if (res?.authorizeUrl) window.location.href = res.authorizeUrl;
        },
      },
    );
  };

  const myUserId = useAuthStore((s) => s.user?.id);
  const myConnections = connections.filter((c) => c.interviewerId === myUserId);
  const providerReady = (p: CalendarProvider) =>
    p === "Google Calendar"
      ? !!settings?.googleEnabled && !!settings?.googleClientId && !!settings?.hasGoogleClientSecret
      : !!settings?.microsoftEnabled && !!settings?.microsoftClientId && !!settings?.hasMicrosoftClientSecret;

  return (
    <div className="flex flex-col gap-5 p-3.5 sm:p-5 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      {settingsLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#1A237E]" /> Loading calendar settings...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Organisation OAuth apps */}
            <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
              <div style={cardHeaderStyle}>
                <div className="font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                  Calendar Providers
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer rounded-full"
                    onClick={openSettingsEditor}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-3 text-sm">
                {(["Google Calendar", "Outlook"] as CalendarProvider[]).map((p) => (
                  <div key={p} className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC]">
                    <span className="font-medium text-[#1E293B]">{p}</span>
                    {providerReady(p) ? (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Set up</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not set up</Badge>
                    )}
                  </div>
                ))}
                <div className="text-xs text-[#64748B] space-y-1 pt-1">
                  <p>
                    OAuth redirect URI to register with Google / Microsoft:{" "}
                    <span className="font-mono text-[#1E293B] break-all">{settings?.effectiveRedirectUri}</span>
                  </p>
                  <p>
                    Meeting links: {settings?.autoMeetingLink ? "created automatically (Google Meet / Teams)" : "off"} ·
                    Candidate invited: {settings?.inviteCandidate ? "yes" : "no"}
                  </p>
                  <p>
                    Availability window: next {settings?.availabilityDays} days, {settings?.workdayStart}–{settings?.workdayEnd} (
                    {settings?.timeZone})
                  </p>
                </div>
              </div>
            </div>

            {/* My calendar */}
            <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
              <div style={cardHeaderStyle}>
                <div className="font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                  My Calendar
                </div>
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-3 text-sm">
                <p className="text-xs text-[#64748B]">
                  Connect your calendar so interviews you are on the panel for appear in it, with the meeting link, and
                  your free/busy time fills your availability window.
                </p>
                {(["Google Calendar", "Outlook"] as CalendarProvider[]).map((p) => {
                  const mine = myConnections.find((c) => c.calendarProvider === p);
                  const connected = mine && ["Connected", "Synced"].includes(mine.syncStatus);
                  return (
                    <div key={p} className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-[#F8FAFC]">
                      <div>
                        <span className="font-medium text-[#1E293B]">{p}</span>
                        {mine?.calendarEmail && <span className="block text-xs text-[#64748B]">{mine.calendarEmail}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {mine && statusBadge(mine.syncStatus)}
                        <Button
                          size="sm"
                          variant={connected ? "outline" : "default"}
                          disabled={!providerReady(p) || connect.isPending}
                          onClick={() => startConnect(p)}
                          className="h-8 rounded-[8px] text-xs cursor-pointer"
                          title={providerReady(p) ? undefined : "An admin must set up this provider first"}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1" />
                          {connected ? "Reconnect" : "Connect"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interview_Calendar_Sync records */}
          <div className="flex flex-col rounded-[8px] border border-[#D4D4D4] bg-[#FFF] shadow-xs overflow-hidden">
            <div style={cardHeaderStyle}>
              <div className="font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B] flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" /> Interviewer Calendars
              </div>
              {canRunSync && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={runSync.isPending}
                  onClick={() => runSync.mutate()}
                  className="h-8 rounded-[8px] text-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${runSync.isPending ? "animate-spin" : ""}`} /> Sync now
                </Button>
              )}
            </div>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sync ID</TableHead>
                    <TableHead>Interviewer</TableHead>
                    <TableHead>Calendar Provider</TableHead>
                    <TableHead>Calendar Email</TableHead>
                    <TableHead>Sync Status</TableHead>
                    <TableHead>Last Sync Time</TableHead>
                    <TableHead>Availability Window</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connectionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : connections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        No calendars connected yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    connections.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">CS-{c.calendarSyncNumber}</TableCell>
                        <TableCell>
                          <span className="block">{c.interviewer?.name ?? "-"}</span>
                          <span className="block text-xs text-muted-foreground">{c.interviewer?.email ?? ""}</span>
                        </TableCell>
                        <TableCell>{c.calendarProvider}</TableCell>
                        <TableCell>{c.calendarEmail ?? "-"}</TableCell>
                        <TableCell>
                          {statusBadge(c.syncStatus)}
                          {c.lastError && <span className="block text-[11px] text-rose-600 mt-1 max-w-[220px]">{c.lastError}</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(c.lastSyncTime)}</TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="text-xs text-[#475569] whitespace-pre-line line-clamp-4">{c.availabilityWindow ?? "-"}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Read free/busy now"
                            disabled={refreshAvailability.isPending || c.syncStatus === "Disconnected"}
                            onClick={() => refreshAvailability.mutate(c.id)}
                            className="h-8 w-8 cursor-pointer"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => {
                              setConnectionForm({ calendarEmail: c.calendarEmail ?? "", availabilityWindow: c.availabilityWindow ?? "" });
                              setEditConnection(c);
                            }}
                            className="h-8 w-8 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Disconnect"
                            disabled={disconnect.isPending || c.syncStatus === "Disconnected"}
                            onClick={() => disconnect.mutate(c.id)}
                            className="h-8 w-8 text-red-500 hover:bg-red-50 cursor-pointer"
                          >
                            <Unplug className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Provider settings editor (admins) */}
      <Dialog open={editingSettings} onOpenChange={setEditingSettings}>
        <DialogContent className="max-w-[680px] w-[95%] sm:w-full rounded-[12px] p-5 sm:p-7 gap-0 bg-white max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-[#E5E5E5] space-y-0">
            <DialogTitle className="text-[#0A0A0A] font-semibold text-[17px] sm:text-[20px] leading-7 font-sans">
              Calendar Provider Settings
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 pt-5">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Google Calendar</h3>
                <Switch checked={!!form.googleEnabled} onCheckedChange={(v) => setForm({ ...form, googleEnabled: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">OAuth Client ID</Label>
                  <Input value={form.googleClientId ?? ""} onChange={(e) => setForm({ ...form, googleClientId: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">
                    Client Secret {settings?.hasGoogleClientSecret ? "(saved; leave empty to keep)" : ""}
                  </Label>
                  <Input
                    type="password"
                    value={form.googleClientSecret ?? ""}
                    onChange={(e) => setForm({ ...form, googleClientSecret: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-[#F1F5F9] pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Outlook (Microsoft Graph)</h3>
                <Switch checked={!!form.microsoftEnabled} onCheckedChange={(v) => setForm({ ...form, microsoftEnabled: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">Application (client) ID</Label>
                  <Input value={form.microsoftClientId ?? ""} onChange={(e) => setForm({ ...form, microsoftClientId: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">
                    Client Secret {settings?.hasMicrosoftClientSecret ? "(saved)" : ""}
                  </Label>
                  <Input
                    type="password"
                    value={form.microsoftClientSecret ?? ""}
                    onChange={(e) => setForm({ ...form, microsoftClientSecret: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">Tenant ID</Label>
                  <Input
                    value={form.microsoftTenantId ?? ""}
                    placeholder="common"
                    onChange={(e) => setForm({ ...form, microsoftTenantId: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-[#F1F5F9] pt-4">
              <h3 className="font-bold text-slate-800 text-sm">Sync options</h3>
              <div className="space-y-1">
                <Label className="text-xs text-[#64748B]">Redirect URI override (optional)</Label>
                <Input
                  value={form.redirectUri ?? ""}
                  placeholder={settings?.effectiveRedirectUri}
                  onChange={(e) => setForm({ ...form, redirectUri: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-[#475569]">
                  <Switch checked={!!form.autoMeetingLink} onCheckedChange={(v) => setForm({ ...form, autoMeetingLink: v })} />
                  Create meeting link for virtual interviews
                </label>
                <label className="flex items-center gap-2 text-sm text-[#475569]">
                  <Switch checked={!!form.inviteCandidate} onCheckedChange={(v) => setForm({ ...form, inviteCandidate: v })} />
                  Invite the candidate
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">Availability days</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={form.availabilityDays ?? ""}
                    onChange={(e) => setForm({ ...form, availabilityDays: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">Workday start</Label>
                  <Input type="time" value={form.workdayStart ?? ""} onChange={(e) => setForm({ ...form, workdayStart: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">Workday end</Label>
                  <Input type="time" value={form.workdayEnd ?? ""} onChange={(e) => setForm({ ...form, workdayEnd: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#64748B]">Time zone</Label>
                  <select
                    value={form.timeZone ?? ""}
                    onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {(picklists?.timeZones ?? [form.timeZone ?? "Asia/Kolkata"]).map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
              <Button variant="outline" onClick={() => setEditingSettings(false)} className="h-10 px-5 rounded-[8px] text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                onClick={saveSettings}
                disabled={updateSettings.isPending}
                className="h-10 px-6 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer"
              >
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connection editor */}
      <Dialog open={editConnection !== null} onOpenChange={(open) => !open && setEditConnection(null)}>
        <DialogContent className="max-w-[520px] w-[95%] rounded-[12px] p-6 bg-white">
          <DialogHeader>
            <DialogTitle>Edit Calendar Connection</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-[#64748B]">Calendar Email</Label>
              <Input
                type="email"
                value={connectionForm.calendarEmail}
                onChange={(e) => setConnectionForm({ ...connectionForm, calendarEmail: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#64748B]">Availability Window</Label>
              <Textarea
                rows={5}
                value={connectionForm.availabilityWindow}
                onChange={(e) => setConnectionForm({ ...connectionForm, availabilityWindow: e.target.value })}
              />
              <p className="text-[11px] text-[#64748B]">Filled automatically from free/busy when the calendar is connected.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditConnection(null)} className="h-9 rounded-[8px] text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                disabled={updateConnection.isPending}
                onClick={() =>
                  editConnection &&
                  updateConnection.mutate(
                    { id: editConnection.id, data: connectionForm },
                    { onSuccess: () => setEditConnection(null) },
                  )
                }
                className="h-9 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white text-xs cursor-pointer"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
