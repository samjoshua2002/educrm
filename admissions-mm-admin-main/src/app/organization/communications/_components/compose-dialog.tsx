"use client";

import * as React from "react";
import { Loader2, Mail, MessageCircle, MessageSquare, Paperclip, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useComposeCommunication } from "@/hooks/use-communications";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useMessagingSettings } from "@/hooks/use-messaging";
import { browserTimeZone } from "@/lib/scheduled-communications";
import { cn } from "@/lib/utils";
import {
  MESSAGE_PRIORITIES,
  MESSAGE_TRIGGER_EVENTS,
  MESSAGE_TYPES,
  TEMPLATE_MERGE_FIELDS,
  TIME_ZONES,
} from "@/types/communications";
import { Field, pill } from "./comm-ui";
import { RecipientPicker, type PickedRecipient } from "./recipient-picker";

type Channel = "Email" | "SMS" | "WhatsApp";

const CHANNELS: { value: Channel; label: string; icon: React.ElementType }[] = [
  { value: "Email", label: "Email", icon: Mail },
  { value: "SMS", label: "SMS", icon: MessageSquare },
  { value: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
];

/**
 * Compose Email / SMS / WhatsApp to one or many applicants / leads (now or
 * scheduled). SMS / WhatsApp go through the organization's provider and
 * respect opt-in consent; emails honour the suppression list.
 */
export function ComposeDialog({
  open,
  onOpenChange,
  initialChannel = "Email",
  initialRecipients = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialChannel?: Channel;
  initialRecipients?: PickedRecipient[];
}) {
  const compose = useComposeCommunication();
  const { data: settings } = useMessagingSettings();
  const [channel, setChannel] = React.useState<Channel>(initialChannel);
  const [recipients, setRecipients] = React.useState<PickedRecipient[]>(initialRecipients);
  const [templateId, setTemplateId] = React.useState<string>("none");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [footer, setFooter] = React.useState("");
  const [attachments, setAttachments] = React.useState<{ name: string; url: string }[]>([]);
  const [messageType, setMessageType] = React.useState("Status");
  const [priority, setPriority] = React.useState("Normal");
  const [triggerEvent, setTriggerEvent] = React.useState("none");
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [ctaLink, setCtaLink] = React.useState("");
  const [later, setLater] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [timeZone, setTimeZone] = React.useState(browserTimeZone());

  React.useEffect(() => {
    if (open) {
      setChannel(initialChannel);
      setRecipients(initialRecipients);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: templates = [] } = useEmailTemplates(undefined, undefined, "approved", { type: channel });

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject || "");
    setBody([t.header, t.body, t.signature].filter(Boolean).join("\n\n"));
    setFooter(t.footer || "");
  };

  const insert = (tag: string) => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}${tag}`);

  const isMsg = channel !== "Email";
  const chars = body.length;
  const segments = channel === "SMS" ? Math.max(1, Math.ceil(chars / (/[^\x00-\x7F]/.test(body) ? 70 : 160))) : 1;
  const channelReady = channel === "SMS" ? settings?.smsReady : channel === "WhatsApp" ? settings?.whatsappReady : true;

  const canSend =
    recipients.length > 0 && body.trim().length > 0 && (channel !== "Email" || subject.trim().length > 0) && (!later || !!scheduledAt);

  const submit = () => {
    compose.mutate(
      {
        channel,
        recipients: recipients.map((r) => ({
          applicationId: r.applicationId,
          leadId: r.leadId,
          email: r.kind === "Manual" ? r.email || undefined : undefined,
          phone: r.kind === "Manual" ? r.phone || undefined : undefined,
          name: r.kind === "Manual" ? undefined : r.name,
        })),
        templateId: templateId !== "none" ? templateId : undefined,
        subject: channel === "Email" ? subject : undefined,
        body,
        footer: channel === "Email" && footer ? footer : undefined,
        attachments: channel === "Email" && attachments.length ? attachments.filter((a) => a.url) : undefined,
        messageType: isMsg ? messageType : undefined,
        priority: isMsg ? priority : undefined,
        triggerEvent: isMsg && triggerEvent !== "none" ? triggerEvent : undefined,
        mediaUrl: channel === "WhatsApp" && mediaUrl ? mediaUrl : undefined,
        ctaLink: isMsg && ctaLink ? ctaLink : undefined,
        scheduledAt: later ? scheduledAt : undefined,
        timeZone: later ? timeZone : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSubject("");
          setBody("");
          setFooter("");
          setAttachments([]);
          setTemplateId("none");
          setLater(false);
          setScheduledAt("");
          setRecipients([]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose message</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setChannel(c.value);
                    setTemplateId("none");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 h-10 rounded-[8px] border text-sm font-medium cursor-pointer transition-colors",
                    channel === c.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" /> {c.label}
                </button>
              );
            })}
          </div>

          {isMsg && settings && !channelReady && (
            <p className={cn(pill.amber, "rounded-md px-3 py-2 text-xs")}>
              {channel} provider is not configured — messages will be logged as failed. Configure it in Settings → SMS & WhatsApp.
            </p>
          )}

          <Field label={`Recipients (${recipients.length})`} required hint="Bulk send: add as many applicants / leads as needed.">
            <RecipientPicker value={recipients} onChange={setRecipients} mode={channel === "Email" ? "email" : "phone"} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Template (approved)">
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="No template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · v{t.versionNumber || 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {channel === "Email" ? (
              <Field label="Subject" required>
                <Input className="h-10" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
            ) : (
              <Field label="Message type">
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <Field
            label="Message body"
            required
            hint={
              isMsg ? (
                <span>
                  {chars} characters{channel === "SMS" ? ` · ${segments} SMS segment(s)` : ""}
                </span>
              ) : undefined
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {[...TEMPLATE_MERGE_FIELDS, "{{First_Name}}"].map((t) => (
                <button key={t} type="button" onClick={() => insert(t)} className={cn(pill.gray, "cursor-pointer hover:bg-muted/70")}>
                  {t}
                </button>
              ))}
            </div>
            <Textarea rows={channel === "Email" ? 8 : 5} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>

          {channel === "Email" && (
            <>
              <Field label="Footer">
                <Textarea rows={2} value={footer} onChange={(e) => setFooter(e.target.value)} />
              </Field>
              <Field label="Attachments (links)">
                <div className="flex flex-col gap-2">
                  {attachments.map((a, i) => (
                    <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                      <Input className="h-9" placeholder="Name" value={a.name} onChange={(e) => setAttachments((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Input className="h-9" placeholder="https://…" value={a.url} onChange={(e) => setAttachments((l) => l.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setAttachments((l) => l.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="self-start gap-1.5" onClick={() => setAttachments((l) => [...l, { name: "", url: "" }])}>
                    <Paperclip className="size-3.5" /> Add attachment
                  </Button>
                </div>
              </Field>
            </>
          )}

          {isMsg && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Priority">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_PRIORITIES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trigger event">
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (manual)</SelectItem>
                    {MESSAGE_TRIGGER_EVENTS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="CTA link">
                <Input className="h-10" placeholder="Application / payment / interview link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
              </Field>
              {channel === "WhatsApp" && (
                <Field label="Media attachment (PDF / image URL)" className="sm:col-span-3">
                  <Input className="h-10" placeholder="https://…/brochure.pdf" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                </Field>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-[8px] border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Schedule for later</p>
                <p className="text-xs text-muted-foreground">Sent by the server at the chosen time in the chosen time zone.</p>
              </div>
              <Switch checked={later} onCheckedChange={setLater} />
            </div>
            {later && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Date & time" required>
                  <Input type="datetime-local" className="h-10" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                </Field>
                <Field label="Time zone">
                  <Select value={timeZone} onValueChange={setTimeZone}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([timeZone, ...TIME_ZONES])).map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSend || compose.isPending} className="gap-1.5">
            {compose.isPending ? <Loader2 className="size-4 animate-spin" /> : later ? <Plus className="size-4" /> : <Send className="size-4" />}
            {later ? "Schedule" : `Send${recipients.length > 1 ? ` to ${recipients.length}` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
