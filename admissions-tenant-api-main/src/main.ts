import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import pg from 'pg';

// Parse TIMESTAMP (without timezone) as UTC
pg.types.setTypeParser(1114, (str) => new Date(str + 'Z'));

async function bootstrap() {
  // rawBody: true preserves the raw request body buffer (req.rawBody) alongside
  // normal JSON parsing, needed for the Razorpay webhook HMAC signature check.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Global Exception Filter for standard error structure
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Interceptor for standard response structure
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin:  [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://192.168.0.101:3001',
    
  ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Admission Backend running on http://localhost:${port}/api`);
}
bootstrap();
