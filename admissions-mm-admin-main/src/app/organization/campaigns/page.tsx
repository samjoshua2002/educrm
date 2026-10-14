"use client";

import * as React from "react";
import Link from "next/link";
import { EllipsisVertical, Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCampaigns, useChannelPerformance, useDeleteCampaign, useSaveCampaign } from "@/hooks/use-campaigns";
import {
  CAMPAIGN_STATUSES,
  SOURCE_TYPES,
  type Campaign,
  type CampaignInput,
  type PerformanceRow,
} from "@/types/lead-management";
import {
  EmptyState,
  FieldLabel,
  StatRibbon,
  TabBar,
  Th,
  formatDate,
  formatMoney,
  pillStyles,
  tableHeaderClass,
  tableShell,
} from "../lead-manager/_components/lm-ui";

const statusStyle: Record<string, string> = {
  Active: pillStyles.green,
  Paused: pillStyles.amber,
  Completed: pillStyles.gray,
};

type Draft = CampaignInput & { id?: string; costText: string };

const EMPTY: Draft = {
  name: "",
  utmCampaign: "",
  sourceType: "Paid Ads",
  subSource: "",
  startDate: "",
  endDate: "",
  costText: "0",
  currency: "INR",
  status: "Active",
  description: "",
};

export default function CampaignsPage() {
  const [tab, setTab] = React.useState<"campaigns" | "performance">("campaigns");
  const [draft, setDraft] = React.useState<Draft | null>(null);

  const openNew = React.useCallback(() => setDraft({ ...EMPTY }), []);
  const headerAction = React.useMemo(() => ({ label: "Add Campaign", onClick: openNew }), [openNew]);
  usePageHeader({
    title: "Campaigns",
    description: "Marketing campaigns, their leads and channel ROI.",
    action: headerAction,
  });

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full min-w-0">
      <TabBar
        tabs={[
          { value: "campaigns", label: "Campaigns" },
          { value: "performance", label: "Channel Performance & ROI" },
        ]}
        active={tab}
        onChange={(v) => setTab(v as any)}
      />
      {tab === "campaigns" ? <CampaignList onEdit={(c) => setDraft(c)} /> : <Performance />}
      <CampaignDialog draft={draft} setDraft={setDraft} />
    </div>
  );
}

