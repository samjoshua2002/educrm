import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, ILike } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AcademicSession } from '../academic-sessions/entities/academic-session.entity.js';
import { Role } from '../../common/enums/roles.enum.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { DecisionSettings } from './entities/decision-settings.entity.js';
import { DecisionCommitteeTeam } from './entities/decision-committee-team.entity.js';
import { CommitteeTeamDto, UpdateDecisionSettingsDto } from './dto/decision.dto.js';

const DEFAULT_SEAT_BOOKING_FEE = 5000;
export const NOTIFY_MODULE = 'admissions_decisions';

// Escapes LIKE wildcards so an email such as "a_b@x.com" only matches itself.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export interface Actor {
  sub: string;
  role: string;
  email?: string;
  organizationId?: string | null;
}

// Shared helpers for the decision / offer workflow: application lookup,
// per-org settings, committee teams, approver rules, picklists and in-app
// notifications to staff and applicants.
@Injectable()
export class DecisionSupportService {
  private readonly logger = new Logger(DecisionSupportService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(AcademicSession)
    private readonly sessionRepo: Repository<AcademicSession>,
    @InjectRepository(DecisionSettings)
    private readonly settingsRepo: Repository<DecisionSettings>,
    @InjectRepository(DecisionCommitteeTeam)
    private readonly teamRepo: Repository<DecisionCommitteeTeam>,
    private readonly notifications: InAppNotificationsService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  async findApplication(orgId: string, applicationNo: string): Promise<Application> {
    const application = await this.applicationRepo.findOne({ where: { applicationNo, organizationId: orgId } });
    if (!application) throw new NotFoundException(`Application ${applicationNo} not found`);
    return application;
  }

  async findApplicationById(id: string): Promise<Application | null> {
    return this.applicationRepo.findOne({ where: { id } });
  }

  async saveApplication(application: Application) {
    return this.applicationRepo.save(application);
  }

  async organizationName(orgId: string): Promise<string> {
    const org = await this.organizationRepo.findOne({ where: { id: orgId } });
    return org?.name || '';
  }

  portalUrl(path = ''): string {
    const base = (this.config.get<string>('STUDENT_PORTAL_URL') || this.config.get<string>('FRONTEND_URL') || '').replace(/\/$/, '');
    return `${base}${path}`;
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(orgId: string): Promise<DecisionSettings> {
    let s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s) {
      s = await this.settingsRepo.save(this.settingsRepo.create({ organizationId: orgId }));
    }
    return s;
  }

  async updateSettings(orgId: string, dto: UpdateDecisionSettingsDto) {
    await this.assertOrgUsers(orgId, dto.approverUserIds);
    const s = await this.getSettings(orgId);
    Object.assign(s, dto);
    return this.settingsRepo.save(s);
  }

  async seatBookingFee(orgId: string): Promise<number> {
    const s = await this.getSettings(orgId);
    if (s.seatBookingFee !== null && s.seatBookingFee !== undefined) return Number(s.seatBookingFee);
    const org = await this.organizationRepo.findOne({ where: { id: orgId } });
    return Number((org?.settings as any)?.seatBookingFee ?? DEFAULT_SEAT_BOOKING_FEE);
  }

  // Approvers: superadmin, org admins, and users listed in the settings.
  async isApprover(orgId: string, actor: Actor): Promise<boolean> {
    if (actor.role === Role.SUPERADMIN || actor.role === Role.ORG_ADMIN) return true;
    const s = await this.getSettings(orgId);
    return (s.approverUserIds || []).includes(actor.sub);
  }

  // ---------------------------------------------------------------------------
  // Committee teams
  // ---------------------------------------------------------------------------

  listTeams(orgId: string) {
    return this.teamRepo.find({ where: { organizationId: orgId }, order: { name: 'ASC' } });
  }

  async createTeam(orgId: string, dto: CommitteeTeamDto) {
    await this.assertOrgUsers(orgId, dto.memberIds);
    return this.teamRepo.save(
      this.teamRepo.create({
        organizationId: orgId,
        name: dto.name,
        description: dto.description ?? null,
        memberIds: dto.memberIds ?? [],
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async updateTeam(orgId: string, id: string, dto: Partial<CommitteeTeamDto>) {
    const team = await this.teamRepo.findOne({ where: { id, organizationId: orgId } });
    if (!team) throw new NotFoundException('Committee team not found');
    if (dto.name !== undefined) team.name = dto.name;
    if (dto.description !== undefined) team.description = dto.description;
    if (dto.memberIds !== undefined) {
      await this.assertOrgUsers(orgId, dto.memberIds);
      team.memberIds = dto.memberIds;
    }
    if (dto.isActive !== undefined) team.isActive = dto.isActive;
    return this.teamRepo.save(team);
  }

  async deleteTeam(orgId: string, id: string) {
    const team = await this.teamRepo.findOne({ where: { id, organizationId: orgId } });
    if (!team) throw new NotFoundException('Committee team not found');
    await this.teamRepo.remove(team);
    return { id };
  }

  // All user ids on a committee: direct users plus members of active teams.
  async committeeMemberIds(orgId: string, userIds: string[], teamIds: string[]): Promise<string[]> {
    const ids = new Set(userIds || []);
    if (teamIds?.length) {
      const teams = await this.teamRepo.find({ where: { organizationId: orgId, id: In(teamIds), isActive: true } });
      teams.forEach((t) => (t.memberIds || []).forEach((m) => ids.add(m)));
    }
    return [...ids];
  }

  // Users / teams given in a request body must belong to this organization.
  async assertOrgUsers(orgId: string, userIds?: string[] | null) {
    const ids = [...new Set(userIds || [])];
    if (!ids.length) return;
    const count = await this.userRepo.count({ where: { id: In(ids), organizationId: orgId } });
    if (count !== ids.length) throw new BadRequestException('One or more users do not belong to this organization.');
  }

  async assertOrgTeams(orgId: string, teamIds?: string[] | null) {
    const ids = [...new Set(teamIds || [])];
    if (!ids.length) return;
    const count = await this.teamRepo.count({ where: { id: In(ids), organizationId: orgId } });
    if (count !== ids.length) throw new BadRequestException('One or more committee teams do not belong to this organization.');
  }

  async userNames(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const users = await this.userRepo.find({ where: { id: In(ids) } });
    return Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  // ---------------------------------------------------------------------------
  // Picklists for the UI
  // ---------------------------------------------------------------------------

  async picklists(orgId: string) {
    const [courses, sessions, users, teams, settings] = await Promise.all([
      this.courseRepo.find({ where: { organizationId: orgId, isActive: true }, order: { name: 'ASC' } }),
      this.sessionRepo.find({ where: { organizationId: orgId }, order: { startDate: 'DESC' } }),
      this.userRepo.find({
        where: { organizationId: orgId, role: Not(Role.STUDENT), isActive: true },
        order: { name: 'ASC' },
      }),
      this.listTeams(orgId),
      this.getSettings(orgId),
    ]);
    return {
      programs: courses.map((c) => ({ id: c.id, name: c.name, code: c.code })),
      intakes: sessions.map((s) => ({ id: s.id, name: s.displayName || s.name, isCurrent: s.isCurrent })),
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
      teams: teams.map((t) => ({ id: t.id, name: t.name, memberIds: t.memberIds, isActive: t.isActive })),
      approverUserIds: settings.approverUserIds || [],
    };
  }

  // ---------------------------------------------------------------------------
  // Notifications (never throw)
  // ---------------------------------------------------------------------------

  async notifyStaff(input: {
    organizationId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    relatedEntityId?: string;
    severity?: 'info' | 'success' | 'warning' | 'critical';
    metadata?: Record<string, any>;
    userIds?: string[];
  }) {
    const base = {
      organizationId: input.organizationId,
      module: NOTIFY_MODULE,
      type: input.type,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      metadata: input.metadata ?? null,
    };
    await this.notifications.notify({ ...base, recipientRole: Role.ORG_ADMIN });
    await this.notifications.notify({ ...base, recipientRole: Role.APPLICATION_MANAGER });
    for (const userId of input.userIds || []) {
      await this.notifications.notify({ ...base, recipientUserId: userId });
    }
  }

  async notifyApplicant(application: Application, input: {
    type: string;
    title: string;
    body?: string;
    link?: string;
    severity?: 'info' | 'success' | 'warning' | 'critical';
    relatedEntityId?: string;
  }) {
    try {
      if (!application.email) return;
      const student = await this.userRepo.findOne({
        where: { email: ILike(escapeLike(application.email.trim())), role: Role.STUDENT },
      });
      if (!student) return;
      await this.notifications.notify({
        organizationId: application.organizationId,
        recipientUserId: student.id,
        module: NOTIFY_MODULE,
        type: input.type,
        severity: input.severity ?? 'info',
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? '/results',
        relatedEntityId: input.relatedEntityId ?? application.id,
        metadata: { applicationNo: application.applicationNo },
      });
    } catch (err) {
      this.logger.warn(`Could not notify applicant ${application.applicationNo}: ${(err as Error).message}`);
    }
  }
}
