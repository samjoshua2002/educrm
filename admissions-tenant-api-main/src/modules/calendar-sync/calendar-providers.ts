// Real HTTP clients for Google Calendar API v3 and Microsoft Graph v1.0
// (Outlook calendar), using global fetch. Every method throws a
// CalendarProviderError with the provider's message on failure; callers in
// CalendarSyncService catch it and record Sync_Status = Failed.

export class CalendarProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface OAuthAppCredentials {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

export interface CalendarEventInput {
  title: string;
  description: string;
  start: Date;
  end: Date;
  timeZone: string;
  location?: string | null;
  attendees: Array<{ email: string; name?: string | null }>;
  // Ask the provider to create a Google Meet / Teams link.
  createMeeting: boolean;
  // Unique per interview, used as the Meet create-request id.
  requestId: string;
}

export interface CalendarEventResult {
  eventId: string;
  meetingLink: string | null;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface CalendarProviderClient {
  readonly providerName: 'Google Calendar' | 'Outlook';
  buildAuthorizeUrl(app: OAuthAppCredentials, redirectUri: string, state: string): string;
  exchangeCode(app: OAuthAppCredentials, redirectUri: string, code: string): Promise<TokenSet>;
  refresh(app: OAuthAppCredentials, refreshToken: string): Promise<TokenSet>;
  getAccountEmail(accessToken: string): Promise<string | null>;
  createEvent(accessToken: string, event: CalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(accessToken: string, eventId: string, event: CalendarEventInput): Promise<CalendarEventResult>;
  deleteEvent(accessToken: string, eventId: string): Promise<void>;
  getBusy(accessToken: string, email: string | null, from: Date, to: Date): Promise<BusyInterval[]>;
  revoke(token: string): Promise<void>;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    return (
      json?.error_description ||
      json?.error?.message ||
      (typeof json?.error === 'string' ? json.error : null) ||
      text ||
      res.statusText
    );
  } catch {
    return text || res.statusText;
  }
}

async function requestJson<T = any>(url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new CalendarProviderError(`Network error: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new CalendarProviderError(await readError(res), res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function form(body: Record<string, string>): string {
  return new URLSearchParams(body).toString();
}

function toTokenSet(json: any, previousRefreshToken?: string | null): TokenSet {
  if (!json?.access_token) throw new CalendarProviderError('Provider did not return an access token.');
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? previousRefreshToken ?? null,
    expiresAt: new Date(Date.now() + (Number(json.expires_in) || 3600) * 1000),
  };
}

// ---------------------------------------------------------------------------
// Google Calendar (OAuth 2.0 + Calendar API v3)
// ---------------------------------------------------------------------------
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

export class GoogleCalendarClient implements CalendarProviderClient {
  readonly providerName = 'Google Calendar' as const;

  buildAuthorizeUrl(app: OAuthAppCredentials, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: app.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_SCOPES.join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(app: OAuthAppCredentials, redirectUri: string, code: string): Promise<TokenSet> {
    const json = await requestJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        code,
        client_id: app.clientId,
        client_secret: app.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    return toTokenSet(json);
  }

  async refresh(app: OAuthAppCredentials, refreshToken: string): Promise<TokenSet> {
    const json = await requestJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    return toTokenSet(json, refreshToken);
  }

  async getAccountEmail(accessToken: string): Promise<string | null> {
    const json = await requestJson<any>('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return json?.email ?? null;
  }

  private eventBody(event: CalendarEventInput, withConference: boolean) {
    const body: any = {
      summary: event.title,
      description: event.description,
      location: event.location || undefined,
      start: { dateTime: event.start.toISOString(), timeZone: event.timeZone },
      end: { dateTime: event.end.toISOString(), timeZone: event.timeZone },
      attendees: event.attendees.map((a) => ({ email: a.email, displayName: a.name || undefined })),
      reminders: { useDefault: true },
    };
    if (withConference) {
      body.conferenceData = {
        createRequest: { requestId: event.requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      };
    }
    return body;
  }

  private toResult(json: any): CalendarEventResult {
    const video = (json?.conferenceData?.entryPoints ?? []).find((e: any) => e.entryPointType === 'video');
    return { eventId: json.id, meetingLink: json.hangoutLink ?? video?.uri ?? null };
  }

  async createEvent(accessToken: string, event: CalendarEventInput): Promise<CalendarEventResult> {
    const json = await requestJson(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.eventBody(event, event.createMeeting)),
      },
    );
    return this.toResult(json);
  }

  async updateEvent(accessToken: string, eventId: string, event: CalendarEventInput): Promise<CalendarEventResult> {
    const json = await requestJson(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.eventBody(event, event.createMeeting)),
      },
    );
    return this.toResult(json);
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    try {
      await requestJson(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
      );
    } catch (err) {
      // Already deleted in the calendar = nothing left to do.
      if (err instanceof CalendarProviderError && (err.status === 404 || err.status === 410)) return;
      throw err;
    }
  }

  async getBusy(accessToken: string, _email: string | null, from: Date, to: Date): Promise<BusyInterval[]> {
    const json = await requestJson<any>('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: 'primary' }] }),
    });
    const busy = json?.calendars?.primary?.busy ?? [];
    return busy.map((b: any) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }

  async revoke(token: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Microsoft Outlook (Microsoft identity platform v2.0 + Graph v1.0)
// ---------------------------------------------------------------------------
const MICROSOFT_SCOPES = ['openid', 'email', 'offline_access', 'User.Read', 'Calendars.ReadWrite'];

export class OutlookCalendarClient implements CalendarProviderClient {
  readonly providerName = 'Outlook' as const;

  private authority(app: OAuthAppCredentials) {
    return `https://login.microsoftonline.com/${encodeURIComponent(app.tenantId || 'common')}/oauth2/v2.0`;
  }

  buildAuthorizeUrl(app: OAuthAppCredentials, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: app.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: MICROSOFT_SCOPES.join(' '),
      prompt: 'select_account',
      state,
    });
    return `${this.authority(app)}/authorize?${params.toString()}`;
  }

