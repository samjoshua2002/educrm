import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** Consent / opt-in status per mobile number and channel. */
@Entity('messaging_consents')
@Index(['organizationId', 'mobileNumber', 'channel'], { unique: true })
export class MessagingConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** National number, digits only */
  @Column({ name: 'mobile_number', length: 30 })
  mobileNumber: string;

  @Column({ name: 'country_code', length: 6, default: '91' })
  countryCode: string;

  /** 'SMS' | 'WhatsApp' */
  @Column({ length: 20 })
  channel: string;

  /** 'Opted In' | 'Opted Out' */
  @Column({ length: 20 })
  status: string;

  /** e.g. 'Application form', 'Inbound STOP keyword', 'Manual (staff)' */
  @Column({ type: 'varchar', length: 150, nullable: true })
  source: string | null;

  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string | null;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @Column({ name: 'preferred_language', type: 'varchar', length: 50, nullable: true })
  preferredLanguage: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
