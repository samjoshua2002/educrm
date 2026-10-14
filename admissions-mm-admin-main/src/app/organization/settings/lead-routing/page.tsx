"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useTeam } from "@/hooks/use-team";
import { useCourses } from "@/hooks/use-courses";
import {
  useDeleteRoutingRule,
  useLeadManagementSettings,
  useReorderRoutingRules,
  useRoutingRules,
  useSaveRoutingRule,
  useUpdateLeadManagementSettings,
} from "@/hooks/use-lead-management";
import { ROUTING_RULE_TYPES, type RoutingRule, type RoutingRuleType } from "@/types/lead-management";
import {
  EmptyState,
  FieldLabel,
  PageTitle,
  SectionCard,
  Th,
  pillStyles,
  tableHeaderClass,
  tableShell,
} from "../../lead-manager/_components/lm-ui";

const ROLE_OPTIONS = [
  { value: "counselor", label: "Counselors" },
  { value: "lead_manager", label: "Lead Managers" },
  { value: "org_admin", label: "Org Admins" },
];

const DISTRIBUTIONS = [
  { value: "round_robin", label: "Round-robin" },
  { value: "load_based", label: "Load-based (fewest open leads)" },
];

type Draft = {
  id?: string;
  name: string;
  ruleType: RoutingRuleType;
  field: string;
  operator: string;
  value: string;
  assigneeIds: string[];
  assigneeRole: string;
  distribution: "round_robin" | "load_based";
  isActive: boolean;
};

function defaultsFor(type: RoutingRuleType): Pick<Draft, "field" | "operator" | "value"> {
  switch (type) {
    case "geography":
      return { field: "country", operator: "eq", value: "" };
    case "program":
      return { field: "program", operator: "in", value: "" };
    case "lead_score":
      return { field: "score", operator: "gte", value: "25" };
    default:
      return { field: "", operator: "eq", value: "" };
  }
}

