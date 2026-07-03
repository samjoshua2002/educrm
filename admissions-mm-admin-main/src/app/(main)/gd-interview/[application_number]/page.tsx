/* eslint-disable max-lines, @typescript-eslint/no-unused-vars */
"use client";

import React from "react";

import Image from "next/image";
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
  Pencil,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useApplication } from "@/hooks/use-applications";
import { gdInterviews } from "@/data/mock-gd-interviews";
import { toast } from "sonner";

export default function GDInterviewDetailsPage() {
  const params = useParams();
  const applicationNumber = params.application_number as string;
  const { data: appData, isLoading } = useApplication(applicationNumber);

  const [activeEditSection, setActiveEditSection] = React.useState<
    | "academics"
    | "experience"
    | "entranceTest"
    | "scoring"
    | "decision"
    | null
  >(null);

  const handleSave = (section: string, _updatedFields: any) => {
    toast.success(`${section} updated successfully`);
    setActiveEditSection(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Loading candidate details...
          </p>
        </div>
      </div>
    );
  }

  if (!appData) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-white">
        <p className="text-sm text-red-500 font-medium">Candidate not found.</p>
      </div>
    );
  }

  const listMatch = gdInterviews.find(
    (item) => item.applicationNo === applicationNumber,
  );

  const interviewData = {
    applicationNo: appData.applicationNo,
    name: appData.applicant.name,
    email: appData.applicant.email,
    phone: appData.applicant.primaryMobile,
    appliedFor: appData.appliedFor,
    interviewDetails: {
      location: listMatch?.interviewLocation || "Kochi",
      date: listMatch?.date || "2026-02-07",
      time: listMatch?.time || "14:30",
    },
    academics: {
      tenth: {
        percentage: appData.education.tenth.percentage,
        score:
          parseInt(appData.education.tenth.percentage || "0") >= 80 ? 1 : 0,
      },
      twelfth: {
        percentage: appData.education.twelfth.percentage,
        score:
          parseInt(appData.education.twelfth.percentage || "0") >= 90
            ? 4
            : parseInt(appData.education.twelfth.percentage || "0") >= 80
              ? 3
              : 2,
      },
      ug: {
        percentage: appData.education.graduation.percentageTillLast,
        score:
          parseInt(appData.education.graduation.percentageTillLast || "0") >= 70
            ? 2
            : parseInt(
                  appData.education.graduation.percentageTillLast || "0",
                ) >= 60
              ? 1
              : 0,
      },
    },
    entranceTest: {
      name:
        appData.entranceTests.find(
          (t) => t.percentile !== "-" && t.percentile !== "",
        )?.exam || "CAT",
      score: "-",
      percentile:
        appData.entranceTests.find(
          (t) => t.percentile !== "-" && t.percentile !== "",
        )?.percentile || "-",
    },
    experience: {
      claimedMonths: "-",
      validatedMonths: "0",
      score: 0,
    },
    components: {
      achievement: 0,
      penalty: 0,
      assignedTotalOther: 5,
    },
    interviewScores: {
      gd:
        listMatch?.selectionStatus === "Accepted"
          ? 8
          : listMatch?.selectionStatus === "Rejected"
            ? 3
            : 5,
      pi:
        listMatch?.selectionStatus === "Accepted"
          ? 22
          : listMatch?.selectionStatus === "Rejected"
            ? 9
            : 15,
      get totalGDPI() {
        return this.gd + this.pi;
      },
      get compositeScore() {
        return this.totalGDPI + 5;
      },
    },
    discrepancy: appData.entranceTests.every((t) => t.percentile === "-")
      ? "Entrance Score Awaited"
      : null,
    decision: {
      campus: listMatch?.confirmedCampus || "Awaited Scores",
      waitlist: "Not Applicable",
      remarks:
        listMatch?.selectionStatus === "Accepted"
          ? "Strong performance in GD and PI. Recommended for selection."
          : listMatch?.selectionStatus === "Rejected"
            ? "Does not meet the cut-off requirements."
            : "Evaluation in progress.",
    },
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-7xl mx-auto w-full bg-white min-h-screen">


      {/* Hero Header Card */}
      <div className="relative w-full p-6 rounded-[8px] border border-[#D4D4D4] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <Link
          href="/gd-interview"
          className="absolute top-3 left-3 hover:opacity-80 transition-opacity p-1 z-10"
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

        <div className="grid grid-cols-[auto_1fr] gap-x-[16px] md:gap-x-[24px] gap-y-[6px] pt-4">
          {/* Column 1: Avatar */}
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-100 shadow-xs shrink-0 col-start-1 row-start-1 md:row-span-2 mt-2 md:mt-0">
            <AvatarImage
              src={appData.applicant.photo}
              alt={interviewData.name}
            />
            <AvatarFallback className="text-xl font-bold">
              {interviewData.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Name & APP No */}
          <div className="col-start-2 row-start-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-start self-center md:self-start">
            <h2 className="text-xl md:text-2xl font-bold text-[#0A0A0A] leading-tight break-words">
              {interviewData.name}
            </h2>
            <div className="flex">
              <span
                className="font-sans"
                style={{
                  display: "inline-flex",
                  padding: "4px 12px",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  borderRadius: "9999px",
                  border: "1px solid #DBEAFE",
                  background: "#EFF6FF",
                  color: "#475569",
                  fontFamily: "Inter",
                  fontSize: "12px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "16px",
                  textTransform: "uppercase",
                }}
              >
                APP NO: {interviewData.applicationNo}
              </span>
            </div>
          </div>

          {/* Details & Buttons Row */}
          <div className="col-span-2 md:col-span-1 md:col-start-2 row-start-2 flex flex-col gap-4 w-full overflow-hidden mt-4 md:mt-0">
            {/* Top Row: Content and Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-start w-full gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#1E293B] text-[12px] font-normal leading-[20px] font-sans">
                    <span className="flex items-center gap-1.5 shrink-0">
                      <svg
                        viewBox="0 0 20 16"
                        fill="none"
                        className="h-4 w-4 text-[#415876]"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 16C1.45 16 0.979333 15.8043 0.588 15.413C0.196667 15.0217 0.000666667 14.5507 0 14V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 1.45 0.196 0.979333 0.588 0.588C0.98 0.196666 1.45067 0.000666667 2 0H18C18.55 0 19.021 0.196 19.413 0.588C19.805 0.98 20.0007 1.45067 20 2V14C20 1.45 19.8043 15.021 19.413 15.413C19.0217 15.805 18.5507 16.0007 18 16H2ZM10 9L18 4V2L10 7L2 2V4L10 9Z"
                          fill="currentColor"
                        />
                      </svg>
                      {interviewData.email}
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
                      {interviewData.phone}
                    </span>
                  </div>

                  {/* Time & Location Box */}
                  <div className="flex items-center gap-6 mt-1 bg-[#F8FAFC]/50 w-max">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-normal leading-[15px] tracking-[1px] uppercase text-[#475569] font-sans">
                        LOCATION
                      </span>
                      <p className="text-[14px] font-bold leading-[20px] text-[#1E293B] font-sans whitespace-nowrap">
                        {interviewData.interviewDetails.location}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-normal leading-[15px] tracking-[1px] uppercase text-[#475569] font-sans">
                        DATE
                      </span>
                      <p className="text-[14px] font-bold leading-[20px] text-[#1E293B] font-sans whitespace-nowrap">
                        {new Date(
                          interviewData.interviewDetails.date,
                        ).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-normal leading-[15px] tracking-[1px] uppercase text-[#475569] font-sans">
                        TIME
                      </span>
                      <p className="text-[14px] font-bold leading-[20px] text-[#1E293B] font-sans whitespace-nowrap">
                        {interviewData.interviewDetails.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[15px] shrink-0 w-full lg:w-auto mt-4 lg:mt-0">
                <Button
                  asChild
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
                >
                  <Link href={`/applications/${interviewData.applicationNo}`}>
                    APPLICATION
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-4 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 w-full sm:w-auto">
                  COMMUNICATION
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Divider Line starts exactly from name text column alignment */}
            <div className="border-t border-[#E2E8F0]" />

            {/* Bottom Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-[#475569]">
                <span>Applied For:</span>
                <Badge
                  className="text-[#2563EB] border-none font-bold px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "rgba(37, 99, 235, 0.25)",
                    borderRadius: "9999px",
                  }}
                >
                  {interviewData.appliedFor}
                </Badge>
              </div>

              {interviewData.discrepancy && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{
                    color: "#E11D48",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "20px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(225, 29, 72, 0.24)",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>Discrepancy: {interviewData.discrepancy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academics, Experience & Tests (Col-4/12 equivalent) */}
        <div className="lg:col-span-1 space-y-6">
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="13.379"
                  viewBox="0 0 17 15"
                  fill="none"
                  className="aspect-[37/33] shrink-0"
                >
                  <path
                    d="M8.35791 8.8099L15.8579 4.64323L8.35791 0.476562L0.85791 4.64323L8.35791 8.8099V8.8099M8.35791 8.8099L13.4912 5.95823C14.1667 7.6733 14.3584 9.54087 14.0454 11.3574C11.9317 11.5625 9.93892 12.4379 8.35791 13.8557C6.77712 12.4381 4.78465 11.5627 2.67124 11.3574C2.35808 9.54088 2.54977 7.67325 3.22541 5.95823L8.35791 8.8099V8.8099M5.02458 13.8099V7.5599L8.35791 5.70823"
                    stroke="#1E293B"
                    strokeWidth="0.833333"
                  />
                </svg>
                Academic Profile
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("academics")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 w-full">
              <div className="px-5 w-full">
                <div className="divide-y divide-[#F8FAFC] w-full">
                  <div className="grid grid-cols-3 pt-6 pb-4">
                    <div
                      className="font-sans text-left"
                      style={{
                        color: "var(--Colorsecondary-text-color, #475569)",
                        fontFamily: "Inter",
                        fontSize: "10px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Level
                    </div>
                    <div
                      className="font-sans text-center"
                      style={{
                        color: "var(--Colorsecondary-text-color, #475569)",
                        fontFamily: "Inter",
                        fontSize: "10px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Percentage
                    </div>
                    <div
                      className="font-sans text-right"
                      style={{
                        color: "var(--Colorsecondary-text-color, #475569)",
                        fontFamily: "Inter",
                        fontSize: "10px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      Score
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center py-4">
                  <div style={{ color: "var(--text-primary-color, #1E293B)", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "20px" }}>10th Std</div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.tenth.percentage}
                  </div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.tenth.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center py-4">
                  <div style={{ color: "var(--text-primary-color, #1E293B)", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "20px" }}>12th Std</div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.twelfth.percentage}
                  </div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.twelfth.score}
                  </div>
                </div>

                <div className="grid grid-cols-3 items-center py-4">
                  <div style={{ color: "var(--text-primary-color, #1E293B)", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "20px" }}>UG</div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.ug.percentage}
                  </div>
                  <div style={{ color: "var(--text-primary-color, #1E293B)", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                    {interviewData.academics.ug.score}
                  </div>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>

          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14.084"
                  height="13.38"
                  viewBox="0 0 15 14"
                  fill="none"
                  className="aspect-[20/19] shrink-0"
                >
                  <path
                    d="M1.40842 13.38C1.02111 13.38 0.689657 13.2422 0.414076 12.9666C0.138495 12.691 0.000469474 12.3594 0 11.9716V4.22526C0 3.83795 0.138025 3.5065 0.414076 3.23092C0.690126 2.95534 1.02157 2.81731 1.40842 2.81684H4.22526V1.40842C4.22526 1.02111 4.36329 0.689657 4.63934 0.414076C4.91539 0.138495 5.24684 0.000469474 5.63368 0H8.45053C8.83784 0 9.16952 0.138025 9.44557 0.414076C9.72163 0.690126 9.85942 1.02157 9.85895 1.40842V2.81684H12.6758C13.0631 2.81684 13.3948 2.95487 13.6708 3.23092C13.9469 3.50697 14.0847 3.83842 14.0842 4.22526V11.9716C14.0842 12.3589 13.9464 12.6906 13.6708 12.9666C13.3953 13.2427 13.0636 13.3805 12.6758 13.38H1.40842ZM1.40842 11.9716H12.6758V4.22526H1.40842V11.9716ZM5.63368 2.81684H8.45053V1.40842H5.63368V2.81684Z"
                    fill="#1E293B"
                  />
                </svg>
                Work Experience
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("experience")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="px-5 pt-0 pb-4 w-full">
              <div className="flex justify-between items-center py-4">
                <span className="text-sm text-slate-600">Claimed (Months)</span>
                <div style={{ color: "#1E293B", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                  {interviewData.experience.claimedMonths}
                </div>
              </div>
              <div className="flex justify-between items-center py-4" style={{ borderTop: "1px solid #F8FAFC" }}>
                <span className="text-sm text-slate-600">
                  Validated Actual
                </span>
                <div style={{ color: "#1A237E", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                  {interviewData.experience.validatedMonths}
                </div>
              </div>
              <div className="flex justify-between items-center py-4" style={{ borderTop: "1px solid #F8FAFC" }}>
                <span className="text-sm font-semibold text-slate-900">
                  Experience Score
                </span>
                <div style={{ color: "#1A237E", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                  {interviewData.experience.score}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13.035"
                  height="13.035"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d="M1.22024 9.73576C0.892701 8.94502 0.724121 8.09751 0.724121 7.24162C0.724121 5.51307 1.41078 3.85532 2.63305 2.63305C3.85532 1.41078 5.51307 0.724121 7.24162 0.724121C8.97017 0.724121 10.6279 1.41078 11.8502 2.63305C13.0725 3.85532 13.7591 5.51307 13.7591 7.24162C13.7591 8.09751 13.5905 8.94502 13.263 9.73576C12.9355 10.5265 12.4554 11.245 11.8502 11.8502C11.245 12.4554 10.5265 12.9355 9.73576 13.263C8.94502 13.5905 8.09751 13.7591 7.24162 13.7591C6.38573 13.7591 5.53822 13.5905 4.74748 13.263C3.95674 12.9355 3.23826 12.4554 2.63305 11.8502C2.02785 11.245 1.54777 10.5265 1.22024 9.73576Z"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M7.2417 3.62061V7.24144L9.4142 9.41394"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Entrance Test
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("entranceTest")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="px-5 pt-6 pb-4 w-full">
              {interviewData.entranceTest.name === "Awaited" ||
              !interviewData.entranceTest.name ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400 mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-600">
                    Entrance Scores Awaited
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Test Name</span>
                    <span className="font-medium">
                      {interviewData.entranceTest.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Score</span>
                    <div style={{ color: "#1E293B", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                      {interviewData.entranceTest.score}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Percentile</span>
                    <div style={{ color: "#E11D48", textAlign: "right", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}>
                      {interviewData.entranceTest.percentile}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scoring & Final Evaluation (Col-8/12 equivalent) */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                alignSelf: "stretch",
                borderBottom: "1px solid #E5E5E5",
                background: "#FAFAFA",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <div className="flex items-center justify-center w-[32px] h-[32px] rounded-[6px] bg-[#E5E5E5] shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="shrink-0"
                  >
                  <path
                    d="M9.16662 2.5459C5.26403 2.98203 2.35838 6.35434 2.50402 10.2785C2.64967 14.2027 5.7973 17.3504 9.72149 17.496C13.6457 17.496 17.018 14.736 17.4541 10.8334H9.16662V2.5459V2.5459"
                    stroke="#1A237E"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M17.0733 7.50009H12.5V2.92676C14.6356 3.6844 16.3157 5.36453 17.0733 7.50009V7.50009"
                    stroke="#1A237E"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    stroke-linejoin="round"
                  />
                  </svg>
                </div>
                Evaluation & Scoring
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("scoring")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Objective Scores */}
                <div className="space-y-4">
                  <h3 className="pb-2" style={{ color: "#64748B", fontFamily: "Inter", fontSize: "10px", fontStyle: "normal", fontWeight: 700, lineHeight: "15px", letterSpacing: "1px", textTransform: "uppercase" }}>
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
                        className="w-[72px] h-[32px] px-0 text-center bg-slate-50 rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: "#1A237E", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                        readOnly
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Penalty (Max -5)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.components.penalty}
                        className="w-[72px] h-[32px] px-0 text-center bg-red-50 text-red-600 rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                        readOnly
                      />
                    </div>

                    <div className="pt-2 flex justify-between items-center" style={{ borderTop: "1px solid #F8FAFC" }}>
                      <span className="font-sans text-sm font-bold text-[#1E293B] leading-5">
                        Total - Other
                      </span>
                      <span className="font-bold text-lg text-slate-900 w-20 text-right pr-3" style={{ fontFamily: "Inter" }}>
                        {interviewData.components.assignedTotalOther}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interview Scores */}
                <div className="space-y-4">
                  <h3 className="pb-2" style={{ color: "#64748B", fontFamily: "Inter", fontSize: "10px", fontStyle: "normal", fontWeight: 700, lineHeight: "15px", letterSpacing: "1px", textTransform: "uppercase" }}>
                    GD & PI Scores
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">GD Score (Max 10)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.interviewScores.gd}
                        className="w-[72px] h-[32px] px-0 text-center rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: "#1A237E", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">PI Score (Max 30)</span>
                      <Input
                        type="number"
                        defaultValue={interviewData.interviewScores.pi}
                        className="w-[72px] h-[32px] px-0 text-center rounded-[8px] border border-[#E2E8F0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        style={{ color: "#1A237E", textAlign: "center", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 700, lineHeight: "20px" }}
                      />
                    </div>

                    <div className="pt-2 flex justify-between items-center" style={{ borderTop: "1px solid #F8FAFC" }}>
                      <span className="font-sans text-sm font-bold text-[#1E293B] leading-5">
                        Total - GDPI
                      </span>
                      <span className="font-bold text-lg text-blue-600 w-20 text-right pr-3" style={{ fontFamily: "Inter" }}>
                        {interviewData.interviewScores.totalGDPI}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Composite Score Banner */}
              <div className="relative mt-8 bg-[#2563EB] rounded-xl h-[95px] flex items-center justify-between px-6 overflow-hidden shadow-md">
                {/* Sloped Background SVG */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    viewBox="0 0 693 95"
                    fill="none"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 95L695.333 0V95H0Z" fill="white" fillOpacity="0.15" />
                  </svg>
                </div>

                {/* Left Side: Texts */}
                <div className="relative z-10 text-white space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    FINAL CALCULATION
                  </p>
                  <h3 className="font-bold text-xl md:text-2xl">
                    Composite Score
                  </h3>
                </div>

                {/* Right Side: Score */}
                <div className="relative z-10 flex items-baseline gap-1 text-white pr-2 sm:pr-4">
                  <span className="text-4xl font-black">
                    {interviewData.interviewScores.compositeScore}
                  </span>
                  <span className="text-sm font-bold opacity-80">/ 100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision Panel */}
          <Card
            style={{
              display: "flex",
              paddingTop: "0",
              paddingBottom: "20px",
              flexDirection: "column",
              alignItems: "center",
              gap: "0px",
              alignSelf: "stretch",
              borderRadius: "8px",
              border: "1px solid #D4D4D4",
              background: "#FFF",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            <CardHeader
              className="flex-row space-y-0 justify-between"
              style={{
                display: "flex",
                padding: "16px 20px",
                alignItems: "center",
                gap: "12px",
                alignSelf: "stretch",
                borderBottom: "1px solid #F8FAFC",
                background: "#FAFAFA",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
              }}
            >
              <CardTitle className="flex items-center gap-2 font-sans text-[16px] font-bold leading-[24px] tracking-[0px] text-[#1E293B] m-0 p-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13.035"
                  height="13.035"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d="M1.22024 9.73576C0.892701 8.94502 0.724121 8.09751 0.724121 7.24162C0.724121 5.51307 1.41078 3.85532 2.63305 2.63305C3.85532 1.41078 5.51307 0.724121 7.24162 0.724121C8.97017 0.724121 10.6279 1.41078 11.8502 2.63305C13.0725 3.85532 13.7591 5.51307 13.7591 7.24162C13.7591 8.09751 13.5905 8.94502 13.263 9.73576C12.9355 10.5265 12.4554 11.245 11.8502 11.8502C11.245 12.4554 10.5265 12.9355 9.73576 13.263C8.94502 13.5905 8.09751 13.7591 7.24162 13.7591C6.38573 13.7591 5.53822 13.5905 4.74748 13.263C3.95674 12.9355 3.23826 12.4554 2.63305 11.8502C2.02785 11.245 1.54777 10.5265 1.22024 9.73576Z"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M7.2417 3.62061V7.24144L9.4142 9.41394"
                    stroke="#1E293B"
                    strokeWidth="1.44833"
                    strokeLinecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Admission Decision
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#415876] hover:text-[#1E293B] hover:bg-slate-100 cursor-pointer shrink-0"
                onClick={() => setActiveEditSection("decision")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="campus-select"
                    style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                  >
                    Campus Selection
                  </Label>
                  <Select defaultValue={interviewData.decision.campus}>
                    <SelectTrigger id="campus-select" className="w-full rounded-[8px]" style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}>
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
                    style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                  >
                    Waitlist Status
                  </Label>
                  <Select defaultValue={interviewData.decision.waitlist}>
                    <SelectTrigger id="waitlist-select" className="w-full rounded-[8px]" style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}>
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
                <Label
                  htmlFor="remarks"
                  style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                >
                  Final Remarks / Comments
                </Label>
                <Textarea
                  id="remarks"
                  defaultValue={interviewData.decision.remarks}
                  placeholder="Enter any observational remarks from the panel..."
                  className="min-h-[100px] bg-white border border-[#E2E8F0] rounded-[8px]"
                  style={{ color: "#475569", fontFamily: "Inter", fontSize: "14px", fontStyle: "normal", fontWeight: 500, lineHeight: "20px" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={activeEditSection !== null}
        onOpenChange={(open) => !open && setActiveEditSection(null)}
      >
        <DialogContent
          className={
            activeEditSection === "academics" || activeEditSection === "scoring"
              ? "max-w-[800px] w-[95%] rounded-[12px] p-[24px] md:p-[32px] gap-0 bg-white max-h-[98vh] overflow-y-auto"
              : "max-w-[600px] w-[95%] rounded-[12px] p-[24px] md:p-[32px] gap-0 bg-white max-h-[98vh] overflow-y-auto"
          }
        >
          <DialogHeader className="flex flex-row items-center gap-2 pb-4 border-b border-[#E5E5E5] space-y-0">
            <div className="flex items-center justify-center h-[36px] w-[36px] rounded-full bg-[#FAFAFA] shrink-0">
              {activeEditSection === "academics" && (
                <GraduationCap className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "experience" && (
                <Briefcase className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "entranceTest" && (
                <Clock className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "scoring" && (
                <Award className="h-4 w-4 text-[#415876]" />
              )}
              {activeEditSection === "decision" && (
                <CheckCircle2 className="h-4 w-4 text-[#415876]" />
              )}
            </div>
            <DialogTitle className="text-[#0A0A0A] font-semibold text-[20px] leading-8 tracking-[-0.24px] font-sans">
              {activeEditSection === "academics" && "Academic Profile"}
              {activeEditSection === "experience" && "Work Experience"}
              {activeEditSection === "entranceTest" && "Entrance Test"}
              {activeEditSection === "scoring" && "Evaluation & Scoring"}
              {activeEditSection === "decision" && "Admission Decision"}
            </DialogTitle>
          </DialogHeader>

          {activeEditSection === "academics" && (
            <EditAcademicsForm
              data={interviewData.academics}
              onSave={(d) => handleSave("Academic Profile", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "experience" && (
            <EditExperienceForm
              data={interviewData.experience}
              onSave={(d) => handleSave("Work Experience", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "entranceTest" && (
            <EditEntranceTestForm
              data={interviewData.entranceTest}
              onSave={(d) => handleSave("Entrance Test", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "scoring" && (
            <EditScoringForm
              data={{
                achievement: interviewData.components.achievement,
                penalty: interviewData.components.penalty,
                gdScore: interviewData.interviewScores.gd,
                piScore: interviewData.interviewScores.pi,
              }}
              onSave={(d) => handleSave("Evaluation & Scoring", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
          {activeEditSection === "decision" && (
            <EditDecisionForm
              data={interviewData.decision}
              onSave={(d) => handleSave("Admission Decision", d)}
              onClose={() => setActiveEditSection(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface GDFormProps {
  data: any;
  onSave: (updatedData: any) => void;
  onClose: () => void;
}

function EditAcademicsForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    tenthPercentage: data.tenth.percentage,
    tenthScore: data.tenth.score,
    twelfthPercentage: data.twelfth.percentage,
    twelfthScore: data.twelfth.score,
    ugPercentage: data.ug.percentage,
    ugScore: data.ug.score,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-6 gap-y-3 pt-5 pb-1">
      <div className="col-span-2 pb-1">
        <h3 className="font-bold text-slate-800 text-sm">10th Standard</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentage
        </Label>
        <Input
          value={formData.tenthPercentage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tenthPercentage: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score
        </Label>
        <Input
          type="number"
          value={formData.tenthScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tenthScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="col-span-2 pb-1 pt-3 border-t border-[#F1F5F9]">
        <h3 className="font-bold text-slate-800 text-sm">12th Standard</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentage
        </Label>
        <Input
          value={formData.twelfthPercentage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, twelfthPercentage: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score
        </Label>
        <Input
          type="number"
          value={formData.twelfthScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, twelfthScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="col-span-2 pb-1 pt-3 border-t border-[#F1F5F9]">
        <h3 className="font-bold text-slate-800 text-sm">Under-Graduation</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentage
        </Label>
        <Input
          value={formData.ugPercentage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, ugPercentage: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score
        </Label>
        <Input
          type="number"
          value={formData.ugScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, ugScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] col-span-2 mt-2">
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

function EditExperienceForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    claimedMonths: data.claimedMonths,
    validatedMonths: data.validatedMonths,
    score: data.score,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-5 pb-1">
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Claimed Months
        </Label>
        <Input
          value={formData.claimedMonths}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, claimedMonths: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Validated Actual (Months)
        </Label>
        <Input
          value={formData.validatedMonths}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, validatedMonths: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Experience Score
        </Label>
        <Input
          type="number"
          value={formData.score}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, score: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
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

function EditEntranceTestForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    name: data.name,
    score: data.score,
    percentile: data.percentile,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-5 pb-1">
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Test Name
        </Label>
        <Select
          value={formData.name}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, name: val }))
          }
        >
          <SelectTrigger className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]">
            <SelectValue placeholder="Select Test" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CAT">CAT</SelectItem>
            <SelectItem value="XAT">XAT</SelectItem>
            <SelectItem value="MAT">MAT</SelectItem>
            <SelectItem value="GMAT">GMAT</SelectItem>
            <SelectItem value="CMAT">CMAT</SelectItem>
            <SelectItem value="ATMA">ATMA</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Score
        </Label>
        <Input
          value={formData.score}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, score: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Percentile
        </Label>
        <Input
          value={formData.percentile}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, percentile: e.target.value }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
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

function EditScoringForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    achievement: data.achievement,
    penalty: data.penalty,
    gdScore: data.gdScore,
    piScore: data.piScore,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-6 gap-y-3 pt-5 pb-1">
      <div className="col-span-2 pb-1">
        <h3 className="font-bold text-slate-800 text-sm">Other Components</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Achievement (Max 5)
        </Label>
        <Input
          type="number"
          value={formData.achievement}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, achievement: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Penalty (Max -5)
        </Label>
        <Input
          type="number"
          value={formData.penalty}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, penalty: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="col-span-2 pb-1 pt-3 border-t border-[#F1F5F9]">
        <h3 className="font-bold text-slate-800 text-sm">GD &amp; PI Scores</h3>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          GD Score (Max 10)
        </Label>
        <Input
          type="number"
          value={formData.gdScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, gdScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          PI Score (Max 30)
        </Label>
        <Input
          type="number"
          value={formData.piScore}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, piScore: Number(e.target.value) }))
          }
          className="border-[#D4D4D4] rounded-[8px] h-10 text-[14px]"
        />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E5] col-span-2 mt-2">
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

function EditDecisionForm({ data, onSave, onClose }: GDFormProps) {
  const [formData, setFormData] = React.useState({
    campus: data.campus,
    waitlist: data.waitlist,
    remarks: data.remarks,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-5 pb-1">
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Campus Selection
        </Label>
        <Select
          value={formData.campus}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, campus: val }))
          }
        >
          <SelectTrigger className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]">
            <SelectValue placeholder="Select Campus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Awaited Scores">Awaited Scores</SelectItem>
            <SelectItem value="PGDM Bangalore">PGDM Bangalore</SelectItem>
            <SelectItem value="PGDM Chennai">PGDM Chennai</SelectItem>
            <SelectItem value="PGDM Kochi">PGDM Kochi</SelectItem>
            <SelectItem value="Not Selected">Not Selected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Waitlist Status
        </Label>
        <Select
          value={formData.waitlist}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, waitlist: val }))
          }
        >
          <SelectTrigger className="w-full border-[#D4D4D4] bg-white rounded-[8px] h-10 text-[14px]">
            <SelectValue placeholder="Select Waitlist" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Not Applicable">Not Applicable</SelectItem>
            <SelectItem value="WL-1">Waitlist 1</SelectItem>
            <SelectItem value="WL-2">Waitlist 2</SelectItem>
            <SelectItem value="WL-3">Waitlist 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-[#64748B] font-semibold text-[12px] leading-4 tracking-[0.6px] uppercase font-sans">
          Final Remarks / Comments
        </Label>
        <Textarea
          value={formData.remarks}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, remarks: e.target.value }))
          }
          placeholder="Enter any observational remarks from the panel..."
          className="min-h-[100px] bg-white border border-[#D4D4D4] rounded-[8px] text-[14px]"
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
