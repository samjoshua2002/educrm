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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvaluationRubric,
      ShortlistingRule,
      ScoreConversionConfig,
      InterviewSlot,
      Interview,
      Application,
    ]),
  ],
  controllers: [
    RubricsController,
    ShortlistingRulesController,
    ScoreConversionConfigController,
    ShortlistingController,
    SlotsController,
    InterviewsBookingController,
  ],
  providers: [
    RubricsService,
    ShortlistingRulesService,
    ScoreConversionConfigService,
    ScoringService,
    SlotsService,
    InterviewsBookingService,
  ],
  exports: [ScoringService, ScoreConversionConfigService, InterviewsBookingService],
})
export class InterviewsModule {}
