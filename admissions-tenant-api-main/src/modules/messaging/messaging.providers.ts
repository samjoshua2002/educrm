import { createHmac } from 'crypto';
import { MessagingSettings } from './entities/messaging-settings.entity.js';

/**
 * Real HTTP integrations for SMS / WhatsApp providers (global fetch).
 *  - Twilio Programmable Messaging (SMS + WhatsApp):
 *      POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
 *  - Gupshup WhatsApp:  POST https://api.gupshup.io/wa/api/v1/msg
 *  - MSG91 SMS (Flow API v5): POST https://control.msg91.com/api/v5/flow/
 */

export interface ProviderSendInput {
  channel: 'SMS' | 'WhatsApp';
  /** E.164 with leading + */
  toE164: string;
  body: string;
  mediaUrl?: string | null;
  statusCallbackUrl?: string | null;
}

export interface ProviderSendResult {
  ok: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
}

function formBody(params: Record<string, string | undefined | null>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, v);
  });
  return usp.toString();
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function sendViaTwilio(s: MessagingSettings, input: ProviderSendInput): Promise<ProviderSendResult> {
  const provider = 'twilio';
  if (!s.twilioAccountSid || !s.twilioAuthToken) {
    return { ok: false, provider, error: 'Twilio Account SID / Auth Token not configured' };
  }
  const isWa = input.channel === 'WhatsApp';
  const from = isWa ? s.twilioWhatsappFrom : s.twilioSmsFrom;
  if (isWa && !from) return { ok: false, provider, error: 'Twilio WhatsApp sender number not configured' };
  if (!isWa && !from && !s.twilioMessagingServiceSid) {
    return { ok: false, provider, error: 'Twilio SMS sender number / Messaging Service SID not configured' };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(s.twilioAccountSid)}/Messages.json`;
  const params: Record<string, string | undefined | null> = {
    To: isWa ? `whatsapp:${input.toE164}` : input.toE164,
    Body: input.body,
    StatusCallback: input.statusCallbackUrl || undefined,
  };
  if (isWa) params.From = `whatsapp:${from!.replace(/^whatsapp:/, '')}`;
  else if (s.twilioMessagingServiceSid) params.MessagingServiceSid = s.twilioMessagingServiceSid;
  else params.From = from!;
  if (isWa && input.mediaUrl) params.MediaUrl = input.mediaUrl;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${s.twilioAccountSid}:${s.twilioAuthToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody(params),
    });
    const json = await readJson(res);
    if (!res.ok) {
      return { ok: false, provider, error: `Twilio ${res.status}: ${json?.message || json?.raw || 'request failed'}` };
    }
    return { ok: true, provider, providerMessageId: json?.sid };
  } catch (err: any) {
    return { ok: false, provider, error: `Twilio request error: ${err?.message || err}` };
  }
}

export async function sendViaGupshup(s: MessagingSettings, input: ProviderSendInput): Promise<ProviderSendResult> {
  const provider = 'gupshup';
  if (!s.gupshupApiKey || !s.gupshupSourceNumber || !s.gupshupAppName) {
    return { ok: false, provider, error: 'Gupshup API key / source number / app name not configured' };
  }
  let message: Record<string, any>;
  if (input.mediaUrl) {
    const isPdf = /\.pdf(\?|$)/i.test(input.mediaUrl);
    message = isPdf
      ? { type: 'file', url: input.mediaUrl, filename: input.mediaUrl.split('/').pop()?.split('?')[0] || 'document.pdf', caption: input.body }
      : { type: 'image', originalUrl: input.mediaUrl, previewUrl: input.mediaUrl, caption: input.body };
  } else {
    message = { type: 'text', text: input.body };
  }
  try {
    const res = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: {
        apikey: s.gupshupApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: formBody({
        channel: 'whatsapp',
        source: s.gupshupSourceNumber.replace(/^\+/, ''),
        destination: input.toE164.replace(/^\+/, ''),
        message: JSON.stringify(message),
        'src.name': s.gupshupAppName,
      }),
    });
    const json = await readJson(res);
    if (!res.ok || (json?.status && json.status !== 'submitted')) {
      return { ok: false, provider, error: `Gupshup ${res.status}: ${json?.message || json?.raw || json?.status || 'request failed'}` };
    }
    return { ok: true, provider, providerMessageId: json?.messageId };
  } catch (err: any) {
    return { ok: false, provider, error: `Gupshup request error: ${err?.message || err}` };
  }
}

export async function sendViaMsg91(s: MessagingSettings, input: ProviderSendInput): Promise<ProviderSendResult> {
  const provider = 'msg91';
  if (!s.msg91AuthKey || !s.msg91FlowId) {
    return { ok: false, provider, error: 'MSG91 auth key / Flow template id not configured' };
  }
  try {
    const payload: Record<string, any> = {
      template_id: s.msg91FlowId,
      short_url: '0',
      recipients: [{ mobiles: input.toE164.replace(/^\+/, ''), message: input.body }],
    };
    if (s.msg91SenderId) payload.sender = s.msg91SenderId;
    if (s.msg91DltEntityId) payload.DLT_TE_ID = s.msg91DltEntityId;
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { authkey: s.msg91AuthKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await readJson(res);
    if (!res.ok || json?.type === 'error') {
      return { ok: false, provider, error: `MSG91 ${res.status}: ${json?.message || json?.raw || 'request failed'}` };
    }
    return { ok: true, provider, providerMessageId: json?.message || json?.request_id };
  } catch (err: any) {
    return { ok: false, provider, error: `MSG91 request error: ${err?.message || err}` };
  }
}

/** Validates Twilio's X-Twilio-Signature header (HMAC-SHA1 of URL + sorted POST params). */
export function validateTwilioSignature(
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, any>,
): boolean {
  if (!signature) return false;
  const data =
    url +
    Object.keys(params || {})
      .sort()
      .map((k) => k + (params[k] ?? ''))
      .join('');
  const expected = createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  return expected === signature;
}

/** Public base URL of this API (used for status callbacks, tracking pixels, unsubscribe links). */
export function publicApiBase(): string {
  const configured = process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return `http://localhost:${process.env.PORT || 3000}/api`;
}
