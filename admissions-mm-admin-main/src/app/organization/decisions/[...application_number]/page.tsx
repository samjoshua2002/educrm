"use client";

import * as React from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Award,
  Send,
  FileText,
  Ban,
  CheckCircle2,
  ShieldAlert,
  Wallet,
  Users,
  XOctagon,
  PackageCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useDecision,
  useUpdateDecision,
  useAdvanceDecisionStage,
  useFinalizeDecision,
  useOfferLetter,
  useGenerateOfferLetter,
  useSendOfferLetter,
  useWithdrawOffer,
  type DecisionStage,
  type FinalDecision,
  type OfferType,
} from "@/hooks/use-admission-decisions";
import {
  useAcceptance,
  useMarkOnboardingSent,
  useWaitlistEntry,
  useReleaseWaitlistOffer,
  useRejection,
  useUpdateRejection,
  type RejectionReason,
} from "@/hooks/use-acceptance";
import { useApplication } from "@/hooks/use-applications";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeader } from "@/hooks/use-page-header";

const ALLOWED_ROLES = ["org_admin", "application_manager", "superadmin"];

const STAGE_ORDER: DecisionStage[] = ["under_review", "committee_review", "final_approval", "decision_released"];
const STAGE_LABELS: Record<DecisionStage, string> = {
  under_review: "Under Review",
  committee_review: "Committee Review",
  final_approval: "Final Approval",
  decision_released: "Decision Released",
};

