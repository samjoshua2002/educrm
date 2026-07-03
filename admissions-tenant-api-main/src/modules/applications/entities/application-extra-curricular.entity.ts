import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_extra_curriculars')
export class ApplicationExtraCurricular {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.extraCurricularRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ length: 255 })
  activity: string;

  @Column({ length: 100, nullable: true })
  level: string;

  @Column({ type: 'text', nullable: true })
  achievements: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
