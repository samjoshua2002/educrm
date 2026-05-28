import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lead } from './lead.entity.js';

@Entity('lead_activities')
export class LeadActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @Column({ length: 50 })
  action: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ length: 100, nullable: true })
  disposition: string;

  @Column({ name: 'previous_status', length: 50, nullable: true })
  previousStatus: string;

  @Column({ name: 'new_status', length: 50, nullable: true })
  newStatus: string;

  @Column({ name: 'previous_assigned_to', type: 'uuid', nullable: true })
  previousAssignedTo: string;

  @Column({ name: 'new_assigned_to', type: 'uuid', nullable: true })
  newAssignedTo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;
}