export default function LeadRoutingSettingsPage() {
  usePageHeader({
    title: "Lead Assignment & Routing",
    description: "Ordered rules that decide which counselor receives each new lead.",
  });

  const { data: rules = [], isLoading } = useRoutingRules();
  const { data: teamData } = useTeam(1, 200);
  const team = (teamData?.data || []).filter((u: any) => u.role !== "student");
  const { data: coursesData } = useCourses(1, 200);
  const courses: any[] = (coursesData as any)?.data || [];
  const { data: settings } = useLeadManagementSettings();
  const updateSettings = useUpdateLeadManagementSettings();
  const saveRule = useSaveRoutingRule();
  const deleteRule = useDeleteRoutingRule();
  const reorder = useReorderRoutingRules();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const sorted = React.useMemo(() => [...rules].sort((a, b) => a.priority - b.priority), [rules]);
  const userName = (id: string) => team.find((u: any) => u.id === id)?.name || "Unknown user";

  function openEdit(r?: RoutingRule) {
    if (r) {
      setDraft({
        id: r.id,
        name: r.name,
        ruleType: r.ruleType,
        field: r.field || "",
        operator: r.operator || "eq",
        value: r.value || "",
        assigneeIds: r.assigneeIds || [],
        assigneeRole: r.assigneeRole || "",
        distribution: r.distribution,
        isActive: r.isActive,
      });
    } else {
      setDraft({
        name: "",
        ruleType: "geography",
        ...defaultsFor("geography"),
        assigneeIds: [],
        assigneeRole: "",
        distribution: "round_robin",
        isActive: true,
      });
    }
  }

  function submit() {
    if (!draft || !draft.name.trim()) return;
    const data: any = {
      name: draft.name.trim(),
      ruleType: draft.ruleType,
      assigneeIds: draft.assigneeIds,
      assigneeRole: draft.assigneeIds.length ? null : draft.assigneeRole || null,
      distribution: draft.distribution,
      isActive: draft.isActive,
    };
    if (draft.ruleType !== "load_balancing") {
      data.field = draft.field || undefined;
      data.operator = draft.operator;
      data.value = draft.value.trim() || null;
    }
    saveRule.mutate({ id: draft.id, data }, { onSuccess: () => setDraft(null) });
  }

  function move(idx: number, dir: -1 | 1) {
    const ids = sorted.map((r) => r.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorder.mutate(ids);
  }

  const needsValue = draft && draft.ruleType !== "load_balancing";
  const valueMissing = !!needsValue && !draft!.value.trim();
  const assigneeMissing = !!draft && draft.assigneeIds.length === 0 && !draft.assigneeRole;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      <PageTitle
        title="Routing Rules"
        description="Rules run from top to bottom; the first matching rule assigns the lead and its text is stored as the lead's Assignment Rule. The assignee is notified in-app."
        actions={
          <Button className="h-10 rounded-[8px] text-xs font-semibold" onClick={() => openEdit()}>
            <Plus className="size-4" /> Add Rule
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className={`xl:col-span-8 ${tableShell}`}>
          <Table>
            <TableHeader className={tableHeaderClass}>
              <TableRow className="hover:bg-transparent">
                <Th className="px-5">Order</Th>
                <Th>Rule</Th>
                <Th>Type</Th>
                <Th>Assign to</Th>
                <Th>Active</Th>
                <Th className="text-right">Action</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      title="No routing rules"
                      description="Without rules, new leads are distributed with the default distribution on the right."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((r, idx) => (
                  <TableRow key={r.id} className="border-b border-border/80 hover:bg-muted/15">
                    <TableCell className="py-4 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold w-5">{idx + 1}</span>
                        <Button variant="ghost" size="icon" className="size-7" disabled={idx === 0} onClick={() => move(idx, -1)}>
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={idx === sorted.length - 1}
                          onClick={() => move(idx, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </TableCell>
                    <TableCell className="py-4 px-4 whitespace-nowrap">
                      <span className={pillStyles.purple}>
                        {ROUTING_RULE_TYPES.find((t) => t.value === r.ruleType)?.label || r.ruleType}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-xs">
                      {r.assigneeIds?.length
                        ? r.assigneeIds.map(userName).join(", ")
                        : ROLE_OPTIONS.find((o) => o.value === r.assigneeRole)?.label || "—"}
                      <div className="text-muted-foreground">
                        {DISTRIBUTIONS.find((d) => d.value === r.distribution)?.label}
                      </div>
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
                      <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <SectionCard
          className="xl:col-span-4"
          title="Default distribution"
          description="Used when no rule matches a new lead."
        >
          <div className="flex flex-col gap-2">
            <FieldLabel>Distribute among</FieldLabel>
            <Select
              value={settings?.defaultAssigneeRole || "lead_manager"}
              onValueChange={(v) => updateSettings.mutate({ defaultAssigneeRole: v })}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Method</FieldLabel>
            <Select
              value={settings?.defaultDistribution || "round_robin"}
              onValueChange={(v) => updateSettings.mutate({ defaultDistribution: v as any })}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTRIBUTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground flex flex-col gap-1">
            <p>Examples from the scope:</p>
            <p>• Geography — Country = India → assigned to a specific counselor</p>
            <p>• Program interest — MBA → program specialist</p>
            <p>• Lead score ≥ 25 → senior counselor</p>
            <p>• Load balancing — round-robin or load-based</p>
          </div>
        </SectionCard>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit routing rule" : "Add routing rule"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel>Rule name</FieldLabel>
                <Input
                  className="h-10"
                  value={draft.name}
                  placeholder="e.g. India leads → Priya"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Rule type</FieldLabel>
                <Select
                  value={draft.ruleType}
                  onValueChange={(v) => setDraft({ ...draft, ruleType: v as RoutingRuleType, ...defaultsFor(v as RoutingRuleType) })}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUTING_RULE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ROUTING_RULE_TYPES.find((t) => t.value === draft.ruleType)?.hint}
                </p>
              </div>

              {draft.ruleType === "geography" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <FieldLabel>Field</FieldLabel>
                    <Select value={draft.field} onValueChange={(v) => setDraft({ ...draft, field: v })}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="country">Country</SelectItem>
                        <SelectItem value="state">State</SelectItem>
                        <SelectItem value="city">City</SelectItem>
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
                        <SelectItem value="eq">equals</SelectItem>
                        <SelectItem value="neq">not equal</SelectItem>
                        <SelectItem value="in">is one of</SelectItem>
                        <SelectItem value="not_in">is not one of</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <FieldLabel>Value</FieldLabel>
                    <Input
                      className="h-10"
                      value={draft.value}
                      placeholder="e.g. India"
                      onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {draft.ruleType === "program" && (
                <div className="flex flex-col gap-2">
                  <FieldLabel>Programs</FieldLabel>
                  <div className="max-h-[180px] overflow-y-auto rounded-[8px] border border-input p-3 flex flex-col gap-2">
                    {courses.length === 0 && (
                      <p className="text-xs text-muted-foreground">No programs found — type names below.</p>
                    )}
                    {courses.map((c: any) => {
                      const selected = draft.value.split(",").map((s) => s.trim()).filter(Boolean);
                      const checked = selected.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v ? [...selected, c.id] : selected.filter((x) => x !== c.id);
                              setDraft({ ...draft, value: next.join(","), operator: "in" });
                            }}
                          />
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                  <Input
                    className="h-10"
                    value={draft.value}
                    placeholder="Program ids or names, comma separated (e.g. MBA)"
                    onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                  />
                </div>
              )}

              {draft.ruleType === "lead_score" && (
                <div className="flex flex-col gap-2">
                  <FieldLabel>Lead score at least</FieldLabel>
                  <Input
                    className="h-10"
                    type="number"
                    value={draft.value}
                    onChange={(e) => setDraft({ ...draft, value: e.target.value, operator: "gte" })}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <FieldLabel>Assign to specific users</FieldLabel>
                <div className="max-h-[200px] overflow-y-auto rounded-[8px] border border-input p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {team.length === 0 && <p className="text-xs text-muted-foreground">No team members found.</p>}
                  {team.map((u: any) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={draft.assigneeIds.includes(u.id)}
                        onCheckedChange={(v) =>
                          setDraft({
                            ...draft,
                            assigneeIds: v ? [...draft.assigneeIds, u.id] : draft.assigneeIds.filter((x) => x !== u.id),
                          })
                        }
                      />
                      <span className="truncate">
                        {u.name} <span className="text-xs text-muted-foreground">({String(u.role).replace("_", " ")})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FieldLabel>…or everyone with role</FieldLabel>
                  <Select
                    value={draft.assigneeRole || "none"}
                    disabled={draft.assigneeIds.length > 0}
                    onValueChange={(v) => setDraft({ ...draft, assigneeRole: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {ROLE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Distribution</FieldLabel>
                  <Select
                    value={draft.distribution}
                    onValueChange={(v) => setDraft({ ...draft, distribution: v as any })}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRIBUTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
                <span className="text-sm">Active</span>
              </div>
              {(valueMissing || assigneeMissing) && (
                <p className="text-xs text-rose-600">
                  {valueMissing ? "Enter the value the rule matches. " : ""}
                  {assigneeMissing ? "Choose users or a role to assign to." : ""}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={saveRule.isPending || !draft.name.trim() || valueMissing || assigneeMissing}
                >
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
            <AlertDialogTitle>Delete this routing rule?</AlertDialogTitle>
            <AlertDialogDescription>Leads already assigned keep their counselor.</AlertDialogDescription>
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
