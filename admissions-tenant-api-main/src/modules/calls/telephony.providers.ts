import { TelephonySettings } from './entities/telephony-settings.entity.js';

/**
 * Real HTTP integrations for click-to-call (global fetch).
 *  - Exotel "Connect two numbers":
 *      POST https://{subdomain}/v1/Accounts/{AccountSid}/Calls/connect.json  (Basic auth api_key:api_token)
 *      Leg 1 calls the agent (From); when answered Exotel bridges to the customer (To).
 *  - Twilio Programmable Voice:
 *      POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json
 *      Leg 1 calls the agent; inline TwiML <Dial>s the customer with recording.
 */

export interface ClickToCallInput {
  agentE164: string;
  customerE164: string;
  record: boolean;
  statusCallbackUrl: string;
  recordingCallbackUrl?: string;
}

export interface ClickToCallResult {
  ok: boolean;
  provider: string;
  providerCallId?: string;
  providerStatus?: string;
  error?: string;
}

function formBody(params: [string, string | undefined | null][]): string {
  const usp = new URLSearchParams();
  params.forEach(([k, v]) => {
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

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function exotelClickToCall(s: TelephonySettings, input: ClickToCallInput): Promise<ClickToCallResult> {
  const provider = 'exotel';
  if (!s.exotelAccountSid || !s.exotelApiKey || !s.exotelApiToken) {
    return { ok: false, provider, error: 'Exotel Account SID / API key / API token not configured' };
  }
  if (!s.exotelCallerId) return { ok: false, provider, error: 'Exotel caller id (ExoPhone) not configured' };
  const host = (s.exotelSubdomain || 'api.exotel.com').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = `https://${host}/v1/Accounts/${encodeURIComponent(s.exotelAccountSid)}/Calls/connect.json`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basic(s.exotelApiKey, s.exotelApiToken),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formBody([
        ['From', input.agentE164],
        ['To', input.customerE164],
        ['CallerId', s.exotelCallerId],
        ['CallType', 'trans'],
        ['Record', input.record ? 'true' : 'false'],
        ['StatusCallback', input.statusCallbackUrl],
        ['StatusCallbackEvents[0]', 'terminal'],
        ['StatusCallbackContentType', 'application/json'],
      ]),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await readJson(res);
    if (!res.ok) {
      const msg = data?.RestException?.Message || data?.raw || `HTTP ${res.status}`;
      return { ok: false, provider, error: `Exotel: ${msg}` };
    }
    const call = data?.Call || {};
    return { ok: true, provider, providerCallId: call.Sid, providerStatus: call.Status || 'queued' };
  } catch (err: any) {
    return { ok: false, provider, error: `Exotel request error: ${err?.message || err}` };
  }
}

export async function twilioClickToCall(s: TelephonySettings, input: ClickToCallInput): Promise<ClickToCallResult> {
  const provider = 'twilio';
  if (!s.twilioAccountSid || !s.twilioAuthToken) {
    return { ok: false, provider, error: 'Twilio Account SID / Auth Token not configured' };
  }
  if (!s.twilioCallerId) return { ok: false, provider, error: 'Twilio caller id (voice number) not configured' };
  const recordAttrs = input.record
    ? ` record="record-from-answer-dual"${input.recordingCallbackUrl ? ` recordingStatusCallback="${xmlEscape(input.recordingCallbackUrl)}"` : ''}`
    : '';
  const twiml = `<Response><Say>Connecting your call.</Say><Dial callerId="${xmlEscape(s.twilioCallerId)}"${recordAttrs}><Number>${xmlEscape(input.customerE164)}</Number></Dial></Response>`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(s.twilioAccountSid)}/Calls.json`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: basic(s.twilioAccountSid, s.twilioAuthToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody([
        ['To', input.agentE164],
        ['From', s.twilioCallerId],
        ['Twiml', twiml],
        ['StatusCallback', input.statusCallbackUrl],
        ['StatusCallbackMethod', 'POST'],
        ['StatusCallbackEvent', 'initiated'],
        ['StatusCallbackEvent', 'answered'],
        ['StatusCallbackEvent', 'completed'],
      ]),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, provider, error: `Twilio: ${data?.message || data?.raw || `HTTP ${res.status}`}` };
    return { ok: true, provider, providerCallId: data?.sid, providerStatus: data?.status || 'queued' };
  } catch (err: any) {
    return { ok: false, provider, error: `Twilio request error: ${err?.message || err}` };
  }
}

/** Checks the credentials by reading the account resource. */
export async function testTelephonyCredentials(s: TelephonySettings): Promise<{ ok: boolean; message: string }> {
  try {
    if (s.provider === 'exotel') {
      if (!s.exotelAccountSid || !s.exotelApiKey || !s.exotelApiToken) return { ok: false, message: 'Exotel credentials are incomplete' };
      const host = (s.exotelSubdomain || 'api.exotel.com').replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const res = await fetch(`https://${host}/v1/Accounts/${encodeURIComponent(s.exotelAccountSid)}.json`, {
        headers: { Authorization: basic(s.exotelApiKey, s.exotelApiToken), Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok ? { ok: true, message: 'Exotel credentials are valid' } : { ok: false, message: `Exotel rejected the credentials (HTTP ${res.status})` };
    }
    if (s.provider === 'twilio') {
      if (!s.twilioAccountSid || !s.twilioAuthToken) return { ok: false, message: 'Twilio credentials are incomplete' };
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(s.twilioAccountSid)}.json`, {
        headers: { Authorization: basic(s.twilioAccountSid, s.twilioAuthToken) },
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok ? { ok: true, message: 'Twilio credentials are valid' } : { ok: false, message: `Twilio rejected the credentials (HTTP ${res.status})` };
    }
    return { ok: false, message: 'Select a telephony provider first' };
  } catch (err: any) {
    return { ok: false, message: `Could not reach the provider: ${err?.message || err}` };
  }
}

/** Maps provider call statuses to scope Call Status values. */
export function mapProviderStatus(raw: string | null | undefined, durationSeconds = 0): string {
  const s = String(raw || '').toLowerCase().replace(/_/g, '-');
  if (['completed', 'answered'].includes(s)) return durationSeconds > 0 || s === 'answered' ? 'Answered' : 'Not Answered';
  if (s === 'busy') return 'Busy';
  if (['no-answer', 'noanswer', 'not-answered', 'missed'].includes(s)) return 'Not Answered';
  if (['failed', 'canceled', 'cancelled', 'dropped'].includes(s)) return 'Dropped';
  return 'In Progress';
}

export function isTerminalStatus(status: string) {
  return status !== 'In Progress';
}
