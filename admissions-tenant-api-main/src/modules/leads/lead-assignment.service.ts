import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Lead, LeadStatus } from './entities/lead.entity.js';
import { Role } from '../../common/enums/roles.enum.js';
import {
  DistributionMode,
  LeadRoutingRule,
  ROUTING_RULE_TYPES,
} from './entities/lead-routing-rule.entity.js';
import { LeadSettingsService } from './lead-settings.service.js';

export interface AssignmentResult {
  userId: string;
  userName?: string;
  timestamp: Date;
  /** Text of the rule logic applied (stored in Lead.assignmentRule) */
  ruleText: string;
  ruleId?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  lead_manager: 'lead managers',
  counselor: 'counselors',
  org_admin: 'organization admins',
};

const OPEN_STATUSES_EXCLUDED = [
  LeadStatus.CLOSED,
  LeadStatus.CONVERTED,
  LeadStatus.DISQUALIFIED,
  LeadStatus.MERGED,
];

@Injectable()
export class LeadAssignmentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadRoutingRule)
    private readonly ruleRepository: Repository<LeadRoutingRule>,
    private readonly settingsService: LeadSettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Rules CRUD
  // ---------------------------------------------------------------------------

  listRules(orgId: string) {
    return this.ruleRepository.find({
      where: { organizationId: orgId },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
  }

  async createRule(orgId: string, dto: Partial<LeadRoutingRule>) {
    this.validateRule(dto);
    const count = await this.ruleRepository.count({ where: { organizationId: orgId } });
    await this.validateAssignees(orgId, dto.assigneeIds);
    const rule = this.ruleRepository.create({
      organizationId: orgId,
      name: dto.name!,
      ruleType: dto.ruleType!,
      field: dto.field ?? this.defaultField(dto.ruleType!),
      operator: dto.operator ?? (dto.ruleType === 'lead_score' ? 'gte' : 'in'),
      value: dto.value ?? null,
      assigneeIds: dto.assigneeIds ?? [],
      assigneeRole: dto.assigneeRole ?? null,
      distribution: dto.distribution ?? 'round_robin',
      priority: dto.priority ?? count,
      isActive: dto.isActive ?? true,
    });
    return this.ruleRepository.save(rule);
  }

  async updateRule(orgId: string, id: string, dto: Partial<LeadRoutingRule>) {
    const rule = await this.ruleRepository.findOne({ where: { id, organizationId: orgId } });
    if (!rule) throw new NotFoundException('Routing rule not found');
    if (dto.assigneeIds) await this.validateAssignees(orgId, dto.assigneeIds);
    const keys: (keyof LeadRoutingRule)[] = [
      'name',
      'ruleType',
      'field',
      'operator',
      'value',
      'assigneeIds',
      'assigneeRole',
      'distribution',
      'priority',
      'isActive',
    ];
    for (const k of keys) if (dto[k] !== undefined) (rule as any)[k] = dto[k];
    this.validateRule(rule);
    return this.ruleRepository.save(rule);
  }

  async deleteRule(orgId: string, id: string) {
    const rule = await this.ruleRepository.findOne({ where: { id, organizationId: orgId } });
    if (!rule) throw new NotFoundException('Routing rule not found');
    await this.ruleRepository.remove(rule);
  }

  /** Persist a new evaluation order: ids in the desired order. */
  async reorder(orgId: string, ids: string[]) {
    const rules = await this.ruleRepository.find({ where: { organizationId: orgId } });
    const byId = new Map(rules.map((r) => [r.id, r]));
    ids.forEach((id, idx) => {
      const r = byId.get(id);
      if (r) r.priority = idx;
    });
    await this.ruleRepository.save(Array.from(byId.values()));
    return this.listRules(orgId);
  }

  private defaultField(type: string) {
    if (type === 'geography') return 'country';
    if (type === 'program') return 'program';
    if (type === 'lead_score') return 'score';
    return null;
  }

  private validateRule(dto: Partial<LeadRoutingRule>) {
    if (!dto.ruleType || !(ROUTING_RULE_TYPES as readonly string[]).includes(dto.ruleType)) {
      throw new BadRequestException(`ruleType must be one of ${ROUTING_RULE_TYPES.join(', ')}`);
    }
    if (dto.ruleType !== 'load_balancing' && !(dto.value ?? '').toString().trim()) {
      throw new BadRequestException('A criteria value is required for this rule type');
    }
    if (dto.ruleType === 'lead_score' && Number.isNaN(Number(dto.value))) {
      throw new BadRequestException('Lead score rules need a numeric value');
    }
    if ((!dto.assigneeIds || dto.assigneeIds.length === 0) && !dto.assigneeRole) {
      throw new BadRequestException('Choose at least one counselor or a role pool to assign to');
    }
  }

  private async validateAssignees(orgId: string, ids?: string[]) {
    if (!ids || ids.length === 0) return;
    const users = await this.userRepository.find({ where: { id: In(ids), organizationId: orgId } });
    if (users.length !== new Set(ids).size) {
      throw new BadRequestException('All assignees must be users of this organization');
    }
  }

  // ---------------------------------------------------------------------------
  // Routing engine
  // ---------------------------------------------------------------------------

  private ruleMatches(rule: LeadRoutingRule, lead: Lead): boolean {
    const values = (rule.value ?? '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const op = (rule.operator || 'in').toLowerCase();
    switch (rule.ruleType) {
      case 'geography': {
        const field = (rule.field || 'country') as 'country' | 'state' | 'city';
        const actual = ((lead as any)[field] ?? '').toString().trim().toLowerCase();
        if (!actual) return false;
        return op === 'neq' || op === 'not_in' ? !values.includes(actual) : values.includes(actual);
      }
      case 'program': {
        const actual = [lead.courseId, lead.programInterest]
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase());
        if (actual.length === 0) return false;
        return actual.some((a) => values.includes(a) || values.some((v) => a.includes(v)));
      }
      case 'lead_score': {
        if (lead.score === null || lead.score === undefined) return false;
        const threshold = Number(rule.value);
        return op === 'lte' ? lead.score <= threshold : lead.score >= threshold;
      }
      case 'load_balancing':
        return true;
      default:
        return false;
    }
  }

  describeRule(rule: LeadRoutingRule): string {
    const dist = rule.distribution === 'load_based' ? 'load-based' : 'round robin';
    const target =
      rule.assigneeIds?.length > 0
        ? `${rule.assigneeIds.length} selected counselor(s)`
        : ROLE_LABEL[rule.assigneeRole || ''] || rule.assigneeRole || 'team';
    let criteria = '';
    switch (rule.ruleType) {
      case 'geography':
        criteria = `Geography: ${rule.field || 'country'} ${rule.operator === 'neq' || rule.operator === 'not_in' ? 'not in' : '='} ${rule.value}`;
        break;
      case 'program':
        criteria = `Program interest in ${rule.value}`;
        break;
      case 'lead_score':
        criteria = `Lead score ${rule.operator === 'lte' ? '<=' : '>='} ${rule.value}`;
        break;
      default:
        criteria = 'Load balancing';
    }
    return `${rule.name} — ${criteria} → ${target} (${dist})`;
  }

  private async poolFor(orgId: string, assigneeIds: string[] | null | undefined, role: string | null | undefined) {
    if (assigneeIds && assigneeIds.length > 0) {
      const users = await this.userRepository.find({
        where: { id: In(assigneeIds), organizationId: orgId, isActive: true },
      });
      // keep the configured order for a stable round robin
      return assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
    }
    if (!role) return [];
    return this.userRepository.find({
      where: { organizationId: orgId, role: role as Role, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  private async pick(pool: User[], mode: DistributionMode, lastUserId: string | null, orgId: string): Promise<User> {
    if (pool.length === 1) return pool[0];
    if (mode === 'load_based') {
      const rows: { assigned_to: string; cnt: string }[] = await this.leadRepository
        .createQueryBuilder('lead')
        .select('lead.assigned_to', 'assigned_to')
        .addSelect('COUNT(*)', 'cnt')
        .where('lead.organization_id = :orgId', { orgId })
        .andWhere('lead.assigned_to IN (:...ids)', { ids: pool.map((u) => u.id) })
        .andWhere('lead.status NOT IN (:...closed)', { closed: OPEN_STATUSES_EXCLUDED })
        .groupBy('lead.assigned_to')
        .getRawMany();
      const load = new Map(rows.map((r) => [r.assigned_to, Number(r.cnt)]));
      return [...pool].sort((a, b) => (load.get(a.id) || 0) - (load.get(b.id) || 0))[0];
    }
    const lastIndex = lastUserId ? pool.findIndex((u) => u.id === lastUserId) : -1;
    return pool[(lastIndex + 1) % pool.length];
  }

  /**
   * Runs the org's routing rules in priority order; first rule with a non-empty pool wins.
   * Falls back to the default distribution over `fallbackRole` (or the org default role).
   */
  async route(lead: Lead, fallbackRole?: Role): Promise<AssignmentResult | null> {
    const orgId = lead.organizationId;
    const rules = await this.ruleRepository.find({
      where: { organizationId: orgId, isActive: true },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });

    for (const rule of rules) {
      if (!this.ruleMatches(rule, lead)) continue;
      const pool = await this.poolFor(orgId, rule.assigneeIds, rule.assigneeRole);
      if (pool.length === 0) continue;
      const user = await this.pick(pool, rule.distribution, rule.lastAssignedUserId, orgId);
      await this.ruleRepository.update(rule.id, { lastAssignedUserId: user.id });
      return {
        userId: user.id,
        userName: user.name,
        timestamp: new Date(),
        ruleText: this.describeRule(rule),
        ruleId: rule.id,
      };
    }

    const settings = await this.settingsService.get(orgId);
    const role = fallbackRole || (settings.defaultAssigneeRole as Role) || Role.LEAD_MANAGER;
    const pool = await this.poolFor(orgId, null, role);
    if (pool.length === 0) return null;

    // round-robin cursor for the fallback = last lead assigned to a user of this role
    const lastLead = await this.leadRepository
      .createQueryBuilder('lead')
      .leftJoin('lead.assignedToUser', 'assignedToUser')
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere('assignedToUser.role = :role', { role })
      .andWhere('lead.assigned_at IS NOT NULL')
      .orderBy('lead.assigned_at', 'DESC')
      .getOne();
    const user = await this.pick(pool, settings.defaultDistribution, lastLead?.assignedTo ?? null, orgId);
    const dist = settings.defaultDistribution === 'load_based' ? 'load-based' : 'round robin';
    return {
      userId: user.id,
      userName: user.name,
      timestamp: new Date(),
      ruleText: `Default — no routing rule matched → ${ROLE_LABEL[role] || role} (${dist})`,
      ruleId: null,
    };
  }

  /**
   * Backwards-compatible entry point used by the verification handoff
   * (role=COUNSELOR) and legacy intake (role=LEAD_MANAGER).
   */
  async assignLead(lead: Lead, role: Role = Role.LEAD_MANAGER) {
    return this.route(lead, role);
  }
}
