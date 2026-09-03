"use client";

import * as React from "react";
import { PlayCircle, CheckCircle2, XCircle, Save, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";

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
import { cn } from "@/lib/utils";

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
  const [previewPage, setPreviewPage] = React.useState(1);
  const itemsPerPage = 8;

  const runMutation = useRunShortlisting();

  const selectedRule = activeRules.find((r) => r.id === selectedRuleId);

  const handlePreview = async () => {
    if (!selectedRuleId) return;
    setCommitted(false);
    setPreviewPage(1);
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

  // Pagination Calculations
  const paginatedPreview = React.useMemo(() => {
    if (!preview) return [];
    const startIndex = (previewPage - 1) * itemsPerPage;
    return preview.slice(startIndex, startIndex + itemsPerPage);
  }, [preview, previewPage]);

  const totalPages = Math.ceil((preview?.length || 0) / itemsPerPage) || 1;
  const startIndex = (previewPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const visiblePages = React.useMemo(() => {
    const pages = [];
    const start = Math.max(1, previewPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    for (let i = adjustedStart; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [previewPage, totalPages]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      {/* Rule picker & Setup Card */}
      <div className="border border-[#e5e5e5] rounded-[12px] bg-white p-5 md:p-6 flex flex-col sm:flex-row sm:items-end gap-5 shadow-xs">
        <div className="flex flex-col gap-2.5 flex-1 min-w-0">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Select Active Shortlisting Rule
          </label>
          <Select
            value={selectedRuleId}
            onValueChange={(v) => {
              setSelectedRuleId(v);
              setPreview(null);
              setCommitted(false);
            }}
          >
            <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-[8px] bg-white text-[14px]">
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
          className="gap-2 bg-[#2563EB] text-white hover:bg-[#1d4ed8] h-11 px-6 rounded-[8px] font-medium transition-colors cursor-pointer shrink-0"
        >
          {runMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlayCircle className="size-4" />
          )}
          {runMutation.isPending ? "Running..." : "Run Preview"}
        </Button>
      </div>

      {selectedRule && (
        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-[8px] px-4 py-3">
          <AlertCircle className="size-4 text-slate-400 shrink-0" />
          <span>
            <strong className="text-slate-700">Weights Configuration:</strong> Academic {selectedRule.academicWeightage}% · Test {selectedRule.testWeightage}% · Experience {selectedRule.experienceWeightage}% | <strong className="text-slate-700">Cutoff:</strong> {selectedRule.cutoffScore}
          </span>
        </div>
      )}

      {/* Preview results */}
      {preview && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2e8f0] pb-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/50 gap-1.5 px-3 py-1 rounded-[6px] font-semibold text-xs shadow-3xs">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> {eligibleCount} Eligible
              </Badge>
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200/50 gap-1.5 px-3 py-1 rounded-[6px] font-semibold text-xs shadow-3xs">
                <XCircle className="size-3.5 text-red-600" /> {notEligibleCount} Not Eligible
              </Badge>
            </div>
            
            <Button
              onClick={handleCommit}
              disabled={runMutation.isPending || committed || preview.length === 0}
              className={cn(
                "gap-2 h-10 px-5 rounded-[8px] font-semibold shadow-sm transition-all cursor-pointer border-0",
                committed
                  ? "bg-slate-100 text-slate-500 hover:bg-slate-100"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <Save className="size-4" />
              {committed ? "Committed" : "Commit Results"}
            </Button>
          </div>

          <div className="border border-[#e5e5e5] rounded-[12px] bg-white shadow-sm overflow-hidden flex flex-col w-full max-w-full">
            {/* Desktop Table View */}
            <div className="hidden lg:block w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
                  <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Applicant</TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">App No.</TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Academic</TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Test</TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Experience</TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Shortlist Score</TableHead>
                    <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-slate-500 font-medium">
                        No applications matched this rule&apos;s program/academic year.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPreview.map((row) => (
                      <TableRow key={row.applicationId} className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[64px]">
                        <TableCell className="py-[14px] px-[24px] align-middle font-semibold text-[#1e293b] text-[14px]">{row.name}</TableCell>
                        <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">{row.applicationNo}</TableCell>
                        <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">{row.academicComponent}</TableCell>
                        <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">{row.testComponent}</TableCell>
                        <TableCell className="py-[14px] px-[24px] align-middle text-[#475569] text-[14px]">{row.experienceComponent}</TableCell>
                        <TableCell className="py-[14px] px-[24px] align-middle font-bold text-[#1e293b] text-[14px]">{row.shortlistScore}</TableCell>
                        <TableCell className="py-[14px] px-[24px] align-middle">
                          <Badge
                            className={cn(
                              "border-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-3xs",
                              row.shortlistStatus === "Eligible"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            )}
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

            {/* Mobile Cards View */}
            <div className="block lg:hidden p-4 space-y-4 bg-slate-50/50">
              {preview.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-medium bg-white rounded-xl border border-[#e5e5e5]">
                  No applications matched this rule&apos;s program/academic year.
                </div>
              ) : (
                paginatedPreview.map((row) => (
                  <div
                    key={row.applicationId}
                    className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 flex flex-col gap-3.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-[14px]">
                          {row.name}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {row.applicationNo}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "border-0 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-3xs",
                          row.shortlistStatus === "Eligible"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {row.shortlistStatus}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-[#e2e8f0]/80 pt-3 text-[11px] text-slate-500">
                      <div>
                        <span className="block text-slate-400 font-medium">Academic</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">{row.academicComponent}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-medium">Test</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">{row.testComponent}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-medium">Experience</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">{row.experienceComponent}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#e2e8f0]/80 pt-3 text-[12px]">
                      <span className="text-slate-500 font-medium">Shortlist Score</span>
                      <span className="font-bold text-[#1e293b]">{row.shortlistScore}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Footer */}
            {preview.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#e2e8f0] bg-[#FCFDFD] dark:bg-muted/5 py-4 px-6 gap-4">
                <p className="text-sm text-muted-foreground font-normal">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {preview.length === 0 ? 0 : startIndex + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(endIndex, preview.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">{preview.length}</span>{" "}
                  entries
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs cursor-pointer"
                      onClick={() => {
                        if (previewPage > 1) setPreviewPage(previewPage - 1);
                      }}
                      disabled={previewPage === 1}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-1.5 px-1">
                      {visiblePages.map((page) => {
                        const isActive = page === previewPage;
                        return (
                          <Button
                            key={page}
                            variant={isActive ? "default" : "outline"}
                            className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors cursor-pointer ${
                              isActive
                                ? "bg-[#2563EB] border-[#2563EB] text-white font-semibold hover:bg-[#1d4ed8] shadow-xs"
                                : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                            }`}
                            onClick={() => setPreviewPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs cursor-pointer"
                      onClick={() => {
                        if (previewPage < totalPages) setPreviewPage(previewPage + 1);
                      }}
                      disabled={previewPage === totalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
