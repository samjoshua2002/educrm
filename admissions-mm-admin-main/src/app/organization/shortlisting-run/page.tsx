"use client";

import * as React from "react";
import { PlayCircle, CheckCircle2, XCircle, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import { useShortlistingRules, useRunShortlisting, type ShortlistPreviewRow } from "@/hooks/use-shortlisting";

export default function ShortlistingRunPage() {
  usePageHeader({
    title: "Run Shortlisting",
    description: "Preview shortlisting results for a program/year before committing them to applications.",
  });

  const { data: rules, isLoading: rulesLoading } = useShortlistingRules(undefined, undefined);
  const activeRules = React.useMemo(() => (rules || []).filter((r) => r.status === "active"), [rules]);

  const [selectedRuleId, setSelectedRuleId] = React.useState<string>("");
  const [preview, setPreview] = React.useState<ShortlistPreviewRow[] | null>(null);
  const [committed, setCommitted] = React.useState(false);

  const runMutation = useRunShortlisting();

  const selectedRule = activeRules.find((r) => r.id === selectedRuleId);

  const handlePreview = async () => {
    if (!selectedRuleId) return;
    setCommitted(false);
    const result = (await runMutation.mutateAsync({ ruleId: selectedRuleId, commit: false })) as ShortlistPreviewRow[];
    setPreview(result);
  };

  const handleCommit = async () => {
    if (!selectedRuleId) return;
    await runMutation.mutateAsync({ ruleId: selectedRuleId, commit: true });
    setCommitted(true);
  };

  const eligibleCount = preview?.filter((r) => r.shortlistStatus === "Eligible").length ?? 0;
  const notEligibleCount = preview?.filter((r) => r.shortlistStatus === "Not Eligible").length ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Rule picker */}
      <div className="border border-border/80 rounded-[12px] bg-card p-5 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shortlisting Rule
          </label>
          <Select value={selectedRuleId} onValueChange={(v) => { setSelectedRuleId(v); setPreview(null); setCommitted(false); }}>
            <SelectTrigger className="w-full h-11">
              <SelectValue placeholder={rulesLoading ? "Loading rules..." : "Select a program/year rule"} />
            </SelectTrigger>
            <SelectContent>
              {activeRules.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.program} — {r.academicYear} (cutoff {r.cutoffScore})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handlePreview}
          disabled={!selectedRuleId || runMutation.isPending}
          className="gap-2 h-11"
        >
          <PlayCircle className="size-4" />
          {runMutation.isPending ? "Running..." : "Run Preview"}
        </Button>
      </div>

      {selectedRule && (
        <div className="text-xs text-muted-foreground px-1">
          Weightages: Academic {selectedRule.academicWeightage}% · Test {selectedRule.testWeightage}% · Experience{" "}
          {selectedRule.experienceWeightage}% — Cutoff score {selectedRule.cutoffScore}
        </div>
      )}

      {/* Preview results */}
      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1 px-3 py-1">
              <CheckCircle2 className="size-3.5" /> {eligibleCount} Eligible
            </Badge>
            <Badge className="bg-red-100 text-red-700 border-0 gap-1 px-3 py-1">
              <XCircle className="size-3.5" /> {notEligibleCount} Not Eligible
            </Badge>
            <div className="flex-1" />
            <Button
              onClick={handleCommit}
              disabled={runMutation.isPending || committed || preview.length === 0}
              variant="default"
              className="gap-2"
            >
              <Save className="size-4" />
              {committed ? "Committed" : "Commit Results"}
            </Button>
          </div>

          <div className="border border-border/80 rounded-[12px] bg-card overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-100 dark:bg-muted/5">
                <TableRow>
                  <TableHead className="px-6">Applicant</TableHead>
                  <TableHead className="px-6">App No.</TableHead>
                  <TableHead className="px-6">Academic</TableHead>
                  <TableHead className="px-6">Test</TableHead>
                  <TableHead className="px-6">Experience</TableHead>
                  <TableHead className="px-6">Shortlist Score</TableHead>
                  <TableHead className="px-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No applications matched this rule&apos;s program/academic year.
                    </TableCell>
                  </TableRow>
                ) : (
                  preview.map((row) => (
                    <TableRow key={row.applicationId}>
                      <TableCell className="px-6 font-medium">{row.name}</TableCell>
                      <TableCell className="px-6">{row.applicationNo}</TableCell>
                      <TableCell className="px-6">{row.academicComponent}</TableCell>
                      <TableCell className="px-6">{row.testComponent}</TableCell>
                      <TableCell className="px-6">{row.experienceComponent}</TableCell>
                      <TableCell className="px-6 font-semibold">{row.shortlistScore}</TableCell>
                      <TableCell className="px-6">
                        <Badge
                          className={
                            row.shortlistStatus === "Eligible"
                              ? "bg-emerald-100 text-emerald-700 border-0"
                              : "bg-red-100 text-red-700 border-0"
                          }
                        >
                          {row.shortlistStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
