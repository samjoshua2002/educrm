import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_other_qualifications')
export class ApplicationOtherQualification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.otherQualificationRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'course_name', length: 255 })
  courseName: string;

  @Column({ length: 255, nullable: true })
  institution: string;

  @Column({ name: 'year_of_passing', length: 4, nullable: true })
  yearOfPassing: string;

  @Column({ name: 'grade_or_percentage', length: 50, nullable: true })
  gradeOrPercentage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
