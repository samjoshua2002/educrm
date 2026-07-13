import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { FormsService } from './modules/forms/forms.service.js';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const formsService = app.get(FormsService);
  try {
    const slug = 'untitled-form-5432';
    const form = await formsService.findBySlug(slug);
    console.log('Original fields order:', form.fields.map(f => f.id));
    
    // Find banner field
    const bannerField = form.fields.find(f => f.type === 'banner');
    if (bannerField) {
      const otherFields = form.fields.filter(f => f.type !== 'banner');
      const reorderedFields = [bannerField, ...otherFields];
      
      console.log('New fields order to save:', reorderedFields.map(f => f.id));
      
      // Update form fields
      await formsService.update(form.id, form.organizationId, {
        fields: reorderedFields
      });
      console.log('Reordered successfully!');
    } else {
      console.log('No banner field found.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  await app.close();
}

main();
