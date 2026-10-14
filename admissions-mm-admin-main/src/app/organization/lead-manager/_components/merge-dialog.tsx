"use client";

import * as React from "react";
import { GitMerge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useMergeLeads, useMergePreview } from "@/hooks/use-lead-management";
import { cn } from "@/lib/utils";
import { BandBadge, Th, formatDateTime, leadName, pillStyles, tableHeaderClass, tableShell } from "./lm-ui";

function confidenceStyle(c?: number | null) {
  if (c === null || c === undefined) return pillStyles.gray;
  if (c >= 90) return pillStyles.red;
  if (c >= 75) return pillStyles.amber;
  return pillStyles.blue;
}

function display(v: any) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTime(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function MergeDialog({
  review,
  onClose,
}: {
  review: { masterId: string; duplicateId: string } | null;
  onClose: () => void;
}) {
  const [swap, setSwap] = React.useState(false);
  const masterId = review ? (swap ? review.duplicateId : review.masterId) : null;
  const duplicateId = review ? (swap ? review.masterId : review.duplicateId) : null;
  const { data: preview, isLoading, error } = useMergePreview(masterId, duplicateId);
  const merge = useMergeLeads();
  const [choices, setChoices] = React.useState<Record<string, "master" | "duplicate">>({});

  React.useEffect(() => {
    if (!preview) return;
    const init: Record<string, "master" | "duplicate"> = {};
    for (const f of preview.fields) init[f.key] = f.suggested;
    setChoices(init);
  }, [preview]);

  React.useEffect(() => {
    if (!review) setSwap(false);
  }, [review]);

  const differing = preview?.fields.filter((f) => f.differs) || [];

  return (
    <Dialog open={!!review} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge preview</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || !preview ? (
          <p className="text-sm text-rose-600">Could not load the merge preview.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={confidenceStyle(preview.confidence)}>{preview.confidence ?? "—"}% match</span>
              <span className="text-muted-foreground">{preview.reasons.join(", ")}</span>
              <Button variant="outline" size="sm" className="ml-auto h-8 text-xs" onClick={() => setSwap((s) => !s)}>
                Swap master / duplicate
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[8px] border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Master (kept)</p>
                <p className="text-sm font-semibold mt-1">{leadName(preview.master)}</p>
                <div className="mt-1">
                  <BandBadge band={preview.master.scoreBand} score={preview.master.score} />
                </div>
              </div>
              <div className="rounded-[8px] border border-border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Duplicate (merged into master)
                </p>
                <p className="text-sm font-semibold mt-1">{leadName(preview.duplicate)}</p>
                <div className="mt-1">
                  <BandBadge band={preview.duplicate.scoreBand} score={preview.duplicate.score} />
                </div>
              </div>
            </div>

            <div className={tableShell}>
              <Table>
                <TableHeader className={tableHeaderClass}>
                  <TableRow className="hover:bg-transparent">
                    <Th className="px-4">Field</Th>
                    <Th>Master value</Th>
                    <Th>Duplicate value</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.fields.map((f) => {
                    const pick = choices[f.key] || f.suggested;
                    const cell = (side: "master" | "duplicate", value: any) => (
                      <button
                        type="button"
                        disabled={!f.differs}
                        onClick={() => setChoices((c) => ({ ...c, [f.key]: side }))}
                        className={cn(
                          "w-full text-left rounded-[6px] px-2 py-1.5 text-xs border transition-colors break-all",
                          f.differs && pick === side
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-transparent",
                          f.differs ? "cursor-pointer hover:bg-muted/40" : "cursor-default text-muted-foreground",
                        )}
                      >
                        {display(value)}
                      </button>
                    );
                    return (
                      <TableRow key={f.key} className="border-b border-border/60">
                        <TableCell className="py-2 px-4 text-xs font-semibold whitespace-nowrap">{f.label}</TableCell>
                        <TableCell className="py-2 px-2">{cell("master", f.masterDisplay)}</TableCell>
                        <TableCell className="py-2 px-2">{cell("duplicate", f.duplicateDisplay)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              {differing.length} differing field(s) — click the value to keep. {preview.activitiesToMove} activity / note
              record(s) will be moved to the master lead. The duplicate is kept with status “merged” and a link to the
              master for audit.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={merge.isPending}
                onClick={() =>
                  masterId &&
                  duplicateId &&
                  merge.mutate({ masterLeadId: masterId, duplicateLeadId: duplicateId, choices }, { onSuccess: onClose })
                }
              >
                {merge.isPending ? <Loader2 className="size-4 animate-spin" /> : <GitMerge className="size-4" />}
                Confirm merge
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
