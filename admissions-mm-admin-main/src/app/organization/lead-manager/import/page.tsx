"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCampaigns } from "@/hooks/use-campaigns";
import {
  useCaptureEvents,
  useImportBatches,
  useImportLeadsCsv,
  useLeadCaptureSettings,
} from "@/hooks/use-lead-capture";
import type { ImportBatch, ImportCsvInput } from "@/types/lead-management";
import {
  EmptyState,
  FieldLabel,
  PageTitle,
  SectionCard,
  Th,
  formatDateTime,
  pillStyles,
  tableHeaderClass,
  tableShell,
} from "../_components/lm-ui";

const CHANNELS: ImportCsvInput["channel"][] = ["Portal", "Event", "Web", "Social", "Chatbot"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Splits CSV text into whole records (quote-aware) and groups them into chunks with the header repeated. */
function chunkCsv(text: string, maxChars: number): { text: string; rows: number }[] {
  const src = text.replace(/^﻿/, "");
  const records: string[] = [];
  let start = 0;
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === "\n") {
      records.push(src.slice(start, i).replace(/\r$/, ""));
      start = i + 1;
    }
  }
  if (start < src.length) records.push(src.slice(start).replace(/\r$/, ""));
  const nonEmpty = records.filter((r) => r.trim() !== "");
  if (nonEmpty.length < 2) return [{ text: src, rows: 0 }];
  const header = nonEmpty[0];
  const chunks: { text: string; rows: number }[] = [];
  let cur: string[] = [];
  let size = header.length;
  for (const rec of nonEmpty.slice(1)) {
    if (cur.length && size + rec.length + 1 > maxChars) {
      chunks.push({ text: [header, ...cur].join("\n"), rows: cur.length });
      cur = [];
      size = header.length;
    }
    cur.push(rec);
    size += rec.length + 1;
  }
  if (cur.length) chunks.push({ text: [header, ...cur].join("\n"), rows: cur.length });
  return chunks;
}

