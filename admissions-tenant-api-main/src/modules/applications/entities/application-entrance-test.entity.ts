import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_entrance_tests')
export class ApplicationEntranceTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.entranceTests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'test_name', length: 100 })
  testName: string;

  @Column({ name: 'month_year', length: 50, nullable: true })
  monthYear: string;

  @Column({ name: 'composite_score', type: 'decimal', precision: 10, scale: 2, nullable: true })
  compositeScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentile: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
