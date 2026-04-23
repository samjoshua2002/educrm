import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { FormResponse } from './form-response.entity.js';

export enum FormStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, default: '' })
  slug: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: FormStatus.DRAFT,
  })
  status: FormStatus;

  @Column({ name: 'campaign_id', nullable: true, type: 'uuid' })
  campaignId: string;

  @Column({ type: 'jsonb', default: '[]' })
  fields: any[];

  @Column({ name: 'created_by', nullable: true, type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => FormResponse, (response) => response.form)
  responses: FormResponse[];
}
