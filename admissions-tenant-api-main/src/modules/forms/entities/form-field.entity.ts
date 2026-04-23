import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Form } from './form.entity.js';

@Entity('form_fields')
export class FormField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ length: 255 })
  label: string;

  @Column({ length: 50 })
  type: string; // text, email, phone, select, etc.

  @Column({ name: 'is_required', default: false })
  isRequired: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  options: any[];

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;
}
