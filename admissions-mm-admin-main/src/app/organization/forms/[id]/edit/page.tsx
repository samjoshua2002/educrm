"use client";

import * as React from "react";
import {
  ChevronLeft,
  Layout,
  Settings,
  Eye,
  Save,
  Globe,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Type,
  Mail,
  Phone,
  Hash,
  Calendar as CalendarIcon,
  ChevronDown,
  CheckSquare,
  Radio,
  Upload,
  CreditCard,
  X,
  Pencil,
  GripHorizontal,
  MoreVertical,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useForm, useUpdateForm } from "@/hooks/use-forms";
import { FormField, Form, UpdateFormInput } from "@/types/form";
import {
  ensureDefaultFormFields,
  isSystemField,
} from "@/lib/default-form-fields";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

type FieldType = FormField["type"];

const FIELD_LIBRARY = [
  { type: "text", label: "Short Text", icon: Type },
  { type: "email", label: "Email Address", icon: Mail },
  { type: "phone", label: "Phone Number", icon: Phone },
  { type: "number", label: "Number Input", icon: Hash },
  { type: "date", label: "Date Picker", icon: CalendarIcon },
  { type: "select", label: "Dropdown Menu", icon: ChevronDown },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
  { type: "radio", label: "Radio Buttons", icon: Radio },
  { type: "file", label: "File Upload", icon: Upload },
  { type: "payment", label: "Collexo Payment", icon: CreditCard },
];

