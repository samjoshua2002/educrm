"use client";

import * as React from "react";

import {
  Ban,
  Download,
  FileText,
  FileUp,
  Mail,
  PackageCheck,
  Send,
  Users,
  Wallet,
  XOctagon,
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
  useAcceptance,
  useCloseWaitlistEntry,
  useConfirmAcceptance,
  useRejection,
  useReleaseWaitlistOffer,
  useSendOnboardingPackage,
  useSendRejectionLetter,
  useUpdateAcceptance,
  useUpdateRejection,
  useUpdateWaitlistEntry,
  useWaitlistEntry,
} from "@/hooks/use-acceptance";
import {
  downloadOfferPdf,
  downloadRejectionPdf,
  useDecisionPicklists,
  useDecisionSettings,
  useGenerateOfferLetter,
  useLetterTemplates,
  useOfferHistory,
  useOfferLetter,
  useSendOfferLetter,
  useUploadOfferPdf,
  useWithdrawOffer,
  type AdmissionDecision,
  type OfferType,
} from "@/hooks/use-admission-decisions";
import { useAuthStore } from "@/stores/auth-store";
import {
  ACCEPTANCE_STATUS_LABELS,
  ACCEPTANCE_STATUS_TONE,
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_TONE,
  FEE_PAYMENT_STATUS_LABELS,
  MOVEMENT_TRIGGER_LABELS,
  OFFER_STATUS_LABELS,
  OFFER_STATUS_TONE,
  OFFER_TYPE_LABELS,
  PAYMENT_TONE,
  REJECTION_REASON_LABELS,
  TONE,
  WAITLIST_STATUS_LABELS,
  WAITLIST_STATUS_TONE,
  type EnrollmentStatus,
  type FeePaymentStatus,
  type MovementTrigger,
  type RejectionReason,
} from "@/types/admission-decisions";

import {
  Field,
  Pill,
  formatDate,
  formatDateTime,
  formatMoney,
  toDateInput,
} from "./shared";

function addDaysStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ===========================================================================
// Offer letter (Offer_Letters)
// ===========================================================================

