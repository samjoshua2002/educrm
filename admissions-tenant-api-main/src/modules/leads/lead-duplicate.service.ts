import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Not, Repository } from 'typeorm';
import { Lead, LeadStatus, TouchPoint } from './entities/lead.entity.js';
import { LeadActivity } from './entities/lead-activity.entity.js';

export interface DuplicateCandidateInput {
  organizationId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  studentId?: string | null;
  dateOfBirth?: string | null;
  city?: string | null;
}

export interface DuplicateMatch {
  lead: Lead;
  confidence: number;
  reasons: string[];
}

/** Fields offered in the merge preview, in display order. */
export const MERGE_FIELDS: { key: keyof Lead; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'studentId', label: 'Student ID' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'channelSource', label: 'Channel Source' },
  { key: 'formName', label: 'Form Name' },
  { key: 'courseId', label: 'Program / Course (ID)' },
  { key: 'programInterest', label: 'Program / Course Interest' },
  { key: 'intake', label: 'Intake / Session' },
  { key: 'sourceType', label: 'Source Type' },
  { key: 'campaignName', label: 'Campaign Name' },
  { key: 'subSource', label: 'Sub-source' },
  { key: 'utmSource', label: 'UTM Source' },
  { key: 'utmMedium', label: 'UTM Medium' },
  { key: 'utmCampaign', label: 'UTM Campaign' },
  { key: 'testType', label: 'Test Type' },
  { key: 'testScore', label: 'GMAT/GRE Score' },
  { key: 'gpa', label: 'GPA' },
  { key: 'workExperienceYears', label: 'Work Experience (years)' },
  { key: 'assignedTo', label: 'Assigned Counselor' },
  { key: 'followUpStatus', label: 'Follow-up Status' },
];

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

