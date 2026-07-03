import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_parents')
export class ApplicationParent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.parentRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ length: 50 })
  relationship: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true })
  age: number;

  @Column({ length: 100, nullable: true })
  education: string;

  @Column({ length: 100, nullable: true })
  occupation: string;

  @Column({ length: 255, nullable: true })
  organization: string;

  @Column({ length: 100, nullable: true })
  designation: string;

  @Column({ name: 'office_address', type: 'text', nullable: true })
  officeAddress: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ name: 'annual_income', length: 100, nullable: true })
  annualIncome: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
