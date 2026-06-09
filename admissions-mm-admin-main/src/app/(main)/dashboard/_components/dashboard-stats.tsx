"use client";

import * as React from "react";

import { FileText, CheckCircle2, Clock, XCircle, Wallet } from "lucide-react";

import { type Application } from "@/data/mock-applications";

interface DashboardStatsProps {
  readonly applications: Application[];
  readonly isLoading: boolean;
  readonly mounted: boolean;
}

export function DashboardStats({
  applications,
  isLoading,
  mounted,
}: DashboardStatsProps) {
  const showLoader = !mounted || isLoading;

  // Derived Statistics
  const totalCount = applications.length;

  const verifiedCount = React.useMemo(() => {
    return applications.filter((a) => a.formStatus === "Accepted").length;
  }, [applications]);

  const pendingCount = React.useMemo(() => {
    return applications.filter(
      (a) =>
        a.formStatus === "Submitted" ||
        a.formStatus === "Under Review" ||
        a.formStatus === "In Progress" ||
        a.formStatus === "Incomplete",
    ).length;
  }, [applications]);

  const rejectedCount = React.useMemo(() => {
    return applications.filter((a) => a.formStatus === "Rejected").length;
  }, [applications]);

  const totalFees = React.useMemo(() => {
    return applications
      .filter((a) => a.paymentStatus === "Paid")
      .reduce((acc, a) => acc + (a.paymentAmount ?? 0), 0);
  }, [applications]);

  // Format currency dynamically
  const formattedFees = React.useMemo(() => {
    if (totalFees >= 100000) {
      return `₹${(totalFees / 100000).toFixed(1)}L`;
    }
    if (totalFees >= 1000) {
      return `₹${(totalFees / 1000).toFixed(1)}k`;
    }
    return `₹${totalFees}`;
  }, [totalFees]);

  if (showLoader) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#e5e5e5] rounded-[8px] p-[25px] flex flex-col gap-4 shadow-xs animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 rounded-[8px] bg-slate-200" />
              <div className="w-14 h-6 rounded-full bg-slate-200" />
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-20 bg-slate-200 rounded" />
            </div>
            <div className="w-full h-[6px] rounded bg-slate-200 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const verifiedPercent =
    totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;
  const pendingPercent = totalCount > 0 ? (pendingCount / totalCount) * 100 : 0;
  const rejectedPercent =
    totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Card 1: Total Applications */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-[25px] flex flex-col items-start shadow-xs relative transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-center w-full">
          <div className="bg-[#eff6ff] rounded-[8px] p-[8px] flex items-center justify-center shrink-0">
            <FileText className="size-6 text-[#2563eb]" />
          </div>
          <div className="bg-[rgba(37,99,235,0.15)] px-[8px] py-[4px] rounded-[9999px] shrink-0">
            <span className="text-[#2563eb] text-[12px] font-medium">
              +12.5%
            </span>
          </div>
        </div>
        <span className="text-[#64748b] text-[14px] font-medium mt-4">
          Total Applications
        </span>
        <span className="text-[#0f172a] text-[24px] font-bold mt-1 mb-4 leading-none">
          {totalCount.toLocaleString()}
        </span>
        <div className="bg-[#f1f5f9] h-[6px] rounded-[9999px] w-full overflow-hidden">
          <div
            className="bg-[#2563eb] h-full rounded-[9999px]"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Card 2: Verified */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-[25px] flex flex-col items-start shadow-xs relative transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-center w-full">
          <div className="bg-[#ecfdf5] rounded-[8px] p-[8px] flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6 text-[#10b981]" />
          </div>
          <div className="bg-[#ecfdf5] px-[8px] py-[4px] rounded-[9999px] shrink-0">
            <span className="text-[#059669] text-[12px] font-medium">
              +8.2%
            </span>
          </div>
        </div>
        <span className="text-[#64748b] text-[14px] font-medium mt-4">
          Verified
        </span>
        <span className="text-[#0f172a] text-[24px] font-bold mt-1 mb-4 leading-none">
          {verifiedCount.toLocaleString()}
        </span>
        <div className="bg-[#f1f5f9] h-[6px] rounded-[9999px] w-full overflow-hidden">
          <div
            className="bg-[#10b981] h-full rounded-[9999px]"
            style={{ width: `${verifiedPercent}%` }}
          />
        </div>
      </div>

      {/* Card 3: Pending Review */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-[25px] flex flex-col items-start shadow-xs relative transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-center w-full">
          <div className="bg-[#fffbeb] rounded-[8px] p-[8px] flex items-center justify-center shrink-0">
            <Clock className="size-6 text-[#fbbf24]" />
          </div>
        </div>
        <span className="text-[#64748b] text-[14px] font-medium mt-4">
          Pending Review
        </span>
        <span className="text-[#0f172a] text-[24px] font-bold mt-1 mb-4 leading-none">
          {pendingCount.toLocaleString()}
        </span>
        <div className="bg-[#f1f5f9] h-[6px] rounded-[9999px] w-full overflow-hidden">
          <div
            className="bg-[#fbbf24] h-full rounded-[9999px]"
            style={{ width: `${pendingPercent}%` }}
          />
        </div>
      </div>

      {/* Card 4: Rejected */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-[25px] flex flex-col items-start shadow-xs relative transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-center w-full">
          <div className="bg-[#fff1f2] rounded-[8px] p-[8px] flex items-center justify-center shrink-0">
            <XCircle className="size-6 text-[#f43f5e]" />
          </div>
        </div>
        <span className="text-[#64748b] text-[14px] font-medium mt-4">
          Rejected
        </span>
        <span className="text-[#0f172a] text-[24px] font-bold mt-1 mb-4 leading-none">
          {rejectedCount.toLocaleString()}
        </span>
        <div className="bg-[#f1f5f9] h-[6px] rounded-[9999px] w-full overflow-hidden">
          <div
            className="bg-[#f43f5e] h-full rounded-[9999px]"
            style={{ width: `${rejectedPercent}%` }}
          />
        </div>
      </div>

      {/* Card 5: Fees Collected */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-[25px] flex flex-col items-start shadow-xs relative transition-all duration-200 hover:shadow-md">
        <div className="flex justify-between items-center w-full">
          <div className="bg-[#eef2ff] rounded-[8px] p-[8px] flex items-center justify-center shrink-0">
            <Wallet className="size-6 text-[#4f46e5]" />
          </div>
        </div>
        <span className="text-[#64748b] text-[14px] font-medium mt-4">
          Fees Collected
        </span>
        <span className="text-[#0f172a] text-[24px] font-bold mt-1 mb-4 leading-none">
          {formattedFees}
        </span>
        <div className="bg-[#f1f5f9] h-[6px] rounded-[9999px] w-full overflow-hidden">
          <div
            className="bg-[#4f46e5] h-full rounded-[9999px]"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
