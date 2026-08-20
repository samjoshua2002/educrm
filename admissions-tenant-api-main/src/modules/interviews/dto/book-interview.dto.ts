import { IsString, IsNotEmpty, IsIn, IsArray, ArrayNotEmpty } from 'class-validator';

export class BookInterviewDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsIn(['GD', 'PI'])
  interviewType: 'GD' | 'PI';

  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  panelUserIds: string[];
}
