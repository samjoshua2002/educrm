/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  Award,
  AlertTriangle,
  Download,
  Printer,
  CheckCircle2,
  FileText,
} from "lucide-react";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// Mock Data representing the Interview Profile
const interviewData = {
  applicationNo: "BLR/2026/4569",
  name: "Akhitha S S",
  email: "Akithasky6@gmail.com",
  phone: "+91 9037591665",
  appliedFor: "PGDM Bangalore",
  interviewDetails: {
    location: "Kochi",
    date: "2026-02-07",
    time: "14:30",
  },
  academics: {
    tenth: { percentage: "84%", score: 1 },
    twelfth: { percentage: "90%", score: 4 },
    ug: { percentage: "57%", score: 0 },
  },
  entranceTest: {
    name: "Awaited",
    score: "-",
    percentile: "-",
  },
  experience: {
    claimedMonths: "-",
    validatedMonths: "0",
    score: 0,
  },
  components: {
    achievement: 0,
    penalty: 0,
    otherTotal: 0, // This is based on academic scores + exp + achievement - penalty conceptually, but from data it is 5
    assignedTotalOther: 5,
  },
  interviewScores: {
    gd: 4, // out of 10
    pi: 10, // out of 30
    totalGDPI: 14,
    compositeScore: 19,
  },
  discrepancy: "Entrance Score Awaited",
  decision: {
    campus: "Awaited Scores",
    waitlist: "Not Applicable",
    remarks: "Waiting for enterance exam results",
  },
};