  async exchangeCode(app: OAuthAppCredentials, redirectUri: string, code: string): Promise<TokenSet> {
    const json = await requestJson(`${this.authority(app)}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: MICROSOFT_SCOPES.join(' '),
      }),
    });
    return toTokenSet(json);
  }

  async refresh(app: OAuthAppCredentials, refreshToken: string): Promise<TokenSet> {
    const json = await requestJson(`${this.authority(app)}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        client_id: app.clientId,
        client_secret: app.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: MICROSOFT_SCOPES.join(' '),
      }),
    });
    return toTokenSet(json, refreshToken);
  }

  async getAccountEmail(accessToken: string): Promise<string | null> {
    const json = await requestJson<any>('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return json?.mail ?? json?.userPrincipalName ?? null;
  }

  private eventBody(event: CalendarEventInput) {
    // Graph takes local date-times plus a time zone name; sending UTC keeps
    // it unambiguous, Outlook shows it in each attendee's own zone.
    const body: any = {
      subject: event.title,
      body: { contentType: 'Text', content: event.description },
      start: { dateTime: event.start.toISOString().replace('Z', ''), timeZone: 'UTC' },
      end: { dateTime: event.end.toISOString().replace('Z', ''), timeZone: 'UTC' },
      attendees: event.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name || a.email },
        type: 'required',
      })),
    };
    if (event.location) body.location = { displayName: event.location };
    if (event.createMeeting) {
      body.isOnlineMeeting = true;
      body.onlineMeetingProvider = 'teamsForBusiness';
    }
    return body;
  }

  private toResult(json: any): CalendarEventResult {
    return { eventId: json.id, meetingLink: json?.onlineMeeting?.joinUrl ?? json?.onlineMeetingUrl ?? null };
  }

  async createEvent(accessToken: string, event: CalendarEventInput): Promise<CalendarEventResult> {
    const json = await requestJson('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(this.eventBody(event)),
    });
    return this.toResult(json);
  }

  async updateEvent(accessToken: string, eventId: string, event: CalendarEventInput): Promise<CalendarEventResult> {
    const json = await requestJson(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(this.eventBody(event)),
    });
    return this.toResult(json);
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    try {
      await requestJson(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      if (err instanceof CalendarProviderError && err.status === 404) return;
      throw err;
    }
  }

  async getBusy(accessToken: string, email: string | null, from: Date, to: Date): Promise<BusyInterval[]> {
    if (!email) throw new CalendarProviderError('Calendar email is unknown; reconnect the Outlook calendar.');
    const json = await requestJson<any>('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: [email],
        startTime: { dateTime: from.toISOString().replace('Z', ''), timeZone: 'UTC' },
        endTime: { dateTime: to.toISOString().replace('Z', ''), timeZone: 'UTC' },
        availabilityViewInterval: 30,
      }),
    });
    const items = json?.value?.[0]?.scheduleItems ?? [];
    return items
      .filter((i: any) => i.status !== 'free')
      .map((i: any) => ({
        start: new Date(`${String(i.start?.dateTime).replace(/Z$/, '')}Z`),
        end: new Date(`${String(i.end?.dateTime).replace(/Z$/, '')}Z`),
      }));
  }

  async revoke(): Promise<void> {
    // Microsoft has no token revocation endpoint for delegated tokens; the
    // stored tokens are simply deleted.
  }
}