function CustomSwitch({
  checked,
  onCheckedChange,
  disabled,
  onClick,
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (onCheckedChange) onCheckedChange(!checked);
      }}
      className="relative inline-flex h-[10px] w-[34px] shrink-0 cursor-pointer items-center rounded-[5px] bg-[#D4D4D4] transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`pointer-events-none block h-[20px] w-[20px] rounded-full shadow-[0_2.25px_5.25px_rgba(0,0,0,0.12)] transition-all ${
          checked 
            ? "bg-[#2563EA] translate-x-[14px]" 
            : "bg-[#A3A3A3] translate-x-0"
        }`}
      />
    </button>
  );
}

function SortableField({
  field,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
  onUpdateField,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (field: FormField) => void;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled: field.systemField });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`relative p-5 rounded-[4px] border border-l-[3px] border-l-[#120352] transition-all cursor-pointer group shadow-sm flex flex-col ${
        isDragging ? "opacity-30 border-primary" : ""
      } ${
        isSelected
          ? "border-slate-400 bg-[#FAFAFA] shadow-md"
          : "bg-white hover:bg-[#FAFAFA] hover:shadow-md border-slate-200"
      }`}
    >
      {/* Centered Drag Handle */}
      {!field.systemField && (
        <div
          {...attributes}
          {...listeners}
          className="flex justify-center w-full opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing pb-2 -mt-2"
        >
          <GripHorizontal className="h-4 w-4" />
        </div>
      )}

      {/* Label and Blue line divider */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between">
          <input
            value={field.label}
            onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "16px",
              fontWeight: 400,
              lineHeight: "21px",
              color: "#000",
              background: "transparent",
              border: "none",
            }}
            className="w-full focus:outline-none focus:ring-0 p-0 font-normal border-none"
            onClick={(e) => e.stopPropagation()}
            placeholder="Field Label"
          />
          {field.required && <span className="text-destructive font-bold text-sm">*</span>}
        </div>
        
        {/* Blue Divider Line */}
        <div className="h-[1px] bg-[#2563EA] w-full rounded" />

        {/* Input Field Preview */}
        <div className="pt-2">
          {field.type === "text" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              {field.placeholder || "Short-answer text"}
            </div>
          )}
          {field.type === "email" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              {field.placeholder || "Email address"}
            </div>
          )}
          {field.type === "phone" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              {field.placeholder || "Phone number"}
            </div>
          )}
          {field.type === "number" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              {field.placeholder || "Number input"}
            </div>
          )}
          {field.type === "date" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              {field.placeholder || "Date picker"}
            </div>
          )}
          {field.type === "file" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              {field.placeholder || "File upload"}
            </div>
          )}
          {field.type === "payment" && (
            <div className="text-slate-400 text-sm py-2 border-b border-dashed border-slate-200 w-full">
              Collexo payment integration
            </div>
          )}
          {field.type === "select" && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="h-10 w-full rounded-lg border bg-white px-3 flex items-center justify-between text-muted-foreground text-sm shadow-sm mb-2">
                <span>{field.placeholder || "Select option..."}</span>
                <ChevronDown className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                {(field.options || []).map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2 pl-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <input
                      value={opt.label}
                      disabled={field.systemField && field.id === "location"}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[idx] = { ...opt, label: e.target.value };
                        onUpdateField(field.id, { options: newOptions });
                      }}
                      className="text-sm text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                    />
                    {!(field.systemField && field.id === "location") && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-500 text-xs ml-auto"
                        onClick={() => {
                          const newOptions = (field.options || []).filter((_, i) => i !== idx);
                          onUpdateField(field.id, { options: newOptions });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!(field.systemField && field.id === "location") && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs pl-3 mt-1.5"
                  onClick={() => {
                    const currentOptions = field.options || [];
                    onUpdateField(field.id, {
                      options: [
                        ...currentOptions,
                        {
                          id: Math.random().toString(36).substr(2, 6),
                          label: `Option ${currentOptions.length + 1}`,
                        },
                      ],
                    });
                  }}
                >
                  <span className="text-xs">+ Add Option</span>
                </button>
              )}
            </div>
          )}
          {field.type === "radio" && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              {(field.options || []).map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border border-slate-300 flex-shrink-0" />
                  <input
                    value={opt.label}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[idx] = { ...opt, label: e.target.value };
                      onUpdateField(field.id, { options: newOptions });
                    }}
                    className="text-sm text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  />
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-500 text-xs ml-auto"
                    onClick={() => {
                      const newOptions = (field.options || []).filter((_, i) => i !== idx);
                      onUpdateField(field.id, { options: newOptions });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm"
                onClick={() => {
                  const currentOptions = field.options || [];
                  onUpdateField(field.id, {
                    options: [
                      ...currentOptions,
                      {
                        id: Math.random().toString(36).substr(2, 6),
                        label: `Option ${currentOptions.length + 1}`,
                      },
                    ],
                  });
                }}
              >
                <div className="h-4 w-4 rounded-full border border-dashed border-slate-300 flex-shrink-0" />
                <span className="text-xs font-medium">Add Option</span>
              </button>
            </div>
          )}
          {field.type === "checkbox" && (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              {(field.options || []).map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border border-slate-300 flex-shrink-0" />
                  <input
                    value={opt.label}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[idx] = { ...opt, label: e.target.value };
                      onUpdateField(field.id, { options: newOptions });
                    }}
                    className="text-sm text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  />
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-500 text-xs ml-auto"
                    onClick={() => {
                      const newOptions = (field.options || []).filter((_, i) => i !== idx);
                      onUpdateField(field.id, { options: newOptions });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm"
                onClick={() => {
                  const currentOptions = field.options || [];
                  onUpdateField(field.id, {
                    options: [
                      ...currentOptions,
                      {
                        id: Math.random().toString(36).substr(2, 6),
                        label: `Option ${currentOptions.length + 1}`,
                      },
                    ],
                  });
                }}
              >
                <div className="h-4 w-4 rounded border border-dashed border-slate-300 flex-shrink-0" />
                <span className="text-xs font-medium">Add Option</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Row */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-3 text-slate-400">
        {!field.systemField && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(field);
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(field.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-slate-200" />
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Required</span>
          <CustomSwitch
            checked={field.required || false}
            disabled={field.systemField}
            onCheckedChange={(val) => {
              onUpdateField(field.id, { required: val });
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}

export default function OrganizationFormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;

  // API Hooks
  const { data: form, isLoading, isError } = useForm(id);
  const { mutate: updateForm, isPending: isSaving } = useUpdateForm();

  // Local state for batch editing
  const [activeTab, setActiveTab] = React.useState<"build" | "settings">("build");
  const [localFields, setLocalFields] = React.useState<FormField[]>([]);
  const [localName, setLocalName] = React.useState("");
  const [localStatus, setLocalStatus] = React.useState<Form["status"]>("draft");
  const [localSlug, setLocalSlug] = React.useState("");
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(
    null,
  );
  const [emailNotifications, setEmailNotifications] = React.useState(true);

  // Helper to slugify text
  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");

  const handleNameChange = (newName: string) => {
    setLocalName(newName);
    setLocalSlug(slugify(newName));
  };

  // Sync with API data
  React.useEffect(() => {
    if (form) {
      // Normalize fields to ensure options are objects {id, label}
      let normalizedFields = (form.fields || []).map((field) => {
        if (field.options && Array.isArray(field.options)) {
          return {
            ...field,
            options: field.options.map((opt: any) =>
              typeof opt === "string"
                ? { id: opt.toLowerCase().replace(/\s+/g, "-"), label: opt }
                : opt,
            ),
          };
        }
        return field;
      });

      setLocalFields(ensureDefaultFormFields(normalizedFields));
      setLocalName(form.name);
      setLocalSlug(form.slug);
      setLocalStatus(form.status);
    }
  }, [form]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addField = (type: string, label: string) => {
    const newField: FormField = {
      id: Math.random().toString(36).substr(2, 9),
      type: type as any,
      label,
      placeholder: `Enter ${label.toLowerCase()}...`,
      required: false,
      options: ["select", "radio", "checkbox"].includes(type)
        ? [
            { id: Math.random().toString(36).substr(2, 6), label: "Option 1" },
            { id: Math.random().toString(36).substr(2, 6), label: "Option 2" },
          ]
        : undefined,
    };
    setLocalFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const removeField = (fieldId: string) => {
    const target = localFields.find((f) => f.id === fieldId);
    if (
      target?.systemField ||
      isSystemField(target ?? { id: fieldId, label: "" })
    ) {
      toast.error("System fields cannot be removed");
      return;
    }
    setLocalFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  const duplicateField = (field: FormField) => {
    if (field.systemField || isSystemField(field)) {
      toast.error("System fields cannot be duplicated");
      return;
    }
    const newField: FormField = {
      ...field,
      id: Math.random().toString(36).substr(2, 9),
      label: `${field.label} (Copy)`,
    };
    const index = localFields.findIndex((f) => f.id === field.id);
    const newFields = [...localFields];
    newFields.splice(index + 1, 0, newField);
    setLocalFields(newFields);
    setSelectedFieldId(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setLocalFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          if (f.systemField) {
            const { id, type, ...restUpdates } = updates;
            return { ...f, ...restUpdates };
          }
          return { ...f, ...updates };
        }
        return f;
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeField = localFields.find((i) => i.id === active.id);
      const overField = localFields.find((i) => i.id === over.id);
      if (activeField?.systemField || overField?.systemField) {
        return;
      }
      const oldIndex = localFields.findIndex((i) => i.id === active.id);
      const newIndex = localFields.findIndex((i) => i.id === over.id);
      setLocalFields((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const handleSave = React.useCallback((publish: boolean = false) => {
    const status = publish ? "active" : localStatus;
    updateForm({
      id,
      data: {
        name: localName,
        slug: localSlug,
        fields: ensureDefaultFormFields(localFields),
        status: status as any,
      },
    });
  }, [id, localName, localSlug, localStatus, localFields, updateForm]);

  React.useEffect(() => {
    setHeader({
      customLeftNode: (
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-slate-800 leading-tight">Form Creation</h1>
          <span className="text-[10px] text-slate-500 leading-none">
            Create and manage admission forms for campaigns
          </span>
        </div>
      ),
      customRightNode: (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-9 rounded-full text-slate-600 hover:bg-slate-100">
            <Bell className="size-5" />
          </Button>
          
          <div className="flex items-center -space-x-px">
            <Button
              size="sm"
              className="h-9 font-semibold bg-[#EA2525] hover:bg-[#d32020] text-white shadow-sm rounded-l-[8px] rounded-r-none border-r border-[#d32020]"
              disabled={isSaving}
              onClick={() => handleSave(true)}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Form
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 px-2 bg-[#EA2525] hover:bg-[#d32020] text-white shadow-sm rounded-r-[8px] rounded-l-none"
                  disabled={isSaving}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[120px] bg-white border border-slate-200">
                <DropdownMenuItem
                  className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center hover:bg-slate-50 focus:bg-slate-50"
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                >
                  <Save className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Save Draft
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center hover:bg-slate-50 focus:bg-slate-50"
                  disabled={isSaving}
                  onClick={() => {
                    if (form?.slug) {
                      window.open(`/f/${form.slug}`, "_blank");
                    }
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Preview
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )
    });

    return () => {
      clearHeader();
    };
  }, [localName, localSlug, isSaving, form?.slug, handleSave, setHeader, clearHeader]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="h-14 border-b flex items-center px-4 gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 flex">
          <Skeleton className="w-72 border-r h-full" />
          <div className="flex-1 p-8 flex justify-center">
            <Skeleton className="w-full max-w-2xl h-[600px] rounded-xl" />
          </div>
          <Skeleton className="w-80 border-l h-full" />
        </div>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive">
          <Trash2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">
          Form not found or failed to load
        </h2>
        <Link href="/organization/forms">
          <Button variant="outline">Back to Forms</Button>
        </Link>
      </div>
    );
  }

  const selectedField = localFields.find((f) => f.id === selectedFieldId);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-muted/20">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Components */}
        <aside className="w-72 border-r bg-background flex flex-col shrink-0">
          {/* Form Title & Settings */}
          <div className="p-4 flex items-center gap-2">
            <Link href="/organization/forms">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 !text-[#120352] hover:bg-slate-100 -ml-4 shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <input
              className="bg-transparent border-none focus-visible:ring-0 p-0 w-full h-auto focus:outline-none text-[#0A0A0A] placeholder:text-slate-400"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "24px",
                fontWeight: 600,
                lineHeight: "normal",
              }}
              value={localName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Untitled Form"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="p-4 space-y-6">
                  {/* Basic Elements Section */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Basic Elements
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          type: "text",
                          label: "Short Text",
                          width: "16px",
                          height: "6px",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="6" viewBox="0 0 16 6" fill="none">
                              <path d="M0 6V4H10V6H0ZM0 2V0H16V2H0Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "radio",
                          label: "Radio Button",
                          width: "20px",
                          height: "20px",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M10 15C11.3833 15 12.5625 14.5125 13.5375 13.5375C14.5125 12.5625 15 11.3833 15 10C15 8.61667 14.5125 7.4375 13.5375 6.4625C12.5625 5.4875 11.3833 5 10 5C8.61667 5 7.4375 5.4875 6.4625 6.4625C5.4875 7.4375 5 8.61667 5 10C5 11.3833 5.4875 12.5625 6.4625 13.5375C7.4375 14.5125 8.61667 15 10 15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "checkbox",
                          label: "Checkboxes",
                          width: "18px",
                          height: "18px",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M7.6 13.2L14.65 6.15L13.25 4.75L7.6 10.4L4.75 7.55L3.35 8.95L7.6 13.2ZM2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H16C16.55 0 17.0208 0.195833 17.4125 0.5875C17.8042 0.979167 18 1.45 18 2V16C18 16.55 17.8042 17.0208 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM2 16H16V2H2V16ZM2 2V16V2Z" fill="#415876"/>
                            </svg>
                          )
                        },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          className="flex flex-col justify-center items-center self-stretch w-full hover:shadow-sm hover:border-slate-400 transition-all animate-none"
                          style={{
                            padding: "12px 8px 12px 8px",
                            borderRadius: "4px",
                            border: "1px solid #D4D4D4",
                            background: "#FAFAFA",
                          }}
                          onClick={() => addField(item.type, item.label)}
                        >
                          <div className="flex items-center justify-center mb-1.5" style={{ width: item.width, height: item.height }}>
                            {item.svg}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Student Identity Section */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Student Identity
                    </h3>
                    <div className="space-y-2">
                      {[
                        {
                          type: "email",
                          label: "Email Address",
                          subtitle: "Validation included",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" viewBox="0 0 20 16" fill="none">
                              <path d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H2ZM10 9L2 4V14H18V4L10 9ZM10 7L18 2H2L10 7ZM2 4V2V4V14V4Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "phone",
                          label: "Phone Number",
                          subtitle: "International format",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M16.95 18C14.8667 18 12.8083 17.5458 10.775 16.6375C8.74167 15.7292 6.89167 14.4417 5.225 12.775C3.55833 11.1083 2.27083 9.25833 1.3625 7.225C0.454167 5.19167 0 3.13333 0 1.05C0 0.75 0.1 0.5 0.3 0.3C0.5 0.1 0.75 0 1.05 0H5.1C5.33333 0 5.54167 0.0791667 5.725 0.2375C5.90833 0.395833 6.01667 0.583333 6.05 0.8L6.7 4.3C6.73333 4.56667 6.725 4.79167 6.675 4.975C6.625 5.15833 6.53333 5.31667 6.4 5.45L3.975 7.9C4.30833 8.51667 4.70417 9.1125 5.1625 9.6875C5.62083 10.2625 6.125 10.8167 6.675 11.35C7.19167 11.8667 7.73333 12.3458 8.3 12.7875C8.86667 13.2292 9.46667 13.6333 10.1 14L12.45 11.65C12.6 11.5 12.7958 11.3875 13.0375 11.3125C13.2792 11.2375 13.5167 11.2167 13.75 11.25L17.2 11.95C17.4333 12.0167 17.625 12.1375 17.775 12.3125C17.925 12.4875 18 12.6833 18 12.9V16.95C18 17.25 17.9 17.5 17.7 17.7C17.5 17.9 17.25 18 16.95 18ZM3.025 6L4.675 4.35L4.25 2H2.025C2.10833 2.68333 2.225 3.35833 2.375 4.025C2.525 4.69167 2.74167 5.35 3.025 6ZM11.975 14.95C12.625 15.2333 13.2875 15.4583 13.9625 15.625C14.6375 15.7917 15.3167 15.9 16 15.95V13.75L13.65 13.275L11.975 14.95Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "number",
                          label: "Number Input",
                          subtitle: "Transcripts, ID",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M8.99995 16L8.17495 19.275C8.12495 19.4917 8.01661 19.6667 7.84995 19.8C7.68328 19.9333 7.48328 20 7.24995 20C6.93328 20 6.67495 19.875 6.47495 19.625C6.27495 19.375 6.21661 19.1 6.29995 18.8L6.99995 16H4.27495C3.94161 16 3.67495 15.8708 3.47495 15.6125C3.27495 15.3542 3.21661 15.0667 3.29995 14.75C3.34995 14.5167 3.46661 14.3333 3.64995 14.2C3.83328 14.0667 4.04162 14 4.27495 14H7.49995L8.49995 10H5.77495C5.44162 10 5.17495 9.87083 4.97495 9.6125C4.77495 9.35417 4.71661 9.06667 4.79995 8.75C4.84995 8.51667 4.96661 8.33333 5.14995 8.2C5.33333 8.06667 5.54162 8 5.77495 8H8.99995L9.82495 4.725C9.87495 4.50833 9.98328 4.33333 10.1499 4.2C10.3166 4.06667 10.5166 4 10.7499 4C11.0666 4 11.3249 4.125 11.5249 4.375C11.7249 4.625 11.7833 4.9 11.6999 5.2L10.9999 8H14.9999L15.8249 4.725C15.8749 4.50833 15.9833 4.33333 16.1499 4.2C16.3166 4.06667 16.5166 4 16.7499 4C17.0666 4 17.3249 4.125 17.5249 4.375C17.7249 4.625 17.7833 4.9 17.6999 5.2L16.9999 8H19.7249C20.0583 8 20.3249 8.12917 20.5249 8.3875C20.7249 8.64583 20.7833 8.93333 20.6999 9.25C20.6499 9.48333 20.5333 9.66667 20.3499 9.8C20.1666 9.93333 19.9583 10 19.7249 10H16.4999L15.4999 14H18.2249C18.5583 14 18.8249 14.1292 19.0249 14.3875C19.2249 14.6458 19.2833 14.9333 19.1999 15.25C19.1499 15.4833 19.0333 15.6667 18.8499 15.8C18.6666 15.9333 18.4583 16 18.2249 16H14.9999L14.1749 19.275C14.1249 19.4917 14.0166 19.6667 13.8499 19.8C13.6833 19.9333 13.4833 20 13.2499 20C12.9333 20 12.6749 19.875 12.4749 19.625C12.2749 19.375 12.2166 19.1 12.2999 18.8L12.9999 16H8.99995ZM9.49995 14H13.4999L14.4999 10H10.4999L9.49995 14Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "select",
                          label: "Dropdown Menu",
                          subtitle: "Transcripts, ID",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none">
                              <path d="M6 4.6L10.6 0L12 1.4L6 7.4L0 1.4L1.4 0L6 4.6Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "date",
                          label: "Date Picker",
                          subtitle: "Date of birth, etc.",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" viewBox="0 0 18 20" fill="none">
                              <path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H3V0H5V2H13V0H15V2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM2 18H16V8H2V18ZM2 6H16V4H2V6ZM2 6V4V6Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        {
                          type: "file",
                          label: "File Upload",
                          subtitle: "Transcripts, ID",
                          svg: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" viewBox="0 0 16 20" fill="none">
                              <path d="M7 17H9V12.825L10.6 14.425L12 13L8 9L4 13L5.425 14.4L7 12.825V17ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H10L16 6V18C16 18.55 15.8042 19.0208 15.4125 19.4125C15.0208 19.8042 14.55 20 14 20H2ZM9 7V2H2V18H14V7H9ZM2 2V7V2V7V18V2Z" fill="#415876"/>
                            </svg>
                          )
                        },
                        { type: "payment", label: "Collexo Payment", subtitle: "Payment integration", icon: CreditCard },
                      ].map((item) => {
                        const Icon = 'icon' in item ? item.icon : null;
                        return (
                          <button
                            key={item.type}
                            className="w-full text-left flex items-center transition-all group"
                            style={{
                              display: "flex",
                              padding: "12px",
                              alignItems: "center",
                              gap: "12px",
                              alignSelf: "stretch",
                              borderRadius: "4px",
                              border: "1px solid var(--Neutral-300, #D4D4D4)",
                              background: "var(--Neutral-50, #FAFAFA)",
                            }}
                            type="button"
                            onClick={() => addField(item.type, item.label)}
                          >
                            <div className="flex items-center justify-center shrink-0 w-8 h-8 bg-slate-100/50 rounded-[4px]">
                              {'svg' in item ? (
                                item.svg
                              ) : (
                                Icon && <Icon className="h-[18px] w-[18px] text-slate-500 group-hover:text-blue-600" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 leading-none">
                                {item.label}
                              </span>
                              {item.subtitle && (
                                <span
                                  style={{
                                    color: "var(--Colorsecondary-text-color, #475569)",
                                    fontFamily: "Inter, sans-serif",
                                    fontSize: "11px",
                                    fontStyle: "normal",
                                    fontWeight: 400,
                                    lineHeight: "16.5px",
                                  }}
                                  className="mt-1"
                                >
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1 bg-white overflow-y-auto" style={{ padding: "30px" }}>
              <div className="w-full space-y-4">
                <div className="space-y-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localFields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {localFields.map((field) => (
                        <SortableField
                          key={field.id}
                          field={field}
                          isSelected={selectedFieldId === field.id}
                          onSelect={() => setSelectedFieldId(field.id)}
                          onRemove={removeField}
                          onDuplicate={duplicateField}
                          onUpdateField={updateField}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {localFields.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                      <div className="p-4 rounded-full bg-white shadow-sm border">
                        <Plus className="h-8 w-8 text-primary opacity-20" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                           Canvas Empty
                        </p>
                        <p className="text-sm text-slate-400 max-w-[200px] mt-1">
                          Start by adding fields from the left sidebar.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar: Field Settings */}
            <aside className="w-80 border-l bg-background flex flex-col shrink-0 overflow-y-auto">
              {selectedField ? (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Field Settings</h3>
                    <p className="text-xs text-slate-500 mt-1">Configure field properties and styling</p>
                  </div>
                  
                  <Separator />

                  {/* Field ID & Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Type</Label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
                      {React.createElement(
                        FIELD_LIBRARY.find((f) => f.type === selectedField.type)?.icon || Type,
                        { className: "h-4 w-4 text-slate-500" }
                      )}
                      <span className="text-sm font-medium text-slate-700">
                        {FIELD_LIBRARY.find((f) => f.type === selectedField.type)?.label || selectedField.type}
                      </span>
                      {selectedField.systemField && (
                        <Badge variant="secondary" className="ml-auto bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 text-[10px] font-semibold">
                          System Field
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Label Edit */}
                  <div className="space-y-1.5">
                    <Label htmlFor="field-label" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Label</Label>
                    <Input
                      id="field-label"
                      value={selectedField.label}
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                      placeholder="Enter field label..."
                      className="h-10 text-sm focus-visible:ring-0 focus-visible:border-slate-400 border-slate-200 transition-colors"
                    />
                  </div>

                  {/* Placeholder Edit (Show only if type allows it) */}
                  {!["radio", "checkbox", "payment"].includes(selectedField.type) && (
                    <div className="space-y-1.5">
                      <Label htmlFor="field-placeholder" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Placeholder</Label>
                      <Input
                        id="field-placeholder"
                        value={selectedField.placeholder || ""}
                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                        placeholder="Enter placeholder text..."
                        className="h-10 text-sm focus-visible:ring-0 focus-visible:border-slate-400 border-slate-200 transition-colors"
                      />
                    </div>
                  )}


                  {/* Option List for Select, Radio, Checkbox */}
                  {["select", "radio", "checkbox"].includes(selectedField.type) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</Label>
                        {!(selectedField.systemField && selectedField.id === "location") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const currentOptions = selectedField.options || [];
                              updateField(selectedField.id, {
                                options: [
                                  ...currentOptions,
                                  {
                                    id: Math.random().toString(36).substr(2, 6),
                                    label: `Option ${currentOptions.length + 1}`,
                                  },
                                ],
                              });
                            }}
                            className="h-6 px-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            + Add Option
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {(selectedField.options || []).map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <Input
                              value={opt.label}
                              disabled={selectedField.systemField && selectedField.id === "location"}
                              onChange={(e) => {
                                const newOptions = [...(selectedField.options || [])];
                                newOptions[idx] = { ...opt, label: e.target.value };
                                updateField(selectedField.id, { options: newOptions });
                              }}
                              className="h-8 text-xs focus-visible:ring-0 focus-visible:border-slate-400 border-slate-200 transition-colors"
                            />
                            {!(selectedField.systemField && selectedField.id === "location") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                onClick={() => {
                                  const newOptions = (selectedField.options || []).filter((_, i) => i !== idx);
                                  updateField(selectedField.id, { options: newOptions });
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                    <Settings className="h-6 w-6 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700">No Field Selected</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                    Click on any field on the canvas to configure its settings.
                  </p>
                </div>
              )}
            </aside>
        </main>

        {/* Form Settings Dialog Popup */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border border-slate-200 rounded-[16px] gap-0">
            <div
              style={{
                display: "flex",
                padding: "32px",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "24px",
                background: "#FFF",
              }}
              className="w-full"
            >
              {/* Form Settings Header */}
              <div className="flex items-center gap-2">
                <div
                  style={{
                    display: "flex",
                    padding: "8px",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                  className="w-10 h-10 bg-slate-50 rounded-md shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10.825 22C10.375 22 9.98748 21.85 9.66248 21.55C9.33748 21.25 9.14165 20.8833 9.07498 20.45L8.84998 18.8C8.63331 18.7167 8.42915 18.6167 8.23748 18.5C8.04581 18.3833 7.85831 18.2583 7.67498 18.125L6.12498 18.775C5.70831 18.9583 5.29165 18.975 4.87498 18.825C4.45831 18.675 4.13331 18.4083 3.89998 18.025L2.72498 15.975C2.49165 15.5917 2.42498 15.1833 2.52498 14.75C2.62498 14.3167 2.84998 13.9583 3.19998 13.675L4.52498 12.675C4.50831 12.5583 4.49998 12.4458 4.49998 12.3375V11.6625C4.49998 11.5542 4.50831 11.4417 4.52498 11.325L3.19998 10.325C2.84998 10.0417 2.62498 9.68333 2.52498 9.25C2.42498 8.81667 2.49165 8.40833 2.72498 8.025L3.89998 5.975C4.13331 5.59167 4.45831 5.325 4.87498 5.175C5.29165 5.025 5.70831 5.04167 6.12498 5.225L7.67498 5.875C7.85831 5.74167 8.04998 5.61667 8.24998 5.5C8.44998 5.38333 8.64998 5.28333 8.84998 5.2L9.07498 3.55C9.14165 3.11667 9.33748 2.75 9.66248 2.45C9.98748 2.15 10.375 2 10.825 2H13.175C13.625 2 14.0125 2.15 14.3375 2.45C14.6625 2.75 14.8583 3.11667 14.925 3.55L15.15 5.2C15.3666 5.28333 15.5708 5.38333 15.7625 5.5C15.9541 5.61667 16.1416 5.74167 16.325 5.875L17.875 5.225C18.2916 5.04167 18.7083 5.025 19.125 5.175C19.5416 5.325 19.8666 5.59167 20.1 5.975L21.275 8.025C21.5083 8.40833 21.575 8.81667 21.475 9.25C21.375 9.68333 21.15 10.0417 20.8 10.325L19.475 11.325C19.4916 11.4417 19.5 11.5542 19.5 11.6625V12.3375C19.5 12.4458 19.4833 12.5583 19.45 12.675L20.775 13.675C21.125 13.9583 21.35 14.3167 21.45 14.75C21.55 15.1833 21.4833 15.5917 21.25 15.975L20.05 18.025C19.8166 18.4083 19.4916 18.675 19.075 18.825C18.6583 18.975 18.2416 18.9583 17.825 18.775L16.325 18.125C16.1416 18.2583 15.95 18.3833 15.75 18.5C15.55 18.6167 15.35 18.7167 15.15 18.8L14.925 20.45C14.8583 20.8833 14.6625 21.25 14.3375 21.55C14.0125 21.85 13.625 22 13.175 22H10.825ZM12.05 15.5C13.0166 15.5 13.8416 15.1583 14.525 14.475C15.2083 13.7917 15.55 12.9667 15.55 12C15.55 11.0333 15.2083 10.2083 14.525 9.525C13.8416 8.84167 13.0166 8.5 12.05 8.5C11.0666 8.5 10.2375 8.84167 9.56248 9.525C8.88748 10.2083 8.54998 11.0333 8.54998 12C8.54998 12.9667 8.88748 13.7917 9.56248 14.475C10.2375 15.1583 11.0666 15.5 12.05 15.5Z" fill="#415876"/>
                  </svg>
                </div>
                <h2
                  style={{
                    color: "#0A0A0A",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "20px",
                    fontWeight: 600,
                    lineHeight: "32px",
                    letterSpacing: "-0.24px",
                  }}
                >
                  Form Settings
                </h2>
              </div>

              {/* Form Name Field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label
                  style={{
                    color: "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "16px",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                  }}
                >
                  Form Name
                </label>
                <input
                  value={localName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  style={{
                    display: "flex",
                    padding: "12px 16px 13px 16px",
                    alignItems: "flex-start",
                    alignSelf: "stretch",
                    borderRadius: "8px",
                    border: "1px solid #D4D4D4",
                    background: "#FFF",
                  }}
                  className="w-full text-sm focus:outline-none focus:border-slate-400 focus:ring-0 transition-colors"
                />
              </div>

              {/* Public Slug Field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label
                  style={{
                    color: "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "16px",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                  }}
                >
                  Public Slug
                </label>
                <div
                  style={{
                    display: "flex",
                    padding: "12px 16px 13px 16px",
                    alignItems: "center",
                    alignSelf: "stretch",
                    borderRadius: "8px",
                    border: "1px solid #D4D4D4",
                    background: "#FFF",
                  }}
                  className="w-full focus-within:border-slate-400 focus-within:ring-0 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-400 select-none mr-1.5">/f/</span>
                  <input
                    value={localSlug}
                    onChange={(e) => setLocalSlug(e.target.value)}
                    className="bg-transparent border-none p-0 w-full h-auto text-sm focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic mt-0.5">
                  Slug updates automatically as you change form name.
                </p>
              </div>

              {/* Campaign Connection Field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label
                  style={{
                    color: "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "16px",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                  }}
                >
                  Campaign Connection
                </label>
                <input
                  value={form.campaignId || ""}
                  readOnly
                  placeholder="No campaign linked"
                  style={{
                    display: "flex",
                    padding: "12px 16px 13px 16px",
                    alignItems: "flex-start",
                    alignSelf: "stretch",
                    borderRadius: "8px",
                    border: "1px solid #D4D4D4",
                    background: "#F8FAFC",
                  }}
                  className="w-full text-sm text-slate-500 focus:outline-none"
                />
              </div>

              <Separator />

              {/* General Configuration Section */}
              <div className="space-y-4 w-full">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  General Configuration
                </h3>
                <div
                  className="flex items-center justify-between p-6 bg-[#EFF6FF] rounded-[8px] gap-4 self-stretch w-full"
                >
                  <div className="space-y-0.5">
                    <Label
                      style={{
                        color: "#2563EB",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "18px",
                        fontWeight: 500,
                        lineHeight: "normal",
                      }}
                    >
                      Email Notification
                    </Label>
                    <p
                      style={{
                        color: "#1E293B",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        lineHeight: "20px",
                        letterSpacing: "0.6px",
                      }}
                    >
                      Notify counselors on new lead
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className="focus:outline-none shrink-0"
                  >
                    {emailNotifications ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="19" viewBox="0 0 28 19" fill="none">
                        <rect y="2" width="23" height="10" rx="5" fill="#2563EA"/>
                        <g filter="url(#filter0_d_949_297)">
                          <rect x="14" y="3" width="8" height="8" rx="4" fill="white"/>
                        </g>
                        <defs>
                          <filter id="filter0_d_949_297" x="8.75" y="0" width="18.5" height="18.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="2.25"/>
                            <feGaussianBlur stdDeviation="2.625"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_949_297"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_949_297" result="shape"/>
                          </filter>
                        </defs>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="19" viewBox="0 0 28 19" fill="none">
                        <rect y="2" width="23" height="10" rx="5" fill="#D4D4D4"/>
                        <g filter="url(#filter0_d_949_297)">
                          <rect x="1" y="3" width="8" height="8" rx="4" fill="#A3A3A3"/>
                        </g>
                        <defs>
                          <filter id="filter0_d_949_297" x="-4.25" y="0" width="18.5" height="18.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                            <feOffset dy="2.25"/>
                            <feGaussianBlur stdDeviation="2.625"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
                            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_949_297"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_949_297" result="shape"/>
                          </filter>
                        </defs>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
