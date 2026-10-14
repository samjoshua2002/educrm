import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** One CSV upload (portal export, event attendee list, …) and its outcome. */
@Entity('lead_import_batches')
export class LeadImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** Portal | Event | Web | Social | Chatbot */
  @Column({ length: 20 })
  channel: string;

  /** Portal name / event name / list name */
  @Column({ name: 'source_name', type: 'varchar', length: 255, nullable: true })
  sourceName: string | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ type: 'int', default: 0 })
  created: number;

  /** Rows folded into an existing lead (re-entry prevented) */
  @Column({ type: 'int', default: 0 })
  reentries: number;

  /** Rows created but flagged as potential duplicates */
  @Column({ name: 'duplicates_flagged', type: 'int', default: 0 })
  duplicatesFlagged: number;

  @Column({ type: 'int', default: 0 })
  failed: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  errors: { row: number; message: string }[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