function CampaignList({ onEdit }: { onEdit: (d: Draft) => void }) {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sourceType, setSourceType] = React.useState("all");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const limit = 10;
  const { data, isLoading } = useCampaigns(page, limit, {
    search,
    status: status === "all" ? undefined : status,
    sourceType: sourceType === "all" ? undefined : sourceType,
  });
  const del = useDeleteCampaign();
  const rows = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const toDraft = (c: Campaign): Draft => ({
    id: c.id,
    name: c.name,
    utmCampaign: c.utmCampaign || "",
    sourceType: c.sourceType,
    subSource: c.subSource || "",
    startDate: c.startDate || "",
    endDate: c.endDate || "",
    costText: String(c.cost ?? 0),
    currency: c.currency || "INR",
    status: c.status,
    description: c.description || "",
  });

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name, utm_campaign or sub-source..."
            className="w-full pr-10 h-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Search className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex gap-2">
          <Select value={sourceType} onValueChange={(v) => { setSourceType(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Source Types</SelectItem>
              {SOURCE_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CAMPAIGN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th className="px-6">Campaign</Th>
              <Th>Source Type</Th>
              <Th>Dates</Th>
              <Th className="text-right">Leads</Th>
              <Th className="text-right">Hot</Th>
              <Th className="text-right">Converted</Th>
              <Th className="text-right">Cost</Th>
              <Th className="text-right">Cost / Lead</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-40 text-center">
                  <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState title="No campaigns" description="Create a campaign; leads are mapped to it by utm_campaign." />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id} className="border-b border-border/80 hover:bg-muted/15">
                  <TableCell className="py-4 px-6">
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.utmCampaign ? `utm_campaign: ${c.utmCampaign}` : "No utm_campaign"}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-sm whitespace-nowrap">
                    {c.sourceType}
                    {c.subSource && <div className="text-xs text-muted-foreground">{c.subSource}</div>}
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs whitespace-nowrap">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm font-semibold">{c.leadCount}</TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm">{c.hotCount}</TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm">
                    {c.convertedCount}
                    <div className="text-xs text-muted-foreground">{c.conversionRate}%</div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm whitespace-nowrap">{formatMoney(c.cost, c.currency)}</TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm whitespace-nowrap">
                    {formatMoney(c.costPerLead, c.currency)}
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <span className={statusStyle[c.status] || pillStyles.gray}>{c.status}</span>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                          <EllipsisVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2" asChild>
                          <Link href={`/organization/lead-manager?campaignId=${c.id}`}>
                            <Users className="size-4" /> View leads
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => onEdit(toDraft(c))}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" className="gap-2 cursor-pointer" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 bg-zinc-100 dark:bg-muted/5 py-3 px-6">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" className="h-9" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" className="h-9" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>Leads keep their source data but are no longer linked to the campaign.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteId && del.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CampaignDialog({ draft, setDraft }: { draft: Draft | null; setDraft: (d: Draft | null) => void }) {
  const save = useSaveCampaign();
  if (!draft) return <Dialog open={false} />;
  const cost = Number(draft.costText);
  const datesInvalid = !!draft.startDate && !!draft.endDate && draft.endDate < draft.startDate;
  const invalid = !draft.name.trim() || !Number.isFinite(cost) || cost < 0 || datesInvalid;

  function submit() {
    if (!draft || invalid) return;
    const { id, costText, ...rest } = draft;
    save.mutate(
      {
        id,
        data: {
          ...rest,
          name: rest.name.trim(),
          utmCampaign: rest.utmCampaign?.trim() || null,
          subSource: rest.subSource?.trim() || null,
          startDate: rest.startDate || null,
          endDate: rest.endDate || null,
          description: rest.description?.trim() || null,
          cost,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit campaign" : "New campaign"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <FieldLabel>Campaign Name</FieldLabel>
            <Input className="h-10" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <FieldLabel>Source Type</FieldLabel>
              <Select value={draft.sourceType} onValueChange={(v) => setDraft({ ...draft, sourceType: v })}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>Sub-source</FieldLabel>
              <Input
                className="h-10"
                placeholder="e.g. Google, Facebook, Shiksha"
                value={draft.subSource || ""}
                onChange={(e) => setDraft({ ...draft, subSource: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>utm_campaign</FieldLabel>
            <Input
              className="h-10"
              placeholder="Leads with this utm_campaign are mapped to the campaign"
              value={draft.utmCampaign || ""}
              onChange={(e) => setDraft({ ...draft, utmCampaign: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <FieldLabel>Start date</FieldLabel>
              <Input
                type="date"
                className="h-10"
                value={draft.startDate || ""}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>End date</FieldLabel>
              <Input
                type="date"
                className="h-10"
                value={draft.endDate || ""}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
              />
            </div>
          </div>
          {datesInvalid && <p className="text-xs text-rose-600">The end date cannot be before the start date.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel>Cost</FieldLabel>
              <Input
                type="number"
                min={0}
                className="h-10"
                value={draft.costText}
                onChange={(e) => setDraft({ ...draft, costText: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>Currency</FieldLabel>
              <Input
                className="h-10"
                maxLength={10}
                value={draft.currency || ""}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Status</FieldLabel>
            <Select value={draft.status || "Active"} onValueChange={(v) => setDraft({ ...draft, status: v })}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Description</FieldLabel>
            <Textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button disabled={invalid || save.isPending} onClick={submit}>
              {save.isPending ? "Saving..." : draft.id ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PerfTable({ title, rows, showCost }: { title: string; rows: PerformanceRow[]; showCost?: boolean }) {
  return (
    <div className={tableShell}>
      <div className="px-5 py-3 border-b border-border/80 text-sm font-bold">{title}</div>
      <Table>
        <TableHeader className={tableHeaderClass}>
          <TableRow className="hover:bg-transparent">
            <Th className="px-5">Name</Th>
            <Th className="text-right">Leads</Th>
            <Th className="text-right">Hot</Th>
            <Th className="text-right">Converted</Th>
            <Th className="text-right">Conv. %</Th>
            <Th className="text-right">Re-entries</Th>
            {showCost && <Th className="text-right">Spend</Th>}
            {showCost && <Th className="text-right">Cost / Lead</Th>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showCost ? 8 : 6}>
                <EmptyState title="No leads in this period" />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.key} className="border-b border-border/80">
                <TableCell className="py-3 px-5 text-sm font-medium">{r.key}</TableCell>
                <TableCell className="py-3 px-4 text-right text-sm font-semibold">{r.leads}</TableCell>
                <TableCell className="py-3 px-4 text-right text-sm">{r.hot}</TableCell>
                <TableCell className="py-3 px-4 text-right text-sm">{r.converted}</TableCell>
                <TableCell className="py-3 px-4 text-right text-sm">{r.conversionRate}%</TableCell>
                <TableCell className="py-3 px-4 text-right text-sm">{r.reentries}</TableCell>
                {showCost && <TableCell className="py-3 px-4 text-right text-sm">{formatMoney(r.cost ?? 0)}</TableCell>}
                {showCost && <TableCell className="py-3 px-4 text-right text-sm">{formatMoney(r.costPerLead ?? null)}</TableCell>}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Performance() {
  const [attribution, setAttribution] = React.useState<"first" | "last">("first");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const { data, isLoading } = useChannelPerformance({ attribution, from, to });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex flex-col gap-2">
          <FieldLabel>Attribution</FieldLabel>
          <Select value={attribution} onValueChange={(v) => setAttribution(v as any)}>
            <SelectTrigger className="w-[200px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First touch</SelectItem>
              <SelectItem value="last">Last touch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>From</FieldLabel>
          <Input type="date" className="h-10 w-[170px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>To</FieldLabel>
          <Input type="date" className="h-10 w-[170px]" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <StatRibbon
            items={[
              { label: "Leads", value: data.totals.leads },
              { label: "Converted", value: `${data.totals.converted} (${data.totals.conversionRate}%)` },
              { label: "Campaign spend", value: formatMoney(data.totals.campaignSpend) },
              { label: "Campaign leads", value: data.totals.campaignLeads },
              { label: "Cost per lead", value: formatMoney(data.totals.costPerLead) },
            ]}
          />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <PerfTable title="By Channel Source" rows={data.byChannel} />
            <PerfTable title="By Source Type" rows={data.bySourceType} showCost />
          </div>
          <PerfTable title="By Sub-source" rows={data.bySubSource} />
          <div className={tableShell}>
            <div className="px-5 py-3 border-b border-border/80 text-sm font-bold">By Campaign</div>
            <Table>
              <TableHeader className={tableHeaderClass}>
                <TableRow className="hover:bg-transparent">
                  <Th className="px-5">Campaign</Th>
                  <Th className="text-right">Leads</Th>
                  <Th className="text-right">Converted</Th>
                  <Th className="text-right">Cost</Th>
                  <Th className="text-right">Cost / Lead</Th>
                  <Th className="text-right">Cost / Conversion</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byCampaign.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState title="No campaigns" />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.byCampaign.map((c) => (
                    <TableRow key={c.id} className="border-b border-border/80">
                      <TableCell className="py-3 px-5 text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="py-3 px-4 text-right text-sm font-semibold">{c.leadCount}</TableCell>
                      <TableCell className="py-3 px-4 text-right text-sm">{c.convertedCount}</TableCell>
                      <TableCell className="py-3 px-4 text-right text-sm">{formatMoney(c.cost, c.currency)}</TableCell>
                      <TableCell className="py-3 px-4 text-right text-sm">{formatMoney(c.costPerLead, c.currency)}</TableCell>
                      <TableCell className="py-3 px-4 text-right text-sm">
                        {formatMoney(c.costPerConversion, c.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
