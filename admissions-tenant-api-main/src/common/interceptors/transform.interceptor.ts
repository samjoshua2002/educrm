import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'Operation successful';

    return next.handle().pipe(
      map((data) => {
        const isList = Array.isArray(data) || (data && data.data && Array.isArray(data.data));
        
        // If the data is already formatted with pagination (e.g. from service)
        if (data && data.data && data.total !== undefined) {
          const total = data.total;
          const limit = data.limit || data.data.length;
          const page = data.page || 1;
          const totalPages = Math.ceil(total / limit) || 1;

          return {
            success: true,
            message,
            data: data.data,
            pagination: {
              page,
              limit,
              total,
              totalPages,
            },
          };
        }

        // If it's a simple array (list without pagination data yet)
        if (Array.isArray(data)) {
          return {
            success: true,
            message,
            data,
            pagination: {
              page: 1,
              limit: data.length,
              total: data.length,
              totalPages: 1,
            },
          };
        }

        // Standard object response
        return {
          success: true,
          message,
          data: data,
        };
      }),
    );
  }
}
