import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('organization_settings')
export class OrganizationIntegrationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'smtp_host', type: 'varchar', length: 255, nullable: true })
  smtpHost: string | null;

  @Column({ name: 'smtp_port', type: 'int', nullable: true })
  smtpPort: number | null;

  @Column({ name: 'smtp_user', type: 'varchar', length: 255, nullable: true })
  smtpUser: string | null;

  @Column({ name: 'smtp_pass', type: 'varchar', length: 255, nullable: true })
  smtpPass: string | null;

  @Column({ name: 'smtp_from_email', type: 'varchar', length: 255, nullable: true })
  smtpFromEmail: string | null;

  @Column({ name: 'smtp_from_name', type: 'varchar', length: 255, nullable: true })
  smtpFromName: string | null;

  @Column({ name: 'razorpay_key_id', type: 'varchar', length: 255, nullable: true })
  razorpayKeyId: string | null;

  @Column({ name: 'razorpay_key_secret', type: 'varchar', length: 255, nullable: true })
  razorpayKeySecret: string | null;

  @Column({ name: 'razorpay_webhook_secret', type: 'varchar', length: 255, nullable: true })
  razorpayWebhookSecret: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
