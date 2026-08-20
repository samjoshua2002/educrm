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
import { User } from '../../users/entities/user.entity.js';

@Entity('interview_slots')
export class InterviewSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'interviewer_id', type: 'uuid' })
  interviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewer_id' })
  interviewer: User;

  @Column({ name: 'interview_type', length: 20 })
  interviewType: string; // 'GD' | 'PI'

  @Column({ name: 'slot_date', type: 'date' })
  slotDate: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ length: 20, default: 'In-person' })
  mode: string; // 'In-person' | 'Virtual'

  @Column({ name: 'meeting_link', type: 'text', nullable: true })
  meetingLink: string;

  @Column({ length: 20, default: 'Available' })
  status: string; // 'Available' | 'Booked' | 'Blocked' | 'Cancelled'

  @Column({ name: 'time_zone', length: 50, nullable: true })
  timeZone: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
