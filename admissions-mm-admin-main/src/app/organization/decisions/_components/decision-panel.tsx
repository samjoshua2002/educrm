"use client";

import * as React from "react";

import {
  CheckCircle2,
  Eye,
  Gavel,
  Lock,
  LockOpen,
  Send,
  Undo2,
  Users,
} from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdvanceDecisionStage,
  useCommitteeReview,
  useDecisionPicklists,
  useFinalizeDecision,
  useLockDecision,
  usePublishDecision,
  useReleaseDecision,
  useUnlockDecision,
  useUpdateDecision,
  type DecisionDetail,
  type FinalDecision,
} from "@/hooks/use-admission-decisions";
import {
  APPROVAL_STATUS_LABELS,
  DECISION_STAGE_LABELS,
  DECISION_STAGE_ORDER,
  FINAL_DECISION_LABELS,
  FINAL_DECISION_TONE,
  STAGE_TONE,
  TONE,
} from "@/types/admission-decisions";

import { Field, Pill, formatDate, formatDateTime, formatScore } from "./shared";

export function DecisionPanel({
  applicationNo,
  detail,
  canWrite,
}: {
  applicationNo: string;
  detail: DecisionDetail | undefined;
  canWrite: boolean;
}) {
  const decision = detail?.decision ?? null;
  const permissions = detail?.permissions ?? {
    canReview: false,
    canApprove: false,
    canUnlock: false,
  };
  const names = detail?.userNames ?? {};
  const { data: picklists } = useDecisionPicklists();

  const update = useUpdateDecision(applicationNo);
  const review = useCommitteeReview(applicationNo);
  const advance = useAdvanceDecisionStage(applicationNo);
  const finalize = useFinalizeDecision(applicationNo);
  const release = useReleaseDecision(applicationNo);
  const publish = usePublishDecision(applicationNo);
  const lock = useLockDecision(applicationNo);
  const unlock = useUnlockDecision(applicationNo);

  const stage = decision?.decisionStage ?? "under_review";
  const stageIndex = DECISION_STAGE_ORDER.indexOf(stage);
  const locked = !!decision?.decisionLocked;
  const released = stage === "decision_released";

  // Committee + score + remarks form
  const [committee, setCommittee] = React.useState<string[]>([]);
  const [teams, setTeams] = React.useState<string[]>([]);
  const [score, setScore] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    setCommittee(decision?.decisionCommittee ?? []);
    setTeams(decision?.decisionCommitteeTeamIds ?? []);
    setScore(
      decision?.decisionScore === null || decision?.decisionScore === undefined
        ? ""
        : String(decision.decisionScore),
    );
    setRemarks(decision?.internalRemarks ?? "");
    setVisible(!!decision?.applicantVisible);
  }, [decision?.id, decision?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveDecision() {
    update.mutate({
      ...(released
        ? {}
        : { decisionCommittee: committee, decisionCommitteeTeamIds: teams }),
      ...(!released && score !== "" ? { decisionScore: Number(score) } : {}),
      internalRemarks: remarks,
      applicantVisible: visible,
    });
  }

  // Committee review form
  const [recommendation, setRecommendation] =
    React.useState<FinalDecision>("offer_made");
  const [reviewScore, setReviewScore] = React.useState("");
  const [reviewComments, setReviewComments] = React.useState("");

  // Final approval form
  const [finalChoice, setFinalChoice] =
    React.useState<FinalDecision>("offer_made");
  React.useEffect(() => {
    if (decision?.finalDecision) setFinalChoice(decision.finalDecision);
  }, [decision?.finalDecision]);
  const [confirmApprove, setConfirmApprove] = React.useState(false);

  // Release form
  const [releaseVisible, setReleaseVisible] = React.useState(true);
  const [releaseLock, setReleaseLock] = React.useState(true);
  const [confirmRelease, setConfirmRelease] = React.useState(false);

  // Unlock
  const [unlockOpen, setUnlockOpen] = React.useState(false);
  const [unlockReason, setUnlockReason] = React.useState("");

  const reviewsCount = decision?.committeeReviews?.length ?? 0;
  const committeeCount = detail?.committeeMemberIds?.length ?? 0;

  return (
    <>
      {/* Stage progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="size-4 text-muted-foreground" />
            Decision Workflow
          </CardTitle>
          <CardDescription>
            Stages go in order: Under Review → Committee Review → Final Approval
            → Decision Released.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {DECISION_STAGE_ORDER.map((s, idx) => (
              <React.Fragment key={s}>
                <Pill
                  tone={
                    decision && idx <= stageIndex
                      ? STAGE_TONE[s]
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {DECISION_STAGE_LABELS[s]}
                </Pill>
                {idx < DECISION_STAGE_ORDER.length - 1 && (
                  <span className="text-muted-foreground/50">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {decision && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Decision ID">DEC-{decision.decisionNo}</Field>
              <Field label="Decision Stage">
                {DECISION_STAGE_LABELS[decision.decisionStage]}
              </Field>
              <Field label="Final Decision">
                {decision.finalDecision ? (
                  <Pill tone={FINAL_DECISION_TONE[decision.finalDecision]}>
                    {FINAL_DECISION_LABELS[decision.finalDecision]}
                  </Pill>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Decision Score">
                {formatScore(decision.decisionScore)}
              </Field>
              <Field label="Decision Date">
                {formatDate(decision.decisionDate)}
              </Field>
              <Field label="Approved By">
                {decision.approvedBy
                  ? (names[decision.approvedBy] ?? "—")
                  : "—"}
              </Field>
              <Field label="Approval Status">
                {APPROVAL_STATUS_LABELS[decision.approvalStatus] ??
                  decision.approvalStatus}
              </Field>
              <Field label="Applicant Visible">
                <Pill tone={decision.applicantVisible ? TONE.green : TONE.zinc}>
                  {decision.applicantVisible ? "Yes" : "No"}
                </Pill>
              </Field>
              <Field label="Decision Locked">
                <Pill tone={decision.decisionLocked ? TONE.amber : TONE.zinc}>
                  {decision.decisionLocked ? "Locked" : "Unlocked"}
                </Pill>
              </Field>
              <Field label="Released">
                {decision.releasedAt
                  ? `${formatDateTime(decision.releasedAt)}${decision.releasedBy && names[decision.releasedBy] ? ` by ${names[decision.releasedBy]}` : ""}`
                  : "—"}
              </Field>
              <Field label="Applicant Notified">
                {formatDateTime(decision.applicantNotifiedAt)}
              </Field>
            </div>
          )}

          <Separator />

          {/* Stage actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!decision && canWrite && (
              <Button
                size="sm"
                onClick={saveDecision}
                disabled={update.isPending}
              >
                Start decision record
              </Button>
            )}
            {decision && !locked && stage === "under_review" && canWrite && (
              <Button
                size="sm"
                onClick={() => advance.mutate("committee_review")}
                disabled={advance.isPending || committeeCount === 0}
              >
                Send to Committee Review
              </Button>
            )}
            {decision &&
              !locked &&
              stage === "committee_review" &&
              canWrite && (
                <Button
                  size="sm"
                  onClick={() => advance.mutate("final_approval")}
                  disabled={advance.isPending || reviewsCount === 0}
                >
                  Send for Final Approval
                </Button>
              )}
            {decision &&
              !locked &&
              stage === "final_approval" &&
              permissions.canApprove &&
              decision.approvalStatus === "approved" && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConfirmRelease(true)}
                >
                  <Send className="size-3.5" />
                  Release decision
                </Button>
              )}
            {decision &&
              released &&
              !decision.applicantVisible &&
              permissions.canApprove && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => publish.mutate()}
                  disabled={publish.isPending}
                >
                  <Eye className="size-3.5" />
                  Show to applicant
                </Button>
              )}
            {decision && !locked && permissions.canApprove && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => lock.mutate()}
                disabled={lock.isPending}
              >
                <Lock className="size-3.5" />
                Lock
              </Button>
            )}
            {decision && locked && permissions.canUnlock && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setUnlockReason("");
                  setUnlockOpen(true);
                }}
              >
                <LockOpen className="size-3.5" />
                Unlock
              </Button>
            )}
            {decision && stage === "under_review" && committeeCount === 0 && (
              <p className="text-xs text-muted-foreground">
                Assign a decision committee before Committee Review.
              </p>
            )}
            {decision && stage === "committee_review" && reviewsCount === 0 && (
              <p className="text-xs text-muted-foreground">
                At least one committee review is needed before Final Approval.
              </p>
            )}
            {decision &&
              stage === "final_approval" &&
              !permissions.canApprove && (
                <p className="text-xs text-muted-foreground">
                  Waiting for an approver.
                </p>
              )}
            {locked && (
              <p className="text-xs text-muted-foreground">
                This decision is locked and cannot be changed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Committee, score, remarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-muted-foreground" />
            Decision Committee & Remarks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Decision Committee — Users
              </Label>
              <MultiSelect values={committee} onValuesChange={setCommittee}>
                <MultiSelectTrigger
                  className="w-full bg-muted/30"
                  disabled={locked || released || !canWrite}
                >
                  <MultiSelectValue placeholder="Select users" />
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
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Decision Committee — Teams
              </Label>
              <MultiSelect values={teams} onValuesChange={setTeams}>
                <MultiSelectTrigger
                  className="w-full bg-muted/30"
                  disabled={locked || released || !canWrite}
                >
                  <MultiSelectValue placeholder="Select teams" />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  {(picklists?.teams || [])
                    .filter((t) => t.isActive || teams.includes(t.id))
                    .map((t) => (
                      <MultiSelectItem key={t.id} value={t.id}>
                        {t.name}
                      </MultiSelectItem>
                    ))}
                </MultiSelectContent>
              </MultiSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Decision Score
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={locked || released || !canWrite}
                placeholder="Defaults to the composite score; averaged from committee scores"
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 self-end">
              <span className="text-sm">Applicant Visible</span>
              <Switch
                checked={visible}
                onCheckedChange={setVisible}
                disabled={locked || !canWrite}
              />
            </label>
          </div>
          {detail && detail.committeeMemberIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Committee members:{" "}
              {detail.committeeMemberIds
                .map((id) => names[id] ?? "Unknown")
                .join(", ")}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Internal Remarks
            </Label>
            <Textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={locked || !canWrite}
              placeholder="Notes for the committee — never shown to the applicant"
            />
          </div>
          {canWrite && !locked && decision && (
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={saveDecision}
              disabled={update.isPending}
            >
              {update.isPending ? "Saving..." : "Save"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Committee reviews */}
      {decision && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Committee Reviews</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {reviewsCount === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/60 rounded-lg border border-border">
                {decision.committeeReviews.map((r) => (
                  <div key={r.userId} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {r.userName || names[r.userId] || "Reviewer"}
                      </span>
                      <Pill tone={FINAL_DECISION_TONE[r.recommendation]}>
                        {FINAL_DECISION_LABELS[r.recommendation]}
                      </Pill>
                      {r.score !== null && r.score !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          Score {formatScore(r.score)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDateTime(r.reviewedAt)}
                      </span>
                    </div>
                    {r.comments && (
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {r.comments}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {permissions.canReview && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground">
                    Your review
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Recommendation
                      </Label>
                      <Select
                        value={recommendation}
                        onValueChange={(v) =>
                          setRecommendation(v as FinalDecision)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FINAL_DECISION_LABELS).map(
                            ([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Score (optional)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={reviewScore}
                        onChange={(e) => setReviewScore(e.target.value)}
                      />
                    </div>
                  </div>
                  <Textarea
                    rows={2}
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Comments"
                  />
                  <Button
                    size="sm"
                    className="w-fit"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate(
                        {
                          recommendation,
                          score:
                            reviewScore === ""
                              ? undefined
                              : Number(reviewScore),
                          comments: reviewComments.trim() || undefined,
                        },
                        {
                          onSuccess: () => {
                            setReviewScore("");
                            setReviewComments("");
                          },
                        },
                      )
                    }
                  >
                    Submit review
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final approval */}
      {decision &&
        stage === "final_approval" &&
        !locked &&
        permissions.canApprove && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Final Approval</CardTitle>
              <CardDescription>
                Approve the final decision, or send it back to Committee Review.
                {decision.approvalStatus === "approved" &&
                decision.finalDecision
                  ? ` Approved as ${FINAL_DECISION_LABELS[decision.finalDecision]} — release it above.`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RadioGroup
                value={finalChoice}
                onValueChange={(v) => setFinalChoice(v as FinalDecision)}
                className="flex flex-wrap gap-4"
              >
                {Object.entries(FINAL_DECISION_LABELS).map(([v, l]) => (
                  <div key={v} className="flex items-center gap-2">
                    <RadioGroupItem value={v} id={`final-${v}`} />
                    <Label
                      htmlFor={`final-${v}`}
                      className="font-normal cursor-pointer"
                    >
                      {l}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConfirmApprove(true)}
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={finalize.isPending}
                  onClick={() =>
                    finalize.mutate({
                      approvalStatus: "rejected",
                      internalRemarks: remarks,
                    })
                  }
                >
                  <Undo2 className="size-3.5" />
                  Send back to committee
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Approve final decision?</DialogTitle>
            <DialogDescription>
              {applicationNo} will be approved as{" "}
              <strong>{FINAL_DECISION_LABELS[finalChoice]}</strong>. It is
              applied when the decision is released.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApprove(false)}>
              Cancel
            </Button>
            <Button
              disabled={finalize.isPending}
              onClick={() =>
                finalize.mutate(
                  {
                    approvalStatus: "approved",
                    finalDecision: finalChoice,
                    internalRemarks: remarks,
                  },
                  { onSuccess: () => setConfirmApprove(false) },
                )
              }
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Release decision?</DialogTitle>
            <DialogDescription>
              The outcome (
              {decision?.finalDecision
                ? FINAL_DECISION_LABELS[decision.finalDecision]
                : ""}
              ) is applied: the application status changes and, for Waitlisted
              or Rejected, the waitlist or rejection record is created.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm">
                Applicant Visible (sends the decision email now)
              </span>
              <Switch
                checked={releaseVisible}
                onCheckedChange={setReleaseVisible}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm">Lock the decision</span>
              <Switch checked={releaseLock} onCheckedChange={setReleaseLock} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRelease(false)}>
              Cancel
            </Button>
            <Button
              disabled={release.isPending}
              onClick={() =>
                release.mutate(
                  { applicantVisible: releaseVisible, lock: releaseLock },
                  { onSuccess: () => setConfirmRelease(false) },
                )
              }
            >
              {release.isPending ? "Releasing..." : "Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Unlock decision</DialogTitle>
            <DialogDescription>
              The reason is added to the internal remarks.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="Reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!unlockReason.trim() || unlock.isPending}
              onClick={() =>
                unlock.mutate(unlockReason.trim(), {
                  onSuccess: () => setUnlockOpen(false),
                })
              }
            >
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
