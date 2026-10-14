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
import { InterviewSlot } from './interview-slot.entity.js';

// Scope: Interviews (API Name: Interviews) — Lookup Applications.
@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Interview_ID (Auto Number)
  @Column({ name: 'interview_number', type: 'int' })
  @Generated('increment')
  interviewNumber: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Application (Lookup Applications)
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  // Interview_Type (Pick List: GD / PI)
  @Column({ name: 'interview_type', length: 20 })
  interviewType: string;

  // Interview_Mode (Pick List: In-person / Virtual)
  @Column({ name: 'interview_mode', length: 20, nullable: true })
  interviewMode: string;

  // Interview_Round (Number)
  @Column({ type: 'int', default: 1 })
  round: number;

  // Interview_Date (Date)
  @Column({ name: 'interview_date', type: 'date', nullable: true })
  interviewDate: string;

  // Start_Time / End_Time (Date-Time)
  @Column({ name: 'start_time', type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date;

  // Slot_ID
  @Column({ name: 'slot_id', type: 'uuid', nullable: true })
  slotId: string;

  @ManyToOne(() => InterviewSlot, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'slot_id' })
  slot: InterviewSlot;

  // Interview_Status (Pick List: Slot Available / Scheduled / Rescheduled /
  // Completed / No Show / Cancelled)
  @Column({ length: 20, default: 'Scheduled' })
  status: string;

  // Assigned_Panel (Lookup Users) — multiple evaluators, one
  // InterviewEvaluation row each.
  @Column({ name: 'assigned_panel', type: 'uuid', array: true, default: () => "'{}'" })
  assignedPanel: string[];

  // Meeting_Link (URL)
  @Column({ name: 'meeting_link', type: 'text', nullable: true })
  meetingLink: string;

  // Location (Single Line)
  @Column({ length: 255, nullable: true })
  location: string;

  // Interview_Outcome (Pick List)
  @Column({ length: 50, nullable: true })
  outcome: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
