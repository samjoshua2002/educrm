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

// --- Schema Definition ---

const applicationSchema = z.object({
  personal: z.object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
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
    { title: "Personal", icon: <User className="size-4" />, description: "Identity" },
    { title: "Preferences", icon: <Building className="size-4" />, description: "Campus" },
    { title: "Academic", icon: <School className="size-4" />, description: "Education" },
    { title: "Family", icon: <History className="size-4" />, description: "Background" },
    { title: "Submit", icon: <ClipboardCheck className="size-4" />, description: "Declaration" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto mb-10 px-6">
      <div className="relative flex justify-between items-start">
        <div className="absolute top-5 left-0 w-full h-[2px] bg-border -translate-y-1/2 z-0">
          <div
            className="h-full bg-ring transition-all duration-700 ease-in-out"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
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
                className={`flex items-center justify-center size-10 rounded-full border transition-all duration-500 ring-4 ring-background shadow-sm ${
                  isActive
                    ? "bg-ring border-ring text-primary-foreground scale-110 shadow-lg shadow-ring/10"
                    : isCompleted
                      ? "bg-ring border-ring text-primary-foreground"
                      : "bg-card border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="size-5" /> : step.icon}
              </div>
              <div className="mt-3 flex flex-col items-center text-center max-w-[80px]">
                <span
                  className={`text-[11px] font-bold tracking-tight transition-colors ${isActive ? "text-ring" : "text-muted-foreground"}`}
                >
                  {step.title}
                </span>
                <span className="text-[9px] uppercase font-bold text-muted-foreground/60 hidden md:block tracking-wider mt-0.5">
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
        firstName: "",
        lastName: "",
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
              {form.getValues("personal.firstName")} {form.getValues("personal.lastName")}
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
                {form.getValues("personal.phone")}
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
                    <span className="font-bold text-foreground">{form.getValues("personal.phone")}</span>
                  </div>
                  {form.getValues("personal.alternateMobile") && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium">Alt Mobile</span>
                      <span className="font-bold text-foreground">{form.getValues("personal.alternateMobile")}</span>
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
                        <p className="font-semibold text-foreground truncate">{form.getValues("family.father.mobile")}</p>
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
                        <p className="font-semibold text-foreground truncate">{form.getValues("family.mother.mobile")}</p>
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
      <div className="flex flex-col items-center text-center mb-10 space-y-3">
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-0"
        >
          Admission Cycle 2026-27
        </Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          Student Admission Application
        </h1>
        <p className="text-muted-foreground text-xs max-w-md font-medium leading-relaxed">
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
              {/* Photo Upload Container */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 border border-border rounded-[8px] bg-muted/15 mb-8">
                <div className="relative size-20 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold text-foreground">Official Portrait Photo</Label>
                  <p className="text-[11px] text-muted-foreground">JPG or PNG only. High resolution recommended for official student records.</p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="max-w-xs text-xs file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border-input h-auto p-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="personal.firstName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.lastName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@example.com" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.phone"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Primary Mobile</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9876543210" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.alternateMobile"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Alternate Mobile (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9876543211" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.gender"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.category"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Religion</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Nationality</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="12-digit Aadhaar number" maxLength={12} className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal.maritalStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Marital Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2 col-span-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Applied For Program</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                <FormField
                  control={form.control}
                  name="preferences.preference1"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Campus Preference 1</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Campus Preference 2</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">School/Institute Name</FormLabel>
                          <FormControl>
                            <Input placeholder="School name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.tenth.board"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Board</FormLabel>
                          <FormControl>
                            <Input placeholder="CBSE / ICSE / State Board" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.tenth.year"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Passing Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2020" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.tenth.percentage"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Percentage (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 92.5" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
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
                        <FormItem className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">School/Institute Name</FormLabel>
                          <FormControl>
                            <Input placeholder="School name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.board"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Board</FormLabel>
                          <FormControl>
                            <Input placeholder="CBSE / ISC / State Board" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.stream"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Stream</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Passing Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2022" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.twelfth.percentage"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Percentage (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 88.4" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Degree Obtained</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. B.Tech / B.Sc" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.college"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">College Name</FormLabel>
                          <FormControl>
                            <Input placeholder="College name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.university"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">University</FormLabel>
                          <FormControl>
                            <Input placeholder="University name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.status"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Passing Year</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2025" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.percentageTillLast"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Score Till Last Sem (%)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 84.5" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.graduation.mode"
                      render={({ field }) => (
                        <FormItem className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Mode of Study</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Entrance Exam</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Roll Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Exam roll number" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.entrance.month"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Month/Year of Exam</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Nov 2024" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education.entrance.status"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Exam Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Scored Percentile</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 96.50" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Father&apos;s Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Father's name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.father.mobile"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Father&apos;s Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="Mobile number" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.father.occupation"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Father&apos;s Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Business / Service" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.father.income"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Father&apos;s Annual Income</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Rs. 8,00,000" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Mother&apos;s Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Mother's name" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.mother.mobile"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Mother&apos;s Mobile</FormLabel>
                          <FormControl>
                            <Input placeholder="Mobile number" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.mother.occupation"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Mother&apos;s Occupation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Homemaker / Business" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="family.mother.income"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Mother&apos;s Annual Income</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Rs. 4,00,000" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Present Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Street name, Building, City, State, ZIP..."
                              className="border border-input rounded-[8px] text-[12px] placeholder:text-muted-foreground p-3 bg-white min-h-[90px] resize-none"
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Permanent Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Street name, Building, City, State, ZIP..."
                              className="border border-input rounded-[8px] text-[12px] placeholder:text-muted-foreground p-3 bg-white min-h-[90px] resize-none"
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground block leading-relaxed">
                        What inspires you to pursue a PGDM/MBA program? What motivates you to do it at our institution?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us your story, goals, and academic interest..."
                          className="border border-input rounded-[8px] text-[12px] placeholder:text-muted-foreground p-3 bg-white min-h-[140px] resize-none"
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">How did you know about us?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground bg-white">
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">Medical Conditions / Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Specify any medical conditions, or 'None'" className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground" {...field} />
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
              variant="outline"
              onClick={prevStep}
              className={`border border-border h-11 px-5 text-[14px] font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground cursor-pointer bg-white ${step === 1 ? "invisible" : ""}`}
            >
              <ChevronLeft className="size-4 mr-1.5" />
              Previous
            </Button>
            <Button
              type="button"
              onClick={nextStep}
              className="bg-ring hover:bg-ring/90 text-primary-foreground flex items-center justify-center gap-2 h-11 px-6 text-[14px] font-medium rounded-[8px] cursor-pointer border-0 shadow-sm"
            >
              {step === 5 ? "Preview Application" : "Continue"}
              <ChevronRight className="size-4 ml-1" />
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
    <Card className="bg-card border border-border rounded-[8px] shadow-sm overflow-hidden w-full">
      <CardHeader className="border-b border-input px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
          </div>
          <div>
            <CardTitle className="text-[18px] font-medium text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-[14px] text-muted-foreground font-normal mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  );
}
