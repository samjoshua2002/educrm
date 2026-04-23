import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Form } from './form.entity.js';

export enum ResponseStatus {
  VERIFIED = 'verified',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

@Entity('form_responses')
export class FormResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'jsonb', default: '{}' })
  data: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: ResponseStatus.PENDING,
  })
  status: ResponseStatus;

  @Column({ name: 'is_duplicate', default: false })
  isDuplicate: boolean;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @ManyToOne(() => Form, (form) => form.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
