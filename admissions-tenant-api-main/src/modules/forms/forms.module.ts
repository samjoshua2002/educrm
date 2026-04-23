import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity.js';
import { FormTemplate } from './entities/form-template.entity.js';
import { FormResponse } from './entities/form-response.entity.js';
import { FormField } from './entities/form-field.entity.js';
import { FormSubmission } from './entities/form-submission.entity.js';
import { FormStats } from './entities/form-stats.entity.js';
import { FormDailyStats } from './entities/form-daily-stats.entity.js';
import { FormsController } from './forms.controller.js';
import { PublicFormsController } from './public-forms.controller.js';
import { FormTemplatesController } from './form-templates.controller.js';
import { ResponsesController } from './responses.controller.js';
import { FormsService } from './forms.service.js';
import { LeadsModule } from '../leads/leads.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormTemplate,
      FormResponse,
      FormField,
      FormSubmission,
      FormStats,
      FormDailyStats,
    ]),
    LeadsModule,
  ],
  controllers: [
    FormsController,
    PublicFormsController,
    FormTemplatesController,
    ResponsesController,
  ],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
