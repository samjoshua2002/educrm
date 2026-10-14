"use client";

import { useGeographyReport } from "@/hooks/use-analytics";
import type { AnalyticsFilters, DimensionRow, GeoRow } from "@/types/analytics";
import {
  Column,
  DataTable,
  DonutChart,
  GeoHeatList,
  LoadingBlock,
  Panel,
  SimpleBarChart,
  fmtNum,
  fmtPct,
} from "./analytics-ui";

const geoColumns = (dim: "country" | "state" | "city"): Column<GeoRow>[] => [
  ...(dim === "city"
    ? [
        { key: "city", label: "City", render: (r: GeoRow) => <span className="font-medium">{r.city}</span> },
        { key: "state", label: "State" },
      ]
    : dim === "state"
      ? [
          { key: "state", label: "State", render: (r: GeoRow) => <span className="font-medium">{r.state}</span> },
          { key: "country", label: "Country" },
        ]
      : [{ key: "country", label: "Country", render: (r: GeoRow) => <span className="font-medium">{r.country}</span> }]),
  { key: "leads", label: "Leads", align: "right", render: (r) => fmtNum(r.leads) },
  { key: "applications", label: "Applications", align: "right", render: (r) => fmtNum(r.applications) },
  { key: "offers", label: "Offers", align: "right", render: (r) => fmtNum(r.offers) },
  { key: "enrolled", label: "Enrolled", align: "right", render: (r) => fmtNum(r.enrolled) },
  { key: "conversionRate", label: "Lead → App", align: "right", render: (r) => fmtPct(r.conversionRate) },
  { key: "admissionRate", label: "Admission rate", align: "right", render: (r) => fmtPct(r.admissionRate) },
];

const dimColumns = (label: string): Column<DimensionRow>[] => [
  { key: "label", label, render: (r) => <span className="font-medium">{r.label}</span> },
  { key: "applications", label: "Applications", align: "right", render: (r) => fmtNum(r.applications) },
  { key: "submitted", label: "Submitted", align: "right", render: (r) => fmtNum(r.submitted) },
  { key: "offers", label: "Offers", align: "right", render: (r) => fmtNum(r.offers) },
  { key: "accepted", label: "Accepted", align: "right", render: (r) => fmtNum(r.accepted) },
  { key: "enrolled", label: "Enrolled", align: "right", render: (r) => fmtNum(r.enrolled) },
  { key: "offerRate", label: "Offer rate", align: "right", render: (r) => fmtPct(r.offerRate) },
  { key: "admissionRate", label: "Admission rate", align: "right", render: (r) => fmtPct(r.admissionRate) },
];

export function GeographyReport({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading } = useGeographyReport(filters);

  if (isLoading) return <LoadingBlock height={400} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Leads by State" description="Heat view — darker bars mean more leads." className="xl:col-span-2">
          <GeoHeatList rows={data?.leadsByState || []} labelKey="state" extra={(r) => `${fmtPct(r.admissionRate)} adm.`} limit={15} />
        </Panel>
        <Panel title="Leads by Country">
          <GeoHeatList rows={data?.leadsByCountry || []} labelKey="country" limit={10} />
        </Panel>
      </div>

      <Panel title="Conversion by State">
        <DataTable rows={data?.leadsByState || []} columns={geoColumns("state")} csvName="geo-by-state" maxHeight={420} />
      </Panel>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Conversion by City">
          <DataTable rows={data?.leadsByCity || []} columns={geoColumns("city")} csvName="geo-by-city" maxHeight={420} />
        </Panel>
        <Panel title="Conversion by Country">
          <DataTable rows={data?.leadsByCountry || []} columns={geoColumns("country")} csvName="geo-by-country" maxHeight={420} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Applications by State">
          <DataTable rows={data?.applicationsByState || []} columns={dimColumns("State")} csvName="applications-by-state" maxHeight={380} />
        </Panel>
        <Panel title="Applications by City">
          <DataTable rows={data?.applicationsByCity || []} columns={dimColumns("City")} csvName="applications-by-city" maxHeight={380} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Offer Rate by Academic Background" description="Undergraduate degree of the applicant.">
          <SimpleBarChart data={data?.academicBackground || []} xKey="label" bars={[{ key: "offerRate", label: "Offer rate %" }]} valueFormatter={(v) => `${v}%`} />
          <DataTable rows={data?.academicBackground || []} columns={dimColumns("Academic background")} csvName="academic-background" maxHeight={300} />
        </Panel>
        <Panel title="Admission Rate by Work Experience">
          <SimpleBarChart data={data?.workExperience || []} xKey="label" bars={[{ key: "admissionRate", label: "Admission rate %", color: "#16a34a" }]} valueFormatter={(v) => `${v}%`} />
          <DataTable rows={data?.workExperience || []} columns={dimColumns("Work experience")} csvName="work-experience" />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Test Score Bands" description="Best entrance-test percentile per application.">
          <DataTable rows={data?.testScores || []} columns={dimColumns("Percentile band")} csvName="test-score-bands" />
        </Panel>
        <Panel title="Entrance Tests Taken">
          <DataTable
            rows={data?.testsTaken || []}
            csvName="entrance-tests"
            columns={[
              { key: "test", label: "Test", render: (r) => <span className="font-medium">{r.test}</span> },
              { key: "applications", label: "Applications", align: "right", render: (r) => fmtNum(r.applications) },
              { key: "avgPercentile", label: "Avg percentile", align: "right", render: (r) => (r.avgPercentile ?? "—").toString() },
              { key: "avgScore", label: "Avg score", align: "right", render: (r) => (r.avgScore ?? "—").toString() },
              { key: "offers", label: "Offers", align: "right", render: (r) => fmtNum(r.offers) },
              { key: "offerRate", label: "Offer rate", align: "right", render: (r) => fmtPct(r.offerRate) },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Program">
          <DonutChart data={(data?.programs || []).map((r) => ({ name: r.label, value: r.applications }))} height={200} />
        </Panel>
        <Panel title="Gender">
          <DonutChart data={(data?.gender || []).map((r) => ({ name: r.label, value: r.applications }))} height={200} />
        </Panel>
        <Panel title="Age Group">
          <DonutChart data={(data?.ageGroups || []).map((r) => ({ name: r.label, value: r.applications }))} height={200} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Program-wise Outcomes">
          <DataTable rows={data?.programs || []} columns={dimColumns("Program")} csvName="programs" />
        </Panel>
        <Panel title="Gender-wise Outcomes">
          <DataTable rows={data?.gender || []} columns={dimColumns("Gender")} csvName="gender" />
        </Panel>
        <Panel title="Age-group Outcomes">
          <DataTable rows={data?.ageGroups || []} columns={dimColumns("Age group")} csvName="age-groups" />
        </Panel>
      </div>
    </div>
  );
}
