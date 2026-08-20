"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, ListChecks, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCourses } from "@/hooks/use-courses";
import { useAcademicSessions } from "@/hooks/use-academic-sessions";
import {
  useRubrics,
  useCreateRubric,
  useUpdateRubric,
  useDeactivateRubric,
  useShortlistingRules,
  useCreateShortlistingRule,
  useUpdateShortlistingRule,
  useDeactivateShortlistingRule,
  type EvaluationRubric,
  type ShortlistingRule,
} from "@/hooks/use-shortlisting";

// ============================================================================
// RUBRICS TAB
// ============================================================================

function RubricsTab() {
  const { data: rubrics, isLoading } = useRubrics();
  const createRubric = useCreateRubric();
  const updateRubric = useUpdateRubric();
  const deactivateRubric = useDeactivateRubric();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EvaluationRubric | null>(null);
  const [form, setForm] = React.useState({
    interviewType: "GD" as "GD" | "PI",
    parameterName: "",
    maxScore: "",
    weightagePercent: "",
    description: "",
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ interviewType: "GD", parameterName: "", maxScore: "", weightagePercent: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: EvaluationRubric) => {
    setEditing(r);
    setForm({
      interviewType: r.interviewType,
      parameterName: r.parameterName,
      maxScore: String(r.maxScore),
      weightagePercent: r.weightagePercent != null ? String(r.weightagePercent) : "",
      description: r.description || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      interviewType: form.interviewType,
      parameterName: form.parameterName,
      maxScore: Number(form.maxScore),
      weightagePercent: form.weightagePercent ? Number(form.weightagePercent) : undefined,
      description: form.description || undefined,
    };
    if (editing) {
      await updateRubric.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createRubric.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const gdRubrics = (rubrics || []).filter((r) => r.interviewType === "GD");
  const piRubrics = (rubrics || []).filter((r) => r.interviewType === "PI");

  const renderTable = (rows: EvaluationRubric[], label: string) => (
    <div className="border border-border/80 rounded-[12px] bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {label} Parameters{" "}
          <span className="text-muted-foreground font-normal">
            (max total: {rows.reduce((s, r) => s + Number(r.maxScore), 0)})
          </span>
        </h3>
      </div>
      <Table>
        <TableHeader className="bg-zinc-100 dark:bg-muted/5">
          <TableRow>
            <TableHead className="px-6">Parameter</TableHead>
            <TableHead className="px-6">Max Score</TableHead>
            <TableHead className="px-6">Weightage</TableHead>
            <TableHead className="px-6 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No {label} rubric parameters configured yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="px-6 font-medium">{r.parameterName}</TableCell>
                <TableCell className="px-6">{r.maxScore}</TableCell>
                <TableCell className="px-6">{r.weightagePercent != null ? `${r.weightagePercent}%` : "—"}</TableCell>
                <TableCell className="px-6 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deactivateRubric.mutate(r.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Add Rubric Parameter
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading rubrics...</p>
      ) : (
        <>
          {renderTable(gdRubrics, "GD")}
          {renderTable(piRubrics, "PI")}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 bg-white rounded-2xl gap-4">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {editing ? "Edit Rubric Parameter" : "Add Rubric Parameter"}
          </h3>

          <div className="flex flex-col gap-2">
            <Label>Interview Type</Label>
            <Select value={form.interviewType} onValueChange={(v) => setForm({ ...form, interviewType: v as "GD" | "PI" })}>
              <SelectTrigger className="w-full h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GD">GD</SelectItem>
                <SelectItem value="PI">PI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Parameter Name</Label>
            <Input
              placeholder="e.g. Communication Skills"
              value={form.parameterName}
              onChange={(e) => setForm({ ...form, parameterName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Max Score</Label>
              <Input
                type="number"
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Weightage %</Label>
              <Input
                type="number"
                value={form.weightagePercent}
                onChange={(e) => setForm({ ...form, weightagePercent: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Input
              placeholder="Optional notes for evaluators"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.parameterName || !form.maxScore}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SHORTLISTING RULES TAB
// ============================================================================

function ShortlistingRulesTab() {
  const { data: rules, isLoading } = useShortlistingRules();
  const createRule = useCreateShortlistingRule();
  const updateRule = useUpdateShortlistingRule();
  const deactivateRule = useDeactivateShortlistingRule();

  // Program options come from the org's configured Courses (Application.program
  // is populated from course.name at creation time — see applications.service.ts),
  // and Academic Year options come from configured Academic Sessions, so the
  // rule always targets values that can actually match real applications.
  const { data: coursesResponse } = useCourses(1, 100);
  const courses = coursesResponse?.data || [];
  const { data: sessionsResponse } = useAcademicSessions(1, 100);
  const academicSessions = sessionsResponse?.data || [];

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ShortlistingRule | null>(null);
  const [form, setForm] = React.useState({
    program: "",
    academicYear: "",
    minGpa: "",
    minTestScore: "",
    minExperienceYears: "",
    academicWeightage: "",
    testWeightage: "",
    experienceWeightage: "",
    cutoffScore: "",
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      program: "",
      academicYear: "",
      minGpa: "",
      minTestScore: "",
      minExperienceYears: "",
      academicWeightage: "",
      testWeightage: "",
      experienceWeightage: "",
      cutoffScore: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (r: ShortlistingRule) => {
    setEditing(r);
    setForm({
      program: r.program,
      academicYear: r.academicYear,
      minGpa: r.minGpa != null ? String(r.minGpa) : "",
      minTestScore: r.minTestScore != null ? String(r.minTestScore) : "",
      minExperienceYears: r.minExperienceYears != null ? String(r.minExperienceYears) : "",
      academicWeightage: String(r.academicWeightage),
      testWeightage: String(r.testWeightage),
      experienceWeightage: String(r.experienceWeightage),
      cutoffScore: String(r.cutoffScore),
    });
    setDialogOpen(true);
  };

  const weightageTotal =
    (Number(form.academicWeightage) || 0) + (Number(form.testWeightage) || 0) + (Number(form.experienceWeightage) || 0);

  const handleSave = async () => {
    const payload = {
      program: form.program,
      academicYear: form.academicYear,
      minGpa: form.minGpa ? Number(form.minGpa) : undefined,
      minTestScore: form.minTestScore ? Number(form.minTestScore) : undefined,
      minExperienceYears: form.minExperienceYears ? Number(form.minExperienceYears) : undefined,
      academicWeightage: Number(form.academicWeightage),
      testWeightage: Number(form.testWeightage),
      experienceWeightage: Number(form.experienceWeightage),
      cutoffScore: Number(form.cutoffScore),
    };
    if (editing) {
      await updateRule.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> Add Shortlisting Rule
        </Button>
      </div>

      <div className="border border-border/80 rounded-[12px] bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5">
            <TableRow>
              <TableHead className="px-6">Program</TableHead>
              <TableHead className="px-6">Year</TableHead>
              <TableHead className="px-6">Weightages (A / T / E)</TableHead>
              <TableHead className="px-6">Cutoff</TableHead>
              <TableHead className="px-6">Status</TableHead>
              <TableHead className="px-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !rules || rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No shortlisting rules configured yet.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-6 font-medium">{r.program}</TableCell>
                  <TableCell className="px-6">{r.academicYear}</TableCell>
                  <TableCell className="px-6">
                    {r.academicWeightage}% / {r.testWeightage}% / {r.experienceWeightage}%
                  </TableCell>
                  <TableCell className="px-6">{r.cutoffScore}</TableCell>
                  <TableCell className="px-6">
                    <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deactivateRule.mutate(r.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] p-6 bg-white rounded-2xl gap-4 overflow-y-auto max-h-[90vh]">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {editing ? "Edit Shortlisting Rule" : "Add Shortlisting Rule"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Program</Label>
              <Select value={form.program} onValueChange={(v) => setForm({ ...form, program: v })}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder={courses.length === 0 ? "No courses configured" : "Select a course"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Academic Year</Label>
              <Select value={form.academicYear} onValueChange={(v) => setForm({ ...form, academicYear: v })}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder={academicSessions.length === 0 ? "No sessions configured" : "Select academic year"} />
                </SelectTrigger>
                <SelectContent>
                  {academicSessions.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.displayName || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Min GPA/UG %</Label>
              <Input type="number" value={form.minGpa} onChange={(e) => setForm({ ...form, minGpa: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Min Test Score</Label>
              <Input
                type="number"
                value={form.minTestScore}
                onChange={(e) => setForm({ ...form, minTestScore: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Min Experience (yrs)</Label>
              <Input
                type="number"
                value={form.minExperienceYears}
                onChange={(e) => setForm({ ...form, minExperienceYears: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center justify-between">
              <span>Weightages — Academic / Test / Experience</span>
              <span className={weightageTotal === 100 ? "text-emerald-600" : "text-destructive"}>
                {weightageTotal}% total
              </span>
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <Input
                type="number"
                placeholder="Academic %"
                value={form.academicWeightage}
                onChange={(e) => setForm({ ...form, academicWeightage: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Test %"
                value={form.testWeightage}
                onChange={(e) => setForm({ ...form, testWeightage: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Experience %"
                value={form.experienceWeightage}
                onChange={(e) => setForm({ ...form, experienceWeightage: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cutoff Score</Label>
            <Input
              type="number"
              value={form.cutoffScore}
              onChange={(e) => setForm({ ...form, cutoffScore: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.program || !form.academicYear || !form.cutoffScore}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function ShortlistingConfigPage() {
  usePageHeader({
    title: "Shortlisting & Rubric Configuration",
    description: "Admin-only: define shortlisting weightages/cutoffs per program and GD/PI rubric parameters.",
  });

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" className="gap-2">
            <SlidersHorizontal className="size-4" /> Shortlisting Rules
          </TabsTrigger>
          <TabsTrigger value="rubrics" className="gap-2">
            <ListChecks className="size-4" /> Evaluation Rubrics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4">
          <ShortlistingRulesTab />
        </TabsContent>
        <TabsContent value="rubrics" className="mt-4">
          <RubricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
