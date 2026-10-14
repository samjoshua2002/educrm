"use client";

import * as React from "react";

import Link from "next/link";

import { Download, Eye, Search, Armchair } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAcceptanceList,
  useRejectionList,
  useSeatsAvailable,
  useWaitlist,
} from "@/hooks/use-acceptance";
import {
  downloadOfferPdf,
  downloadRejectionPdf,
  useDecisionPicklists,
  useOfferList,
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
} from "@/types/admission-decisions";

import {
  CELL,
  EmptyRow,
  LoadingRow,
  Pill,
  ROW,
  TABLE_HEADER,
  TABLE_WRAPPER,
  Th,
  formatDate,
  formatMoney,
  formatScore,
} from "./shared";

function reviewHref(applicationNo?: string) {
  return `/organization/decisions/${encodeURIComponent(applicationNo || "")}`;
}

function ReviewButton({ applicationNo }: { applicationNo?: string }) {
  return (
    <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
      <Link href={reviewHref(applicationNo)}>
        <Eye className="size-3.5" />
        Open
      </Link>
    </Button>
  );
}

function Applicant({ name, sub }: { name?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-foreground tracking-tight">
        {name || "—"}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offers (Offer_Letters)
// ---------------------------------------------------------------------------

export function OffersTab() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const [status, setStatus] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const { data: rows = [], isLoading } = useOfferList({
    status: status === "all" ? undefined : status,
    search: debounced || undefined,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant or application no."
            className="pl-9 bg-card"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[200px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All offer statuses</SelectItem>
            {Object.entries(OFFER_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={TABLE_WRAPPER}>
        <Table>
          <TableHeader className={TABLE_HEADER}>
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <Th>Offer ID</Th>
              <Th>Applicant</Th>
              <Th>Program Offered</Th>
              <Th>Offer Type</Th>
              <Th>Offer Status</Th>
              <Th>Template</Th>
              <Th>Generated On</Th>
              <Th>Valid Till</Th>
              <Th>Scholarship</Th>
              <Th>Sent</Th>
              <Th>Acceptance</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={12} label="Loading offers..." />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={12}
                title="No offer letters"
                hint="Offer letters appear once generated from a decision."
              />
            ) : (
              rows.map((o) => (
                <TableRow key={o.id} className={ROW}>
                  <TableCell className={`${CELL} text-foreground/80`}>
                    OFR-{o.offerNo}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Applicant name={o.applicantName} sub={o.applicationNo} />
                  </TableCell>
                  <TableCell className={CELL}>
                    {o.programOffered || "—"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {OFFER_TYPE_LABELS[o.offerType] ?? o.offerType}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Pill tone={OFFER_STATUS_TONE[o.offerStatus]}>
                      {OFFER_STATUS_LABELS[o.offerStatus]}
                    </Pill>
                  </TableCell>
                  <TableCell className={CELL}>
                    {o.templateName || "—"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatDate(o.offerGeneratedOn)}
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatDate(o.offerValidTill)}
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatMoney(o.scholarshipAmount)}
                  </TableCell>
                  <TableCell className={CELL}>
                    {o.sentToCandidate ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {o.acceptanceStatus ? (
                      <Pill tone={ACCEPTANCE_STATUS_TONE[o.acceptanceStatus]}>
                        {ACCEPTANCE_STATUS_LABELS[o.acceptanceStatus]}
                      </Pill>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className={`${CELL} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      {o.offerLetterPdf && orgId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() =>
                            downloadOfferPdf(orgId, o.id, o.offerNo)
                          }
                        >
                          <Download className="size-3.5" />
                          PDF
                        </Button>
                      )}
                      <ReviewButton applicationNo={o.applicationNo} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Acceptances (Offer_Acceptances)
// ---------------------------------------------------------------------------

export function AcceptancesTab() {
  const [status, setStatus] = React.useState("all");
  const { data: rows = [], isLoading } = useAcceptanceList(
    status === "all" ? undefined : status,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[220px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All acceptance statuses</SelectItem>
            {Object.entries(ACCEPTANCE_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={TABLE_WRAPPER}>
        <Table>
          <TableHeader className={TABLE_HEADER}>
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <Th>Acceptance ID</Th>
              <Th>Applicant</Th>
              <Th>Offer</Th>
              <Th>Acceptance Status</Th>
              <Th>Confirmation Date</Th>
              <Th>Deadline</Th>
              <Th>Seat Booking Fee</Th>
              <Th>Fee Payment</Th>
              <Th>Payment Ref.</Th>
              <Th>Onboarding Sent</Th>
              <Th>Enrollment</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={12} label="Loading acceptances..." />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={12}
                title="No acceptance records"
                hint="A record is created when an offer letter is sent."
              />
            ) : (
              rows.map((a) => (
                <TableRow key={a.id} className={ROW}>
                  <TableCell className={`${CELL} text-foreground/80`}>
                    ACC-{a.acceptanceNo}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Applicant name={a.applicantName} sub={a.applicationNo} />
                  </TableCell>
                  <TableCell className={CELL}>
                    <div className="flex flex-col gap-0.5">
                      <span>OFR-{a.offerNo}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.programOffered || ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={CELL}>
                    <Pill tone={ACCEPTANCE_STATUS_TONE[a.acceptanceStatus]}>
                      {ACCEPTANCE_STATUS_LABELS[a.acceptanceStatus]}
                    </Pill>
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatDate(a.candidateConfirmationDate)}
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatDate(a.acceptanceDeadline)}
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatMoney(a.seatBookingFee)}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Pill tone={PAYMENT_TONE[a.feePaymentStatus] ?? TONE.zinc}>
                      {FEE_PAYMENT_STATUS_LABELS[a.feePaymentStatus] ??
                        a.feePaymentStatus}
                    </Pill>
                  </TableCell>
                  <TableCell className={CELL}>
                    {a.paymentReferenceId || "—"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {a.onboardingPackageSent ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Pill
                      tone={ENROLLMENT_TONE[a.enrollmentStatus] ?? TONE.zinc}
                    >
                      {ENROLLMENT_STATUS_LABELS[a.enrollmentStatus] ??
                        a.enrollmentStatus}
                    </Pill>
                  </TableCell>
                  <TableCell className={`${CELL} text-right`}>
                    <ReviewButton applicationNo={a.applicationNo} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Waitlist (Waitlist_Management)
// ---------------------------------------------------------------------------

export function WaitlistTab({ canWrite }: { canWrite: boolean }) {
  const [status, setStatus] = React.useState("active");
  const [program, setProgram] = React.useState("all");
  const { data: picklists } = useDecisionPicklists();
  const { data: rows = [], isLoading } = useWaitlist({
    status,
    program: program === "all" ? undefined : program,
  });

  const seats = useSeatsAvailable();
  const [seatOpen, setSeatOpen] = React.useState(false);
  const [seatProgram, setSeatProgram] = React.useState("");
  const [seatCount, setSeatCount] = React.useState("1");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:flex">
          <Select value={program} onValueChange={setProgram}>
            <SelectTrigger className="sm:w-[220px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {(picklists?.programs || []).map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[200px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(WAITLIST_STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canWrite && (
          <Button
            size="sm"
            className="gap-1.5 w-fit"
            onClick={() => {
              setSeatProgram(program === "all" ? "" : program);
              setSeatOpen(true);
            }}
          >
            <Armchair className="size-3.5" />
            Seats became available
          </Button>
        )}
      </div>

      <div className={TABLE_WRAPPER}>
        <Table>
          <TableHeader className={TABLE_HEADER}>
            <TableRow className="hover:bg-transparent border-b border-border/80">
              <Th>Waitlist ID</Th>
              <Th>Rank</Th>
              <Th>Applicant</Th>
              <Th>Program</Th>
              <Th>Score</Th>
              <Th>Status</Th>
              <Th>Movement Trigger</Th>
              <Th>Alternate Program</Th>
              <Th>Offer Released</Th>
              <Th>Communication</Th>
              <Th>Last Review</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRow colSpan={12} label="Loading waitlist..." />
            ) : rows.length === 0 ? (
              <EmptyRow
                colSpan={12}
                title="Nobody on this waitlist"
                hint="Applicants join when a Waitlisted decision is released."
              />
            ) : (
              rows.map((w) => (
                <TableRow key={w.id} className={ROW}>
                  <TableCell className={`${CELL} text-foreground/80`}>
                    WL-{w.waitlistNo}
                  </TableCell>
                  <TableCell className={`${CELL} font-semibold`}>
                    {w.waitlistRank ?? "—"}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Applicant name={w.applicantName} sub={w.applicationNo} />
                  </TableCell>
                  <TableCell className={CELL}>{w.program || "—"}</TableCell>
                  <TableCell className={CELL}>
                    {formatScore(w.compositeScore)}
                  </TableCell>
                  <TableCell className={CELL}>
                    <Pill tone={WAITLIST_STATUS_TONE[w.waitlistStatus]}>
                      {WAITLIST_STATUS_LABELS[w.waitlistStatus]}
                    </Pill>
                  </TableCell>
                  <TableCell className={CELL}>
                    {w.movementTrigger
                      ? (MOVEMENT_TRIGGER_LABELS[w.movementTrigger] ??
                        w.movementTrigger)
                      : "—"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {w.alternateProgramOffered || "—"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {w.offerReleased ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {w.communicationSent ? "Sent" : "Not sent"}
                  </TableCell>
                  <TableCell className={CELL}>
                    {formatDate(w.lastReviewDate)}
                  </TableCell>
                  <TableCell className={`${CELL} text-right`}>
                    <ReviewButton applicationNo={w.applicationNo} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={seatOpen} onOpenChange={setSeatOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Release offers from the waitlist</DialogTitle>
            <DialogDescription>
              Offers go to the next ranked active applicants of the program, and
              the rest of the waitlist is re-ranked.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Program</Label>
              <Select value={seatProgram} onValueChange={setSeatProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
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
                Seats available
              </Label>
              <Input
                type="number"
                min={1}
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !seatProgram || seats.isPending || Number(seatCount) < 1
              }
              onClick={() =>
                seats.mutate(
                  { program: seatProgram, seats: Number(seatCount) || 1 },
                  { onSuccess: () => setSeatOpen(false) },
                )
              }
            >
              {seats.isPending ? "Releasing..." : "Release offers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rejections
// ---------------------------------------------------------------------------

export function RejectionsTab() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  const { data: rows = [], isLoading } = useRejectionList();
  return (
    <div className={TABLE_WRAPPER}>
      <Table>
        <TableHeader className={TABLE_HEADER}>
          <TableRow className="hover:bg-transparent border-b border-border/80">
            <Th>Rejection ID</Th>
            <Th>Applicant</Th>
            <Th>Program</Th>
            <Th>Reason</Th>
            <Th>Rejection Date</Th>
            <Th>Letter Template</Th>
            <Th>Communication</Th>
            <Th>Reapply</Th>
            <Th>Next Intake</Th>
            <Th className="text-right">Action</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRow colSpan={10} label="Loading rejections..." />
          ) : rows.length === 0 ? (
            <EmptyRow
              colSpan={10}
              title="No rejections"
              hint="Records appear when a Rejected decision is released."
            />
          ) : (
            rows.map((r) => (
              <TableRow key={r.id} className={ROW}>
                <TableCell className={`${CELL} text-foreground/80`}>
                  REJ-{r.rejectionNo}
                </TableCell>
                <TableCell className={CELL}>
                  <Applicant name={r.applicantName} sub={r.applicationNo} />
                </TableCell>
                <TableCell className={CELL}>{r.program || "—"}</TableCell>
                <TableCell className={CELL}>
                  <Pill tone={TONE.red}>
                    {REJECTION_REASON_LABELS[r.rejectionReason] ??
                      r.rejectionReason}
                  </Pill>
                </TableCell>
                <TableCell className={CELL}>
                  {formatDate(r.rejectionDate)}
                </TableCell>
                <TableCell className={CELL}>{r.templateName || "—"}</TableCell>
                <TableCell className={CELL}>
                  {r.communicationSent ? "Sent" : "Not sent"}
                </TableCell>
                <TableCell className={CELL}>
                  {r.eligibleForReapply ? "Eligible" : "Not eligible"}
                </TableCell>
                <TableCell className={CELL}>{r.nextIntake || "—"}</TableCell>
                <TableCell className={`${CELL} text-right`}>
                  <div className="flex items-center justify-end gap-2">
                    {r.rejectionLetterPdf && orgId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() =>
                          downloadRejectionPdf(orgId, r.id, r.rejectionNo)
                        }
                      >
                        <Download className="size-3.5" />
                        PDF
                      </Button>
                    )}
                    <ReviewButton applicationNo={r.applicationNo} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
