import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Branch } from '../../branches/entities/branch.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Form } from '../../forms/entities/form.entity.js';

export enum LeadStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  DISQUALIFIED = 'disqualified',
  WORKING = 'working',
  CONVERTED = 'converted',
  CLOSED = 'closed',
  /** Duplicate record folded into a master lead (kept for history) */
  MERGED = 'merged',
}

/** Scope: Channel Source dropdown */
export const CHANNEL_SOURCES = ['Web', 'Social', 'Portal', 'Event', 'Chatbot'] as const;
/** Scope: Source Type dropdown */
export const SOURCE_TYPES = ['Paid Ads', 'Organic', 'Referral', 'Event', 'Portal'] as const;
/** Scope: Created From (Web, API, Import, Chatbot, etc.) */
export const CREATED_FROM_VALUES = ['Web', 'API', 'Import', 'Chatbot', 'Social', 'Portal', 'Event', 'Manual'] as const;
/** Scope: Follow-up Status dropdown */
export const FOLLOW_UP_STATUSES = ['Pending', 'Contacted', 'Scheduled'] as const;

export interface TouchPoint {
  at: string;
  channelSource?: string | null;
  sourceType?: string | null;
  subSource?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  formName?: string | null;
  submissionUrl?: string | null;
  referrerUrl?: string | null;
  createdFrom?: string | null;
}

export interface ScoreBreakdownItem {
  ruleId: string;
  category: string;
  label: string;
  points: number;
  scoreType: string;
}

export enum LeadScoreBand {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
}

export enum LeadClosureReason {
  NOT_INTERESTED = 'not_interested',
  ENROLLED_ELSEWHERE = 'enrolled_elsewhere',
  UNREACHABLE = 'unreachable',
  INVALID_CONTACT = 'invalid_contact',
  DO_NOT_CALL = 'do_not_call',
  FINANCIAL_CONSTRAINTS = 'financial_constraints',
  TIMING_MISMATCH = 'timing_mismatch',
  OTHER = 'other',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  source: string;

  @Column({ name: 'source_detail', type: 'text', nullable: true })
  sourceDetail: string;

  @Column({ name: 'utm_source', length: 100, nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', length: 100, nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', length: 100, nullable: true })
  utmCampaign: string;

  @Column({ name: 'form_id', type: 'uuid', nullable: true })
  formId: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId: string;

  @Column({ name: 'is_duplicate', default: false })
  isDuplicate: boolean;

  @Column({ name: 'duplicate_count', default: 0 })
  duplicateCount: number;

  @Column({ name: 'raw_payload', type: 'jsonb', default: '{}' })
  rawPayload: any;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedToUser: User;

