"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowLeft, Pencil, Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useCommitteeTeams,
  useDecisionPicklists,
  useDecisionSettings,
  useDeleteCommitteeTeam,
  useSaveCommitteeTeam,
  useUpdateDecisionSettings,
  type CommitteeTeam,
} from "@/hooks/use-admission-decisions";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { TONE } from "@/types/admission-decisions";

import {
  AccessRestricted,
  CELL,
  EmptyRow,
  LoadingRow,
  Pill,
  ROW,
  TABLE_HEADER,
  TABLE_WRAPPER,
  Th,
} from "../_components/shared";

export default function DecisionSettingsPage() {
  usePageHeader({
    title: "Decision Settings",
    description:
      "Approvers, offer validity, acceptance window, seat booking fee, waitlist movement and committee teams.",
  });

  const user = useAuthStore((s) => s.user);
  const isAdmin = !!user && ["org_admin", "superadmin"].includes(user.role);
  const canManageTeams =
    !!user &&
    ["org_admin", "superadmin", "application_manager"].includes(user.role);

  const { data: settings, isLoading } = useDecisionSettings();
  const { data: picklists } = useDecisionPicklists();
  const save = useUpdateDecisionSettings();

  const [form, setForm] = React.useState({
    waitlistMovementMode: "auto" as "auto" | "manual",
    offerValidityDays: "15",
    acceptanceWindowDays: "15",
    seatBookingFee: "",
    approverUserIds: [] as string[],
    autoSendOfferOnRelease: false,
    defaultOnboardingInfo: "",
  });

  React.useEffect(() => {
    if (!settings) return;
    setForm({
      waitlistMovementMode: settings.waitlistMovementMode,
      offerValidityDays: String(settings.offerValidityDays ?? 15),
      acceptanceWindowDays: String(settings.acceptanceWindowDays ?? 15),
      seatBookingFee:
        settings.seatBookingFee === null ||
        settings.seatBookingFee === undefined
          ? ""
          : String(settings.seatBookingFee),
      approverUserIds: settings.approverUserIds || [],
      autoSendOfferOnRelease: !!settings.autoSendOfferOnRelease,
      defaultOnboardingInfo: settings.defaultOnboardingInfo || "",
    });
  }, [settings]);

  function submit() {
    save.mutate({
      waitlistMovementMode: form.waitlistMovementMode,
      offerValidityDays: Number(form.offerValidityDays) || 15,
      acceptanceWindowDays: Number(form.acceptanceWindowDays) || 15,
      seatBookingFee:
        form.seatBookingFee === "" ? undefined : Number(form.seatBookingFee),
      approverUserIds: form.approverUserIds,
      autoSendOfferOnRelease: form.autoSendOfferOnRelease,
      defaultOnboardingInfo: form.defaultOnboardingInfo,
    });
  }

  // Committee teams
  const { data: teams = [], isLoading: teamsLoading } = useCommitteeTeams();
  const saveTeam = useSaveCommitteeTeam();
  const deleteTeam = useDeleteCommitteeTeam();
  const [teamOpen, setTeamOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CommitteeTeam | null>(null);
  const [teamForm, setTeamForm] = React.useState({
    name: "",
    description: "",
    memberIds: [] as string[],
    isActive: true,
  });
  const [deleting, setDeleting] = React.useState<CommitteeTeam | null>(null);

  function openTeam(team: CommitteeTeam | null) {
    setEditing(team);
    setTeamForm({
      name: team?.name ?? "",
      description: team?.description ?? "",
      memberIds: team?.memberIds ?? [],
      isActive: team?.isActive ?? true,
    });
    setTeamOpen(true);
  }

  const userName = React.useCallback(
    (id: string) =>
      picklists?.users.find((u) => u.id === id)?.name ?? "Unknown user",
    [picklists],
  );

  if (
    !user ||
    ![
      "org_admin",
      "superadmin",
      "application_manager",
      "exam_manager",
      "counselor",
    ].includes(user.role)
  ) {
    return (
      <AccessRestricted message="Only organization staff can view decision settings." />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-5xl mx-auto min-w-0">
      <Link
        href="/organization/decisions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Admission Decisions
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow settings</CardTitle>
          <CardDescription>
            Only organization admins can change these.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Approvers (can approve, release and lock decisions)
                  </Label>
                  <MultiSelect
                    values={form.approverUserIds}
                    onValuesChange={(v) =>
                      setForm((f) => ({ ...f, approverUserIds: v }))
                    }
                  >
                    <MultiSelectTrigger
                      className="w-full bg-muted/30"
                      disabled={!isAdmin}
                    >
                      <MultiSelectValue placeholder="Org admins are always approvers" />
                    </MultiSelectTrigger>
                    <MultiSelectContent
                      search={{ placeholder: "Search users" }}
                    >
                      {(picklists?.users || []).map((u) => (
                        <MultiSelectItem key={u.id} value={u.id}>
                          {u.name}
                        </MultiSelectItem>
                      ))}
                    </MultiSelectContent>
                  </MultiSelect>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Waitlist movement
                  </Label>
                  <Select
                    value={form.waitlistMovementMode}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        waitlistMovementMode: v as "auto" | "manual",
                      }))
                    }
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Automatic — release an offer to the next ranked
                        applicant
                      </SelectItem>
                      <SelectItem value="manual">
                        Manual — notify staff to release it
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Offer valid for (days)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.offerValidityDays}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        offerValidityDays: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Acceptance window (days)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.acceptanceWindowDays}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        acceptanceWindowDays: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Seat booking fee (₹)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.seatBookingFee}
                    disabled={!isAdmin}
                    placeholder="Uses the organization fee setting when empty"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, seatBookingFee: e.target.value }))
                    }
                  />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 self-end">
                  <span className="text-sm">
                    Send the offer letter automatically when an Offer Made
                    decision is shown to the applicant
                  </span>
                  <Switch
                    checked={form.autoSendOfferOnRelease}
                    disabled={!isAdmin}
                    onCheckedChange={(c) =>
                      setForm((f) => ({ ...f, autoSendOfferOnRelease: c }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Default onboarding information
                </Label>
                <Textarea
                  rows={4}
                  value={form.defaultOnboardingInfo}
                  disabled={!isAdmin}
                  placeholder="Orientation date, documents to bring, hostel and fee details..."
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultOnboardingInfo: e.target.value,
                    }))
                  }
                />
              </div>
              {isAdmin && (
                <Button
                  className="w-fit"
                  onClick={submit}
                  disabled={save.isPending}
                >
                  {save.isPending ? "Saving..." : "Save settings"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-muted-foreground" />
              Decision committee teams
            </CardTitle>
            <CardDescription>
              Teams can be assigned as a Decision Committee; every member can
              review.
            </CardDescription>
          </div>
          {canManageTeams && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => openTeam(null)}
            >
              <Plus className="size-3.5" />
              New team
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className={TABLE_WRAPPER}>
            <Table>
              <TableHeader className={TABLE_HEADER}>
                <TableRow className="hover:bg-transparent border-b border-border/80">
                  <Th>Team</Th>
                  <Th>Members</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsLoading ? (
                  <LoadingRow colSpan={4} />
                ) : teams.length === 0 ? (
                  <EmptyRow colSpan={4} title="No committee teams yet" />
                ) : (
                  teams.map((t) => (
                    <TableRow key={t.id} className={ROW}>
                      <TableCell className={CELL}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">
                            {t.name}
                          </span>
                          {t.description && (
                            <span className="text-xs text-muted-foreground">
                              {t.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`${CELL} text-foreground/80`}>
                        {t.memberIds.length
                          ? t.memberIds.map(userName).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className={CELL}>
                        <Pill tone={t.isActive ? TONE.green : TONE.zinc}>
                          {t.isActive ? "Active" : "Inactive"}
                        </Pill>
                      </TableCell>
                      <TableCell className={`${CELL} text-right`}>
                        {canManageTeams && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openTeam(t)}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-red-700"
                              onClick={() => setDeleting(t)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit committee team" : "New committee team"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Description
              </Label>
              <Textarea
                rows={2}
                value={teamForm.description}
                onChange={(e) =>
                  setTeamForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Members</Label>
              <MultiSelect
                values={teamForm.memberIds}
                onValuesChange={(v) =>
                  setTeamForm((f) => ({ ...f, memberIds: v }))
                }
              >
                <MultiSelectTrigger className="w-full bg-muted/30">
                  <MultiSelectValue placeholder="Select members" />
                </MultiSelectTrigger>
                <MultiSelectContent search={{ placeholder: "Search users" }}>
                  {(picklists?.users || []).map((u) => (
                    <MultiSelectItem key={u.id} value={u.id}>
                      {u.name}
                    </MultiSelectItem>
                  ))}
                </MultiSelectContent>
              </MultiSelect>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm">Active</span>
              <Switch
                checked={teamForm.isActive}
                onCheckedChange={(c) =>
                  setTeamForm((f) => ({ ...f, isActive: c }))
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!teamForm.name.trim() || saveTeam.isPending}
              onClick={() =>
                saveTeam.mutate(
                  {
                    id: editing?.id,
                    name: teamForm.name.trim(),
                    description: teamForm.description.trim() || undefined,
                    memberIds: teamForm.memberIds,
                    isActive: teamForm.isActive,
                  },
                  { onSuccess: () => setTeamOpen(false) },
                )
              }
            >
              {saveTeam.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              {deleting?.name} will be removed. Decisions that used it keep
              their individual committee members.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTeam.isPending}
              onClick={() =>
                deleting &&
                deleteTeam.mutate(deleting.id, {
                  onSuccess: () => setDeleting(null),
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
