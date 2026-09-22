"use client";

import * as React from "react";
import {
  Loader2,
  Receipt,
  CheckCircle2,
  Info,
  Tag,
  Calendar,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/use-organizations";

const FEE_PRESETS = [500, 1000, 1500, 2000, 2500];
const DISCOUNT_PERCENT_PRESETS = [10, 20, 25, 50];

export default function FeesSettingsPage() {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId || "";

  const { data: settings, isLoading } = useOrganizationSettings(orgId);
  const updateSettings = useUpdateOrganizationSettings(orgId);

  const [applicationFee, setApplicationFee] = React.useState("2000");
  const [discountEnabled, setDiscountEnabled] = React.useState(false);
  const [discountType, setDiscountType] = React.useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = React.useState("20");
  const [discountReason, setDiscountReason] = React.useState("Early Bird Application Discount");
  const [discountStartDate, setDiscountStartDate] = React.useState("");
  const [discountEndDate, setDiscountEndDate] = React.useState("");
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    setHeader({
      title: "Fee & Discount Settings",
      description:
        "Manage standard admission application fee and configure time-limited discounts or early-bird promotions.",
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  React.useEffect(() => {
    if (settings && !initialized) {
      setApplicationFee(String(settings.applicationFee ?? 2000));
      setDiscountEnabled(Boolean(settings.discountEnabled));
      setDiscountType((settings.discountType as any) || "percentage");
      setDiscountValue(String(settings.discountValue ?? 20));
      setDiscountReason(settings.discountReason || "Early Bird Application Discount");
      setDiscountStartDate(settings.discountStartDate || "");
      setDiscountEndDate(settings.discountEndDate || "");
      setInitialized(true);
    }
  }, [settings, initialized]);

  const numAppFee = Number(applicationFee) || 0;
  const numDiscountVal = Number(discountValue) || 0;

  // Compute discount status (active, scheduled, expired, disabled)
  const discountStatus = React.useMemo(() => {
    if (!discountEnabled) return { status: "disabled", label: "Disabled", color: "bg-slate-100 text-slate-600 border-slate-200" };
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (discountStartDate && todayStr < discountStartDate) {
      return {
        status: "scheduled",
        label: `Scheduled (Starts ${discountStartDate})`,
        color: "bg-blue-50 text-blue-700 border-blue-200",
      };
    }
    if (discountEndDate && todayStr > discountEndDate) {
      return {
        status: "expired",
        label: `Expired on ${discountEndDate}`,
        color: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    if (discountEndDate) {
      const end = new Date(discountEndDate);
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        status: "active",
        label: `Active (${diffDays > 0 ? `${diffDays} days left` : "Ends today"})`,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    return {
      status: "active",
      label: "Active (No Expiry)",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }, [discountEnabled, discountStartDate, discountEndDate]);

  // Compute effective fee calculation
  const calculatedDiscount = React.useMemo(() => {
    if (!discountEnabled || discountStatus.status === "expired" || discountStatus.status === "scheduled") {
      return 0;
    }
    if (discountType === "percentage") {
      const pct = Math.min(100, Math.max(0, numDiscountVal));
      return (numAppFee * pct) / 100;
    }
    return Math.min(numAppFee, Math.max(0, numDiscountVal));
  }, [discountEnabled, discountStatus, discountType, numDiscountVal, numAppFee]);

  const effectiveFee = Math.max(0, numAppFee - calculatedDiscount);

  const isDirty = React.useMemo(() => {
    if (!settings) return false;
    return (
      Number(applicationFee) !== Number(settings.applicationFee ?? 2000) ||
      discountEnabled !== Boolean(settings.discountEnabled) ||
      discountType !== ((settings.discountType as any) || "percentage") ||
      Number(discountValue) !== Number(settings.discountValue ?? 20) ||
      discountReason !== (settings.discountReason || "Early Bird Application Discount") ||
      discountStartDate !== (settings.discountStartDate || "") ||
      discountEndDate !== (settings.discountEndDate || "")
    );
  }, [
    settings,
    applicationFee,
    discountEnabled,
    discountType,
    discountValue,
    discountReason,
    discountStartDate,
    discountEndDate,
  ]);

  const handleReset = () => {
    if (settings) {
      setApplicationFee(String(settings.applicationFee ?? 2000));
      setDiscountEnabled(Boolean(settings.discountEnabled));
      setDiscountType((settings.discountType as any) || "percentage");
      setDiscountValue(String(settings.discountValue ?? 20));
      setDiscountReason(settings.discountReason || "Early Bird Application Discount");
      setDiscountStartDate(settings.discountStartDate || "");
      setDiscountEndDate(settings.discountEndDate || "");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const appFeeNum = Number(applicationFee);
    if (Number.isNaN(appFeeNum) || appFeeNum < 0) return;

    updateSettings.mutate({
      applicationFee: appFeeNum,
      discountEnabled,
      discountType,
      discountValue: Number(discountValue) || 0,
      discountReason: discountReason.trim(),
      discountStartDate: discountStartDate || undefined,
      discountEndDate: discountEndDate || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Fee & Discount Configuration */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card 1: Standard Base Application Fee */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#fafafa] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-[8px] bg-blue-100 flex items-center justify-center text-[#2563EB]">
                  <Receipt className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Base Application Fee</h3>
                  <p className="text-xs text-slate-500">Standard amount charged before any promotional discounts</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                Razorpay Online
              </Badge>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {!orgId || isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span>Loading current fee configuration...</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="applicationFee" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Standard Amount (INR)
                    </Label>
                    <div className="relative max-w-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                        ₹
                      </div>
                      <Input
                        id="applicationFee"
                        type="number"
                        min={0}
                        step="1"
                        className="pl-8 h-10 text-base font-bold text-slate-900 border-slate-300 focus-visible:ring-blue-600 rounded-[8px]"
                        value={applicationFee}
                        onChange={(e) => setApplicationFee(e.target.value)}
                        placeholder="2000"
                      />
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Quick Select Preset:</span>
                    <div className="flex flex-wrap gap-2">
                      {FEE_PRESETS.map((preset) => {
                        const isSelected = Number(applicationFee) === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setApplicationFee(String(preset))}
                            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            ₹{preset.toLocaleString("en-IN")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Limited-Time Promotional Discount */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#fafafa] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-[8px] bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Tag className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Limited-Time Promotional Discount</h3>
                  <p className="text-xs text-slate-500">Automatically reduce application fees within a specified campaign window</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`text-xs font-semibold ${discountStatus.color}`}>
                  {discountStatus.label}
                </Badge>
                <div className="flex items-center gap-2">
                  <Switch
                    id="discountToggle"
                    checked={discountEnabled}
                    onCheckedChange={setDiscountEnabled}
                    disabled={!orgId || isLoading}
                  />
                  <Label htmlFor="discountToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    {discountEnabled ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {!discountEnabled ? (
                <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-5 text-center flex flex-col items-center justify-center gap-2">
                  <Tag className="size-6 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Promotional discounts are currently disabled</p>
                  <p className="text-xs text-slate-500 max-w-md">
                    Enable this option to provide automated percentage or fixed-amount fee reductions for applicants during specific admission windows.
                  </p>
                </div>
              ) : (
                <>
                  {/* Campaign Name */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="discountReason" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Promotion / Campaign Title
                    </Label>
                    <Input
                      id="discountReason"
                      className="h-10 text-sm font-medium border-slate-300 rounded-[8px] focus-visible:ring-emerald-600"
                      placeholder="e.g. Early Bird Admission Offer"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-500">
                      Displayed on the applicant checkout screen alongside the fee breakdown.
                    </span>
                  </div>

                  {/* Discount Type and Value */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="discountType" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Discount Type
                      </Label>
                      <Select
                        value={discountType}
                        onValueChange={(val: "percentage" | "fixed") => setDiscountType(val)}
                      >
                        <SelectTrigger id="discountType" className="h-10 text-sm border-slate-300 rounded-[8px]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Discount (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount Off (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="discountValue" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {discountType === "percentage" ? "Discount Percentage (%)" : "Fixed Discount Amount (INR)"}
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                          {discountType === "percentage" ? "%" : "₹"}
                        </div>
                        <Input
                          id="discountValue"
                          type="number"
                          min={0}
                          max={discountType === "percentage" ? 100 : numAppFee}
                          step="1"
                          className="pl-8 h-10 text-sm font-bold text-slate-900 border-slate-300 focus-visible:ring-emerald-600 rounded-[8px]"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === "percentage" ? "20" : "500"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Percentages if percentage type is selected */}
                  {discountType === "percentage" && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-medium text-slate-500">Quick Select Percentage:</span>
                      <div className="flex flex-wrap gap-2">
                        {DISCOUNT_PERCENT_PRESETS.map((pct) => {
                          const isSelected = Number(discountValue) === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setDiscountValue(String(pct))}
                              className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {pct}% OFF
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Separator className="my-1" />

                  {/* Limited-Time Date Range */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-slate-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Promotional Time Window (Validity Dates)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="discountStartDate" className="text-xs font-medium text-slate-600">
                          Valid From Date
                        </Label>
                        <Input
                          id="discountStartDate"
                          type="date"
                          className="relative h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-emerald-600 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                          value={discountStartDate}
                          onChange={(e) => setDiscountStartDate(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="discountEndDate" className="text-xs font-medium text-slate-600">
                          Valid Until Date (Expiry)
                        </Label>
                        <Input
                          id="discountEndDate"
                          type="date"
                          className="relative h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-emerald-600 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                          value={discountEndDate}
                          onChange={(e) => setDiscountEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Leave dates blank for an ongoing offer, or set specific dates to automatically start and conclude the campaign.
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Footer Bar */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {isDirty ? (
                <span className="text-amber-600 font-medium flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  You have unsaved changes
                </span>
              ) : (
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Fee settings synchronized
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isDirty && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="rounded-[8px] text-xs h-9"
                  disabled={updateSettings.isPending}
                >
                  Reset
                </Button>
              )}
              <Button
                type="submit"
                disabled={!orgId || isLoading || updateSettings.isPending || !isDirty}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-5 h-9 rounded-[8px] shadow-xs cursor-pointer"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Saving Settings...
                  </>
                ) : (
                  "Save Fee & Discount Settings"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Fee Summary & Breakdown Preview */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-6">
          {/* Card: Effective Checkout Breakdown */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#fafafa]">
              <h4 className="text-sm font-bold text-slate-900">Live Fee Calculation Preview</h4>
              <p className="text-xs text-slate-500">Real-time breakdown as seen on the student portal</p>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Standard Application Fee</span>
                <span className="font-semibold text-slate-900">₹{numAppFee.toLocaleString("en-IN")}.00</span>
              </div>

              {discountEnabled && calculatedDiscount > 0 ? (
                <div className="flex justify-between items-center text-sm text-emerald-700 bg-emerald-50/70 border border-emerald-200 rounded-[8px] p-2.5">
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">{discountReason || "Discount Applied"}</span>
                    <span className="text-[10px] text-emerald-600">
                      {discountType === "percentage" ? `${numDiscountVal}% reduction` : `Flat ₹${numDiscountVal} off`}
                    </span>
                  </div>
                  <span className="font-bold text-sm">- ₹{calculatedDiscount.toLocaleString("en-IN")}.00</span>
                </div>
              ) : discountEnabled && discountStatus.status !== "active" ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-[8px] p-2.5">
                  <Clock className="size-3.5 shrink-0" />
                  <span>Discount is {discountStatus.label.toLowerCase()} — regular fee applies.</span>
                </div>
              ) : null}

              <Separator />

              <div className="flex justify-between items-baseline pt-1">
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Net Payable Amount</span>
                  <span className="text-[11px] text-slate-400">Taxes & Gateway charges included</span>
                </div>
                <span className="text-2xl font-extrabold text-blue-700 font-mono">
                  ₹{effectiveFee.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="rounded-[8px] bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs text-slate-600 mt-2">
                <span>Gateway Status:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                  Razorpay Active
                </Badge>
              </div>
            </div>
          </div>

          {/* Policy Information Box */}
          <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-5 shadow-xs text-xs text-slate-600 flex flex-col gap-3">
            <h5 className="font-bold text-slate-900 flex items-center gap-2">
              <Info className="size-4 text-blue-600" />
              Fee & Promotion Guidelines
            </h5>
            <ul className="space-y-2 list-disc list-inside text-slate-500 leading-relaxed">
              <li>Discounts apply automatically at the checkout step during the active date range.</li>
              <li>When expired or disabled, checkout reverts immediately to the standard base fee.</li>
              <li>Payment records on the <strong>Payments</strong> table record both base and discounted values.</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