  @Column({ name: 'assigned_at', nullable: true })
  assignedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: LeadStatus.UNVERIFIED,
  })
  status: LeadStatus;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ name: 'verified_at', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ name: 'score_band', type: 'varchar', length: 20, nullable: true })
  scoreBand: LeadScoreBand;

  @Column({ name: 'next_follow_up_at', nullable: true })
  nextFollowUpAt: Date;

  @Column({ name: 'closure_reason', type: 'varchar', length: 100, nullable: true })
  closureReason: LeadClosureReason | null;

  @Column({ name: 'closure_notes', type: 'text', nullable: true })
  closureNotes: string | null;

  // ---------------------------------------------------------------------
  // Lead capture (scope 1: Fields to capture)
  // ---------------------------------------------------------------------

  /** Web | Social | Portal | Event | Chatbot */
  @Column({ name: 'channel_source', type: 'varchar', length: 20, nullable: true })
  channelSource: string | null;

  /** Source form identifier */
  @Column({ name: 'form_name', type: 'varchar', length: 255, nullable: true })
  formName: string | null;

  /** Program / Course interest (display name; courseId holds the reference when known) */
  @Column({ name: 'program_interest', type: 'varchar', length: 255, nullable: true })
  programInterest: string | null;

  /** Intake / Session, e.g. Fall 2025 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  intake: string | null;

  @Column({ name: 'intake_session_id', type: 'uuid', nullable: true })
  intakeSessionId: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  /** Unique student ID (portal / exam registration id) used for duplicate detection */
  @Column({ name: 'student_id', type: 'varchar', length: 100, nullable: true })
  studentId: string | null;

  @Column({ name: 'utm_term', type: 'varchar', length: 150, nullable: true })
  utmTerm: string | null;

  @Column({ name: 'utm_content', type: 'varchar', length: 150, nullable: true })
  utmContent: string | null;

  @Column({ name: 'submission_url', type: 'text', nullable: true })
  submissionUrl: string | null;

  @Column({ name: 'referrer_url', type: 'text', nullable: true })
  referrerUrl: string | null;

  // ---------------------------------------------------------------------
  // Lead source tracking (scope 2)
  // ---------------------------------------------------------------------

  /** Paid Ads | Organic | Referral | Event | Portal */
  @Column({ name: 'source_type', type: 'varchar', length: 30, nullable: true })
  sourceType: string | null;

  @Column({ name: 'campaign_name', type: 'varchar', length: 255, nullable: true })
  campaignName: string | null;

  /** Specific platform, e.g. Google, Facebook, Shiksha */
  @Column({ name: 'sub_source', type: 'varchar', length: 100, nullable: true })
  subSource: string | null;

  /** Web, API, Import, Chatbot, ... */
  @Column({ name: 'created_from', type: 'varchar', length: 30, nullable: true })
  createdFrom: string | null;

  @Column({ name: 'first_touch', type: 'jsonb', nullable: true })
  firstTouch: TouchPoint | null;

  @Column({ name: 'last_touch', type: 'jsonb', nullable: true })
  lastTouch: TouchPoint | null;

  @Column({ name: 'touch_count', type: 'int', default: 1 })
  touchCount: number;

  // ---------------------------------------------------------------------
  // Lead scoring (scope 3)
  // ---------------------------------------------------------------------

  /** GMAT / GRE / other */
  @Column({ name: 'test_type', type: 'varchar', length: 30, nullable: true })
  testType: string | null;

  @Column({ name: 'test_score', type: 'decimal', precision: 7, scale: 2, nullable: true })
  testScore: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  gpa: number | null;

  @Column({ name: 'work_experience_years', type: 'decimal', precision: 4, scale: 1, nullable: true })
  workExperienceYears: number | null;

  @Column({ name: 'academic_score', type: 'int', nullable: true })
  academicScore: number | null;

  @Column({ name: 'engagement_score', type: 'int', nullable: true })
  engagementScore: number | null;

  @Column({ name: 'last_scored_at', type: 'timestamp', nullable: true })
  lastScoredAt: Date | null;

  /** Rule-by-rule breakdown of the last scoring run */
  @Column({ name: 'score_breakdown', type: 'jsonb', nullable: true })
  scoreBreakdown: ScoreBreakdownItem[] | null;

  /** Engagement counters: emailOpen, emailReply, webinar, eventAttended, chat, formSubmission */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  engagement: Record<string, number>;

  @Column({ name: 'email_bounced', default: false })
  emailBounced: boolean;

  // ---------------------------------------------------------------------
  // Assignment & routing (scope 4)
  // ---------------------------------------------------------------------

  /** Text of the routing rule logic applied for the current assignment */
  @Column({ name: 'assignment_rule', type: 'text', nullable: true })
  assignmentRule: string | null;

  /** Pending | Contacted | Scheduled */
  @Column({ name: 'follow_up_status', type: 'varchar', length: 20, default: 'Pending' })
  followUpStatus: string;

  // ---------------------------------------------------------------------
  // Duplicate check & merge (scope 5)
  // ---------------------------------------------------------------------

  /** Lead ID retained after merge (or suspected master for a flagged duplicate) */
  @Column({ name: 'master_lead_id', type: 'uuid', nullable: true })
  masterLeadId: string | null;

  @Column({ name: 'merged_at', type: 'timestamp', nullable: true })
  mergedAt: Date | null;

  /** Confidence level (0-100%) */
  @Column({ name: 'duplicate_confidence', type: 'int', nullable: true })
  duplicateConfidence: number | null;

  @Column({ name: 'duplicate_reason', type: 'varchar', length: 255, nullable: true })
  duplicateReason: string | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  // No physical FK constraint: historical leads may reference forms that
  // have since been deleted, and form_id should remain a soft reference.
  @ManyToOne(() => Form, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'form_id' })
  form: Form;
}
