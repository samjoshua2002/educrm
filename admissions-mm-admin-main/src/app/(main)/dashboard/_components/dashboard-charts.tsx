"use client";

import * as React from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { type Application } from "@/data/mock-applications";

// Shorten program names for X-Axis of the chart
function getShortProgramName(name: string) {
  if (!name) return "Unknown";
  return name
    .replace("B.Tech ", "")
    .replace("M.Tech ", "")
    .replace("B.Sc ", "")
    .replace("MBA ", "")
    .replace("Computer Science", "CS")
    .replace("Mechanical Engineering", "Mech")
    .replace("Mechanical Eng.", "Mech")
    .replace("Business Management", "Mgmt")
    .replace("Business Mgmt.", "Mgmt")
    .replace("Finance", "Fin")
    .replace("Marketing", "Mktg")
    .replace("Mathematics", "Math")
    .replace("Electronics", "ECE")
    .replace("Physics", "Phys");
}

interface DashboardChartsProps {
  readonly applications: Application[];
  readonly isLoading: boolean;
  readonly mounted: boolean;
}

export function DashboardCharts({
  applications,
  isLoading,
  mounted,
}: DashboardChartsProps) {
  const [timeframe, setTimeframe] = React.useState<"weekly" | "monthly">(
    "monthly",
  );
  const showLoader = !mounted || isLoading;

  // Derived Statistics
  const totalCount = applications.length;

  // Chart Calculations (Dynamic program counting)
  const programCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach((app) => {
      const prog = app.program ?? "Unknown";
      counts[prog] = (counts[prog] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [applications]);

  // Dynamic vertical bar chart data (left component)
  const chartData = React.useMemo(() => {
    const top4 = programCounts.slice(0, 4);
    return top4.map((item) => ({
      name: getShortProgramName(item.name),
      applications: item.count,
    }));
  }, [programCounts]);

  // Dynamic course shares (right component)
  const courseShares = React.useMemo(() => {
    if (totalCount === 0) return [];
    const top4 = programCounts.slice(0, 4);
    const top4Sum = top4.reduce((sum, item) => sum + item.count, 0);

    const list = top4.map((item) => ({
      name: item.name,
      percentage: Math.round((item.count / totalCount) * 100),
    }));

    if (totalCount > top4Sum) {
      list.push({
        name: "Others",
        percentage: Math.round(((totalCount - top4Sum) / totalCount) * 100),
      });
    }

    return list.sort((a, b) => b.percentage - a.percentage);
  }, [totalCount, programCounts]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Component: Chart */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-6 flex flex-col justify-between shadow-xs lg:col-span-2 min-h-[383px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#0A0A0A] text-[18px] font-semibold">
            Dashboard Overview
          </h2>
          <div className="flex gap-2 bg-[#F5F5F5] p-1 rounded-[10px]">
            <button
              onClick={() => setTimeframe("weekly")}
              className={`px-3 py-1 rounded-[8px] text-[13px] font-medium transition-all duration-200 ${
                timeframe === "weekly"
                  ? "bg-white text-[#0A0A0A] shadow-xs"
                  : "text-[#737373] hover:text-[#0a0a0a]"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe("monthly")}
              className={`px-3 py-1 rounded-[8px] text-[13px] font-medium transition-all duration-200 ${
                timeframe === "monthly"
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#737373] hover:text-white"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {showLoader ? (
          <div className="h-[250px] w-full flex items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[250px] w-full flex items-center justify-center text-slate-400">
            No data available
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barSize={48}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0, 0, 0, 0.02)" }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="applications"
                  fill="#2563EB"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Right Component: Course Share */}
      <div className="bg-white border border-[#e5e5e5] rounded-[8px] p-6 flex flex-col justify-between shadow-xs lg:col-span-1 min-h-[383px]">
        <h2 className="text-[#0A0A0A] text-[18px] font-semibold mb-4">
          Dashboard Overview
        </h2>

        {showLoader ? (
          <div className="flex flex-col gap-6 flex-1 justify-center animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-4 w-10 bg-slate-200 rounded" />
                </div>
                <div className="h-[11px] w-full bg-slate-200 rounded-[9999px]" />
              </div>
            ))}
          </div>
        ) : courseShares.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            No data available
          </div>
        ) : (
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {courseShares.map((item, index) => {
              // Custom opacity levels
              const opacityClasses = [
                "bg-[#2563EB]",
                "bg-[#2563EB]/90",
                "bg-[#2563EB]/80",
                "bg-[#2563EB]/70",
                "bg-[#2563EB]/50",
              ];
              const barBg = opacityClasses[index % opacityClasses.length];

              return (
                <div key={item.name} className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between text-[14px] font-medium leading-normal">
                    <span
                      className="text-[#262626] truncate max-w-[200px]"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <span className="text-[#737373] shrink-0 font-semibold">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="bg-[#e5e5e5] h-[11px] overflow-hidden rounded-[9999px] w-full relative">
                    <div
                      className={`h-full rounded-[9999px] transition-all duration-700 ${barBg}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
