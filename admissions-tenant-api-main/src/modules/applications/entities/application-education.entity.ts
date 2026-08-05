import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_education')
export class ApplicationEducation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.educationRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ length: 50 })
  level: string;

  @Column({ length: 255, nullable: true })
  institution: string;

  @Column({ name: 'board_university', length: 255, nullable: true })
  boardUniversity: string;

  @Column({ name: 'year_of_passing', length: 50, nullable: true })
  yearOfPassing: string;

  @Column({ name: 'percentage_cgpa', length: 100, nullable: true })
  percentageCgpa: string;

  @Column({ name: 'class_obtained', length: 50, nullable: true })
  classObtained: string;

  @Column({ name: 'major_subjects', length: 255, nullable: true })
  majorSubjects: string;

  @Column({ name: 'is_completed', default: true })
  isCompleted: boolean;

  @Column({ name: 'document_url', type: 'text', nullable: true })
  documentUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