export function normalizeName(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein-based similarity ratio 0..1 */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

/** Token-order-insensitive name similarity ("Sharma Priya" ≈ "Priya Sharma") */
function nameSimilarity(a: string, b: string): number {
  const sortTokens = (s: string) => s.split(' ').sort().join(' ');
  return Math.max(similarity(a, b), similarity(sortTokens(a), sortTokens(b)));
}

@Injectable()
export class LeadDuplicateService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Scope 5 detection rules:
   *  - Email (100), unique Student ID (100), Phone (95), Full Name + DOB (90)
   *  - Fuzzy Name + City (up to 85) — enabled for imported lists (or on demand)
   */
  async findMatches(
    input: DuplicateCandidateInput,
    opts: { fuzzy?: boolean; excludeIds?: string[] } = {},
  ): Promise<DuplicateMatch[]> {
    const email = input.email?.trim().toLowerCase() || null;
    const phone10 = normalizePhone(input.phone);
    const studentId = input.studentId?.trim() || null;
    const fullName = normalizeName(input.firstName, input.lastName);
    const dob = input.dateOfBirth || null;
    const city = input.city?.trim().toLowerCase() || null;

    if (!email && !phone10 && !studentId && !(fullName && (dob || (opts.fuzzy && city)))) return [];

    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.organization_id = :orgId', { orgId: input.organizationId })
      .andWhere('lead.status != :merged', { merged: LeadStatus.MERGED });
    if (opts.excludeIds?.length) qb.andWhere('lead.id NOT IN (:...ex)', { ex: opts.excludeIds });

    qb.andWhere(
      new Brackets((w) => {
        let any = false;
        const or = (sql: string, params: object) => {
          if (any) w.orWhere(sql, params);
          else w.where(sql, params);
          any = true;
        };
        if (email) or('LOWER(lead.email) = :email', { email });
        if (phone10) or("RIGHT(regexp_replace(COALESCE(lead.phone, ''), '\\D', '', 'g'), 10) = :phone10", { phone10 });
        if (studentId) or('lead.student_id = :studentId', { studentId });
        if (fullName && dob) or('lead.date_of_birth = :dob', { dob });
        if (fullName && opts.fuzzy && city) or('LOWER(TRIM(lead.city)) = :city', { city });
      }),
    );

    const candidates = await qb.orderBy('lead.created_at', 'ASC').take(500).getMany();
    const matches: DuplicateMatch[] = [];
    for (const c of candidates) {
      const reasons: string[] = [];
      let conf = 0;
      const bump = (v: number, reason: string) => {
        reasons.push(reason);
        conf = Math.max(conf, v);
      };
      if (email && c.email && c.email.trim().toLowerCase() === email) bump(100, 'Email match');
      if (studentId && c.studentId && c.studentId.trim() === studentId) bump(100, 'Student ID match');
      if (phone10 && normalizePhone(c.phone) === phone10) bump(95, 'Phone match');
      const cName = normalizeName(c.firstName, c.lastName);
      if (fullName && dob && c.dateOfBirth && String(c.dateOfBirth).slice(0, 10) === String(dob).slice(0, 10)) {
        const sim = nameSimilarity(fullName, cName);
        if (sim >= 0.9) bump(Math.round(80 + 10 * sim), 'Full name + date of birth match');
      }
      if (fullName && opts.fuzzy && city && (c.city ?? '').trim().toLowerCase() === city) {
        const sim = nameSimilarity(fullName, cName);
        if (sim >= 0.8) bump(Math.round(85 * sim), `Fuzzy name + city match (${Math.round(sim * 100)}% similar)`);
      }
      if (reasons.length === 0) continue;
      // several independent signals raise confidence a little
      if (reasons.length > 1) conf = Math.min(100, conf + 3 * (reasons.length - 1));
      matches.push({ lead: c, confidence: conf, reasons });
    }
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /** Flagged duplicates awaiting review (not yet merged). */
  async listFlagged(orgId: string) {
    const dups = await this.leadRepo.find({
      where: { organizationId: orgId, isDuplicate: true, status: Not(LeadStatus.MERGED) },
      relations: ['assignedToUser'],
      order: { createdAt: 'DESC' },
      take: 500,
    });
    const pending = dups.filter((d) => d.status !== LeadStatus.MERGED && d.masterLeadId);
    const masterIds = Array.from(new Set(pending.map((d) => d.masterLeadId!)));
    const masters = masterIds.length
      ? await this.leadRepo.find({ where: { id: In(masterIds), organizationId: orgId } })
      : [];
    const byId = new Map(masters.map((m) => [m.id, m]));
    return pending.map((d) => ({
      duplicate: this.slim(d),
      master: byId.get(d.masterLeadId!) ? this.slim(byId.get(d.masterLeadId!)!) : null,
      confidence: d.duplicateConfidence,
      reason: d.duplicateReason,
    }));
  }

  private slim(l: Lead) {
    return {
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      phone: l.phone,
      city: l.city,
      channelSource: l.channelSource,
      createdFrom: l.createdFrom,
      createdAt: l.createdAt,
      status: l.status,
      score: l.score,
      scoreBand: l.scoreBand,
      assignedTo: l.assignedTo,
      assignedToUser: (l as any).assignedToUser
        ? { id: (l as any).assignedToUser.id, name: (l as any).assignedToUser.name }
        : null,
    };
  }

  /** Clears the duplicate flag without merging ("not a duplicate"). */
  async dismiss(orgId: string, leadId: string, actorId: string) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId, organizationId: orgId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const masterId = lead.masterLeadId;
    lead.isDuplicate = false;
    lead.masterLeadId = null;
    lead.duplicateConfidence = null;
    lead.duplicateReason = null;
    await this.leadRepo.save(lead);
    await this.activityRepo.save(
      this.activityRepo.create({
        leadId,
        organizationId: orgId,
        actorId,
        action: 'duplicate_dismissed',
        content: 'Marked as not a duplicate',
        metadata: { suspectedMasterLeadId: masterId },
      }),
    );
    return lead;
  }

  async preview(orgId: string, masterId: string, duplicateId: string) {
    if (masterId === duplicateId) throw new BadRequestException('Choose two different leads');
    const [master, duplicate] = await Promise.all([
      this.leadRepo.findOne({ where: { id: masterId, organizationId: orgId }, relations: ['assignedToUser'] }),
      this.leadRepo.findOne({ where: { id: duplicateId, organizationId: orgId }, relations: ['assignedToUser'] }),
    ]);
    if (!master || !duplicate) throw new NotFoundException('Lead not found');
    if (master.status === LeadStatus.MERGED || duplicate.status === LeadStatus.MERGED) {
      throw new BadRequestException('One of these leads has already been merged');
    }

    const fields = MERGE_FIELDS.map(({ key, label }) => {
      const mv = (master as any)[key] ?? null;
      const dv = (duplicate as any)[key] ?? null;
      const empty = (v: any) => v === null || v === undefined || v === '';
      return {
        key,
        label,
        masterValue: mv,
        duplicateValue: dv,
        masterDisplay: key === 'assignedTo' ? master.assignedToUser?.name ?? mv : mv,
        duplicateDisplay: key === 'assignedTo' ? duplicate.assignedToUser?.name ?? dv : dv,
        differs: String(mv ?? '') !== String(dv ?? ''),
        suggested: empty(mv) && !empty(dv) ? 'duplicate' : 'master',
      };
    });

    const activitiesToMove = await this.activityRepo.count({ where: { leadId: duplicateId } });
    const recheck = await this.findMatches(
      { ...duplicate, organizationId: orgId },
      { fuzzy: true },
    );
    const match = recheck.find((m) => m.lead.id === masterId);

    return {
      master,
      duplicate,
      fields,
      activitiesToMove,
      confidence: match?.confidence ?? duplicate.duplicateConfidence ?? null,
      reasons: match?.reasons ?? (duplicate.duplicateReason ? [duplicate.duplicateReason] : []),
    };
  }

  /**
   * Folds `duplicateId` into `masterId`. History is preserved:
   * activities are re-pointed to the master (tagged mergedFromLeadId), other
   * tables referencing the lead (applications, message logs…) are re-pointed,
   * a snapshot of the duplicate is kept in master.rawPayload.mergedRecords and the
   * duplicate row itself is kept with status=merged + masterLeadId.
   */
  async merge(
    orgId: string,
    actorId: string,
    masterId: string,
    duplicateId: string,
    choices: Record<string, 'master' | 'duplicate'> = {},
  ): Promise<Lead> {
    const { master, duplicate } = await this.preview(orgId, masterId, duplicateId);
    const empty = (v: any) => v === null || v === undefined || v === '';

    for (const { key } of MERGE_FIELDS) {
      const choice = choices[key as string];
      const dv = (duplicate as any)[key];
      if (choice === 'duplicate' || (!choice && empty((master as any)[key]) && !empty(dv))) {
        (master as any)[key] = dv;
      }
    }

    // engagement counters add up
    const eng: Record<string, number> = { ...(master.engagement || {}) };
    for (const [k, v] of Object.entries(duplicate.engagement || {})) eng[k] = (eng[k] || 0) + Number(v || 0);
    master.engagement = eng;
    master.emailBounced = master.emailBounced || duplicate.emailBounced;
    master.touchCount = (master.touchCount || 1) + (duplicate.touchCount || 1);

    // attribution: earliest first touch, latest last touch
    const t = (tp: TouchPoint | null, fallback: Date) => (tp?.at ? new Date(tp.at).getTime() : fallback.getTime());
    if (duplicate.firstTouch && t(duplicate.firstTouch, duplicate.createdAt) < t(master.firstTouch, master.createdAt)) {
      master.firstTouch = duplicate.firstTouch;
    }
    if (duplicate.lastTouch && t(duplicate.lastTouch, duplicate.createdAt) > t(master.lastTouch, master.createdAt)) {
      master.lastTouch = duplicate.lastTouch;
    }

    const now = new Date();
    const snapshot = { ...duplicate } as any;
    delete snapshot.assignedToUser;
    master.rawPayload = {
      ...(master.rawPayload || {}),
      mergedRecords: [
        ...((master.rawPayload || {}).mergedRecords || []),
        { leadId: duplicate.id, mergedAt: now.toISOString(), mergedBy: actorId, snapshot },
      ],
    };
    master.duplicateCount = (master.duplicateCount || 0) + 1;
    master.mergedAt = now;
    if (master.masterLeadId === duplicate.id) master.masterLeadId = null;
    if (master.isDuplicate && master.masterLeadId === null) master.isDuplicate = false;

    await this.dataSource.transaction(async (manager) => {
      // Claim the duplicate first: a concurrent merge of the same record (double click,
      // two reviewers) must not fold it twice or into two different masters.
      const claim = await manager.update(
        Lead,
        { id: duplicate.id, organizationId: orgId, status: Not(LeadStatus.MERGED) },
        { status: LeadStatus.MERGED },
      );
      if (!claim.affected) throw new BadRequestException('One of these leads has already been merged');

      delete (master as any).assignedToUser;
      await manager.save(Lead, master);

      await manager.update(
        LeadActivity,
        { leadId: duplicate.id },
        { leadId: master.id, mergedFromLeadId: duplicate.id },
      );

      // Re-point any other table that references the lead (applications, message logs…)
      const refs: { table_name: string }[] = await manager.query(
        `SELECT table_name FROM information_schema.columns
          WHERE table_schema = current_schema() AND column_name = 'lead_id'
            AND table_name NOT IN ('leads', 'lead_activities')`,
      );
      for (const { table_name } of refs) {
        await manager.query(`UPDATE "${table_name}" SET lead_id = $1 WHERE lead_id = $2`, [master.id, duplicate.id]);
      }
      // Re-point leads that were flagged as duplicates of the merged record
      await manager.update(Lead, { masterLeadId: duplicate.id, organizationId: orgId }, { masterLeadId: master.id });

      await manager.update(Lead, duplicate.id, {
        status: LeadStatus.MERGED,
        isDuplicate: true,
        masterLeadId: master.id,
        mergedAt: now,
      });

      const name = `${duplicate.firstName || ''} ${duplicate.lastName || ''}`.trim() || duplicate.email || duplicate.id;
      await manager.save(LeadActivity, [
        manager.create(LeadActivity, {
          leadId: master.id,
          organizationId: orgId,
          actorId,
          action: 'merged',
          content: `Merged duplicate lead ${name} into this lead`,
          metadata: { duplicateLeadId: duplicate.id, choices },
        }),
        manager.create(LeadActivity, {
          leadId: duplicate.id,
          organizationId: orgId,
          actorId,
          action: 'merged',
          content: `Merged into master lead ${master.id}`,
          previousStatus: duplicate.status,
          newStatus: LeadStatus.MERGED,
          metadata: { masterLeadId: master.id },
        }),
      ]);
    });

    return (await this.leadRepo.findOne({ where: { id: master.id } }))!;
  }
}
