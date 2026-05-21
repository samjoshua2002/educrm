"use client";

import { format, subMonths } from "date-fns";
import { CheckCircle2, XCircle, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Line,
  LineChart,
  XAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  applicationsChartData,
  applicationsChartConfig,
  verifiedTrendData,
  verifiedTrendConfig,
  rejectedTrendData,
  rejectedTrendConfig,
  pendingTrendData,
  pendingTrendConfig,
  feeCollectionData,
  feeCollectionConfig,
} from "./dashboard.config";

const lastMonth = format(subMonths(new Date(), 1), "LLLL");

export function OverviewCards() {
  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 — 3 equal cards */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-3">
        {/* Total Applications — stacked bar */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <CardDescription className="text-xs">This Month</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <ChartContainer
              className="h-16 w-full"
              config={applicationsChartConfig}
            >
              <BarChart
                accessibilityLayer
                data={applicationsChartData}
                barSize={6}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => `${lastMonth}: ${l}`}
                    />
                  }
                />
                <Bar
                  background={{
                    fill: "var(--color-background)",
                    radius: 4,
                    opacity: 0.07,
                  }}
                  dataKey="verified"
                  stackId="a"
                  fill="var(--color-verified)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="pending"
                  stackId="a"
                  fill="var(--color-pending)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-semibold tabular-nums">1,240</span>
            <span className="text-xs font-medium text-green-500">+18.2%</span>
          </CardFooter>
        </Card>

        {/* Verified — area chart */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <CardDescription className="text-xs">
                  This Month
                </CardDescription>
              </div>
              <div className="w-fit rounded-md bg-green-500/10 p-1.5">
                <CheckCircle2 className="size-4 text-green-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer
              className="h-16 w-full"
              config={verifiedTrendConfig}
            >
              <AreaChart
                data={verifiedTrendData}
                margin={{ left: 0, right: 0, top: 3 }}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => `${lastMonth}: ${l}`}
                      hideIndicator
                    />
                  }
                />
                <Area
                  dataKey="verified"
                  fill="var(--color-verified)"
                  fillOpacity={0.05}
                  stroke="var(--color-verified)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-semibold tabular-nums">920</span>
            <span className="text-xs font-medium text-green-500">74.2%</span>
          </CardFooter>
        </Card>

        {/* Rejected — area chart */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <CardDescription className="text-xs">
                  This Month
                </CardDescription>
              </div>
              <div className="w-fit rounded-md bg-destructive/10 p-1.5">
                <XCircle className="size-4 text-destructive" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer
              className="h-16 w-full"
              config={rejectedTrendConfig}
            >
              <AreaChart
                data={rejectedTrendData}
                margin={{ left: 0, right: 0, top: 3 }}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => `${lastMonth}: ${l}`}
                      hideIndicator
                    />
                  }
                />
                <Area
                  dataKey="rejected"
                  fill="var(--color-rejected)"
                  fillOpacity={0.05}
                  stroke="var(--color-rejected)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-semibold tabular-nums">47</span>
            <span className="text-xs font-medium text-destructive">3.8%</span>
          </CardFooter>
        </Card>
      </div>

      {/* Row 2 — Fee Collected + Pending Review side by side */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2">
        {/* Fee Collected — line chart */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  Fee Collected
                </CardTitle>
                <CardDescription className="text-xs">
                  Last 6 Months
                </CardDescription>
              </div>
              <div className="w-fit rounded-md bg-primary/10 p-1.5">
                <Wallet className="size-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-0">
            <ChartContainer
              config={feeCollectionConfig}
              className="h-16 w-full"
            >
              <LineChart
                data={feeCollectionData}
                margin={{ top: 3, right: 4, left: 4, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  strokeWidth={2}
                  dataKey="fee"
                  stroke="var(--color-fee)"
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-semibold tabular-nums">₹56.2L</span>
            <span className="text-xs font-medium text-green-500">+22.4%</span>
          </CardFooter>
        </Card>

        {/* Pending Review — area chart */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <CardDescription className="text-xs">This Month</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer className="h-16 w-full" config={pendingTrendConfig}>
              <AreaChart
                data={pendingTrendData}
                margin={{ left: 0, right: 0, top: 3 }}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(l) => `${lastMonth}: ${l}`}
                      hideIndicator
                    />
                  }
                />
                <Area
                  dataKey="pending"
                  fill="var(--color-pending)"
                  fillOpacity={0.05}
                  stroke="var(--color-pending)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex items-center justify-between px-4 py-3">
            <span className="text-lg font-semibold tabular-nums">273</span>
            <span className="text-xs font-medium text-amber-500">22.0%</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
