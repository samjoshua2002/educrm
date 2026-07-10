"use client";

import * as React from "react";
import {
  Search,
  Plus,
  MoreVertical,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  useFormTemplates,
  useCreateForm,
  useUpdateForm,
  useDeleteTemplate,
} from "@/hooks/use-forms";
import { FormField, Template } from "@/types/form";
import {
  DEFAULT_FORM_FIELDS,
  ensureDefaultFormFields,
} from "@/lib/default-form-fields";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageHeader } from "@/hooks/use-page-header";

/**
 * DynamicFormPreview renders a miniature, CSS-styled visual mockup
 * of a form's fields to provide a live preview of custom dynamic templates.
 */
function DynamicFormPreview({ fields }: { fields: FormField[] }) {
  const previewFields = (fields || []).slice(0, 3);

  return (
    <div className="w-full h-full p-4 flex flex-col justify-between bg-slate-50/50 select-none">
      <div className="space-y-2.5">
        {/* Mock form header */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
          <div className="h-1.5 w-8 bg-[#2563ea]/20 rounded" />
          <div className="h-1.5 w-16 bg-slate-200 rounded" />
        </div>

        {/* Mock form fields */}
        <div className="space-y-2">
          {previewFields.map((field, idx) => (
            <div key={field.id || idx} className="space-y-1">
              {/* Field Label */}
              <div className="flex items-center">
                <span className="text-[9px] font-medium text-slate-500 truncate max-w-[120px]">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
              </div>

              {/* Field Input Mock */}
              {field.type === "select" ? (
                <div className="h-[22px] w-full border border-slate-200 rounded bg-white px-1.5 flex items-center justify-between">
                  <div className="h-1 w-12 bg-slate-200 rounded" />
                  <div className="w-1.5 h-1.5 border-r border-b border-slate-400 rotate-45 -translate-y-[2px]" />
                </div>
              ) : field.type === "checkbox" || field.type === "radio" ? (
                <div className="flex items-center gap-1.5 py-0.5">
                  <div
                    className={`h-3 w-3 border border-slate-200 bg-white shrink-0 ${
                      field.type === "radio" ? "rounded-full" : "rounded"
                    }`}
                  />
                  <div className="h-1 w-16 bg-slate-200 rounded" />
                </div>
              ) : (
                <div className="h-[22px] w-full border border-slate-200 rounded bg-white px-1.5 flex items-center">
                  <span className="text-[8px] text-slate-300 truncate">
                    {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mock Submit Button */}
      <div className="flex justify-end pt-1">
        <div className="h-[18px] w-12 rounded bg-[#2563ea] flex items-center justify-center">
          <div className="h-1 w-6 bg-white/80 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function OrganizationCreateFormPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deleteTemplateId, setDeleteTemplateId] = React.useState<string | null>(null);

  // Register header title & description via usePageHeader hook
  usePageHeader({
    title: "Form Creation",
    description: "Create and manage admission forms for campaigns",
  });

  // API Hooks
  const { data: templatesResponse, isLoading: isLoadingTemplates } =
    useFormTemplates();
  const { mutateAsync: createForm, isPending: isCreating } = useCreateForm();
  const { mutateAsync: updateForm, isPending: isUpdating } = useUpdateForm();
  const { mutate: deleteTemplate, isPending: isDeletingTemplate } = useDeleteTemplate();

  const templates = templatesResponse?.data || [];

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectTemplate = async (templateId?: string) => {
    try {
      const templates = templatesResponse?.data || [];
      const template = templates.find((t) => t.id === templateId);
      const name = template ? `${template.name}` : "Untitled Form";

      // 1. Create the basic form
      const newForm = await createForm({
        name,
        slug:
          name.toLowerCase().trim().replace(/\s+/g, "-") +
          "-" +
          Math.floor(Math.random() * 1000),
      });

      // 2. Initialize with locked system fields + template fields (no duplicates)
      let fields: FormField[] = [...DEFAULT_FORM_FIELDS];
      if (template && template.fields.length > 0) {
        fields = ensureDefaultFormFields(template.fields);
      }

      await updateForm({
        id: newForm.id,
        data: { fields },
      });

      toast.success("Form initialized successfully");
      router.push(`/organization/forms/${newForm.id}/edit`);
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  const isProcessing = isCreating || isUpdating;

  function handleDeleteTemplate() {
    if (deleteTemplateId) {
      deleteTemplate(deleteTemplateId, {
        onSuccess: () => setDeleteTemplateId(null),
        onError: () => setDeleteTemplateId(null),
      });
    }
  }

  return (
    <>
      {/* Delete Template Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingTemplate}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4 p-4 md:p-6 w-full">
        <div className="space-y-8">
          {/* Intro, Search & Actions Layout */}
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start w-full">
            {/* Left Side: Title, Description, and Search */}
            <div className="space-y-6 w-full max-w-[566px]">
              <div className="space-y-3 pt-4">
                <h2 className="text-[32px] font-medium tracking-tight text-[#120352] leading-[normal]">
                  What are you building today?
                </h2>
                <p className="text-[#171717] text-[12px] leading-relaxed">
                  Select a starting point for your new form. Whether it's a student
                  application, an enrollment survey, or a custom internal workflow, we
                  have the foundation ready.
                </p>
              </div>
              <div className="relative w-full max-w-[555px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search"
                  className="pl-11 h-11 border-[#e5e5e5] rounded-[6px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] bg-white text-[14px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Right Side: Action Buttons */}
            <div className="flex items-center gap-4 shrink-0 lg:pt-[26px]">
              <button
                type="button"
                className="border border-[#a3a3a3] border-solid flex gap-[8px] items-center px-[17px] py-[7px] rounded-[6px] shrink-0 hover:bg-slate-50 transition-colors duration-150 bg-white cursor-pointer"
              >
                <div className="relative shrink-0 size-[24px]">
                  {/* upload_file icon from Figma */}
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-full">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#2563ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="#2563ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 18V12" stroke="#2563ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 15L12 12L15 15" stroke="#2563ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-medium text-[#1e293b] text-[14px] leading-[16px] whitespace-nowrap">
                  Import from JSON
                </span>
              </button>
              <button
                type="button"
                className="border border-[#a3a3a3] border-solid flex gap-[8px] items-center px-[17px] py-[7px] rounded-[6px] shrink-0 hover:bg-slate-50 transition-colors duration-150 bg-white cursor-pointer"
              >
                <div className="relative shrink-0 size-[24px]">
                  {/* assistant_navigation icon from Figma */}
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-full">
                    <circle cx="12" cy="12" r="9" stroke="#2563ea" strokeWidth="2"/>
                    <path d="M14.5 9.5L10 14" stroke="#2563ea" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 9.5H14.5V14" stroke="#2563ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-medium text-[#1e293b] text-[14px] leading-[16px] whitespace-nowrap">
                  See Community Templates
                </span>
              </button>
            </div>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 w-full">
            {/* Blank Option Card */}
            <div
              onClick={() => !isProcessing && handleSelectTemplate()}
              className={`group bg-white border border-[#d4d4d4] rounded-[12px] py-[50px] px-[20px] flex flex-col items-center justify-center text-center gap-5 min-h-[270px] shadow-[0px_2px_2px_rgba(0,0,0,0.05)] transition-all duration-200 hover:border-[#2563ea] ${
                isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-[#2563ea] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                <Plus className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base text-[#1e293b]">Blank Form</h3>
                <div className="text-xs text-[#475569] leading-[17px]">
                  <p>Start from scratch with</p>
                  <p>a clean slate and full</p>
                  <p>creative control.</p>
                </div>
              </div>
            </div>

            {/* Template Cards */}
            {isLoadingTemplates ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  className="h-[270px] border border-[#c6c5d4] rounded-[12px] flex flex-col overflow-hidden shadow-[0px_2px_4px_0px_rgba(0,0,0,0.05)]"
                >
                  <Skeleton className="h-[120px] w-full shrink-0" />
                  <CardContent className="p-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                    <div className="border-t border-[#c6c5d4]/60 pt-2.5 flex items-center justify-between">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => !isProcessing && handleSelectTemplate(template.id)}
                  className={`bg-white border border-[#c6c5d4] rounded-[12px] overflow-hidden flex flex-col h-[270px] shadow-[0px_2px_4px_0px_rgba(0,0,0,0.05)] transition-all duration-200 hover:border-[#2563ea] ${
                    isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {/* Visual Preview Area */}
                  <div className="h-[120px] relative overflow-hidden bg-slate-50 border-b border-slate-100 flex items-center justify-center shrink-0">
                    {template.name === "Student Enrollment" ? (
                      <img
                        src="/images/5be0336622abc63a7154d598c6e79a01db273c5a.png"
                        alt={template.name}
                        className="w-full h-full object-cover object-top select-none"
                      />
                    ) : (
                      <DynamicFormPreview fields={template.fields} />
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-[15px] text-[#1e293b] leading-[20px] line-clamp-1">
                        {template.name}
                      </h3>
                      <p className="text-[12px] text-[#475569] leading-[16px] line-clamp-2">
                        {template.name === "Student Enrollment"
                          ? "Multi-step application form with parent/guardian sections and document upload."
                          : `Ready-to-use fields for ${template.name.toLowerCase()}.`}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#c6c5d4] flex items-center justify-between">
                      <span className="text-[12px] text-[#64748b] leading-[16px]">
                        Institutional Standard
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-600 rounded-full shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="gap-2 text-[13px] text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTemplateId(template.id);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                No templates match your search.
              </div>
            )}
          </div>
        </div>

     
      </div>
    </>
  );
}




