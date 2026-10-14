import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export interface PortalIntegration {
  id: string;
  /** e.g. Shiksha, CollegeDunia, Careers360, Study Abroad portal */
  name: string;
  /** secret key used in the partner endpoint URL */
  key: string;
  isActive: boolean;
  createdAt: string;
  lastReceivedAt?: string | null;
  leadsReceived?: number;
}

export const DEFAULT_ENABLED_CHANNELS: Record<string, boolean> = {
  web: true,
  social: true,
  portal: true,
  event: true,
  chatbot: true,
  api: true,
};

/**
 * Per-organization lead capture configuration: API key for web / landing page /
 * chatbot / generic API webhooks, Meta (Facebook/Instagram) Lead Ads and LinkedIn
 * Lead Gen credentials, and education-portal partner keys.
 */
@Entity('lead_capture_settings')
export class LeadCaptureSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  /** Secret key embedded in the org's capture webhook URLs */
  @Index({ unique: true })
  @Column({ name: 'api_key', length: 64 })
  apiKey: string;

  /** Channel toggles: web, social, portal, event, chatbot, api */
  @Column({ name: 'enabled_channels', type: 'jsonb', nullable: true })
  enabledChannels: Record<string, boolean> | null;

  // ---- Meta (Facebook / Instagram) Lead Ads ----
  /** Token Meta echoes back in the webhook verification handshake (hub.verify_token) */
  @Column({ name: 'facebook_verify_token', type: 'varchar', length: 100, nullable: true })
  facebookVerifyToken: string | null;

  /** App secret — used to verify X-Hub-Signature-256 on webhook calls */
  @Column({ name: 'facebook_app_secret', type: 'varchar', length: 255, nullable: true })
  facebookAppSecret: string | null;

  /** Long-lived Page access token with leads_retrieval permission */
  @Column({ name: 'facebook_page_access_token', type: 'text', nullable: true })
  facebookPageAccessToken: string | null;

  @Column({ name: 'facebook_page_id', type: 'varchar', length: 100, nullable: true })
  facebookPageId: string | null;

  /** Lead form ids to pull with "Sync now" */
  @Column({ name: 'facebook_form_ids', type: 'jsonb', default: () => "'[]'" })
  facebookFormIds: string[];

  @Column({ name: 'facebook_graph_version', type: 'varchar', length: 20, default: 'v19.0' })
  facebookGraphVersion: string;

  @Column({ name: 'facebook_last_sync_at', type: 'timestamp', nullable: true })
  facebookLastSyncAt: Date | null;

  // ---- LinkedIn Lead Gen Forms ----
  /** Client secret of the LinkedIn app — webhook challenge + X-LI-Signature validation */
  @Column({ name: 'linkedin_client_secret', type: 'varchar', length: 255, nullable: true })
  linkedinClientSecret: string | null;

  /** OAuth access token with r_marketing_leadgen_automation scope */
  @Column({ name: 'linkedin_access_token', type: 'text', nullable: true })
  linkedinAccessToken: string | null;

  @Column({ name: 'linkedin_api_version', type: 'varchar', length: 10, default: '202405' })
  linkedinApiVersion: string;

  // ---- Education portals ----
  @Column({ type: 'jsonb', default: () => "'[]'" })
  portals: PortalIntegration[];

  // ---- Chatbot qualification ----
  /** Minimum visitor messages before a conversation counts as qualified */
  @Column({ name: 'chatbot_min_messages', type: 'int', default: 2 })
  chatbotMinMessages: number;

  /** Require an email or phone to qualify */
  @Column({ name: 'chatbot_require_contact', default: true })
  chatbotRequireContact: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
