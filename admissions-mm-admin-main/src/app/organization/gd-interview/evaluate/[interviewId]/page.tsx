"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  RECOMMENDATIONS as RECOMMENDATION_OPTIONS,
  useInterviewRubrics,
  useMyEvaluation,
  useScoringContext,
  useSubmitEvaluation,
} from "@/hooks/use-evaluations";
import { toast } from "sonner";

// Scope: Evaluation_Scores.Weighted_Score = Score_Given / Max_Score x Weightage
function weightedScore(scoreGiven: number, maxScore: number, weightage?: number | null) {
  const max = Number(maxScore);
  if (!(max > 0)) return 0;
  const w = weightage === null || weightage === undefined ? max : Number(weightage);
  return Number(((scoreGiven / max) * w).toFixed(2));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function ScoreInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = Array.isArray(params.interviewId) ? params.interviewId[0] : params.interviewId;

  usePageHeader({
    title: "Score Interview",
    description: "Rate the candidate against each rubric parameter.",
  });

  const { data: rubrics, isLoading: rubricsLoading } = useInterviewRubrics(interviewId);
  const { data: evaluation, isLoading: evaluationLoading } = useMyEvaluation(interviewId);
  const { data: context } = useScoringContext(interviewId);
  const submitEvaluation = useSubmitEvaluation(interviewId);

  const [scoresByRubricId, setScoresByRubricId] = React.useState<Record<string, { scoreGiven: string; notes: string }>>({});
  const [overallRecommendation, setOverallRecommendation] = React.useState<string>("");
  const [comments, setComments] = React.useState("");

  const isSubmitted = evaluation?.status === "submitted";

  React.useEffect(() => {
    if (!evaluation) return;
    setOverallRecommendation(evaluation.overallRecommendation || "");
    setComments(evaluation.comments || "");
    const initial: Record<string, { scoreGiven: string; notes: string }> = {};
    for (const score of evaluation.scores) {
      initial[score.rubricId] = { scoreGiven: String(score.scoreGiven ?? ""), notes: score.notes || "" };
    }
    setScoresByRubricId(initial);
  }, [evaluation]);

  function updateScore(rubricId: string, field: "scoreGiven" | "notes", value: string) {
    setScoresByRubricId((prev) => ({
      ...prev,
      [rubricId]: { scoreGiven: prev[rubricId]?.scoreGiven ?? "", notes: prev[rubricId]?.notes ?? "", [field]: value },
    }));
  }

  function buildPayload(submit: boolean) {
    const scores: { rubricId: string; scoreGiven: number; notes?: string }[] = [];
    for (const rubric of rubrics || []) {
      const entry = scoresByRubricId[rubric.id];
      if (!entry || entry.scoreGiven === "") continue;
      scores.push({ rubricId: rubric.id, scoreGiven: Number(entry.scoreGiven), notes: entry.notes || undefined });
    }

    return {
      scores,
      overallRecommendation: overallRecommendation || undefined,
      comments: comments || undefined,
      submit,
    };
  }

  async function handleSave(submit: boolean) {
    for (const rubric of rubrics || []) {
      const value = scoresByRubricId[rubric.id]?.scoreGiven;
      if (value === undefined || value === "") {
        if (submit) {
          toast.error(`Enter a score for "${rubric.parameterName}" before submitting`);
          return;
        }
        continue;
      }
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > Number(rubric.maxScore)) {
        toast.error(`"${rubric.parameterName}" must be between 0 and ${rubric.maxScore}`);
        return;
      }
    }
    if (submit && !overallRecommendation) {
      toast.error("Select a recommendation before submitting");
      return;
    }
    const payload = buildPayload(submit);
    if (payload.scores.length === 0) {
      toast.error("Enter at least one score");
      return;
    }
    await submitEvaluation.mutateAsync(payload);
  }

  const totals = React.useMemo(() => {
    let total = 0;
    let possible = 0;
    for (const rubric of rubrics || []) {
      const w = rubric.weightagePercent === null || rubric.weightagePercent === undefined ? Number(rubric.maxScore) : Number(rubric.weightagePercent);
      possible += w;
      const value = scoresByRubricId[rubric.id]?.scoreGiven;
      if (value !== undefined && value !== "") total += weightedScore(Number(value), rubric.maxScore, rubric.weightagePercent);
    }
    return { total: Number(total.toFixed(2)), possible: Number(possible.toFixed(2)) };
  }, [rubrics, scoresByRubricId]);

  const isLoading = rubricsLoading || evaluationLoading;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <Link
        href="/organization/gd-interview/my-evaluations"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to My Evaluations
      </Link>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
      ) : (
        <>
          {isSubmitted && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-700 border-transparent">Submitted</Badge>
              This evaluation was submitted{evaluation?.submittedAt ? ` on ${new Date(evaluation.submittedAt).toLocaleString()}` : ""} and can no longer be edited.
            </div>
          )}

          {context && (
            <Card>
              <CardHeader>
                <CardTitle>Interview Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Candidate</p>
                  <p className="font-medium">{context.interview.candidateName || "-"}</p>
                  <p className="text-xs text-muted-foreground">{context.interview.applicationNo || ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Interview</p>
                  <p className="font-medium">
                    {context.interview.interviewType} · Round {context.interview.round}
                    {context.interview.interviewNumber ? ` · #${context.interview.interviewNumber}` : ""}
                  </p>
                  <Badge variant="outline" className="mt-1">{context.interview.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">When</p>
                  <p className="font-medium">{formatDateTime(context.interview.startTime)}</p>
                  <p className="text-xs text-muted-foreground">{context.interview.interviewMode || ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Where</p>
                  {context.interview.meetingLink ? (
                    <a href={context.interview.meetingLink} target="_blank" rel="noreferrer" className="font-medium text-primary underline break-all">
                      Join meeting
                    </a>
                  ) : (
                    <p className="font-medium">{context.interview.location || "-"}</p>
                  )}
                </div>
                <div className="sm:col-span-2 lg:col-span-4 text-xs text-muted-foreground border-t pt-3">
                  Scoring scheme: <span className="font-medium text-foreground">{context.scheme.name}</span>
                  {context.schemeComponents.length > 0 && (
                    <>
                      {" · "}Your marks feed{" "}
                      {context.schemeComponents.map((c) => `${c.label} (max ${c.maxMarks})`).join(", ")}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Rubric Scores</CardTitle>
              <span className="text-sm text-muted-foreground">
                Weighted total: <span className="font-semibold text-foreground">{totals.total}</span> / {totals.possible}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {(rubrics || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No active rubric parameters configured for this interview type.</p>
              ) : (
                (rubrics || []).map((rubric) => {
                  const entry = scoresByRubricId[rubric.id] || { scoreGiven: "", notes: "" };
                  return (
                    <div key={rubric.id} className="flex flex-col gap-3 border-b border-border/60 pb-5 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{rubric.parameterName}</p>
                          {rubric.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{rubric.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-muted-foreground block">
                            Max {rubric.maxScore}
                            {rubric.weightagePercent !== null && rubric.weightagePercent !== undefined ? ` · Weightage ${rubric.weightagePercent}%` : ""}
                          </span>
                          {entry.scoreGiven !== "" && (
                            <span className="text-xs font-semibold text-foreground">
                              Weighted: {weightedScore(Number(entry.scoreGiven), rubric.maxScore, rubric.weightagePercent)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Score</Label>
                          <Input
                            type="number"
                            min={0}
                            max={rubric.maxScore}
                            step="0.5"
                            disabled={isSubmitted}
                            value={entry.scoreGiven}
                            onChange={(e) => updateScore(rubric.id, "scoreGiven", e.target.value)}
                            placeholder={`0 - ${rubric.maxScore}`}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                          <Input
                            disabled={isSubmitted}
                            value={entry.notes}
                            onChange={(e) => updateScore(rubric.id, "notes", e.target.value)}
                            placeholder="Observations for this parameter"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Overall Recommendation</Label>
                <Select
                  value={overallRecommendation}
                  onValueChange={setOverallRecommendation}
                  disabled={isSubmitted}
                >
                  <SelectTrigger className="w-full sm:w-[280px] h-11">
                    <SelectValue placeholder="Select a recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECOMMENDATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Comments</Label>
                <Textarea
                  disabled={isSubmitted}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Overall comments about the candidate's performance"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {!isSubmitted && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={submitEvaluation.isPending}
              >
                <Save className="size-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={submitEvaluation.isPending}
              >
                <Send className="size-4 mr-2" />
                Submit Evaluation
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
