import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export const TEMPLATE_TYPES = ['Email', 'SMS', 'WhatsApp', 'Call Script'] as const;
export const TEMPLATE_CATEGORIES = ['Reminder', 'Offer', 'Rejection', 'Interview', 'Fee'] as const;
export const TEMPLATE_STATUSES = ['draft', 'approved', 'archived'] as const;
export const DEFAULT_EDITING_ROLES = ['org_admin', 'application_manager'];

/**
 * Communication template (scope §4 Templates & Personalization).
 * Table name kept as email_templates for backward compatibility — it now
 * holds Email, SMS, WhatsApp and Call Script templates.
 */
@Entity('email_templates')
export class EmailTemplate {
  /** Template ID (Primary Key) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  /** Template Name */
  @Column({ length: 255 })
  name: string;

  /** Lifecycle trigger category display name (email-template-categories) */
  @Index()
  @Column({ length: 100, default: 'General Notice' })
  category: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  /** Category per scope: Reminder / Offer / Rejection / Interview / Fee */
  @Column({ name: 'template_category', type: 'varchar', length: 30, nullable: true })
  templateCategory: string | null;

  /** Template Type: Email / SMS / WhatsApp / Call Script */
  @Column({ length: 50, default: 'Email' })
  channel: string;

  /** Subject Line (Email only; empty for other types) */
  @Column({ length: 500, default: '' })
  subject: string;

  /** Body Content */
  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Header */
  @Column({ type: 'text', nullable: true })
  header: string | null;

  /** Footer */
  @Column({ type: 'text', nullable: true })
  footer: string | null;

  /** Signature */
  @Column({ type: 'text', nullable: true })
  signature: string | null;

  /** Variables / merge fields used, e.g. ['name', 'Program', 'Application_ID'] */
  @Column({ type: 'jsonb', default: '[]' })
  variables: string[];

  @Column({ length: 50, default: 'English' })
  language: string;

  /** Status: draft / approved / archived ('active' is legacy for approved) */
  @Column({ length: 20, default: 'draft' })
  status: string;

  /** Version Number — bumped whenever subject / body / header / footer / signature change */
  @Column({ name: 'version_number', type: 'int', default: 1 })
  versionNumber: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  /** Role-based editing rights: roles (besides org_admin) allowed to edit */
  @Column({ name: 'editable_by_roles', type: 'jsonb', default: () => `'["org_admin","application_manager"]'` })
  editableByRoles: string[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_by_name', type: 'varchar', length: 255, nullable: true })
  createdByName: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_by_name', type: 'varchar', length: 255, nullable: true })
  updatedByName: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_by_name', type: 'varchar', length: 255, nullable: true })
  approvedByName: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Last Modified Date */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
