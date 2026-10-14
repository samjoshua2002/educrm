"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, QrCode, RefreshCw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { usePageHeader } from "@/hooks/use-page-header";
import { useCourses } from "@/hooks/use-courses";
import { useCampaigns } from "@/hooks/use-campaigns";
import {
  apiUrl,
  useAddPortal,
  useCaptureEvents,
  useChatbotConversations,
  useDeleteCaptureEvent,
  useFacebookSync,
  useLeadCaptureSettings,
  useRegenerateCaptureKey,
  useRemovePortal,
  useSaveCaptureEvent,
  useUpdateLeadCaptureSettings,
  useUpdatePortal,
} from "@/hooks/use-lead-capture";
import { CAPTURE_EVENT_TYPES, type CaptureEvent, type CaptureEventInput } from "@/types/lead-management";
import {
  CopyField,
  EmptyState,
  FieldLabel,
  PageTitle,
  SectionCard,
  TabBar,
  Th,
  formatDate,
  formatDateTime,
  pillStyles,
  tableHeaderClass,
  tableShell,
} from "../../lead-manager/_components/lm-ui";

type Tab = "web" | "social" | "portal" | "event" | "chatbot";

const CHANNELS: { key: string; label: string }[] = [
  { key: "web", label: "Web forms / landing pages" },
  { key: "api", label: "Generic API" },
  { key: "social", label: "Social media (Meta, LinkedIn)" },
  { key: "portal", label: "Education portals" },
  { key: "event", label: "Events (QR registration)" },
  { key: "chatbot", label: "Chatbots" },
];

const SAMPLE_FIELDS =
  "full_name, email, phone, dob, city, state, country, program, intake, form_name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, page_url";

