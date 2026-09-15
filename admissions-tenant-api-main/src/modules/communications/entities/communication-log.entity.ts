import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('communication_logs')
export class CommunicationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Index()
  @Column({ name: 'application_no', type: 'varchar', length: 100, nullable: true })
  applicationNo: string | null;

  @Column({ name: 'applicant_name', type: 'varchar', length: 255, nullable: true })
  applicantName: string | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail: string | null;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 50, nullable: true })
  recipientPhone: string | null;

  @Column({ length: 50, default: 'Email' })
  channel: string; // 'Email' | 'SMS' | 'WhatsApp'

  @Column({ type: 'varchar', length: 150, nullable: true })
  category: string | null; // display name, e.g. "Application Submitted"

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'text' })
  content: string; // rendered body

  @Column({ type: 'text', nullable: true })
  footer: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  sender: string | null;

  @Column({ length: 20, default: 'Sent' })
  status: string; // 'Sent' | 'Failed' | 'Scheduled'

  @Column({ name: 'message_id', type: 'varchar', length: 150, nullable: true })
  messageId: string | null;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
