import { IsNotEmpty, IsObject } from 'class-validator';

export class SubmitFormDto {
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
