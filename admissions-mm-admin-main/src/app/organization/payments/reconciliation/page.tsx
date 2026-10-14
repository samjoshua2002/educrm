"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, Eye, IndianRupee, Loader2, RefreshCw, RotateCcw, Search, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePageHeader } from "@/hooks/use-page-header";
import { useOrgId } from "@/hooks/use-application-tracker";
import { downloadReconciliationReport, useReconciliation, useRunReconciliation, useUpdateReconciliation } from "@/hooks/use-payments";
import {
  PaymentDetailDialog,
  formatDateTime,
  formatMoney,
  paymentStatusClass,
  reconciliationClass,
  refundClass,
} from "../_components/payment-detail-dialog";

const TH = "py-4 px-5 text-xs font-semibold tracking-wider text-muted-foreground uppercase h-auto";

function StatCard({ icon, label, value, tint, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; tint: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-[12px] px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col items-start gap-1 shrink-0">
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ backgroundColor: tint, color }}>
          {icon}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{label}</span>
      </div>
      <span className="text-[26px] font-bold leading-none text-[#0F172A] dark:text-foreground truncate">{value}</span>
    </div>
  );
}

export default function ReconciliationPage() {
  const orgId = useOrgId();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [gateway, setGateway] = React.useState("all");
  const [reconStatus, setReconStatus] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [refundStatus, setRefundStatus] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState(weekAgo);
  const [dateTo, setDateTo] = React.useState(today);
  const [page, setPage] = React.useState(1);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  usePageHeader({
    title: "Payment Reconciliation",
    description: "Match gateway transactions with application payment records, track refunds and export daily or weekly reports.",
    action: { label: "All Payments", href: "/organization/payments" },
  });

  React.useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useReconciliation({
    page,
    limit: 20,
    search: appliedSearch,
    gateway,
    reconciliationStatus: reconStatus,
    status,
    refundStatus,
    dateFrom,
    dateTo,
  });
  const run = useRunReconciliation();
  const update = useUpdateReconciliation();
  const rows = data?.data || [];
  const summary = data?.summary;

  const doExport = async (period: "daily" | "weekly" | "range", format: "csv" | "xlsx") => {
    if (!orgId) return;
    setExporting(true);
    try {
      if (period === "range") await downloadReconciliationReport(orgId, { dateFrom, dateTo, format, gateway });
      else await downloadReconciliationReport(orgId, { period, date: dateTo || today, format, gateway });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-full min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<IndianRupee className="size-5" />} label="Collected (INR)" value={formatMoney(summary?.collectedInr || 0)} tint="#ECFDF5" color="#10B981" />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Matched" value={summary?.matched ?? 0} tint="#EFF6FF" color="#2563EB" />
        <StatCard icon={<AlertTriangle className="size-5" />} label="Unmatched" value={summary?.unmatched ?? 0} tint="#FFF7ED" color="#EA580C" />
        <StatCard icon={<RotateCcw className="size-5" />} label="Refunded (INR)" value={formatMoney(summary?.refundedInr || 0)} tint="#F1F5F9" color="#475569" />
      </div>

      {summary?.byGateway && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {summary.byGateway.map((g) => (
            <div key={g.gateway} className="rounded-[12px] border border-border bg-card px-4 py-3 flex flex-col gap-1">
              <span className="text-xs font-semibold text-foreground">{g.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {g.count} txn · {formatMoney(g.collected)} · <span className="text-green-700">{g.matched} matched</span> ·{" "}
                <span className="text-orange-700">{g.unmatched} unmatched</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <Input
              placeholder="Search by application no, applicant, transaction or order ID..."
              className="w-full pr-10 h-10 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Input type="date" className="h-10 w-[150px] bg-background" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            <Input type="date" className="h-10 w-[150px] bg-background" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            <Button
              className="h-10 gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              disabled={run.isPending}
              onClick={() => run.mutate({ dateFrom, dateTo, gateway: gateway !== "all" ? gateway : undefined })}
            >
              {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Run Reconciliation
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 bg-background" disabled={exporting}>
                  {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4 text-muted-foreground" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Daily report ({dateTo || today})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => doExport("daily", "csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("daily", "xlsx")}>Excel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Weekly report (7 days to {dateTo || today})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => doExport("weekly", "csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("weekly", "xlsx")}>Excel</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Selected date range</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => doExport("range", "csv")}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("range", "xlsx")}>Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            { value: gateway, set: setGateway, ph: "All Gateways", opts: [["razorpay", "Razorpay"], ["stripe", "Stripe"], ["payu", "PayU"], ["paytm", "Paytm"]] },
            { value: reconStatus, set: setReconStatus, ph: "All Reconciliation", opts: [["Matched", "Matched"], ["Unmatched", "Unmatched"]] },
            { value: status, set: setStatus, ph: "All Payment Status", opts: [["Pending", "Pending"], ["Success", "Success"], ["Failed", "Failed"], ["Refunded", "Refunded"]] },
            { value: refundStatus, set: setRefundStatus, ph: "All Refund Status", opts: [["Not Initiated", "Not Initiated"], ["In Progress", "In Progress"], ["Completed", "Completed"]] },
          ].map((f, i) => (
            <Select key={i} value={f.value} onValueChange={(v) => { f.set(v); setPage(1); }}>
              <SelectTrigger className="h-10 w-[180px] bg-background">
                <SelectValue placeholder={f.ph} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{f.ph}</SelectItem>
                {f.opts.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-border bg-card shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <Table>
          <TableHeader className="bg-zinc-100 dark:bg-muted/5 border-b border-border/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className={TH}>Payment / Application</TableHead>
              <TableHead className={TH}>Record</TableHead>
              <TableHead className={TH}>Gateway</TableHead>
              <TableHead className={TH}>Transaction</TableHead>
              <TableHead className={TH}>Reconciliation</TableHead>
              <TableHead className={TH}>Refund</TableHead>
              <TableHead className={TH}>Finance Remarks</TableHead>
              <TableHead className={`${TH} text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <Loader2 className="size-6 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <SearchX className="size-6 text-muted-foreground" />
                    <p className="text-sm font-semibold">No payments in this period</p>
                    <p className="text-xs text-muted-foreground">Change the dates or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} className="border-b border-border/80 hover:bg-muted/15">
                  <TableCell className="py-4 px-5 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">{p.paymentId}</span>
                      <Link className="text-xs text-muted-foreground hover:underline" href={`/organization/applications/${encodeURIComponent(p.applicationNo)}`}>
                        {p.applicationNo} · {p.applicantName}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(p.paidAt || p.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 align-top">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-semibold">{formatMoney(p.amount, p.currency)}</span>
                      <span className={paymentStatusClass[p.paymentStatus]}>{p.paymentStatus}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 align-top">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-medium text-sm">{p.gatewayLabel}</span>
                      <span className="text-muted-foreground">
                        {p.gatewayStatus ? `Gateway: ${p.gatewayStatus}` : "Not checked"}
                        {p.gatewayAmount != null ? ` · ${formatMoney(p.gatewayAmount, p.currency)}` : ""}
                      </span>
                      {p.gatewayCheckedAt && <span className="text-[11px] text-muted-foreground">Checked {formatDateTime(p.gatewayCheckedAt)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 align-top">
                    <div className="flex flex-col gap-0.5 text-xs">
                      <span className="font-mono">{p.transactionId || "—"}</span>
                      <span className="text-muted-foreground">
                        {p.method || "—"}
                        {p.isInternational ? " · International" : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 align-top">
                    <div className="flex flex-col items-start gap-1 max-w-[220px]">
                      <span className={reconciliationClass[p.reconciliationStatus]}>{p.reconciliationStatus}</span>
                      {p.reconciliationNotes && <span className="text-[11px] text-orange-700 leading-snug">{p.reconciliationNotes}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 align-top">
                    <div className="flex flex-col items-start gap-1">
                      <span className={refundClass[p.refundStatus]}>{p.refundStatus}</span>
                      {p.refundAmount > 0 && <span className="text-xs text-muted-foreground">{formatMoney(p.refundAmount, p.currency)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 align-top text-xs text-muted-foreground max-w-[220px]">{p.financeRemarks || "—"}</TableCell>
                  <TableCell className="py-4 px-5 align-top text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ paymentId: p.id, reconciliationStatus: p.reconciliationStatus === "Matched" ? "Unmatched" : "Matched" })
                        }
                      >
                        Mark {p.reconciliationStatus === "Matched" ? "Unmatched" : "Matched"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setDetailId(p.id)}>
                        <Eye className="size-3.5" /> Open
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-3 px-5 text-sm">
          <span className="text-muted-foreground">
            {data?.total ?? 0} payment(s){isFetching && !isLoading ? " · refreshing…" : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-xs self-center text-muted-foreground">
              Page {data?.page ?? 1} of {Math.max(1, data?.totalPages ?? 1)}
            </span>
            <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <PaymentDetailDialog paymentId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} />
    </div>
  );
}
