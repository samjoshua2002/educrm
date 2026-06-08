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

function SortableField({
  field,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (field: FormField) => void;
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
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group ${
        isDragging ? "opacity-30 border-primary" : ""
      } ${
        isSelected
          ? "border-primary bg-primary/5 shadow-inner"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold tracking-tight text-slate-700">
            {field.label}{" "}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
          {isSelected && (
            <div className="flex items-center gap-1">
              {!field.systemField && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(field);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(field.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        {field.type === "select" ? (
          <div className="h-10 w-full rounded-lg border bg-white px-3 flex items-center justify-between text-muted-foreground text-sm shadow-sm">
            {field.placeholder || "Select option..."}
            <ChevronDown className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-10 w-full rounded-lg border bg-white px-3 flex items-center text-muted-foreground text-sm shadow-sm italic opacity-60">
            {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          </div>
        )}
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
  const [localFields, setLocalFields] = React.useState<FormField[]>([]);
  const [localName, setLocalName] = React.useState("");
  const [localStatus, setLocalStatus] = React.useState<Form["status"]>("draft");
  const [localSlug, setLocalSlug] = React.useState("");
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(
    null,
  );

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
    const target = localFields.find((f) => f.id === fieldId);
    if (
      target?.systemField ||
      isSystemField(target ?? { id: fieldId, label: "" })
    ) {
      return;
    }
    setLocalFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
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

  const handleSave = (publish: boolean = false) => {
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
  };

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
    <div className="flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-muted/20">
      <Tabs
        defaultValue="build"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Builder Header */}
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/organization/forms">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Input
                  className="text-sm font-bold leading-none bg-transparent border-none focus-visible:ring-0 p-0 w-auto min-w-[150px] h-auto"
                  value={localName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                <Pencil className="h-3 w-3 text-muted-foreground" />
                <Badge
                  variant={localStatus === "active" ? "default" : "secondary"}
                  className="text-[10px] h-4 uppercase translate-y-[1px]"
                >
                  {localStatus}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {form.updatedAt
                  ? `Last updated ${format(new Date(form.updatedAt), "hh:mm a")}`
                  : "Not saved"}
              </span>
            </div>
          </div>

          <TabsList className="grid grid-cols-2 h-9 bg-muted/50 p-1 w-[240px]">
            <TabsTrigger value="build" className="text-xs font-semibold">
              <Layout className="h-3.5 w-3.5 mr-1.5" /> Build
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs font-semibold">
              <Settings className="h-3.5 w-3.5 mr-1.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 font-semibold"
              disabled={isSaving}
              onClick={() => window.open(`/f/${form.slug}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 font-bold bg-primary shadow-lg shadow-primary/20"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                  <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSave(false)}
                >
                  <Save className="h-4 w-4 mr-2" /> Save as Draft
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="font-semibold cursor-pointer text-primary focus:text-primary"
                  onClick={() => handleSave(true)}
                >
                  <Globe className="h-4 w-4 mr-2" /> Save and Publish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <TabsContent
            value="build"
            className="flex-1 flex m-0 overflow-hidden"
          >
            {/* Left Sidebar: Components */}
            <aside className="w-72 border-r bg-background flex flex-col shrink-0">
              <ScrollArea className="flex-1">
                <div className="p-4 border-b">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Form Elements
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_LIBRARY.map((item) => (
                      <Button
                        key={item.type}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-20 gap-2 border-dashed hover:border-primary hover:bg-primary/5 group"
                        onClick={() => addField(item.type, item.label)}
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                        <span className="text-[10px] font-bold uppercase">
                          {item.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </aside>

            {/* Center: Canvas */}
            <div className="flex-1 bg-muted/20 overflow-y-auto p-8 flex justify-center">
              <Card className="w-full max-w-2xl min-h-[800px] h-fit p-10 shadow-xl border-none ring-1 ring-slate-200">
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

                <Separator className="my-10" />

                <div className="flex justify-end pt-4">
                  <Button
                    disabled
                    className="px-10 h-11 font-bold text-sm uppercase tracking-wide"
                  >
                    Submit Application
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Sidebar: Settings */}
            <aside className="w-80 border-l bg-background shrink-0 flex flex-col overflow-hidden">
              {selectedField ? (
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {selectedField.systemField && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-xs rounded-lg border border-amber-200">
                        This is a system-default field required for lead
                        processing and cannot be deleted or modified.
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-primary" />
                        Field Configuration
                      </h3>
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label
                            htmlFor="field-label"
                            className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest"
                          >
                            Display Label
                          </Label>
                          <Input
                            id="field-label"
                            value={selectedField.label}
                            onChange={(e) =>
                              updateField(selectedField.id, {
                                label: e.target.value,
                              })
                            }
                            className="bg-muted/30 focus-visible:ring-primary/20"
                            disabled={selectedField.systemField}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="field-placeholder"
                            className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest"
                          >
                            Placeholder Text
                          </Label>
                          <Input
                            id="field-placeholder"
                            value={selectedField.placeholder || ""}
                            onChange={(e) =>
                              updateField(selectedField.id, {
                                placeholder: e.target.value,
                              })
                            }
                            className="bg-muted/30 focus-visible:ring-primary/20"
                            disabled={selectedField.systemField}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Options Editor for selection fields */}
                    {["select", "radio", "checkbox"].includes(
                      selectedField.type,
                    ) && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                              Options
                            </Label>
                            {!selectedField.systemField && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] font-bold uppercase p-0"
                                onClick={() => {
                                  const currentOptions =
                                    selectedField.options || [];
                                  updateField(selectedField.id, {
                                    options: [
                                      ...currentOptions,
                                      {
                                        id: Math.random()
                                          .toString(36)
                                          .substr(2, 6),
                                        label: `Option ${currentOptions.length + 1}`,
                                      },
                                    ],
                                  });
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Option
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {selectedField.systemField &&
                            selectedField.id === "location" ? (
                              <div className="text-xs text-muted-foreground italic p-2 bg-slate-50 border rounded-lg">
                                Loaded dynamically from organization branches.
                              </div>
                            ) : (
                              (selectedField.options || []).map(
                                (option, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2"
                                  >
                                    <Input
                                      value={option.label}
                                      onChange={(e) => {
                                        const newOptions = [
                                          ...(selectedField.options || []),
                                        ];
                                        newOptions[idx] = {
                                          ...newOptions[idx],
                                          label: e.target.value,
                                        };
                                        updateField(selectedField.id, {
                                          options: newOptions,
                                        });
                                      }}
                                      className="h-8 text-xs bg-muted/30"
                                      disabled={selectedField.systemField}
                                    />
                                    {!selectedField.systemField && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          const newOptions = (
                                            selectedField.options || []
                                          ).filter((_, i) => i !== idx);
                                          updateField(selectedField.id, {
                                            options: newOptions,
                                          });
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ),
                              )
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Behavior & Logic
                      </h4>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 ring-1 ring-slate-200">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold">
                            Required Field
                          </Label>
                          <p className="text-[10px] text-muted-foreground">
                            Force applicant to answer
                          </p>
                        </div>
                        <Switch
                          checked={selectedField.required}
                          onCheckedChange={(val) =>
                            updateField(selectedField.id, { required: val })
                          }
                          disabled={selectedField.systemField}
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4 opacity-40 grayscale">
                  <Layout className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-bold text-[10px] uppercase tracking-widest">
                      No Field Selected
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[140px]">
                      Select a field in the canvas to configure its settings.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </TabsContent>

          <TabsContent
            value="settings"
            className="flex-1 m-0 bg-muted/20 overflow-y-auto p-8 flex justify-center"
          >
            <Card className="w-full max-w-2xl h-fit p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-6 italic text-primary">
                Form Settings
              </h2>
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Form Name
                    </Label>
                    <Input
                      value={localName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Public Slug
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/f/</span>
                      <Input
                        value={localSlug}
                        onChange={(e) => setLocalSlug(e.target.value)}
                        className="bg-muted focus-visible:ring-primary/20"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      Slug updates automatically as you change form name.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Campaign Connection
                    </Label>
                    <Input
                      value={form.campaignId || ""}
                      readOnly
                      className="bg-muted"
                      placeholder="No campaign linked"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    General Configuration
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">
                        Email Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Notify counselors on new lead
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}
