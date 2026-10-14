import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import { Lead, LeadScoreBand, LeadStatus, ScoreBreakdownItem } from './entities/lead.entity.js';
import { LeadScoringRule, RuleOperator, ScoreType } from './entities/lead-scoring-rule.entity.js';
import { LeadSettingsService } from './lead-settings.service.js';

/** Engagement event types accepted by recordEngagement() */
export const ENGAGEMENT_TYPES = [
  'email_open',
  'email_reply',
  'email_click',
  'webinar',
  'event_attended',
  'chat',
  'form_submission',
  'call_answered',
  'email_bounce',
] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

const ENGAGEMENT_COUNTER: Record<EngagementType, string> = {
  email_open: 'emailOpen',
  email_reply: 'emailReply',
  email_click: 'emailClick',
  webinar: 'webinar',
  event_attended: 'eventAttended',
  chat: 'chat',
  form_submission: 'formSubmission',
  call_answered: 'callAnswered',
  email_bounce: 'emailBounce',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  /** Attributes a rule can test. Exposed to the settings UI. */
  static readonly ATTRIBUTES: { key: string; label: string; kind: 'number' | 'text' | 'list' | 'boolean' }[] = [
    { key: 'testScore', label: 'GMAT/GRE Score', kind: 'number' },
    { key: 'testType', label: 'Test Type (GMAT, GRE…)', kind: 'text' },
    { key: 'gpa', label: 'GPA', kind: 'number' },
    { key: 'workExperienceYears', label: 'Work Experience (years)', kind: 'number' },
    { key: 'program', label: 'Program / Course Interest', kind: 'list' },
    { key: 'intake', label: 'Intake / Session', kind: 'list' },
    { key: 'country', label: 'Country', kind: 'list' },
    { key: 'state', label: 'State', kind: 'list' },
    { key: 'city', label: 'City', kind: 'list' },
    { key: 'channelSource', label: 'Channel Source', kind: 'list' },
    { key: 'sourceType', label: 'Source Type', kind: 'list' },
    { key: 'engagementEvents', label: 'Webinars attended + email replies + events attended', kind: 'number' },
    { key: 'emailOpens', label: 'Email opens', kind: 'number' },
    { key: 'emailReplies', label: 'Email replies', kind: 'number' },
    { key: 'emailClicks', label: 'Email clicks', kind: 'number' },
    { key: 'webinarsAttended', label: 'Webinars attended', kind: 'number' },
    { key: 'eventsAttended', label: 'Events attended', kind: 'number' },
    { key: 'chatConversations', label: 'Chatbot conversations', kind: 'number' },
    { key: 'formSubmissions', label: 'Repeat form submissions', kind: 'number' },
    { key: 'emailBouncedOrInvalid', label: 'Email bounced / invalid', kind: 'boolean' },
    { key: 'hasPhone', label: 'Has phone number', kind: 'boolean' },
  ];

  constructor(
    @InjectRepository(LeadScoringRule)
    private readonly ruleRepo: Repository<LeadScoringRule>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly settingsService: LeadSettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Rules CRUD
  // ---------------------------------------------------------------------------

  async listRules(orgId: string): Promise<LeadScoringRule[]> {
    await this.ensureSeeded(orgId);
    return this.ruleRepo.find({
      where: { organizationId: orgId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createRule(orgId: string, dto: Partial<LeadScoringRule>): Promise<LeadScoringRule> {
    const count = await this.ruleRepo.count({ where: { organizationId: orgId } });
    const rule = this.ruleRepo.create({
      organizationId: orgId,
      category: dto.category!,
      label: dto.label!,
      attribute: dto.attribute!,
      operator: dto.operator!,
      value: dto.value ?? null,
      points: Number(dto.points),
      scoreType: dto.scoreType ?? this.defaultScoreType(dto.category!),
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? count,
    });
    return this.ruleRepo.save(rule);
  }

  async updateRule(orgId: string, id: string, dto: Partial<LeadScoringRule>): Promise<LeadScoringRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, organizationId: orgId } });
    if (!rule) throw new NotFoundException('Scoring rule not found');
    const keys: (keyof LeadScoringRule)[] = [
      'category',
      'label',
      'attribute',
      'operator',
      'value',
      'points',
      'scoreType',
      'isActive',
      'sortOrder',
    ];
    for (const k of keys) if (dto[k] !== undefined) (rule as any)[k] = dto[k];
    return this.ruleRepo.save(rule);
  }

  async deleteRule(orgId: string, id: string): Promise<void> {
    const rule = await this.ruleRepo.findOne({ where: { id, organizationId: orgId } });
    if (!rule) throw new NotFoundException('Scoring rule not found');
    await this.ruleRepo.remove(rule);
  }

  /** Seeds the scope's example criteria the first time an org opens scoring. */
  async ensureSeeded(orgId: string): Promise<void> {
    const count = await this.ruleRepo.count({ where: { organizationId: orgId } });
    if (count > 0) return;
    const seeds: Partial<LeadScoringRule>[] = [
      { category: 'Academic', label: 'GMAT/GRE Score >= 650', attribute: 'testScore', operator: 'gte', value: '650', points: 10, scoreType: 'academic' },
      { category: 'Work Experience', label: '3+ years experience', attribute: 'workExperienceYears', operator: 'gte', value: '3', points: 10, scoreType: 'profile' },
      // Flagship programs / target regions are org-specific: the rule is active but matches nothing until values are set.
      { category: 'Program Fit', label: 'Interested in flagship program', attribute: 'program', operator: 'in', value: '', points: 5, scoreType: 'profile' },
      { category: 'Engagement', label: 'Attended webinar or replied to email', attribute: 'engagementEvents', operator: 'gte', value: '1', points: 5, scoreType: 'engagement' },
      { category: 'Geography', label: 'Target region', attribute: 'country', operator: 'in', value: '', points: 5, scoreType: 'profile' },
      { category: 'Email Bounce / Invalid', label: 'Email bounced or invalid', attribute: 'emailBouncedOrInvalid', operator: 'is_true', value: null, points: -10, scoreType: 'engagement' },
    ];
    await this.ruleRepo.save(
      seeds.map((s, i) => this.ruleRepo.create({ ...s, organizationId: orgId, isActive: true, sortOrder: i })),
    );
  }

  private defaultScoreType(category: string): ScoreType {
    if (category === 'Academic') return 'academic';
    if (category === 'Engagement' || category === 'Email Bounce / Invalid') return 'engagement';
    return 'profile';
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  buildFacts(lead: Lead): Record<string, any> {
    const e = lead.engagement || {};
    const n = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));
    return {
      testScore: n(lead.testScore),
      testType: lead.testType,
      gpa: n(lead.gpa),
      workExperienceYears: n(lead.workExperienceYears),
      program: [lead.courseId, lead.programInterest].filter(Boolean),
      intake: [lead.intake, lead.intakeSessionId].filter(Boolean),
      country: lead.country,
      state: lead.state,
      city: lead.city,
      channelSource: lead.channelSource,
      sourceType: lead.sourceType,
      emailOpens: e.emailOpen || 0,
      emailReplies: e.emailReply || 0,
      emailClicks: e.emailClick || 0,
      webinarsAttended: e.webinar || 0,
      eventsAttended: e.eventAttended || 0,
      chatConversations: e.chat || 0,
      formSubmissions: e.formSubmission || 0,
      engagementEvents: (e.webinar || 0) + (e.emailReply || 0) + (e.eventAttended || 0),
      emailBouncedOrInvalid: !!lead.emailBounced || (!!lead.email && !EMAIL_REGEX.test(lead.email)),
      hasPhone: !!lead.phone,
    };
  }

  private matches(rule: LeadScoringRule, facts: Record<string, any>): boolean {
    const actual = facts[rule.attribute];
    const op = rule.operator as RuleOperator;
    const raw = (rule.value ?? '').toString().trim();
    const list = raw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const actualList: string[] = (Array.isArray(actual) ? actual : [actual])
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => String(v).trim().toLowerCase());

    switch (op) {
      case 'exists':
        return actualList.length > 0;
      case 'is_true':
        return actual === true;
      case 'gte':
      case 'lte':
      case 'gt':
      case 'lt': {
        if (actual === null || actual === undefined || raw === '') return false;
        const a = Number(actual);
        const b = Number(raw);
        if (Number.isNaN(a) || Number.isNaN(b)) return false;
        return op === 'gte' ? a >= b : op === 'lte' ? a <= b : op === 'gt' ? a > b : a < b;
      }
      case 'eq':
        return raw !== '' && actualList.includes(raw.toLowerCase());
      case 'neq':
        return raw !== '' && !actualList.includes(raw.toLowerCase());
      case 'in':
        return list.length > 0 && actualList.some((v) => list.includes(v));
      case 'not_in':
        return list.length > 0 && actualList.length > 0 && !actualList.some((v) => list.includes(v));
      case 'contains':
        return raw !== '' && actualList.some((v) => v.includes(raw.toLowerCase()));
      default:
        return false;
    }
  }

  /** Computes and assigns score fields on the entity (does not save). */
  async applyScore(lead: Lead, rules?: LeadScoringRule[]): Promise<Lead> {
    const orgRules = rules ?? (await this.activeRules(lead.organizationId));
    const settings = await this.settingsService.get(lead.organizationId);
    const facts = this.buildFacts(lead);

    let total = 0;
    let academic = 0;
    let engagement = 0;
    const breakdown: ScoreBreakdownItem[] = [];
    for (const rule of orgRules) {
      if (!rule.isActive) continue;
      if (!this.matches(rule, facts)) continue;
      total += rule.points;
      if (rule.scoreType === 'academic') academic += rule.points;
      if (rule.scoreType === 'engagement') engagement += rule.points;
      breakdown.push({
        ruleId: rule.id,
        category: rule.category,
        label: rule.label,
        points: rule.points,
        scoreType: rule.scoreType,
      });
    }

    lead.score = total;
    lead.academicScore = academic;
    lead.engagementScore = engagement;
    lead.scoreBreakdown = breakdown;
    lead.lastScoredAt = new Date();
    lead.scoreBand =
      total >= settings.hotThreshold
        ? LeadScoreBand.HOT
        : total >= settings.warmThreshold
          ? LeadScoreBand.WARM
          : LeadScoreBand.COLD;
    return lead;
  }

  async activeRules(orgId: string): Promise<LeadScoringRule[]> {
    await this.ensureSeeded(orgId);
    return this.ruleRepo.find({
      where: { organizationId: orgId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async scoreAndSave(lead: Lead): Promise<Lead> {
    await this.applyScore(lead);
    await this.leadRepo.update(lead.id, {
      score: lead.score,
      academicScore: lead.academicScore,
      engagementScore: lead.engagementScore,
      scoreBreakdown: lead.scoreBreakdown as any,
      lastScoredAt: lead.lastScoredAt,
      scoreBand: lead.scoreBand,
    });
    return lead;
  }

  /** Re-scores every non-merged lead of the org in batches. */
  async rescoreAll(orgId: string): Promise<{ rescored: number }> {
    const rules = await this.activeRules(orgId);
    const batchSize = 200;
    let offset = 0;
    let rescored = 0;
    for (;;) {
      const leads = await this.leadRepo.find({
        where: { organizationId: orgId, status: Not(In([LeadStatus.MERGED])) },
        order: { createdAt: 'ASC' },
        skip: offset,
        take: batchSize,
      });
      if (leads.length === 0) break;
      for (const lead of leads) {
        await this.applyScore(lead, rules);
        await this.leadRepo.update(lead.id, {
          score: lead.score,
          academicScore: lead.academicScore,
          engagementScore: lead.engagementScore,
          scoreBreakdown: lead.scoreBreakdown as any,
          lastScoredAt: lead.lastScoredAt,
          scoreBand: lead.scoreBand,
        });
        rescored++;
      }
      offset += batchSize;
    }
    this.logger.log(`Rescored ${rescored} leads for org ${orgId}`);
    return { rescored };
  }

  /** Increments the engagement counter on the entity (does not save). */
  applyEngagement(lead: Lead, type: EngagementType, count = 1): Lead {
    const key = ENGAGEMENT_COUNTER[type];
    lead.engagement = { ...(lead.engagement || {}) };
    lead.engagement[key] = (lead.engagement[key] || 0) + count;
    if (type === 'email_bounce') lead.emailBounced = true;
    return lead;
  }
}
