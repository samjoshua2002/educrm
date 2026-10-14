import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';

// Letter templates used to generate Offer / Rejection / Waitlist letters.
// bodyHtml supports merge fields such as {{Name}}, {{Program}},
// {{Scholarship_Amount}}, {{Offer_Valid_Till}}, {{Conditions}},
// {{Application_No}}, {{Date}} (see LetterTemplatesService.MERGE_FIELDS).
export const LETTER_TEMPLATE_TYPES = ['offer', 'rejection', 'waitlist'] as const;
export type LetterTemplateType = (typeof LETTER_TEMPLATE_TYPES)[number];
export const LETTER_TEMPLATE_STATUSES = ['active', 'inactive'] as const;

@Entity('letter_templates')
@Index(['organizationId', 'type'])
export class LetterTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, default: 'offer' })
  type: string;

  // Email subject used when the letter is sent (merge fields allowed).
  @Column({ type: 'varchar', length: 255, nullable: true })
  subject: string | null;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  // Incremented each time the subject or body changes.
  @Column({ type: 'int', default: 1 })
  version: number;

  // The template used when none is chosen explicitly (one per type).
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
