"use client";

import * as React from "react";
import {
  Mail,
  CreditCard,
  Loader2,
  Eye,
  EyeOff,
  Hash,
  Copy,
  Check,
  ShieldCheck,
  Send,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  useOrganizationIntegrationSettings,
  useUpdateOrganizationIntegrationSettings,
} from "@/hooks/use-organization-integration-settings";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/use-organizations";

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className="h-10 pr-10 border-slate-300 rounded-[8px] focus-visible:ring-blue-600 font-mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default function OrganizationIntegrationSettingsPage() {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId || "";

  const [activeTab, setActiveTab] = React.useState("numbering");
  const [copiedWebhook, setCopiedWebhook] = React.useState(false);

  const { data: settings, isLoading } = useOrganizationIntegrationSettings(orgId);
  const updateSettings = useUpdateOrganizationIntegrationSettings(orgId);

  const { data: generalSettings, isLoading: isGeneralLoading } = useOrganizationSettings(orgId);
  const updateGeneralSettings = useUpdateOrganizationSettings(orgId);

  const [applicationNumberFormat, setApplicationNumberFormat] = React.useState("{BRANCH}/{YEAR}/{SEQ}");
  const [formatInitialized, setFormatInitialized] = React.useState(false);

  const [smtpHost, setSmtpHost] = React.useState("");
  const [smtpPort, setSmtpPort] = React.useState("587");
  const [smtpUser, setSmtpUser] = React.useState("");
  const [smtpPass, setSmtpPass] = React.useState("");
  const [smtpFromEmail, setSmtpFromEmail] = React.useState("");
  const [smtpFromName, setSmtpFromName] = React.useState("");

  const [razorpayKeyId, setRazorpayKeyId] = React.useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = React.useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = React.useState("");

  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    setHeader({
      title: "Organization Settings",
      description:
        "Configure application numbering patterns, transactional email delivery (SMTP), and Razorpay payment gateway credentials.",
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  React.useEffect(() => {
    if (settings && !initialized) {
      setSmtpHost(settings.smtpHost || "");
      setSmtpPort(settings.smtpPort ? String(settings.smtpPort) : "587");
      setSmtpUser(settings.smtpUser || "");
      setSmtpPass(settings.smtpPass || "");
      setSmtpFromEmail(settings.smtpFromEmail || "");
      setSmtpFromName(settings.smtpFromName || "");
      setRazorpayKeyId(settings.razorpayKeyId || "");
      setRazorpayKeySecret(settings.razorpayKeySecret || "");
      setRazorpayWebhookSecret(settings.razorpayWebhookSecret || "");
      setInitialized(true);
    }
  }, [settings, initialized]);

  React.useEffect(() => {
    if (generalSettings && !formatInitialized) {
      setApplicationNumberFormat(generalSettings.applicationNumberFormat || "{BRANCH}/{YEAR}/{SEQ}");
      setFormatInitialized(true);
    }
  }, [generalSettings, formatInitialized]);

  // Live preview builder
  const generatePreview = (branchCode = "CITY", sequence = 1001) => {
    const year = new Date().getFullYear().toString();
    return applicationNumberFormat
      .replace(/\{SEQ:(\d+)\}/g, (_m, width) => String(sequence).padStart(Number(width), "0"))
      .replace(/\{SEQ\}/g, String(sequence))
      .replace(/\{ORG\}/g, "EDU")
      .replace(/\{BRANCH\}/g, branchCode)
      .replace(/\{YEAR\}/g, year)
      .replace(/\{YY\}/g, year.slice(-2));
  };

  const handleInsertToken = (token: string) => {
    setApplicationNumberFormat((prev) => prev + token);
  };

  const handleSaveFormat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationNumberFormat.trim()) return;
    updateGeneralSettings.mutate({ applicationNumberFormat: applicationNumberFormat.trim() });
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const port = Number(smtpPort);
    updateSettings.mutate({
      smtpHost: smtpHost.trim() || undefined,
      smtpPort: Number.isNaN(port) ? undefined : port,
      smtpUser: smtpUser.trim() || undefined,
      smtpPass: smtpPass || undefined,
      smtpFromEmail: smtpFromEmail.trim() || undefined,
      smtpFromName: smtpFromName.trim() || undefined,
    });
  };

  const handleSavePayments = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      razorpayKeyId: razorpayKeyId.trim() || undefined,
      razorpayKeySecret: razorpayKeySecret || undefined,
      razorpayWebhookSecret: razorpayWebhookSecret || undefined,
    });
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin.replace("3001", "3000")}/api/payments/webhook`
    : "https://api.yourdomain.com/api/payments/webhook";

  const copyWebhookToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const razorpayMode = React.useMemo(() => {
    const trimmed = razorpayKeyId.trim().toLowerCase();
    if (!trimmed) return "none";
    if (trimmed.startsWith("rzp_test_")) return "test";
    if (trimmed.startsWith("rzp_live_")) return "live";
    return "custom";
  }, [razorpayKeyId]);

  const loading = !orgId || isLoading;
  const formatLoading = !orgId || isGeneralLoading;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto min-w-0">
      {/* Segmented Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col gap-6">
        <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-2 shadow-xs flex items-center justify-between overflow-x-auto">
          <TabsList className="bg-transparent border-0 p-0 h-auto flex gap-2 w-full justify-start">
            <TabsTrigger
              value="numbering"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[8px] transition-all cursor-pointer data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 hover:text-slate-900"
            >
              <Hash className="size-3.5" />
              Application Numbering
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[8px] transition-all cursor-pointer data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 hover:text-slate-900"
            >
              <Mail className="size-3.5" />
              Email & SMTP Delivery
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-[8px] transition-all cursor-pointer data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-xs text-slate-600 hover:text-slate-900"
            >
              <CreditCard className="size-3.5" />
              Payment Gateway (Razorpay)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: APPLICATION NUMBERING */}
        {/* ========================================================================= */}
        <TabsContent value="numbering" className="m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & Configuration */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#fafafa] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-[8px] bg-blue-100 flex items-center justify-center text-[#2563EB]">
                      <Hash className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Application Number Pattern</h3>
                      <p className="text-xs text-slate-500">Define the structure for newly generated application IDs</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveFormat}>
                  <div className="p-6 flex flex-col gap-5">
                    {formatLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                        <Loader2 className="size-4 animate-spin text-blue-600" />
                        <span>Loading format settings...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="appFormatInput" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Format Template
                          </Label>
                          <Input
                            id="appFormatInput"
                            className="h-10 font-mono text-base font-bold text-slate-900 border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                            placeholder="{BRANCH}/{YEAR}/{SEQ}"
                            value={applicationNumberFormat}
                            onChange={(e) => setApplicationNumberFormat(e.target.value)}
                          />
                        </div>

                        {/* Token Inserters */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[11px] font-medium text-slate-500">Available Tokens:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "{BRANCH}", desc: "Branch/Campus Code (e.g. CITY, CBE)" },
                              { label: "{YEAR}", desc: "4-Digit Year (2026)" },
                              { label: "{YY}", desc: "2-Digit Year (26)" },
                              { label: "{SEQ:4}", desc: "4-Digit Sequence (1001)" },
                              { label: "{SEQ}", desc: "Raw Sequence Number" },
                              { label: "{ORG}", desc: "Organization Code" },
                            ].map((token) => (
                              <button
                                key={token.label}
                                type="button"
                                onClick={() => handleInsertToken(token.label)}
                                title={token.desc}
                                className="px-2.5 py-1 rounded-[6px] text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                + {token.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Common Format Presets */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-medium text-slate-500">Standard Presets:</span>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "{BRANCH}/{YEAR}/{SEQ}",
                              "{ORG}-{BRANCH}-{YEAR}-{SEQ:4}",
                              "{BRANCH}-{YEAR}-{SEQ}",
                              "APP/{YEAR}/{SEQ:4}",
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setApplicationNumberFormat(preset)}
                                className={`px-3 py-1.5 rounded-[8px] text-xs font-mono font-medium border transition-all cursor-pointer ${
                                  applicationNumberFormat === preset
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#fafafa] flex items-center justify-end">
                    <Button
                      type="submit"
                      disabled={formatLoading || updateGeneralSettings.isPending}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-5 h-9 rounded-[8px] shadow-xs cursor-pointer"
                    >
                      {updateGeneralSettings.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          Saving Format...
                        </>
                      ) : (
                        "Save Numbering Pattern"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Sample Preview Box */}
            <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
              <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">Sample Generated IDs</h4>
                  <Badge variant="outline" className="text-slate-600 border-slate-200 text-[11px]">
                    Live Simulation
                  </Badge>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="bg-slate-50 rounded-[8px] p-3.5 border border-slate-200 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500">City Campus (Branch Code: CITY)</span>
                    <span className="text-base font-mono font-bold text-slate-900">{generatePreview("CITY", 1001)}</span>
                  </div>

                  <div className="bg-slate-50 rounded-[8px] p-3.5 border border-slate-200 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500">South Campus (Branch Code: STH)</span>
                    <span className="text-base font-mono font-bold text-slate-900">{generatePreview("STH", 1002)}</span>
                  </div>

                  <div className="bg-slate-50 rounded-[8px] p-3.5 border border-slate-200 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500">Default Branch (Code: APP)</span>
                    <span className="text-base font-mono font-bold text-blue-700">{generatePreview("APP", 1003)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <Info className="size-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>Existing application numbers in the database remain unchanged. Only newly created applications follow the updated pattern.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: EMAIL & SMTP DELIVERY */}
        {/* ========================================================================= */}
        <TabsContent value="email" className="m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#fafafa] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-[8px] bg-blue-100 flex items-center justify-center text-[#2563EB]">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Custom SMTP Sender Credentials</h3>
                      <p className="text-xs text-slate-500">Deliver transactional notifications, offer letters, and receipts</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveEmail}>
                  <div className="p-6 flex flex-col gap-5">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                        <Loader2 className="size-4 animate-spin text-blue-600" />
                        <span>Loading SMTP settings...</span>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2 flex flex-col gap-2">
                            <Label htmlFor="smtpHost" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              SMTP Host Server
                            </Label>
                            <Input
                              id="smtpHost"
                              className="h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                              placeholder="smtp-relay.brevo.com"
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="smtpPort" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Port
                            </Label>
                            <Input
                              id="smtpPort"
                              type="number"
                              className="h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                              placeholder="587"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="smtpUser" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              SMTP Username / Key
                            </Label>
                            <Input
                              id="smtpUser"
                              className="h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                              placeholder="login@smtp-provider.com"
                              value={smtpUser}
                              onChange={(e) => setSmtpUser(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="smtpPass" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              SMTP Password / Key
                            </Label>
                            <SecretInput
                              id="smtpPass"
                              value={smtpPass}
                              onChange={setSmtpPass}
                              placeholder="••••••••••••"
                            />
                          </div>
                        </div>

                        <Separator className="my-1" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="smtpFromEmail" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Sender Email Address
                            </Label>
                            <Input
                              id="smtpFromEmail"
                              type="email"
                              className="h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                              placeholder="admissions@yourcampus.edu"
                              value={smtpFromEmail}
                              onChange={(e) => setSmtpFromEmail(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="smtpFromName" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                              Sender Display Name
                            </Label>
                            <Input
                              id="smtpFromName"
                              className="h-10 text-sm border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                              placeholder="Admissions Desk"
                              value={smtpFromName}
                              onChange={(e) => setSmtpFromName(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#fafafa] flex items-center justify-end">
                    <Button
                      type="submit"
                      disabled={loading || updateSettings.isPending}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-5 h-9 rounded-[8px] shadow-xs cursor-pointer"
                    >
                      {updateSettings.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          Saving Email Settings...
                        </>
                      ) : (
                        "Save Email Configuration"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Sender Card Preview */}
            <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
              <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-6 shadow-xs flex flex-col gap-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Send className="size-4 text-blue-600" />
                  Sender Identity Preview
                </h4>
                <div className="rounded-[8px] bg-slate-50 border border-slate-200 p-4 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">From Header:</span>
                    <span className="font-semibold text-slate-900">
                      "{smtpFromName || "Admissions Desk"}" &lt;{smtpFromEmail || "admissions@yourorg.com"}&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Connection Host:</span>
                    <span className="font-mono text-slate-700">{smtpHost || "Not Configured"}:{smtpPort}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Used for automated notifications including: Application Received receipts, Interview Slot confirmation passes, Shortlist notices, and Offer letters.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: PAYMENT GATEWAY (RAZORPAY) */}
        {/* ========================================================================= */}
        <TabsContent value="payments" className="m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-[#e2e8f0] bg-[#fafafa] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-[8px] bg-blue-100 flex items-center justify-center text-[#2563EB]">
                      <CreditCard className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Razorpay API Credentials</h3>
                      <p className="text-xs text-slate-500">Connect your dedicated Razorpay merchant account</p>
                    </div>
                  </div>

                  {razorpayMode === "test" && (
                    <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-300 text-xs font-semibold">
                      Test / Sandbox Mode
                    </Badge>
                  )}
                  {razorpayMode === "live" && (
                    <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border-emerald-300 text-xs font-semibold">
                      Live Production
                    </Badge>
                  )}
                </div>

                <form onSubmit={handleSavePayments}>
                  <div className="p-6 flex flex-col gap-5">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                        <Loader2 className="size-4 animate-spin text-blue-600" />
                        <span>Loading payment settings...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="razorpayKeyId" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Razorpay Key ID
                          </Label>
                          <Input
                            id="razorpayKeyId"
                            className="h-10 text-sm font-mono border-slate-300 rounded-[8px] focus-visible:ring-blue-600"
                            placeholder="rzp_test_xxxxxxxxxxxx"
                            value={razorpayKeyId}
                            onChange={(e) => setRazorpayKeyId(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="razorpayKeySecret" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Razorpay Key Secret
                          </Label>
                          <SecretInput
                            id="razorpayKeySecret"
                            value={razorpayKeySecret}
                            onChange={setRazorpayKeySecret}
                            placeholder="••••••••••••••••••••"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="razorpayWebhookSecret" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Webhook Secret (Optional)
                          </Label>
                          <SecretInput
                            id="razorpayWebhookSecret"
                            value={razorpayWebhookSecret}
                            onChange={setRazorpayWebhookSecret}
                            placeholder="••••••••••••••••••••"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#fafafa] flex items-center justify-end">
                    <Button
                      type="submit"
                      disabled={loading || updateSettings.isPending}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs px-5 h-9 rounded-[8px] shadow-xs cursor-pointer"
                    >
                      {updateSettings.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                          Saving Razorpay Keys...
                        </>
                      ) : (
                        "Save Gateway Settings"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Webhook Setup Box */}
            <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
              <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-6 shadow-xs flex flex-col gap-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-blue-600" />
                  Webhook Endpoint Configuration
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Add this webhook URL into your <strong>Razorpay Dashboard &gt; Settings &gt; Webhooks</strong> to receive instant payment settlement webhooks:
                </p>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[8px] p-2">
                  <span className="font-mono text-xs text-slate-700 truncate flex-1 pl-1">
                    {webhookUrl}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyWebhookToClipboard}
                    className="h-7 px-2 text-xs gap-1 text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    {copiedWebhook ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Required Events:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["order.paid", "payment.captured", "payment.failed"].map((evt) => (
                      <span key={evt} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[11px] border border-blue-200">
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
