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
  useInterviewRubrics,
  useMyEvaluation,
  useSubmitEvaluation,
} from "@/hooks/use-evaluations";

const RECOMMENDATION_OPTIONS = [
  "Strongly Recommend",
  "Recommend",
  "Neutral",
  "Do Not Recommend",
] as const;

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
    const payload = buildPayload(submit);
    if (payload.scores.length === 0) return;
    await submitEvaluation.mutateAsync(payload);
  }

  const isLoading = rubricsLoading || evaluationLoading;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <Link
        href="/organization/gd-interview/evaluate"
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

          <Card>
            <CardHeader>
              <CardTitle>Rubric Scores</CardTitle>
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
                        <span className="text-xs text-muted-foreground shrink-0">Max {rubric.maxScore}</span>
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
