import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplateCategory } from './entities/email-template-category.entity.js';
import { EmailTemplateCategoryVariable } from './entities/email-template-category-variable.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateVariableDto } from './dto/create-variable.dto.js';

type SeedVariable = Omit<CreateVariableDto, 'sortOrder'>;

const COMMON_VARIABLES: SeedVariable[] = [
  { key: 'name', tag: '{name}', label: 'Applicant Name', sampleValue: 'Aarav Sharma', sourceField: 'application.name' },
  { key: 'email', tag: '{email}', label: 'Applicant Email', sampleValue: 'aarav@example.com', sourceField: 'application.email' },
  { key: 'phone', tag: '{phone}', label: 'Applicant Phone', sampleValue: '+91 98765 43210', sourceField: 'application.primaryMobile' },
  { key: 'application_no', tag: '{application_no}', label: 'Application Number', sampleValue: 'APP-2026-00123', sourceField: 'application.applicationNo' },
  { key: 'academic_session', tag: '{academic_session}', label: 'Academic Session', sampleValue: '2026-27', sourceField: 'application.academicSession' },
  { key: 'course', tag: '{course}', label: 'Course', sampleValue: 'B.Tech Computer Science', sourceField: 'application.course.name' },
  { key: 'branch', tag: '{branch}', label: 'Branch', sampleValue: 'Main Campus', sourceField: 'application.branch.name' },
];

