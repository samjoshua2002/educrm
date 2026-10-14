import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Timestamped audit trail of every document action (upload, approve, reject, re-upload request). */
@Entity('document_verification_logs')
@Index(['organizationId', 'applicationId'])
export class DocumentVerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'document_type', type: 'varchar', length: 30 })
  documentType: string;

  @Column({ name: 'document_version', type: 'int', default: 1 })
  documentVersion: number;

  /** 'Uploaded' | 'Re-uploaded' | 'Approved' | 'Rejected' | 'Re-upload Requested' */
  @Column({ type: 'varchar', length: 30 })
  action: string;

  @Column({ name: 'previous_status', type: 'varchar', length: 20, nullable: true })
  previousStatus: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 20, nullable: true })
  newStatus: string | null;

  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_name', type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 40, nullable: true })
  actorRole: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