export default function LeadIntegrationsPage() {
  usePageHeader({
    title: "Lead Capture Integrations",
    description: "Webhook URLs, keys and credentials for every lead capture channel.",
  });

  const [tab, setTab] = React.useState<Tab>("web");
  const { data: s, isLoading } = useLeadCaptureSettings();
  const update = useUpdateLeadCaptureSettings();
  const regenerate = useRegenerateCaptureKey();

  if (isLoading || !s) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading integrations...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 w-full max-w-[1320px] mx-auto min-w-0">
      <PageTitle
        title="Capture channels"
        description="Every captured lead is standardized, source-tracked, scored, routed and checked for duplicates automatically."
        actions={
          <Button
            variant="outline"
            className="h-10 rounded-[8px] text-xs font-semibold"
            onClick={() => regenerate.mutate({ which: "api" })}
            disabled={regenerate.isPending}
          >
            <RefreshCw className="size-4" /> Regenerate API key
          </Button>
        }
      />

      <SectionCard title="Enabled channels" description="A disabled channel rejects new leads (HTTP 403).">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHANNELS.map((c) => (
            <label key={c.key} className="flex items-center justify-between gap-3 rounded-[8px] border border-border p-3">
              <span className="text-sm">{c.label}</span>
              <Switch
                checked={s.enabledChannels[c.key] !== false}
                onCheckedChange={(v) => update.mutate({ enabledChannels: { [c.key]: v } })}
              />
            </label>
          ))}
        </div>
        <CopyField label="Organization capture key" value={s.apiKey} secret />
      </SectionCard>

      <TabBar<Tab>
        tabs={[
          { value: "web", label: "Web & API" },
          { value: "social", label: "Social Media" },
          { value: "portal", label: "Education Portals" },
          { value: "event", label: "Events" },
          { value: "chatbot", label: "Chatbot" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "web" && <WebTab endpoints={s.endpoints} />}
      {tab === "social" && <SocialTab />}
      {tab === "portal" && <PortalTab />}
      {tab === "event" && <EventTab />}
      {tab === "chatbot" && <ChatbotTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function WebTab({ endpoints }: { endpoints: { web: string; api: string } }) {
  const webUrl = apiUrl(endpoints.web);
  const apiEndpoint = apiUrl(endpoints.api);
  const htmlSnippet = `<form action="${webUrl}" method="POST">
  <input name="full_name" required>
  <input name="email" type="email">
  <input name="phone">
  <input name="program">
  <input name="intake">
  <input type="hidden" name="form_name" value="MBA Landing Page">
  <!-- copy utm_* values from the page URL into hidden inputs -->
  <input type="hidden" name="utm_source">
  <input type="hidden" name="utm_campaign">
  <button>Submit</button>
</form>`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard
        title="Web forms & landing pages"
        description="Forms built in Forms are captured automatically. For external landing pages, POST the form to this URL."
      >
        <CopyField label="Landing page webhook (POST)" value={webUrl} />
        <p className="text-xs text-muted-foreground">
          UTM tags (utm_source, utm_medium, utm_campaign, utm_term, utm_content), gclid / fbclid and the submission URL
          are captured from the fields or from the page URL. Accepted fields: {SAMPLE_FIELDS}.
        </p>
        <div className="flex flex-col gap-2">
          <FieldLabel>Example HTML form</FieldLabel>
          <Textarea readOnly value={htmlSnippet} className="font-mono text-[11px] min-h-[220px]" />
        </div>
      </SectionCard>
      <SectionCard
        title="Generic API"
        description="For CRM-to-CRM transfers, Zapier or custom integrations. JSON body; send { leads: [...] } for up to 500 leads."
      >
        <CopyField label="API endpoint (POST, JSON)" value={apiEndpoint} />
        <div className="flex flex-col gap-2">
          <FieldLabel>Example body</FieldLabel>
          <Textarea
            readOnly
            className="font-mono text-[11px] min-h-[220px]"
            value={JSON.stringify(
              {
                full_name: "Asha Rao",
                email: "asha@example.com",
                phone: "+919800000000",
                dob: "2001-05-14",
                city: "Pune",
                country: "India",
                program: "MBA",
                intake: "Fall 2026",
                channel_source: "Web",
                source_type: "Paid Ads",
                sub_source: "Google",
                utm_campaign: "mba-fall-26",
              },
              null,
              2,
            )}
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SocialTab() {
  const { data: s } = useLeadCaptureSettings();
  const update = useUpdateLeadCaptureSettings();
  const regenerate = useRegenerateCaptureKey();
  const sync = useFacebookSync();
  const [fb, setFb] = React.useState({
    facebookPageId: "",
    facebookPageAccessToken: "",
    facebookAppSecret: "",
    facebookFormIds: "",
    facebookGraphVersion: "",
  });
  const [li, setLi] = React.useState({ linkedinClientSecret: "", linkedinAccessToken: "", linkedinApiVersion: "" });

  React.useEffect(() => {
    if (!s) return;
    setFb({
      facebookPageId: s.facebookPageId || "",
      facebookPageAccessToken: s.facebookPageAccessToken || "",
      facebookAppSecret: s.facebookAppSecret || "",
      facebookFormIds: (s.facebookFormIds || []).join(", "),
      facebookGraphVersion: s.facebookGraphVersion || "v19.0",
    });
    setLi({
      linkedinClientSecret: s.linkedinClientSecret || "",
      linkedinAccessToken: s.linkedinAccessToken || "",
      linkedinApiVersion: s.linkedinApiVersion || "202405",
    });
  }, [s]);

  if (!s) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            Facebook / Instagram Lead Ads
            <span className={s.configured.facebook ? pillStyles.green : pillStyles.amber}>
              {s.configured.facebook ? "Connected" : "Not configured"}
            </span>
          </span>
        }
        description="Subscribe your Page to the 'leadgen' webhook field in your Meta app with this callback URL and verify token."
      >
        <CopyField label="Callback URL" value={apiUrl(s.endpoints.facebook)} />
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <CopyField label="Verify token" value={s.facebookVerifyToken || ""} />
          </div>
          <Button variant="outline" className="h-10" onClick={() => regenerate.mutate({ which: "verify" })}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <FieldLabel>Page ID</FieldLabel>
            <Input className="h-10" value={fb.facebookPageId} onChange={(e) => setFb({ ...fb, facebookPageId: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>Graph API version</FieldLabel>
            <Input
              className="h-10"
              value={fb.facebookGraphVersion}
              onChange={(e) => setFb({ ...fb, facebookGraphVersion: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>Page access token (leads_retrieval)</FieldLabel>
          <Input
            className="h-10"
            type="password"
            value={fb.facebookPageAccessToken}
            onChange={(e) => setFb({ ...fb, facebookPageAccessToken: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>App secret (verifies X-Hub-Signature-256)</FieldLabel>
          <Input
            className="h-10"
            type="password"
            value={fb.facebookAppSecret}
            onChange={(e) => setFb({ ...fb, facebookAppSecret: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>Lead form IDs for “Sync now” (comma separated)</FieldLabel>
          <Input
            className="h-10"
            value={fb.facebookFormIds}
            onChange={(e) => setFb({ ...fb, facebookFormIds: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-10 text-xs font-semibold"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                facebookPageId: fb.facebookPageId || null,
                facebookPageAccessToken: fb.facebookPageAccessToken,
                facebookAppSecret: fb.facebookAppSecret,
                facebookGraphVersion: fb.facebookGraphVersion || "v19.0",
                facebookFormIds: fb.facebookFormIds.split(",").map((x) => x.trim()).filter(Boolean),
              })
            }
          >
            Save
          </Button>
          <Button
            variant="outline"
            className="h-10 text-xs font-semibold"
            disabled={sync.isPending || !s.configured.facebook}
            onClick={() => sync.mutate()}
          >
            {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sync now
          </Button>
          <span className="text-xs text-muted-foreground">Last sync: {formatDateTime(s.facebookLastSyncAt)}</span>
        </div>
      </SectionCard>

      <SectionCard
        title={
          <span className="flex items-center gap-2">
            LinkedIn Lead Gen Forms
            <span className={s.configured.linkedin ? pillStyles.green : pillStyles.amber}>
              {s.configured.linkedin ? "Connected" : "Not configured"}
            </span>
          </span>
        }
        description="Register this URL as a Lead Sync webhook in your LinkedIn app. The challenge is answered with your client secret."
      >
        <CopyField label="Webhook URL" value={apiUrl(s.endpoints.linkedin)} />
        <div className="flex flex-col gap-2">
          <FieldLabel>Client secret</FieldLabel>
          <Input
            className="h-10"
            type="password"
            value={li.linkedinClientSecret}
            onChange={(e) => setLi({ ...li, linkedinClientSecret: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>Access token (r_marketing_leadgen_automation)</FieldLabel>
          <Input
            className="h-10"
            type="password"
            value={li.linkedinAccessToken}
            onChange={(e) => setLi({ ...li, linkedinAccessToken: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>API version (YYYYMM)</FieldLabel>
          <Input
            className="h-10"
            value={li.linkedinApiVersion}
            onChange={(e) => setLi({ ...li, linkedinApiVersion: e.target.value })}
          />
        </div>
        <div>
          <Button
            className="h-10 text-xs font-semibold"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                linkedinClientSecret: li.linkedinClientSecret,
                linkedinAccessToken: li.linkedinAccessToken,
                linkedinApiVersion: li.linkedinApiVersion || "202405",
              })
            }
          >
            Save
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PortalTab() {
  const { data: s } = useLeadCaptureSettings();
  const add = useAddPortal();
  const updatePortal = useUpdatePortal();
  const remove = useRemovePortal();
  const regenerate = useRegenerateCaptureKey();
  const [name, setName] = React.useState("");
  if (!s) return null;

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Education portal partners"
        description="Each portal (e.g. Shiksha, CollegeDunia) gets its own key. Partners POST leads as JSON to their endpoint, or send the key in an X-API-Key header. Portal exports can also be uploaded as CSV."
        actions={
          <Link href="/organization/lead-manager/import?channel=Portal">
            <Button variant="outline" className="h-9 text-xs font-semibold">
              <Upload className="size-4" /> Upload CSV
            </Button>
          </Link>
        }
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            className="h-10"
            placeholder="Portal name, e.g. Shiksha"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            className="h-10 text-xs font-semibold"
            disabled={!name.trim() || add.isPending}
            onClick={() => add.mutate({ name: name.trim() }, { onSuccess: () => setName("") })}
          >
            <Plus className="size-4" /> Add portal
          </Button>
        </div>
      </SectionCard>

      {s.portals.length === 0 ? (
        <div className={tableShell}>
          <EmptyState title="No portals yet" description="Add a portal to get its endpoint URL." />
        </div>
      ) : (
        s.portals.map((p) => (
          <SectionCard
            key={p.id}
            title={
              <span className="flex items-center gap-2">
                {p.name}
                <span className={p.isActive ? pillStyles.green : pillStyles.gray}>{p.isActive ? "Active" : "Paused"}</span>
              </span>
            }
            description={`${p.leadsReceived || 0} leads received · last ${formatDateTime(p.lastReceivedAt)}`}
            actions={
              <>
                <Switch
                  checked={p.isActive}
                  onCheckedChange={(v) => updatePortal.mutate({ id: p.id, isActive: v })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Regenerate key"
                  onClick={() => regenerate.mutate({ which: "portal", portalId: p.id })}
                >
                  <RefreshCw className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => remove.mutate(p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </>
            }
          >
            <CopyField label="Partner endpoint (POST, JSON)" value={apiUrl(p.endpointPath)} />
          </SectionCard>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type EventDraft = CaptureEventInput & { id?: string };

function EventTab() {
  const { data: events = [], isLoading } = useCaptureEvents();
  const save = useSaveCaptureEvent();
  const del = useDeleteCaptureEvent();
  const { data: coursesData } = useCourses(1, 200);
  const courses: any[] = (coursesData as any)?.data || [];
  const { data: campaignsData } = useCampaigns(1, 100);
  const campaigns = campaignsData?.data || [];
  const [draft, setDraft] = React.useState<EventDraft | null>(null);
  const [qr, setQr] = React.useState<CaptureEvent | null>(null);

  const pageUrl = (e: CaptureEvent) => apiUrl(`/public/lead-capture/events/${e.slug}/page`);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Events"
        description="Walk-ins register through the event's QR code; attendee lists can be bulk-uploaded as CSV."
        actions={
          <Button
            className="h-10 rounded-[8px] text-xs font-semibold"
            onClick={() => setDraft({ name: "", eventType: "Education Fair", isActive: true })}
          >
            <Plus className="size-4" /> Add event
          </Button>
        }
      />
      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th className="px-5">Event</Th>
              <Th>Type</Th>
              <Th>Date</Th>
              <Th className="text-right">QR registrations</Th>
              <Th className="text-right">Imported</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="No events" description="Create an event to get its QR registration link." />
                </TableCell>
              </TableRow>
            ) : (
              events.map((e) => (
                <TableRow key={e.id} className="border-b border-border/80 hover:bg-muted/15">
                  <TableCell className="py-4 px-5">
                    <div className="text-sm font-semibold">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.venue || ""}</div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-sm whitespace-nowrap">{e.eventType}</TableCell>
                  <TableCell className="py-4 px-4 text-sm whitespace-nowrap">{formatDate(e.eventDate)}</TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm">{e.registrationCount}</TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm">{e.importedCount}</TableCell>
                  <TableCell className="py-4 px-4">
                    <span className={e.isActive ? pillStyles.green : pillStyles.gray}>{e.isActive ? "Open" : "Closed"}</span>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="size-8" title="QR code" onClick={() => setQr(e)}>
                      <QrCode className="size-4" />
                    </Button>
                    <Link href={`/organization/lead-manager/import?channel=Event&eventId=${e.id}`}>
                      <Button variant="ghost" size="icon" className="size-8" title="Upload attendee CSV">
                        <Upload className="size-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        setDraft({
                          id: e.id,
                          name: e.name,
                          eventType: e.eventType,
                          eventDate: e.eventDate,
                          venue: e.venue,
                          description: e.description,
                          courseId: e.courseId,
                          campaignId: e.campaignId,
                          isActive: e.isActive,
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-rose-600" onClick={() => del.mutate(e.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{qr?.name} — QR registration</DialogTitle>
          </DialogHeader>
          {qr && (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Registration QR code"
                className="size-[240px] rounded-[8px] border border-border"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pageUrl(qr))}`}
              />
              <div className="w-full">
                <CopyField label="Registration link" value={pageUrl(qr)} />
              </div>
              <a href={pageUrl(qr)} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                Open registration page
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit event" : "Add event"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel>Event name</FieldLabel>
                <Input className="h-10" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Type</FieldLabel>
                  <Select value={draft.eventType} onValueChange={(v) => setDraft({ ...draft, eventType: v })}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPTURE_EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Date</FieldLabel>
                  <Input
                    type="date"
                    className="h-10"
                    value={draft.eventDate || ""}
                    onChange={(e) => setDraft({ ...draft, eventDate: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Venue</FieldLabel>
                <Input
                  className="h-10"
                  value={draft.venue || ""}
                  onChange={(e) => setDraft({ ...draft, venue: e.target.value || null })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <FieldLabel>Default program</FieldLabel>
                  <Select
                    value={draft.courseId || "none"}
                    onValueChange={(v) => setDraft({ ...draft, courseId: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {courses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel>Campaign</FieldLabel>
                  <Select
                    value={draft.campaignId || "none"}
                    onValueChange={(v) => setDraft({ ...draft, campaignId: v === "none" ? null : v })}
                  >
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
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={draft.description || ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.isActive !== false} onCheckedChange={(v) => setDraft({ ...draft, isActive: v })} />
                <span className="text-sm">Registration open</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!draft.name.trim() || save.isPending}
                  onClick={() => {
                    const { id, ...data } = draft;
                    save.mutate({ id, data }, { onSuccess: () => setDraft(null) });
                  }}
                >
                  {save.isPending ? "Saving..." : "Save event"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ChatbotTab() {
  const { data: s } = useLeadCaptureSettings();
  const update = useUpdateLeadCaptureSettings();
  const { data: conversations = [], isLoading } = useChatbotConversations();
  const [minMessages, setMinMessages] = React.useState("2");
  React.useEffect(() => {
    if (s) setMinMessages(String(s.chatbotMinMessages));
  }, [s]);
  if (!s) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          title="Chatbot webhook"
          description="Your chatbot posts each conversation here; qualified conversations become leads (Channel Source = Chatbot)."
        >
          <CopyField label="Webhook URL (POST, JSON)" value={apiUrl(s.endpoints.chatbot)} />
          <Textarea
            readOnly
            className="font-mono text-[11px] min-h-[180px]"
            value={JSON.stringify(
              {
                conversationId: "abc-123",
                botName: "Admissions Bot",
                visitor: { name: "Asha Rao", email: "asha@example.com", phone: "+919800000000" },
                intent: "MBA admission",
                program: "MBA",
                messages: [
                  { from: "visitor", text: "Hi, I want to know about MBA" },
                  { from: "bot", text: "Sure! Can I have your email?" },
                ],
                qualified: true,
              },
              null,
              2,
            )}
          />
        </SectionCard>
        <SectionCard title="Qualification" description="Used when the chatbot does not send qualified: true/false itself.">
          <div className="flex flex-col gap-2">
            <FieldLabel>Minimum visitor messages</FieldLabel>
            <Input className="h-10" type="number" min={1} value={minMessages} onChange={(e) => setMinMessages(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={s.chatbotRequireContact}
              onCheckedChange={(v) => update.mutate({ chatbotRequireContact: v })}
            />
            Require an email or phone number
          </label>
          <div>
            <Button
              className="h-10 text-xs font-semibold"
              disabled={update.isPending || !(Number(minMessages) >= 1)}
              onClick={() => update.mutate({ chatbotMinMessages: Math.trunc(Number(minMessages)) })}
            >
              Save
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className={tableShell}>
        <Table>
          <TableHeader className={tableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <Th className="px-5">Visitor</Th>
              <Th>Intent</Th>
              <Th className="text-right">Messages</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th className="text-right">Lead</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="size-5 animate-spin inline-block text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : conversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="No conversations received yet" />
                </TableCell>
              </TableRow>
            ) : (
              conversations.map((c) => (
                <TableRow key={c.id} className="border-b border-border/80 hover:bg-muted/15">
                  <TableCell className="py-4 px-5">
                    <div className="text-sm font-semibold">{c.visitorName || "Anonymous"}</div>
                    <div className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-sm">{c.intent || "—"}</TableCell>
                  <TableCell className="py-4 px-4 text-right text-sm">{c.visitorMessageCount}</TableCell>
                  <TableCell className="py-4 px-4">
                    <span className={c.status === "qualified" ? pillStyles.green : pillStyles.gray} title={c.qualificationReason || ""}>
                      {c.status === "qualified" ? "Qualified" : "Not qualified"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-xs whitespace-nowrap">{formatDateTime(c.updatedAt)}</TableCell>
                  <TableCell className="py-4 px-4 text-right">
                    {c.leadId ? (
                      <Link className="text-sm text-primary underline" href={`/organization/lead-manager/edit?id=${c.leadId}`}>
                        View lead
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
