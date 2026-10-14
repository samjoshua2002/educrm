import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface AgentLine {
  userId: string;
  /** Agent phone (Exotel "From" / Twilio first leg) */
  phone?: string | null;
  extension?: string | null;
  department?: string | null;
}

export interface TagRule {
  keyword: string;
  tag: string;
}

/** Per-organization telephony provider settings (Exotel / Twilio Voice). */
@Entity('telephony_settings')
export class TelephonySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** 'exotel' | 'twilio' | null (click-to-call disabled) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  provider: string | null;

  @Column({ name: 'default_country_code', length: 6, default: '91' })
  defaultCountryCode: string;

  @Column({ name: 'record_calls', default: true })
  recordCalls: boolean;

  /** Inbound calls are forwarded here (Twilio) when no agent line answers */
  @Column({ name: 'inbound_forward_number', type: 'varchar', length: 40, nullable: true })
  inboundForwardNumber: string | null;

  @Column({ name: 'default_department', type: 'varchar', length: 120, nullable: true })
  defaultDepartment: string | null;

  // ── Exotel ─────────────────────────────────────────────────────────────
  @Column({ name: 'exotel_account_sid', type: 'varchar', length: 100, nullable: true })
  exotelAccountSid: string | null;

  @Column({ name: 'exotel_api_key', type: 'varchar', length: 255, nullable: true })
  exotelApiKey: string | null;

  @Column({ name: 'exotel_api_token', type: 'varchar', length: 255, nullable: true })
  exotelApiToken: string | null;

  /** api.exotel.com (Singapore) or api.in.exotel.com (Mumbai) */
  @Column({ name: 'exotel_subdomain', type: 'varchar', length: 100, default: 'api.exotel.com' })
  exotelSubdomain: string;

  /** ExoPhone / virtual number used as caller id */
  @Column({ name: 'exotel_caller_id', type: 'varchar', length: 40, nullable: true })
  exotelCallerId: string | null;

  // ── Twilio Voice ───────────────────────────────────────────────────────
  @Column({ name: 'twilio_account_sid', type: 'varchar', length: 100, nullable: true })
  twilioAccountSid: string | null;

  @Column({ name: 'twilio_auth_token', type: 'varchar', length: 255, nullable: true })
  twilioAuthToken: string | null;

  /** Twilio voice number (E.164) used as caller id */
  @Column({ name: 'twilio_caller_id', type: 'varchar', length: 40, nullable: true })
  twilioCallerId: string | null;

  // ── Automation defaults ────────────────────────────────────────────────
  @Column({ name: 'auto_sms_after_missed_call', default: false })
  autoSmsAfterMissedCall: boolean;

  @Column({ name: 'missed_call_sms_text', type: 'text', nullable: true })
  missedCallSmsText: string | null;

  @Column({ name: 'auto_create_follow_up_task', default: true })
  autoCreateFollowUpTask: boolean;

  /** Default follow-up due in N days when none is given */
  @Column({ name: 'follow_up_days', type: 'int', default: 1 })
  followUpDays: number;

  @Column({ name: 'auto_tag_applicant', default: false })
  autoTagApplicant: boolean;

  /** Keyword → tag rules applied to transcription + agent notes */
  @Column({ name: 'tag_rules', type: 'jsonb', default: () => "'[]'" })
  tagRules: TagRule[];

  /** Agent phone lines / extensions / departments */
  @Column({ name: 'agent_lines', type: 'jsonb', default: () => "'[]'" })
  agentLines: AgentLine[];

  /** Secret token embedded in provider webhook URLs */
  @Column({ name: 'webhook_token', type: 'varchar', length: 64, nullable: true })
  webhookToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
