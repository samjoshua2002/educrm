import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Generated,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * Document Upload & Verification fields (scope p.17):
 * Document_ID, Application_ID, Document_Type, Document_Name, Document_URL,
 * Upload_Date, Uploaded_By, Verification_Status, Verified_By,
 * Verification_Date, Rejection_Reason, Reupload_Required, Document_Version.
 */
@Entity('application_documents')
@Index(['organizationId', 'applicationId'])
@Index(['applicationId', 'documentType', 'isLatest'])
export class ApplicationDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Document_ID — auto number */
  @Column({ name: 'document_no', type: 'int' })
  @Generated('increment')
  documentNo: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  /** 'ID Proof' | 'Marksheets' | 'Certificates' */
  @Column({ name: 'document_type', type: 'varchar', length: 30 })
  documentType: string;

  @Column({ name: 'document_name', type: 'varchar', length: 255 })
  documentName: string;

  @Column({ name: 'document_url', type: 'text' })
  documentUrl: string;

  /** Object key in cloud storage (bucket encrypted at rest). */
  @Column({ name: 'storage_key', type: 'text', nullable: true })
  storageKey: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @CreateDateColumn({ name: 'upload_date' })
  uploadDate: Date;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  /** 'Applicant' | 'User' */
  @Column({ name: 'uploaded_by_type', type: 'varchar', length: 20, default: 'Applicant' })
  uploadedByType: string;

  @Column({ name: 'uploaded_by_name', type: 'varchar', length: 255, nullable: true })
  uploadedByName: string | null;

  /** 'Pending' | 'Approved' | 'Rejected' */
  @Column({ name: 'verification_status', type: 'varchar', length: 20, default: 'Pending' })
  verificationStatus: string;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifiedByUser: User;

  @Column({ name: 'verification_date', type: 'timestamp', nullable: true })
  verificationDate: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'reupload_required', default: false })
  reuploadRequired: boolean;

  @Column({ name: 'document_version', type: 'int', default: 1 })
  documentVersion: number;

  /** Only the newest version of a document type is "latest". */
  @Column({ name: 'is_latest', default: true })
  isLatest: boolean;

  @Column({ name: 'previous_version_id', type: 'uuid', nullable: true })
  previousVersionId: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
