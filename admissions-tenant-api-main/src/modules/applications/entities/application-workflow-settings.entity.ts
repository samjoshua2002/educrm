import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-organization configuration of the application workflow:
 * stage SLA days (status tracker), required document types and the upload
 * size limit (document verification).
 */
@Entity('application_workflow_settings')
@Index(['organizationId'], { unique: true })
export class ApplicationWorkflowSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** e.g. { "Fee Paid": 3, "Under Review": 5 } */
  @Column({ name: 'stage_sla_days', type: 'jsonb', default: () => "'{}'" })
  stageSlaDays: Record<string, number>;

  @Column({ name: 'required_document_types', type: 'jsonb', default: () => `'["ID Proof","Marksheets","Certificates"]'` })
  requiredDocumentTypes: string[];

  @Column({ name: 'max_document_size_mb', type: 'int', default: 5 })
  maxDocumentSizeMb: number;

  /** Notify the applicant (in-app + email) whenever a visible stage change happens. */
  @Column({ name: 'notify_applicant_on_stage_change', default: true })
  notifyApplicantOnStageChange: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
