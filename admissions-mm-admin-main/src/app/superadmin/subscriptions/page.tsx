"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { usePageHeader } from "@/hooks/use-page-header";
import { usePlatformOverview } from "@/hooks/use-analytics";
import { useUpdateOrganizationGeneric } from "@/hooks/use-organizations";
import { cn } from "@/lib/utils";
import type { PlatformOrgRow } from "@/types/analytics";
import {
  EmptyBlock,
  LoadingBlock,
  StatCard,
  fmtNum,
  humanize,
} from "@/app/organization/reports/_components/analytics-ui";
import { timeAgo } from "@/components/notifications/notification-utils";

type FilterTab = "all" | "active" | "expiring-30" | "expiring-7" | "expired";
type SortOption = "days-asc" | "days-desc" | "name-asc" | "date-asc";

const SUB_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: "bg-[#f0fdf4] dark:bg-emerald-950/40", text: "text-[#16a34a] dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  expiring: { bg: "bg-[#fffbeb] dark:bg-amber-950/40", text: "text-[#d97706] dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  expired: { bg: "bg-[#fef2f2] dark:bg-rose-950/40", text: "text-[#dc2626] dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SubscriptionsPage() {
  usePageHeader({
    title: "Subscriptions",
    description:
      "Monitor organization license status, remaining subscription days, renewals, and extend subscriptions.",
  });

  const { data, isLoading, isFetching, refetch } = usePlatformOverview();
  const updateMutation = useUpdateOrganizationGeneric();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<FilterTab>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("days-asc");

  // Extend subscription modal state
  const [extendOrg, setExtendOrg] = React.useState<PlatformOrgRow | null>(null);
  const [extendDate, setExtendDate] = React.useState<string>("");

  const k = data?.kpis;
  const organizations = data?.organizations || [];

  // Filter organizations
  const filteredOrgs = React.useMemo(() => {
    return organizations.filter((org) => {
      // Search check
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const nameMatch = org.name?.toLowerCase().includes(query);
        const emailMatch = org.email?.toLowerCase().includes(query);
        const slugMatch = org.slug?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch && !slugMatch) return false;
      }

      // Status/expiry tab check
      const days = org.daysLeft;
      if (filterTab === "active") {
        return org.subscriptionState === "active";
      }
      if (filterTab === "expiring-30") {
        return days !== null && days >= 0 && days <= 30;
      }
      if (filterTab === "expiring-7") {
        return days !== null && days >= 0 && days <= 7;
      }
      if (filterTab === "expired") {
        return org.subscriptionState === "expired" || (days !== null && days < 0);
      }
      return true;
    });
  }, [organizations, searchQuery, filterTab]);

  // Sort organizations
  const sortedOrgs = React.useMemo(() => {
    return [...filteredOrgs].sort((a, b) => {
      if (sortBy === "days-asc") {
        const aDays = a.daysLeft ?? Infinity;
        const bDays = b.daysLeft ?? Infinity;
        return aDays - bDays;
      }
      if (sortBy === "days-desc") {
        const aDays = a.daysLeft ?? -Infinity;
        const bDays = b.daysLeft ?? -Infinity;
        return bDays - aDays;
      }
      if (sortBy === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "date-asc") {
        const aTime = a.subscriptionEnd ? new Date(a.subscriptionEnd).getTime() : Infinity;
        const bTime = b.subscriptionEnd ? new Date(b.subscriptionEnd).getTime() : Infinity;
        return aTime - bTime;
      }
      return 0;
    });
  }, [filteredOrgs, sortBy]);

  // Handle open extend dialog
  const handleOpenExtend = (org: PlatformOrgRow) => {
    setExtendOrg(org);
    if (org.subscriptionEnd) {
      try {
        setExtendDate(new Date(org.subscriptionEnd).toISOString().split("T")[0]);
      } catch {
        setExtendDate(new Date().toISOString().split("T")[0]);
      }
    } else {
      setExtendDate(new Date().toISOString().split("T")[0]);
    }
  };

  // Quick extend buttons
  const handleQuickExtend = (months: number) => {
    if (!extendDate) return;
    const baseDate = new Date(extendDate);
    // If the date is already expired, add months from today instead of from the past
    const effectiveBase = baseDate.getTime() < Date.now() ? new Date() : baseDate;
    effectiveBase.setMonth(effectiveBase.getMonth() + months);
    setExtendDate(effectiveBase.toISOString().split("T")[0]);
  };

  // Submit subscription extension
  const handleSubmitExtend = async () => {
    if (!extendOrg || !extendDate) return;
    await updateMutation.mutateAsync({
      id: extendOrg.id,
      data: {
        subscriptionEnd: new Date(extendDate).toISOString(),
      },
    });
    setExtendOrg(null);
    refetch();
  };

  // Calculate preview of new days left in dialog
  const newDaysLeftPreview = React.useMemo(() => {
    if (!extendDate) return null;
    const target = new Date(extendDate).getTime();
    const now = Date.now();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }, [extendDate]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-full min-w-0">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Subscriptions Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track subscription lifecycles, renewal counts, and license validity across all tenant organizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 shadow-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            {data?.generatedAt ? `Updated ${timeAgo(data.generatedAt)}` : "Refresh"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          loading={isLoading}
          icon={Building2}
          tone="blue"
          label="Total Organizations"
          value={fmtNum(k?.organizationsTotal)}
          hint={`${fmtNum(k?.organizationsActive)} active · ${fmtNum(k?.organizationsSuspended)} suspended`}
        />
        <StatCard
          loading={isLoading}
          icon={CheckCircle2}
          tone="green"
          label="Active Subscriptions"
          value={fmtNum(k?.organizationsActive)}
          hint="Fully valid & running"
        />
        <StatCard
          loading={isLoading}
          icon={CalendarClock}
          tone="amber"
          label="Expiring in 30 Days"
          value={fmtNum(k?.subscriptionsExpiring30)}
          hint={`${fmtNum(k?.subscriptionsExpiring7)} urgent within 7 days`}
        />
        <StatCard
          loading={isLoading}
          icon={CalendarX2}
          tone="red"
          label="Expired Subscriptions"
          value={fmtNum(k?.subscriptionsExpired)}
          hint="Action or extension required"
        />
      </div>

      {/* Main Content Panel */}
      <div className="bg-card border border-[#e5e5e5] dark:border-border rounded-[10px] p-5 md:p-6 flex flex-col gap-5 shadow-xs min-w-0">
        {/* Controls: Search, Filter Tabs, and Sorters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "All", count: organizations.length },
              {
                id: "active",
                label: "Active",
                count: organizations.filter((o) => o.subscriptionState === "active").length,
              },
              {
                id: "expiring-30",
                label: "Expiring (≤ 30d)",
                count: k?.subscriptionsExpiring30 ?? 0,
              },
              {
                id: "expiring-7",
                label: "Urgent (≤ 7d)",
                count: k?.subscriptionsExpiring7 ?? 0,
              },
              {
                id: "expired",
                label: "Expired",
                count: k?.subscriptionsExpired ?? 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as FilterTab)}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 flex items-center gap-1.5",
                  filterTab === tab.id
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "bg-[#f5f5f5] dark:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[11px] px-1.5 py-0.2 rounded-full",
                    filterTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm rounded-[8px]"
              />
            </div>

            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
              <SelectTrigger className="h-9 w-44 rounded-[8px] text-[13px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days-asc">Expiring Soonest</SelectItem>
                <SelectItem value="days-desc">Most Days Left</SelectItem>
                <SelectItem value="name-asc">Organization (A–Z)</SelectItem>
                <SelectItem value="date-asc">End Date (Earliest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table View */}
        {isLoading ? (
          <LoadingBlock height={320} />
        ) : sortedOrgs.length === 0 ? (
          <EmptyBlock
            height={260}
            text={
              searchQuery
                ? `No organizations match "${searchQuery}"`
                : "No organizations found for the selected filter."
            }
          />
        ) : (
          <div className="rounded-[8px] border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[280px]">Organization</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[180px]">Remaining Days</TableHead>
                  <TableHead className="w-[150px]">Start Date</TableHead>
                  <TableHead className="w-[150px]">Expiry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrgs.map((org) => {
                  const days = org.daysLeft;
                  const isExpired = org.subscriptionState === "expired" || (days !== null && days < 0);
                  const isUrgent = days !== null && days >= 0 && days <= 7;
                  const isWarning = days !== null && days > 7 && days <= 30;

                  return (
                    <TableRow key={org.id} className="hover:bg-muted/30 transition-colors">
                      {/* Org info */}
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/superadmin/organizations/${org.id}/users`}
                            className="font-medium text-[14px] text-foreground hover:text-primary hover:underline flex items-center gap-1.5"
                          >
                            {org.name}
                            <ExternalLink className="size-3 text-muted-foreground opacity-60" />
                          </Link>
                          <span className="text-[12px] text-muted-foreground font-mono">
                            {org.slug || org.email || "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                            org.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              : org.status === "suspended"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                          )}
                        >
                          {humanize(org.status)}
                        </span>
                      </TableCell>

                      {/* Days Left */}
                      <TableCell>
                        {days === null ? (
                          <span className="text-xs text-muted-foreground italic">No end date</span>
                        ) : isExpired ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[12px] font-semibold">
                            <CalendarX2 className="size-3.5 shrink-0" />
                            <span>Expired {Math.abs(days)} d ago</span>
                          </div>
                        ) : isUrgent ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[12px] font-semibold animate-pulse">
                            <ShieldAlert className="size-3.5 shrink-0" />
                            <span>{days} {days === 1 ? "day" : "days"} left</span>
                          </div>
                        ) : isWarning ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[12px] font-medium">
                            <CalendarClock className="size-3.5 shrink-0" />
                            <span>{days} days left</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[12px] font-medium">
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            <span>{days} days left</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Start Date */}
                      <TableCell className="text-[13px] text-muted-foreground">
                        {formatDate(org.subscriptionStart)}
                      </TableCell>

                      {/* Expiry Date */}
                      <TableCell className="text-[13px] font-medium text-foreground">
                        {formatDate(org.subscriptionEnd)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium border-[#2563EB]/30 hover:border-[#2563EB] hover:bg-[#eff6ff] dark:hover:bg-blue-950/50 text-[#2563EB] dark:text-blue-400"
                            onClick={() => handleOpenExtend(org)}
                          >
                            <Calendar className="size-3.5" />
                            Extend
                          </Button>

                          <Link href={`/superadmin/organizations/${org.id}/users`}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                              Manage
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Extend Subscription Modal */}
      <Dialog
        open={extendOrg !== null}
        onOpenChange={(open) => {
          if (!open) setExtendOrg(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px] rounded-[10px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-5 text-primary" />
              Extend Subscription
            </DialogTitle>
            <DialogDescription>
              Extend the active subscription license period for{" "}
              <strong className="text-foreground">{extendOrg?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            {/* Current status banner */}
            <div className="p-3 rounded-[8px] bg-muted/60 border border-border flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Current End Date:</span>
                <span className="font-semibold text-foreground">
                  {formatDate(extendOrg?.subscriptionEnd)}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Current Status:</span>
                <span className="font-semibold text-foreground">
                  {extendOrg?.daysLeft !== null && extendOrg?.daysLeft !== undefined
                    ? extendOrg.daysLeft < 0
                      ? `Expired ${Math.abs(extendOrg.daysLeft)} days ago`
                      : `${extendOrg.daysLeft} days remaining`
                    : "No subscription set"}
                </span>
              </div>
            </div>

            {/* Quick extend shortcuts */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Quick Extend Options
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "+1 Month", months: 1 },
                  { label: "+3 Months", months: 3 },
                  { label: "+6 Months", months: 6 },
                  { label: "+1 Year", months: 12 },
                ].map((item) => (
                  <Button
                    key={item.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/50"
                    onClick={() => handleQuickExtend(item.months)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date input */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-end-date" className="text-xs font-medium text-foreground">
                New Subscription End Date
              </Label>
              <Input
                id="new-end-date"
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                className="h-9 rounded-[8px] text-sm"
              />
            </div>

            {/* Preview of new timeline */}
            {newDaysLeftPreview !== null && (
              <div className="p-2.5 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles className="size-3.5" />
                  New validity:
                </span>
                <span className="font-semibold">
                  {newDaysLeftPreview > 0
                    ? `${newDaysLeftPreview} days from today`
                    : "Invalid date"}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExtendOrg(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitExtend}
              disabled={!extendDate || updateMutation.isPending}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {updateMutation.isPending && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
              Confirm Extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