export default function GDInterviewDetailsPage() {
  const params = useParams();
  // Ensure we use params.application_number to fetch data in reality.

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full">
      {/* Top Action Bar & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="/gd-interview">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Interview Profile
            </h1>
            <p className="text-sm text-slate-500">
              View and evaluate candidate interview details.
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
            Export
          </Button>
          <Button className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Save Evaluation
          </Button>
        </div>
      </div>

      {/* Hero Header Card */}
      <Card className="border-t-4 border-t-primary shadow-sm bg-slate-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Candidate Identity */}
            <div className="flex items-start gap-4">
              <div className="relative size-20 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md bg-slate-100">
                <Image
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(interviewData.name)}&backgroundColor=e2e8f0&textColor=475569`}
                  alt={interviewData.name}
                  fill
                  className="object-cover"
                />
              </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-slate-900">
                  {interviewData.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="font-mono text-sm px-2 text-slate-600 border-slate-200"
                >
                  {interviewData.applicationNo}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border shadow-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {interviewData.email}
                </span>
                <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border shadow-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {interviewData.phone}
                </span>
              </div>
            </div>
            </div>

            {/* Time & Location Box */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 bg-white p-3 rounded-lg border shadow-sm lg:min-w-[400px]">
              <div className="flex-1 space-y-1 border-r pr-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </p>
                <p className="font-medium text-slate-900">
                  {interviewData.interviewDetails.location}
                </p>
              </div>
              <div className="flex-1 space-y-1 border-r px-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </p>
                <p className="font-medium text-slate-900">
                  {new Date(
                    interviewData.interviewDetails.date,
                  ).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex-1 space-y-1 pl-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Time
                </p>
                <p className="font-medium text-slate-900">
                  {interviewData.interviewDetails.time}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">
                Applied For:
              </span>
              <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none rounded-md px-3 py-1">
                {interviewData.appliedFor}
              </Badge>
            </div>

            {interviewData.discrepancy && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-md border border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Discrepancy: {interviewData.discrepancy}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academics, Experience & Tests (Col-4/12 equivalent) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4 text-primary" />
                Academic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y overflow-hidden rounded-b-lg">
                <div className="grid grid-cols-3 p-4 bg-slate-50/30">
                  <div className="text-sm font-semibold text-slate-500">
                    Level
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    Percentage
                  </div>
                  <div className="text-sm font-semibold text-right text-slate-500">
                    Score
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center p-4">
                  <div className="font-medium">10th Std</div>
                  <div className="text-slate-600">
                    {interviewData.academics.tenth.percentage}
                  </div>
                  <div className="text-right font-semibold text-primary">
                    {interviewData.academics.tenth.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center p-4">
                  <div className="font-medium">12th Std</div>
                  <div className="text-slate-600">
                    {interviewData.academics.twelfth.percentage}
                  </div>
                  <div className="text-right font-semibold text-primary">
                    {interviewData.academics.twelfth.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center p-4">
                  <div className="font-medium">UG</div>
                  <div className="text-slate-600">
                    {interviewData.academics.ug.percentage}
                  </div>
                  <div className="text-right font-semibold text-primary">
                    {interviewData.academics.ug.score}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-primary" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-dashed">
                <span className="text-sm text-slate-600">Claimed (Months)</span>
                <span className="font-medium">
                  {interviewData.experience.claimedMonths}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-dashed">
                <span className="text-sm text-slate-600">
                  Validated (Actual)
                </span>
                <span className="font-medium">
                  {interviewData.experience.validatedMonths}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-900">
                  Experience Score
                </span>
                <span className="font-bold text-lg text-primary">
                  {interviewData.experience.score}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Entrance Test
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {interviewData.entranceTest.name === "Awaited" ||
              !interviewData.entranceTest.name ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400 mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-600">
                    Entrance Scores Awaited
                  </p>
                </div>
              ) : (
                <div className="space-y-3 px-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Test Name</span>
                    <span className="font-medium">
                      {interviewData.entranceTest.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Score</span>
                    <span className="font-medium">
                      {interviewData.entranceTest.score}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Percentile</span>
                    <span className="font-bold text-primary">
                      {interviewData.entranceTest.percentile}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scoring & Final Evaluation (Col-8/12 equivalent) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-t-2 border-t-blue-500">
            <CardHeader className="pb-3 border-b bg-slate-50/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-blue-600" />
                Evaluation & Scoring
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Objective Scores */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
                    Other Components
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">
                        Achievement (Max 5)
                      </span>
                      <Input
                        type="number"
                        defaultValue={interviewData.components.achievement}
                        className="w-20 h-8 text-right bg-slate-50"
                        readOnly
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Penalty (Max -5)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.components.penalty}
                        className="w-20 h-8 text-right bg-red-50 text-red-600 border-red-100"
                        readOnly
                      />
                    </div>

                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="font-semibold text-slate-900">
                        Total - Other
                      </span>
                      <span className="font-bold text-lg text-slate-900 w-20 text-right pr-3">
                        {interviewData.components.assignedTotalOther}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interview Scores */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
                    GD & PI Scores
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">GD Score (Max 10)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.interviewScores.gd}
                        className="w-20 h-8 text-right font-medium"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">PI Score (Max 30)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.interviewScores.pi}
                        className="w-20 h-8 text-right font-medium"
                      />
                    </div>

                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="font-semibold text-slate-900">
                        Total - GDPI
                      </span>
                      <span className="font-bold text-lg text-blue-600 w-20 text-right pr-3">
                        {interviewData.interviewScores.totalGDPI}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Composite Score Banner */}
              <div className="mt-8 bg-slate-900 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center shadow-md">
                <div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                    Final Calculation
                  </p>
                  <h3 className="text-white font-semibold text-lg">
                    Composite Score
                  </h3>
                </div>
                <div className="bg-primary/20 bg-blue-500/20 mt-4 md:mt-0 px-6 py-2 rounded-lg border border-blue-500/30">
                  <span className="text-3xl font-bold text-blue-400">
                    {interviewData.interviewScores.compositeScore}
                  </span>
                  <span className="text-blue-400/60 ml-1 text-sm">/ 100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision Panel */}
          <Card className="shadow-sm border-t-2 border-t-green-500">
            <CardHeader className="pb-3 border-b bg-slate-50/30">
              <CardTitle className="text-lg">Admission Decision</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="campus-select"
                    className="text-slate-600 font-medium"
                  >
                    Campus Selection
                  </Label>
                  <Select defaultValue={interviewData.decision.campus}>
                    <SelectTrigger id="campus-select" className="w-full">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Awaited Scores">
                        Awaited Scores
                      </SelectItem>
                      <SelectItem value="PGDM Bangalore">
                        PGDM Bangalore
                      </SelectItem>
                      <SelectItem value="PGDM Chennai">PGDM Chennai</SelectItem>
                      <SelectItem value="PGDM Kochi">PGDM Kochi</SelectItem>
                      <SelectItem value="Not Selected">Not Selected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="waitlist-select"
                    className="text-slate-600 font-medium"
                  >
                    Waitlist Status
                  </Label>
                  <Select defaultValue={interviewData.decision.waitlist}>
                    <SelectTrigger id="waitlist-select" className="w-full">
                      <SelectValue placeholder="Select Waitlist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Applicable">
                        Not Applicable
                      </SelectItem>
                      <SelectItem value="WL-1">Waitlist 1</SelectItem>
                      <SelectItem value="WL-2">Waitlist 2</SelectItem>
                      <SelectItem value="WL-3">Waitlist 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-slate-600 font-medium">
                  Final Remarks / Comments
                </Label>
                <Textarea
                  id="remarks"
                  defaultValue={interviewData.decision.remarks}
                  placeholder="Enter any observational remarks from the panel..."
                  className="min-h-[100px] bg-slate-50 border-slate-200"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