const SEED_CATEGORIES: { name: string; slug: string; description: string; variables: SeedVariable[] }[] = [
  {
    name: 'Application Submitted',
    slug: 'application_submitted',
    description: 'Sent when a candidate completes and submits their application form.',
    variables: [
      { key: 'submitted_at', tag: '{submitted_at}', label: 'Submission Date', sampleValue: '12 Sep 2026', sourceField: 'application.submittedAt' },
    ],
  },
  {
    name: 'Fee Payment Confirmation',
    slug: 'fee_payment_confirmation',
    description: 'Sent when the application fee payment succeeds via Razorpay.',
    variables: [
      { key: 'amount', tag: '{amount}', label: 'Amount Paid', sampleValue: '2,000', sourceField: 'paymentOrder.amount' },
      { key: 'currency', tag: '{currency}', label: 'Currency', sampleValue: 'INR', sourceField: 'paymentOrder.currency' },
      { key: 'payment_method', tag: '{payment_method}', label: 'Payment Method', sampleValue: 'UPI', sourceField: 'paymentOrder.method' },
      { key: 'transaction_id', tag: '{transaction_id}', label: 'Transaction ID', sampleValue: 'pay_Q1r2s3T4u5V6w7', sourceField: 'paymentOrder.razorpayPaymentId' },
      { key: 'paid_at', tag: '{paid_at}', label: 'Payment Date', sampleValue: '12 Sep 2026', sourceField: 'paymentOrder.paidAt' },
    ],
  },
  {
    name: 'Shortlisted',
    slug: 'shortlisted',
    description: 'Sent when a candidate is shortlisted for the next selection round.',
    variables: [
      { key: 'shortlist_score', tag: '{shortlist_score}', label: 'Shortlist Score', sampleValue: '87.5', sourceField: 'application.shortlistScore' },
    ],
  },
  {
    name: 'Interview/GD Slot Invitation',
    slug: 'interview_gd_slot_invitation',
    description: 'Sent when an interview or group discussion slot is booked for a candidate.',
    variables: [
      { key: 'interview_type', tag: '{interview_type}', label: 'Interview Type', sampleValue: 'GD', sourceField: 'interview.interviewType' },
      { key: 'round', tag: '{round}', label: 'Round', sampleValue: '1', sourceField: 'interview.round' },
      { key: 'date', tag: '{date}', label: 'Slot Date', sampleValue: '20 Sep 2026', sourceField: 'interviewSlot.slotDate' },
      { key: 'time', tag: '{time}', label: 'Slot Time', sampleValue: '10:00 AM', sourceField: 'interviewSlot.startTime' },
      { key: 'venue', tag: '{venue}', label: 'Venue', sampleValue: 'Main Campus, Room 204', sourceField: 'interviewSlot.location' },
      { key: 'meeting_link', tag: '{meeting_link}', label: 'Meeting Link', sampleValue: 'https://meet.example.com/abc', sourceField: 'interviewSlot.meetingLink' },
    ],
  },
  {
    name: 'Interview/GD Reschedule',
    slug: 'interview_gd_reschedule',
    description: 'Sent when an interview or group discussion slot is rescheduled.',
    variables: [
      { key: 'interview_type', tag: '{interview_type}', label: 'Interview Type', sampleValue: 'PI', sourceField: 'interview.interviewType' },
      { key: 'old_date', tag: '{old_date}', label: 'Previous Date', sampleValue: '20 Sep 2026', sourceField: 'interviewSlot.slotDate (previous)' },
      { key: 'date', tag: '{date}', label: 'New Date', sampleValue: '22 Sep 2026', sourceField: 'interviewSlot.slotDate' },
      { key: 'time', tag: '{time}', label: 'New Time', sampleValue: '2:00 PM', sourceField: 'interviewSlot.startTime' },
      { key: 'venue', tag: '{venue}', label: 'Venue', sampleValue: 'Main Campus, Room 204', sourceField: 'interviewSlot.location' },
      { key: 'meeting_link', tag: '{meeting_link}', label: 'Meeting Link', sampleValue: 'https://meet.example.com/abc', sourceField: 'interviewSlot.meetingLink' },
    ],
  },
  {
    name: 'Interview/GD Cancellation',
    slug: 'interview_gd_cancellation',
    description: 'Sent when a scheduled interview or group discussion is cancelled.',
    variables: [
      { key: 'interview_type', tag: '{interview_type}', label: 'Interview Type', sampleValue: 'GD', sourceField: 'interview.interviewType' },
      { key: 'round', tag: '{round}', label: 'Round', sampleValue: '1', sourceField: 'interview.round' },
      { key: 'date', tag: '{date}', label: 'Cancelled Slot Date', sampleValue: '20 Sep 2026', sourceField: 'interviewSlot.slotDate' },
      { key: 'time', tag: '{time}', label: 'Cancelled Slot Time', sampleValue: '10:00 AM', sourceField: 'interviewSlot.startTime' },
    ],
  },
  {
    name: 'Results/Scores Updated',
    slug: 'results_scores_updated',
    description: 'Sent when interview/GD evaluation results are finalized for a candidate.',
    variables: [
      { key: 'composite_score', tag: '{composite_score}', label: 'Composite Score', sampleValue: '82.3', sourceField: 'application.compositeScore' },
      { key: 'gdpi_total', tag: '{gdpi_total}', label: 'GD+PI Total', sampleValue: '45', sourceField: 'application.gdpiTotal' },
      { key: 'recommendation', tag: '{recommendation}', label: 'Panel Recommendation', sampleValue: 'Recommend', sourceField: 'interviewEvaluation.overallRecommendation' },
    ],
  },
  {
    name: 'Offer Letter Sent',
    slug: 'offer_letter_sent',
    description: 'Sent when an offer letter is issued to a candidate.',
    variables: [
      { key: 'offer_type', tag: '{offer_type}', label: 'Offer Type', sampleValue: 'Regular', sourceField: 'offerLetter.offerType' },
      { key: 'program_offered', tag: '{program_offered}', label: 'Program Offered', sampleValue: 'B.Tech Computer Science', sourceField: 'offerLetter.programOffered' },
      { key: 'offer_valid_till', tag: '{offer_valid_till}', label: 'Offer Valid Till', sampleValue: '30 Sep 2026', sourceField: 'offerLetter.offerValidTill' },
      { key: 'scholarship_amount', tag: '{scholarship_amount}', label: 'Scholarship Amount', sampleValue: '50,000', sourceField: 'offerLetter.scholarshipAmount' },
      { key: 'conditions', tag: '{conditions}', label: 'Offer Conditions', sampleValue: 'Subject to document verification', sourceField: 'offerLetter.conditions' },
      { key: 'sent_at', tag: '{sent_at}', label: 'Offer Sent Date', sampleValue: '18 Sep 2026', sourceField: 'offerLetter.sentAt' },
    ],
  },
  {
    name: 'Waitlisted',
    slug: 'waitlisted',
    description: 'Sent when a candidate is placed on the waitlist.',
    variables: [
      { key: 'waitlist_rank', tag: '{waitlist_rank}', label: 'Waitlist Rank', sampleValue: '12', sourceField: 'waitlistEntry.waitlistRank' },
      { key: 'alternate_program', tag: '{alternate_program}', label: 'Alternate Program Offered', sampleValue: 'B.Tech IT', sourceField: 'waitlistEntry.alternateProgramOffered' },
    ],
  },
  {
    name: 'Waitlist to Offer Conversion',
    slug: 'waitlist_offer_conversion',
    description: 'Sent when a waitlisted candidate is moved off the waitlist with an offer.',
    variables: [
      { key: 'waitlist_rank', tag: '{waitlist_rank}', label: 'Waitlist Rank', sampleValue: '12', sourceField: 'waitlistEntry.waitlistRank' },
      { key: 'movement_trigger', tag: '{movement_trigger}', label: 'Movement Trigger', sampleValue: 'Seat vacated', sourceField: 'waitlistEntry.movementTrigger' },
      { key: 'program_offered', tag: '{program_offered}', label: 'Program Offered', sampleValue: 'B.Tech Computer Science', sourceField: 'offerLetter.programOffered' },
      { key: 'offer_valid_till', tag: '{offer_valid_till}', label: 'Offer Valid Till', sampleValue: '30 Sep 2026', sourceField: 'offerLetter.offerValidTill' },
    ],
  },
  {
    name: 'Enrollment Confirmed',
    slug: 'enrollment_confirmed',
    description: 'Sent when a candidate confirms enrollment, marking the end of the funnel.',
    variables: [
      { key: 'confirmation_date', tag: '{confirmation_date}', label: 'Confirmation Date', sampleValue: '25 Sep 2026', sourceField: 'offerAcceptance.candidateConfirmationDate' },
      { key: 'seat_booking_fee', tag: '{seat_booking_fee}', label: 'Seat Booking Fee', sampleValue: '10,000', sourceField: 'offerAcceptance.seatBookingFee' },
      { key: 'fee_payment_status', tag: '{fee_payment_status}', label: 'Fee Payment Status', sampleValue: 'Paid', sourceField: 'offerAcceptance.feePaymentStatus' },
      { key: 'onboarding_info', tag: '{onboarding_info}', label: 'Onboarding Info', sampleValue: 'Orientation on 1 Oct 2026', sourceField: 'offerAcceptance.onboardingInfo' },
    ],
  },
];

