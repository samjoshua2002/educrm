"use client";

import * as React from "react";
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  Search,
  SearchX,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ListChecks,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { cn } from "@/lib/utils";

import { useCourses } from "@/hooks/use-courses";
import { useAcademicSessions } from "@/hooks/use-academic-sessions";
import {
  useRubrics,
  useCreateRubric,
  useUpdateRubric,
  useDeactivateRubric,
  useHardDeleteRubric,
  useShortlistingRules,
  useCreateShortlistingRule,
  useUpdateShortlistingRule,
  useDeactivateShortlistingRule,
  useHardDeleteShortlistingRule,
  EvaluationRubric,
  ShortlistingRule,
} from "@/hooks/use-shortlisting";

const statusStyles: Record<string, string> = {
  Active:
    "bg-[#05966933] text-[#065F46] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
  Inactive:
    "bg-[#D9770633] text-[#BD0F0F] font-medium px-[10px] py-[2px] rounded-[9999px] text-[12px] border-0",
};

export default function ShortlistingConfigPage() {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const [activeTab, setActiveTab] = React.useState("rules");

  // API Queries & Mutations
  const { data: rubrics, isLoading: isLoadingRubrics } = useRubrics();
  const { data: rules, isLoading: isLoadingRules } = useShortlistingRules();

  const { data: coursesResponse } = useCourses(1, 100);
  const courses = coursesResponse?.data || [];
  const { data: sessionsResponse } = useAcademicSessions(1, 100);
  const academicSessions = sessionsResponse?.data || [];

  const createRubric = useCreateRubric();
  const updateRubric = useUpdateRubric();
  const deactivateRubric = useDeactivateRubric();
  const hardDeleteRubric = useHardDeleteRubric();

  const createRule = useCreateShortlistingRule();
  const updateRule = useUpdateShortlistingRule();
  const deactivateRule = useDeactivateShortlistingRule();
  const hardDeleteRule = useHardDeleteShortlistingRule();

  // Search & Filter State
  const [rulesSearch, setRulesSearch] = React.useState("");
  const [rulesStatus, setRulesStatus] = React.useState("all");
  const [rulesPage, setRulesPage] = React.useState(1);

  const [rubricsSearch, setRubricsSearch] = React.useState("");
  const [rubricsTypeFilter, setRubricsTypeFilter] = React.useState("all");
  const [rubricsStatusFilter, setRubricsStatusFilter] = React.useState("all");
  const [rubricsPage, setRubricsPage] = React.useState(1);

  // Modal Dialogs State
  const [rubricDialogOpen, setRubricDialogOpen] = React.useState(false);
  const [editingRubric, setEditingRubric] = React.useState<EvaluationRubric | null>(null);
  const [rubricForm, setRubricForm] = React.useState({
    interviewType: "GD" as "GD" | "PI",
    parameterName: "",
    maxScore: "",
    weightagePercent: "",
    description: "",
  });

  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<ShortlistingRule | null>(null);
  const [ruleForm, setRuleForm] = React.useState({
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

  // Action Dialog Confirmations
  const [deactivateTarget, setDeactivateTarget] = React.useState<{
    type: "rubric" | "rule";
    id: string;
  } | null>(null);

  const [hardDeleteTarget, setHardDeleteTarget] = React.useState<{
    type: "rubric" | "rule";
    id: string;
  } | null>(null);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync active dialogs action onClick to Dynamic Layout Header
  React.useEffect(() => {
    const handleOpenAddRule = () => {
      setEditingRule(null);
      setRuleForm({
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
      setRuleDialogOpen(true);
    };

    const handleOpenAddRubric = () => {
      setEditingRubric(null);
      setRubricForm({
        interviewType: "GD",
        parameterName: "",
        maxScore: "",
        weightagePercent: "",
        description: "",
      });
      setRubricDialogOpen(true);
    };

    let actionLabel = "Add Shortlisting Rule";
    let actionOnClick = handleOpenAddRule;

    if (activeTab === "rubrics") {
      actionLabel = "Add Rubric Parameter";
      actionOnClick = handleOpenAddRubric;
    }

    setHeader({
      title: "Shortlisting & Rubric Configuration",
      description: "Admin-only: define shortlisting weightages/cutoffs per program and GD/PI rubric parameters.",
      action: {
        label: actionLabel,
        onClick: actionOnClick,
      },
    });

    return () => clearHeader();
  }, [activeTab, setHeader, clearHeader]);

  // Client Side Filtering & Pagination - Rules
  const filteredRules = React.useMemo(() => {
    const allRules = rules || [];
    return allRules.filter((r) => {
      if (rulesSearch.trim() !== "") {
        const q = rulesSearch.toLowerCase();
        if (
          !r.program.toLowerCase().includes(q) &&
          !r.academicYear.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (rulesStatus !== "all") {
        if (r.status !== rulesStatus) return false;
      }
      return true;
    });
  }, [rules, rulesSearch, rulesStatus]);

  const itemsPerPage = 5;
  const rulesTotalPages = Math.ceil(filteredRules.length / itemsPerPage) || 1;
  const rulesStartIndex = (rulesPage - 1) * itemsPerPage;
  const rulesEndIndex = rulesStartIndex + itemsPerPage;
  const paginatedRules = filteredRules.slice(rulesStartIndex, rulesEndIndex);

  const rulesVisiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = rulesTotalPages;
    if (rulesTotalPages > 5) {
      if (rulesPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (rulesPage + 2 >= rulesTotalPages) {
        startPage = rulesTotalPages - 4;
        endPage = rulesTotalPages;
      } else {
        startPage = rulesPage - 2;
        endPage = rulesPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [rulesPage, rulesTotalPages]);

  // Client Side Filtering & Pagination - Rubrics
  const filteredRubrics = React.useMemo(() => {
    const allRubrics = rubrics || [];
    return allRubrics.filter((r) => {
      if (rubricsSearch.trim() !== "") {
        const q = rubricsSearch.toLowerCase();
        if (
          !r.parameterName.toLowerCase().includes(q) &&
          !(r.description || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (rubricsTypeFilter !== "all" && r.interviewType !== rubricsTypeFilter) {
        return false;
      }
      if (rubricsStatusFilter !== "all") {
        const wantsActive = rubricsStatusFilter === "active";
        if (r.isActive !== wantsActive) return false;
      }
      return true;
    });
  }, [rubrics, rubricsSearch, rubricsTypeFilter, rubricsStatusFilter]);

  const rubricsTotalPages = Math.ceil(filteredRubrics.length / itemsPerPage) || 1;
  const rubricsStartIndex = (rubricsPage - 1) * itemsPerPage;
  const rubricsEndIndex = rubricsStartIndex + itemsPerPage;
  const paginatedRubrics = filteredRubrics.slice(rubricsStartIndex, rubricsEndIndex);

  const rubricsVisiblePages = React.useMemo(() => {
    let startPage = 1;
    let endPage = rubricsTotalPages;
    if (rubricsTotalPages > 5) {
      if (rubricsPage <= 3) {
        startPage = 1;
        endPage = 5;
      } else if (rubricsPage + 2 >= rubricsTotalPages) {
        startPage = rubricsTotalPages - 4;
        endPage = rubricsTotalPages;
      } else {
        startPage = rubricsPage - 2;
        endPage = rubricsPage + 2;
      }
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [rubricsPage, rubricsTotalPages]);

  // Handlers - Rules
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.program || !ruleForm.academicYear || !ruleForm.cutoffScore) return;

    const payload = {
      program: ruleForm.program,
      academicYear: ruleForm.academicYear,
      minGpa: ruleForm.minGpa ? Number(ruleForm.minGpa) : undefined,
      minTestScore: ruleForm.minTestScore ? Number(ruleForm.minTestScore) : undefined,
      minExperienceYears: ruleForm.minExperienceYears ? Number(ruleForm.minExperienceYears) : undefined,
      academicWeightage: Number(ruleForm.academicWeightage),
      testWeightage: Number(ruleForm.testWeightage),
      experienceWeightage: Number(ruleForm.experienceWeightage),
      cutoffScore: Number(ruleForm.cutoffScore),
    };

    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, data: payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    setRuleDialogOpen(false);
  };

  const triggerEditRule = (r: ShortlistingRule) => {
    setEditingRule(r);
    setRuleForm({
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
    setRuleDialogOpen(true);
  };

  const handleActivateRule = async (id: string) => {
    await updateRule.mutateAsync({ id, data: { status: "active" } });
  };

  // Handlers - Rubrics
  const handleSaveRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricForm.parameterName || !rubricForm.maxScore) return;

    const payload = {
      interviewType: rubricForm.interviewType,
      parameterName: rubricForm.parameterName,
      maxScore: Number(rubricForm.maxScore),
      weightagePercent: rubricForm.weightagePercent ? Number(rubricForm.weightagePercent) : undefined,
      description: rubricForm.description || undefined,
    };

    if (editingRubric) {
      await updateRubric.mutateAsync({ id: editingRubric.id, data: payload });
    } else {
      await createRubric.mutateAsync(payload);
    }
    setRubricDialogOpen(false);
  };

  const triggerEditRubric = (r: EvaluationRubric) => {
    setEditingRubric(r);
    setRubricForm({
      interviewType: r.interviewType,
      parameterName: r.parameterName,
      maxScore: String(r.maxScore),
      weightagePercent: r.weightagePercent != null ? String(r.weightagePercent) : "",
      description: r.description || "",
    });
    setRubricDialogOpen(true);
  };

  const handleActivateRubric = async (id: string) => {
    await updateRubric.mutateAsync({ id, data: { isActive: true } });
  };

  // Execution Handlers for AlertDialog Confirmations
  const executeDeactivate = async () => {
    if (!deactivateTarget) return;

    if (deactivateTarget.type === "rubric") {
      await deactivateRubric.mutateAsync(deactivateTarget.id);
    } else if (deactivateTarget.type === "rule") {
      await deactivateRule.mutateAsync(deactivateTarget.id);
    }
    setDeactivateTarget(null);
  };

  const executeHardDelete = async () => {
    if (!hardDeleteTarget) return;

    if (hardDeleteTarget.type === "rubric") {
      await hardDeleteRubric.mutateAsync(hardDeleteTarget.id);
    } else if (hardDeleteTarget.type === "rule") {
      await hardDeleteRule.mutateAsync(hardDeleteTarget.id);
    }
    setHardDeleteTarget(null);
  };

  const weightageTotal =
    (Number(ruleForm.academicWeightage) || 0) +
    (Number(ruleForm.testWeightage) || 0) +
    (Number(ruleForm.experienceWeightage) || 0);

  return (
    <>
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex flex-col"
        >
          <div className="border border-[#e5e5e5] rounded-[12px] bg-white shadow-sm flex flex-col w-full max-w-full overflow-hidden">
            {/* Unified Top Header for Tabs and Search/Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border-b border-[#e2e8f0] gap-4">
              <TabsList className="bg-transparent border-0 p-0 h-auto flex gap-6 w-full lg:w-auto overflow-x-auto justify-start rounded-none">
                <TabsTrigger
                  value="rules"
                  className={cn(
                    "p-0 h-auto bg-transparent border-0 rounded-none text-sm transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "font-medium text-slate-500 hover:text-slate-800",
                    "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#1e3a8a] pb-2"
                  )}
                >
                  Shortlisting Rules
                </TabsTrigger>
                <TabsTrigger
                  value="rubrics"
                  className={cn(
                    "p-0 h-auto bg-transparent border-0 rounded-none text-sm transition-colors pointer-events-auto cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "font-medium text-slate-500 hover:text-slate-800",
                    "data-[state=active]:text-[#1e3a8a] data-[state=active]:font-bold data-[state=active]:border-b-[3px] data-[state=active]:border-[#1e3a8a] pb-2"
                  )}
                >
                  Evaluation Rubrics
                </TabsTrigger>
              </TabsList>

              {/* Dynamic Search & Filters Area */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {activeTab === "rules" && (
                  <>
                    <div className="relative w-full sm:w-[240px]">
                      <Input
                        placeholder="Search program or year..."
                        className="w-full pr-10 h-10 border-[#e2e8f0] rounded-[8px]"
                        value={rulesSearch}
                        onChange={(e) => {
                          setRulesSearch(e.target.value);
                          setRulesPage(1);
                        }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        <Search className="size-4" />
                      </div>
                    </div>
                    <Select
                      value={rulesStatus}
                      onValueChange={(val) => {
                        setRulesStatus(val);
                        setRulesPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[150px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Status: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status: All</SelectItem>
                        <SelectItem value="active">Status: Active</SelectItem>
                        <SelectItem value="inactive">Status: Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                {activeTab === "rubrics" && (
                  <>
                    <div className="relative w-full sm:w-[240px]">
                      <Input
                        placeholder="Search parameter..."
                        className="w-full pr-10 h-10 border-[#e2e8f0] rounded-[8px]"
                        value={rubricsSearch}
                        onChange={(e) => {
                          setRubricsSearch(e.target.value);
                          setRubricsPage(1);
                        }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        <Search className="size-4" />
                      </div>
                    </div>
                    <Select
                      value={rubricsTypeFilter}
                      onValueChange={(val) => {
                        setRubricsTypeFilter(val);
                        setRubricsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[150px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Type: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Type: All</SelectItem>
                        <SelectItem value="GD">Type: GD</SelectItem>
                        <SelectItem value="PI">Type: PI</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={rubricsStatusFilter}
                      onValueChange={(val) => {
                        setRubricsStatusFilter(val);
                        setRubricsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[150px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Status: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status: All</SelectItem>
                        <SelectItem value="active">Status: Active</SelectItem>
                        <SelectItem value="inactive">Status: Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {/* 1. SHORTLISTING RULES TAB CONTENT */}
            <TabsContent value="rules" className="m-0 border-0 outline-none">
              <div className="w-full">
                <Table>
                  <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
                    <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        PROGRAM
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        ACADEMIC YEAR
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        WEIGHTAGES (A / T / E)
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        CUTOFF SCORE
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        STATUS
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                        ACTION
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mounted || isLoadingRules ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="size-8 animate-spin text-primary mb-4" />
                            <p>Loading rules...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                              <SearchX className="size-6 text-muted-foreground/80" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">No shortlisting rules found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRules.map((rule) => (
                        <TableRow
                          key={rule.id}
                          className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[72px]"
                        >
                          <TableCell className="py-[16px] px-[24px] align-middle font-semibold text-[#1e293b] text-[14px]">
                            {rule.program}
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-[#475569] text-[14px]">
                            {rule.academicYear}
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-[#475569] text-[14px]">
                            {rule.academicWeightage}% / {rule.testWeightage}% / {rule.experienceWeightage}%
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle font-medium text-[#1e293b] text-[14px]">
                            {rule.cutoffScore}
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle">
                            <Badge
                              variant="secondary"
                              className={
                                rule.status === "active"
                                  ? statusStyles.Active
                                  : statusStyles.Inactive
                              }
                            >
                              {rule.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-right">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="data-[state=open]:bg-muted text-muted-foreground flex size-8 rounded-md hover:bg-muted"
                                    size="icon"
                                  >
                                    <EllipsisVertical className="size-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 z-50">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => triggerEditRule(rule)}
                                  >
                                    <Pencil className="size-4" />
                                    Edit Rule
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {rule.status === "active" ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="gap-2"
                                      onClick={() => setDeactivateTarget({ type: "rule", id: rule.id })}
                                    >
                                      <Trash2 className="size-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="gap-2 text-emerald-600 focus:text-emerald-700"
                                      onClick={() => handleActivateRule(rule.id)}
                                    >
                                      <Check className="size-4" />
                                      Activate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2 text-red-700 focus:text-red-700"
                                    onClick={() => setHardDeleteTarget({ type: "rule", id: rule.id })}
                                  >
                                    <Trash2 className="size-4" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Rules Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
                  <p className="text-sm text-muted-foreground font-normal">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {filteredRules.length === 0 ? 0 : rulesStartIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(rulesEndIndex, filteredRules.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">{filteredRules.length}</span>{" "}
                    entries
                  </p>
                  {rulesTotalPages > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                        onClick={() => {
                          if (rulesPage > 1) setRulesPage(rulesPage - 1);
                        }}
                        disabled={rulesPage === 1}
                      >
                        <ChevronLeft className="mr-1 size-4" />
                        Prev
                      </Button>
                      <div className="flex items-center gap-1.5 px-1">
                        {rulesVisiblePages.map((page) => {
                          const isActive = page === rulesPage;
                          return (
                            <Button
                              key={page}
                              variant={isActive ? "default" : "outline"}
                              className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                                isActive
                                  ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                              }`}
                              onClick={() => setRulesPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                        onClick={() => {
                          if (rulesPage < rulesTotalPages) setRulesPage(rulesPage + 1);
                        }}
                        disabled={rulesPage === rulesTotalPages}
                      >
                        Next
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* 2. EVALUATION RUBRICS TAB CONTENT */}
            <TabsContent value="rubrics" className="m-0 border-0 outline-none">
              <div className="w-full">
                <Table>
                  <TableHeader className="bg-[#fafafa] border-b border-[#e2e8f0]">
                    <TableRow className="hover:bg-transparent border-b border-[#e2e8f0]">
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        PARAMETER NAME
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        TYPE
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        MAX SCORE
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        WEIGHTAGE
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto">
                        STATUS
                      </TableHead>
                      <TableHead className="py-[16px] px-[24px] text-[#64748b] text-[12px] font-semibold tracking-[0.6px] uppercase h-auto text-right w-[85px]">
                        ACTION
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!mounted || isLoadingRubrics ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="size-8 animate-spin text-primary mb-4" />
                            <p>Loading rubrics...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRubrics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
                              <SearchX className="size-6 text-muted-foreground/80" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">No rubric parameters found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRubrics.map((rubric) => (
                        <TableRow
                          key={rubric.id}
                          className="border-b border-[#e2e8f0] hover:bg-muted/15 transition-colors h-[72px]"
                        >
                          <TableCell className="py-[16px] px-[24px] align-middle font-semibold text-[#1e293b] text-[14px]">
                            <div className="flex flex-col gap-0.5">
                              <span>{rubric.parameterName}</span>
                              {rubric.description && (
                                <span className="text-xs text-muted-foreground font-normal line-clamp-1">{rubric.description}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-[#475569] text-[14px]">
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 font-medium">
                              {rubric.interviewType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-[#475569] text-[14px]">
                            {rubric.maxScore}
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-[#475569] text-[14px]">
                            {rubric.weightagePercent != null ? `${rubric.weightagePercent}%` : "—"}
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle">
                            <Badge
                              variant="secondary"
                              className={
                                rubric.isActive
                                  ? statusStyles.Active
                                  : statusStyles.Inactive
                              }
                            >
                              {rubric.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-[16px] px-[24px] align-middle text-right">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="data-[state=open]:bg-muted text-muted-foreground flex size-8 rounded-md hover:bg-muted"
                                    size="icon"
                                  >
                                    <EllipsisVertical className="size-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 z-50">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => triggerEditRubric(rubric)}
                                  >
                                    <Pencil className="size-4" />
                                    Edit Rubric
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {rubric.isActive ? (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="gap-2"
                                      onClick={() => setDeactivateTarget({ type: "rubric", id: rubric.id })}
                                    >
                                      <Trash2 className="size-4" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="gap-2 text-emerald-600 focus:text-emerald-700"
                                      onClick={() => handleActivateRubric(rubric.id)}
                                    >
                                      <Check className="size-4" />
                                      Activate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2 text-red-700 focus:text-red-700"
                                    onClick={() => setHardDeleteTarget({ type: "rubric", id: rubric.id })}
                                  >
                                    <Trash2 className="size-4" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Rubrics Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-4 px-6 gap-4">
                  <p className="text-sm text-muted-foreground font-normal">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {filteredRubrics.length === 0 ? 0 : rubricsStartIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(rubricsEndIndex, filteredRubrics.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">{filteredRubrics.length}</span>{" "}
                    entries
                  </p>
                  {rubricsTotalPages > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                        onClick={() => {
                          if (rubricsPage > 1) setRubricsPage(rubricsPage - 1);
                        }}
                        disabled={rubricsPage === 1}
                      >
                        <ChevronLeft className="mr-1 size-4" />
                        Prev
                      </Button>
                      <div className="flex items-center gap-1.5 px-1">
                        {rubricsVisiblePages.map((page) => {
                          const isActive = page === rubricsPage;
                          return (
                            <Button
                              key={page}
                              variant={isActive ? "default" : "outline"}
                              className={`h-9 w-9 p-0 text-sm border shadow-2xs rounded-[6px] transition-colors ${
                                isActive
                                  ? "bg-[#EA2525] border-[#EA2525] text-white font-semibold hover:bg-[#D61F1F] shadow-xs"
                                  : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30 dark:hover:bg-muted/10 hover:text-foreground font-normal"
                              }`}
                              onClick={() => setRubricsPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        className="h-9 px-4 border border-border/80 bg-background text-foreground text-sm font-normal rounded-[6px] hover:bg-muted/30 dark:hover:bg-muted/10 transition-colors shadow-2xs"
                        onClick={() => {
                          if (rubricsPage < rubricsTotalPages) setRubricsPage(rubricsPage + 1);
                        }}
                        disabled={rubricsPage === rubricsTotalPages}
                      >
                        Next
                        <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* A. RUBRICS DIALOG FORM */}
      <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
        <DialogContent className="w-[92%] sm:w-full sm:max-w-[480px] p-6 bg-white rounded-2xl gap-4">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {editingRubric ? "Edit Rubric Parameter" : "Add Rubric Parameter"}
          </h3>

          <form onSubmit={handleSaveRubric} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Interview Type
              </Label>
              <Select
                value={rubricForm.interviewType}
                onValueChange={(v) => setRubricForm({ ...rubricForm, interviewType: v as "GD" | "PI" })}
              >
                <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GD">GD</SelectItem>
                  <SelectItem value="PI">PI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Parameter Name
              </Label>
              <Input
                placeholder="e.g. Communication Skills"
                value={rubricForm.parameterName}
                onChange={(e) => setRubricForm({ ...rubricForm, parameterName: e.target.value })}
                className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Max Score
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={rubricForm.maxScore}
                  onChange={(e) => setRubricForm({ ...rubricForm, maxScore: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Weightage %
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 20"
                  value={rubricForm.weightagePercent}
                  onChange={(e) => setRubricForm({ ...rubricForm, weightagePercent: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Description
              </Label>
              <Input
                placeholder="Optional notes for evaluators"
                value={rubricForm.description}
                onChange={(e) => setRubricForm({ ...rubricForm, description: e.target.value })}
                className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-3 justify-start mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRubricDialogOpen(false)}
                className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createRubric.isPending ||
                  updateRubric.isPending ||
                  !rubricForm.parameterName ||
                  !rubricForm.maxScore
                }
                className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
              >
                {createRubric.isPending || updateRubric.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* B. SHORTLISTING RULES DIALOG FORM */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="w-[92%] sm:w-full sm:max-w-[560px] p-6 bg-white rounded-2xl gap-4 overflow-y-auto max-h-[90vh]">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {editingRule ? "Edit Shortlisting Rule" : "Add Shortlisting Rule"}
          </h3>

          <form onSubmit={handleSaveRule} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Program
                </Label>
                <Select
                  value={ruleForm.program}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, program: v })}
                >
                  <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-lg">
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
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Academic Year
                </Label>
                <Select
                  value={ruleForm.academicYear}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, academicYear: v })}
                >
                  <SelectTrigger className="w-full h-11 border-[#D4D4D4] rounded-lg">
                    <SelectValue placeholder={academicSessions.length === 0 ? "No sessions configured" : "Select year"} />
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
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Min GPA/UG %
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 7.5"
                  value={ruleForm.minGpa}
                  onChange={(e) => setRuleForm({ ...ruleForm, minGpa: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Min Test Score
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 85"
                  value={ruleForm.minTestScore}
                  onChange={(e) => setRuleForm({ ...ruleForm, minTestScore: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  Min Experience (yrs)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 2"
                  value={ruleForm.minExperienceYears}
                  onChange={(e) => setRuleForm({ ...ruleForm, minExperienceYears: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="flex items-center justify-between text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                <span>Weightages — Academic / Test / Experience</span>
                <span className={weightageTotal === 100 ? "text-emerald-600 lowercase font-normal" : "text-destructive lowercase font-normal"}>
                  {weightageTotal}% total
                </span>
              </Label>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  type="number"
                  placeholder="Academic %"
                  value={ruleForm.academicWeightage}
                  onChange={(e) => setRuleForm({ ...ruleForm, academicWeightage: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm"
                  required
                />
                <Input
                  type="number"
                  placeholder="Test %"
                  value={ruleForm.testWeightage}
                  onChange={(e) => setRuleForm({ ...ruleForm, testWeightage: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm"
                  required
                />
                <Input
                  type="number"
                  placeholder="Experience %"
                  value={ruleForm.experienceWeightage}
                  onChange={(e) => setRuleForm({ ...ruleForm, experienceWeightage: e.target.value })}
                  className="border-[#D4D4D4] rounded-lg h-11 text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Cutoff Score
              </Label>
              <Input
                type="number"
                placeholder="e.g. 60"
                value={ruleForm.cutoffScore}
                onChange={(e) => setRuleForm({ ...ruleForm, cutoffScore: e.target.value })}
                className="border-[#D4D4D4] rounded-lg h-11 text-sm placeholder:text-slate-400"
                required
              />
            </div>

            <div className="flex items-center gap-3 justify-start mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRuleDialogOpen(false)}
                className="h-11 px-6 rounded-[10px] text-sm font-semibold border-[#D4D4D4] text-[#1E293B] bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createRule.isPending ||
                  updateRule.isPending ||
                  !ruleForm.program ||
                  !ruleForm.academicYear ||
                  !ruleForm.cutoffScore
                }
                className="h-11 px-8 rounded-[10px] text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
              >
                {createRule.isPending || updateRule.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* C. CONFIRM DEACTIVATE DIALOG */}
      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4 bg-white border border-slate-200">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This action will temporarily deactivate the selected {deactivateTarget?.type}. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-[8px]"
              onClick={executeDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* D. CONFIRM HARD DELETE DIALOG */}
      <AlertDialog
        open={hardDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setHardDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="w-[92%] sm:w-full sm:max-w-[400px] rounded-[12px] p-5 sm:p-6 gap-4 bg-white border border-red-200">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-base font-semibold text-red-700">
              Permanently delete this {hardDeleteTarget?.type}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              This will <strong>permanently remove</strong> the selected {hardDeleteTarget?.type} from the database. This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2 sm:gap-3 flex flex-col-reverse sm:flex-row sm:justify-end">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-4 text-sm font-medium border border-border/80 hover:bg-muted/50 rounded-[8px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-4 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-[8px]"
              onClick={executeHardDelete}
            >
              Yes, Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