function ImportLeadsInner() {
  usePageHeader({
    title: "Import Leads",
    description: "Bulk-upload leads from education portals, event attendee lists and other sources.",
  });

  const params = useSearchParams();
  const [channel, setChannel] = React.useState<ImportCsvInput["channel"]>(
    (CHANNELS.includes(params.get("channel") as any) ? params.get("channel") : "Portal") as ImportCsvInput["channel"],
  );
  const [eventId, setEventId] = React.useState(params.get("eventId") || "");
  const [sourceName, setSourceName] = React.useState("");
  const [campaignId, setCampaignId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [csv, setCsv] = React.useState("");
  const [preview, setPreview] = React.useState<{ headers: string[]; rows: number } | null>(null);
  const [lastResult, setLastResult] = React.useState<ImportBatch | null>(null);

  const { data: settings } = useLeadCaptureSettings();
  const { data: events = [] } = useCaptureEvents();
  const { data: campaignsData } = useCampaigns(1, 100);
  const campaigns = campaignsData?.data || [];
  const { data: batches = [], isLoading: batchesLoading } = useImportBatches();
  const importCsv = useImportLeadsCsv();

  async function onFile(f: File | null) {
    setFile(f);
    setCsv("");
    setPreview(null);
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setFile(null);
      return;
    }
    const text = await f.text();
    setCsv(text);
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    setPreview({ headers: (lines[0] || "").split(",").map((h) => h.replace(/^"|"$/g, "").trim()), rows: Math.max(0, lines.length - 1) });
  }

  const [progress, setProgress] = React.useState<string | null>(null);

  async function submit() {
    if (!csv) return;
    // The API accepts JSON bodies of limited size, so large files are sent in
    // chunks of whole records (each chunk repeats the header row).
    const chunks = chunkCsv(csv, 80_000);
    const total: ImportBatch = {
      id: "",
      channel,
      sourceName: sourceName || null,
      eventId: eventId || null,
      fileName: file?.name || null,
      totalRows: 0,
      created: 0,
      reentries: 0,
      duplicatesFlagged: 0,
      failed: 0,
      errors: [],
      createdAt: new Date().toISOString(),
    };
    try {
      let offset = 0;
      for (const [i, chunk] of chunks.entries()) {
        if (chunks.length > 1) setProgress(`Uploading part ${i + 1} of ${chunks.length}...`);
        const b = await importCsv.mutateAsync({
          csv: chunk.text,
          channel,
          fileName: chunks.length > 1 ? `${file?.name || "CSV"} (part ${i + 1})` : file?.name,
          sourceName: sourceName || undefined,
          eventId: channel === "Event" && eventId ? eventId : undefined,
          campaignId: campaignId || undefined,
        });
        total.totalRows += b.totalRows;
        total.created += b.created;
        total.reentries += b.reentries;
        total.duplicatesFlagged += b.duplicatesFlagged;
        total.failed += b.failed;
        total.errors.push(...(b.errors || []).map((e) => ({ row: e.row + offset, message: e.message })));
        offset += chunk.rows;
      }
      setLastResult(total);
      setFile(null);
      setCsv("");
      setPreview(null);
    } catch {
      setLastResult(total.totalRows ? total : null);
    } finally {
      setProgress(null);
    }
  }

  const tooBig = file && file.size > MAX_BYTES;
  const needsEvent = channel === "Event" && !eventId;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      <div className="flex items-center gap-2">
        <Link href="/organization/lead-manager">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <PageTitle
          title="CSV upload"
          description="The first row must contain column names (e.g. full_name, email, phone, dob, city, country, program, intake). Every row is scored, routed and checked for duplicates; the same person already in the CRM is updated instead of created again."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <SectionCard className="xl:col-span-5" title="Upload" description="UTF-8 CSV, up to 5 MB / 5,000 rows.">
          <div className="flex flex-col gap-2">
            <FieldLabel>Channel Source</FieldLabel>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {channel === "Portal" && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Portal</FieldLabel>
              {settings?.portals?.length ? (
                <Select value={sourceName || "none"} onValueChange={(v) => setSourceName(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select portal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {settings.portals.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-10"
                  placeholder="e.g. Shiksha, CollegeDunia"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                />
              )}
            </div>
          )}

          {channel === "Event" && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Event</FieldLabel>
              <Select value={eventId || "none"} onValueChange={(v) => setEventId(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {events.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create events in{" "}
                  <Link className="underline" href="/organization/settings/lead-integrations">
                    Lead Capture Integrations
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          {channel !== "Portal" && channel !== "Event" && (
            <div className="flex flex-col gap-2">
              <FieldLabel>List name</FieldLabel>
              <Input className="h-10" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <FieldLabel>Campaign (optional)</FieldLabel>
            <Select value={campaignId || "none"} onValueChange={(v) => setCampaignId(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-input p-6 cursor-pointer hover:bg-muted/30">
            <FileSpreadsheet className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium">{file ? file.name : "Choose a CSV file"}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
          {tooBig && <p className="text-xs text-rose-600">The file is larger than 5 MB.</p>}
          {preview && (
            <div className="text-xs text-muted-foreground">
              {preview.rows} data rows · columns: {preview.headers.join(", ")}
            </div>
          )}
          <Button
            className="h-10 text-xs font-semibold"
            disabled={!csv || importCsv.isPending || !!progress || needsEvent}
            onClick={submit}
          >
            {importCsv.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {importCsv.isPending ? progress || "Importing..." : "Import leads"}
          </Button>

          {lastResult && (
            <div className="rounded-[8px] border border-border p-3 text-xs flex flex-col gap-1">
              <p className="font-semibold text-sm">Last import</p>
              <p>
                {lastResult.totalRows} rows · {lastResult.created} created · {lastResult.reentries} already in CRM ·{" "}
                {lastResult.duplicatesFlagged} flagged as possible duplicates · {lastResult.failed} failed
              </p>
              {lastResult.errors?.slice(0, 10).map((e) => (
                <p key={e.row} className="text-rose-600">
                  Row {e.row}: {e.message}
                </p>
              ))}
            </div>
          )}
        </SectionCard>

        <div className={`xl:col-span-7 ${tableShell}`}>
          <Table>
            <TableHeader className={tableHeaderClass}>
              <TableRow className="hover:bg-transparent">
                <Th className="px-5">File</Th>
                <Th>Channel</Th>
                <Th className="text-right">Rows</Th>
                <Th className="text-right">Created</Th>
                <Th className="text-right">Re-entries</Th>
                <Th className="text-right">Flagged</Th>
                <Th className="text-right">Failed</Th>
                <Th>Date</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchesLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="No imports yet" />
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((b) => (
                  <TableRow key={b.id} className="border-b border-border/80 hover:bg-muted/15">
                    <TableCell className="py-4 px-5">
                      <div className="text-sm font-medium truncate max-w-[200px]">{b.fileName || "CSV"}</div>
                      <div className="text-xs text-muted-foreground">{b.sourceName || ""}</div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      <span className={pillStyles.blue}>{b.channel}</span>
                    </TableCell>
                    <TableCell className="py-4 px-4 text-right text-sm">{b.totalRows}</TableCell>
                    <TableCell className="py-4 px-4 text-right text-sm">{b.created}</TableCell>
                    <TableCell className="py-4 px-4 text-right text-sm">{b.reentries}</TableCell>
                    <TableCell className="py-4 px-4 text-right text-sm">{b.duplicatesFlagged}</TableCell>
                    <TableCell className="py-4 px-4 text-right text-sm">{b.failed}</TableCell>
                    <TableCell className="py-4 px-4 text-xs whitespace-nowrap">{formatDateTime(b.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default function ImportLeadsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ImportLeadsInner />
    </React.Suspense>
  );
}
