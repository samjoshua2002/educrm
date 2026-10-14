"use client";

import * as React from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWaitlistEntry } from "@/hooks/use-acceptance";
import { useDecision } from "@/hooks/use-admission-decisions";
import { useApplication } from "@/hooks/use-applications";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";
import { TONE } from "@/types/admission-decisions";

import { DecisionPanel } from "../_components/decision-panel";
import {
  AcceptancePanel,
  OfferPanel,
  RejectionPanel,
  WaitlistPanel,
} from "../_components/outcome-panels";
import {
  AccessRestricted,
  DECISION_ROLES,
  DECISION_WRITE_ROLES,
  Field,
  Pill,
  formatScore,
} from "../_components/shared";

export default function AdmissionDecisionDetailPage() {
  const params = useParams();
  const rawParam = params.application_number;
  const applicationNo = React.useMemo(() => {
    if (!rawParam) return "";
    if (Array.isArray(rawParam))
      return rawParam.map((p) => decodeURIComponent(p)).join("/");
    return decodeURIComponent(rawParam);
  }, [rawParam]);

  usePageHeader({
    title: "Admission Decision",
    description: applicationNo ? `Application ${applicationNo}` : undefined,
  });

  const user = useAuthStore((s) => s.user);
  const canAccess = !!user && DECISION_ROLES.includes(user.role);
  const canWrite = !!user && DECISION_WRITE_ROLES.includes(user.role);

  const { data: application } = useApplication(applicationNo, {
    enabled: canAccess && !!applicationNo,
  });
  const { data: detail, isLoading } = useDecision(
    canAccess ? applicationNo : undefined,
  );
  const decision = detail?.decision ?? null;
  const score = detail?.scoreBreakdown;

  if (!canAccess) {
    return (
      <AccessRestricted message="Only organization staff can open admission decisions." />
    );
  }

  const program =
    (application as any)?.appliedFor || (application as any)?.program || null;
  const isOffer = decision?.finalDecision === "offer_made";

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
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>
              {(application as any)?.applicant?.name ||
                (application as any)?.name ||
                applicationNo}
            </span>
            <Badge variant="secondary">{applicationNo}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Program">{program || "—"}</Field>
          <Field label="Email">
            {(application as any)?.applicant?.email ||
              (application as any)?.email ||
              "—"}
          </Field>
          <Field label="Mobile">
            {(application as any)?.applicant?.primaryMobile ||
              (application as any)?.primaryMobile ||
              "—"}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="size-4 text-muted-foreground" />
            Composite Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : score ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="GD Score">
                  {formatScore(score.gdScore as number | null)}
                </Field>
                <Field label="PI Score">
                  {formatScore(score.piScore as number | null)}
                </Field>
                <Field label="Experience Component">
                  {formatScore(score.experienceComponent as number | null)}
                </Field>
                <Field label="Other Components">
                  {formatScore(score.otherComponentsTotal as number | null)}
                </Field>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Composite Score
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatScore(score.compositeScore as number | null)}
                </p>
              </div>
              {score.discrepancyFlag && (
                <Pill tone={TONE.red} className="w-fit">
                  Experience discrepancy flagged
                </Pill>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No composite score has been calculated for this application.
            </p>
          )}
        </CardContent>
      </Card>

      {!isLoading && (
        <DecisionPanel
          applicationNo={applicationNo}
          detail={detail}
          canWrite={canWrite}
        />
      )}

      {decision && isOffer && (
        <>
          <OfferPanel
            applicationNo={applicationNo}
            decision={decision}
            defaultProgram={program}
            canWrite={canWrite}
          />
          <AcceptancePanel applicationNo={applicationNo} canWrite={canWrite} />
        </>
      )}
      {decision?.decisionStage === "decision_released" &&
        decision.finalDecision === "waitlisted" && (
          <WaitlistPanel applicationNo={applicationNo} canWrite={canWrite} />
        )}
      {decision?.decisionStage === "decision_released" && isOffer && (
        <WaitlistHistory applicationNo={applicationNo} canWrite={canWrite} />
      )}
      {decision?.decisionStage === "decision_released" &&
        decision.finalDecision === "rejected" && (
          <RejectionPanel applicationNo={applicationNo} canWrite={canWrite} />
        )}
    </div>
  );
}

// An applicant who got an offer from the waitlist still has a waitlist entry
// (Offer Released / Converted / Closed); show it read-only when it exists.
function WaitlistHistory({
  applicationNo,
  canWrite,
}: {
  applicationNo: string;
  canWrite: boolean;
}) {
  const { data } = useWaitlistEntry(applicationNo);
  if (!data) return null;
  return <WaitlistPanel applicationNo={applicationNo} canWrite={canWrite} />;
}
