"use client";

import * as React from "react";

import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardFilterDialogProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly uniquePrograms: string[];
  readonly uniqueCampuses: string[];
  readonly filterProgram: string;
  readonly setFilterProgram: (v: string) => void;
  readonly filterCampus: string;
  readonly setFilterCampus: (v: string) => void;
  readonly filterStatus: string;
  readonly setFilterStatus: (v: string) => void;
  readonly onApply: () => void;
  readonly onReset: () => void;
}

export function DashboardFilterDialog({
  isOpen,
  onOpenChange,
  uniquePrograms,
  uniqueCampuses,
  filterProgram,
  setFilterProgram,
  filterCampus,
  setFilterCampus,
  filterStatus,
  setFilterStatus,
  onApply,
  onReset,
}: DashboardFilterDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] px-6 bg-white rounded-2xl gap-5 border border-slate-200 overflow-y-auto max-h-[90vh] text-left">
        {/* Card: Application Filters */}
        <div className="bg-white shadow-2xs rounded-xl p-5 md:p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[#F5F5F5] text-black border rounded-[10px] flex items-center justify-center shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <h3 className="text-[17px] font-bold text-[#0F172A]">
              Application Filters
            </h3>
          </div>

          {/* Filter by Program */}
          <div className="flex flex-col gap-2">
            <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
              Program / Stream
            </Label>
            <Select
              value={filterProgram || "all"}
              onValueChange={(val) =>
                setFilterProgram(val === "all" ? "" : val)
              }
            >
              <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {uniquePrograms.map((prog) => (
                  <SelectItem key={prog} value={prog}>
                    {prog}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Campus */}
          <div className="flex flex-col gap-2">
            <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
              Campus
            </Label>
            <Select
              value={filterCampus || "all"}
              onValueChange={(val) => setFilterCampus(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {uniqueCampuses.map((camp) => (
                  <SelectItem key={camp} value={camp}>
                    {camp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter by Status */}
          <div className="flex flex-col gap-2">
            <Label className="text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
              Mapped Status
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full border-[#D4D4D4] rounded-lg h-11 text-sm bg-white text-[#0F172A]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Verified">Verified</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-start mt-2 ml-5">
          <Button
            variant="outline"
            onClick={onReset}
            className="h-11 px-6 rounded-[10px] text-[#475569] border-[#D4D4D4] hover:bg-slate-50 transition-colors"
          >
            Reset
          </Button>
          <Button
            onClick={onApply}
            className="h-11 px-8 rounded-[10px] bg-[#2563EB] text-white hover:bg-[#1d4ed8] transition-colors"
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