export function OfferPanel({
  applicationNo,
  decision,
  defaultProgram,
  canWrite,
}: {
  applicationNo: string;
  decision: AdmissionDecision;
  defaultProgram?: string | null;
  canWrite: boolean;
}) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const { data: offer } = useOfferLetter(applicationNo);
  const { data: history = [] } = useOfferHistory(applicationNo);
  const { data: templates = [] } = useLetterTemplates({
    type: "offer",
    status: "active",
  });
  const { data: picklists } = useDecisionPicklists();
  const { data: settings } = useDecisionSettings();

  const generate = useGenerateOfferLetter(applicationNo);
  const send = useSendOfferLetter(applicationNo);
  const withdraw = useWithdrawOffer(applicationNo);
  const upload = useUploadOfferPdf(applicationNo);

  const [offerType, setOfferType] = React.useState<OfferType>("regular");
  const [program, setProgram] = React.useState("");
  const [templateId, setTemplateId] = React.useState("default");
  const [validTill, setValidTill] = React.useState("");
  const [scholarship, setScholarship] = React.useState("0");
  const [conditions, setConditions] = React.useState("");
  const [sendNow, setSendNow] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [withdrawReason, setWithdrawReason] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setOfferType(offer?.offerType ?? "regular");
    setProgram(offer?.programOffered ?? defaultProgram ?? "");
    setTemplateId(offer?.letterTemplateId ?? "default");
    setValidTill(
      toDateInput(offer?.offerValidTill) ||
        addDaysStr(settings?.offerValidityDays ?? 15),
    );
    setScholarship(String(offer?.scholarshipAmount ?? 0));
    setConditions(offer?.conditions ?? "");
  }, [
    offer?.id,
    offer?.updatedAt,
    defaultProgram,
    settings?.offerValidityDays,
  ]);

  const approvedOffer =
    decision.finalDecision === "offer_made" &&
    decision.approvalStatus === "approved";
  const canGenerate =
    canWrite &&
    approvedOffer &&
    (!offer ||
      ["draft", "generated", "expired", "withdrawn"].includes(
        offer.offerStatus,
      ));
  const released = decision.decisionStage === "decision_released";

  function submitGenerate() {
    generate.mutate({
      offerType,
      programOffered: program || undefined,
      letterTemplateId: templateId === "default" ? undefined : templateId,
      offerValidTill: validTill || undefined,
      scholarshipAmount: scholarship === "" ? 0 : Number(scholarship),
      conditions: conditions.trim() || undefined,
      send: sendNow && released ? true : undefined,
    });
  }

  const programs = picklists?.programs ?? [];
  const programOptions =
    program && !programs.some((p) => p.name === program)
      ? [{ id: "__current", name: program }, ...programs]
      : programs;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4 text-muted-foreground" />
          Offer Letter
        </CardTitle>
        <CardDescription>
          Generated from a letter template as a PDF. Sending emails it to the
          candidate with the PDF attached and opens the acceptance record.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {offer && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Offer ID">OFR-{offer.offerNo}</Field>
              <Field label="Offer Type">
                {OFFER_TYPE_LABELS[offer.offerType]}
              </Field>
              <Field label="Program Offered">
                {offer.programOffered || "—"}
              </Field>
              <Field label="Offer Status">
                <Pill tone={OFFER_STATUS_TONE[offer.offerStatus]}>
                  {OFFER_STATUS_LABELS[offer.offerStatus]}
                </Pill>
              </Field>
              <Field label="Offer Letter Template">
                {templates.find((t) => t.id === offer.letterTemplateId)?.name ??
                  (offer.letterTemplateId ? "Template" : "—")}
                {offer.letterTemplateVersion
                  ? ` (v${offer.letterTemplateVersion})`
                  : ""}
              </Field>
              <Field label="Offer Generated On">
                {formatDateTime(offer.offerGeneratedOn)}
              </Field>
              <Field label="Offer Valid Till">
                {formatDate(offer.offerValidTill)}
              </Field>
              <Field label="Scholarship Amount">
                {formatMoney(offer.scholarshipAmount)}
              </Field>
              <Field label="Generated By">
                {offer.generatedBy ? "Staff" : "System"}
              </Field>
              <Field label="Sent to Candidate">
                {offer.sentToCandidate
                  ? `Yes (${formatDateTime(offer.sentAt)})`
                  : "No"}
              </Field>
              <Field label="Conditions" className="col-span-2">
                {offer.conditions || "—"}
              </Field>
              {offer.withdrawnReason && (
                <Field label="Withdrawn Reason" className="col-span-2">
                  {offer.withdrawnReason}
                </Field>
              )}
              {offer.fromWaitlist && (
                <Field label="Source">Released from the waitlist</Field>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {offer.offerLetterPdf && orgId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    downloadOfferPdf(orgId, offer.id, offer.offerNo)
                  }
                >
                  <Download className="size-3.5" />
                  Offer Letter PDF
                </Button>
              )}
              {canWrite && offer.offerStatus === "generated" && (
                <>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => send.mutate()}
                    disabled={send.isPending || !released}
                  >
                    <Send className="size-3.5" />
                    {send.isPending ? "Sending..." : "Send to candidate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => fileRef.current?.click()}
                    disabled={upload.isPending}
                  >
                    <FileUp className="size-3.5" />
                    Replace PDF
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) upload.mutate({ offerId: offer.id, file });
                      e.target.value = "";
                    }}
                  />
                </>
              )}
              {canWrite &&
                (offer.offerStatus === "generated" ||
                  offer.offerStatus === "sent") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={() => {
                      setWithdrawReason("");
                      setWithdrawOpen(true);
                    }}
                  >
                    <Ban className="size-3.5" />
                    Withdraw
                  </Button>
                )}
              {offer.offerStatus === "generated" && !released && (
                <p className="text-xs text-muted-foreground">
                  Release the decision before sending the offer.
                </p>
              )}
            </div>

            {offer.offerLetterHtml && (
              <div
                className="border border-border rounded-lg p-5 bg-muted/20 overflow-auto max-h-[480px] text-sm [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: offer.offerLetterHtml }}
              />
            )}
          </>
        )}

        {canGenerate && (
          <>
            {offer && <Separator />}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">
                {offer ? "Generate again" : "Generate offer letter"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Offer Type
                  </Label>
                  <Select
                    value={offerType}
                    onValueChange={(v) => setOfferType(v as OfferType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Program Offered
                  </Label>
                  <Select value={program} onValueChange={setProgram}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programOptions.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Offer Letter Template
                  </Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        Default offer template
                      </SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} (v{t.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Offer Valid Till
                  </Label>
                  <Input
                    type="date"
                    value={validTill}
                    min={addDaysStr(0)}
                    onChange={(e) => setValidTill(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Scholarship Amount (₹)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={scholarship}
                    onChange={(e) => setScholarship(e.target.value)}
                  />
                </div>
                {released && (
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 self-end">
                    <span className="text-sm">Send right away</span>
                    <Switch checked={sendNow} onCheckedChange={setSendNow} />
                  </label>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Conditions
                </Label>
                <Textarea
                  rows={2}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="e.g. Subject to submission of the final semester marksheet"
                />
              </div>
              <Button
                className="w-fit"
                onClick={submitGenerate}
                disabled={generate.isPending || !validTill}
              >
                {generate.isPending ? "Generating..." : "Generate offer letter"}
              </Button>
            </div>
          </>
        )}

        {!offer && !canGenerate && (
          <p className="text-sm text-muted-foreground">
            {approvedOffer
              ? "No offer letter yet."
              : "An offer letter can be generated once Offer Made is approved."}
          </p>
        )}

        {history.length > 1 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Offer history
              </p>
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium">OFR-{h.offerNo}</span>
                  <Pill tone={OFFER_STATUS_TONE[h.offerStatus]}>
                    {OFFER_STATUS_LABELS[h.offerStatus]}
                  </Pill>
                  <span className="text-xs text-muted-foreground">
                    {h.programOffered} · {formatDate(h.offerGeneratedOn)}
                  </span>
                  {h.offerLetterPdf && orgId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1"
                      onClick={() => downloadOfferPdf(orgId, h.id, h.offerNo)}
                    >
                      <Download className="size-3" /> PDF
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Withdraw offer?</DialogTitle>
            <DialogDescription>
              The offer becomes Withdrawn and the waitlist moves for this
              program.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={withdraw.isPending}
              onClick={() =>
                withdraw.mutate(withdrawReason.trim() || undefined, {
                  onSuccess: () => setWithdrawOpen(false),
                })
              }
            >
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ===========================================================================
// Acceptance (Offer_Acceptances)
// ===========================================================================

export function AcceptancePanel({
  applicationNo,
  canWrite,
}: {
  applicationNo: string;
  canWrite: boolean;
}) {
  const { data: acceptance, isLoading } = useAcceptance(applicationNo);
  const update = useUpdateAcceptance(applicationNo);
  const confirm = useConfirmAcceptance(applicationNo);
  const onboarding = useSendOnboardingPackage(applicationNo);
  const { data: settings } = useDecisionSettings();

  const [form, setForm] = React.useState({
    acceptanceDeadline: "",
    seatBookingFee: "",
    feePaymentLink: "",
    feePaymentStatus: "pending" as FeePaymentStatus,
    paymentReferenceId: "",
    enrollmentStatus: "not_enrolled" as EnrollmentStatus,
    onboardingInfo: "",
  });
  const [declineOpen, setDeclineOpen] = React.useState(false);
  const [declineReason, setDeclineReason] = React.useState("");

  React.useEffect(() => {
    if (!acceptance) return;
    setForm({
      acceptanceDeadline: toDateInput(acceptance.acceptanceDeadline),
      seatBookingFee: String(acceptance.seatBookingFee ?? 0),
      feePaymentLink: acceptance.feePaymentLink ?? "",
      feePaymentStatus: acceptance.feePaymentStatus,
      paymentReferenceId: acceptance.paymentReferenceId ?? "",
      enrollmentStatus: acceptance.enrollmentStatus,
      onboardingInfo:
        acceptance.onboardingInfo || settings?.defaultOnboardingInfo || "",
    });
  }, [acceptance?.id, acceptance?.updatedAt, settings?.defaultOnboardingInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  function save() {
    update.mutate({
      acceptanceDeadline: form.acceptanceDeadline || undefined,
      seatBookingFee:
        form.seatBookingFee === "" ? undefined : Number(form.seatBookingFee),
      feePaymentLink: form.feePaymentLink.trim() || undefined,
      feePaymentStatus: form.feePaymentStatus,
      paymentReferenceId: form.paymentReferenceId.trim() || undefined,
      enrollmentStatus: form.enrollmentStatus,
      onboardingInfo: form.onboardingInfo,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-muted-foreground" />
          Acceptance & Enrollment
        </CardTitle>
        <CardDescription>
          Enrollment becomes Confirmed when the offer is accepted and the seat
          booking fee is paid. Pending acceptances past their deadline expire
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading acceptance record...
          </p>
        ) : !acceptance ? (
          <p className="text-sm text-muted-foreground">
            The acceptance record is created when the offer letter is sent.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Acceptance ID">ACC-{acceptance.acceptanceNo}</Field>
              <Field label="Acceptance Status">
                <Pill
                  tone={ACCEPTANCE_STATUS_TONE[acceptance.acceptanceStatus]}
                >
                  {ACCEPTANCE_STATUS_LABELS[acceptance.acceptanceStatus]}
                </Pill>
              </Field>
              <Field label="Candidate Confirmation Date">
                {formatDateTime(acceptance.candidateConfirmationDate)}
              </Field>
              <Field label="Acceptance Deadline">
                {formatDate(acceptance.acceptanceDeadline)}
              </Field>
              <Field label="Seat Booking Fee">
                {formatMoney(acceptance.seatBookingFee)}
              </Field>
              <Field label="Fee Payment Status">
                <Pill
                  tone={PAYMENT_TONE[acceptance.feePaymentStatus] ?? TONE.zinc}
                >
                  {FEE_PAYMENT_STATUS_LABELS[acceptance.feePaymentStatus] ??
                    acceptance.feePaymentStatus}
                </Pill>
              </Field>
              <Field label="Payment Reference ID">
                {acceptance.paymentReferenceId || "—"}
              </Field>
              <Field label="Enrollment Status">
                <Pill
                  tone={
                    ENROLLMENT_TONE[acceptance.enrollmentStatus] ?? TONE.zinc
                  }
                >
                  {ENROLLMENT_STATUS_LABELS[acceptance.enrollmentStatus] ??
                    acceptance.enrollmentStatus}
                </Pill>
              </Field>
              <Field label="Fee Payment Link" className="col-span-2">
                {acceptance.feePaymentLink ? (
                  <a
                    href={acceptance.feePaymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all"
                  >
                    {acceptance.feePaymentLink}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Onboarding Package Sent">
                {acceptance.onboardingPackageSent
                  ? `Yes (${formatDateTime(acceptance.onboardingSentAt)})`
                  : "No"}
              </Field>
              {acceptance.declineReason && (
                <Field label="Decline Reason">{acceptance.declineReason}</Field>
              )}
            </div>

            {canWrite && acceptance.acceptanceStatus === "pending" && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => confirm.mutate({ accept: true })}
                  disabled={confirm.isPending}
                >
                  Record acceptance
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeclineReason("");
                    setDeclineOpen(true);
                  }}
                >
                  Record decline
                </Button>
                <p className="text-xs text-muted-foreground">
                  The candidate can also answer in the student portal.
                </p>
              </div>
            )}

            {canWrite && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Acceptance Deadline
                    </Label>
                    <Input
                      type="date"
                      value={form.acceptanceDeadline}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          acceptanceDeadline: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Seat Booking Fee (₹)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.seatBookingFee}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          seatBookingFee: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Fee Payment Link
                    </Label>
                    <Input
                      type="url"
                      value={form.feePaymentLink}
                      placeholder="https://..."
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          feePaymentLink: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Fee Payment Status
                    </Label>
                    <Select
                      value={form.feePaymentStatus}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          feePaymentStatus: v as FeePaymentStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FEE_PAYMENT_STATUS_LABELS).map(
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
                      Payment Reference ID
                    </Label>
                    <Input
                      value={form.paymentReferenceId}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          paymentReferenceId: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Enrollment Status
                    </Label>
                    <Select
                      value={form.enrollmentStatus}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          enrollmentStatus: v as EnrollmentStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENROLLMENT_STATUS_LABELS).map(
                          ([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Onboarding Info
                  </Label>
                  <Textarea
                    rows={4}
                    value={form.onboardingInfo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, onboardingInfo: e.target.value }))
                    }
                    placeholder="Orientation date, documents to bring, hostel and fee details..."
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={save}
                    disabled={update.isPending}
                  >
                    {update.isPending ? "Saving..." : "Save"}
                  </Button>
                  {acceptance.acceptanceStatus === "accepted" && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={
                        onboarding.isPending || !form.onboardingInfo.trim()
                      }
                      onClick={() => onboarding.mutate(form.onboardingInfo)}
                    >
                      <PackageCheck className="size-3.5" />
                      {acceptance.onboardingPackageSent
                        ? "Send onboarding package again"
                        : "Send onboarding package"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Record decline</DialogTitle>
            <DialogDescription>
              The offer is marked Declined and the waitlist moves for this
              program.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate(
                  {
                    accept: false,
                    declineReason: declineReason.trim() || undefined,
                  },
                  { onSuccess: () => setDeclineOpen(false) },
                )
              }
            >
              Record decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ===========================================================================
// Waitlist (Waitlist_Management)
// ===========================================================================

export function WaitlistPanel({
  applicationNo,
  canWrite,
}: {
  applicationNo: string;
  canWrite: boolean;
}) {
  const { data: entry, isLoading } = useWaitlistEntry(applicationNo);
  const { data: picklists } = useDecisionPicklists();
  const update = useUpdateWaitlistEntry(applicationNo);
  const releaseOffer = useReleaseWaitlistOffer(applicationNo);
  const close = useCloseWaitlistEntry(applicationNo);

  const [form, setForm] = React.useState({
    waitlistRank: "",
    alternateProgramOffered: "",
    movementTrigger: "" as MovementTrigger | "",
    lastReviewDate: "",
    remarks: "",
  });
  const [releaseOpen, setReleaseOpen] = React.useState(false);
  const [releaseProgram, setReleaseProgram] = React.useState("same");

  React.useEffect(() => {
    if (!entry) return;
    setForm({
      waitlistRank: entry.waitlistRank ? String(entry.waitlistRank) : "",
      alternateProgramOffered: entry.alternateProgramOffered ?? "",
      movementTrigger: entry.movementTrigger ?? "",
      lastReviewDate: toDateInput(entry.lastReviewDate),
      remarks: entry.remarks ?? "",
    });
  }, [entry?.id, entry?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-muted-foreground" />
          Waitlist
        </CardTitle>
        <CardDescription>
          When an offer in this program is declined, expires or is withdrawn,
          the next ranked applicant gets an offer (automatic or manual, see
          Decision Settings).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading waitlist entry...
          </p>
        ) : !entry ? (
          <p className="text-sm text-muted-foreground">
            The waitlist entry is created when the Waitlisted decision is
            released.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Waitlist ID">WL-{entry.waitlistNo}</Field>
              <Field label="Waitlist Rank">{entry.waitlistRank ?? "—"}</Field>
              <Field label="Program">{entry.program || "—"}</Field>
              <Field label="Waitlist Status">
                <Pill tone={WAITLIST_STATUS_TONE[entry.waitlistStatus]}>
                  {WAITLIST_STATUS_LABELS[entry.waitlistStatus]}
                </Pill>
              </Field>
              <Field label="Movement Trigger">
                {entry.movementTrigger
                  ? (MOVEMENT_TRIGGER_LABELS[entry.movementTrigger] ??
                    entry.movementTrigger)
                  : "—"}
              </Field>
              <Field label="Alternate Program Offered">
                {entry.alternateProgramOffered || "—"}
              </Field>
              <Field label="Offer Released">
                {entry.offerReleased ? "Yes" : "No"}
              </Field>
              <Field label="Communication Sent">
                {entry.communicationSent ? "Yes" : "No"}
              </Field>
              <Field label="Last Review Date">
                {formatDate(entry.lastReviewDate)}
              </Field>
              <Field label="Remarks" className="col-span-2 md:col-span-3">
                {entry.remarks || "—"}
              </Field>
            </div>

            {canWrite && entry.waitlistStatus === "active" && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Waitlist Rank
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.waitlistRank}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, waitlistRank: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Alternate Program Offered
                    </Label>
                    <Select
                      value={form.alternateProgramOffered || "none"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          alternateProgramOffered: v === "none" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(picklists?.programs || []).map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Movement Trigger
                    </Label>
                    <Select
                      value={form.movementTrigger || "none"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          movementTrigger:
                            v === "none" ? "" : (v as MovementTrigger),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {Object.entries(MOVEMENT_TRIGGER_LABELS).map(
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
                      Last Review Date
                    </Label>
                    <Input
                      type="date"
                      value={form.lastReviewDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          lastReviewDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Remarks
                  </Label>
                  <Textarea
                    rows={2}
                    value={form.remarks}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, remarks: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        waitlistRank: form.waitlistRank
                          ? Number(form.waitlistRank)
                          : undefined,
                        alternateProgramOffered:
                          form.alternateProgramOffered || undefined,
                        movementTrigger: form.movementTrigger || undefined,
                        lastReviewDate: form.lastReviewDate || undefined,
                        remarks: form.remarks,
                      })
                    }
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setReleaseProgram("same");
                      setReleaseOpen(true);
                    }}
                  >
                    <Send className="size-3.5" />
                    Release offer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-700"
                    disabled={close.isPending}
                    onClick={() => close.mutate()}
                  >
                    Close entry
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Release an offer?</DialogTitle>
            <DialogDescription>
              The decision becomes Offer Made, an offer letter is generated from
              the default template and emailed, and the waitlist is re-ranked.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Program</Label>
            <Select value={releaseProgram} onValueChange={setReleaseProgram}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same">
                  Waitlisted program ({entry?.program || "applied program"})
                </SelectItem>
                {(picklists?.programs || [])
                  .filter((p) => p.name !== entry?.program)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      Alternate: {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={releaseOffer.isPending}
              onClick={() =>
                releaseOffer.mutate(
                  {
                    alternateProgramOffered:
                      releaseProgram === "same" ? undefined : releaseProgram,
                    movementTrigger: form.movementTrigger || "manual_review",
                  },
                  { onSuccess: () => setReleaseOpen(false) },
                )
              }
            >
              {releaseOffer.isPending ? "Releasing..." : "Release offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ===========================================================================
// Rejection
// ===========================================================================

export function RejectionPanel({
  applicationNo,
  canWrite,
}: {
  applicationNo: string;
  canWrite: boolean;
}) {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const { data: rejection, isLoading } = useRejection(applicationNo);
  const { data: templates = [] } = useLetterTemplates({
    type: "rejection",
    status: "active",
  });
  const { data: picklists } = useDecisionPicklists();
  const update = useUpdateRejection(applicationNo);
  const sendLetter = useSendRejectionLetter(applicationNo);

  const [form, setForm] = React.useState({
    rejectionReason: "other" as RejectionReason,
    detailedReason: "",
    rejectionLetterTemplateId: "default",
    alternateOptionsSuggested: "",
    eligibleForReapply: true,
    nextIntake: "",
  });

  React.useEffect(() => {
    if (!rejection) return;
    setForm({
      rejectionReason: rejection.rejectionReason,
      detailedReason: rejection.detailedReason ?? "",
      rejectionLetterTemplateId:
        rejection.rejectionLetterTemplateId ?? "default",
      alternateOptionsSuggested: rejection.alternateOptionsSuggested ?? "",
      eligibleForReapply: rejection.eligibleForReapply,
      nextIntake: rejection.nextIntake ?? "",
    });
  }, [rejection?.id, rejection?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const intakes = picklists?.intakes ?? [];
  const intakeOptions =
    form.nextIntake && !intakes.some((i) => i.name === form.nextIntake)
      ? [{ id: "__current", name: form.nextIntake }, ...intakes]
      : intakes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <XOctagon className="size-4 text-muted-foreground" />
          Rejection
        </CardTitle>
        <CardDescription>
          The rejection letter is generated from its template as a PDF and
          emailed to the applicant.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading rejection record...
          </p>
        ) : (
          <>
            {rejection && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Rejection ID">REJ-{rejection.rejectionNo}</Field>
                <Field label="Rejection Reason">
                  <Pill tone={TONE.red}>
                    {REJECTION_REASON_LABELS[rejection.rejectionReason]}
                  </Pill>
                </Field>
                <Field label="Rejection Date">
                  {formatDate(rejection.rejectionDate)}
                </Field>
                <Field label="Communication Sent">
                  {rejection.communicationSent
                    ? `Yes (${formatDateTime(rejection.communicationSentAt)})`
                    : "No"}
                </Field>
                <Field label="Eligible for Reapply">
                  {rejection.eligibleForReapply ? "Yes" : "No"}
                </Field>
                <Field label="Next Intake">{rejection.nextIntake || "—"}</Field>
                <Field label="Rejection Letter Template">
                  {templates.find(
                    (t) => t.id === rejection.rejectionLetterTemplateId,
                  )?.name ?? "Default"}
                </Field>
              </div>
            )}

            {canWrite && (
              <>
                {rejection && <Separator />}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Rejection Reason
                    </Label>
                    <Select
                      value={form.rejectionReason}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          rejectionReason: v as RejectionReason,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REJECTION_REASON_LABELS).map(
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
                      Rejection Letter Template
                    </Label>
                    <Select
                      value={form.rejectionLetterTemplateId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, rejectionLetterTemplateId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">
                          Default rejection template
                        </SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} (v{t.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Next Intake
                    </Label>
                    <Select
                      value={form.nextIntake || "none"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          nextIntake: v === "none" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {intakeOptions.map((i) => (
                          <SelectItem key={i.id} value={i.name}>
                            {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 self-end">
                    <span className="text-sm">Eligible for Reapply</span>
                    <Switch
                      checked={form.eligibleForReapply}
                      onCheckedChange={(c) =>
                        setForm((f) => ({ ...f, eligibleForReapply: c }))
                      }
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Detailed Reason
                  </Label>
                  <Textarea
                    rows={3}
                    value={form.detailedReason}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, detailedReason: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Alternate Options Suggested
                  </Label>
                  <Textarea
                    rows={2}
                    value={form.alternateOptionsSuggested}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        alternateOptionsSuggested: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        rejectionReason: form.rejectionReason,
                        detailedReason: form.detailedReason,
                        rejectionLetterTemplateId:
                          form.rejectionLetterTemplateId === "default"
                            ? undefined
                            : form.rejectionLetterTemplateId,
                        alternateOptionsSuggested:
                          form.alternateOptionsSuggested,
                        eligibleForReapply: form.eligibleForReapply,
                        nextIntake: form.nextIntake || undefined,
                      })
                    }
                  >
                    Save
                  </Button>
                  {rejection && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={sendLetter.isPending}
                      onClick={() => sendLetter.mutate()}
                    >
                      <Mail className="size-3.5" />
                      {rejection.communicationSent
                        ? "Send rejection letter again"
                        : "Generate & send rejection letter"}
                    </Button>
                  )}
                  {rejection?.rejectionLetterPdf && orgId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() =>
                        downloadRejectionPdf(
                          orgId,
                          rejection.id,
                          rejection.rejectionNo,
                        )
                      }
                    >
                      <Download className="size-3.5" />
                      Rejection Letter PDF
                    </Button>
                  )}
                </div>
              </>
            )}
            {!canWrite && !rejection && (
              <p className="text-sm text-muted-foreground">
                No rejection record yet.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
