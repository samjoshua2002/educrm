import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplateCategory } from './entities/email-template-category.entity.js';
import { EmailTemplateCategoryVariable } from './entities/email-template-category-variable.entity.js';
import { EmailTemplateCategoriesService } from './email-template-categories.service.js';
import { EmailTemplateCategoriesController } from './email-template-categories.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplateCategory, EmailTemplateCategoryVariable])],
  controllers: [EmailTemplateCategoriesController],
  providers: [EmailTemplateCategoriesService],
  exports: [EmailTemplateCategoriesService],
})
export class EmailTemplateCategoriesModule {}
