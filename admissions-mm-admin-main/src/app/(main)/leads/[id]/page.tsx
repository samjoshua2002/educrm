"use client";

import * as React from "react";

import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  MoreVertical,
  Edit2,
  Share2,
  MessageSquare,
  History,
  CheckCircle2,
  Ban,
  PhoneCall,
  ExternalLink,
  Linkedin,
  Twitter,
  Globe,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Mock Lead Data
const leadData = {
  id: "LEAD-123456",
  name: "Ishaan Sharma",
  email: "ishaan.sharma@example.com",
  phone: "+91 98765 43210",
  location: "Mumbai, Maharashtra",
  status: "Active",
  stage: "Interview Stage",
  score: 85,
  source: "Google Search",
  assignedTo: "Rajesh Kumar",
  createdAt: "2024-02-10",
  lastActivity: "2 hours ago",
  program: "Master of Business Administration",
  campus: "Main Campus",
  image:
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=200&h=200",
};

// Lead Score Data for Chart
const scoreData = [
  { name: "Score", value: leadData.score, color: "var(--chart-2)" },
  {
    name: "Remaining",
    value: 100 - leadData.score,
    color: "hsl(var(--muted)/0.3)",
  },
];

// Lead Stages
const stages = [
  { name: "Unverified", status: "completed" },
  { name: "Verified", status: "completed" },
  { name: "Application", status: "completed" },
  { name: "Interview", status: "current" },
  { name: "Closed", status: "upcoming" },
];

