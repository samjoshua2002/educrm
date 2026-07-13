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
    form?.fields.forEach((field) => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
      if (
        field.type === "email" &&
        formData[field.id] &&
        !/\S+@\S+\.\S+/.test(formData[field.id])
      ) {
        newErrors[field.id] = "Invalid email format";
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
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-2 border border-primary/20">
            <ShieldCheck className="h-3 w-3" /> Secure Application
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {form.name}
          </h1>
          <p className="text-slate-500 text-sm max-w-lg mx-auto italic font-medium">
            Please fill in the details below to proceed with your application.
            All fields marked with (*) are mandatory.
          </p>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden ring-1 ring-slate-200">
          <CardContent className="p-8 sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-6">
                {form.fields.map((field) => (
                  <div key={field.id} className="space-y-2.5">
                    <Label
                      htmlFor={field.id}
                      className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between"
                    >
                      <span>
                        {field.label}{" "}
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
                          {field.id === "location"
                            ? (form as any).organization?.branches
                                ?.filter((b: any) => b.isActive !== false)
                                .map((b: any) => (
                                  <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                  </SelectItem>
                                ))
                            : field.options?.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "radio" ? (
                      <RadioGroup
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
                    ) : (
                      <Input
                        id={field.id}
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
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-black uppercase tracking-widest bg-[#2563EA] hover:bg-[#1d4ed8] text-white shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying
                      Submission...
                    </span>
                  ) : (
                    "Submit Application Now"
                  )}
                </Button>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <div className="h-4 w-4 rounded bg-slate-400 flex items-center justify-center text-white text-[9px] font-black leading-none select-none">
                      M
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Powered by Admission MM
                    </span>
                  </div>
                </div>
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
