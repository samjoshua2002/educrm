"use client";

import * as React from "react";
import { Mail, CreditCard, Loader2, Eye, EyeOff, Hash } from "lucide-react";

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
        className="h-10 pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
        "Configure this organization's own email (SMTP) sender and Razorpay payment gateway credentials.",
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

  // Mirrors the backend's ApplicationsService.buildApplicationNo token
  // substitution, so the preview always matches what will actually be
  // generated.
  const applicationNoPreview = React.useMemo(() => {
    const year = new Date().getFullYear().toString();
    return applicationNumberFormat
      .replace(/\{SEQ:(\d+)\}/g, (_m, width) => "1001".padStart(Number(width), "0"))
      .replace(/\{SEQ\}/g, "1001")
      .replace(/\{ORG\}/g, "ORG")
      .replace(/\{BRANCH\}/g, "APP")
      .replace(/\{YEAR\}/g, year)
      .replace(/\{YY\}/g, year.slice(-2));
  }, [applicationNumberFormat]);

  const handleSaveFormat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationNumberFormat.trim()) {
      return;
    }
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

  const loading = !orgId || isLoading;
  const formatLoading = !orgId || isGeneralLoading;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <Card className="max-w-xl border border-[#e5e5e5] rounded-[12px] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-[8px] bg-[#F5F3FF] flex items-center justify-center text-[#7C3AED]">
              <Hash className="size-4" />
            </div>
            <div>
              <CardTitle>Application Number Format</CardTitle>
              <CardDescription>
                Customize how application numbers are generated for this organization.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSaveFormat}>
          <CardContent>
            {formatLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="size-4 animate-spin" /> Loading current settings...
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="applicationNumberFormat" className="text-sm font-medium">
                    Format Template
                  </Label>
                  <Input
                    id="applicationNumberFormat"
                    className="h-10 font-mono"
                    placeholder="{BRANCH}/{YEAR}/{SEQ}"
                    value={applicationNumberFormat}
                    onChange={(e) => setApplicationNumberFormat(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Tokens: <code className="font-mono">{"{ORG}"}</code> org code,{" "}
                  <code className="font-mono">{"{BRANCH}"}</code> branch code,{" "}
                  <code className="font-mono">{"{YEAR}"}</code> / <code className="font-mono">{"{YY}"}</code> year,{" "}
                  <code className="font-mono">{"{SEQ}"}</code> or <code className="font-mono">{"{SEQ:4}"}</code>{" "}
                  (zero-padded) sequence number. Any other characters (e.g. <code className="font-mono">/</code> or{" "}
                  <code className="font-mono">-</code>) are kept as-is.
                </p>
                <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Preview: </span>
                  <span className="font-mono font-semibold text-slate-900">{applicationNoPreview}</span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={formatLoading || updateGeneralSettings.isPending}>
              {updateGeneralSettings.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Format"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-xl border border-[#e5e5e5] rounded-[12px] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
              <Mail className="size-4" />
            </div>
            <div>
              <CardTitle>Email (SMTP) Settings</CardTitle>
              <CardDescription>
                Used to send all transactional emails from this organization — shortlist, interview,
                offer, and enrollment notices.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSaveEmail}>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="size-4 animate-spin" /> Loading current settings...
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtpHost" className="text-sm font-medium">
                      SMTP Host
                    </Label>
                    <Input
                      id="smtpHost"
                      className="h-10"
                      placeholder="smtp-relay.brevo.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtpPort" className="text-sm font-medium">
                      SMTP Port
                    </Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      className="h-10"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="smtpUser" className="text-sm font-medium">
                    SMTP Username
                  </Label>
                  <Input
                    id="smtpUser"
                    className="h-10"
                    placeholder="e.g. your-smtp-login@smtp-brevo.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="smtpPass" className="text-sm font-medium">
                    SMTP Password
                  </Label>
                  <SecretInput
                    id="smtpPass"
                    value={smtpPass}
                    onChange={setSmtpPass}
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtpFromEmail" className="text-sm font-medium">
                      From Email
                    </Label>
                    <Input
                      id="smtpFromEmail"
                      type="email"
                      className="h-10"
                      placeholder="admissions@yourorg.com"
                      value={smtpFromEmail}
                      onChange={(e) => setSmtpFromEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="smtpFromName" className="text-sm font-medium">
                      From Name
                    </Label>
                    <Input
                      id="smtpFromName"
                      className="h-10"
                      placeholder="Admissions Desk"
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Email Settings"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-xl border border-[#e5e5e5] rounded-[12px] shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-[8px] bg-[#ECFDF5] flex items-center justify-center text-[#059669]">
              <CreditCard className="size-4" />
            </div>
            <div>
              <CardTitle>Payment Gateway (Razorpay) Settings</CardTitle>
              <CardDescription>
                Used to collect application fees and seat booking fees for this organization.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSavePayments}>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="size-4 animate-spin" /> Loading current settings...
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="razorpayKeyId" className="text-sm font-medium">
                    Razorpay Key ID
                  </Label>
                  <Input
                    id="razorpayKeyId"
                    className="h-10"
                    placeholder="rzp_test_xxxxxxxxxxxx"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="razorpayKeySecret" className="text-sm font-medium">
                    Razorpay Key Secret
                  </Label>
                  <SecretInput
                    id="razorpayKeySecret"
                    value={razorpayKeySecret}
                    onChange={setRazorpayKeySecret}
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="razorpayWebhookSecret" className="text-sm font-medium">
                    Razorpay Webhook Secret
                  </Label>
                  <SecretInput
                    id="razorpayWebhookSecret"
                    value={razorpayWebhookSecret}
                    onChange={setRazorpayWebhookSecret}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Payment Settings"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
