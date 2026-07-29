"use client";

import {
  XAxis,
  Label,
  Pie,
  PieChart,
  Bar,
  BarChart,
  CartesianGrid,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";

import {
  byCourseData,
  byCourseConfig,
  statusByStreamData,
  statusByStreamConfig,
  courseConversionData,
} from "./dashboard.config";

export function InsightCards() {
  const totalApplications = byCourseData.reduce(
    (acc, c) => acc + c.applications,
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-5">
      {/* Donut: by course */}
      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>Applications by Course</CardTitle>
        </CardHeader>
        <CardContent className="max-h-52">
          <ChartContainer config={byCourseConfig} className="size-full">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={byCourseData}
                dataKey="applications"
                nameKey="course"
                innerRadius={60}
                outerRadius={88}
                paddingAngle={2}
                cornerRadius={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold tabular-nums"
                          >
                            {totalApplications.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 24}
                            className="fill-muted-foreground text-xs"
                          >
                            Applications
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                content={() => (
                  <ul className="ml-6 flex flex-col gap-2.5">
                    {byCourseData.map((item) => (
                      <li
                        key={item.course}
                        className="flex w-32 items-center justify-between"
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ background: item.fill }}
                          />
                          {byCourseConfig[item.course]?.label}
                        </span>
                        <span className="tabular-nums text-sm">
                          {item.applications}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm" variant="outline" className="basis-1/2">
            View Full Report
          </Button>
          <Button size="sm" variant="outline" className="basis-1/2">
            Download CSV
          </Button>
        </CardFooter>
      </Card>

      {/* Stacked bar: status per stream */}
      <Card className="col-span-1 xl:col-span-3">
        <CardHeader>
          <CardTitle>Application Status by Stream</CardTitle>
        </CardHeader>
        <CardContent className="size-full max-h-56">
          <ChartContainer config={statusByStreamConfig} className="size-full">
            <BarChart
              accessibilityLayer
              data={statusByStreamData}
              layout="vertical"
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="stream"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={52}
                className="text-xs"
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="verified"
                stackId="a"
                fill="var(--color-verified)"
              />
              <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" />
              <Bar
                dataKey="rejected"
                stackId="a"
                fill="var(--color-rejected)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-3">
              Admission rate by course
            </p>
            {courseConversionData.map((c) => (
              <div key={c.name} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-green-500">
                    {c.percentage}%
                  </span>
                </div>
                <Progress value={c.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
