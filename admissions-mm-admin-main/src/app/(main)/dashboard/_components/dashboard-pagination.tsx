"use client";

import * as React from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardPaginationProps {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly totalCount: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly setCurrentPage: (page: number) => void;
}

export function DashboardPagination({
  startIndex,
  endIndex,
  totalCount,
  currentPage,
  totalPages,
  setCurrentPage,
}: DashboardPaginationProps) {
  return (
    <div className="border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-[#FCFDFD]">
      <span className="text-sm text-slate-500 font-normal">
        Showing{" "}
        <span className="font-semibold text-slate-800">{startIndex}</span> to{" "}
        <span className="font-semibold text-slate-800">{endIndex}</span> of{" "}
        <span className="font-semibold text-slate-800">{totalCount}</span>{" "}
        entries
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          className="h-9 px-3 rounded-[8px] border border-[#e2e8f0]"
        >
          <ChevronLeft className="size-4 mr-1" />
          Previous
        </Button>
        {[...Array(totalPages)].map((_, i) => (
          <Button
            key={i}
            variant={currentPage === i + 1 ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(i + 1)}
            className={cn(
              "h-9 w-9 p-0 rounded-[8px]",
              currentPage === i + 1
                ? "bg-[#2563EB] text-white"
                : "border border-[#e2e8f0]",
            )}
          >
            {i + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          className="h-9 px-3 rounded-[8px] border border-[#e2e8f0]"
        >
          Next
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
