"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  useDeleteScoringRule,
  useLeadManagementSettings,
  useRescoreAll,
  useSaveScoringRule,
  useScoringMeta,
  useScoringRules,
  useScoringSummary,
  useUpdateLeadManagementSettings,
} from "@/hooks/use-lead-management";
import { RULE_OPERATORS, SCORING_CATEGORIES, type ScoringRule } from "@/types/lead-management";
import {
  EmptyState,
  FieldLabel,
  PageTitle,
  SectionCard,
  StatRibbon,
  Th,
  pillStyles,
  tableHeaderClass,
  tableShell,
} from "../../lead-manager/_components/lm-ui";

const SCORE_TYPES = [
  { value: "academic", label: "Academic Score" },
  { value: "engagement", label: "Engagement Score" },
  { value: "profile", label: "Profile (Lead Score only)" },
];

type Draft = {
  id?: string;
  category: string;
  label: string;
  attribute: string;
  operator: string;
  value: string;
  points: string;
  scoreType: string;
  isActive: boolean;
};

const EMPTY: Draft = {
  category: "Academic",
  label: "",
  attribute: "testScore",
  operator: "gte",
  value: "",
  points: "5",
  scoreType: "academic",
  isActive: true,
};

export default function LeadScoringSettingsPage() {
  usePageHeader({
    title: "Lead Scoring",
    description: "Configure the scoring rules and the Hot / Warm / Cold thresholds used to prioritise leads.",
  });

  const { data: rules = [], isLoading } = useScoringRules();
  const { data: meta } = useScoringMeta();
  const { data: summary } = useScoringSummary();
  const { data: settings } = useLeadManagementSettings();
  const updateSettings = useUpdateLeadManagementSettings();
  const saveRule = useSaveScoringRule();
  const deleteRule = useDeleteScoringRule();
  const rescoreAll = useRescoreAll();

  const [hot, setHot] = React.useState("");
  const [warm, setWarm] = React.useState("");
  React.useEffect(() => {
    if (settings) {
      setHot(String(settings.hotThreshold));
      setWarm(String(settings.warmThreshold));
    }
  }, [settings]);

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const attributes = meta?.attributes || [];
  const attrLabel = (k: string) => attributes.find((a) => a.key === k)?.label || k;
  const attrKind = (k: string) => attributes.find((a) => a.key === k)?.kind || "text";
  const opLabel = (o: string) => RULE_OPERATORS.find((x) => x.value === o)?.label.split(" (")[0] || o;

  const condition = (r: ScoringRule) => {
    if (r.operator === "exists" || r.operator === "is_true") return `${attrLabel(r.attribute)} ${opLabel(r.operator)}`;
    return `${attrLabel(r.attribute)} ${opLabel(r.operator)} ${r.value ?? ""}`;
  };

  function openEdit(r?: ScoringRule) {
    setDraft(
      r
        ? {
            id: r.id,
            category: r.category,
            label: r.label,
            attribute: r.attribute,
            operator: r.operator,
            value: r.value ?? "",
            points: String(r.points),
            scoreType: r.scoreType,
            isActive: r.isActive,
          }
        : { ...EMPTY },
    );
  }

  function submitDraft() {
    if (!draft) return;
    if (!draft.label.trim()) return;
    const points = Number(draft.points);
    if (!Number.isFinite(points)) return;
    const needsValue = !["exists", "is_true"].includes(draft.operator);
    saveRule.mutate(
      {
        id: draft.id,
        data: {
          category: draft.category,
          label: draft.label.trim(),
          attribute: draft.attribute,
          operator: draft.operator as any,
          value: needsValue ? draft.value.trim() || null : null,
          points: Math.trunc(points),
          scoreType: draft.scoreType as any,
          isActive: draft.isActive,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  }

  function saveThresholds() {
    const h = Number(hot);
    const w = Number(warm);
    if (!Number.isFinite(h) || !Number.isFinite(w) || w >= h) {
      return;
    }
    updateSettings.mutate({ hotThreshold: Math.trunc(h), warmThreshold: Math.trunc(w) });
  }

  const thresholdsInvalid = hot !== "" && warm !== "" && Number(warm) >= Number(hot);
  const grouped = React.useMemo(() => {
    const order = [...SCORING_CATEGORIES] as string[];
    return [...rules].sort(
      (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.sortOrder - b.sortOrder,
    );
  }, [rules]);

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      <PageTitle
        title="Scoring Rules"
        description="Each matching rule adds (or removes) points. Lead Score = sum of all matching rules; Academic and Engagement Scores are the sums of their rules."
        actions={
          <>
            <Button
              variant="outline"
              className="h-10 rounded-[8px] text-xs font-semibold"
              onClick={() => rescoreAll.mutate()}
              disabled={rescoreAll.isPending}
            >
              {rescoreAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Rescore all leads
            </Button>
            <Button className="h-10 rounded-[8px] text-xs font-semibold" onClick={() => openEdit()}>
              <Plus className="size-4" /> Add Rule
            </Button>
          </>
        }
      />

      <StatRibbon
        items={[
          { label: "Hot leads", value: summary?.hot ?? 0, accent: "text-rose-600" },
          { label: "Warm leads", value: summary?.warm ?? 0, accent: "text-amber-600" },
          { label: "Cold leads", value: summary?.cold ?? 0, accent: "text-cyan-700" },
          { label: "Unscored", value: summary?.unscored ?? 0 },
          { label: "Average score", value: summary?.averageScore ?? 0 },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <SectionCard
          className="xl:col-span-4"
          title="Lead Status thresholds"
          description="Lead Status (Hot / Warm / Cold) is derived from the Lead Score."
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="hot">Hot — score at least</FieldLabel>
            <Input id="hot" type="number" value={hot} onChange={(e) => setHot(e.target.value)} className="h-10" />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="warm">Warm — score at least</FieldLabel>
            <Input id="warm" type="number" value={warm} onChange={(e) => setWarm(e.target.value)} className="h-10" />
            <p className="text-xs text-muted-foreground">Leads below the Warm threshold are Cold.</p>
            {thresholdsInvalid && <p className="text-xs text-rose-600">The Warm threshold must be lower than Hot.</p>}
          </div>
          <Button
            className="h-10 rounded-[8px] text-xs font-semibold"
            onClick={saveThresholds}
            disabled={updateSettings.isPending || thresholdsInvalid || !hot || !warm}
          >
            {updateSettings.isPending ? "Saving..." : "Save thresholds"}
          </Button>
          <p className="text-xs text-muted-foreground">
            New thresholds apply to newly scored leads. Use “Rescore all leads” to apply them to existing leads.
          </p>
        </SectionCard>

        <div className={`xl:col-span-8 ${tableShell}`}>
          <Table>
            <TableHeader className={tableHeaderClass}>
              <TableRow className="hover:bg-transparent">
                <Th className="px-5">Category</Th>
                <Th>Rule</Th>
                <Th>Condition</Th>
                <Th className="text-right">Points</Th>
                <Th>Counts towards</Th>
                <Th>Active</Th>
                <Th className="text-right">Action</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="No scoring rules" description="Add a rule to start scoring leads." />
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map((r) => (
                  <TableRow key={r.id} className="border-b border-border/80 hover:bg-muted/15">
                    <TableCell className="py-4 px-5 text-sm font-medium whitespace-nowrap">{r.category}</TableCell>
                    <TableCell className="py-4 px-4 text-sm">{r.label}</TableCell>
                    <TableCell className="py-4 px-4 text-xs text-muted-foreground">{condition(r)}</TableCell>
                    <TableCell className="py-4 px-4 text-right">
                      <span className={r.points >= 0 ? pillStyles.green : pillStyles.red}>
                        {r.points > 0 ? `+${r.points}` : r.points}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-xs whitespace-nowrap">
                      {SCORE_TYPES.find((s) => s.value === r.scoreType)?.label || r.scoreType}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <Switch
                        checked={r.isActive}
                        onCheckedChange={(v) => saveRule.mutate({ id: r.id, data: { isActive: v } })}
                      />
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-rose-600"
                        onClick={() => setDeleteId(r.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit scoring rule" : "Add scoring rule"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Category</FieldLabel>
                  <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(meta?.categories || [...SCORING_CATEGORIES]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Counts towards</FieldLabel>
                  <Select value={draft.scoreType} onValueChange={(v) => setDraft({ ...draft, scoreType: v })}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCORE_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Rule name</FieldLabel>
                <Input
                  value={draft.label}
                  placeholder="e.g. GMAT/GRE Score ≥ 650"
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2 sm:col-span-3">
                  <FieldLabel>Attribute</FieldLabel>
                  <Select
                    value={draft.attribute}
                    onValueChange={(v) => {
                      const kind = attrKind(v);
                      setDraft({
                        ...draft,
                        attribute: v,
                        operator: kind === "boolean" ? "is_true" : kind === "number" ? "gte" : kind === "list" ? "in" : "eq",
                      });
                    }}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {attributes.map((a) => (
                        <SelectItem key={a.key} value={a.key}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Condition</FieldLabel>
                  <Select value={draft.operator} onValueChange={(v) => setDraft({ ...draft, operator: v })}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_OPERATORS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Value</FieldLabel>
                  <Input
                    value={draft.value}
                    disabled={["exists", "is_true"].includes(draft.operator)}
                    placeholder={["in", "not_in"].includes(draft.operator) ? "Comma separated" : "e.g. 650"}
                    onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Points</FieldLabel>
                  <Input
                    type="number"
                    value={draft.points}
                    onChange={(e) => setDraft({ ...draft, points: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
                <span className="text-sm">Active</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button onClick={submitDraft} disabled={saveRule.isPending || !draft.label.trim() || draft.points === ""}>
                  {saveRule.isPending ? "Saving..." : "Save rule"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scoring rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing scores are not changed until leads are rescored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteId && deleteRule.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
