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
import { User } from '../../users/entities/user.entity.js';

// Scope: Interview Slots (API Name: Interview_Slots) — Lookup Interviews.
@Entity('interview_slots')
export class InterviewSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Slot_ID (Auto Number)
  @Column({ name: 'slot_number', type: 'int' })
  @Generated('increment')
  slotNumber: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Interview (Lookup Interviews) — the interview currently booked into this
  // slot. Plain uuid (no FK) to avoid a circular FK with interviews.slot_id.
  @Column({ name: 'interview_id', type: 'uuid', nullable: true })
  interviewId: string | null;

  // Interviewer (Lookup Users)
  @Column({ name: 'interviewer_id', type: 'uuid' })
  interviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewer_id' })
  interviewer: User;

  @Column({ name: 'interview_type', length: 20 })
  interviewType: string; // 'GD' | 'PI'

  // Slot_Date (Date)
  @Column({ name: 'slot_date', type: 'date' })
  slotDate: string;

  // Slot_Start_Time / Slot_End_Time (Date-Time)
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

  // Slot_Status (Pick List: Available / Booked / Blocked / Cancelled)
  @Column({ length: 20, default: 'Available' })
  status: string;

  // Candidate_Booked (Checkbox)
  @Column({ name: 'candidate_booked', type: 'boolean', default: false })
  candidateBooked: boolean;

  // Booking_Time (Date-Time)
  @Column({ name: 'booking_time', type: 'timestamptz', nullable: true })
  bookingTime: Date | null;

  // Time_Zone (Pick List)
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
