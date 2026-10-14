import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { CalendarIntegrationSettings } from './entities/calendar-integration-settings.entity.js';
import { InterviewCalendarSync } from './entities/interview-calendar-sync.entity.js';
import { InterviewCalendarEvent } from './entities/interview-calendar-event.entity.js';
import {
  CalendarProviderClient,
  CalendarProviderError,
  GoogleCalendarClient,
  OAuthAppCredentials,
  OutlookCalendarClient,
  CalendarEventInput,
  BusyInterval,
} from './calendar-providers.js';
import { UpdateCalendarSettingsDto, UpdateCalendarSyncDto } from './dto/calendar-sync.dto.js';
import { Interview } from '../interviews/entities/interview.entity.js';
import { InterviewSlot } from '../interviews/entities/interview-slot.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { User } from '../users/entities/user.entity.js';

export type CalendarProviderName = 'Google Calendar' | 'Outlook';

const ADMIN_ROLES = ['superadmin', 'org_admin', 'exam_manager'];

export interface InterviewSyncResult {
  status: 'Synced' | 'Failed' | 'Not Connected' | 'Deleted' | 'Skipped';
  meetingLink?: string | null;
  error?: string | null;
}

// --- time-zone helpers (no external date library) ---------------------------
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - date.getTime();
}

// "2026-10-15" + "09:30" in Asia/Kolkata -> the matching UTC instant.
function zonedToUtc(day: string, time: string, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

function formatInZone(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...opts }).format(date);
}

