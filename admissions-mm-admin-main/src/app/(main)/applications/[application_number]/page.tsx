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

// Mock Data representing the Application
const applicationData = {
  applicationNo: "CHN/2025/1101",
  status: "Review Pending",
  appliedFor: "PGDM 2025-26",
  applicant: {
    name: "Ms. Anbukarasi A",
    photo: "https://i.pravatar.cc/150?u=anbu",
    email: "anbukarasiarivazhagan963@gmail.com",
    primaryMobile: "+91-9789886430",
    alternateMobile: "+91-9444971643",
    gender: "Female",
    dob: "25/05/2005",
    age: "20 Years, 7 Days",
    religion: "Hinduism",
    nationality: "Indian",
    aadhaar: "871951392943",
    category: "OBC",
    maritalStatus: "Unmarried",
  },
  preferences: {
    preference1: "PGDM Chennai",
    preference2: "PGDM Kochi",
  },
  entranceTests: [
    {
      exam: "XAT",
      rollNo: "-",
      month: "-",
      status: "-",
      score: "-",
      percentile: "-",
    },
    {
      exam: "CAT",
      rollNo: "-",
      month: "-",
      status: "-",
      score: "-",
      percentile: "-",
    },
    {
      exam: "CMAT",
      rollNo: "TN01000014",
      month: "01/2025",
      status: "Declared",
      score: "-",
      percentile: "58.22",
    },
    {
      exam: "MAT",
      rollNo: "-",
      month: "-",
      status: "-",
      score: "-",
      percentile: "-",
    },
    {
      exam: "GMAT",
      rollNo: "-",
      month: "-",
      status: "-",
      score: "-",
      percentile: "-",
    },
    {
      exam: "TANCET",
      rollNo: "-",
      month: "-",
      status: "-",
      score: "-",
      percentile: "-",
    },
  ],
  education: {
    tenth: {
      institute: "Rosary Matriculation Higher Secondary School",
      board: "Tamil Nadu Board of Secondary Education",
      stream: "-",
      year: "2020",
      percentage: "66%",
    },
    twelfth: {
      institute: "Rosary Matriculation Higher Secondary School",
      board: "Tamil Nadu Board of Higher Secondary Education",
      stream: "Commerce",
      year: "2022",
      percentage: "98.6%",
    },
    graduation: {
      state: "Tamil Nadu",
      university: "University of Madras, Tamil Nadu",
      college: "MOP Vaishnav College for Women",
      degree: "BCom Accounting and Finance",
      mode: "Regular",
      status: "Awaited",
      enrollmentYear: "2022",
      passingYear: "2025",
      percentage: "-",
      percentageTillLast: "86%",
    },
  },
  parents: {
    father: {
      name: "Mr. Arivazhagan",
      mobile: "+91-9789886430",
      email: "-",
      occupation: "Business",
      income: "5,00,000-10,00,000",
    },
    mother: {
      name: "Mrs. Valarmathi",
      mobile: "+91-9789883968",
      email: "-",
      occupation: "Homemaker",
      income: "-",
    },
  },
  address: {
    present:
      "No. 14, Rosary Church Road, Santhome, Chennai-4. Pincode: 600004. City: Chennai. State: Tamil Nadu. Country: India.",
    permanent:
      "No. 14, Rosary Church Road, Santhome, Chennai-4. Pincode: 600004. City: Chennai. State: Tamil Nadu. Country: India.",
  },
  other: {
    inspiration:
      "I believe an MBA will significantly enhance my career. It will provide me with the necessary skills to start my career. I am looking for something that would pull me out of my comfort zone, and I believe an MBA at XIME would be the right way to go. The strong industry connections and focus on practical learning is what draws me here.",
    source: "Education Portals",
    medicalConditions: "None",
  },
};

