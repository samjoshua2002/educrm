import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Branch } from '../../branches/entities/branch.entity.js';
import { Lead } from '../../leads/entities/lead.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Student } from './student.entity.js';
import { ApplicationEducation } from './application-education.entity.js';
import { ApplicationEntranceTest } from './application-entrance-test.entity.js';
import { ApplicationWorkExperience } from './application-work-experience.entity.js';
import { ApplicationParent } from './application-parent.entity.js';
import { ApplicationAddress } from './application-address.entity.js';
import { ApplicationExtraCurricular } from './application-extra-curricular.entity.js';
import { ApplicationOtherQualification } from './application-other-qualification.entity.js';
import { ApplicationActivity } from './application-activity.entity.js';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'lead_id', nullable: true })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'assigned_counselor_id', nullable: true })
  assignedCounselorId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_counselor_id' })
  assignedCounselor: User;

  @Column({ name: 'application_no', length: 50, unique: true })
  applicationNo: string;

  @Column({ name: 'form_id', type: 'uuid', nullable: true })
  formId: string;

  @Column({ name: 'academic_session', length: 20 })
  academicSession: string;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @Column({ length: 255, nullable: true })
  program: string;

  @Column({ name: 'photo_url', length: 500, nullable: true })
  photoUrl: string;

  @Column({ name: 'form_status', default: 'incomplete' })
  formStatus: string;

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: string;

  @Column({ name: 'payment_mode', length: 50, nullable: true })
  paymentMode: string;

  @Column({ name: 'payment_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  paymentAmount: number;

  @Column({ name: 'payment_date', nullable: true })
  paymentDate: Date;

  @Column({ name: 'payment_reference', length: 100, nullable: true })
  paymentReference: string;

  @Column({ name: 'preference_1', nullable: true })
  preference1: string;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preference_1' })
  preference1Branch: Branch;

  @Column({ name: 'preference_2', nullable: true })
  preference2: string;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preference_2' })
  preference2Branch: Branch;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ name: 'primary_mobile', length: 50 })
  primaryMobile: string;

  @Column({ name: 'alternate_mobile', length: 50, nullable: true })
  alternateMobile: string;

  @Column({ length: 20, nullable: true })
  gender: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ name: 'age_as_on_reference', length: 50, nullable: true })
  ageAsOnReference: string;

  @Column({ length: 50, nullable: true })
  religion: string;

  @Column({ length: 50, default: 'Indian' })
  nationality: string;

  @Column({ name: 'aadhaar_number', length: 20, nullable: true })
  aadhaarNumber: string;

  @Column({ length: 20, nullable: true })
  category: string;

  @Column({ name: 'marital_status', length: 20, nullable: true })
  maritalStatus: string;

  @Column({ name: 'spouse_name', length: 255, nullable: true })
  spouseName: string;

  @Column({ name: 'spouse_occupation', length: 255, nullable: true })
  spouseOccupation: string;

  @Column({ name: 'inspiration_essay', type: 'text', nullable: true })
  inspirationEssay: string;

  @Column({ name: 'how_did_you_know', length: 255, nullable: true })
  howDidYouKnow: string;

  @Column({ name: 'has_medical_condition', default: false })
  hasMedicalCondition: boolean;

  @Column({ name: 'medical_condition_details', type: 'text', nullable: true })
  medicalConditionDetails: string;

  @Column({ name: 'declaration_accepted', default: false })
  declarationAccepted: boolean;

  @Column({ name: 'declaration_applicant_name', length: 255, nullable: true })
  declarationApplicantName: string;

  @Column({ name: 'declaration_parent_name', length: 255, nullable: true })
  declarationParentName: string;

  @Column({ name: 'declaration_date', type: 'date', nullable: true })
  declarationDate: Date;

  @Column({ name: 'declaration_place', length: 100, nullable: true })
  declarationPlace: string;

  @Column({ name: 'submitted_at', nullable: true })
  submittedAt: Date;

  @Column({ name: 'last_activity_at', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ApplicationEducation, (education) => education.application)
  educationRecords: ApplicationEducation[];

  @OneToMany(() => ApplicationEntranceTest, (test) => test.application)
  entranceTests: ApplicationEntranceTest[];

  @OneToMany(() => ApplicationWorkExperience, (exp) => exp.application)
  workExperienceRecords: ApplicationWorkExperience[];

  @OneToMany(() => ApplicationParent, (parent) => parent.application)
  parentRecords: ApplicationParent[];

  @OneToMany(() => ApplicationAddress, (address) => address.application)
  addressRecords: ApplicationAddress[];

  @OneToMany(() => ApplicationExtraCurricular, (activity) => activity.application)
  extraCurricularRecords: ApplicationExtraCurricular[];

  @OneToMany(() => ApplicationOtherQualification, (qual) => qual.application)
  otherQualificationRecords: ApplicationOtherQualification[];

  @OneToMany(() => ApplicationActivity, (activity) => activity.application)
  activities: ApplicationActivity[];
}
