"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, GitMerge, Loader2, X } from "lucide-react";
import { MergeDialog } from "../_components/merge-dialog";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  useDismissDuplicate,
  useDuplicateLeads,
} from "@/hooks/use-lead-management";
import type { SlimLead } from "@/types/lead-management";
import {
  EmptyState,
  PageTitle,
  StatRibbon,
  Th,
  formatDateTime,
  leadName,
  pillStyles,
  tableHeaderClass,
  tableShell,
} from "../_components/lm-ui";

function confidenceStyle(c?: number | null) {
  if (c === null || c === undefined) return pillStyles.gray;
  if (c >= 90) return pillStyles.red;
  if (c >= 75) return pillStyles.amber;
  return pillStyles.blue;
}

function LeadCell({ lead }: { lead: SlimLead | null }) {
  if (!lead) return <span className="text-xs text-muted-foreground">Master lead not found</span>;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <Link
        href={`/organization/lead-manager/edit?id=${lead.id}`}
        className="text-sm font-semibold hover:underline truncate"
      >
        {leadName(lead)}
      </Link>
      <span className="text-xs text-muted-foreground truncate">
        {[lead.email, lead.phone, lead.city].filter(Boolean).join(" · ")}
      </span>
      <span className="text-xs text-muted-foreground">
        {lead.channelSource || "—"} · {formatDateTime(lead.createdAt)}
      </span>
    </div>
  );
}

export default function DuplicateLeadsPage() {
  usePageHeader({
    title: "Duplicate Leads",
    description: "Review potential duplicates and merge them into the master lead.",
  });

  const { data: pairs = [], isLoading } = useDuplicateLeads();
  const dismiss = useDismissDuplicate();
  const [review, setReview] = React.useState<{ masterId: string; duplicateId: string } | null>(null);

  const high = pairs.filter((p) => (p.confidence ?? 0) >= 90).length;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      <div className="flex items-center gap-2">
        <Link href="/organization/lead-manager">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <PageTitle
          title="Potential duplicates"
          description="Matched on Email, Phone, Full Name + Date of Birth, or (for imports) fuzzy Name + City. Merging moves the duplicate's history (activities, notes) to the master lead."
        />
      </div>

      <StatRibbon
        items={[
          { label: "Pending review", value: pairs.length },
          { label: "High confidence (≥ 90%)", value: high, accent: "text-rose-600" },
        ]}
      />

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th className="px-5">Duplicate</Th>
              <Th>Master lead</Th>
              <Th>Confidence</Th>
              <Th>Matched on</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : pairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="No potential duplicates" description="New duplicates are flagged automatically." />
                </TableCell>
              </TableRow>
            ) : (
              pairs.map((p) => (
                <TableRow key={p.duplicate.id} className="border-b border-border/80 hover:bg-muted/15">
                  <TableCell className="py-4 px-5 max-w-[280px]">
                    <LeadCell lead={p.duplicate} />
                  </TableCell>
                  <TableCell className="py-4 px-4 max-w-[280px]">
                    <LeadCell lead={p.master} />
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <span className={confidenceStyle(p.confidence)}>{p.confidence ?? "—"}%</span>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs text-muted-foreground max-w-[220px]">{p.reason || "—"}</TableCell>
                  <TableCell className="py-4 px-4 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      disabled={!p.master}
                      onClick={() => p.master && setReview({ masterId: p.master.id, duplicateId: p.duplicate.id })}
                    >
                      <GitMerge className="size-4" /> Review & merge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs ml-2"
                      disabled={dismiss.isPending}
                      onClick={() => dismiss.mutate(p.duplicate.id)}
                    >
                      <X className="size-4" /> Not a duplicate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MergeDialog review={review} onClose={() => setReview(null)} />
    </div>
  );
}
