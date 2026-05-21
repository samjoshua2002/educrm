/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";

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

  // You would normally fetch data based on params.application_number
  // For now using the mock data.

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full">
      {/* Top Action Bar & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="/applications">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Application Details
            </h1>
            <p className="text-sm text-slate-500">
              View and manage application information.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Shortlist Candidate
          </Button>
        </div>
      </div>

      {/* Hero Banner Card */}
      <Card className="border-t-4 border-t-primary shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <Avatar className="h-24 w-24 border-4 border-slate-100 shadow-sm">
                <AvatarImage
                  src={applicationData.applicant.photo}
                  alt={applicationData.applicant.name}
                />
                <AvatarFallback className="text-2xl">
                  {applicationData.applicant.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 mt-2">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h2 className="text-3xl font-bold text-slate-900">
                    {applicationData.applicant.name}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-100 self-center md:self-auto"
                  >
                    {applicationData.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-slate-800">
                    <FileDigit className="h-4 w-4 text-slate-400" />
                    App No:{" "}
                    <span className="font-semibold">
                      {applicationData.applicationNo}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {applicationData.applicant.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {applicationData.applicant.primaryMobile}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Summary Box */}
            <div className="bg-slate-50 rounded-lg p-4 w-full md:w-auto border border-slate-100 hidden md:block">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Applied For
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {applicationData.appliedFor}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    Pref 1 Campus
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {applicationData.preferences.preference1}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Sidebar Column - Personal & Contact Details */}
        <div className="space-y-6">
          {/* Personal Information */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase">
                    Gender
                  </span>
                  <p className="font-medium">
                    {applicationData.applicant.gender}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase">
                    Date of Birth
                  </span>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />{" "}
                    {applicationData.applicant.dob}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase">
                    Category
                  </span>
                  <p className="font-medium">
                    <Badge variant="outline" className="rounded-sm">
                      {applicationData.applicant.category}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase">
                    Religion
                  </span>
                  <p className="font-medium">
                    {applicationData.applicant.religion}
                  </p>
                </div>

                <div className="space-y-1 col-span-2">
                  <span className="text-xs text-slate-500 uppercase">
                    Aadhaar Number
                  </span>
                  <p className="font-mono text-slate-700 tracking-wider bg-slate-50 px-2 py-1 rounded inline-block mt-1">
                    {applicationData.applicant.aadhaar}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase">
                    Nationality
                  </span>
                  <p className="font-medium">
                    {applicationData.applicant.nationality}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase">
                    Marital Status
                  </span>
                  <p className="font-medium">
                    {applicationData.applicant.maritalStatus}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Address Details */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-500 border-b pb-1">
                  Communication
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> Primary Mobile
                    </span>
                    <span className="font-medium">
                      {applicationData.applicant.primaryMobile}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" /> Alt Mobile
                    </span>
                    <span className="font-medium">
                      {applicationData.applicant.alternateMobile}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-slate-500 border-b pb-1">
                  Present Address
                </h4>
                <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                  {applicationData.address.present}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">
                    Permanent Address
                  </h4>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    Same as Present
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 p-2.5 text-slate-500">
                  {applicationData.address.permanent}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Parents Details */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Parent&apos;s Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {/* Father */}
                <div className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      Fa
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {applicationData.parents.father.name}
                      </p>
                      <p className="text-xs text-slate-500">Father</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-500">Phone</span>
                      <p className="font-medium text-sm">
                        {applicationData.parents.father.mobile}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-500">Occupation</span>
                      <p className="font-medium text-sm">
                        {applicationData.parents.father.occupation}
                      </p>
                    </div>
                    <div className="space-y-0.5 col-span-2 mt-1">
                      <span className="text-slate-500">Annual Income</span>
                      <p className="font-medium">
                        {applicationData.parents.father.income}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mother */}
                <div className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-sm">
                      Mo
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {applicationData.parents.mother.name}
                      </p>
                      <p className="text-xs text-slate-500">Mother</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-slate-500">Phone</span>
                      <p className="font-medium text-sm">
                        {applicationData.parents.mother.mobile}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-500">Occupation</span>
                      <p className="font-medium text-sm">
                        {applicationData.parents.mother.occupation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Left/Main Column - Academic & Test Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preferences */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                Course and Campus Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <span className="text-xs text-blue-600 font-semibold uppercase">
                    Preference 1
                  </span>
                  <span className="font-medium text-slate-800">
                    {applicationData.preferences.preference1}
                  </span>
                </div>
                <div className="flex flex-col space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold uppercase">
                    Preference 2
                  </span>
                  <span className="font-medium text-slate-800">
                    {applicationData.preferences.preference2}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Educational Details */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                Educational Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="w-[100px] font-semibold">
                        Level
                      </TableHead>
                      <TableHead className="font-semibold min-w-[200px]">
                        Institute Name
                      </TableHead>
                      <TableHead className="font-semibold">
                        Board / Stream
                      </TableHead>
                      <TableHead className="font-semibold">Year</TableHead>
                      <TableHead className="font-semibold text-right">
                        Percentage
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">10th</TableCell>
                      <TableCell>
                        {applicationData.education.tenth.institute}
                      </TableCell>
                      <TableCell>
                        {applicationData.education.tenth.board}
                      </TableCell>
                      <TableCell>
                        {applicationData.education.tenth.year}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {applicationData.education.tenth.percentage}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">12th</TableCell>
                      <TableCell>
                        {applicationData.education.twelfth.institute}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{applicationData.education.twelfth.board}</span>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {applicationData.education.twelfth.stream}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {applicationData.education.twelfth.year}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {applicationData.education.twelfth.percentage}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="p-6">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
                  Under-Graduation Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Degree</p>
                    <p className="font-medium">
                      {applicationData.education.graduation.degree}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Institution</p>
                    <p className="font-medium">
                      {applicationData.education.graduation.college}
                    </p>
                    <p className="text-xs text-slate-500">
                      {applicationData.education.graduation.university}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Academic Status</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-yellow-50 text-yellow-700 border-yellow-200"
                      >
                        {applicationData.education.graduation.status}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        ({applicationData.education.graduation.passingYear})
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">
                      Score till last sem
                    </p>
                    <p className="font-bold text-lg text-primary">
                      {applicationData.education.graduation.percentageTillLast}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Mode</p>
                    <p className="font-medium">
                      {applicationData.education.graduation.mode}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entrance Tests */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                Entrance Test Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-semibold w-[120px]">
                      Exam
                    </TableHead>
                    <TableHead className="font-semibold">Roll No</TableHead>
                    <TableHead className="font-semibold">Month</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">
                      Percentile
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationData.entranceTests.map((test, index) => (
                    // Highlight tests where score/percentile exists
                    <TableRow
                      key={index}
                      className={test.percentile !== "-" ? "bg-blue-50/30" : ""}
                    >
                      <TableCell className="font-medium">{test.exam}</TableCell>
                      <TableCell
                        className={
                          test.rollNo !== "-"
                            ? "font-mono text-sm text-slate-600"
                            : "text-slate-400"
                        }
                      >
                        {test.rollNo}
                      </TableCell>
                      <TableCell
                        className={
                          test.month !== "-"
                            ? "text-slate-600"
                            : "text-slate-400"
                        }
                      >
                        {test.month}
                      </TableCell>
                      <TableCell>
                        {test.status !== "-" ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {test.status}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        {test.percentile}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Motivation / Extra */}
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 border-l-2 border-primary pl-3">
                  What inspires you to pursue a PGDM/MBA program? What motivates
                  you to do it at XIME?
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 text-sm leading-relaxed italic">
                  &quot;{applicationData.other.inspiration}&quot;
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    How did you know about us?
                  </span>
                  <p className="font-medium text-slate-800">
                    {applicationData.other.source}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Medical Conditions
                  </span>
                  <p className="font-medium text-slate-800">
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
