import { IsEnum } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsEnum(['accepted', 'rejected', 'in_progress', 'submitted'], {
    message: 'Status must be one of: accepted, rejected, in_progress, submitted',
  })
  status: string;
}
