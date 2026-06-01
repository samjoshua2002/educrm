"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateBranch, useBranches } from "@/hooks/use-branches";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
] as const;

export default function AddBranchPage() {
  const router = useRouter();
  const createBranch = useCreateBranch();
  const { data: branchesRes } = useBranches(1, 1000);
  const allBranches = branchesRes?.data || [];

  const [form, setForm] = React.useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    description: "",
    status: "Active", // UI-only field, converted to isActive boolean for API
  });

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    if (form.code && allBranches.some(b => b.code?.toLowerCase() === form.code.toLowerCase())) {
      toast.error("Branch code already exists!");
      return;
    }

    createBranch.mutate(
      {
        name: form.name,
        code: form.code || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        description: form.description || undefined,
        isActive: form.status === "Active",
      },
      {
        onSuccess: () => {
          router.push("/organization/branches");
        },
      }
    );
  }

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 gap-3">
        <Link href="/organization/branches">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Add Branch</h1>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left — col 8 */}
          <Card className="lg:col-span-8 bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-input px-6">
              <CardTitle className="text-[18px] font-medium text-foreground">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 flex flex-col divide-y divide-input">
              {/* Basic Info */}
              <section className="flex flex-col gap-5 pb-6 pt-6">
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="name"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      BRANCH NAME
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Downtown Campus"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="code"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      BRANCH CODE
                    </Label>
                    <Input
                      id="code"
                      placeholder="e.g., DWT-01"
                      value={form.code}
                      onChange={(e) => set("code", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </section>

              {/* Location */}
              <section className="flex flex-col gap-5 py-6">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="address"
                    className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                  >
                    STREET ADDRESS
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete street address..."
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    className="border border-input min-h-[80px] rounded-[8px] text-[12px] placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </section>

              <section className="flex flex-col gap-5 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="state"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      STATE
                    </Label>
                    <Select
                      value={form.state}
                      onValueChange={(v) => set("state", v)}
                    >
                      <SelectTrigger
                        id="state"
                        className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-foreground"
                      >
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="city"
                      className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                    >
                      CITY
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g., Mumbai"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </section>

              {/* Description */}
              <section className="flex flex-col gap-5 pt-6">
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="description"
                    className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground"
                  >
                    BRANCH DESCRIPTION
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Write a description for this branch..."
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    className="border border-input min-h-[120px] rounded-[8px] text-[12px] placeholder:text-muted-foreground resize-none"
                  />
                </div>
              </section>
            </CardContent>
          </Card>

          {/* Right — col 4 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Action Card */}
            <div
              className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-6"
            >
              <h2
                className="text-[18px] font-medium text-foreground"
              >
                CRM Detail
              </h2>

              <div className="flex flex-col gap-5">
                {/* Status Toggle Switch */}
                <div className="flex items-center justify-between rounded-[8px] p-4 bg-[#F8F9FA]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Mark as Active Branch</span>
                    <span className="text-xs text-muted-foreground">Branch will be visible in CRM</span>
                  </div>
                  <div className="flex items-center">
                    <Switch
                      checked={form.status === "Active"}
                      onCheckedChange={(checked) => set("status", checked ? "Active" : "Inactive")}
                      className="data-[state=checked]:bg-[#000666]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <Button
                  disabled={createBranch.isPending}
                  className="w-full bg-ring hover:bg-ring/90 text-primary-foreground flex items-center justify-center gap-2 h-11 text-base font-medium rounded-[8px]"
                  onClick={handleSubmit}
                >
                  {createBranch.isPending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Check className="size-5" />
                  )}
                  Save Branch
                </Button>
                <Link href="/organization/branches" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full border border-border h-11 text-base font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>

              {/* Quick Stats Section */}
              <div className="border-t border-border pt-5 mt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  QUICK STATS
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[8px] p-4 bg-[#F8F9FA] flex flex-col gap-1">
                    <span className="text-2xl font-bold text-blue-900">0</span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Assigned Staff</span>
                  </div>
                  <div className="rounded-[8px] p-4 bg-[#F8F9FA] flex flex-col gap-1">
                    <span className="text-2xl font-bold text-blue-900">0</span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Active Students</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Protip Card */}
            <div
              className="bg-blue-50 flex flex-col gap-4 p-6 rounded-[8px]"
            >
              <p className="text-blue-600 text-[18px] font-semibold leading-normal">
                Protip
              </p>
              <p className="text-slate-700 text-[12px] font-medium leading-[20px] tracking-[0.6px]">
                Organizing branches correctly allows you to assign leads accurately and track performance by location.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