@Injectable()
export class EmailTemplateCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplateCategoriesService.name);

  constructor(
    @InjectRepository(EmailTemplateCategory)
    private readonly categoryRepo: Repository<EmailTemplateCategory>,
    @InjectRepository(EmailTemplateCategoryVariable)
    private readonly variableRepo: Repository<EmailTemplateCategoryVariable>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    try {
      const count = await this.categoryRepo.count();
      if (count > 0) return;

      for (let i = 0; i < SEED_CATEGORIES.length; i++) {
        const seed = SEED_CATEGORIES[i];
        const category = await this.categoryRepo.save(
          this.categoryRepo.create({
            organizationId: null,
            name: seed.name,
            slug: seed.slug,
            description: seed.description,
            sortOrder: i,
            isActive: true,
          }),
        );

        const allVariables = [...COMMON_VARIABLES, ...seed.variables];
        const variableRows = allVariables.map((v, idx) =>
          this.variableRepo.create({
            categoryId: category.id,
            key: v.key,
            tag: v.tag,
            label: v.label,
            description: v.description,
            sampleValue: v.sampleValue,
            sourceField: v.sourceField,
            sortOrder: idx,
          }),
        );
        await this.variableRepo.save(variableRows);
      }

      this.logger.log('Seeded default email template categories successfully.');
    } catch (err: any) {
      this.logger.warn(`Failed to seed default email template categories: ${err?.message || err}`);
    }
  }

  async findAll(orgId?: string): Promise<EmailTemplateCategory[]> {
    const qb = this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.variables', 'variable')
      .where('cat.is_active = true');

    if (orgId) {
      qb.andWhere('(cat.organization_id = :orgId OR cat.organization_id IS NULL)', { orgId });
    } else {
      qb.andWhere('cat.organization_id IS NULL');
    }

    qb.orderBy('cat.sort_order', 'ASC').addOrderBy('variable.sort_order', 'ASC');
    return qb.getMany();
  }

  // Prefers an org-specific category over the global one with the same
  // slug — used by transactional-email sending, where the caller only
  // knows the lifecycle event's slug (e.g. "application_submitted").
  async findBySlugForOrg(slug: string, orgId: string | null): Promise<EmailTemplateCategory | null> {
    const qb = this.categoryRepo
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.variables', 'variable')
      .where('cat.slug = :slug', { slug })
      .andWhere('cat.is_active = true');

    if (orgId) {
      qb.andWhere('(cat.organization_id = :orgId OR cat.organization_id IS NULL)', { orgId });
    } else {
      qb.andWhere('cat.organization_id IS NULL');
    }

    const rows = await qb.getMany();
    if (rows.length === 0) return null;
    return rows.find((r) => r.organizationId === orgId) || rows.find((r) => r.organizationId === null) || rows[0];
  }

  async findOne(id: string): Promise<EmailTemplateCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['variables'],
      order: { variables: { sortOrder: 'ASC' } },
    });
    if (!category) {
      throw new NotFoundException(`Email template category with ID ${id} not found`);
    }
    return category;
  }

  async create(orgId: string | null, dto: CreateCategoryDto): Promise<EmailTemplateCategory> {
    const category = this.categoryRepo.create({ ...dto, organizationId: orgId });
    return this.categoryRepo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<EmailTemplateCategory> {
    const category = await this.findOne(id);
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    category.isActive = false;
    await this.categoryRepo.save(category);
  }

  async addVariable(categoryId: string, dto: CreateVariableDto): Promise<EmailTemplateCategoryVariable> {
    await this.findOne(categoryId);
    const variable = this.variableRepo.create({ ...dto, categoryId });
    return this.variableRepo.save(variable);
  }

  async removeVariable(categoryId: string, variableId: string): Promise<void> {
    const variable = await this.variableRepo.findOne({ where: { id: variableId, categoryId } });
    if (!variable) {
      throw new NotFoundException(`Variable with ID ${variableId} not found in this category`);
    }
    await this.variableRepo.remove(variable);
  }
}