const FINAL_DECISION_OPTIONS: { value: FinalDecision; label: string }[] = [
  { value: "offer_made", label: "Offer Made" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Rejected" },
];

const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  below_cutoff: "Below Cutoff",
  incomplete_documents: "Incomplete Documents",
  failed_interview: "Failed Interview",
  seat_unavailable: "Seat Unavailable",
  other: "Other",
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdmissionDecisionDetailPage() {
  const params = useParams();
  const rawParam = params.application_number;
  const applicationNumber = React.useMemo(() => {
    if (!rawParam) return "";
    if (Array.isArray(rawParam)) return rawParam.map((p) => decodeURIComponent(p)).join("/");
    return decodeURIComponent(rawParam as string);
  }, [rawParam]);

  usePageHeader({
    title: "Admission Decision",
    description: applicationNumber ? `Application ${applicationNumber}` : undefined,
  });

  const user = useAuthStore((state) => state.user);
  const canAccess = !!user && ALLOWED_ROLES.includes(user.role);

  const { data: application } = useApplication(applicationNumber, { enabled: canAccess && !!applicationNumber });
  const { data: decisionData, isLoading: decisionLoading } = useDecision(applicationNumber);
  const updateDecisionMutation = useUpdateDecision(applicationNumber);
  const advanceStageMutation = useAdvanceDecisionStage(applicationNumber);
  const finalizeMutation = useFinalizeDecision(applicationNumber);

  const decision = decisionData?.decision;
  const scoreBreakdown = decisionData?.scoreBreakdown;

  const [remarks, setRemarks] = React.useState("");
  const [applicantVisible, setApplicantVisible] = React.useState(false);

  React.useEffect(() => {
    if (decision) {
      setRemarks(decision.internalRemarks ?? "");
      setApplicantVisible(decision.applicantVisible ?? false);
    }
  }, [decision?.id]);

  const [finalDecisionChoice, setFinalDecisionChoice] = React.useState<FinalDecision>("offer_made");
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = React.useState(false);

  const currentStage: DecisionStage = decision?.decisionStage ?? "under_review";
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
  const nextStage = STAGE_ORDER[currentStageIndex + 1];
  const isLocked = !!decision?.decisionLocked;

  function handleStartOrSaveRemarks() {
    updateDecisionMutation.mutate({ internalRemarks: remarks, applicantVisible });
  }

  function handleAdvanceStage() {
    if (!nextStage || nextStage === "decision_released") return;
    advanceStageMutation.mutate(nextStage as "committee_review" | "final_approval");
  }

  function handleFinalize() {
    finalizeMutation.mutate(
      { finalDecision: finalDecisionChoice, internalRemarks: remarks },
      { onSuccess: () => setConfirmFinalizeOpen(false) },
    );
  }

  // ============================================================================
  // Offer letter panel — only relevant once finalDecision === 'offer_made'
  // ============================================================================
  const { data: offerLetter } = useOfferLetter(applicationNumber);
  const generateOfferMutation = useGenerateOfferLetter(applicationNumber);
  const sendOfferMutation = useSendOfferLetter(applicationNumber);
  const withdrawOfferMutation = useWithdrawOffer(applicationNumber);

  const [offerType, setOfferType] = React.useState<OfferType>("regular");
  const [offerValidTill, setOfferValidTill] = React.useState("");
  const [scholarshipAmount, setScholarshipAmount] = React.useState<string>("0");
  const [conditions, setConditions] = React.useState("");

  React.useEffect(() => {
    if (offerLetter) {
      setOfferType(offerLetter.offerType);
      setOfferValidTill(offerLetter.offerValidTill ? String(offerLetter.offerValidTill).split("T")[0] : "");
      setScholarshipAmount(String(offerLetter.scholarshipAmount ?? 0));
      setConditions(offerLetter.conditions ?? "");
    }
  }, [offerLetter?.id]);

  function handleGenerateOffer() {
    if (!offerValidTill) return;
    generateOfferMutation.mutate({
      offerType,
      offerValidTill,
      scholarshipAmount: scholarshipAmount ? Number(scholarshipAmount) : undefined,
      conditions: conditions || undefined,
    });
  }

  // ============================================================================
  // Acceptance & Enrollment panel — only relevant once the offer letter has
  // actually been sent to the candidate (an OfferAcceptance record is
  // auto-created server-side at that point).
  // ============================================================================
  const acceptanceEnabled = decision?.finalDecision === "offer_made" && !!offerLetter?.sentToCandidate;
  const { data: acceptance } = useAcceptance(acceptanceEnabled ? applicationNumber : undefined);
  const markOnboardingMutation = useMarkOnboardingSent(applicationNumber);
  const [onboardingInfo, setOnboardingInfo] = React.useState("");

  React.useEffect(() => {
    if (acceptance) setOnboardingInfo(acceptance.onboardingInfo ?? "");
  }, [acceptance?.id]);

  function handleMarkOnboardingSent() {
    markOnboardingMutation.mutate({ onboardingInfo: onboardingInfo || undefined });
  }

  // ============================================================================
  // Waitlist panel — only relevant once finalDecision === 'waitlisted'.
  // ============================================================================
  const waitlistEnabled = decision?.finalDecision === "waitlisted";
  const { data: waitlistEntry } = useWaitlistEntry(waitlistEnabled ? applicationNumber : undefined);
  const releaseOfferMutation = useReleaseWaitlistOffer(applicationNumber);
  const [alternateProgram, setAlternateProgram] = React.useState("");

  function handleReleaseOffer() {
    releaseOfferMutation.mutate({ alternateProgramOffered: alternateProgram || undefined });
  }

  // ============================================================================
  // Rejection panel — only relevant once finalDecision === 'rejected'.
  // ============================================================================
  const rejectionEnabled = decision?.finalDecision === "rejected";
  const { data: rejection } = useRejection(rejectionEnabled ? applicationNumber : undefined);
  const updateRejectionMutation = useUpdateRejection(applicationNumber);
  const [detailedReason, setDetailedReason] = React.useState("");

  React.useEffect(() => {
    if (rejection) setDetailedReason(rejection.detailedReason ?? "");
  }, [rejection?.id]);

  function handleSaveDetailedReason() {
    updateRejectionMutation.mutate({ detailedReason });
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 px-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
          <ShieldAlert className="size-6 text-muted-foreground/80" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">Access restricted</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Only Org Admins, Application Managers and Superadmins can review admission decisions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-4xl mx-auto min-w-0">
      <Link
        href="/organization/decisions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to Admission Decisions
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span>{application?.applicant?.name || applicationNumber}</span>
            <Badge variant="secondary">{applicationNumber}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Program</p>
            <p className="font-medium text-foreground">{application?.appliedFor || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{application?.applicant?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mobile</p>
            <p className="font-medium text-foreground">{application?.applicant?.primaryMobile || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Composite score breakdown — real backend figures from ScoringService,
          read-only here (Phase 5 owns the score-adjustment UI on the GD/PI page). */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="size-4 text-muted-foreground" />
            Composite Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {scoreBreakdown ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">GD Score</p>
                  <p className="font-semibold text-foreground">{scoreBreakdown.gdScore ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PI Score</p>
                  <p className="font-semibold text-foreground">{scoreBreakdown.piScore ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Experience Component</p>
                  <p className="font-semibold text-foreground">{scoreBreakdown.experienceComponent}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Other Components</p>
                  <p className="font-semibold text-foreground">{scoreBreakdown.otherComponentsTotal}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Composite Score</p>
                <p className="text-2xl font-bold text-primary">{scoreBreakdown.compositeScore}</p>
              </div>
              {scoreBreakdown.discrepancyFlag && (
                <Badge className="bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-0 w-fit">
                  Experience discrepancy flagged
                </Badge>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading score breakdown…</p>
          )}
        </CardContent>
      </Card>

      {/* Decision stage progression */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision Stage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {STAGE_ORDER.map((stage, idx) => (
              <React.Fragment key={stage}>
                <Badge
                  className={`border-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    idx <= currentStageIndex
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </Badge>
                {idx < STAGE_ORDER.length - 1 && <span className="text-muted-foreground/50">→</span>}
              </React.Fragment>
            ))}
          </div>

          {isLocked ? (
            <p className="text-xs text-muted-foreground">
              This decision is finalized and locked
              {decision?.decisionDate ? ` on ${formatDate(decision.decisionDate)}` : ""}.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              {!decision ? (
                <Button size="sm" onClick={handleStartOrSaveRemarks} disabled={updateDecisionMutation.isPending}>
                  Start Decision Record
                </Button>
              ) : nextStage && nextStage !== "decision_released" ? (
                <Button size="sm" onClick={handleAdvanceStage} disabled={advanceStageMutation.isPending}>
                  Advance to {STAGE_LABELS[nextStage]}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ready for final decision below.
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <Label htmlFor="internal-remarks" className="text-xs font-medium text-muted-foreground">
              Internal Remarks
            </Label>
            <Textarea
              id="internal-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Notes for the committee (not visible to the applicant unless marked so)"
              rows={3}
              disabled={isLocked}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={applicantVisible}
                onChange={(e) => setApplicantVisible(e.target.checked)}
                disabled={isLocked}
              />
              Visible to applicant
            </label>
            {decision && !isLocked && (
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={handleStartOrSaveRemarks}
                disabled={updateDecisionMutation.isPending}
              >
                Save Remarks
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final decision */}
      {decision && currentStage === "final_approval" && !isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record Final Decision</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RadioGroup value={finalDecisionChoice} onValueChange={(v) => setFinalDecisionChoice(v as FinalDecision)}>
              {FINAL_DECISION_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`final-${opt.value}`} />
                  <Label htmlFor={`final-${opt.value}`} className="font-normal cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button className="w-fit gap-1.5" onClick={() => setConfirmFinalizeOpen(true)}>
              <CheckCircle2 className="size-3.5" />
              Finalize Decision
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Offer letter panel */}
      {decision?.finalDecision === "offer_made" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" />
              Offer Letter
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(!offerLetter || offerLetter.offerStatus === "draft" || offerLetter.offerStatus === "withdrawn" || offerLetter.offerStatus === "expired") && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Offer Type</Label>
                    <Select value={offerType} onValueChange={(v) => setOfferType(v as OfferType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="conditional">Conditional</SelectItem>
                        <SelectItem value="scholarship">Scholarship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Valid Till</Label>
                    <Input type="date" value={offerValidTill} onChange={(e) => setOfferValidTill(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Scholarship Amount (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={scholarshipAmount}
                      onChange={(e) => setScholarshipAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Conditions</Label>
                  <Textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    placeholder="e.g. Subject to submission of final semester marksheet"
                    rows={2}
                  />
                </div>
                <Button
                  className="w-fit"
                  onClick={handleGenerateOffer}
                  disabled={!offerValidTill || generateOfferMutation.isPending}
                >
                  Generate Offer Letter
                </Button>
              </div>
            )}

            {offerLetter && offerLetter.offerLetterHtml && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize">
                    {offerLetter.offerStatus}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {(offerLetter.offerStatus === "generated") && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => sendOfferMutation.mutate()}
                        disabled={sendOfferMutation.isPending}
                      >
                        <Send className="size-3.5" />
                        Send to Candidate
                      </Button>
                    )}
                    {(offerLetter.offerStatus === "generated" || offerLetter.offerStatus === "sent") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => withdrawOfferMutation.mutate(undefined)}
                        disabled={withdrawOfferMutation.isPending}
                      >
                        <Ban className="size-3.5" />
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  className="border border-border rounded-lg p-4 bg-muted/20 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: offerLetter.offerLetterHtml }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acceptance & Enrollment panel — shown once the offer letter has been sent */}
      {acceptanceEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-muted-foreground" />
              Acceptance & Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {acceptance ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Acceptance Status</p>
                    <Badge variant="secondary" className="capitalize mt-1">
                      {acceptance.acceptanceStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seat Booking Fee</p>
                    <p className="font-medium text-foreground">₹{acceptance.seatBookingFee.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fee Payment Status</p>
                    <Badge
                      className={`border-0 capitalize mt-1 ${
                        acceptance.feePaymentStatus === "paid"
                          ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          : "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      }`}
                    >
                      {acceptance.feePaymentStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Acceptance Deadline</p>
                    <p className="font-medium text-foreground">{formatDate(acceptance.acceptanceDeadline)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Candidate Confirmation Date</p>
                    <p className="font-medium text-foreground">{formatDate(acceptance.candidateConfirmationDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Enrollment Status</p>
                    <p className="font-medium text-foreground capitalize">{acceptance.enrollmentStatus.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Reference</p>
                    <p className="font-medium text-foreground">{acceptance.paymentReferenceId || "—"}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium text-muted-foreground">Onboarding Info</Label>
                  <Textarea
                    value={onboardingInfo}
                    onChange={(e) => setOnboardingInfo(e.target.value)}
                    placeholder="Notes / details included in the onboarding package"
                    rows={2}
                    disabled={acceptance.onboardingPackageSent}
                  />
                  <div className="flex items-center gap-2">
                    {acceptance.onboardingPackageSent ? (
                      <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-0 w-fit gap-1.5">
                        <PackageCheck className="size-3.5" />
                        Onboarding Package Sent
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-fit gap-1.5"
                        onClick={handleMarkOnboardingSent}
                        disabled={markOnboardingMutation.isPending}
                      >
                        <PackageCheck className="size-3.5" />
                        Mark Onboarding Sent
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading acceptance record…</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Waitlist panel */}
      {waitlistEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-muted-foreground" />
              Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {waitlistEntry ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Waitlist Rank</p>
                    <p className="font-medium text-foreground">{waitlistEntry.waitlistRank ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Waitlist Status</p>
                    <Badge variant="secondary" className="capitalize mt-1">
                      {waitlistEntry.waitlistStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alternate Program Offered</p>
                    <p className="font-medium text-foreground">{waitlistEntry.alternateProgramOffered || "—"}</p>
                  </div>
                </div>

                {waitlistEntry.waitlistStatus === "active" && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Alternate Program (optional, if releasing into a different program)
                      </Label>
                      <Input
                        value={alternateProgram}
                        onChange={(e) => setAlternateProgram(e.target.value)}
                        placeholder="e.g. MBA — Finance"
                      />
                      <Button
                        size="sm"
                        className="w-fit"
                        onClick={handleReleaseOffer}
                        disabled={releaseOfferMutation.isPending}
                      >
                        Release Offer
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Flags this entry as offer-released. Generate the actual offer letter
                        separately via the Offer Letter panel once finalDecision is updated to
                        offer_made.
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading waitlist entry…</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection panel */}
      {rejectionEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XOctagon className="size-4 text-muted-foreground" />
              Rejection
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {rejection ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Rejection Reason</p>
                    <Badge variant="secondary" className="mt-1">
                      {REJECTION_REASON_LABELS[rejection.rejectionReason] ?? rejection.rejectionReason}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rejection Date</p>
                    <p className="font-medium text-foreground">{formatDate(rejection.rejectionDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Eligible For Reapply</p>
                    <p className="font-medium text-foreground">{rejection.eligibleForReapply ? "Yes" : "No"}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-medium text-muted-foreground">Detailed Reason</Label>
                  <Textarea
                    value={detailedReason}
                    onChange={(e) => setDetailedReason(e.target.value)}
                    placeholder="Additional context for the rejection (not necessarily shared verbatim with the candidate)"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    onClick={handleSaveDetailedReason}
                    disabled={updateRejectionMutation.isPending}
                  >
                    Save Detailed Reason
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading rejection record…</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finalize confirmation */}
      <Dialog open={confirmFinalizeOpen} onOpenChange={setConfirmFinalizeOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Confirm final decision?</DialogTitle>
            <DialogDescription>
              This will lock the decision record for {applicationNumber} as{" "}
              <strong>{FINAL_DECISION_OPTIONS.find((o) => o.value === finalDecisionChoice)?.label}</strong>. This
              cannot be undone from this screen, and a notification email will be sent to the applicant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFinalizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={finalizeMutation.isPending}>
              {finalizeMutation.isPending ? "Finalizing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
