import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Generated,
} from 'typeorm';
import { Interview } from './interview.entity.js';
import { User } from '../../users/entities/user.entity.js';

// Scope: Interview Evaluations (API Name: Interview_Evaluations) — Evaluator
// Portal, Lookup Interviews.
@Entity('interview_evaluations')
@Unique(['interviewId', 'evaluatorId'])
export class InterviewEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Evaluation_ID (Auto Number)
  @Column({ name: 'evaluation_number', type: 'int' })
  @Generated('increment')
  evaluationNumber: number;

  // Interview (Lookup Interviews)
  @Column({ name: 'interview_id', type: 'uuid' })
  interviewId: string;

  @ManyToOne(() => Interview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interview_id' })
  interview: Interview;

  // Evaluator (Lookup Users)
  @Column({ name: 'evaluator_id', type: 'uuid' })
  evaluatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluator_id' })
  evaluator: User;

  // Evaluation_Status (Pick List) — 'draft' | 'submitted'
  @Column({ length: 20, default: 'draft' })
  status: string;

  // Recommendation (Pick List: Strongly Recommend / Recommend / Neutral /
  // Do Not Recommend)
  @Column({ name: 'overall_recommendation', length: 30, nullable: true })
  overallRecommendation: string;

  // Comments (Multi-line)
  @Column({ type: 'text', nullable: true })
  comments: string;

  // Evaluation_Date (Date-Time) — last time the evaluator saved feedback.
  @Column({ name: 'evaluation_date', type: 'timestamptz', nullable: true })
  evaluationDate: Date;

  // Submitted (Checkbox)
  @Column({ type: 'boolean', default: false })
  submitted: boolean;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
