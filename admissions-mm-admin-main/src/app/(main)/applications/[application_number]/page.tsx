/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"] });

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  GraduationCap,
  Award,
  Download,
  Printer,
  FileText,
  Briefcase,
  Activity,
  CheckCircle2,
  FileDigit,
  Building,
  Pencil,
  ExternalLink,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useApplication, useUpdateApplication } from "@/hooks/use-applications";
import { gdInterviews } from "@/data/mock-gd-interviews";
import { toast } from "sonner";

export default function ApplicationDetailsPage() {
  const params = useParams();
  const applicationNumber = params.application_number as string;
  const { data: appData, isLoading } = useApplication(applicationNumber);
  const updateMutation = useUpdateApplication();

  const hasGDInterview = React.useMemo(() => {
    return gdInterviews.some(
      (item) => item.applicationNo === applicationNumber,
    );
  }, [applicationNumber]);

  const [activeEditSection, setActiveEditSection] = React.useState<
    | "personal"
    | "preferences"
    | "education"
    | "entrance"
    | "parents"
    | "additional"
    | "contact"
    | null
  >(null);

  const handleSave = (updatedData: any) => {
    updateMutation.mutate({
      applicationNo: applicationNumber,
      data: updatedData,
    });
    setActiveEditSection(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-[#2563EA] border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading application details...
          </p>
        </div>
      </div>
    );
  }

  if (!appData) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white">
        <p className="text-sm text-red-500 font-medium">
          Application not found.
        </p>
      </div>
    );
  }

  const applicationData = appData;

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full bg-white">
      {/* Hero Banner Card */}
      {/* Hero Banner Card */}
      {/* Hero Banner Card */}
      <div className="relative grid grid-cols-[auto_1fr] w-full p-[24px] gap-y-[6px] gap-x-[16px] md:gap-x-[32px] rounded-[8px] border border-[#D4D4D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <Link
          href="/applications"
          className="absolute top-3 left-3 hover:opacity-80 transition-opacity p-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="11.667"
            viewBox="0 0 17 14"
            fill="none"
          >
            <path
              d="M6.66671 12.4999L0.833374 6.66658M0.833374 6.66658L6.66671 0.833252M0.833374 6.66658H15.8334"
              stroke="#64748B"
              strokeWidth="1.667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-100 shadow-xs shrink-0 col-start-1 row-start-1 md:row-span-2 mt-2 md:mt-0">
          <AvatarImage
            src={applicationData.applicant.photo}
            alt={applicationData.applicant.name}
          />
          <AvatarFallback className="text-xl font-bold">
            {applicationData.applicant.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* Name & Status */}
        <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight break-words">
            {applicationData.applicant.name}
          </h2>
          <div className="flex">
            <Badge
              variant="secondary"
              className="text-[10px] md:text-xs px-2.5 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] font-bold uppercase hover:bg-[#EFF6FF] rounded-[10px]"
              style={{ letterSpacing: "1px" }}
            >
              {applicationData.status}
            </Badge>
          </div>
        </div>

        {/* Details & Buttons Row */}
        <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col lg:flex-row lg:items-center justify-between gap-y-3 text-[12px] font-normal leading-[20px] text-[#1E293B] w-full mt-2 md:mt-0">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <span className="flex items-center gap-1.5 shrink-0">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 text-[#415876]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.41 9.58L10.41 0.580001C10.035 0.20808 9.52815 -0.000420824 9 6.37713e-07H2C1.46957 6.37713e-07 0.96086 0.210714 0.585787 0.585787C0.210714 0.96086 6.2793e-07 1.46957 6.2793e-07 2V9C-0.000208492 9.26391 0.0518167 9.52526 0.153078 9.76897C0.254338 10.0127 0.402832 10.2339 0.590001 10.42L9.59 19.42C9.96498 19.7919 10.4719 20.0004 11 20C11.5296 19.9978 12.0367 19.7856 12.41 19.41L19.41 12.41C19.7856 12.0367 19.9978 11.5296 20 11C20.0002 10.7361 19.9482 10.4747 19.8469 10.231C19.7457 9.98732 19.5972 9.76606 19.41 9.58ZM11 18L2 9V2H9L18 11M4.5 3C4.79667 3 5.08668 3.08797 5.33336 3.2528C5.58003 3.41762 5.77229 3.65189 5.88582 3.92598C5.99935 4.20006 6.02906 4.50166 5.97118 4.79264C5.9133 5.08361 5.77044 5.35088 5.56066 5.56066C5.35088 5.77044 5.08361 5.9133 4.79264 5.97118C4.50166 6.02906 4.20006 5.99935 3.92598 5.88582C3.65189 5.77229 3.41762 5.58003 3.2528 5.33336C3.08797 5.08668 3 4.79667 3 4.5C3 4.10218 3.15804 3.72064 3.43934 3.43934C3.72064 3.15804 4.10218 3 4.5 3Z"
                  fill="currentColor"
                />
              </svg>
              App No: {applicationData.applicationNo}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <svg
                viewBox="0 0 20 16"
                fill="none"
                className="h-4 w-4 text-[#415876]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196667 15.0217 0.000666667 14.5507 0 14V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 14.55 19.8043 15.021 19.413 15.413C19.0217 15.805 18.5507 16.0007 18 16H2ZM10 9L18 4V2L10 7L2 2V4L10 9Z"
                  fill="currentColor"
                />
              </svg>
              {applicationData.applicant.email}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-[#415876]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.95 21C17.8667 21 15.8083 20.546 13.775 19.638C11.7417 18.73 9.89167 17.4423 8.225 15.775C6.55833 14.1077 5.271 12.2577 4.363 10.225C3.455 8.19233 3.00067 6.134 3 4.05C3 3.75 3.1 3.5 3.3 3.3C3.5 3.1 3.75 3 4.05 3H8.1C8.33333 3 8.54167 3.07933 8.725 3.238C8.90833 3.39667 9.01667 3.584 9.05 3.8L9.7 7.3C9.73333 7.56667 9.725 7.79167 9.675 7.975C9.625 8.15833 9.53333 8.31667 9.4 8.45L6.975 10.9C7.30833 11.5167 7.704 12.1123 8.162 12.687C8.62 13.2617 9.12433 13.816 9.675 14.35C10.1917 14.8667 10.7333 15.346 11.3 15.788C11.8667 16.23 12.4667 16.634 13.1 17L15.45 14.65C15.6 14.5 15.796 14.3877 16.038 14.313C16.28 14.2383 16.5173 14.2173 16.75 14.25L20.2 14.95C20.4333 15.0167 20.625 15.1377 20.775 15.313C20.925 15.4883 21 15.684 21 15.9V19.95C21 20.25 20.9 20.5 20.7 20.7C20.5 20.9 20.25 21 19.95 21Z"
                  fill="currentColor"
                />
              </svg>
              {applicationData.applicant.primaryMobile}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[15px] shrink-0 w-full sm:w-auto lg:ml-auto mt-2 lg:mt-0">
            {hasGDInterview ? (
              <Button
                asChild
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <Link href={`/gd-interview/${applicationData.applicationNo}`}>
                  GD AND INTERVIEWS
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  toast.error(
                    `GD & Interview is not assigned to ${applicationData.applicant.name}.`,
                  );
                }}
                className="bg-slate-100 hover:bg-slate-100 text-slate-400 border border-slate-200 font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs cursor-not-allowed shrink-0 w-full sm:w-auto"
              >
                GD NOT ASSIGNED
                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
              </Button>
            )}
            <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto">
              COMMUNICATION
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1/3) - Personal & Contact Details */}
        <div className="space-y-6 lg:col-span-1">
          {/* Personal Information */}
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5 text-[#415876]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.3334 5.83333C13.3334 7.67305 11.8398 9.16667 10.0001 9.16667C8.16036 9.16667 6.66675 7.67305 6.66675 5.83333C6.66675 3.99362 8.16036 2.5 10.0001 2.5C11.8398 2.5 13.3334 3.99362 13.3334 5.83333V5.83333M10.0001 11.6667C6.78058 11.6667 4.16675 14.2805 4.16675 17.5H15.8334C15.8334 14.2805 13.2196 11.6667 10.0001 11.6667V11.6667"
                    stroke="currentColor"
                  />
                </svg>
                Personal Details
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("personal")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Gender
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {applicationData.applicant.gender}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Date of Birth
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {applicationData.applicant.dob}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Category
                  </span>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-[#F1F5F9] text-[#1E293B] rounded">
                      {applicationData.applicant.category}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Religion
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {applicationData.applicant.religion}
                  </p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Aadhaar Number
                  </span>
                  <p className="font-semibold text-[#1E293B] tracking-wider text-base">
                    {applicationData.applicant.aadhaar.replace(
                      /(\d{4})(\d{4})(\d{4})/,
                      "$1 $2 $3",
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Nationality
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {applicationData.applicant.nationality}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#70859F] uppercase tracking-wider">
                    Marital Status
                  </span>
                  <p className="font-semibold text-[#1E293B]">
                    {applicationData.applicant.maritalStatus}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <MapPin className="h-4 w-4 text-[#415876]" />
                Contact Information
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("contact")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-start gap-6 self-stretch">
              <div className="flex flex-col gap-[7.125px] w-full">
                <h4
                  className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#94A3B8] self-stretch`}
                >
                  COMMUNICATION
                </h4>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span
                      className={`${manrope.className} text-sm font-normal text-[#64748B] leading-5`}
                    >
                      Primary Mobile
                    </span>
                    <span
                      className={`${manrope.className} text-sm font-bold text-[#1E293B] leading-5`}
                    >
                      {applicationData.applicant.primaryMobile}
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span
                      className={`${manrope.className} text-sm font-normal text-[#64748B] leading-5`}
                    >
                      Alt Mobile
                    </span>
                    <span
                      className={`${manrope.className} text-sm font-bold text-[#1E293B] leading-5`}
                    >
                      {applicationData.applicant.alternateMobile}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col items-start gap-[7.125px] self-stretch border-t border-[#F8FAFC]">
                <h4
                  className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#94A3B8] self-stretch`}
                >
                  PRESENT ADDRESS
                </h4>
                <p
                  className={`${manrope.className} text-[14px] font-normal leading-[22.75px] text-[#475569]`}
                >
                  {applicationData.address.present}
                </p>
              </div>

              <div className="pt-4 flex flex-col items-start gap-[7.125px] self-stretch border-t border-[#F8FAFC]">
                <div className="flex items-center justify-between w-full">
                  <h4
                    className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#94A3B8] self-stretch`}
                  >
                    PERMANENT ADDRESS
                  </h4>
                  <Badge
                    variant="secondary"
                    className="text-[9px] font-bold bg-[#1A237E]/[0.05] text-[#1A237E] hover:bg-[#1A237E]/[0.05] rounded-[4px] px-2 py-[2px] border-0 flex flex-col items-start"
                  >
                    SAME AS PRESENT
                  </Badge>
                </div>
                <p
                  className={`${manrope.className} text-[14px] font-normal leading-[22.75px] text-[#475569]`}
                >
                  {applicationData.address.permanent}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2/3) - Academic, Tests, Parents, Extra */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <svg
                  viewBox="0 0 15 16"
                  fill="none"
                  className="h-[15px] w-[15px] text-[#1E293B]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.3333 15.4165V2.08317C13.3333 1.1627 12.5871 0.416504 11.6667 0.416504H3.33333C2.41286 0.416504 1.66667 1.1627 1.66667 2.08317V15.4165M13.3333 15.4165H15M13.3333 15.4165H9.16667M1.66667 15.4165H0M1.66667 15.4165H5.83333M5 3.74984H5.83333M5 7.08317H5.83333M9.16667 3.74984H10M9.16667 7.08317H10M5.83333 15.4165V11.2498C5.83333 10.7896 6.20643 10.4165 6.66667 10.4165H8.33333C8.79357 10.4165 9.16667 10.7896 9.16667 11.2498V15.4165M5.83333 15.4165H9.16667"
                    stroke="currentColor"
                    strokeWidth="0.833333"
                  />
                </svg>
                Course and Campus Preferences
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("preferences")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5 p-4 bg-[#F8FAFC] rounded-lg border border-slate-100">
                  <span
                    className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[-0.5px] uppercase text-[#1A237E]`}
                  >
                    Preference 1
                  </span>
                  <span className="font-bold text-slate-800 text-base">
                    {applicationData.preferences.preference1}
                  </span>
                </div>
                <div className="flex flex-col space-y-1.5 p-4 bg-[#F8FAFC] rounded-lg border border-slate-100">
                  <span className="font-sans text-[10px] font-bold leading-[15px] tracking-[-0.5px] uppercase text-[#64748B]">
                    Preference 2
                  </span>
                  <span className="font-bold text-slate-800 text-base">
                    {applicationData.preferences.preference2}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5 text-[#415876]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 11.6668L17.5 7.50016L10 3.3335L2.5 7.50016L10 11.6668V11.6668M10 11.6668L15.1333 8.81516C15.8088 10.5302 16.0005 12.3978 15.6875 14.2143C13.5738 14.4195 11.581 15.2948 10 16.7127C8.41921 15.295 6.42674 14.4197 4.31333 14.2143C4.00017 12.3978 4.19186 10.5302 4.8675 8.81516L10 11.6668V11.6668M6.66667 16.6668V10.4168L10 8.56516"
                    stroke="currentColor"
                    strokeWidth="0.833333"
                  />
                </svg>
                Educational Details
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("education")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] pl-5 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                        Level
                      </TableHead>
                      <TableHead className="px-4 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                        Institute Name
                      </TableHead>
                      <TableHead className="px-4 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                        Board / Stream
                      </TableHead>
                      <TableHead className="px-4 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                        Year
                      </TableHead>
                      <TableHead className="pr-5 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] text-right">
                        Percentage
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700 pl-5 py-4">
                        10th
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-normal px-4 py-4 max-w-[250px]">
                        {applicationData.education.tenth.institute}
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-normal px-4 py-4 max-w-[250px]">
                        {applicationData.education.tenth.board}
                      </TableCell>
                      <TableCell className="text-slate-600 px-4 py-4">
                        {applicationData.education.tenth.year}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 pr-5 py-4">
                        {applicationData.education.tenth.percentage}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700 pl-5 py-4">
                        12th
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-normal px-4 py-4 max-w-[250px]">
                        {applicationData.education.twelfth.institute}
                      </TableCell>
                      <TableCell className="px-4 py-4 whitespace-normal max-w-[250px]">
                        <div className="flex flex-col">
                          <span className="text-slate-600">
                            {applicationData.education.twelfth.board}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {applicationData.education.twelfth.stream}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 px-4 py-4">
                        {applicationData.education.twelfth.year}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-[#10B981] pr-5 py-4">
                        {applicationData.education.twelfth.percentage}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="p-6">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Under-Graduation Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-4">
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                      Degree
                    </span>
                    <p className="font-bold text-slate-800 text-sm">
                      {applicationData.education.graduation.degree}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                      Institution
                    </span>
                    <p className="font-bold text-slate-800 text-sm">
                      {applicationData.education.graduation.college}
                    </p>
                    <p className="text-xs text-slate-500">
                      {applicationData.education.graduation.university}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                      Academic Status
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className="bg-[#FEF3C7] text-[#D97706] border-[#FDE68A] font-semibold text-[10px] rounded px-1.5 py-0.5"
                      >
                        {applicationData.education.graduation.status}
                      </Badge>
                      <span className="text-xs text-slate-500 font-medium">
                        ({applicationData.education.graduation.passingYear})
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                      Score till last sem
                    </span>
                    <p className="font-extrabold text-lg text-[#EF4444]">
                      {applicationData.education.graduation.percentageTillLast}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">
                      Mode
                    </span>
                    <p className="font-bold text-slate-800 text-sm">
                      {applicationData.education.graduation.mode}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5 text-[#415876]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.50008 4.16667H5.83341C4.91294 4.16667 4.16675 4.91286 4.16675 5.83333V15.8333C4.16675 16.7538 4.91294 17.5 5.83341 17.5H14.1667C15.0872 17.5 15.8334 16.7538 15.8334 15.8333V5.83333C15.8334 4.91286 15.0872 4.16667 14.1667 4.16667H12.5001M7.50008 4.16667C7.50008 5.08714 8.24627 5.83333 9.16675 5.83333H10.8334C11.7539 5.83333 12.5001 5.08714 12.5001 4.16667M7.50008 4.16667C7.50008 3.24619 8.24627 2.5 9.16675 2.5H10.8334C11.7539 2.5 12.5001 3.24619 12.5001 4.16667M10.0001 10H12.5001M10.0001 13.3333H12.5001M7.50008 10H7.50841M7.50008 13.3333H7.50841"
                    stroke="currentColor"
                    strokeWidth="0.833333"
                  />
                </svg>
                Entrance Test Details
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("entrance")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-start self-stretch">
              <Table>
                <TableHeader className="bg-transparent">
                  <TableRow>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] w-[86.58px] pl-[1px] pr-[1px]">
                      Exam
                    </TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] px-4">
                      Roll No
                    </TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] px-4">
                      Month
                    </TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] px-4">
                      Status
                    </TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] text-right pr-5">
                      Percentile
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationData.entranceTests.map((test, index) => (
                    <TableRow
                      key={index}
                      className={
                        test.percentile !== "-" ? "bg-[#EFF6FF]/20" : ""
                      }
                    >
                      <TableCell className="p-[12px_1px_13px_1px] w-[86.58px]">
                        <div className="flex flex-col items-start font-bold text-slate-800">
                          {test.exam}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`p-[12px_16px_13px_16px] ${test.rollNo !== "-"
                          ? "font-mono text-sm text-slate-700"
                          : "text-slate-400"
                          }`}
                      >
                        {test.rollNo}
                      </TableCell>
                      <TableCell
                        className={`p-[12px_16px_13px_16px] ${test.month !== "-"
                          ? "text-slate-700"
                          : "text-slate-400"
                          }`}
                      >
                        {test.month}
                      </TableCell>
                      <TableCell className="p-[12px_16px_13px_16px]">
                        {test.status !== "-" ? (
                          <Badge
                            variant="outline"
                            className={`${manrope.className} bg-[#D1FAE5] text-[#16A34A] border-[#A7F3D0] font-bold text-[10px] rounded px-1.5 py-0.5 leading-[20px]`}
                          >
                            {test.status}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 p-[12px_20px_13px_16px]">
                        {test.percentile}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5 aspect-square text-[#415876]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.7031 6.5625C15.5886 8.15117 14.4101 9.375 13.1249 9.375C11.8398 9.375 10.6593 8.15156 10.5468 6.5625C10.4296 4.90977 11.5769 3.75 13.1249 3.75C14.673 3.75 15.8202 4.93984 15.7031 6.5625Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.1251 11.875C10.5794 11.875 8.13134 13.1395 7.51806 15.602C7.43681 15.9277 7.6411 16.25 7.97587 16.25H18.2747C18.6095 16.25 18.8126 15.9277 18.7325 15.602C18.1192 13.1 15.6712 11.875 13.1251 11.875Z"
                    stroke="currentColor"
                    strokeMiterlimit="10"
                  />
                  <path
                    d="M7.81238 7.26328C7.72098 8.53203 6.76863 9.53125 5.74207 9.53125C4.71551 9.53125 3.7616 8.53242 3.67176 7.26328C3.5784 5.94336 4.50535 5 5.74207 5C6.97879 5 7.90574 5.96758 7.81238 7.26328Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.04677 11.9531C7.34169 11.6301 6.56513 11.5059 5.74208 11.5059C3.71083 11.5059 1.7538 12.5156 1.26357 14.4824C1.19911 14.7426 1.36239 15 1.62958 15H6.01552"
                    stroke="currentColor"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                  />
                </svg>
                Parent&apos;s Details
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("parents")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Father Card */}
                <div className="border border-[#E5E5E5] rounded-lg p-4 bg-white flex h-[175px] items-start gap-4 justify-self-stretch w-full">
                  <div className="h-10 w-10 rounded bg-[#DBEAFE] text-[#1E40AF] flex items-center justify-center font-bold text-sm shrink-0">
                    Fa
                  </div>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-800 leading-tight">
                        {applicationData.parents.father.name}
                      </p>
                      <p className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                        FATHER
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                        PHONE
                      </span>
                      <p className="font-semibold text-sm text-slate-800">
                        {applicationData.parents.father.mobile}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                        OCCUPATION
                      </span>
                      <p className="font-semibold text-sm text-slate-800">
                        {applicationData.parents.father.occupation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mother Card */}
                <div className="border border-[#E5E5E5] rounded-lg p-4 bg-white flex h-[175px] items-start gap-4 justify-self-stretch w-full">
                  <div className="h-10 w-10 rounded bg-[#FCE7F3] text-[#9D174D] flex items-center justify-center font-bold text-sm shrink-0">
                    Mo
                  </div>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-800 leading-tight">
                        {applicationData.parents.mother.name}
                      </p>
                      <p className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                        MOTHER
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                        PHONE
                      </span>
                      <p className="font-semibold text-sm text-slate-800">
                        {applicationData.parents.mother.mobile}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                        OCCUPATION
                      </span>
                      <p className="font-semibold text-sm text-slate-800">
                        {applicationData.parents.mother.occupation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border border-slate-200 p-0 gap-0 overflow-hidden">
            <CardHeader
              className="flex flex-row items-center justify-between bg-[#FAFAFA] border-b border-[#E5E5E5] space-y-0 self-stretch"
              style={{ padding: "16px 20px 24px" }}
            >
              <CardTitle className="flex items-center gap-2 text-[16px] font-bold leading-[24px] text-[#1E293B] font-sans">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5 text-[#415876]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.5 3C14.0196 3 16.4359 4.00089 18.2175 5.78249C19.9991 7.56408 21 9.98044 21 12.5C21 15.0196 19.9991 17.4359 18.2175 19.2175C16.4359 20.9991 14.0196 22 11.5 22C8.98044 22 6.56408 20.9991 4.78249 19.2175C3.00089 17.4359 2 15.0196 2 12.5C2 9.98044 3.00089 7.56408 4.78249 5.78249C6.56408 4.00089 8.98044 3 11.5 3ZM11.5 4C9.24566 4 7.08365 4.89553 5.48959 6.48959C3.89553 8.08365 3 10.2457 3 12.5C3 14.7543 3.89553 16.9163 5.48959 18.5104C7.08365 20.1045 9.24566 21 11.5 21C12.6162 21 13.7215 20.7801 14.7528 20.353C15.7841 19.9258 16.7211 19.2997 17.5104 18.5104C18.2997 17.7211 18.9258 16.7841 19.353 15.7528C19.7801 14.7215 20 13.6162 20 12.5C20 10.2457 19.1045 8.08365 17.5104 6.48959C15.9163 4.89553 13.7543 4 11.5 4ZM11 7H12V12.42L16.7 15.13L16.2 16L11 13V7Z"
                    fill="currentColor"
                  />
                </svg>
                Additional Information
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer"
                onClick={() => setActiveEditSection("additional")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-[3.83px] h-[20px] rounded-full bg-[#1A237E] shrink-0 mt-[2px]" />
                  <h4 className="text-sm font-semibold text-[#1E293B] leading-tight">
                    What inspires you to pursue a PGDM/MBA program? What
                    motivates you to do it at XIME?
                  </h4>
                </div>
                <div className="flex flex-col items-start self-stretch p-4 rounded-r-[8px] rounded-l-none border-l-[4px] border-l-[#E2E8F0] bg-[#F8FAFC] text-slate-600 text-sm leading-relaxed">
                  &quot;{applicationData.other.inspiration}&quot;
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                    HOW DID YOU KNOW ABOUT US?
                  </span>
                  <p className="font-bold text-slate-800 text-sm">
                    {applicationData.other.source}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">
                    MEDICAL CONDITIONS
                  </span>
                  <p className="font-bold text-slate-800 text-sm">
                    {applicationData.other.medicalConditions}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={activeEditSection !== null}
        onOpenChange={(open) => !open && setActiveEditSection(null)}
      >
        <DialogContent
          className={
            activeEditSection === "personal" ||
              activeEditSection === "education" ||
              activeEditSection === "entrance" ||
              activeEditSection === "parents" ||
              activeEditSection === "contact"
              ? "max-w-[1000px] w-[95%] rounded-[12px] p-[24px] md:p-[32px] gap-0 bg-white max-h-[98vh] overflow-y-auto"
              : "max-w-[600px] w-[95%] rounded-[12px] p-[24px] md:p-[32px] gap-0 bg-white max-h-[98vh] overflow-y-auto"
          }
        >
          <DialogHeader className="flex flex-row items-center gap-2 pb-4 border-b border-[#E5E5E5] space-y-0">
            <div className="flex items-center justify-center h-[36px] w-[36px] rounded-full bg-[#FAFAFA] shrink-0">
              {activeEditSection === "personal" && (
                <User className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "preferences" && (
                <Building className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "education" && (
                <GraduationCap className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "entrance" && (
                <Award className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "parents" && (
                <User className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "additional" && (
                <FileText className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "contact" && (
                <MapPin className="h-4 w-4 text-[#415876]" />
              )}
            </div>
            <DialogTitle className="text-[#0A0A0A] font-semibold text-[20px] leading-8 tracking-[-0.24px] font-sans capitalize">
              {activeEditSection === "personal" && "Personal Details"}
              {activeEditSection === "preferences" &&
                "Course and Campus Preferences"}
              {activeEditSection === "education" && "Educational Details"}
              {activeEditSection === "entrance" && "Entrance Test Details"}
              {activeEditSection === "parents" && "Parent's Details"}
              {activeEditSection === "additional" && "Additional Information"}
              {activeEditSection === "contact" && "Contact Information"}
            </DialogTitle>
          </DialogHeader>

          {activeEditSection === "personal" && (
            <EditPersonalForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "preferences" && (
            <EditPreferencesForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "education" && (
            <EditEducationForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "entrance" && (
            <EditEntranceForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "parents" && (
            <EditParentsForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "additional" && (
            <EditAdditionalForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "contact" && (
            <EditContactForm
              appData={applicationData}
              onSave={handleSave}
              onClose={() => setActiveEditSection(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FormProps {
  appData: any;
  onSave: (updatedData: any) => void;
  onClose: () => void;
}

function EditPersonalForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    name: appData.applicant.name,
    email: appData.applicant.email,
    primaryMobile: appData.applicant.primaryMobile,
    gender: appData.applicant.gender,
    dob: appData.applicant.dob,
    category: appData.applicant.category,
    religion: appData.applicant.religion,
    aadhaar: appData.applicant.aadhaar,
    nationality: appData.applicant.nationality,
    maritalStatus: appData.applicant.maritalStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      applicant: {
        ...appData.applicant,
        name: formData.name,
        email: formData.email,
        primaryMobile: formData.primaryMobile,
        gender: formData.gender,
        dob: formData.dob,
        category: formData.category,
        religion: formData.religion,
        aadhaar: formData.aadhaar,
        nationality: formData.nationality,
        maritalStatus: formData.maritalStatus,
      },
    };
    onSave(updatedData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 pb-1"
    >
      {/* FULL NAME */}
      <div className="flex flex-col gap-2 col-span-2">
        <Label
          htmlFor="name"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Full Name
        </Label>
        <Input
          id="name"
          placeholder="e.g. Dr. Sarah Jenkins"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
          required
        />
      </div>

      {/* EMAIL ADDRESS */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="email"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Email Address
        </Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 17 14"
              fill="none"
              className="h-[14px] w-[17px] text-[#64748B]"
            >
              <path
                d="M1.66667 13.3333C1.20833 13.3333 0.815972 13.1701 0.489583 12.8438C0.163194 12.5174 0 12.125 0 11.6667V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H15C15.4583 0 15.8507 0.163194 16.1771 0.489583C16.5035 0.815972 16.6667 1.20833 16.6667 1.66667V11.6667C16.6667 12.125 16.5035 12.5174 16.1771 12.8438C15.8507 13.1701 15.4583 13.3333 15 13.3333H1.66667ZM8.33333 7.5L1.66667 3.33333V11.6667H15V3.33333L8.33333 7.5ZM8.33333 5.83333L15 1.66667H1.66667L8.33333 5.83333ZM1.66667 3.33333V1.66667V3.33333V11.6667V3.33333Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <Input
            id="email"
            type="email"
            placeholder="sarah.j@university.edu"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="pl-10 border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
            required
          />
        </div>
      </div>

      {/* PHONE NUMBER */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="primaryMobile"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Phone Number
        </Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 15 15"
              fill="none"
              className="h-[15px] w-[15px] text-[#64748B]"
            >
              <path
                d="M14.125 15C12.3889 15 10.6736 14.6215 8.97917 13.8646C7.28472 13.1076 5.74306 12.0347 4.35417 10.6458C2.96528 9.25694 1.89236 7.71528 1.13542 6.02083C0.378472 4.32639 0 2.61111 0 0.875C0 0.625 0.0833333 0.416667 0.25 0.25C0.416667 0.0833333 0.625 0 0.875 0H4.25C4.44444 0 4.61806 0.0659722 4.77083 0.197917C4.92361 0.329861 5.01389 0.486111 5.04167 0.666667L5.58333 3.58333C5.61111 3.80556 5.60417 3.99306 5.5625 4.14583C5.52083 4.29861 5.44444 4.43056 5.33333 4.54167L3.3125 6.58333C3.59028 7.09722 3.92014 7.59375 4.30208 8.07292C4.68403 8.55208 5.10417 9.01389 5.5625 9.45833C5.99306 9.88889 6.44444 10.2882 6.91667 10.6562C7.38889 11.0243 7.88889 11.3611 8.41667 11.6667L10.375 9.70833C10.5 9.58333 10.6632 9.48958 10.8646 9.42708C11.066 9.36458 11.2639 9.34722 11.4583 9.375L14.3333 9.95833C14.5278 10.0139 14.6875 10.1146 14.8125 10.2604C14.9375 10.4062 15 10.5694 15 10.75V14.125C15 14.375 14.9167 14.5833 14.75 14.75C14.5833 14.9167 14.375 15 14.125 15ZM2.52083 5L3.89583 3.625L3.54167 1.66667H1.6875C1.75694 2.23611 1.85417 2.79861 1.97917 3.35417C2.10417 3.90972 2.28472 4.45833 2.52083 5ZM9.97917 12.4583C10.5208 12.6944 11.0729 12.8819 11.6354 13.0208C12.1979 13.1597 12.7639 13.25 13.3333 13.2917V11.4583L11.375 11.0625L9.97917 12.4583Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <Input
            id="primaryMobile"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={formData.primaryMobile}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                primaryMobile: e.target.value,
              }))
            }
            className="pl-10 border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
            required
          />
        </div>
      </div>

      {/* GENDER */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="gender"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Gender
        </Label>
        <Select
          value={formData.gender}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, gender: val }))
          }
        >
          <SelectTrigger
            id="gender"
            className="w-full border-[#D4D4D4] bg-white text-slate-800 rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DATE OF BIRTH */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="dob"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Date of Birth
        </Label>
        <div className="relative">
          <Input
            id="dob"
            type="text"
            placeholder="Select Date"
            value={formData.dob}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, dob: e.target.value }))
            }
            className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px] pr-10"
            required
          />
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </span>
        </div>
      </div>

      {/* CATEGORY */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="category"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Category
        </Label>
        <Select
          value={formData.category}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, category: val }))
          }
        >
          <SelectTrigger
            id="category"
            className="w-full border-[#D4D4D4] bg-white text-slate-800 rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GEN">GEN</SelectItem>
            <SelectItem value="OBC">OBC</SelectItem>
            <SelectItem value="SC">SC</SelectItem>
            <SelectItem value="ST">ST</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* RELIGION */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="religion"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Religion
        </Label>
        <Select
          value={formData.religion}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, religion: val }))
          }
        >
          <SelectTrigger
            id="religion"
            className="w-full border-[#D4D4D4] bg-white text-slate-800 rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Select Religion" />
          </SelectTrigger>
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
      </div>

      {/* AADHAAR NUMBER */}
      <div className="flex flex-col gap-2 col-span-2">
        <Label
          htmlFor="aadhaar"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Aadhaar Number
        </Label>
        <Input
          id="aadhaar"
          placeholder="e.g. 1234 5678 9012"
          value={formData.aadhaar}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, aadhaar: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
          required
        />
      </div>

      {/* NATIONALITY */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="nationality"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Nationality
        </Label>
        <Select
          value={formData.nationality}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, nationality: val }))
          }
        >
          <SelectTrigger
            id="nationality"
            className="w-full border-[#D4D4D4] bg-white text-slate-800 rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Select Nationality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Indian">Indian</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* MARITAL STATUS */}
      <div className="flex flex-col gap-2 col-span-1">
        <Label
          htmlFor="maritalStatus"
          className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans"
        >
          Marital Status
        </Label>
        <Select
          value={formData.maritalStatus}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, maritalStatus: val }))
          }
        >
          <SelectTrigger
            id="maritalStatus"
            className="w-full border-[#D4D4D4] bg-white text-slate-800 rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Select Marital Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Unmarried">Unmarried</SelectItem>
            <SelectItem value="Married">Married</SelectItem>
            <SelectItem value="Divorced">Divorced</SelectItem>
            <SelectItem value="Widowed">Widowed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] col-span-2 mt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditPreferencesForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    preference1: appData.preferences.preference1,
    preference2: appData.preferences.preference2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      preferences: {
        preference1: formData.preference1,
        preference2: formData.preference2,
      },
    };
    onSave(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-3 pb-1">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="preference1"
          className="text-[#64748B] font-semibold text-[12px] uppercase font-sans"
        >
          Preference 1
        </Label>
        <Select
          value={formData.preference1}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, preference1: val }))
          }
        >
          <SelectTrigger
            id="preference1"
            className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Select Preference 1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Main Campus">Main Campus</SelectItem>
            <SelectItem value="City Campus">City Campus</SelectItem>
            <SelectItem value="South Campus">South Campus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="preference2"
          className="text-[#64748B] font-semibold text-[12px] uppercase font-sans"
        >
          Preference 2
        </Label>
        <Select
          value={formData.preference2}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, preference2: val }))
          }
        >
          <SelectTrigger
            id="preference2"
            className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]"
          >
            <SelectValue placeholder="Select Preference 2" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Main Campus">Main Campus</SelectItem>
            <SelectItem value="City Campus">City Campus</SelectItem>
            <SelectItem value="South Campus">South Campus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditEducationForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    tenth: {
      institute: appData.education.tenth.institute,
      board: appData.education.tenth.board,
      year: appData.education.tenth.year,
      percentage: appData.education.tenth.percentage,
    },
    twelfth: {
      institute: appData.education.twelfth.institute,
      board: appData.education.twelfth.board,
      stream: appData.education.twelfth.stream,
      year: appData.education.twelfth.year,
      percentage: appData.education.twelfth.percentage,
    },
    graduation: {
      degree: appData.education.graduation.degree,
      college: appData.education.graduation.college,
      university: appData.education.graduation.university,
      status: appData.education.graduation.status,
      passingYear: appData.education.graduation.passingYear,
      percentageTillLast: appData.education.graduation.percentageTillLast,
      mode: appData.education.graduation.mode,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      education: {
        ...appData.education,
        tenth: {
          ...appData.education.tenth,
          ...formData.tenth,
        },
        twelfth: {
          ...appData.education.twelfth,
          ...formData.twelfth,
        },
        graduation: {
          ...appData.education.graduation,
          ...formData.graduation,
        },
      },
    };
    onSave(updatedData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-x-6 gap-y-4 pt-3 pb-1"
    >
      <div className="col-span-2 pb-2">
        <h3 className="font-bold text-slate-800 text-sm">10th Details</h3>
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Institute Name
        </Label>
        <Input
          value={formData.tenth.institute}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              tenth: { ...prev.tenth, institute: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Board
        </Label>
        <Input
          value={formData.tenth.board}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              tenth: { ...prev.tenth, board: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Passing Year
        </Label>
        <Input
          value={formData.tenth.year}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              tenth: { ...prev.tenth, year: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Percentage
        </Label>
        <Input
          value={formData.tenth.percentage}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              tenth: { ...prev.tenth, percentage: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>

      <div className="col-span-2 pb-2 pt-2">
        <h3 className="font-bold text-slate-800 text-sm">12th Details</h3>
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Institute Name
        </Label>
        <Input
          value={formData.twelfth.institute}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              twelfth: { ...prev.twelfth, institute: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Board
        </Label>
        <Input
          value={formData.twelfth.board}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              twelfth: { ...prev.twelfth, board: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Stream
        </Label>
        <Select
          value={formData.twelfth.stream}
          onValueChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              twelfth: { ...prev.twelfth, stream: val },
            }))
          }
        >
          <SelectTrigger className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white">
            <SelectValue placeholder="Select Stream" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Science">Science</SelectItem>
            <SelectItem value="Commerce">Commerce</SelectItem>
            <SelectItem value="Arts">Arts</SelectItem>
            <SelectItem value="-">-</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Passing Year
        </Label>
        <Input
          value={formData.twelfth.year}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              twelfth: { ...prev.twelfth, year: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Percentage
        </Label>
        <Input
          value={formData.twelfth.percentage}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              twelfth: { ...prev.twelfth, percentage: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>

      <div className="col-span-2 pb-2 pt-2">
        <h3 className="font-bold text-slate-800 text-sm">Graduation Details</h3>
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Degree
        </Label>
        <Input
          value={formData.graduation.degree}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              graduation: { ...prev.graduation, degree: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          College Name
        </Label>
        <Input
          value={formData.graduation.college}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              graduation: { ...prev.graduation, college: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          University
        </Label>
        <Input
          value={formData.graduation.university}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              graduation: { ...prev.graduation, university: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Status
        </Label>
        <Select
          value={formData.graduation.status}
          onValueChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              graduation: { ...prev.graduation, status: val },
            }))
          }
        >
          <SelectTrigger className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Awaiting Result">Awaiting Result</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Passing Year
        </Label>
        <Input
          value={formData.graduation.passingYear}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              graduation: { ...prev.graduation, passingYear: e.target.value },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Score Till Last Sem
        </Label>
        <Input
          value={formData.graduation.percentageTillLast}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              graduation: {
                ...prev.graduation,
                percentageTillLast: e.target.value,
              },
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Mode
        </Label>
        <Select
          value={formData.graduation.mode}
          onValueChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              graduation: { ...prev.graduation, mode: val },
            }))
          }
        >
          <SelectTrigger className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white">
            <SelectValue placeholder="Select Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Distance">Distance</SelectItem>
            <SelectItem value="Part Time">Part Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2 col-span-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditEntranceForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    entranceTests: appData.entranceTests.map((test: any) => ({
      exam: test.exam,
      rollNo: test.rollNo,
      month: test.month,
      status: test.status,
      score: test.score,
      percentile: test.percentile,
    })),
  });

  const handleFieldChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const updatedTests = [...prev.entranceTests];
      updatedTests[index] = {
        ...updatedTests[index],
        [field]: value,
      };
      return { entranceTests: updatedTests };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      entranceTests: formData.entranceTests,
    };
    onSave(updatedData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 pt-3 pb-1"
    >
      {formData.entranceTests.map((test: any, index: number) => (
        <div
          key={test.exam}
          className="flex flex-col gap-3 p-4 border rounded-lg bg-white"
        >
          <div className="border-b pb-1.5">
            <h4 className="font-bold text-slate-800 text-sm">
              {test.exam} Details
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Roll No
              </Label>
              <Input
                value={test.rollNo}
                onChange={(e) =>
                  handleFieldChange(index, "rollNo", e.target.value)
                }
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Month/Year
              </Label>
              <Input
                value={test.month}
                onChange={(e) =>
                  handleFieldChange(index, "month", e.target.value)
                }
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Status
              </Label>
              <Select
                value={test.status}
                onValueChange={(val) => handleFieldChange(index, "status", val)}
              >
                <SelectTrigger className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Declared">Declared</SelectItem>
                  <SelectItem value="Awaiting Result">
                    Awaiting Result
                  </SelectItem>
                  <SelectItem value="-">-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 col-span-1">
              <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                Percentile
              </Label>
              <Input
                value={test.percentile}
                onChange={(e) =>
                  handleFieldChange(index, "percentile", e.target.value)
                }
                className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px] bg-white"
                required
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditParentsForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    fatherName: appData.parents.father.name,
    fatherMobile: appData.parents.father.mobile,
    fatherOccupation: appData.parents.father.occupation,
    motherName: appData.parents.mother.name,
    motherMobile: appData.parents.mother.mobile,
    motherOccupation: appData.parents.mother.occupation,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      parents: {
        ...appData.parents,
        father: {
          ...appData.parents.father,
          name: formData.fatherName,
          mobile: formData.fatherMobile,
          occupation: formData.fatherOccupation,
        },
        mother: {
          ...appData.parents.mother,
          name: formData.motherName,
          mobile: formData.motherMobile,
          occupation: formData.motherOccupation,
        },
      },
    };
    onSave(updatedData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-x-6 gap-y-4 pt-3 pb-1"
    >
      <div className="col-span-2 border-b pb-2">
        <h3 className="font-bold text-slate-800 text-sm">Father's Details</h3>
      </div>
      <div className="flex flex-col gap-1.5 col-span-2">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Father's Name
        </Label>
        <Input
          value={formData.fatherName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, fatherName: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Phone / Mobile
        </Label>
        <Input
          value={formData.fatherMobile}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, fatherMobile: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Occupation
        </Label>
        <Input
          value={formData.fatherOccupation}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              fatherOccupation: e.target.value,
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>

      <div className="col-span-2 border-b pb-2 pt-2">
        <h3 className="font-bold text-slate-800 text-sm">Mother's Details</h3>
      </div>
      <div className="flex flex-col gap-1.5 col-span-2">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Mother's Name
        </Label>
        <Input
          value={formData.motherName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, motherName: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Phone / Mobile
        </Label>
        <Input
          value={formData.motherMobile}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, motherMobile: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Occupation
        </Label>
        <Input
          value={formData.motherOccupation}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              motherOccupation: e.target.value,
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2 col-span-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditAdditionalForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    inspiration: appData.other.inspiration,
    source: appData.other.source,
    medicalConditions: appData.other.medicalConditions,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      other: {
        inspiration: formData.inspiration,
        source: formData.source,
        medicalConditions: formData.medicalConditions,
      },
    };
    onSave(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-3 pb-1">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="inspiration"
          className="text-[#64748B] font-semibold text-[12px] uppercase font-sans"
        >
          What inspires you to pursue PGDM/MBA? What motivates you at XIME?
        </Label>
        <Textarea
          id="inspiration"
          value={formData.inspiration}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, inspiration: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] min-h-[100px] text-[14px]"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="source"
          className="text-[#64748B] font-semibold text-[12px] uppercase font-sans"
        >
          How did you know about us?
        </Label>
        <Input
          id="source"
          value={formData.source}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, source: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="medicalConditions"
          className="text-[#64748B] font-semibold text-[12px] uppercase font-sans"
        >
          Medical Conditions
        </Label>
        <Input
          id="medicalConditions"
          value={formData.medicalConditions}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              medicalConditions: e.target.value,
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
          required
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function EditContactForm({ appData, onSave, onClose }: FormProps) {
  const [formData, setFormData] = React.useState({
    primaryMobile: appData.applicant.primaryMobile,
    alternateMobile: appData.applicant.alternateMobile,
    presentAddress: appData.address.present,
    permanentAddress: appData.address.permanent,
    sameAsPresent: appData.address.present === appData.address.permanent,
  });

  const handlePresentAddressChange = (val: string) => {
    setFormData((prev) => {
      const next = { ...prev, presentAddress: val };
      if (prev.sameAsPresent) {
        next.permanentAddress = val;
      }
      return next;
    });
  };

  const handleSameAsPresentChange = (checked: boolean) => {
    setFormData((prev) => {
      const next = { ...prev, sameAsPresent: checked };
      if (checked) {
        next.permanentAddress = prev.presentAddress;
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      ...appData,
      applicant: {
        ...appData.applicant,
        primaryMobile: formData.primaryMobile,
        alternateMobile: formData.alternateMobile,
      },
      address: {
        present: formData.presentAddress,
        permanent: formData.permanentAddress,
      },
    };
    onSave(updatedData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-x-6 gap-y-4 pt-3 pb-1"
    >
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Primary Mobile
        </Label>
        <Input
          value={formData.primaryMobile}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, primaryMobile: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5 col-span-1">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Alt Mobile
        </Label>
        <Input
          value={formData.alternateMobile}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              alternateMobile: e.target.value,
            }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-9 text-[13px]"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5 col-span-2">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Present Address
        </Label>
        <Textarea
          value={formData.presentAddress}
          onChange={(e) => handlePresentAddressChange(e.target.value)}
          className="border-[#D4D4D4] rounded-[8px] min-h-[70px] text-[13px]"
          required
        />
      </div>

      <div className="flex items-center gap-2 col-span-2 pt-1 pb-1">
        <Checkbox
          id="sameAsPresent"
          checked={formData.sameAsPresent}
          onCheckedChange={(checked) =>
            handleSameAsPresentChange(checked === true)
          }
        />
        <Label
          htmlFor="sameAsPresent"
          className="text-xs font-semibold text-[#1A237E] cursor-pointer"
        >
          Permanent Address is Same as Present Address
        </Label>
      </div>

      <div className="flex flex-col gap-1.5 col-span-2">
        <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
          Permanent Address
        </Label>
        <Textarea
          value={formData.permanentAddress}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              permanentAddress: e.target.value,
            }))
          }
          disabled={formData.sameAsPresent}
          className="border-[#D4D4D4] rounded-[8px] min-h-[70px] text-[13px] disabled:bg-slate-50 disabled:text-slate-500"
          required
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] mt-2 col-span-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold border-[#D4D4D4] text-[#1E293B] cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-10 px-6 rounded-[8px] text-[14px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer"
        >
          Save
        </Button>
      </div>
    </form>
  );
}
