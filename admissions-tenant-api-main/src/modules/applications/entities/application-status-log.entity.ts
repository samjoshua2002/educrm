import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Generated,
} from 'typeorm';
import { Application } from './application.entity.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * Application Status Tracker fields (scope p.19):
 * Status_Log_ID, Application_ID, Previous_Status, Current_Status,
 * Status_Changed_By, Status_Change_Date, Internal_Remarks, Applicant_Visible,
 * SLA_Days, SLA_Breached.
 */
@Entity('application_status_logs')
@Index(['organizationId', 'applicationId'])
export class ApplicationStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Status_Log_ID — auto number */
  @Column({ name: 'status_log_no', type: 'int' })
  @Generated('increment')
  statusLogNo: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'previous_status', type: 'varchar', length: 40, nullable: true })
  previousStatus: string | null;

  @Column({ name: 'current_status', type: 'varchar', length: 40 })
  currentStatus: string;

  /** Null = changed by the system (rules engine / cron). */
  @Column({ name: 'status_changed_by', type: 'uuid', nullable: true })
  statusChangedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'status_changed_by' })
  statusChangedByUser: User;

  /** 'Admin' | 'System' — display label for Status_Changed_By */
  @Column({ name: 'changed_by_type', type: 'varchar', length: 20, default: 'System' })
  changedByType: string;

  @Column({ name: 'changed_by_name', type: 'varchar', length: 255, nullable: true })
  changedByName: string | null;

  @CreateDateColumn({ name: 'status_change_date' })
  statusChangeDate: Date;

  @Column({ name: 'internal_remarks', type: 'text', nullable: true })
  internalRemarks: string | null;

  @Column({ name: 'applicant_visible', default: true })
  applicantVisible: boolean;

  @Column({ name: 'sla_days', type: 'int', nullable: true })
  slaDays: number | null;

  @Column({ name: 'sla_due_at', type: 'timestamp', nullable: true })
  slaDueAt: Date | null;

  @Column({ name: 'sla_breached', default: false })
  slaBreached: boolean;

  /** True for the log row that describes the application's current stage. */
  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  /** 'manual' | 'rule' | 'bulk' | 'sla' */
  @Column({ name: 'source', type: 'varchar', length: 20, default: 'manual' })
  source: string;
}
