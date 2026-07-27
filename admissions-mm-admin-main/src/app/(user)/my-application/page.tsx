"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Manrope } from "next/font/google";
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  Camera,
  School,
  User,
  History,
  ClipboardCheck,
  Eye,
  Edit2,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Building,
  FileText,
  Calendar,
  ArrowLeft,
  Mail,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const manrope = Manrope({ subsets: ["latin"] });

// --- Number Formatting Helpers ---

/** Formats a 10-digit Indian mobile number as XXXXX XXXXX */
function formatMobile(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/** Strips all non-digit characters from a string */
function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formats a 12-digit Aadhaar number as XXXX XXXX XXXX */
function formatAadhaar(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

// --- Schema Definition ---

const applicationSchema = z.object({
  personal: z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Valid phone number required"),
    alternateMobile: z.string().optional(),
    gender: z.string().min(1, "Please select gender"),
    dob: z.string().min(1, "Date of birth is required"),
    category: z.string().min(1, "Category is required"),
    religion: z.string().min(1, "Religion is required"),
    nationality: z.string().min(1, "Nationality is required"),
    aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
    maritalStatus: z.string().min(1, "Marital status is required"),
  }),
  preferences: z.object({
    program: z.string().min(1, "Program is required"),
    preference1: z.string().min(1, "Campus preference 1 is required"),
    preference2: z.string().min(1, "Campus preference 2 is required"),
  }),
  education: z.object({
    tenth: z.object({
      institute: z.string().min(1, "Institute is required"),
      board: z.string().min(1, "Board is required"),
      year: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
      percentage: z.string().min(1, "Percentage is required"),
    }),
    twelfth: z.object({
      institute: z.string().min(1, "Institute is required"),
      board: z.string().min(1, "Board is required"),
      stream: z.string().min(1, "Stream is required"),
      year: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
      percentage: z.string().min(1, "Percentage is required"),
    }),
    graduation: z.object({
      degree: z.string().min(1, "Degree is required"),
      college: z.string().min(1, "College name is required"),
      university: z.string().min(1, "University is required"),
      status: z.string().min(1, "Status is required"),
      passingYear: z.string().regex(/^\d{4}$/, "Must be a 4-digit year"),
      percentageTillLast: z.string().min(1, "Score/Percentage is required"),
      mode: z.string().min(1, "Mode of study is required"),
    }),
    entrance: z.object({
      exam: z.string().min(1, "Entrance exam is required"),
      rollNo: z.string().min(1, "Roll number is required"),
      month: z.string().min(1, "Month/Year is required"),
      status: z.string().min(1, "Status is required"),
      percentile: z.string().min(1, "Percentile is required"),
    }),
  }),
  family: z.object({
    father: z.object({
      name: z.string().min(1, "Father's name is required"),
      mobile: z.string().min(10, "Valid phone number required"),
      occupation: z.string().min(1, "Father's occupation is required"),
      income: z.string().min(1, "Annual income is required"),
    }),
    mother: z.object({
      name: z.string().min(1, "Mother's name is required"),
      mobile: z.string().min(10, "Valid phone number required"),
      occupation: z.string().min(1, "Mother's occupation is required"),
      income: z.string().min(1, "Annual income is required"),
    }),
    address: z.object({
      present: z.string().min(5, "Present address is required"),
      permanent: z.string().min(5, "Permanent address is required"),
    }),
  }),
  declaration: z.object({
    inspiration: z.string().min(10, "Motivation statement must be at least 10 words"),
    source: z.string().min(1, "Source is required"),
    medicalConditions: z.string().optional(),
    agreed: z.boolean().refine((val) => val === true, "You must agree to the declaration"),
  }),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

// --- Stepper Component ---

const Stepper = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { title: "Personal", description: "Identity" },
    { title: "Preferences", description: "Campus" },
    { title: "Educational", description: "Education" },
    { title: "Family", description: "Background" },
    { title: "Submit", description: "Declaration" },
  ];

  return (
    <div className="w-full mb-10">
      <div className="relative flex justify-between items-start">
        <div className="absolute top-5 left-[20px] right-[20px] h-[2px] -translate-y-1/2 z-0" style={{ background: "#DBEAFE" }}>
          <div
            className="h-full transition-all duration-700 ease-in-out"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              background: "#2563EA"
            }}
          />
        </div>

        {steps.map((step, idx) => {
          const isActive = currentStep === idx + 1;
          const isCompleted = currentStep > idx + 1;

          return (
            <div
              key={idx}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                style={{
                  borderRadius: "20px",
                  background: "var(--Blue-Primary, #2563EA)",
                  border: "none",
                  display: "flex",
                  padding: "12px",
                  alignItems: "center",
                  gap: "10px",
                  width: "40px",
                  height: "40px",
                  justifyContent: "center"
                }}
              >
                {(() => {
                  const strokeColor = "white";
                  const fillColor = "white";

                  if (idx === 0) {
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="16" viewBox="0 0 13 16" fill="none">
                        <path d="M9.66667 3.83333C9.66667 5.67305 8.17305 7.16667 6.33333 7.16667C4.49362 7.16667 3 5.67305 3 3.83333C3 1.99362 4.49362 0.5 6.33333 0.5C8.17305 0.5 9.66667 1.99362 9.66667 3.83333V3.83333M6.33333 9.66667C3.11383 9.66667 0.5 12.2805 0.5 15.5H12.1667C12.1667 12.2805 9.55284 9.66667 6.33333 9.66667V9.66667" stroke={strokeColor} strokeWidth="1.5"/>
                      </svg>
                    );
                  }
                  if (idx === 1) {
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16" viewBox="0 0 15 16" fill="none">
                        <path d="M13.3333 15.4165V2.08317C13.3333 1.1627 12.5871 0.416504 11.6667 0.416504H3.33333C2.41286 0.416504 1.66667 1.1627 1.66667 2.08317V15.4165M13.3333 15.4165H15M13.3333 15.4165H9.16667M1.66667 15.4165H0M1.66667 15.4165H5.83333M5 3.74984H5.83333M5 7.08317H5.83333M9.16667 3.74984H10M9.16667 7.08317H10M5.83333 15.4165V11.2498C5.83333 10.7896 6.20643 10.4165 6.66667 10.4165H8.33333C8.79357 10.4165 9.16667 10.7896 9.16667 11.2498V15.4165M5.83333 15.4165H9.16667" stroke={strokeColor} strokeWidth="0.833333"/>
                      </svg>
                    );
                  }
                  if (idx === 2) {
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="15" viewBox="0 0 17 15" fill="none">
                        <path d="M8.35791 8.8099L15.8579 4.64323L8.35791 0.476562L0.85791 4.64323L8.35791 8.8099V8.8099M8.35791 8.8099L13.4912 5.95823C14.1667 7.6733 14.3584 9.54087 14.0454 11.3574C11.9317 11.5625 9.93892 12.4379 8.35791 13.8557C6.77712 12.4381 4.78465 11.5627 2.67124 11.3574C2.35808 9.54088 2.54977 7.67325 3.22541 5.95823L8.35791 8.8099V8.8099M5.02458 13.8099V7.5599L8.35791 5.70823" stroke={strokeColor} strokeWidth="0.833333"/>
                      </svg>
                    );
                  }
                  if (idx === 3) {
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" width="19" height="14" viewBox="0 0 19 14" fill="none">
                        <path d="M14.9516 3.3125C14.8371 4.90117 13.6586 6.125 12.3735 6.125C11.0883 6.125 9.90784 4.90156 9.79534 3.3125C9.67816 1.65977 10.8254 0.5 12.3735 0.5C13.9215 0.5 15.0688 1.68984 14.9516 3.3125Z" stroke={strokeColor} strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.3734 8.625C9.82768 8.625 7.37963 9.88945 6.76635 12.352C6.6851 12.6777 6.8894 13 7.22416 13H17.523C17.8578 13 18.0609 12.6777 17.9808 12.352C17.3675 9.85 14.9195 8.625 12.3734 8.625Z" stroke={strokeColor} strokeMiterlimit="10"/>
                        <path d="M7.06116 4.01328C6.96976 5.28203 6.01741 6.28125 4.99085 6.28125C3.96429 6.28125 3.01038 5.28242 2.92054 4.01328C2.82718 2.69336 3.75413 1.75 4.99085 1.75C6.22757 1.75 7.15452 2.71758 7.06116 4.01328Z" stroke={strokeColor} strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7.2953 8.70313C6.59023 8.38008 5.81366 8.25586 4.99062 8.25586C2.95937 8.25586 1.00234 9.26563 0.512101 11.2324C0.447648 11.4926 0.610929 11.75 0.878117 11.75H5.26405" stroke={strokeColor} strokeMiterlimit="10" strokeLinecap="round"/>
                      </svg>
                    );
                  }
                  if (idx === 4) {
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 0.541667C0 0.398008 0.0570684 0.260233 0.158651 0.158651C0.260233 0.0570684 0.398008 0 0.541667 0H12.4583C12.602 0 12.7398 0.0570684 12.8414 0.158651C12.9429 0.260233 13 0.398008 13 0.541667V5.41667H11.9167V1.08333H1.08333V11.9167H3.25542V13H0.541667C0.398008 13 0.260233 12.9429 0.158651 12.8414C0.0570684 12.7398 0 12.602 0 12.4583V0.541667ZM12.9935 7.943L8.09683 12.8386C7.9953 12.9398 7.85778 12.9966 7.71442 12.9966C7.57105 12.9966 7.43353 12.9398 7.332 12.8386L4.61283 10.1194L5.37767 9.35242L7.71442 11.6892L12.2276 7.176L12.9935 7.943Z" fill={fillColor}/>
                      </svg>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="mt-3 flex flex-col items-center text-center">
                <span
                  style={{
                    color: "#171717",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "24px"
                  }}
                >
                  {step.title}
                </span>
                <span 
                  style={{
                    color: "var(--Colorsecondary-text-color, #475569)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "24px"
                  }}
                >
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function MyApplicationPage() {
  const [step, setStep] = React.useState(1);
  const [isPreview, setIsPreview] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [sameAddress, setSameAddress] = React.useState(false);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      personal: {
        fullName: "",
        email: "",
        phone: "",
        alternateMobile: "",
        gender: "",
        dob: "",
        category: "",
        religion: "",
        nationality: "Indian",
        aadhaar: "",
        maritalStatus: "",
      },
      preferences: {
        program: "",
        preference1: "",
        preference2: "",
      },
      education: {
        tenth: {
          institute: "",
          board: "",
          year: "",
          percentage: "",
        },
        twelfth: {
          institute: "",
          board: "",
          stream: "",
          year: "",
          percentage: "",
        },
        graduation: {
          degree: "",
          college: "",
          university: "",
          status: "",
          passingYear: "",
          percentageTillLast: "",
          mode: "",
        },
        entrance: {
          exam: "",
          rollNo: "",
          month: "",
          status: "",
          percentile: "",
        },
      },
      family: {
        father: {
          name: "",
          mobile: "",
          occupation: "",
          income: "",
        },
        mother: {
          name: "",
          mobile: "",
          occupation: "",
          income: "",
        },
        address: {
          present: "",
          permanent: "",
        },
      },
      declaration: {
        inspiration: "",
        source: "",
        medicalConditions: "",
        agreed: false,
      },
    },
    mode: "onChange",
  });

  const nextStep = async () => {
    let fields: any[] = [];
    if (step === 1) fields = ["personal"];
    if (step === 2) fields = ["preferences"];
    if (step === 3) fields = ["education"];
    if (step === 4) fields = ["family"];
    if (step === 5) fields = ["declaration"];

    const isValid = await form.trigger(fields as any);
    if (isValid) {
      if (step < 5) setStep(step + 1);
      else setIsPreview(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: ApplicationFormValues) => {
    console.log("Form Submitted Successfully:", {
      ...data,
      personal: {
        ...data.personal,
        photo: imagePreview,
      },
    });
    alert("Application submitted successfully!");
  };

  if (isPreview) {
    return (
      <div className={`max-w-7xl mx-auto py-10 px-6 bg-white flex flex-col gap-6 ${manrope.className}`}>
        {/* Review Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border bg-muted/20 p-5 rounded-[8px]">
          <div>
            <Badge
              variant="secondary"
              className="text-[10px] px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] font-bold uppercase rounded border-0"
            >
              Step 6: Review & Submit
            </Badge>
            <h1 className="text-xl font-bold text-foreground mt-2">
              Review Your Admission Application
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Please double check all information below. Once submitted, changes cannot be made.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsPreview(false);
              setStep(5);
            }}
            className="border border-border h-10 px-5 text-[14px] font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground cursor-pointer bg-white flex items-center gap-2"
          >
            <Edit2 className="size-4" />
            Edit Application
          </Button>
        </div>

        {/* Hero Banner Detail card */}
        <div className="relative grid grid-cols-[auto_1fr] w-full p-[24px] gap-y-[6px] gap-x-[16px] md:gap-x-[32px] rounded-[8px] border border-border bg-card shadow-sm">
          <div className="relative size-16 w-16 md:h-20 md:w-20 rounded-full border border-border bg-muted flex items-center justify-center shrink-0 col-start-1 row-start-1 md:row-span-2 mt-2 md:mt-0 overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="size-10 text-muted-foreground" />
            )}
          </div>

          {/* Name & Draft Status */}
          <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight break-words">
              {form.getValues("personal.fullName")}
            </h2>
            <div className="flex">
              <Badge
                variant="secondary"
                className="text-[10px] px-2.5 py-0.5 bg-yellow-50 text-yellow-700 font-bold uppercase rounded-[10px]"
              >
                DRAFT / REVIEWING
              </Badge>
            </div>
          </div>

          {/* Details Row */}
          <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col lg:flex-row lg:items-center justify-between gap-y-3 text-[12px] font-normal leading-[20px] text-foreground w-full mt-2 md:mt-0">
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
              <span className="flex items-center gap-1.5 shrink-0 font-medium text-muted-foreground">
                <Building className="h-4 w-4 text-muted-foreground" />
                Program: {form.getValues("preferences.program") || "Not selected"}
              </span>
              <span className="flex items-center gap-1.5 shrink-0 font-medium text-muted-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {form.getValues("personal.email")}
              </span>
              <span className="flex items-center gap-1.5 shrink-0 font-medium text-muted-foreground">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {formatMobile(form.getValues("personal.phone"))}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (1/3) - Personal & Contact Details */}
          <div className="space-y-6 lg:col-span-1">
            {/* Personal Details */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Gender</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("personal.gender")}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Date of Birth</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("personal.dob")}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Category</span>
                    <div>
                      <Badge variant="secondary" className="text-[11px] px-2 py-0.5 bg-accent text-accent-foreground rounded font-semibold border-0">
                        {form.getValues("personal.category")}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Religion</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("personal.religion")}</p>
                  </div>
                  <div className="space-y-1 col-span-2 border-t border-input pt-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Aadhaar Number</span>
                    <p className="font-medium text-[14px] text-foreground tracking-wider">
                      {form.getValues("personal.aadhaar").replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
                    </p>
                  </div>
                  <div className="space-y-1 border-t border-input pt-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Nationality</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("personal.nationality")}</p>
                  </div>
                  <div className="space-y-1 border-t border-input pt-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Marital Status</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("personal.maritalStatus")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold tracking-[0.6px] uppercase text-muted-foreground">COMMUNICATION</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">Primary Mobile</span>
                    <span className="font-bold text-foreground">{formatMobile(form.getValues("personal.phone"))}</span>
                  </div>
                  {form.getValues("personal.alternateMobile") && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Alt Mobile</span>
                      <span className="font-bold text-foreground">{formatMobile(form.getValues("personal.alternateMobile") || "")}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-input pt-3 space-y-1">
                  <h4 className="text-[10px] font-bold tracking-[0.6px] uppercase text-muted-foreground">PRESENT ADDRESS</h4>
                  <p className="text-xs text-foreground leading-normal">{form.getValues("family.address.present")}</p>
                </div>

                <div className="border-t border-input pt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold tracking-[0.6px] uppercase text-muted-foreground">PERMANENT ADDRESS</h4>
                    {sameAddress && (
                      <Badge className="bg-indigo-50 text-indigo-700 text-[8px] font-bold border-0 px-1 py-0.5 rounded">
                        SAME AS PRESENT
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-foreground leading-normal">{form.getValues("family.address.permanent")}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (2/3) - Academic, Tests, Parents, Extra */}
          <div className="space-y-6 lg:col-span-2">
            {/* Preferences Details */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Course and Campus Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-border">
                    <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-ring">Applied Program</span>
                    <span className="font-bold text-foreground text-xs truncate">{form.getValues("preferences.program")}</span>
                  </div>
                  <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-border">
                    <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">Preference 1</span>
                    <span className="font-bold text-foreground text-xs">{form.getValues("preferences.preference1")}</span>
                  </div>
                  <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-border">
                    <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">Preference 2</span>
                    <span className="font-bold text-foreground text-xs">{form.getValues("preferences.preference2")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Educational Details */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Educational Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-transparent hover:bg-transparent border-b border-input">
                        <TableHead className="w-[100px] pl-6 text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">Level</TableHead>
                        <TableHead className="px-4 text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">Institute Name</TableHead>
                        <TableHead className="px-4 text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">Board / Stream</TableHead>
                        <TableHead className="px-4 text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">Year</TableHead>
                        <TableHead className="pr-6 text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-muted/10 border-b border-input">
                        <TableCell className="font-semibold text-foreground pl-6 py-3 text-xs">10th</TableCell>
                        <TableCell className="text-muted-foreground text-xs px-4 py-3">{form.getValues("education.tenth.institute")}</TableCell>
                        <TableCell className="text-muted-foreground text-xs px-4 py-3">{form.getValues("education.tenth.board")}</TableCell>
                        <TableCell className="text-muted-foreground text-xs px-4 py-3">{form.getValues("education.tenth.year")}</TableCell>
                        <TableCell className="text-right font-bold text-foreground pr-6 py-3 text-xs">{form.getValues("education.tenth.percentage")}%</TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/10 border-b border-input">
                        <TableCell className="font-semibold text-foreground pl-6 py-3 text-xs">12th</TableCell>
                        <TableCell className="text-muted-foreground text-xs px-4 py-3">{form.getValues("education.twelfth.institute")}</TableCell>
                        <TableCell className="px-4 py-3 text-xs">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">{form.getValues("education.twelfth.board")}</span>
                            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-0.5">
                              {form.getValues("education.twelfth.stream")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs px-4 py-3">{form.getValues("education.twelfth.year")}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 pr-6 py-3 text-xs">{form.getValues("education.twelfth.percentage")}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="p-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground mb-3">Under-Graduation Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Degree</span>
                      <p className="font-medium text-[14px] text-foreground">{form.getValues("education.graduation.degree")}</p>
                    </div>
                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Institution / University</span>
                      <p className="font-medium text-[14px] text-foreground">{form.getValues("education.graduation.college")}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{form.getValues("education.graduation.university")}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Status / Passing Year</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="bg-[#FEF3C7] text-[#D97706] border-[#FDE68A] font-semibold text-[8px] rounded px-1.5 py-0">
                          {form.getValues("education.graduation.status")}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">({form.getValues("education.graduation.passingYear")})</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Score Till Last Sem</span>
                      <p className="font-medium text-[14px] text-red-500">{form.getValues("education.graduation.percentageTillLast")}%</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">Mode</span>
                      <p className="font-medium text-[14px] text-foreground">{form.getValues("education.graduation.mode")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entrance Test Details */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Entrance Test Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-input">
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground pl-6">Exam</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground px-4">Roll No</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground px-4">Month/Year</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground px-4">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground text-right pr-6">Percentile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/5 hover:bg-muted/10">
                      <TableCell className="font-bold text-foreground text-xs pl-6 py-3">{form.getValues("education.entrance.exam")}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground px-4 py-3">{form.getValues("education.entrance.rollNo")}</TableCell>
                      <TableCell className="text-muted-foreground text-xs px-4 py-3">{form.getValues("education.entrance.month")}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className="bg-[#D1FAE5] text-[#16A34A] border-[#A7F3D0] font-bold text-[8px] rounded px-1.5 py-0 leading-normal">
                          {form.getValues("education.entrance.status")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground pr-6 py-3 text-xs">{form.getValues("education.entrance.percentile")}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Parent's Details */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Parent&apos;s Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Father Details */}
                  <div className="border border-border rounded-[8px] p-4 bg-card flex items-start gap-3 w-full">
                    <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      Fa
                    </div>
                    <div className="flex flex-col gap-2 text-[11px] leading-normal w-full overflow-hidden">
                      <div>
                        <p className="text-xs font-bold text-foreground truncate">{form.getValues("family.father.name")}</p>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">FATHER</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">PHONE</span>
                        <p className="font-semibold text-foreground truncate">{formatMobile(form.getValues("family.father.mobile"))}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">OCCUPATION / INCOME</span>
                        <p className="font-semibold text-foreground truncate">
                          {form.getValues("family.father.occupation")} ({form.getValues("family.father.income")})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mother Details */}
                  <div className="border border-border rounded-[8px] p-4 bg-card flex items-start gap-3 w-full">
                    <div className="h-8 w-8 rounded-full bg-pink-50 text-pink-700 flex items-center justify-center font-bold text-xs shrink-0">
                      Mo
                    </div>
                    <div className="flex flex-col gap-2 text-[11px] leading-normal w-full overflow-hidden">
                      <div>
                        <p className="text-xs font-bold text-foreground truncate">{form.getValues("family.mother.name")}</p>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">MOTHER</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">PHONE</span>
                        <p className="font-semibold text-foreground truncate">{formatMobile(form.getValues("family.mother.mobile"))}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider block">OCCUPATION / INCOME</span>
                        <p className="font-semibold text-foreground truncate">
                          {form.getValues("family.mother.occupation")} ({form.getValues("family.mother.income")})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-input px-6 py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-[3px] h-[20px] rounded-full bg-ring shrink-0 mt-[2px]" />
                    <h4 className="text-sm font-semibold text-foreground leading-tight">
                      What inspires you to pursue a PGDM/MBA program? What motivates you to do it at our institution?
                    </h4>
                  </div>
                  <p className="p-4 rounded-r-[8px] rounded-l-none border-l-[4px] border-l-border bg-muted/20 text-muted-foreground text-sm leading-relaxed italic">
                    &quot;{form.getValues("declaration.inspiration")}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-input mt-2">
                  <div className="space-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">HOW DID YOU KNOW ABOUT US?</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("declaration.source")}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block">MEDICAL CONDITIONS</span>
                    <p className="font-medium text-[14px] text-foreground">{form.getValues("declaration.medicalConditions") || "None"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Controls for Review Screen */}
        <div className="mt-8 flex items-center justify-center gap-4 border-t border-input pt-6">
          <Button
            variant="outline"
            className="border border-border h-11 px-5 text-[14px] font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground cursor-pointer bg-white"
            onClick={() => {
              setIsPreview(false);
              setStep(5);
            }}
          >
            Back to edit
          </Button>
          <Button
            className="bg-ring hover:bg-ring/90 text-primary-foreground flex items-center justify-center gap-2 h-11 px-8 text-base font-medium rounded-[8px] cursor-pointer border-0 shadow-sm"
            onClick={form.handleSubmit(onSubmit)}
          >
            SUBMIT APPLICATION
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto py-10 px-6 pb-20 bg-white w-full ${manrope.className}`}>
      {/* Redesigned Header Block */}
      <div className="flex flex-col mb-10 space-y-4 w-full">
        <div>
          <div 
            style={{
              display: "inline-flex",
              padding: "4px 12px",
              flexDirection: "column",
              alignItems: "flex-start",
              borderRadius: "9999px",
              border: "1px solid #DBEAFE",
              background: "#EFF6FF",
              color: "#1D4ED8",
              fontFamily: "Manrope, sans-serif",
              fontSize: "10px",
              fontStyle: "normal",
              fontWeight: 700,
              lineHeight: "15px",
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}
          >
            Admission Cycle 2026-2027
          </div>
        </div>
        <h1 
          style={{
            color: "#120352",
            fontFamily: "Inter, sans-serif",
            fontSize: "32px",
            fontStyle: "normal",
            fontWeight: 500,
            lineHeight: "normal"
          }}
        >
          Student Admission Application
        </h1>
        <p 
          style={{
            color: "var(--Neutral-900, #171717)",
            fontFamily: "Inter, sans-serif",
            fontSize: "12px",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "normal"
          }}
        >
          Please fill in the application form carefully. Your inputs will be validated and ready for review prior to final submission.
        </p>
      </div>

      <Stepper currentStep={step} />

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Step 1: Personal Details */}
          {step === 1 && (
            <StepCard
              title="Personal Information"
              description="Provide your identity and demographic details."
              icon={<User className="size-5 text-muted-foreground" />}
            >
              <div className="flex gap-6">
                {/* Photo Upload Container (Left Column) */}
                <div 
                  style={{
                    height: "386px",
                    flexShrink: 0,
                    alignSelf: "stretch",
                    display: "flex",
                    width: "190.5px",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    gap: "16px"
                  }}
                >
                  <div className="relative inline-block shrink-0">
                    <div 
                      className="relative overflow-hidden"
                      style={{
                        display: "flex",
                        width: "93.5px",
                        height: "93.5px",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "5843.166px",
                        border: "2.338px solid #ECEEF1",
                        background: "#F7F9FC"
                      }}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 19 19" fill="none">
                          <path d="M9.25 9.25C7.97813 9.25 6.88932 8.79714 5.98359 7.89141C5.07786 6.98568 4.625 5.89687 4.625 4.625C4.625 3.35312 5.07786 2.26432 5.98359 1.35859C6.88932 0.452864 7.97813 0 9.25 0C10.5219 0 11.6107 0.452864 12.5164 1.35859C13.4221 2.26432 13.875 3.35312 13.875 4.625C13.875 5.89687 13.4221 6.98568 12.5164 7.89141C11.6107 8.79714 10.5219 9.25 9.25 9.25ZM0 18.5V15.2625C0 14.6073 0.16862 14.0051 0.505859 13.4559C0.843099 12.9066 1.29115 12.4875 1.85 12.1984C3.04479 11.601 4.25885 11.153 5.49219 10.8543C6.72552 10.5556 7.97813 10.4062 9.25 10.4062C10.5219 10.4062 11.7745 10.5556 13.0078 10.8543C14.2411 11.153 15.4552 11.601 16.65 12.1984C17.2089 12.4875 17.6569 12.9066 17.9941 13.4559C18.3314 14.0051 18.5 14.6073 18.5 15.2625V18.5H0ZM2.3125 16.1875H16.1875V15.2625C16.1875 15.0505 16.1345 14.8578 16.0285 14.6844C15.9225 14.5109 15.7828 14.376 15.6094 14.2797C14.5688 13.7594 13.5185 13.3691 12.4586 13.109C11.3987 12.8488 10.3292 12.7188 9.25 12.7188C8.17083 12.7188 7.1013 12.8488 6.04141 13.109C4.98151 13.3691 3.93125 13.7594 2.89062 14.2797C2.71719 14.376 2.57747 14.5109 2.47148 14.6844C2.36549 14.8578 2.3125 15.0505 2.3125 15.2625V16.1875ZM9.25 6.9375C9.88594 6.9375 10.4303 6.71107 10.8832 6.2582C11.3361 5.80534 11.5625 5.26094 11.5625 4.625C11.5625 3.98906 11.3361 3.44466 10.8832 2.9918C10.4303 2.53893 9.88594 2.3125 9.25 2.3125C8.61406 2.3125 8.06966 2.53893 7.6168 2.9918C7.16393 3.44466 6.9375 3.98906 6.9375 4.625C6.9375 5.26094 7.16393 5.80534 7.6168 6.2582C8.06966 6.71107 8.61406 6.9375 9.25 6.9375Z" fill="#767683"/>
                        </svg>
                      )}
                    </div>
                    <label 
                      htmlFor="profile-upload"
                      className="absolute bottom-0 right-0 flex items-center justify-center cursor-pointer"
                      style={{
                        width: "23.375px",
                        height: "23.375px",
                        borderRadius: "5843.166px",
                        background: "#2563EA",
                        boxShadow: "0 5.844px 8.766px -1.753px rgba(0, 0, 0, 0.10), 0 2.338px 3.506px -2.338px rgba(0, 0, 0, 0.10)"
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14" fill="none" style={{ width: "14.355px", height: "13.05px" }}>
                        <path d="M1.30501 13.0501C0.946134 13.0501 0.638913 12.9223 0.383348 12.6668C0.127783 12.4112 0 12.104 0 11.7451V3.91504C0 3.55616 0.127783 3.24894 0.383348 2.99337C0.638913 2.73781 0.946134 2.61003 1.30501 2.61003H3.36041L4.56755 1.30501H8.48258V2.61003H5.13849L3.94766 3.91504H1.30501V11.7451H11.7451V5.87256H13.0501V11.7451C13.0501 12.104 12.9223 12.4112 12.6668 12.6668C12.4112 12.9223 12.104 13.0501 11.7451 13.0501H1.30501ZM11.7451 3.91504V2.61003H10.4401V1.30501H11.7451V0H13.0501V1.30501H14.3551V2.61003H13.0501V3.91504H11.7451ZM6.52507 10.7664C7.3407 10.7664 8.03399 10.4809 8.60493 9.90994C9.17587 9.339 9.46134 8.64571 9.46134 7.83008C9.46134 7.01445 9.17587 6.32116 8.60493 5.75021C8.03399 5.17927 7.3407 4.8938 6.52507 4.8938C5.70943 4.8938 5.01614 5.17927 4.4452 5.75021C3.87426 6.32116 3.58879 7.01445 3.58879 7.83008C3.58879 8.64571 3.87426 9.339 4.4452 9.90994C5.01614 10.4809 5.70943 10.7664 6.52507 10.7664ZM6.52507 9.46134C6.06831 9.46134 5.68224 9.30366 5.36687 8.98828C5.05149 8.6729 4.8938 8.28683 4.8938 7.83008C4.8938 7.37332 5.05149 6.98726 5.36687 6.67188C5.68224 6.3565 6.06831 6.19881 6.52507 6.19881C6.98182 6.19881 7.36789 6.3565 7.68326 6.67188C7.99864 6.98726 8.15633 7.37332 8.15633 7.83008C8.15633 8.28683 7.99864 8.6729 7.68326 8.98828C7.36789 9.30366 6.98182 9.46134 6.52507 9.46134Z" fill="white"/>
                      </svg>
                      <Input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label 
                      style={{
                        color: "#191C1E",
                        textAlign: "left",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "16px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "24px"
                      }}
                    >
                      Official Portrait Photo
                    </Label>
                    <p 
                      style={{
                        color: "#454652",
                        fontFamily: "Inter, sans-serif",
                        fontSize: "12px",
                        fontStyle: "normal",
                        fontWeight: 400,
                        lineHeight: "16px"
                      }}
                    >
                      JPG or PNG only. High resolution recommended for official student records.
                    </p>
                  </div>
                </div>

                {/* Right Column - Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 content-start">
                  <FormField
                    control={form.control}
                    name="personal.fullName"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">
                          FULL NAME
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Dr. Sarah Jenkins" 
                            className="border border-input h-[40px] rounded-[8px] text-[14px] placeholder:text-[#A3A3A3] tracking-wider"
                            style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal", fontWeight: 400 }}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personal.email"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">
                          EMAIL ADDRESS
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="sarah.j@university.edu" 
                            className="border border-input h-[40px] rounded-[8px] text-[14px] placeholder:text-[#A3A3A3] tracking-wider"
                            style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal", fontWeight: 400 }}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personal.phone"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">
                          PHONE NUMBER
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 (555) 000-0000"
                            className="border border-input h-[40px] rounded-[8px] text-[14px] placeholder:text-[#A3A3A3] tracking-wider"
                            style={{ fontFamily: "Inter, sans-serif", fontStyle: "normal", fontWeight: 400 }}
                            value={formatMobile(field.value)}
                          onChange={(e) => field.onChange(stripNonDigits(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          maxLength={11}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.alternateMobile"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Alternate Mobile (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 98765 43211"
                          className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider"
                          value={formatMobile(field.value || "")}
                          onChange={(e) => field.onChange(stripNonDigits(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          maxLength={11}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.gender"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.dob"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.category"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GEN">GEN</SelectItem>
                          <SelectItem value="OBC">OBC</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="ST">ST</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.religion"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Religion</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Religion" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Hinduism">Hinduism</SelectItem>
                          <SelectItem value="Christianity">Christianity</SelectItem>
                          <SelectItem value="Islam">Islam</SelectItem>
                          <SelectItem value="Sikhism">Sikhism</SelectItem>
                          <SelectItem value="Buddhism">Buddhism</SelectItem>
                          <SelectItem value="Jainism">Jainism</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.nationality"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Nationality</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Nationality" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Indian">Indian</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.aadhaar"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="XXXX XXXX XXXX"
                          className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider"
                          value={formatAadhaar(field.value)}
                          onChange={(e) => field.onChange(stripNonDigits(e.target.value))}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          maxLength={14}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.maritalStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Marital Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Marital Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Unmarried">Unmarried</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </StepCard>
        )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <StepCard
              title="Course and Campus Preferences"
              description="Identify your program focus and preferred campus branch."
              icon={<Building className="size-5 text-muted-foreground" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="preferences.program"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Applied For Program</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PGDM (Two-Year, Full-Time)">PGDM (Two-Year, Full-Time)</SelectItem>
                          <SelectItem value="MBA (Two-Year, Full-Time)">MBA (Two-Year, Full-Time)</SelectItem>
                          <SelectItem value="Executive PGDM">Executive PGDM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="hidden md:block"></div>
                <FormField
                  control={form.control}
                  name="preferences.preference1"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Campus Preference 1</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Campus Preference 1" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Main Campus">Main Campus</SelectItem>
                          <SelectItem value="City Campus">City Campus</SelectItem>
                          <SelectItem value="South Campus">South Campus</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferences.preference2"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Campus Preference 2</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Campus Preference 2" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Main Campus">Main Campus</SelectItem>
                          <SelectItem value="City Campus">City Campus</SelectItem>
                          <SelectItem value="South Campus">South Campus</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </StepCard>
          )}

          {/* Step 3: Academic Qualifications */}
          {step === 3 && (
            <StepCard
              title="Academic Qualifications"
              description="Input your prior school, undergrad, and exam details."
              icon={<School className="size-5 text-muted-foreground" />}
            >
              <div className="flex flex-col divide-y divide-input">
                {/* 10th Class */}
                <div className="flex flex-col gap-5 pb-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">10th Details</p>
                    <p className="text-[14px] text-muted-foreground">Details of your secondary school education.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <FormField
                      control={form.control}
                      name="education.tenth.institute"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">School/Institute Name</FormLabel>
                          <FormControl>
                            <Input placeholder="School name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.tenth.board"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Board</FormLabel>
                          <FormControl>
                            <Input placeholder="CBSE / ICSE / State Board" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.tenth.year"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Passing Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2020" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.tenth.percentage"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Percentage (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 92.5" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 12th Class */}
                <div className="flex flex-col gap-5 py-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">12th Details</p>
                    <p className="text-[14px] text-muted-foreground">Details of your higher secondary education.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    <FormField
                      control={form.control}
                      name="education.twelfth.institute"
                      render={({ field }) => (
                        <FormItem className="space-y-0 col-span-1 md:col-span-2 lg:col-span-1">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">School/Institute Name</FormLabel>
                          <FormControl>
                            <Input placeholder="School name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.board"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Board</FormLabel>
                          <FormControl>
                            <Input placeholder="CBSE / ISC / State Board" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.stream"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Stream</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                                <SelectValue placeholder="Select Stream" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Science">Science</SelectItem>
                              <SelectItem value="Commerce">Commerce</SelectItem>
                              <SelectItem value="Arts">Arts</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.year"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Passing Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2022" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.percentage"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Percentage (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 88.4" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Graduation Details */}
                <div className="flex flex-col gap-5 py-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">Graduation Details</p>
                    <p className="text-[14px] text-muted-foreground">Your undergraduate education details.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    <FormField
                      control={form.control}
                      name="education.graduation.degree"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Degree Obtained</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. B.Tech / B.Sc" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.college"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">College Name</FormLabel>
                          <FormControl>
                            <Input placeholder="College name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.university"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">University</FormLabel>
                          <FormControl>
                            <Input placeholder="University name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.status"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Awaiting Result">Awaiting Result</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.passingYear"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Passing Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2025" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.percentageTillLast"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Score Till Last Sem (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 84.5" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.mode"
                      render={({ field }) => (
                        <FormItem className="space-y-0 col-span-1 md:col-span-2 lg:col-span-1">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Mode of Study</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                                <SelectValue placeholder="Select Mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Regular">Regular</SelectItem>
                              <SelectItem value="Distance">Distance</SelectItem>
                              <SelectItem value="Part Time">Part Time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Entrance Exam Details */}
                <div className="flex flex-col gap-5 pt-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">Entrance Exam Details</p>
                    <p className="text-[14px] text-muted-foreground">Details of the national level entrance test qualified.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    <FormField
                      control={form.control}
                      name="education.entrance.exam"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Entrance Exam</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                                <SelectValue placeholder="Select Exam" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CAT">GMAT / CAT</SelectItem>
                              <SelectItem value="GRE">GRE / MAT</SelectItem>
                              <SelectItem value="XAT">XAT</SelectItem>
                              <SelectItem value="CMAT">CMAT</SelectItem>
                              <SelectItem value="MAT">MAT</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.entrance.rollNo"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Roll Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Exam roll number" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.entrance.month"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Month/Year of Exam</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Nov 2024" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.entrance.status"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Exam Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Awaiting Result">Awaiting Result</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.entrance.percentile"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Scored Percentile</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 96.50" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </StepCard>
          )}

          {/* Step 4: Family Details */}
          {step === 4 && (
            <StepCard
              title="Family Details & Addresses"
              description="Identify parent details and mailing addresses."
              icon={<History className="size-5 text-muted-foreground" />}
            >
              <div className="flex flex-col divide-y divide-input">
                {/* Father's Details */}
                <div className="flex flex-col gap-5 pb-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">Father&apos;s Details</p>
                    <p className="text-[14px] text-muted-foreground">Official background and details of your father.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <FormField
                      control={form.control}
                      name="family.father.name"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Father&apos;s Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Father's name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.father.mobile"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Father&apos;s Mobile</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 98765 43210"
                              className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider"
                              value={formatMobile(field.value)}
                              onChange={(e) => field.onChange(stripNonDigits(e.target.value))}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              maxLength={11}
                              inputMode="numeric"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.father.occupation"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Father&apos;s Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Business / Service" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.father.income"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Father&apos;s Annual Income</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Rs. 8,00,000" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Mother's Details */}
                <div className="flex flex-col gap-5 py-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">Mother&apos;s Details</p>
                    <p className="text-[14px] text-muted-foreground">Official background and details of your mother.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <FormField
                      control={form.control}
                      name="family.mother.name"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Mother&apos;s Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Mother's name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.mother.mobile"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Mother&apos;s Mobile</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 98765 43210"
                              className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider"
                              value={formatMobile(field.value)}
                              onChange={(e) => field.onChange(stripNonDigits(e.target.value))}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              maxLength={11}
                              inputMode="numeric"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.mother.occupation"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Mother&apos;s Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Homemaker / Business" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.mother.income"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Mother&apos;s Annual Income</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Rs. 4,00,000" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Residential Address */}
                <div className="flex flex-col gap-5 pt-6">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-medium text-foreground">Residential Address</p>
                    <p className="text-[14px] text-muted-foreground">Where you are currently residing and your permanent domicile.</p>
                  </div>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="family.address.present"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Present Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Street name, Building, City, State, ZIP..."
                              className="border border-input rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider p-3 bg-white min-h-[90px] resize-none"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (sameAddress) {
                                  form.setValue("family.address.permanent", e.target.value);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id="same-address"
                        checked={sameAddress}
                        onCheckedChange={(checked) => {
                          setSameAddress(!!checked);
                          if (checked) {
                            form.setValue("family.address.permanent", form.getValues("family.address.present"));
                          }
                        }}
                        className="rounded-[4px] border border-input data-[state=checked]:bg-ring data-[state=checked]:border-ring"
                      />
                      <Label htmlFor="same-address" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        Permanent Address is same as Present Address
                      </Label>
                    </div>

                    <FormField
                      control={form.control}
                      name="family.address.permanent"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Permanent Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Street name, Building, City, State, ZIP..."
                              className="border border-input rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider p-3 bg-white min-h-[90px] resize-none"
                              disabled={sameAddress}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </StepCard>
          )}

          {/* Step 5: Declaration & Motivation */}
          {step === 5 && (
            <StepCard
              title="Statement & Certification"
              description="Finalize statements and certifications. This is your chance to shine."
              icon={<ClipboardCheck className="size-5 text-muted-foreground" />}
            >
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="declaration.inspiration"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px] block">
                        What inspires you to pursue a PGDM/MBA program? What motivates you to do it at our institution?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us your story, goals, and academic interest..."
                          className="border border-input rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider p-3 bg-white min-h-[140px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[12px] text-muted-foreground font-medium italic">
                        Minimum 10 words. Be authentic and state your true goals.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="declaration.source"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">How did you know about us?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white tracking-wider">
                            <SelectValue placeholder="Select Source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Internet Search">Internet Search</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Alumni Referral">Alumni Referral</SelectItem>
                          <SelectItem value="Education Fair">Education Fair</SelectItem>
                          <SelectItem value="News / Advertisement">News / Advertisement</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="declaration.medicalConditions"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#64748B] leading-[16px]">Medical Conditions / Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Specify any medical conditions, or 'None'" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground tracking-wider" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="declaration.agreed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-[8px] border border-border bg-muted/15 p-4 mt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="rounded-[4px] border border-input data-[state=checked]:bg-ring data-[state=checked]:border-ring mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1.5 leading-none">
                        <FormLabel className="text-xs font-semibold text-foreground cursor-pointer">
                          I certify that all information is true and accurate
                        </FormLabel>
                        <p className="text-[10px] text-muted-foreground leading-normal max-w-lg font-medium">
                          By checking this box, you acknowledge that any false or misleading statements in this application will result in immediate rejection or disqualification from the admission cycle.
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </StepCard>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-input">
            <Button
              type="button"
              onClick={prevStep}
              className={`h-[44px] px-6 text-[16px] font-medium text-white rounded-[8px] cursor-pointer bg-[#2563EA] hover:bg-[#1d4ed8] border-0 shadow-sm flex items-center justify-center gap-[5px] ${step === 1 ? "invisible" : ""}`}
            >
              <ChevronLeft className="size-4" /><span>Previous</span>
            </Button>
            <Button
              type="button"
              onClick={nextStep}
              className="h-[44px] px-6 text-[16px] font-medium text-white rounded-[8px] cursor-pointer bg-[#2563EA] hover:bg-[#1d4ed8] border-0 shadow-sm flex items-center justify-center gap-[5px]"
            >
              <span>{step === 5 ? "Preview Application" : "Continue"}</span><ChevronRight className="size-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// --- Helper Components ---

function StepCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-white border border-border rounded-[8px] shadow-sm overflow-hidden w-full p-0 gap-0">
      <div 
        style={{
          display: "flex",
          padding: "16px 20px",
          alignItems: "center",
          gap: "12px",
          alignSelf: "stretch",
          borderBottom: "1px solid var(--Neutral-200, #E5E5E5)",
          background: "var(--Neutral-50, #FAFAFA)"
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 style={{ color: "#120352", fontSize: "16px", fontWeight: 700, fontFamily: "Inter, sans-serif", margin: 0, lineHeight: "24px" }}>
            {title}
          </h2>
          <p style={{ color: "#454652", fontSize: "12px", fontWeight: 400, fontFamily: "Inter, sans-serif", margin: 0, lineHeight: "16px" }}>
            {description}
          </p>
        </div>
      </div>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  );
}
