"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePublicForm, useSubmitPublicForm } from "@/hooks/use-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

function renderFormattedLabel(label: string) {
  if (!label) return "";
  
  const lines = label.split("\n");
  let inUl = false;
  let inOl = false;
  let processedLines = [];
  
  for (let line of lines) {
    // Unordered lists: starting with - or *
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ulMatch) {
      if (inOl) {
        processedLines.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        processedLines.push("<ul class='list-disc pl-5 my-1.5 space-y-1'>");
        inUl = true;
      }
      processedLines.push(`<li>${ulMatch[2]}</li>`);
      continue;
    }
    
    // Ordered lists: starting with 1., 2. etc
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) {
        processedLines.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        processedLines.push("<ol class='list-decimal pl-5 my-1.5 space-y-1'>");
        inOl = true;
      }
      processedLines.push(`<li>${olMatch[2]}</li>`);
      continue;
    }
    
    if (inUl) {
      processedLines.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      processedLines.push("</ol>");
      inOl = false;
    }
    
    processedLines.push(line);
  }
  
  if (inUl) processedLines.push("</ul>");
  if (inOl) processedLines.push("</ol>");
  
  let html = processedLines.join("\n")
    .replace(/\*\*(.*?)\*\//g, "<strong>$1</strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/<i>(.*?)<\/i>/g, "<em>$1</em>")
    .replace(/<u>(.*?)<\/u>/g, "<span class='underline'>$1</span>")
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-indigo-600 hover:text-indigo-850 underline font-semibold">$1</a>')
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, '<a href="$1" target="_blank" class="text-indigo-600 hover:text-indigo-850 underline font-semibold">$2</a>');
    
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const unwrappedParams = React.use(params);
  const slug = unwrappedParams.slug;
  const searchParams = useSearchParams();

  // API Hooks
  const { data: form, isLoading, isError } = usePublicForm(slug);
  const {
    mutate: submitForm,
    isPending: isSubmitting,
    isSuccess,
  } = useSubmitPublicForm();

  // Form State
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // UTM Data
  const utmData = React.useMemo(() => {
    const utm: Record<string, string> = {};
    const keys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];
    keys.forEach((key) => {
      const val = searchParams.get(key);
      if (val) utm[key] = val;
    });
    return utm;
  }, [searchParams]);

  const source = searchParams.get("source") || "direct";

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };


  const validate = () => {
    const newErrors: Record<string, string> = {};
    form?.fields
      .filter((f) => f.id !== "form_metadata" && f.type !== "banner")
      .forEach((field) => {
        const val = formData[field.id];
        if (field.required && (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))) {
          newErrors[field.id] = `${field.label} is required`;
        }
        if (
          field.type === "email" &&
          val &&
          !/\S+@\S+\.\S+/.test(val)
        ) {
          newErrors[field.id] = "Invalid email format";
        }
        if (
          field.type === "number" &&
          val !== undefined &&
          val !== null &&
          val !== "" &&
          isNaN(Number(val))
        ) {
          newErrors[field.id] = "Must be a valid number";
        }
        if (
          field.type === "phone" &&
          val &&
          !/^\+?[0-9\s\-()]{7,15}$/.test(val)
        ) {
          newErrors[field.id] = "Invalid phone number format";
        }
      });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    submitForm({
      slug,
      data: formData,
      utmData,
      source,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading secure application form...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-xl">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Form Not Available</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The application form you are looking for might have been moved,
                expired, or deactivated by the institution.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full border-emerald-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Application Submitted!
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Thank you for your interest in <strong>{form.name}</strong>.
                Your details have been securely transmitted to the admissions
                office.
              </p>
            </div>
            <div className="pt-4">
              <p className="text-xs text-muted-foreground italic">
                You will receive a confirmation email shortly if applicable.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col py-12 px-4 selection:bg-primary/10">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        {/* Form Header */}
        <div className="space-y-2 flex flex-col items-center text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl w-full">
            {form.name}
          </h1>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden ring-1 ring-slate-200">
          <CardContent className="p-8 sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {form.fields
                  .filter((field) => field.id !== "form_metadata")
                  .map((field) => (
                    <div
                      key={field.id}
                      className={`space-y-2.5 ${
                        field.type === "banner"
                          ? "col-span-1 md:col-span-2"
                          : `col-span-1 ${field.halfWidth ? "md:col-span-1" : "md:col-span-2"}`
                      }`}
                    >
                      {field.type === "banner" ? (
                        <div 
                          className={`p-6 rounded-lg bg-slate-50/50 border border-slate-100 flex flex-col ${
                            field.alignment === "left" 
                              ? "items-start text-left" 
                              : field.alignment === "right" 
                              ? "items-end text-right" 
                              : "items-center text-center"
                          }`}
                        >
                          <h2 className="text-xl font-bold text-slate-850 w-full leading-snug">
                            {renderFormattedLabel(field.label || "")}
                          </h2>
                          <p 
                            className={`mt-2 leading-relaxed whitespace-pre-line w-full font-medium ${
                              field.fontSize === "sm"
                                ? "text-xs"
                                : field.fontSize === "lg"
                                ? "text-base"
                                : field.fontSize === "xl"
                                ? "text-lg"
                                : "text-sm"
                            }`}
                            style={{ color: field.textColor || "#475569" }}
                          >
                            {renderFormattedLabel(field.placeholder || "")}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Label
                            htmlFor={field.id}
                            className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between"
                          >
                            <span className="flex items-center gap-1 flex-wrap">
                              {renderFormattedLabel(field.label || "")}{" "}
                              {field.required && (
                                <span className="text-destructive ml-0.5">*</span>
                              )}
                            </span>
                            {errors[field.id] && (
                              <span className="text-[10px] text-destructive animate-pulse lowercase font-normal italic">
                                {errors[field.id]}
                              </span>
                            )}
                          </Label>

                          {/* Render field based on type */}
                          {field.type === "select" ? (
                            <Select
                              value={formData[field.id] || undefined}
                              onValueChange={(v) => handleInputChange(field.id, v)}
                              required={field.required}
                            >
                              <SelectTrigger
                                className={`w-full bg-slate-50/50 border-slate-200 h-11 focus:ring-primary/20 ${errors[field.id] ? "border-destructive/50" : ""}`}
                              >
                                <SelectValue
                                  placeholder={
                                    field.placeholder || "Please select..."
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === "radio" ? (
                            <RadioGroup
                              value={formData[field.id] || ""}
                              onValueChange={(v) => handleInputChange(field.id, v)}
                              className="flex flex-col gap-3 pt-1"
                            >
                              {field.options?.map((opt) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:border-primary/20 transition-colors"
                                >
                                  <RadioGroupItem
                                    value={opt.id}
                                    id={`${field.id}-${opt.id}`}
                                  />
                                  <Label
                                    htmlFor={`${field.id}-${opt.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                  >
                                    {opt.label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          ) : field.type === "textarea" ? (
                            <Textarea
                              id={field.id}
                              value={formData[field.id] || ""}
                              placeholder={field.placeholder}
                              required={field.required}
                              className={`bg-slate-50/50 border-slate-200 min-h-[100px] focus:ring-primary/20 ${errors[field.id] ? "border-destructive/50" : ""}`}
                              onChange={(e) =>
                                handleInputChange(field.id, e.target.value)
                              }
                            />
                          ) : field.type === "checkbox" ? (
                            <div className="flex flex-col gap-3 pt-1">
                              {field.options?.map((opt) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`${field.id}-${opt.id}`}
                                    checked={(formData[field.id] || []).includes(opt.id)}
                                    onCheckedChange={(checked) => {
                                      const current = formData[field.id] || [];
                                      const next = checked
                                        ? [...current, opt.id]
                                        : current.filter((o: string) => o !== opt.id);
                                      handleInputChange(field.id, next);
                                    }}
                                  />
                                  <Label
                                    htmlFor={`${field.id}-${opt.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer"
                                  >
                                    {opt.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ) : field.type === "file" ? (
                            <div className="space-y-2">
                              <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 hover:border-indigo-400 transition-colors p-4 rounded-lg bg-slate-50/30 text-slate-500 gap-2 relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="17 8 12 3 7 8" />
                                  <line x1="12" x2="12" y1="3" y2="15" />
                                </svg>
                                <input
                                  id={field.id}
                                  type="file"
                                  multiple={(field.maxFiles || 1) > 1}
                                  accept={(field.allowedTypes || ["pdf", "docx", "image"]).map((x) => x === "image" ? "image/*" : `.${x}`).join(",")}
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    const maxMB = field.maxSize || 5;
                                    const maxBytes = maxMB * 1024 * 1024;
                                    const limit = field.maxFiles || 1;
                                    
                                    if (files.length > limit) {
                                      alert(`You can upload a maximum of ${limit} files.`);
                                      e.target.value = "";
                                      return;
                                    }
                                    for (const f of files) {
                                      if (f.size > maxBytes) {
                                        alert(`File "${f.name}" exceeds the maximum size limit of ${maxMB}MB.`);
                                        e.target.value = "";
                                        return;
                                      }
                                    }
                                    handleInputChange(field.id, files);
                                  }}
                                  className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer w-full text-center"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                <span>Max size: {field.maxSize || 5}MB</span>
                                <span>Max files: {field.maxFiles || 1}</span>
                                <span>Format: {(field.allowedTypes || ["pdf", "docx", "image"]).join(", ")}</span>
                              </div>
                            </div>
                          ) : (
                            <Input
                              id={field.id}
                              value={formData[field.id] || ""}
                              type={
                                field.type === "phone"
                                  ? "tel"
                                  : field.type === "number"
                                    ? "number"
                                    : field.type
                              }
                              placeholder={field.placeholder}
                              required={field.required}
                              className={`bg-slate-50/50 border-slate-200 h-11 focus:ring-primary/20 ${errors[field.id] ? "border-destructive/50" : ""}`}
                              onChange={(e) =>
                                handleInputChange(field.id, e.target.value)
                              }
                            />
                          )}
                        </>
                      )}
                    </div>
                ))}
              </div>

              <div className="pt-6 flex justify-start flex-col items-start gap-4">
                <Button
                  type="submit"
                  className="bg-[#120352] hover:bg-[#0c023d] text-white text-[11px] font-black uppercase tracking-widest px-8 h-12 rounded-[4px] shadow-md transition-all active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Submission...
                    </span>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
               
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Your data is encrypted and secure.
          <br />© {new Date().getFullYear()} Collexo Platform.
        </p>
      </div>
    </div>
  );
}
