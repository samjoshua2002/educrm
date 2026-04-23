import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Form } from './form.entity.js';

@Entity('form_daily_stats')
@Unique(['formId', 'date'])
export class FormDailyStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ type: 'date' })
  date: string; // Using string to handle basic dates

  @Column({ name: 'total_submissions', default: 0 })
  totalSubmissions: number;

  @Column({ name: 'unique_submissions', default: 0 })
  uniqueSubmissions: number;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;
}
