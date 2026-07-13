import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { FormsService } from './modules/forms/forms.service.js';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const formsService = app.get(FormsService);
  try {
    const slug = 'untitled-form-5432';
    const form = await formsService.findBySlug(slug);
    console.log('FORM SLUG:', form.slug);
    console.log('ORGANIZATION:', form.organization);
    if (form.organization) {
      console.log('BRANCHES:', (form.organization as any).branches);
    }
  } catch (e) {
    console.error('Error fetching form:', e.message);
  }
  await app.close();
}

main();
