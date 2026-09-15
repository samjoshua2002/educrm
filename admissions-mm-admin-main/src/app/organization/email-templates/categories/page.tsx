/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Tags,
  Layers,
  SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  useEmailTemplateCategories,
  useCreateCategory,
  useDeleteCategory,
  useAddCategoryVariable,
  useRemoveCategoryVariable,
} from "@/hooks/use-email-template-categories";
import { toast } from "sonner";

export default function EmailTemplateCategoriesPage() {
  const { data: categories = [], isLoading } = useEmailTemplateCategories();
  const createCategoryMutation = useCreateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const addVariableMutation = useAddCategoryVariable();
  const removeVariableMutation = useRemoveCategoryVariable();

  // Add Category Dialog
  const [addCategoryOpen, setAddCategoryOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newCategoryDescription, setNewCategoryDescription] = React.useState("");

  // Add Variable Dialog
  const [addVariableForCategory, setAddVariableForCategory] = React.useState<string | null>(null);
  const [newVarKey, setNewVarKey] = React.useState("");
  const [newVarLabel, setNewVarLabel] = React.useState("");
  const [newVarDescription, setNewVarDescription] = React.useState("");
  const [newVarSampleValue, setNewVarSampleValue] = React.useState("");

  // Delete confirmations
  const [deleteCategoryId, setDeleteCategoryId] = React.useState<string | null>(null);
  const [removeVariable, setRemoveVariable] = React.useState<{ categoryId: string; variableId: string; label: string } | null>(null);

  usePageHeader({
    title: "Email Templates",
    description: "Manage the categories and variables available when composing email templates",
    action: {
      label: "Add Category",
      onClick: () => setAddCategoryOpen(true),
    },
  });

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error("Please enter a category name");
      return;
    }
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    try {
      await createCategoryMutation.mutateAsync({
        name: trimmed,
        slug,
        description: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setAddCategoryOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddVariable = async () => {
    if (!addVariableForCategory) return;
    const key = newVarKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!key) {
      toast.error("Please enter a variable key");
      return;
    }
    if (!newVarLabel.trim()) {
      toast.error("Please enter a display label");
      return;
    }
    try {
      await addVariableMutation.mutateAsync({
        categoryId: addVariableForCategory,
        dto: {
          key,
          tag: `{${key}}`,
          label: newVarLabel.trim(),
          description: newVarDescription.trim() || undefined,
          sampleValue: newVarSampleValue.trim() || undefined,
        },
      });
      setNewVarKey("");
      setNewVarLabel("");
      setNewVarDescription("");
      setNewVarSampleValue("");
      setAddVariableForCategory(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1000px] mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/organization/email-templates">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-[8px] border-[#e5e5e5] text-[#1e293b] hover:bg-slate-50 bg-white flex items-center justify-center shrink-0 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-[22px] font-medium tracking-tight text-[#120352] leading-[normal]">
            Template Categories
          </h1>
          <p className="text-[#64748b] text-[13px]">
            Each category defines the fixed set of variables templates in it are allowed to use.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 border border-[#e5e5e5] bg-white rounded-[12px]">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3" />
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 border border-[#e5e5e5] bg-white rounded-[12px] text-center px-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/40">
            <SearchX className="size-6 text-muted-foreground/80" />
          </div>
          <p className="text-sm font-semibold text-foreground">No categories yet</p>
          <p className="text-xs text-muted-foreground">Add your first category to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e5e5] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
          <Accordion type="multiple" className="w-full">
            {categories.map((cat) => (
              <AccordionItem key={cat.id} value={cat.id} className="border-b border-[#f1f5f9] last:border-b-0 px-5">
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="py-4 hover:no-underline flex-1">
                    <div className="flex items-center gap-3 text-left">
                      <div className="size-8 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                        <Tags className="size-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1e293b] text-[14px]">{cat.name}</div>
                        <div className="text-[12px] text-[#64748b]">
                          {cat.variables.length} variable{cat.variables.length === 1 ? "" : "s"}
                          {cat.organizationId ? " • Custom" : " • Global"}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCategoryId(cat.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <AccordionContent className="pb-4">
                  {cat.description && (
                    <p className="text-[12px] text-[#64748b] mb-3">{cat.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cat.variables.map((v) => (
                      <span
                        key={v.id}
                        className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-[6px] bg-[#fafafa] border border-[#e2e8f0] text-[11px]"
                      >
                        <span className="font-mono font-bold text-[#2563EB]">{v.tag}</span>
                        <span className="text-[#475569] font-medium">{v.label}</span>
                        <button
                          type="button"
                          onClick={() => setRemoveVariable({ categoryId: cat.id, variableId: v.id, label: v.label })}
                          className="ml-1 text-[#94a3b8] hover:text-red-500 cursor-pointer"
                          title="Remove variable"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {cat.variables.length === 0 && (
                      <span className="text-[12px] text-[#94a3b8] italic">No variables yet.</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium border-[#e5e5e5] text-[#2563EB] hover:bg-blue-50/50 gap-1.5"
                    onClick={() => setAddVariableForCategory(cat.id)}
                  >
                    <Plus className="size-3.5" />
                    Add Variable
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Categories group templates and define which variables they can use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1e293b]">
                Category Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Scholarship Award"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
                className="h-10 border-[#e5e5e5] text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1e293b]">
                Description (Optional)
              </label>
              <Textarea
                placeholder="What this category is used for"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                rows={2}
                className="border-[#e5e5e5] text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setAddCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              onClick={handleCreateCategory}
              disabled={createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variable Dialog */}
      <Dialog open={!!addVariableForCategory} onOpenChange={(open) => !open && setAddVariableForCategory(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-4 text-[#2563EB]" />
              Add Variable
            </DialogTitle>
            <DialogDescription>
              This variable becomes available immediately in every template under this category — no code change needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1e293b]">
                Variable Key <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. batch_name"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                className="h-10 border-[#e5e5e5] text-[14px] font-mono"
              />
              {newVarKey.trim() && (
                <p className="text-[11px] text-[#64748b]">
                  Will be inserted as{" "}
                  <span className="font-mono font-semibold text-[#2563EB]">
                    {`{${newVarKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "")}}`}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1e293b]">
                Display Label <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Batch Name"
                value={newVarLabel}
                onChange={(e) => setNewVarLabel(e.target.value)}
                className="h-10 border-[#e5e5e5] text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1e293b]">Sample Value (Optional)</label>
              <Input
                placeholder="e.g. Batch 2026-A"
                value={newVarSampleValue}
                onChange={(e) => setNewVarSampleValue(e.target.value)}
                className="h-10 border-[#e5e5e5] text-[14px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1e293b]">Description (Optional)</label>
              <Textarea
                placeholder="What this variable resolves to"
                value={newVarDescription}
                onChange={(e) => setNewVarDescription(e.target.value)}
                rows={2}
                className="border-[#e5e5e5] text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setAddVariableForCategory(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              onClick={handleAddVariable}
              disabled={addVariableMutation.isPending}
            >
              {addVariableMutation.isPending ? "Adding..." : "Add Variable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              Templates already using this category keep working, but it will no longer appear in the category picker for new templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCategoryId) deleteCategoryMutation.mutate(deleteCategoryId);
                setDeleteCategoryId(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Variable Confirmation */}
      <AlertDialog open={!!removeVariable} onOpenChange={() => setRemoveVariable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{removeVariable?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Templates that already use this variable in their text will keep the placeholder text as-is, but it will no longer resolve to a value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeVariable) {
                  removeVariableMutation.mutate({
                    categoryId: removeVariable.categoryId,
                    variableId: removeVariable.variableId,
                  });
                }
                setRemoveVariable(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove Variable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