export default function ApplicationDetailsPage() {
  const params = useParams();

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full bg-white">
      {/* Top Action Bar & Breadcrumbs */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/applications">
            <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Application Details
            </h1>
            <p className="text-xs text-slate-500">
              View and manage application information for {applicationData.applicant.name.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Banner Card */}
      <Card className="shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left w-full">
            <Avatar className="h-20 w-20 border-4 border-slate-100 shadow-xs shrink-0">
              <AvatarImage
                src={applicationData.applicant.photo}
                alt={applicationData.applicant.name}
              />
              <AvatarFallback className="text-xl font-bold">
                {applicationData.applicant.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2.5 mt-1 text-left w-full">
              {/* Name & Status */}
              <div className="flex items-center gap-4 justify-start">
                <h2 className="text-2xl font-bold text-slate-900">
                  {applicationData.applicant.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="text-xs px-2.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] font-bold uppercase hover:bg-[#EFF6FF] rounded-[10px]"
                >
                  {applicationData.status}
                </Badge>
              </div>

              {/* Details + Buttons in the same horizontal alignment */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                {/* Details Row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-normal leading-[20px] text-[#1E293B]">
                  <span className="flex items-center gap-1.5">
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
                  <span className="flex items-center gap-1.5">
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
                  <span className="flex items-center gap-1.5">
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

                {/* Buttons Row */}
                <div className="flex items-center gap-3 shrink-0 mt-2 lg:mt-0 justify-center lg:justify-end">
                  <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center gap-2 shadow-xs transition-colors cursor-pointer">
                    GD AND INTERVIEWS
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50/50 font-semibold text-xs px-4 py-2.5 rounded-md flex items-center gap-2 transition-colors cursor-pointer">
                    COMMUNICATION
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer">
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
                    {applicationData.applicant.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
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
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-start gap-6 self-stretch">
              <div className="flex flex-col gap-[7.125px] w-full">
                <h4 className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#94A3B8] self-stretch`}>
                  COMMUNICATION
                </h4>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className={`${manrope.className} text-sm font-normal text-[#64748B] leading-5`}>Primary Mobile</span>
                    <span className={`${manrope.className} text-sm font-bold text-[#1E293B] leading-5`}>
                      {applicationData.applicant.primaryMobile}
                    </span>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span className={`${manrope.className} text-sm font-normal text-[#64748B] leading-5`}>Alt Mobile</span>
                    <span className={`${manrope.className} text-sm font-bold text-[#1E293B] leading-5`}>
                      {applicationData.applicant.alternateMobile}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col items-start gap-[7.125px] self-stretch border-t border-[#F8FAFC]">
                <h4 className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#94A3B8] self-stretch`}>
                  PRESENT ADDRESS
                </h4>
                <p className={`${manrope.className} text-[14px] font-normal leading-[22.75px] text-[#475569]`}>
                  {applicationData.address.present}
                </p>
              </div>

              <div className="pt-4 flex flex-col items-start gap-[7.125px] self-stretch border-t border-[#F8FAFC]">
                <div className="flex items-center justify-between w-full">
                  <h4 className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[1px] uppercase text-[#94A3B8] self-stretch`}>
                    PERMANENT ADDRESS
                  </h4>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-[#1A237E]/[0.05] text-[#1A237E] hover:bg-[#1A237E]/[0.05] rounded-[4px] px-2 py-[2px] border-0 flex flex-col items-start">
                    SAME AS PRESENT
                  </Badge>
                </div>
                <p className={`${manrope.className} text-[14px] font-normal leading-[22.75px] text-[#475569]`}>
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
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5 p-4 bg-[#F8FAFC] rounded-lg border border-slate-100">
                  <span className={`${manrope.className} text-[10px] font-bold leading-[15px] tracking-[-0.5px] uppercase text-[#1A237E]`}>
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
                      <TableHead className="px-4 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">Year</TableHead>
                      <TableHead className="pr-5 font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] text-right">
                        Percentage
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700 pl-5 py-4">10th</TableCell>
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
                      <TableCell className="font-semibold text-slate-700 pl-5 py-4">12th</TableCell>
                      <TableCell className="text-slate-600 whitespace-normal px-4 py-4 max-w-[250px]">
                        {applicationData.education.twelfth.institute}
                      </TableCell>
                      <TableCell className="px-4 py-4 whitespace-normal max-w-[250px]">
                        <div className="flex flex-col">
                          <span className="text-slate-600">{applicationData.education.twelfth.board}</span>
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
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">Degree</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {applicationData.education.graduation.degree}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">Institution</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {applicationData.education.graduation.college}
                    </p>
                    <p className="text-xs text-slate-500">
                      {applicationData.education.graduation.university}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">Academic Status</span>
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
                    <span className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B]">Mode</span>
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
            </CardHeader>
            <CardContent className="p-5 flex flex-col items-start self-stretch">
              <Table>
                <TableHeader className="bg-transparent">
                  <TableRow>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] w-[86.58px] pl-[1px] pr-[1px]">
                      Exam
                    </TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] px-4">Roll No</TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] px-4">Month</TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] px-4">Status</TableHead>
                    <TableHead className="font-sans text-[10px] font-bold leading-normal tracking-[0.5px] uppercase text-[#64748B] text-right pr-5">
                      Percentile
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationData.entranceTests.map((test, index) => (
                    <TableRow
                      key={index}
                      className={test.percentile !== "-" ? "bg-[#EFF6FF]/20" : ""}
                    >
                      <TableCell className="p-[12px_1px_13px_1px] w-[86.58px]">
                        <div className="flex flex-col items-start font-bold text-slate-800">
                          {test.exam}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`p-[12px_16px_13px_16px] ${
                          test.rollNo !== "-"
                            ? "font-mono text-sm text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {test.rollNo}
                      </TableCell>
                      <TableCell
                        className={`p-[12px_16px_13px_16px] ${
                          test.month !== "-"
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
                      <p className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">FATHER</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">PHONE</span>
                      <p className="font-semibold text-sm text-slate-800">
                        {applicationData.parents.father.mobile}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">OCCUPATION</span>
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
                      <p className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">MOTHER</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">PHONE</span>
                      <p className="font-semibold text-sm text-slate-800">
                        {applicationData.parents.mother.mobile}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold leading-[15px] tracking-[-0.25px] uppercase text-[#64748B] font-sans">OCCUPATION</span>
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
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-[3.83px] h-[20px] rounded-full bg-[#1A237E] shrink-0 mt-[2px]" />
                  <h4 className="text-sm font-semibold text-[#1E293B] leading-tight">
                    What inspires you to pursue a PGDM/MBA program? What motivates
                    you to do it at XIME?
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
    </div>
  );
}
