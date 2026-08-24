import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationRubric } from './entities/evaluation-rubric.entity.js';
import { ShortlistingRule } from './entities/shortlisting-rule.entity.js';
import { ScoreConversionConfig } from './entities/score-conversion-config.entity.js';
import { InterviewSlot } from './entities/interview-slot.entity.js';
import { Interview } from './entities/interview.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { RubricsService } from './rubrics.service.js';
import { RubricsController } from './rubrics.controller.js';
import { ShortlistingRulesService } from './shortlisting-rules.service.js';
import { ShortlistingRulesController } from './shortlisting-rules.controller.js';
import { ScoreConversionConfigService } from './score-conversion-config.service.js';
import { ScoreConversionConfigController } from './score-conversion-config.controller.js';
import { ScoringService } from './scoring.service.js';
import { ShortlistingController } from './shortlisting.controller.js';
import { SlotsService } from './slots.service.js';
import { SlotsController } from './slots.controller.js';
import { InterviewsBookingService } from './interviews-booking.service.js';
import { InterviewsBookingController } from './interviews-booking.controller.js';
import { InterviewEvaluation } from './entities/interview-evaluation.entity.js';
import { EvaluationScore } from './entities/evaluation-score.entity.js';
import { EvaluationsService } from './evaluations.service.js';
import { EvaluationsController } from './evaluations.controller.js';
import { CompositeScoreController } from './composite-score.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvaluationRubric,
      ShortlistingRule,
      ScoreConversionConfig,
      InterviewSlot,
      Interview,
      Application,
      InterviewEvaluation,
      EvaluationScore,
    ]),
  ],
  controllers: [
    // EvaluationsController must be registered before InterviewsBookingController:
    // both share the 'organizations/:orgId/interviews' prefix and Nest/Express
    // resolves routes in registration order, so the literal 'my-assignments'
    // route needs to win over InterviewsBookingController's ':id' pattern.
    EvaluationsController,
    RubricsController,
    ShortlistingRulesController,
    ScoreConversionConfigController,
    ShortlistingController,
    SlotsController,
    InterviewsBookingController,
    CompositeScoreController,
  ],
  providers: [
    RubricsService,
    ShortlistingRulesService,
    ScoreConversionConfigService,
    ScoringService,
    SlotsService,
    InterviewsBookingService,
    EvaluationsService,
  ],
  exports: [ScoringService, ScoreConversionConfigService, InterviewsBookingService, EvaluationsService],
})
export class InterviewsModule {}
