import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Application } from '../../applications/entities/application.entity.js';
import { LetterTemplate } from './letter-template.entity.js';

// Rejections (scope: Rejection Handling).
export enum RejectionReason {
  BELOW_CUTOFF = 'below_cutoff',
  INCOMPLETE_DOCUMENTS = 'incomplete_documents',
  FAILED_INTERVIEW = 'failed_interview',
  SEAT_UNAVAILABLE = 'seat_unavailable',
  OTHER = 'other',
}

@Entity('rejections')
export class Rejection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Rejection ID (Auto Number)
  @Column({ name: 'rejection_no', type: 'int' })
  @Generated('increment')
  rejectionNo: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({
    name: 'rejection_reason',
    type: 'enum',
    enum: RejectionReason,
    default: RejectionReason.OTHER,
  })
  rejectionReason: RejectionReason;

  @Column({ name: 'detailed_reason', type: 'text', nullable: true })
  detailedReason: string | null;

  @Column({ name: 'rejection_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  rejectionDate: Date;

  // Rejection Letter Template — Lookup (Templates)
  @Column({ name: 'rejection_letter_template_id', type: 'uuid', nullable: true })
  rejectionLetterTemplateId: string | null;

  @ManyToOne(() => LetterTemplate, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejection_letter_template_id' })
  rejectionLetterTemplate: LetterTemplate;

  @Column({ name: 'rejection_letter_pdf', type: 'varchar', length: 500, nullable: true })
  rejectionLetterPdf: string | null;

  @Column({ name: 'rejection_letter_pdf_path', type: 'varchar', length: 500, nullable: true, select: false })
  rejectionLetterPdfPath: string | null;

  @Column({ name: 'communication_sent', default: false })
  communicationSent: boolean;

  @Column({ name: 'communication_sent_at', type: 'timestamp', nullable: true })
  communicationSentAt: Date | null;

  @Column({ name: 'alternate_options_suggested', type: 'text', nullable: true })
  alternateOptionsSuggested: string | null;

  @Column({ name: 'eligible_for_reapply', default: true })
  eligibleForReapply: boolean;

  // Next Intake (Pick List) — an academic session name.
  @Column({ name: 'next_intake', type: 'varchar', length: 100, nullable: true })
  nextIntake: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
