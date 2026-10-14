import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Per-organization SMS / WhatsApp provider credentials.
 * SMS: Twilio or MSG91. WhatsApp: Twilio (WhatsApp sender) or Gupshup.
 */
@Entity('messaging_settings')
export class MessagingSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** 'twilio' | 'msg91' | null (disabled) */
  @Column({ name: 'sms_provider', type: 'varchar', length: 20, nullable: true })
  smsProvider: string | null;

  /** 'twilio' | 'gupshup' | null (disabled) */
  @Column({ name: 'whatsapp_provider', type: 'varchar', length: 20, nullable: true })
  whatsappProvider: string | null;

  @Column({ name: 'default_country_code', type: 'varchar', length: 6, default: '91' })
  defaultCountryCode: string;

  @Column({ name: 'default_time_zone', type: 'varchar', length: 64, default: 'Asia/Kolkata' })
  defaultTimeZone: string;

  /** Marketing messages require an explicit opt-in when true (recommended). */
  @Column({ name: 'require_opt_in_for_marketing', default: true })
  requireOptInForMarketing: boolean;

  /** Every message type requires explicit opt-in when true. */
  @Column({ name: 'require_opt_in_for_all', default: false })
  requireOptInForAll: boolean;

  // ── Twilio (SMS + WhatsApp) ─────────────────────────────────────────────
  @Column({ name: 'twilio_account_sid', type: 'varchar', length: 100, nullable: true })
  twilioAccountSid: string | null;

  @Column({ name: 'twilio_auth_token', type: 'varchar', length: 255, nullable: true })
  twilioAuthToken: string | null;

  /** E.164 sender number for SMS, e.g. +14155550100 */
  @Column({ name: 'twilio_sms_from', type: 'varchar', length: 40, nullable: true })
  twilioSmsFrom: string | null;

  /** Optional Messaging Service SID used instead of a From number */
  @Column({ name: 'twilio_messaging_service_sid', type: 'varchar', length: 100, nullable: true })
  twilioMessagingServiceSid: string | null;

  /** WhatsApp-enabled sender, e.g. +14155238886 */
  @Column({ name: 'twilio_whatsapp_from', type: 'varchar', length: 40, nullable: true })
  twilioWhatsappFrom: string | null;

  // ── Gupshup (WhatsApp) ──────────────────────────────────────────────────
  @Column({ name: 'gupshup_api_key', type: 'varchar', length: 255, nullable: true })
  gupshupApiKey: string | null;

  @Column({ name: 'gupshup_source_number', type: 'varchar', length: 40, nullable: true })
  gupshupSourceNumber: string | null;

  @Column({ name: 'gupshup_app_name', type: 'varchar', length: 120, nullable: true })
  gupshupAppName: string | null;

  // ── MSG91 (SMS) ─────────────────────────────────────────────────────────
  @Column({ name: 'msg91_auth_key', type: 'varchar', length: 255, nullable: true })
  msg91AuthKey: string | null;

  @Column({ name: 'msg91_sender_id', type: 'varchar', length: 20, nullable: true })
  msg91SenderId: string | null;

  /** MSG91 Flow template id (DLT approved). The message text is passed as variable `message`. */
  @Column({ name: 'msg91_flow_id', type: 'varchar', length: 100, nullable: true })
  msg91FlowId: string | null;

  /** Optional DLT entity id (India). */
  @Column({ name: 'msg91_dlt_entity_id', type: 'varchar', length: 100, nullable: true })
  msg91DltEntityId: string | null;

  /** Secret token embedded in provider webhook URLs (delivery status / inbound). */
  @Column({ name: 'webhook_token', type: 'varchar', length: 64, nullable: true })
  webhookToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
