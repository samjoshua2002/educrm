import { IsEnum } from 'class-validator';

// Accepts the internal values used by existing screens plus the scope's
// Application_Status picklist (Started / Submitted / Under Review / Approved / Rejected).
const STATUSES = [
  'accepted',
  'rejected',
  'in_progress',
  'submitted',
  'under_review',
  'incomplete',
  'Started',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
];

export class UpdateApplicationStatusDto {
  @IsEnum(STATUSES, {
    message: 'Status must be one of: Started, Submitted, Under Review, Approved, Rejected',
  })
  status: string;
}
