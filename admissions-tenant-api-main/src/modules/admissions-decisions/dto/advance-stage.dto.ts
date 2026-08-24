import { IsIn } from 'class-validator';

export class AdvanceStageDto {
  @IsIn(['committee_review', 'final_approval'])
  decisionStage: string;
}
