/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Download,
  Printer,
  CheckCircle2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/auth-store";
import { Role } from "@/types/auth";

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
  },
  preferences: {
    preference1: "PGDM Chennai",
    preference2: "PGDM Kochi",
  },
  entranceTests: [
    { exam: "XAT", rollNo: "-", month: "-", status: "-", percentile: "-" },
    { exam: "CAT", rollNo: "-", month: "-", status: "-", percentile: "-" },
    { exam: "CMAT", rollNo: "TN01000014", month: "01/2025", status: "Declared", percentile: "58.22" },
    { exam: "MAT", rollNo: "-", month: "-", status: "-", percentile: "-" },
    { exam: "GMAT", rollNo: "-", month: "-", status: "-", percentile: "-" },
  ],
  contact: {
    address:
      "No. 14, Rosary Church Road, Santhome, Chennai-4. Pincode: 600004. City: Chennai. State: Tamil Nadu. Country: India.",
  },
  education: {
    tenth: {
      institute: "Rosary Matriculation Higher Secondary School",
      board: "Tamil Nadu Board of Secondary Education",
      year: "2020",
      percentage: "66%",
    },
    twelfth: {
      institute: "Rosary Matriculation Higher Secondary School",
      board: "Tamil Nadu Board of Higher Secondary Education",
      year: "2022",
      percentage: "98.6%",
      stream: "Commerce",
    },
  },
  other: {
    inspiration:
      "I believe an MBA will significantly enhance my career. It will provide me with the necessary skills to start my career. I am looking for something that would pull me out of my comfort zone.",
    source: "Education Portals",
    medicalConditions: "None",
  },
};

export default function OrganizationApplicationDetailsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allowed = user?.role === Role.ORG_ADMIN || user?.role === Role.APPLICATION_MANAGER;

  React.useEffect(() => {
    if (user && !allowed) router.replace("/unauthorized");
  }, [allowed, router, user]);

  const params = useParams<{ id: string }>();

  if (!user) return null;
  if (!allowed) return null;

  const initials = applicationData.applicant.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="/organization/applications">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Application Details
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
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

      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={applicationData.applicant.photo} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{applicationData.applicant.name}</h2>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    {applicationData.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {applicationData.appliedFor}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {applicationData.applicant.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {applicationData.applicant.primaryMobile}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-semibold">
                App No: {params.id}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Primary Mobile
              </div>
              <div className="text-sm font-medium">{applicationData.applicant.primaryMobile}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Alt Mobile
              </div>
              <div className="text-sm font-medium">{applicationData.applicant.alternateMobile}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {applicationData.contact.address}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Course and Campus Preferences</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preference 1
                </div>
                <div className="mt-1 text-sm font-semibold">{applicationData.preferences.preference1}</div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Preference 2
                </div>
                <div className="mt-1 text-sm font-semibold">{applicationData.preferences.preference2}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Educational Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">10th</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="font-semibold">{applicationData.education.tenth.institute}</div>
                    <div className="text-muted-foreground">{applicationData.education.tenth.board}</div>
                    <div className="text-muted-foreground">Year: {applicationData.education.tenth.year}</div>
                    <div className="font-semibold">{applicationData.education.tenth.percentage}</div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">12th</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="font-semibold">{applicationData.education.twelfth.institute}</div>
                    <div className="text-muted-foreground">{applicationData.education.twelfth.board}</div>
                    <div className="text-muted-foreground">
                      Stream: {applicationData.education.twelfth.stream}
                    </div>
                    <div className="text-muted-foreground">Year: {applicationData.education.twelfth.year}</div>
                    <div className="font-semibold">{applicationData.education.twelfth.percentage}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Entrance Test Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Percentile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applicationData.entranceTests.map((t) => (
                    <TableRow key={t.exam}>
                      <TableCell className="font-medium">{t.exam}</TableCell>
                      <TableCell>{t.rollNo}</TableCell>
                      <TableCell>{t.month}</TableCell>
                      <TableCell>{t.status}</TableCell>
                      <TableCell className="text-right">{t.percentile}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  What inspires you?
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {applicationData.other.inspiration}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    How did you know about us?
                  </div>
                  <div className="mt-1 text-sm font-medium">{applicationData.other.source}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Medical Conditions
                  </div>
                  <div className="mt-1 text-sm font-medium">{applicationData.other.medicalConditions}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

