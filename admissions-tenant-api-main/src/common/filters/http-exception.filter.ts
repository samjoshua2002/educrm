import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException 
      ? exception.getResponse() 
      : null;

    let message = 'Internal server error';
    let errors: Record<string, string> | undefined = undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      message = typeof res === 'string' ? res : res.message || exception.message;
      
      // Handle Validation errors
      if (status === HttpStatus.BAD_REQUEST && res.message && Array.isArray(res.message)) {
        errors = {};
        res.message.forEach((msg: string) => {
          const field = msg.split(' ')[0];
          if (errors) {
            errors[field] = msg;
          }
        });
        message = 'Validation failed';
      }
    } else {
      console.error('Unhandled Exception:', exception);
    }

    response.status(status).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
