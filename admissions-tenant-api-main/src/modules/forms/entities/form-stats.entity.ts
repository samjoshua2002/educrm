import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Form } from './form.entity.js';

@Entity('form_stats')
export class FormStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ name: 'total_submissions', default: 0 })
  totalSubmissions: number;

  @Column({ name: 'unique_submissions', default: 0 })
  uniqueSubmissions: number;

  @Column({ name: 'duplicate_attempts', default: 0 })
  duplicateAttempts: number;

  @Column({ name: 'last_submission_at', nullable: true })
  lastSubmissionAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;
}
