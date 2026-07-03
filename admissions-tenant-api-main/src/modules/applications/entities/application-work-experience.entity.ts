import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_work_experience')
export class ApplicationWorkExperience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.workExperienceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ length: 255 })
  organization: string;

  @Column({ length: 255, nullable: true })
  designation: string;

  @Column({ name: 'from_date', type: 'date', nullable: true })
  fromDate: Date;

  @Column({ name: 'to_date', type: 'date', nullable: true })
  toDate: Date;

  @Column({ name: 'roles_responsibilities', type: 'text', nullable: true })
  rolesResponsibilities: string;

  @Column({ name: 'gross_salary', length: 100, nullable: true })
  grossSalary: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
