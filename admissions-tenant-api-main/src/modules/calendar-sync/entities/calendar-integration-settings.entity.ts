import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';

// Per-organisation OAuth app credentials for Google Calendar and Microsoft
// Outlook (Graph). One row per org, edited from Settings > Calendar.
@Entity('calendar_integration_settings')
export class CalendarIntegrationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', unique: true })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Google Cloud OAuth client (type "Web application")
  @Column({ name: 'google_enabled', type: 'boolean', default: false })
  googleEnabled: boolean;

  @Column({ name: 'google_client_id', type: 'varchar', length: 255, nullable: true })
  googleClientId: string | null;

  @Column({ name: 'google_client_secret', type: 'text', nullable: true, select: false })
  googleClientSecret: string | null;

  // Microsoft Entra ID (Azure AD) app registration
  @Column({ name: 'microsoft_enabled', type: 'boolean', default: false })
  microsoftEnabled: boolean;

  @Column({ name: 'microsoft_client_id', type: 'varchar', length: 255, nullable: true })
  microsoftClientId: string | null;

  @Column({ name: 'microsoft_client_secret', type: 'text', nullable: true, select: false })
  microsoftClientSecret: string | null;

  // 'common' (any account), 'organizations', 'consumers' or a tenant id
  @Column({ name: 'microsoft_tenant_id', type: 'varchar', length: 100, default: 'common' })
  microsoftTenantId: string;

  // OAuth redirect URI registered with both providers. Empty = derived from
  // API_PUBLIC_URL (or http://localhost:PORT) + /api/calendar-sync/oauth/callback.
  @Column({ name: 'redirect_uri', type: 'varchar', length: 500, nullable: true })
  redirectUri: string | null;

  // Ask the provider for a Google Meet / Teams link for virtual interviews
  // that do not already have a meeting link.
  @Column({ name: 'auto_meeting_link', type: 'boolean', default: true })
  autoMeetingLink: boolean;

  // Send calendar invitations to the candidate as an attendee.
  @Column({ name: 'invite_candidate', type: 'boolean', default: true })
  inviteCandidate: boolean;

  // Free/busy look-ahead used to fill Availability_Window.
  @Column({ name: 'availability_days', type: 'int', default: 14 })
  availabilityDays: number;

  @Column({ name: 'workday_start', type: 'varchar', length: 5, default: '09:00' })
  workdayStart: string;

  @Column({ name: 'workday_end', type: 'varchar', length: 5, default: '18:00' })
  workdayEnd: string;

  @Column({ name: 'time_zone', type: 'varchar', length: 50, default: 'Asia/Kolkata' })
  timeZone: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
