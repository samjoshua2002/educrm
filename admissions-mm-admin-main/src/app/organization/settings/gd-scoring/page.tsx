"use client";

import * as React from "react";
import { CheckCircle2, Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  STANDARD_SCHEME_ID,
  useCreateGdScoringScheme,
  useDeleteGdScoringScheme,
  useGdScoringSchemes,
  useSelectGdScoringScheme,
  useUpdateGdScoringScheme,
  type GdScoringScheme,
  type SaveGdSchemeInput,
} from "@/hooks/use-scoring";

// ============================================================================
// Editor state
// ============================================================================

interface ParamDraft {
  key?: string;
  name: string;
  maxMarks: string;
}

interface ComponentDraft {
  key?: string;
  label: string;
  interviewType: "GD" | "PI" | "none";
  maxMarks: string;
  compositeWeight: string;
  includeInComposite: boolean;
  parameters: ParamDraft[];
}

interface SchemeDraft {
  id: string | null; // null = new scheme
  name: string;
  description: string;
  components: ComponentDraft[];
  select: boolean;
}

function toDraft(scheme: GdScoringScheme | null, copy = false): SchemeDraft {
  if (!scheme) {
    return {
      id: null,
      name: "",
      description: "",
      select: true,
      components: [
        { label: "Group Discussion", interviewType: "GD", maxMarks: "10", compositeWeight: "10", includeInComposite: true, parameters: [] },
        { label: "Personal Interview", interviewType: "PI", maxMarks: "30", compositeWeight: "30", includeInComposite: true, parameters: [] },
      ],
    };
  }
  return {
    id: copy ? null : scheme.id,
    name: copy ? `${scheme.name} (copy)` : scheme.name,
    description: scheme.description ?? "",
    select: copy,
    components: scheme.components.map((c) => ({
      key: copy ? undefined : c.key,
      label: c.label,
      interviewType: c.interviewType ?? "none",
      maxMarks: String(c.maxMarks),
      compositeWeight: String(c.compositeWeight),
      includeInComposite: c.includeInComposite,
      parameters: c.parameters.map((p) => ({ key: copy ? undefined : p.key, name: p.name, maxMarks: String(p.maxMarks) })),
    })),
  };
}

function draftToInput(draft: SchemeDraft): SaveGdSchemeInput | string {
  if (!draft.name.trim()) return "Give the scheme a name.";
  if (draft.components.length === 0) return "Add at least one component.";
  const components: SaveGdSchemeInput["components"] = [];
  for (const c of draft.components) {
    if (!c.label.trim()) return "Every component needs a name.";
    const parameters = c.parameters
      .filter((p) => p.name.trim() || p.maxMarks)
      .map((p) => ({ key: p.key, name: p.name.trim(), maxMarks: Number(p.maxMarks) }));
    for (const p of parameters) {
      if (!p.name) return `A parameter of "${c.label}" has no name.`;
      if (!(p.maxMarks > 0)) return `Parameter "${p.name}" needs max marks above 0.`;
    }
    const maxMarks = parameters.length ? parameters.reduce((s, p) => s + p.maxMarks, 0) : Number(c.maxMarks);
    if (!(maxMarks > 0)) return `"${c.label}" needs max marks above 0.`;
    const weight = Number(c.compositeWeight);
    if (!(weight >= 0)) return `"${c.label}" has an invalid weightage.`;
    components.push({
      key: c.key,
      label: c.label.trim(),
      interviewType: c.interviewType === "none" ? null : c.interviewType,
      maxMarks,
      compositeWeight: weight,
      includeInComposite: c.includeInComposite,
      parameters,
    });
  }
  return { name: draft.name.trim(), description: draft.description.trim() || undefined, components, select: draft.select };
}

// ============================================================================
// Page
// ============================================================================

