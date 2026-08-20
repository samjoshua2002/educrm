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
import { InterviewSlot } from './interview-slot.entity.js';

@Entity('interviews')
export class Interview {
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

  @Column({ name: 'interview_type', length: 20 })
  interviewType: string; // 'GD' | 'PI'

  @Column({ type: 'int', default: 1 })
  round: number;

  @Column({ name: 'slot_id', type: 'uuid', nullable: true })
  slotId: string;

  @ManyToOne(() => InterviewSlot, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'slot_id' })
  slot: InterviewSlot;

  @Column({ length: 20, default: 'Scheduled' })
  status: string; // 'Scheduled' | 'Rescheduled' | 'Completed' | 'No Show' | 'Cancelled'

  // Multiple evaluators can be assigned to a single GD/PI interview — each
  // scores independently in Sprint C (InterviewEvaluation, one row per evaluator).
  @Column({ name: 'assigned_panel', type: 'uuid', array: true, default: () => "'{}'" })
  assignedPanel: string[];

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
