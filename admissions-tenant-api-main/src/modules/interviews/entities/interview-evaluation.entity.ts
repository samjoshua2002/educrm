import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Interview } from './interview.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('interview_evaluations')
@Unique(['interviewId', 'evaluatorId'])
export class InterviewEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'interview_id', type: 'uuid' })
  interviewId: string;

  @ManyToOne(() => Interview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interview_id' })
  interview: Interview;

  @Column({ name: 'evaluator_id', type: 'uuid' })
  evaluatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluator_id' })
  evaluator: User;

  @Column({ length: 20, default: 'draft' })
  status: string; // 'draft' | 'submitted'

  @Column({ name: 'overall_recommendation', length: 30, nullable: true })
  overallRecommendation: string; // 'Strongly Recommend' | 'Recommend' | 'Neutral' | 'Do Not Recommend'

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
