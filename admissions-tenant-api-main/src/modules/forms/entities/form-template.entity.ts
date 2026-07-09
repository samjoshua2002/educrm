import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('form_templates')
export class FormTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'jsonb', default: '[]' })
  fields: any[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'original_form_id', type: 'uuid', nullable: true })
  originalFormId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
