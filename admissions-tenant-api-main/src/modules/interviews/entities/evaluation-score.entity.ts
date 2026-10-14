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
import { InterviewEvaluation } from './interview-evaluation.entity.js';
import { EvaluationRubric } from './evaluation-rubric.entity.js';

// Weighted_Score formula (scope): Score_Given / Max_Score x Weightage.
export function computeWeightedScore(
  scoreGiven: number | string | null | undefined,
  maxScore: number | string | null | undefined,
  weightage: number | string | null | undefined,
): number {
  const given = Number(scoreGiven) || 0;
  const max = Number(maxScore) || 0;
  const weight = Number(weightage) || 0;
  if (!max) return 0;
  return Number(((given / max) * weight).toFixed(2));
}

// Scope: Evaluation Scores (API Name: Evaluation_Scores) — Lookup
// Interview_Evaluations.
@Entity('evaluation_scores')
@Unique(['evaluationId', 'rubricId'])
export class EvaluationScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Score_ID (Auto Number)
  @Column({ name: 'score_number', type: 'int' })
  @Generated('increment')
  scoreNumber: number;

  // Evaluation (Lookup Interview_Evaluations)
  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  @ManyToOne(() => InterviewEvaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: InterviewEvaluation;

  // Rubric (Lookup Evaluation_Rubrics)
  @Column({ name: 'rubric_id', type: 'uuid' })
  rubricId: string;

  @ManyToOne(() => EvaluationRubric, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rubric_id' })
  rubric: EvaluationRubric;

  // Score_Given (Number)
  @Column({ name: 'score_given', type: 'decimal', precision: 5, scale: 2 })
  scoreGiven: number;

  // Evaluator_Notes (Multi-line)
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Weighted_Score (Formula) = Score_Given / Max_Score x Weightage.
  // Recomputed on every save (see EvaluationsService) so reports can query it.
  @Column({ name: 'weighted_score', type: 'decimal', precision: 7, scale: 2, nullable: true })
  weightedScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