// Timeline Data
const timelineItems = [
  {
    type: "call",
    title: "Phone Call with Applicant",
    description: "Discussed scholarship opportunities and program curriculum.",
    time: "Today, 11:30 AM",
    user: "Rajesh Kumar",
    icon: PhoneCall,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    type: "email",
    title: "Document Verification Email",
    description:
      "Sent request for original transcripts of undergraduate degree.",
    time: "Yesterday, 4:45 PM",
    user: "System",
    icon: Mail,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    type: "status",
    title: "Stage Changed: Interview",
    description: "Lead moved from Application Stage to Interview Stage.",
    time: "Feb 18, 10:20 AM",
    user: "Rajesh Kumar",
    icon: History,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    type: "message",
    title: "WhatsApp Message Sentiment",
    description: "Applicant expressed high interest in the upcoming Open Day.",
    time: "Feb 17, 2:15 PM",
    user: "AI Assistant",
    icon: MessageSquare,
    iconColor: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
];

export default function LeadDetailsPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-bold">
            <span>Leads</span>
            <span>/</span>
            <span className="text-foreground">{leadData.id}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Ban className="size-4" />
            Disqualify
          </Button>
          <Button size="sm" className="gap-2 shadow-lg shadow-primary/20">
            <Edit2 className="size-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - User Details */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="overflow-hidden border-none shadow-xl shadow-black/5 bg-gradient-to-b from-primary/5 via-background to-background">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center relative mb-4">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-75" />
                <Avatar className="size-32 border-4 border-background shadow-2xl relative">
                  <AvatarImage src={leadData.image} alt={leadData.name} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {leadData.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-1 right-1/2 translate-x-12 translate-y-1">
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-md">
                    Active
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                {leadData.name}
              </CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground">
                ID: {leadData.id}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="w-full gap-2 border-primary/10 hover:border-primary/30"
                >
                  <Phone className="size-4" /> Call
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-2 border-primary/10 hover:border-primary/30"
                >
                  <Mail className="size-4" /> Email
                </Button>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                      Email Address
                    </p>
                    <p className="text-sm font-medium">{leadData.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Phone className="size-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium">{leadData.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <MapPin className="size-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                      Location
                    </p>
                    <p className="text-sm font-medium">{leadData.location}</p>
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Globe className="size-4 text-primary" /> Social Profiles
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <Linkedin className="size-4 text-[#0077b5]" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <Twitter className="size-4 text-[#1DA1F2]" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-full"
                  >
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4">
              <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-tighter">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3" />
                  Created {leadData.createdAt}
                </div>
                <div className="text-primary font-black">
                  Source: {leadData.source}
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Top Row: Lead Score & Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lead Score Meter */}
            <Card className="shadow-lg border-none shadow-black/5 @container/chart">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Lead Score
                </CardTitle>
                <CardDescription>High Probability</CardDescription>
                <CardAction>
                  <Badge
                    variant="outline"
                    className="font-bold text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-2"
                  >
                    Hot Lead
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-4">
                <div className="relative size-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scoreData}
                        cx="50%"
                        cy="80%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        {scoreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                    <span className="text-4xl font-black text-foreground">
                      {leadData.score}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 tracking-[0.2em] -mr-[0.2em]">
                      Score
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 w-full gap-4 mt-[-10px]">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-70">
                      Leads Avg
                    </p>
                    <p className="text-sm font-bold tracking-tight">78%</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-70">
                      Response
                    </p>
                    <p className="text-sm font-bold text-emerald-500 tracking-tight">
                      92%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Highlights */}
            <Card className="shadow-lg border-none shadow-black/5 bg-gradient-to-br from-background to-primary/[0.02]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Lead Analysis
                </CardTitle>
                <CardDescription>Next Recommended Action</CardDescription>
                <CardAction>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreVertical className="size-4" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                      Current Stage
                    </p>
                    <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-500/20 text-[10px] font-bold py-0.5 px-3 uppercase">
                      {leadData.stage}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                      Assigned To
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5 border">
                        <AvatarFallback className="text-[8px] bg-amber-100 text-amber-700 font-bold">
                          RK
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold tracking-tight">
                        {leadData.assignedTo}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-muted/30 border border-muted/50 flex flex-col gap-1 ring-1 ring-primary/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-80 tracking-tighter">
                      Preferred Program
                    </p>
                    <p className="text-sm font-bold truncate leading-tight">
                      {leadData.program}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold mt-1 uppercase opacity-70">
                      <MapPin className="size-3" /> {leadData.campus}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        High Intent
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Review Needed
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row: Progress Stepper */}
          <Card className="shadow-lg border-none shadow-black/5">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold tracking-tight">
                Lead Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex justify-between w-full px-4">
                {/* Connector Line */}
                <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-muted z-0">
                  <div
                    className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    style={{ width: "75%" }}
                  />
                </div>

                {stages.map((stage, idx) => {
                  const isCompleted = stage.status === "completed";
                  const isCurrent = stage.status === "current";

                  return (
                    <div
                      key={stage.name}
                      className="relative z-10 flex flex-col items-center gap-3"
                    >
                      <div
                        className={`
                                                size-9 rounded-full flex items-center justify-center border-4 border-background shadow-lg transition-all duration-300
                                                ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                                                ${isCurrent ? "bg-background border-primary text-primary animate-pulse ring-4 ring-primary/10" : ""}
                                                ${stage.status === "upcoming" ? "bg-muted text-muted-foreground" : ""}
                                            `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-[9px] font-black uppercase tracking-tighter ${isCurrent ? "text-primary" : "text-muted-foreground opacity-60"}`}
                        >
                          {stage.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[7px] font-bold text-primary italic leading-none mt-0.5">
                            Focus
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="font-semibold">
              Interactions
            </Button>
            <Button variant="outline" size="sm" className="font-semibold">
              Profile
            </Button>
            <Button variant="outline" size="sm" className="font-semibold">
              Application Form
            </Button>
          </div>

          {/* Bottom Row: Communication Timeline */}
          <Card className="shadow-lg border-none shadow-black/5 flex-1 min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Timeline & Interactions
                </CardTitle>
                <CardDescription className="text-xs">
                  History of all lead touchpoints
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-8">
                  <Calendar className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-8">
                  <Clock className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 md:px-6">
              <ScrollArea className="h-[450px] pr-4">
                <div className="relative space-y-8 ml-6 before:absolute before:inset-y-0 before:left-[-20px] before:w-[2px] before:bg-gradient-to-b before:from-primary/40 before:via-muted before:to-transparent">
                  {timelineItems.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div
                        className={`
                                                absolute left-[-32px] top-1 size-6 rounded-full border-4 border-background shadow-sm z-10
                                                ${item.bgColor} flex items-center justify-center transition-transform group-hover:scale-110 duration-300
                                            `}
                      >
                        <item.icon className={`size-2.5 ${item.iconColor}`} />
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/5 hover:bg-muted/30 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="text-sm font-bold tracking-tight text-foreground/90">
                            {item.title}
                          </h5>
                          <time className="text-[9px] font-black text-muted-foreground opacity-50 uppercase tracking-widest">
                            {item.time}
                          </time>
                        </div>
                        <p className="text-sm text-muted-foreground/80 leading-relaxed mb-3 font-medium">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">
                              Handled by
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Avatar className="size-4 border">
                                <AvatarFallback className="text-[6px] bg-primary/10 text-primary font-black uppercase">
                                  {item.user[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-bold tracking-tight uppercase opacity-80">
                                {item.user}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] font-black px-2 hover:bg-primary/5 text-primary uppercase tracking-widest"
                          >
                            View <ExternalLink className="size-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-center pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-black text-muted-foreground hover:text-primary gap-2 uppercase tracking-widest"
                    >
                      <History className="size-3" /> Full Activity History
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
