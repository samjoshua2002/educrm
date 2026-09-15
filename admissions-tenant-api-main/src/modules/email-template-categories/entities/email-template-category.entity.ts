import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EmailTemplateCategoryVariable } from './email-template-category-variable.entity.js';

@Entity('email_template_categories')
@Index(['organizationId', 'slug'], { unique: true })
export class EmailTemplateCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // NULL = global category seeded by superadmin, available to every org.
  // Non-null = an org's own custom category.
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => EmailTemplateCategoryVariable, (v) => v.category)
  variables: EmailTemplateCategoryVariable[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
