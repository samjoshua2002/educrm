import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ length: 255 })
  name: string;

  @Index()
  @Column({ length: 100, default: 'General Notice' })
  category: string;

  @Column({ length: 50, default: 'Email' })
  channel: string; // 'Email' | 'SMS' | 'WhatsApp'

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  variables: string[]; // e.g. ['student', 'date', 'course', 'application_no', 'sender']

  @Column({ length: 20, default: 'active' })
  status: string; // 'active' | 'draft'

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