export default function GdScoringSettingsPage() {
  usePageHeader({
    title: "GD & PI Scoring",
    description: "Choose or design the Group Discussion / Personal Interview scoring scheme used in the composite score.",
  });

  const { data, isLoading } = useGdScoringSchemes();
  const createScheme = useCreateGdScoringScheme();
  const updateScheme = useUpdateGdScoringScheme();
  const selectScheme = useSelectGdScoringScheme();
  const deleteScheme = useDeleteGdScoringScheme();

  const [draft, setDraft] = React.useState<SchemeDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<GdScoringScheme | null>(null);

  const schemes = data?.schemes ?? [];

  const updateComponent = (idx: number, patch: Partial<ComponentDraft>) =>
    setDraft((d) => (d ? { ...d, components: d.components.map((c, i) => (i === idx ? { ...c, ...patch } : c)) } : d));

  const handleSave = () => {
    if (!draft) return;
    const input = draftToInput(draft);
    if (typeof input === "string") {
      toast.error(input);
      return;
    }
    const onSuccess = () => setDraft(null);
    if (draft.id) updateScheme.mutate({ id: draft.id, data: input }, { onSuccess });
    else createScheme.mutate(input, { onSuccess });
  };

  const saving = createScheme.isPending || updateScheme.isPending;

  return (
    <div className="flex flex-col gap-5 p-3.5 sm:p-5 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] sm:text-[20px] font-bold text-[#1E293B] font-sans">Scoring Schemes</h2>
          <p className="text-[12px] sm:text-[13px] text-[#475569] font-sans mt-0.5">
            The selected scheme decides which GD / PI marks are entered, their maximum marks, and how much they add to the
            composite score. The predefined Standard template (GD /10 + PI /30) can always be re-selected.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setDraft(toDraft(null))}
          className="h-9 sm:h-10 px-4 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Scheme
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#1A237E]" /> Loading scoring schemes...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {schemes.map((scheme) => {
            const total = scheme.components
              .filter((c) => c.includeInComposite)
              .reduce((sum, c) => sum + Number(c.compositeWeight || 0), 0);
            return (
              <div
                key={scheme.id}
                className={`flex flex-col rounded-[8px] border bg-[#FFF] shadow-xs overflow-hidden ${
                  scheme.isSelected ? "border-[#1A237E]" : "border-[#D4D4D4]"
                }`}
              >
                <div
                  style={{
                    display: "flex",
                    padding: "16px 20px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #F8FAFC",
                    background: "#FAFAFA",
                    gap: 12,
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-sans text-[15px] sm:text-[16px] font-bold leading-[24px] text-[#1E293B]">
                      {scheme.name}
                      {scheme.isPredefined && (
                        <Badge variant="outline" className="text-[10px]">
                          Predefined template
                        </Badge>
                      )}
                      {scheme.isSelected && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-transparent text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> In use
                        </Badge>
                      )}
                    </div>
                    {scheme.description && <p className="text-xs text-[#64748B] mt-0.5">{scheme.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Duplicate as a new scheme"
                      className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer rounded-full"
                      onClick={() => setDraft(toDraft(scheme, true))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!scheme.isPredefined && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          className="h-8 w-8 text-[#415876] hover:text-[#1A237E] hover:bg-slate-100 cursor-pointer rounded-full"
                          onClick={() => setDraft(toDraft(scheme))}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer rounded-full"
                          onClick={() => setDeleteTarget(scheme)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-[1fr_60px_70px_80px] gap-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B] pb-2 border-b border-[#F1F5F9]">
                    <span>Component</span>
                    <span className="text-center">Source</span>
                    <span className="text-center">Max</span>
                    <span className="text-right">Composite</span>
                  </div>
                  {scheme.components.map((c) => (
                    <div key={c.key} className="grid grid-cols-[1fr_60px_70px_80px] gap-2 items-start text-sm py-1 border-b border-[#F8FAFC]">
                      <div className="min-w-0">
                        <span className="font-medium text-[#1E293B]">{c.label}</span>
                        {c.parameters.length > 0 && (
                          <span className="block text-[11px] text-[#64748B]">
                            {c.parameters.map((p) => `${p.name} (${p.maxMarks})`).join(" · ")}
                          </span>
                        )}
                      </div>
                      <span className="text-center text-xs text-[#475569]">{c.interviewType ?? "Manual"}</span>
                      <span className="text-center font-semibold text-[#1A237E]">{c.maxMarks}</span>
                      <span className="text-right font-semibold text-[#1A237E]">
                        {c.includeInComposite ? c.compositeWeight : "—"}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between items-center text-xs text-[#475569]">
                    <span>Adds up to the composite:</span>
                    <span className="font-bold text-[#1A237E]">{total} pts</span>
                  </div>
                  {!scheme.isSelected && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={selectScheme.isPending}
                      onClick={() => selectScheme.mutate(scheme.id)}
                      className="h-9 rounded-[8px] border-[#D4D4D4] text-[#1A237E] hover:bg-slate-50 font-semibold text-xs cursor-pointer self-start"
                    >
                      {scheme.id === STANDARD_SCHEME_ID ? "Use the Standard template" : "Use this scheme"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[#64748B]">
        How marks are used: a component linked to GD or PI takes the panel&apos;s submitted rubric scores for that interview
        type; otherwise (or until evaluations are submitted) marks are entered on the candidate&apos;s GD &amp; Interview page.
        Contribution to the composite = mark / max marks x composite weight.
      </p>

      {/* Editor */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-[760px] w-[95%] sm:w-full rounded-[12px] p-5 sm:p-7 gap-0 bg-white max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-[#E5E5E5] space-y-0">
            <DialogTitle className="text-[#0A0A0A] font-semibold text-[17px] sm:text-[20px] leading-7 font-sans">
              {draft?.id ? "Edit Scoring Scheme" : "New Scoring Scheme"}
            </DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="flex flex-col gap-4 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#475569]">Scheme name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="h-10 border-[#D4D4D4] rounded-[8px]"
                    placeholder="e.g. 2027 Panel Scoring"
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Switch checked={draft.select} onCheckedChange={(v) => setDraft({ ...draft, select: v })} />
                  <span className="text-sm text-[#475569]">Use this scheme after saving</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[#475569]">Description</Label>
                <Textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="border-[#D4D4D4] rounded-[8px]"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                <h3 className="font-bold text-slate-800 text-sm">Components</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      components: [
                        ...draft.components,
                        { label: "", interviewType: "none", maxMarks: "10", compositeWeight: "10", includeInComposite: true, parameters: [] },
                      ],
                    })
                  }
                  className="h-8 rounded-[8px] text-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add component
                </Button>
              </div>

              {draft.components.map((c, idx) => {
                const paramTotal = c.parameters.reduce((s, p) => s + (Number(p.maxMarks) || 0), 0);
                return (
                  <div key={idx} className="rounded-[8px] border border-[#E2E8F0] p-3 sm:p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-[#64748B]">Component name</Label>
                        <Input
                          value={c.label}
                          onChange={(e) => updateComponent(idx, { label: e.target.value })}
                          className="h-9 border-[#D4D4D4] rounded-[8px]"
                          placeholder="e.g. Group Discussion"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#64748B]">Marks come from</Label>
                        <Select
                          value={c.interviewType}
                          onValueChange={(v) => updateComponent(idx, { interviewType: v as ComponentDraft["interviewType"] })}
                        >
                          <SelectTrigger className="h-9 border-[#D4D4D4] rounded-[8px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GD">GD panel evaluations</SelectItem>
                            <SelectItem value="PI">PI panel evaluations</SelectItem>
                            <SelectItem value="none">Entered manually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs text-[#64748B]">Max marks</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={c.parameters.length > 0}
                          value={c.parameters.length > 0 ? String(paramTotal) : c.maxMarks}
                          onChange={(e) => updateComponent(idx, { maxMarks: e.target.value })}
                          className="h-9 border-[#D4D4D4] rounded-[8px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#64748B]">Composite weight (pts)</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={!c.includeInComposite}
                          value={c.compositeWeight}
                          onChange={(e) => updateComponent(idx, { compositeWeight: e.target.value })}
                          className="h-9 border-[#D4D4D4] rounded-[8px]"
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2">
                        <Switch
                          checked={c.includeInComposite}
                          onCheckedChange={(v) => updateComponent(idx, { includeInComposite: v })}
                        />
                        <span className="text-xs text-[#475569]">In composite</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:bg-red-50 cursor-pointer"
                        onClick={() => setDraft({ ...draft, components: draft.components.filter((_, i) => i !== idx) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[#F1F5F9] pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#64748B]">
                          Parameters (optional; their max marks add up to the component maximum)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-[#1A237E] cursor-pointer"
                          onClick={() => updateComponent(idx, { parameters: [...c.parameters, { name: "", maxMarks: "" }] })}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Parameter
                        </Button>
                      </div>
                      {c.parameters.map((p, pIdx) => (
                        <div key={pIdx} className="grid grid-cols-[1fr_100px_auto] gap-2">
                          <Input
                            value={p.name}
                            placeholder="e.g. Communication"
                            onChange={(e) =>
                              updateComponent(idx, {
                                parameters: c.parameters.map((x, i) => (i === pIdx ? { ...x, name: e.target.value } : x)),
                              })
                            }
                            className="h-8 border-[#D4D4D4] rounded-[8px] text-sm"
                          />
                          <Input
                            type="number"
                            min={0}
                            value={p.maxMarks}
                            placeholder="Max"
                            onChange={(e) =>
                              updateComponent(idx, {
                                parameters: c.parameters.map((x, i) => (i === pIdx ? { ...x, maxMarks: e.target.value } : x)),
                              })
                            }
                            className="h-8 border-[#D4D4D4] rounded-[8px] text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-50 cursor-pointer"
                            onClick={() => updateComponent(idx, { parameters: c.parameters.filter((_, i) => i !== pIdx) })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center py-2.5 px-3.5 bg-blue-50/60 rounded-[8px] border border-blue-100">
                <span className="font-semibold text-xs text-[#1E293B]">Total added to the composite</span>
                <span className="font-bold text-sm text-blue-600">
                  {draft.components
                    .filter((c) => c.includeInComposite)
                    .reduce((s, c) => s + (Number(c.compositeWeight) || 0), 0)}{" "}
                  pts
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(null)}
                  className="h-10 px-5 rounded-[8px] border-[#D4D4D4] text-[#475569] hover:bg-slate-50 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 px-6 rounded-[8px] bg-[#1A237E] hover:bg-[#121858] text-white font-semibold text-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Scheme"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-[460px] w-[95%] rounded-[12px] p-6 bg-white">
          <DialogHeader>
            <DialogTitle>Delete scoring scheme?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#475569]">
            &quot;{deleteTarget?.name}&quot; and the marks entered for it will be removed.
            {deleteTarget?.isSelected ? " The Standard template will be used again." : ""}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="h-9 rounded-[8px] text-xs cursor-pointer">
              Cancel
            </Button>
            <Button
              disabled={deleteScheme.isPending}
              onClick={() =>
                deleteTarget && deleteScheme.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
              }
              className="h-9 rounded-[8px] bg-red-600 hover:bg-red-700 text-white text-xs cursor-pointer"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
