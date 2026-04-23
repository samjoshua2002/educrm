"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
    Briefcase
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- Schema Definition ---

const applicationSchema = z.object({
    personal: z.object({
        firstName: z.string().min(2, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email address"),
        phone: z.string().min(10, "Valid phone number required"),
        gender: z.string().min(1, "Please select gender"),
        dob: z.string().min(1, "Date of birth is required"),
        nationality: z.string().min(1, "Nationality is required"),
        category: z.string().optional(),
    }),
    academic: z.object({
        tenthBoard: z.string().min(1, "10th Board is required"),
        tenthPercentage: z.string().min(1, "10th Percentage is required"),
        twelfthBoard: z.string().min(1, "12th Board is required"),
        twelfthPercentage: z.string().min(1, "12th Percentage is required"),
        entranceExam: z.string().optional(),
        entranceScore: z.string().optional(),
    }),
    family: z.object({
        fatherName: z.string().min(1, "Father's name is required"),
        motherName: z.string().min(1, "Mother's name is required"),
        income: z.string().min(1, "Annual income is required"),
        address: z.string().min(5, "Address is required"),
        experience: z.string().optional(),
    }),
    declaration: z.object({
        motivation: z.string().min(10, "Please provide your motivation"),
        medical: z.string().optional(),
        agreed: z.boolean().refine(val => val === true, "You must agree to the declaration"),
    })
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

// --- Components ---

const Stepper = ({ currentStep }: { currentStep: number }) => {
    const steps = [
        { title: "Personal", icon: <User className="size-4" />, description: "Identity" },
        { title: "Academic", icon: <School className="size-4" />, description: "Education" },
        { title: "Family", icon: <History className="size-4" />, description: "Background" },
        { title: "Review", icon: <ClipboardCheck className="size-4" />, description: "Submit" },
    ];

    return (
        <div className="w-full max-w-3xl mx-auto mb-16 px-4">
            <div className="relative flex justify-between items-start">
                <div className="absolute top-5 left-0 w-full h-[2px] bg-muted -translate-y-1/2 z-0">
                    <div
                        className="h-full bg-primary transition-all duration-700 ease-in-out"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />
                </div>

                {steps.map((step, idx) => {
                    const isActive = currentStep === idx + 1;
                    const isCompleted = currentStep > idx + 1;

                    return (
                        <div key={idx} className="relative z-10 flex flex-col items-center group">
                            <div
                                className={`flex items-center justify-center size-10 rounded-full border-2 transition-all duration-500 ring-4 ring-background shadow-sm ${isActive
                                    ? "bg-primary border-primary text-primary-foreground scale-125 shadow-primary/20 shadow-xl"
                                    : isCompleted
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-background border-muted text-muted-foreground"
                                    }`}
                            >
                                {isCompleted ? <Check className="size-5" /> : step.icon}
                            </div>
                            <div className="mt-4 flex flex-col items-center text-center max-w-[80px]">
                                <span className={`text-[12px] font-bold tracking-tight transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                                    {step.title}
                                </span>
                                <span className="text-[9px] uppercase font-bold text-muted-foreground/40 hidden md:block tracking-widest mt-0.5">
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

    const form = useForm<ApplicationFormValues>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            personal: { firstName: "", lastName: "", email: "", phone: "", gender: "", dob: "", nationality: "Indian", category: "General" },
            academic: { tenthBoard: "", tenthPercentage: "", twelfthBoard: "", twelfthPercentage: "", entranceExam: "CAT", entranceScore: "" },
            family: { fatherName: "", motherName: "", income: "", address: "", experience: "" },
            declaration: { motivation: "", medical: "", agreed: false }
        },
        mode: "onChange"
    });

    const nextStep = async () => {
        let fields: any[] = [];
        if (step === 1) fields = ["personal"];
        if (step === 2) fields = ["academic"];
        if (step === 3) fields = ["family"];
        if (step === 4) fields = ["declaration"];

        const isValid = await form.trigger(fields as any);
        if (isValid) {
            if (step < 4) setStep(step + 1);
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
        console.log("Form Submitted:", data);
        alert("Application submitted successfully!");
    };

    if (isPreview) {
        return (
            <div className="max-w-[900px] mx-auto py-12 px-6 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <Badge variant="outline" className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/20 rounded-full">
                            Step 5: Review Submission
                        </Badge>
                        <h1 className="text-4xl font-black tracking-tighter text-foreground">Preview Application</h1>
                        <p className="text-muted-foreground text-lg font-medium">Please verify all information before finalizing.</p>
                    </div>
                    <Button variant="outline" size="lg" className="rounded-2xl border-dashed h-14 px-8 border-muted-foreground/30 hover:border-primary transition-all" onClick={() => setIsPreview(false)}>
                        <Edit2 className="size-4 mr-2" />
                        Edit Details
                    </Button>
                </div>

                <div className="space-y-10">
                    <SectionPreview title="Personal Details" icon={<User className="size-4" />}>
                        <div className="flex flex-col md:flex-row gap-12">
                            <div className="flex-shrink-0 mx-auto md:mx-0">
                                <div className="relative size-44 rounded-[2rem] border-4 border-background bg-muted shadow-2xl overflow-hidden ring-1 ring-muted">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
                                            <User className="size-20" />
                                            <span className="text-[9px] mt-2 font-bold tracking-widest">NO PHOTO</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12 flex-grow pt-4">
                                <PreviewField label="Full Name" value={`${form.getValues("personal.firstName")} ${form.getValues("personal.lastName")}`} />
                                <PreviewField label="Email ID" value={form.getValues("personal.email")} />
                                <PreviewField label="Phone No" value={form.getValues("personal.phone")} />
                                <PreviewField label="Gender" value={form.getValues("personal.gender")} />
                                <PreviewField label="Date of Birth" value={form.getValues("personal.dob")} />
                                <PreviewField label="Nationality" value={form.getValues("personal.nationality")} />
                            </div>
                        </div>
                    </SectionPreview>

                    <div className="grid md:grid-cols-2 gap-10">
                        <SectionPreview title="Academic Identity" icon={<School className="size-4" />}>
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6 p-6 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
                                    <PreviewField label="10th Mark (%)" value={`${form.getValues("academic.tenthPercentage")}%`} />
                                    <PreviewField label="12th Mark (%)" value={`${form.getValues("academic.twelfthPercentage")}%`} />
                                </div>
                                <div>
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-4 block opacity-50">Exam Qualification</Label>
                                    <div className="flex items-center gap-6">
                                        <Badge className="bg-foreground text-background py-1.5 px-4 rounded-xl text-xs font-bold leading-none">{form.getValues("academic.entranceExam")}</Badge>
                                        <span className="text-2xl font-black tracking-tighter leading-none">{form.getValues("academic.entranceScore")} SCORED</span>
                                    </div>
                                </div>
                            </div>
                        </SectionPreview>

                        <SectionPreview title="Background & Identity" icon={<History className="size-4" />}>
                            <div className="space-y-8">
                                <div className="grid gap-6">
                                    <PreviewField label="Father's Name" value={form.getValues("family.fatherName")} />
                                    <PreviewField label="Mother's Name" value={form.getValues("family.motherName")} />
                                </div>
                                <Separator className="opacity-50" />
                                <div className="flex items-center gap-3">
                                    <Briefcase className="size-4 text-muted-foreground opacity-40" />
                                    <PreviewField label="Professional Experience" value={form.getValues("family.experience") || "FRESH GRADUATE"} />
                                </div>
                            </div>
                        </SectionPreview>
                    </div>

                    <SectionPreview title="Statement of Purpose" icon={<ClipboardCheck className="size-4" />}>
                        <div className="space-y-6">
                            <div className="relative">
                                <div className="absolute -top-3 -left-3 text-primary/10 select-none">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14H15.017C13.9124 14 13.017 13.1046 13.017 12V6C13.017 4.89543 13.9124 4 15.017 4H21.017C22.1216 4 23.017 4.89543 23.017 6V12C23.017 13.1046 22.1216 14 21.017 14V16C21.017 18.7614 18.7784 21 16.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017V14H4.017C2.91243 14 2.017 13.1046 2.017 12V6C2.017 4.89543 2.91243 4 4.017 4H10.017C11.1216 4 12.017 4.89543 12.017 6V12C12.017 13.1046 11.1216 14 10.017 14V16C10.017 18.7614 7.77843 21 5.017 21H3.017Z" /></svg>
                                </div>
                                <p className="text-[15px] leading-relaxed font-medium text-foreground/80 bg-muted/30 p-8 rounded-[2rem] border border-muted italic relative z-10">
                                    {form.getValues("declaration.motivation")}
                                </p>
                            </div>
                        </div>
                    </SectionPreview>
                </div>

                <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-8">
                    <Button variant="ghost" className="font-bold text-muted-foreground hover:text-foreground" onClick={() => setIsPreview(false)}>
                        Back to edit
                    </Button>
                    <Button size="lg" className="h-16 px-20 bg-primary text-primary-foreground font-black text-xl rounded-2xl shadow-[0_20px_40px_-15px_rgba(var(--primary),0.3)] hover:scale-[1.05] active:scale-[0.98] transition-all" onClick={form.handleSubmit(onSubmit)}>
                        SUBMIT APPLICATION
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[900px] mx-auto py-20 px-6">
            <div className="flex flex-col items-center text-center mb-20 space-y-6">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                    Admission Cycle 2025
                </Badge>
                <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-foreground leading-[1.1]">
                    Start your <span className="text-primary italic relative">future<span className="absolute -bottom-2 left-0 w-full h-1 bg-primary/20 rounded-full"></span></span> today.
                </h1>
                <p className="text-muted-foreground text-lg max-w-lg font-medium leading-relaxed opacity-80">
                    Begin your academic journey by providing your details. Everything you enter is encrypted and secure.
                </p>
            </div>

            <Stepper currentStep={step} />

            <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()} className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="grid gap-12">
                        {step === 1 && (
                            <StepCard
                                title="Personal Information"
                                description="Your identity forms the core of your application."
                                icon={<User className="size-5" />}
                            >
                                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[3rem] bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden group">
                                    <input type="file" id="photo-upload" className="hidden" accept="image/*" onChange={handleImageChange} />
                                    <label htmlFor="photo-upload" className="flex flex-col items-center cursor-pointer w-full text-center">
                                        {imagePreview ? (
                                            <div className="relative size-44 rounded-[2.5rem] overflow-hidden border-4 border-background shadow-2xl ring-1 ring-primary/20 group-hover:scale-105 transition-transform duration-500">
                                                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <Camera className="size-10 text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="size-36 rounded-[2.5rem] bg-background shadow-inner flex flex-col items-center justify-center border-t border-l group-hover:shadow-primary/5 transition-all">
                                                <Upload className="size-12 mb-3 text-muted-foreground opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">Upload Photo</span>
                                            </div>
                                        )}
                                        <div className="mt-8 space-y-1">
                                            <span className="text-sm font-black block text-foreground/80 tracking-tight">Official Portrait</span>
                                            <span className="text-[11px] text-muted-foreground font-medium opacity-60">High resolution JPG or PNG only.</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10 mt-12">
                                    <FormField control={form.control} name="personal.firstName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">First Name</FormLabel>
                                            <FormControl><Input placeholder="John" className="h-14 rounded-2xl bg-background/50 focus:bg-background transition-all border-muted shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="personal.lastName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Last Name</FormLabel>
                                            <FormControl><Input placeholder="Doe" className="h-14 rounded-2xl bg-background/50 focus:bg-background border-muted shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="personal.email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Email Address</FormLabel>
                                            <FormControl><Input placeholder="john@university.edu" className="h-14 rounded-2xl bg-background/50 focus:bg-background border-muted shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="personal.phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Mobile</FormLabel>
                                            <FormControl><Input placeholder="+1 (555) 000-0000" className="h-14 rounded-2xl bg-background/50 focus:bg-background border-muted shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="personal.gender" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Self-Id Gender</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-14 rounded-2xl bg-background/50 border-muted shadow-sm"><SelectValue placeholder="Select Identity" /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-2xl shadow-2xl border-muted"><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="non-binary">Non-Binary</SelectItem></SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="personal.dob" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Date of Birth</FormLabel>
                                            <FormControl><Input type="date" className="h-14 rounded-2xl bg-background/50 border-muted shadow-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </StepCard>
                        )}

                        {step === 2 && (
                            <StepCard
                                title="Academic Qualifications"
                                description="Academic excellence is highly valued in our admissions process."
                                icon={<School className="size-5" />}
                            >
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <FormField control={form.control} name="academic.tenthPercentage" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Grade 10 Marks (%)</FormLabel>
                                                <FormControl><Input placeholder="00.00" className="h-14 rounded-2xl border-muted" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="academic.twelfthPercentage" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Grade 12 Marks (%)</FormLabel>
                                                <FormControl><Input placeholder="00.00" className="h-14 rounded-2xl border-muted" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <div className="p-10 rounded-[2.5rem] bg-muted/20 border border-muted/50 shadow-inner relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 text-foreground opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                                            <School className="size-48" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-8">
                                            <h3 className="text-xl font-black tracking-tight">National Entrance Examination</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                            <FormField control={form.control} name="academic.entranceExam" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-60">Examination Board</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger className="h-14 rounded-2xl bg-background border-muted"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent className="rounded-2xl"><SelectItem value="CAT">GMAT / CAT</SelectItem><SelectItem value="GRE">GRE / MAT</SelectItem><SelectItem value="XAT">XAT</SelectItem><SelectItem value="CMAT">CMAT</SelectItem></SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="academic.entranceScore" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-60">Scored Percentile</FormLabel>
                                                    <FormControl><Input placeholder="00.00" className="h-14 rounded-2xl bg-background border-muted" {...field} /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                </div>
                            </StepCard>
                        )}

                        {step === 3 && (
                            <StepCard
                                title="Family & Experience"
                                description="We care about your background and professional journey."
                                icon={<History className="size-5" />}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                                    <FormField control={form.control} name="family.fatherName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Father's Full Name</FormLabel>
                                            <FormControl><Input className="h-14 rounded-2xl border-muted bg-background/50" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="family.motherName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Mother's Full Name</FormLabel>
                                            <FormControl><Input className="h-14 rounded-2xl border-muted bg-background/50" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="mt-10 grid gap-10">
                                    <FormField control={form.control} name="family.experience" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50 flex items-center gap-2">Professional Experience <Badge variant="secondary" className="text-[8px] tracking-normal font-bold">Optional</Badge></FormLabel>
                                            <FormControl><Input placeholder="Years of exp / Job Title" className="h-14 rounded-2xl border-muted bg-background/50" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="family.address" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">Primary Residence Address</FormLabel>
                                            <FormControl><Textarea className="min-h-[140px] rounded-[1.5rem] border-muted bg-background/50 p-6 leading-relaxed" placeholder="Street name, Building, City, ZIP..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </StepCard>
                        )}

                        {step === 4 && (
                            <StepCard
                                title="Statement of Purpose"
                                description="Final statements and certifications. This is your chance to shine."
                                icon={<ClipboardCheck className="size-5" />}
                            >
                                <div className="space-y-10">
                                    <FormField control={form.control} name="declaration.motivation" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase font-black tracking-widest opacity-60 leading-normal">
                                                What unique value will you bring to our campus and community?
                                            </FormLabel>
                                            <FormControl><Textarea className="min-h-[250px] rounded-[2rem] p-8 text-base bg-background/50 border-muted shadow-inner leading-relaxed" placeholder="Tell us your story..." {...field} /></FormControl>
                                            <FormDescription className="text-[10px] font-bold italic text-muted-foreground/60">Minimum 10 words, be authentic.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="declaration.agreed" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-6 border-2 border-primary/20 p-10 rounded-[2.5rem] bg-primary/5 shadow-xl shadow-primary/[0.02] relative group">
                                            <div className="absolute inset-0 bg-white dark:bg-black opacity-0 group-hover:opacity-[0.02] transition-opacity"></div>
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    className="size-7 rounded-xl data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all scale-110"
                                                />
                                            </FormControl>
                                            <div className="space-y-2 leading-tight">
                                                <Label className="text-sm font-black text-foreground/90 cursor-pointer block">I certify that all information is true.</Label>
                                                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed max-w-md">By electronic signature, you acknowledge that any false information will result in immediate disqualification from the admission cycle.</p>
                                                <FormMessage className="pt-2" />
                                            </div>
                                        </FormItem>
                                    )} />
                                </div>
                            </StepCard>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-16">
                        <Button
                            type="button"
                            variant="ghost"
                            size="lg"
                            onClick={prevStep}
                            className={`size-14 rounded-2xl font-bold transition-opacity ${step === 1 ? "invisible" : "opacity-100"}`}
                        >
                            <ChevronLeft className="size-6" />
                        </Button>
                        <Button
                            type="button"
                            size="lg"
                            onClick={nextStep}
                            className="size-16 rounded-[1.25rem] bg-foreground text-background hover:bg-foreground/90 font-black shadow-2xl shadow-foreground/10 hover:scale-[1.05] active:scale-[0.95] transition-all"
                        >
                            <ChevronRight className="size-6" />
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

// --- Helper Components ---

function StepCard({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card className="border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] rounded-[3.5rem] bg-card/60 backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden">
            <div className="p-10 md:p-14">
                <div className="flex items-start gap-6 mb-12">
                    <div className="size-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner relative group">
                        <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-pulse group-hover:animate-none"></div>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter leading-tight">{title}</h2>
                        <p className="text-muted-foreground font-medium mt-1 leading-relaxed opacity-70">{description}</p>
                    </div>
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
                    {children}
                </div>
            </div>
        </Card>
    );
}

function SectionPreview({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-card/60 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
            <div className="bg-primary/5 px-10 py-5 border-b border-primary/5 flex items-center gap-4">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">{icon}</div>
                <h3 className="font-black text-[11px] uppercase tracking-[0.25em] text-primary/70">{title}</h3>
            </div>
            <div className="p-10">{children}</div>
        </Card>
    );
}

function PreviewField({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest opacity-40">{label}</Label>
            <p className="font-bold text-[15px] tracking-tight text-foreground/90 break-words">{value || "—"}</p>
        </div>
    );
}
