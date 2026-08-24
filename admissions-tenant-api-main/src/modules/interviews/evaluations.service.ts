import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Interview } from './entities/interview.entity.js';
import { EvaluationRubric } from './entities/evaluation-rubric.entity.js';
import { InterviewEvaluation } from './entities/interview-evaluation.entity.js';
import { EvaluationScore } from './entities/evaluation-score.entity.js';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ScoringService } from './scoring.service.js';

const ADMIN_ROLES = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER];
const BLOCKED_STATUSES = ['Cancelled', 'No Show'];

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(EvaluationRubric)
    private readonly rubricRepository: Repository<EvaluationRubric>,
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    @InjectRepository(EvaluationScore)
    private readonly scoreRepository: Repository<EvaluationScore>,
    private readonly dataSource: DataSource,
    private readonly scoringService: ScoringService,
  ) {}

  private isAdmin(role: string) {
    return ADMIN_ROLES.includes(role as Role);
  }

  private weightedScore(scoreGiven: number, rubric: EvaluationRubric): number {
    const maxScore = Number(rubric.maxScore) || 0;
    const weightagePercent = Number(rubric.weightagePercent) || 0;
    if (!maxScore) return 0;
    return (Number(scoreGiven) / maxScore) * weightagePercent;
  }

  async getMyAssignedInterviews(orgId: string, userId: string) {
    const interviews = await this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.application', 'application')
      .leftJoinAndSelect('application.student', 'student')
      .leftJoinAndSelect('interview.slot', 'slot')
      .where('interview.organization_id = :orgId', { orgId })
      .andWhere(':userId = ANY(interview.assigned_panel)', { userId })
      .orderBy('interview.created_at', 'DESC')
      .getMany();

    if (interviews.length === 0) return [];

    const evaluations = await this.evaluationRepository.find({
      where: { interviewId: In(interviews.map((i) => i.id)), evaluatorId: userId },
    });
    const evaluationByInterviewId = new Map(evaluations.map((e) => [e.interviewId, e]));

    return interviews.map((interview) => {
      const evaluation = evaluationByInterviewId.get(interview.id);
      return {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        applicationNo: interview.application?.applicationNo,
        studentName: interview.application?.student?.name,
        interviewType: interview.interviewType,
        round: interview.round,
        status: interview.status,
        slot: interview.slot
          ? { slotDate: interview.slot.slotDate, startTime: interview.slot.startTime, location: interview.slot.location }
          : null,
        evaluationStatus: evaluation ? evaluation.status : 'Not Started',
      };
    });
  }

  async getRubricsForInterview(orgId: string, interviewId: string) {
    const interview = await this.findInterviewOrThrow(orgId, interviewId);
    return this.rubricRepository.find({
      where: { organizationId: orgId, interviewType: interview.interviewType, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async getOrCreateDraftEvaluation(orgId: string, interviewId: string, evaluatorId: string, evaluatorRole: string) {
    const interview = await this.findInterviewOrThrow(orgId, interviewId);
    this.assertCanEvaluate(interview, evaluatorId, evaluatorRole);

    let evaluation = await this.evaluationRepository.findOne({ where: { interviewId, evaluatorId } });
    if (!evaluation) {
      evaluation = this.evaluationRepository.create({ interviewId, evaluatorId, status: 'draft' });
      evaluation = await this.evaluationRepository.save(evaluation);
    }

    const scores = await this.scoreRepository.find({ where: { evaluationId: evaluation.id }, relations: ['rubric'] });
    return this.toEvaluationResponse(evaluation, scores);
  }

  async submitScores(orgId: string, interviewId: string, evaluatorId: string, evaluatorRole: string, dto: SubmitEvaluationDto) {
    const interview = await this.findInterviewOrThrow(orgId, interviewId);
    this.assertCanEvaluate(interview, evaluatorId, evaluatorRole);

    const result = await this.dataSource.transaction(async (manager) => {
      let evaluation = await manager.findOne(InterviewEvaluation, { where: { interviewId, evaluatorId } });
      if (!evaluation) {
        evaluation = manager.create(InterviewEvaluation, { interviewId, evaluatorId, status: 'draft' });
        evaluation = await manager.save(evaluation);
      }
      if (evaluation.status === 'submitted') {
        throw new BadRequestException('Evaluation already submitted');
      }

      const rubricIds = dto.scores.map((s) => s.rubricId);
      const rubrics = await manager.find(EvaluationRubric, {
        where: { id: In(rubricIds), organizationId: orgId },
      });
      const rubricById = new Map(rubrics.map((r) => [r.id, r]));
      for (const item of dto.scores) {
        const rubric = rubricById.get(item.rubricId);
        if (!rubric) {
          throw new NotFoundException(`Rubric #${item.rubricId} not found`);
        }
        if (Number(item.scoreGiven) > Number(rubric.maxScore)) {
          throw new BadRequestException(
            `Score for "${rubric.parameterName}" cannot exceed max score of ${rubric.maxScore}`,
          );
        }
      }

      for (const item of dto.scores) {
        let scoreRow = await manager.findOne(EvaluationScore, {
          where: { evaluationId: evaluation.id, rubricId: item.rubricId },
        });
        if (scoreRow) {
          scoreRow.scoreGiven = item.scoreGiven;
          scoreRow.notes = item.notes ?? scoreRow.notes;
        } else {
          scoreRow = manager.create(EvaluationScore, {
            evaluationId: evaluation.id,
            rubricId: item.rubricId,
            scoreGiven: item.scoreGiven,
            notes: item.notes,
          });
        }
        await manager.save(scoreRow);
      }

      if (dto.overallRecommendation !== undefined) evaluation.overallRecommendation = dto.overallRecommendation;
      if (dto.comments !== undefined) evaluation.comments = dto.comments;
      if (dto.submit) {
        evaluation.status = 'submitted';
        evaluation.submittedAt = new Date();
      }
      evaluation = await manager.save(evaluation);

      const scores = await manager.find(EvaluationScore, { where: { evaluationId: evaluation.id }, relations: ['rubric'] });
      return this.toEvaluationResponse(evaluation, scores);
    });

    // Stage-2 composite rollup: only a real submit (not a draft save) locks
    // in an evaluator's numbers, so only recompute then. Runs after the
    // transaction commits — computeCompositeScore uses its own repositories
    // and is safe/idempotent to call any time.
    if (dto.submit) {
      await this.scoringService.computeCompositeScore(orgId, interview.applicationId);
    }

    return result;
  }

  async getInterviewEvaluations(orgId: string, interviewId: string, requestingUserId: string, requestingUserRole: string) {
    const interview = await this.findInterviewOrThrow(orgId, interviewId);

    const evaluations = await this.evaluationRepository.find({
      where: { interviewId: interview.id },
      relations: ['evaluator'],
      order: { createdAt: 'ASC' },
    });

    const visibleEvaluations = this.isAdmin(requestingUserRole)
      ? evaluations
      : evaluations.filter((e) => e.evaluatorId === requestingUserId);

    if (visibleEvaluations.length === 0) return [];

    const evaluationIds = visibleEvaluations.map((e) => e.id);
    const allScores = await this.scoreRepository.find({
      where: { evaluationId: In(evaluationIds) },
      relations: ['rubric'],
    });
    const scoresByEvaluationId = new Map<string, EvaluationScore[]>();
    for (const score of allScores) {
      const list = scoresByEvaluationId.get(score.evaluationId) ?? [];
      list.push(score);
      scoresByEvaluationId.set(score.evaluationId, list);
    }

    return visibleEvaluations.map((evaluation) => ({
      ...this.toEvaluationResponse(evaluation, scoresByEvaluationId.get(evaluation.id) ?? []),
      evaluatorName: evaluation.evaluator?.name,
      evaluatorEmail: evaluation.evaluator?.email,
    }));
  }

  private toEvaluationResponse(evaluation: InterviewEvaluation, scores: EvaluationScore[]) {
    return {
      id: evaluation.id,
      interviewId: evaluation.interviewId,
      evaluatorId: evaluation.evaluatorId,
      status: evaluation.status,
      overallRecommendation: evaluation.overallRecommendation,
      comments: evaluation.comments,
      submittedAt: evaluation.submittedAt,
      scores: scores.map((s) => ({
        id: s.id,
        rubricId: s.rubricId,
        parameterName: s.rubric?.parameterName,
        maxScore: s.rubric?.maxScore,
        weightagePercent: s.rubric?.weightagePercent,
        scoreGiven: s.scoreGiven,
        notes: s.notes,
        weightedScore: s.rubric ? this.weightedScore(s.scoreGiven, s.rubric) : null,
      })),
    };
  }

  private async findInterviewOrThrow(orgId: string, interviewId: string) {
    const interview = await this.interviewRepository.findOne({
      where: { id: interviewId, organizationId: orgId },
      relations: ['application', 'application.student', 'slot'],
    });
    if (!interview) {
      throw new NotFoundException(`Interview #${interviewId} not found`);
    }
    return interview;
  }

  private assertCanEvaluate(interview: Interview, evaluatorId: string, evaluatorRole: string) {
    const isPanelMember = (interview.assignedPanel || []).includes(evaluatorId);
    if (!isPanelMember && !this.isAdmin(evaluatorRole)) {
      throw new ForbiddenException('You are not assigned as an evaluator for this interview.');
    }
    if (BLOCKED_STATUSES.includes(interview.status)) {
      throw new BadRequestException(`Cannot evaluate an interview with status "${interview.status}".`);
    }
  }
}
