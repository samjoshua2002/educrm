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
import { Application } from '../../applications/entities/application.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { AdmissionDecision } from './admission-decision.entity.js';

// Phase 6a — Offer Letters module.
//
// Design-doc field "Offer Letter PDF" (file) is intentionally NOT
// implemented as a binary/PDF artifact here — there is no file-storage or
// PDF-rendering infrastructure elsewhere in this codebase to reuse, and
// standing one up is out of scope for this phase. Instead `offerLetterHtml`
// stores the fully-rendered HTML body (see
// OfferLettersService.renderOfferLetterHtml); it is shown as a preview in
// the admin UI and inlined into the "send" email. A PDF export can be
// layered on top later (e.g. render this same HTML through a headless
// browser) without changing the stored data model.
@Entity('offer_letters')
export class OfferLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ name: 'admission_decision_id', type: 'uuid', nullable: true })
  admissionDecisionId: string;

  @ManyToOne(() => AdmissionDecision, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admission_decision_id' })
  admissionDecision: AdmissionDecision;

  @Column({ name: 'offer_type', length: 30 })
  offerType: string; // 'regular' | 'conditional' | 'scholarship'

  @Column({ name: 'program_offered', length: 255, nullable: true })
  programOffered: string;

  @Column({ name: 'offer_status', length: 20, default: 'draft' })
  offerStatus: string; // 'draft' | 'generated' | 'sent' | 'expired' | 'withdrawn'

  // See class-level comment — rendered HTML body, not a binary PDF.
  @Column({ name: 'offer_letter_html', type: 'text', nullable: true })
  offerLetterHtml: string;

  @Column({ name: 'offer_generated_on', nullable: true })
  offerGeneratedOn: Date;

  @Column({ name: 'offer_valid_till', type: 'date', nullable: true })
  offerValidTill: Date;

  @Column({ name: 'scholarship_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  scholarshipAmount: number;

  @Column({ name: 'conditions', type: 'text', nullable: true })
  conditions: string;

  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'generated_by' })
  generatedByUser: User;

  @Column({ name: 'sent_to_candidate', default: false })
  sentToCandidate: boolean;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
