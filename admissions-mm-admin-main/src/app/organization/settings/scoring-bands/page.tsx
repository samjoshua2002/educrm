"use client";

import * as React from "react";
import { Plus, Trash2, Loader2, Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import {
  useScoreConversionConfig,
  useUpdateScoreConversionConfig,
  type ScoreBand,
  type ScoreConversionConfig,
} from "@/hooks/use-shortlisting";

// ============================================================================
// BAND EDITOR (repeatable min-threshold / points rows for one band category)
// ============================================================================

type ThresholdKey = "minPercent" | "minPercentile" | "minMonths";

interface BandEditorProps {
  title: string;
  description: string;
  thresholdKey: ThresholdKey;
  thresholdLabel: string;
  rows: ScoreBand[];
  onChange: (rows: ScoreBand[]) => void;
}

function BandEditor({ title, description, thresholdKey, thresholdLabel, rows, onChange }: BandEditorProps) {
  const updateRow = (index: number, field: ThresholdKey | "points", value: string) => {
    const next = rows.map((row, i) => {
      if (i !== index) return row;
      const num = value === "" ? undefined : Number(value);
      return { ...row, [field]: num };
    });
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, { [thresholdKey]: 0, points: 0 } as ScoreBand]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-border/80 rounded-[12px] bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
          <Plus className="size-3.5" /> Add Row
        </Button>
      </div>
      <Table>
        <TableHeader className="bg-zinc-100 dark:bg-muted/5">
          <TableRow>
            <TableHead className="px-6">{thresholdLabel}</TableHead>
            <TableHead className="px-6">Points</TableHead>
            <TableHead className="px-6 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                No bands configured yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="px-6">
                  <Input
                    type="number"
                    className="h-9 max-w-[140px]"
                    value={row[thresholdKey] ?? ""}
                    onChange={(e) => updateRow(index, thresholdKey, e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-6">
                  <Input
                    type="number"
                    className="h-9 max-w-[120px]"
                    value={row.points ?? ""}
                    onChange={(e) => updateRow(index, "points", e.target.value)}
                  />
                </TableCell>
                <TableCell className="px-6 text-right">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

const EMPTY_BANDS: ScoreConversionConfig["bands"] = {
  tenth: [],
  twelfth: [],
  ug: [],
  testPercentile: [],
  experienceMonths: [],
};

export default function ScoringBandsSettingsPage() {
  usePageHeader({
    title: "Score Conversion Bands",
    description:
      "Configure how raw academic percentages, test percentiles, and experience months convert into shortlisting points.",
  });

  const { data: config, isLoading } = useScoreConversionConfig();
  const updateConfig = useUpdateScoreConversionConfig();

  const [bands, setBands] = React.useState<ScoreConversionConfig["bands"]>(EMPTY_BANDS);
  const [discrepancyThreshold, setDiscrepancyThreshold] = React.useState("10");
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (config && !initialized) {
      setBands({
        tenth: config.bands?.tenth ?? [],
        twelfth: config.bands?.twelfth ?? [],
        ug: config.bands?.ug ?? [],
        testPercentile: config.bands?.testPercentile ?? [],
        experienceMonths: config.bands?.experienceMonths ?? [],
      });
      setDiscrepancyThreshold(String(config.discrepancyThreshold ?? 10));
      setInitialized(true);
    }
  }, [config, initialized]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = Number(discrepancyThreshold);
    if (Number.isNaN(threshold) || threshold < 0) return;

    updateConfig.mutate({ bands, discrepancyThreshold: threshold });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="size-4 animate-spin" /> Loading current bands...
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <BandEditor
            title="10th Percentage Bands"
            description="Points awarded for a candidate's 10th standard percentage."
            thresholdKey="minPercent"
            thresholdLabel="Min Percent (%)"
            rows={bands.tenth}
            onChange={(rows) => setBands((b) => ({ ...b, tenth: rows }))}
          />
          <BandEditor
            title="12th Percentage Bands"
            description="Points awarded for a candidate's 12th standard percentage."
            thresholdKey="minPercent"
            thresholdLabel="Min Percent (%)"
            rows={bands.twelfth}
            onChange={(rows) => setBands((b) => ({ ...b, twelfth: rows }))}
          />
          <BandEditor
            title="UG Percentage Bands"
            description="Points awarded for a candidate's undergraduate percentage."
            thresholdKey="minPercent"
            thresholdLabel="Min Percent (%)"
            rows={bands.ug}
            onChange={(rows) => setBands((b) => ({ ...b, ug: rows }))}
          />
          <BandEditor
            title="Entrance Test Percentile Bands"
            description="Points awarded based on entrance test percentile."
            thresholdKey="minPercentile"
            thresholdLabel="Min Percentile"
            rows={bands.testPercentile}
            onChange={(rows) => setBands((b) => ({ ...b, testPercentile: rows }))}
          />
          <BandEditor
            title="Work Experience Bands"
            description="Points awarded based on months of work experience (claimed experience, summed from from/to dates, at Stage-1 shortlisting; validated experience post-interview in the composite score)."
            thresholdKey="minMonths"
            thresholdLabel="Min Months"
            rows={bands.experienceMonths}
            onChange={(rows) => setBands((b) => ({ ...b, experienceMonths: rows }))}
          />

          <Card className="max-w-xl border border-[#e5e5e5] rounded-[12px] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4" /> Discrepancy Threshold
              </CardTitle>
              <CardDescription>
                Maximum allowed gap (in points) between a candidate&apos;s self-reported and
                verified scores before the record is flagged for manual review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 max-w-xs">
                <Label htmlFor="discrepancyThreshold" className="text-sm font-medium">
                  Threshold (points)
                </Label>
                <Input
                  id="discrepancyThreshold"
                  type="number"
                  min={0}
                  step="1"
                  className="h-10"
                  value={discrepancyThreshold}
                  onChange={(e) => setDiscrepancyThreshold(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div>
            <Button type="submit" disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
