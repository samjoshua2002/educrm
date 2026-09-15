import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EmailTemplateCategory } from './email-template-category.entity.js';

@Entity('email_template_category_variables')
@Index(['categoryId', 'key'], { unique: true })
export class EmailTemplateCategoryVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => EmailTemplateCategory, (c) => c.variables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: EmailTemplateCategory;

  @Column({ length: 100 })
  key: string; // e.g. "student"

  @Column({ length: 120 })
  tag: string; // e.g. "{student}"

  @Column({ length: 150 })
  label: string; // e.g. "Student Name"

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sample_value', type: 'varchar', length: 255, nullable: true })
  sampleValue: string | null;

  @Column({ name: 'source_field', type: 'varchar', length: 255, nullable: true })
  sourceField: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