function dayInZone(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function isValidZone(tz?: string | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private readonly clients: Record<CalendarProviderName, CalendarProviderClient> = {
    'Google Calendar': new GoogleCalendarClient(),
    Outlook: new OutlookCalendarClient(),
  };
  private cronRunning = false;

  constructor(
    @InjectRepository(CalendarIntegrationSettings)
    private readonly settingsRepository: Repository<CalendarIntegrationSettings>,
    @InjectRepository(InterviewCalendarSync)
    private readonly syncRepository: Repository<InterviewCalendarSync>,
    @InjectRepository(InterviewCalendarEvent)
    private readonly eventRepository: Repository<InterviewCalendarEvent>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewSlot)
    private readonly slotRepository: Repository<InterviewSlot>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  // ==========================================================================
  // Settings (per-organisation OAuth app credentials)
  // ==========================================================================

  private async getSettingsWithSecrets(orgId: string): Promise<CalendarIntegrationSettings> {
    let settings = await this.settingsRepository
      .createQueryBuilder('s')
      .addSelect(['s.googleClientSecret', 's.microsoftClientSecret'])
      .where('s.organization_id = :orgId', { orgId })
      .getOne();
    if (!settings) {
      settings = await this.settingsRepository.save(this.settingsRepository.create({ organizationId: orgId }));
      settings.googleClientSecret = null;
      settings.microsoftClientSecret = null;
    }
    return settings;
  }

  defaultRedirectUri(): string {
    const base =
      this.configService.get<string>('API_PUBLIC_URL') ||
      this.configService.get<string>('BACKEND_URL') ||
      `http://localhost:${this.configService.get<string>('PORT') || 3000}`;
    return `${base.replace(/\/$/, '').replace(/\/api$/, '')}/api/calendar-sync/oauth/callback`;
  }

  private redirectUriFor(settings: CalendarIntegrationSettings) {
    return settings.redirectUri?.trim() || this.defaultRedirectUri();
  }

  async getSettings(orgId: string) {
    const s = await this.getSettingsWithSecrets(orgId);
    return {
      id: s.id,
      organizationId: s.organizationId,
      googleEnabled: s.googleEnabled,
      googleClientId: s.googleClientId,
      hasGoogleClientSecret: Boolean(s.googleClientSecret),
      microsoftEnabled: s.microsoftEnabled,
      microsoftClientId: s.microsoftClientId,
      hasMicrosoftClientSecret: Boolean(s.microsoftClientSecret),
      microsoftTenantId: s.microsoftTenantId,
      redirectUri: s.redirectUri,
      effectiveRedirectUri: this.redirectUriFor(s),
      autoMeetingLink: s.autoMeetingLink,
      inviteCandidate: s.inviteCandidate,
      availabilityDays: s.availabilityDays,
      workdayStart: s.workdayStart,
      workdayEnd: s.workdayEnd,
      timeZone: s.timeZone,
      updatedAt: s.updatedAt,
    };
  }

  async updateSettings(orgId: string, dto: UpdateCalendarSettingsDto, actorId: string) {
    const s = await this.getSettingsWithSecrets(orgId);
    const assign = <K extends keyof CalendarIntegrationSettings>(key: K, value: CalendarIntegrationSettings[K] | undefined) => {
      if (value !== undefined) s[key] = value;
    };
    assign('googleEnabled', dto.googleEnabled);
    assign('googleClientId', dto.googleClientId?.trim() || (dto.googleClientId === '' ? null : undefined));
    // Secrets: empty / omitted = keep the stored value.
    if (dto.googleClientSecret) s.googleClientSecret = dto.googleClientSecret.trim();
    assign('microsoftEnabled', dto.microsoftEnabled);
    assign('microsoftClientId', dto.microsoftClientId?.trim() || (dto.microsoftClientId === '' ? null : undefined));
    if (dto.microsoftClientSecret) s.microsoftClientSecret = dto.microsoftClientSecret.trim();
    assign('microsoftTenantId', dto.microsoftTenantId?.trim() || undefined);
    if (dto.redirectUri !== undefined) s.redirectUri = dto.redirectUri.trim() || null;
    assign('autoMeetingLink', dto.autoMeetingLink);
    assign('inviteCandidate', dto.inviteCandidate);
    assign('availabilityDays', dto.availabilityDays);
    assign('workdayStart', dto.workdayStart);
    assign('workdayEnd', dto.workdayEnd);
    if (dto.timeZone !== undefined) {
      if (!isValidZone(dto.timeZone)) throw new BadRequestException(`Unknown time zone "${dto.timeZone}".`);
      s.timeZone = dto.timeZone;
    }
    s.updatedBy = actorId;
    await this.settingsRepository.save(s);
    return this.getSettings(orgId);
  }

  private appCredentials(settings: CalendarIntegrationSettings, provider: CalendarProviderName): OAuthAppCredentials | null {
    if (provider === 'Google Calendar') {
      if (!settings.googleEnabled || !settings.googleClientId || !settings.googleClientSecret) return null;
      return { clientId: settings.googleClientId, clientSecret: settings.googleClientSecret };
    }
    if (!settings.microsoftEnabled || !settings.microsoftClientId || !settings.microsoftClientSecret) return null;
    return {
      clientId: settings.microsoftClientId,
      clientSecret: settings.microsoftClientSecret,
      tenantId: settings.microsoftTenantId || 'common',
    };
  }

  // ==========================================================================
  // Interviewer connections (Interview_Calendar_Sync)
  // ==========================================================================

  private toSyncResponse(row: InterviewCalendarSync) {
    return {
      id: row.id,
      calendarSyncNumber: row.calendarSyncNumber,
      organizationId: row.organizationId,
      interviewerId: row.interviewerId,
      interviewer: row.interviewer
        ? { id: row.interviewer.id, name: row.interviewer.name, email: row.interviewer.email }
        : undefined,
      calendarProvider: row.calendarProvider,
      calendarEmail: row.calendarEmail,
      calendarEventId: row.calendarEventId,
      syncStatus: row.syncStatus,
      lastSyncTime: row.lastSyncTime,
      availabilityWindow: row.availabilityWindow,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listConnections(orgId: string, user: { sub: string; role: string }, interviewerId?: string) {
    const isAdmin = ADMIN_ROLES.includes(user.role);
    const where: any = { organizationId: orgId };
    if (!isAdmin) where.interviewerId = user.sub;
    else if (interviewerId) where.interviewerId = interviewerId;
    const rows = await this.syncRepository.find({ where, relations: ['interviewer'], order: { createdAt: 'ASC' } });
    return rows.map((r) => this.toSyncResponse(r));
  }

  private async findConnection(orgId: string, id: string, user: { sub: string; role: string }) {
    const row = await this.syncRepository.findOne({ where: { id, organizationId: orgId }, relations: ['interviewer'] });
    if (!row) throw new NotFoundException(`Calendar connection #${id} not found`);
    if (!ADMIN_ROLES.includes(user.role) && row.interviewerId !== user.sub) {
      throw new ForbiddenException('You can only manage your own calendar connection.');
    }
    return row;
  }

  // Step 1 of the connect flow: returns the provider's consent URL. The
  // interviewer opens it, signs in, and the provider redirects to
  // /api/calendar-sync/oauth/callback (handleOAuthCallback).
  async startConnect(orgId: string, provider: CalendarProviderName, user: { sub: string; role: string }, interviewerId?: string) {
    const targetId = interviewerId || user.sub;
    if (targetId !== user.sub && !ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Only admins can create a connect link for another interviewer.');
    }
    const interviewer = await this.userRepository.findOne({ where: { id: targetId } });
    if (!interviewer) throw new NotFoundException('Interviewer not found');
    if (interviewer.organizationId && interviewer.organizationId !== orgId) {
      throw new BadRequestException('Interviewer does not belong to this organization.');
    }

    const settings = await this.getSettingsWithSecrets(orgId);
    const app = this.appCredentials(settings, provider);
    if (!app) {
      throw new BadRequestException(
        `${provider} is not set up for this organization. Add the OAuth client ID and secret in Settings > Calendar Integration and turn it on.`,
      );
    }

    let row = await this.syncRepository.findOne({ where: { interviewerId: targetId, calendarProvider: provider } });
    if (!row) {
      row = this.syncRepository.create({
        organizationId: orgId,
        interviewerId: targetId,
        calendarProvider: provider,
        syncStatus: 'Not Connected',
      });
    }
    const state = randomBytes(24).toString('hex');
    row.oauthState = state;
    row.organizationId = orgId;
    await this.syncRepository.save(row);

    return {
      provider,
      interviewerId: targetId,
      redirectUri: this.redirectUriFor(settings),
      authorizeUrl: this.clients[provider].buildAuthorizeUrl(app, this.redirectUriFor(settings), state),
    };
  }

  // Step 2: the provider redirects here with ?code&state. Never throws —
  // returns where to send the browser.
  async handleOAuthCallback(query: { code?: string; state?: string; error?: string; error_description?: string }) {
    const frontend = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001').replace(/\/$/, '');
    const back = (params: Record<string, string>) =>
      `${frontend}/organization/settings/calendar?${new URLSearchParams(params).toString()}`;

    if (!query.state) return back({ calendar: 'error', message: 'Missing state' });
    const row = await this.syncRepository
      .createQueryBuilder('s')
      .addSelect(['s.oauthState', 's.refreshToken'])
      .where('s.oauth_state = :state', { state: query.state })
      .getOne();
    if (!row) return back({ calendar: 'error', message: 'This connect link has expired. Start again.' });

    const provider = row.calendarProvider as CalendarProviderName;
    if (query.error || !query.code) {
      row.oauthState = null;
      row.syncStatus = row.refreshToken ? row.syncStatus : 'Not Connected';
      row.lastError = query.error_description || query.error || 'Consent was not given';
      await this.syncRepository.save(row);
      return back({ calendar: 'error', provider, message: row.lastError ?? 'Consent was not given' });
    }

    try {
      const settings = await this.getSettingsWithSecrets(row.organizationId);
      const app = this.appCredentials(settings, provider);
      if (!app) throw new CalendarProviderError(`${provider} is not configured for this organization.`);
      const client = this.clients[provider];
      const tokens = await client.exchangeCode(app, this.redirectUriFor(settings), query.code);
      const email = await client.getAccountEmail(tokens.accessToken).catch(() => null);

      row.accessToken = tokens.accessToken;
      row.refreshToken = tokens.refreshToken ?? row.refreshToken;
      row.tokenExpiresAt = tokens.expiresAt;
      row.calendarEmail = email ?? row.calendarEmail;
      row.syncStatus = 'Connected';
      row.lastSyncTime = new Date();
      row.lastError = tokens.refreshToken || row.refreshToken ? null : 'No refresh token returned; reconnect if syncing stops.';
      row.oauthState = null;
      await this.syncRepository.save(row);

      // Fill Availability_Window straight away (best effort).
      await this.refreshAvailability(row.id).catch(() => undefined);
      return back({ calendar: 'connected', provider });
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn(`Calendar connect failed for ${provider}: ${message}`);
      row.oauthState = null;
      row.syncStatus = 'Failed';
      row.lastError = message;
      await this.syncRepository.save(row);
      return back({ calendar: 'error', provider, message });
    }
  }

  async updateConnection(orgId: string, id: string, dto: UpdateCalendarSyncDto, user: { sub: string; role: string }) {
    const row = await this.findConnection(orgId, id, user);
    if (dto.availabilityWindow !== undefined) row.availabilityWindow = dto.availabilityWindow;
    if (dto.calendarEmail !== undefined) row.calendarEmail = dto.calendarEmail || null;
    await this.syncRepository.save(row);
    return this.toSyncResponse(row);
  }

  async disconnect(orgId: string, id: string, user: { sub: string; role: string }) {
    const row = await this.findConnection(orgId, id, user);
    const withTokens = await this.syncRepository
      .createQueryBuilder('s')
      .addSelect(['s.refreshToken', 's.accessToken'])
      .where('s.id = :id', { id: row.id })
      .getOne();
    const token = withTokens?.refreshToken || withTokens?.accessToken;
    if (token) await this.clients[row.calendarProvider as CalendarProviderName]?.revoke(token).catch(() => undefined);
    row.accessToken = null;
    row.refreshToken = null;
    row.tokenExpiresAt = null;
    row.syncStatus = 'Disconnected';
    row.lastSyncTime = new Date();
    row.lastError = null;
    await this.syncRepository.save(row);
    return this.toSyncResponse(row);
  }

  // Returns a valid access token, refreshing it when it is about to expire.
  private async getAccessToken(syncId: string): Promise<{ row: InterviewCalendarSync; accessToken: string }> {
    const row = await this.syncRepository
      .createQueryBuilder('s')
      .addSelect(['s.accessToken', 's.refreshToken'])
      .where('s.id = :id', { id: syncId })
      .getOne();
    if (!row || (!row.refreshToken && !row.accessToken)) {
      throw new CalendarProviderError('Calendar is not connected.');
    }
    const provider = row.calendarProvider as CalendarProviderName;
    const stillValid = row.accessToken && row.tokenExpiresAt && row.tokenExpiresAt.getTime() > Date.now() + 60_000;
    if (stillValid) return { row, accessToken: row.accessToken as string };
    if (!row.refreshToken) throw new CalendarProviderError('Access expired and no refresh token is stored; reconnect the calendar.');

    const settings = await this.getSettingsWithSecrets(row.organizationId);
    const app = this.appCredentials(settings, provider);
    if (!app) throw new CalendarProviderError(`${provider} is not configured for this organization.`);
    const tokens = await this.clients[provider].refresh(app, row.refreshToken);
    row.accessToken = tokens.accessToken;
    row.refreshToken = tokens.refreshToken ?? row.refreshToken;
    row.tokenExpiresAt = tokens.expiresAt;
    await this.syncRepository.save(row);
    return { row, accessToken: tokens.accessToken };
  }

  private async markSyncResult(row: InterviewCalendarSync, ok: boolean, error?: string | null, eventId?: string | null) {
    await this.syncRepository.update(
      { id: row.id },
      {
        syncStatus: ok ? 'Synced' : 'Failed',
        lastSyncTime: new Date(),
        lastError: ok ? null : (error ?? 'Unknown error'),
        ...(eventId !== undefined ? { calendarEventId: eventId } : {}),
      },
    );
  }

  // ==========================================================================
  // Free/busy -> Availability_Window
  // ==========================================================================

  async refreshAvailability(syncId: string) {
    const base = await this.syncRepository.findOne({ where: { id: syncId } });
    if (!base) throw new NotFoundException('Calendar connection not found');
    try {
      const { row, accessToken } = await this.getAccessToken(syncId);
      const settings = await this.getSettingsWithSecrets(row.organizationId);
      const tz = isValidZone(settings.timeZone) ? settings.timeZone : 'UTC';
      const days = Math.min(Math.max(Number(settings.availabilityDays) || 14, 1), 60);
      const from = new Date();
      const to = new Date(from.getTime() + days * 86_400_000);
      const busy = await this.clients[row.calendarProvider as CalendarProviderName].getBusy(
        accessToken,
        row.calendarEmail,
        from,
        to,
      );
      const windowText = this.buildAvailabilityText(busy, from, days, settings.workdayStart, settings.workdayEnd, tz);
      await this.syncRepository.update(
        { id: row.id },
        { availabilityWindow: windowText, syncStatus: 'Synced', lastSyncTime: new Date(), lastError: null },
      );
      return this.toSyncResponse({ ...base, availabilityWindow: windowText, syncStatus: 'Synced', lastSyncTime: new Date(), lastError: null } as InterviewCalendarSync);
    } catch (err) {
      const message = (err as Error).message;
      await this.markSyncResult(base, false, message);
      throw new BadRequestException(`Could not read free/busy from ${base.calendarProvider}: ${message}`);
    }
  }

  // Free windows inside working hours (Mon-Sat), one line per day, e.g.
  // "Thu 15 Oct 2026: 09:00-11:30, 14:00-18:00 (Asia/Kolkata)".
  private buildAvailabilityText(
    busy: BusyInterval[],
    from: Date,
    days: number,
    workdayStart: string,
    workdayEnd: string,
    tz: string,
  ): string {
    const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
    const lines: string[] = [];
    for (let i = 0; i < days; i++) {
      const day = dayInZone(new Date(from.getTime() + i * 86_400_000), tz);
      const dayStart = zonedToUtc(day, workdayStart || '09:00', tz);
      const dayEnd = zonedToUtc(day, workdayEnd || '18:00', tz);
      const weekday = formatInZone(dayStart, tz, { weekday: 'short' });
      if (weekday === 'Sun') continue;
      let cursor = new Date(Math.max(dayStart.getTime(), from.getTime()));
      const free: string[] = [];
      for (const b of sorted) {
        if (b.end <= cursor || b.start >= dayEnd) continue;
        if (b.start > cursor) free.push(`${formatInZone(cursor, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}-${formatInZone(b.start, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`);
        if (b.end > cursor) cursor = b.end;
      }
      if (cursor < dayEnd) {
        free.push(`${formatInZone(cursor, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}-${formatInZone(dayEnd, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`);
      }
      const label = formatInZone(dayStart, tz, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      lines.push(`${label}: ${free.length ? free.join(', ') : 'Busy'}`);
    }
    return `${lines.join('\n')}\n(Times in ${tz}; working hours ${workdayStart}-${workdayEnd})`;
  }

  // ==========================================================================
  // Interview events (create / update / delete)
  // ==========================================================================

  async getInterviewEvent(orgId: string, interviewId: string) {
    const event = await this.eventRepository.findOne({ where: { organizationId: orgId, interviewId } });
    return event ?? { interviewId, syncStatus: 'Not Connected', eventId: null, meetingLink: null, lastError: null, lastSyncTime: null };
  }

  // Picks the organiser: the slot's interviewer if connected, otherwise the
  // first connected panel member.
  private async pickOrganiser(orgId: string, panel: string[]): Promise<InterviewCalendarSync | null> {
    if (panel.length === 0) return null;
    const rows = await this.syncRepository.find({
      where: { organizationId: orgId, interviewerId: In(panel), syncStatus: In(['Connected', 'Synced', 'Failed']) },
    });
    const usable = rows.filter((r) => r.syncStatus !== 'Disconnected');
    for (const userId of panel) {
      const match = usable.find((r) => r.interviewerId === userId);
      if (match) return match;
    }
    return null;
  }

  // Creates or updates (action 'upsert') or removes (action 'delete') the
  // calendar event for an interview. NEVER throws: failures are recorded on
  // the event row and on the interviewer's Interview_Calendar_Sync row.
  async syncInterview(orgId: string, interviewId: string, action: 'upsert' | 'delete'): Promise<InterviewSyncResult> {
    try {
      const interview = await this.interviewRepository.findOne({ where: { id: interviewId, organizationId: orgId } });
      if (!interview) return { status: 'Skipped', error: 'Interview not found' };
      let event = await this.eventRepository.findOne({ where: { organizationId: orgId, interviewId } });

      if (action === 'delete') {
        if (!event?.eventId || !event.calendarSyncId) return { status: 'Skipped' };
        return await this.deleteEvent(event);
      }

      const slot = interview.slotId ? await this.slotRepository.findOne({ where: { id: interview.slotId } }) : null;
      const start = interview.startTime ?? slot?.startTime ?? null;
      const end = interview.endTime ?? slot?.endTime ?? null;
      if (!start || !end) return { status: 'Skipped', error: 'Interview has no start/end time yet' };

      const panel = Array.from(new Set([slot?.interviewerId, ...(interview.assignedPanel ?? [])].filter(Boolean) as string[]));
      const organiser = await this.pickOrganiser(orgId, panel);
      if (!event) event = this.eventRepository.create({ organizationId: orgId, interviewId });

      if (!organiser) {
        event.syncStatus = 'Not Connected';
        event.lastError = 'No panel member has connected a Google or Outlook calendar.';
        event.lastSyncTime = new Date();
        await this.eventRepository.save(event);
        return { status: 'Not Connected', error: event.lastError };
      }

      // Organiser changed (e.g. rescheduled to another interviewer's slot):
      // remove the old event first so attendees do not get two invitations.
      if (event.eventId && event.calendarSyncId && event.calendarSyncId !== organiser.id) {
        await this.deleteEvent(event).catch(() => undefined);
        event.eventId = null;
      }

      const settings = await this.getSettingsWithSecrets(orgId);
      const application = await this.applicationRepository.findOne({ where: { id: interview.applicationId } });
      const panelUsers = panel.length ? await this.userRepository.find({ where: { id: In(panel) } }) : [];
      const attendees: CalendarEventInput['attendees'] = panelUsers
        .filter((u) => u.id !== organiser.interviewerId && u.email)
        .map((u) => ({ email: u.email, name: u.name }));
      if (settings.inviteCandidate && application?.email) {
        attendees.push({ email: application.email, name: application.name });
      }

      const mode = interview.interviewMode ?? slot?.mode ?? 'In-person';
      const existingLink = interview.meetingLink || slot?.meetingLink || event.meetingLink || null;
      const createMeeting = settings.autoMeetingLink && mode === 'Virtual' && !existingLink;
      const location = mode === 'Virtual' ? existingLink || interview.location || slot?.location || null : interview.location || slot?.location || null;
      const tz = isValidZone(slot?.timeZone) ? (slot?.timeZone as string) : isValidZone(settings.timeZone) ? settings.timeZone : 'UTC';
      const typeLabel = interview.interviewType === 'GD' ? 'Group Discussion' : interview.interviewType === 'PI' ? 'Personal Interview' : interview.interviewType;

      const input: CalendarEventInput = {
        title: `${typeLabel} (Round ${interview.round}) - ${application?.name ?? 'Candidate'}${application?.applicationNo ? ` [${application.applicationNo}]` : ''}`,
        description: [
          `${typeLabel}, round ${interview.round}`,
          application ? `Candidate: ${application.name ?? ''} (${application.applicationNo ?? ''})` : null,
          application?.program ? `Programme: ${application.program}` : null,
          `Mode: ${mode}`,
          existingLink ? `Meeting link: ${existingLink}` : null,
          interview.location || slot?.location ? `Location: ${interview.location || slot?.location}` : null,
          `Status: ${interview.status}`,
        ]
          .filter(Boolean)
          .join('\n'),
        start: new Date(start),
        end: new Date(end),
        timeZone: tz,
        location,
        attendees,
        createMeeting,
        requestId: `interview-${interview.id}-${Date.now()}`,
      };

      try {
        const { accessToken } = await this.getAccessToken(organiser.id);
        const client = this.clients[organiser.calendarProvider as CalendarProviderName];
        const result = event.eventId
          ? await client.updateEvent(accessToken, event.eventId, input)
          : await client.createEvent(accessToken, input);

        event.eventId = result.eventId;
        event.calendarSyncId = organiser.id;
        event.interviewerId = organiser.interviewerId;
        event.calendarProvider = organiser.calendarProvider;
        event.meetingLink = result.meetingLink ?? existingLink;
        event.syncStatus = 'Synced';
        event.lastError = null;
        event.lastSyncTime = new Date();
        await this.eventRepository.save(event);
        await this.markSyncResult(organiser, true, null, result.eventId);

        // Put the provider's meeting link on the interview (Meeting_Link).
        if (result.meetingLink && !interview.meetingLink) {
          await this.interviewRepository.update({ id: interview.id }, { meetingLink: result.meetingLink });
        }
        return { status: 'Synced', meetingLink: event.meetingLink };
      } catch (err) {
        const message = (err as Error).message;
        this.logger.warn(`Calendar sync failed for interview ${interview.id}: ${message}`);
        event.calendarSyncId = event.calendarSyncId ?? organiser.id;
        event.interviewerId = event.interviewerId ?? organiser.interviewerId;
        event.calendarProvider = event.calendarProvider ?? organiser.calendarProvider;
        event.syncStatus = 'Failed';
        event.lastError = message;
        event.lastSyncTime = new Date();
        await this.eventRepository.save(event);
        await this.markSyncResult(organiser, false, message);
        return { status: 'Failed', error: message };
      }
    } catch (err) {
      this.logger.error(`Calendar sync crashed for interview ${interviewId}: ${(err as Error).message}`);
      return { status: 'Failed', error: (err as Error).message };
    }
  }

  private async deleteEvent(event: InterviewCalendarEvent): Promise<InterviewSyncResult> {
    const sync = event.calendarSyncId ? await this.syncRepository.findOne({ where: { id: event.calendarSyncId } }) : null;
    if (!sync || !event.eventId) return { status: 'Skipped' };
    try {
      const { accessToken } = await this.getAccessToken(sync.id);
      await this.clients[sync.calendarProvider as CalendarProviderName].deleteEvent(accessToken, event.eventId);
      event.syncStatus = 'Deleted';
      event.lastError = null;
      event.lastSyncTime = new Date();
      event.eventId = null;
      await this.eventRepository.save(event);
      await this.markSyncResult(sync, true);
      return { status: 'Deleted' };
    } catch (err) {
      const message = (err as Error).message;
      event.syncStatus = 'Failed';
      event.lastError = `Delete failed: ${message}`;
      event.lastSyncTime = new Date();
      await this.eventRepository.save(event);
      await this.markSyncResult(sync, false, message);
      return { status: 'Failed', error: message };
    }
  }

  // ==========================================================================
  // Periodic sync (every 10 minutes)
  // ==========================================================================

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'interview-calendar-sync' })
  async periodicSync() {
    if (this.cronRunning) return;
    this.cronRunning = true;
    try {
      await this.runSync();
    } catch (err) {
      this.logger.error(`Periodic calendar sync failed: ${(err as Error).message}`);
    } finally {
      this.cronRunning = false;
    }
  }

  // 1) refresh every connected interviewer's Availability_Window;
  // 2) retry events that failed or were never pushed for upcoming
  //    Scheduled / Rescheduled interviews;
  // 3) remove events still present for Cancelled interviews.
  async runSync(orgId?: string) {
    const connectionWhere: any = { syncStatus: In(['Connected', 'Synced', 'Failed']) };
    if (orgId) connectionWhere.organizationId = orgId;
    const connections = await this.syncRepository.find({ where: connectionWhere });
    let availabilityUpdated = 0;
    for (const c of connections) {
      try {
        await this.refreshAvailability(c.id);
        availabilityUpdated++;
      } catch {
        // recorded on the row
      }
    }

    const now = new Date();
    const qb = this.interviewRepository
      .createQueryBuilder('i')
      .leftJoin('i.slot', 'slot')
      .where('i.status IN (:...statuses)', { statuses: ['Scheduled', 'Rescheduled'] })
      .andWhere('COALESCE(i.start_time, slot.start_time) > :now', { now });
    if (orgId) qb.andWhere('i.organization_id = :orgId', { orgId });
    const upcoming = await qb.getMany();
    const upcomingEvents = upcoming.length
      ? await this.eventRepository.find({ where: { interviewId: In(upcoming.map((i) => i.id)) } })
      : [];
    const eventByInterview = new Map(upcomingEvents.map((e) => [e.interviewId, e]));
    let eventsSynced = 0;
    for (const interview of upcoming) {
      const ev = eventByInterview.get(interview.id);
      if (ev && ev.syncStatus === 'Synced') continue;
      const res = await this.syncInterview(interview.organizationId, interview.id, 'upsert');
      if (res.status === 'Synced') eventsSynced++;
    }

    const cancelledQb = this.eventRepository
      .createQueryBuilder('e')
      .innerJoin(Interview, 'i', 'i.id = e.interview_id')
      .where('i.status = :status', { status: 'Cancelled' })
      .andWhere('e.event_id IS NOT NULL');
    if (orgId) cancelledQb.andWhere('e.organization_id = :orgId', { orgId });
    const staleEvents = await cancelledQb.getMany();
    for (const ev of staleEvents) await this.deleteEvent(ev);

    return { connections: connections.length, availabilityUpdated, eventsSynced, eventsRemoved: staleEvents.length };
  }
}
