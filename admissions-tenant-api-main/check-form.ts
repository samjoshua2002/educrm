import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { FormsService } from './src/modules/forms/forms.service.js';

async function checkForm() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const formsService = app.get(FormsService);
  const slug = 'ug-admission-2024-6718';
  try {
    const form = await formsService.findBySlug(slug);
    console.log('FORM FIELDS:', JSON.stringify(form.fields, null, 2));
  } catch (e) {
    console.error('Error fetching form:', e.message);
  }
  await app.close();
}

checkForm();
