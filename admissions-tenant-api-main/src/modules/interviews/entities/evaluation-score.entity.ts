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
import { InterviewEvaluation } from './interview-evaluation.entity.js';
import { EvaluationRubric } from './evaluation-rubric.entity.js';

@Entity('evaluation_scores')
@Unique(['evaluationId', 'rubricId'])
export class EvaluationScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  @ManyToOne(() => InterviewEvaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: InterviewEvaluation;

  @Column({ name: 'rubric_id', type: 'uuid' })
  rubricId: string;

  @ManyToOne(() => EvaluationRubric, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubric_id' })
  rubric: EvaluationRubric;

  @Column({ name: 'score_given', type: 'decimal', precision: 5, scale: 2 })
  scoreGiven: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
