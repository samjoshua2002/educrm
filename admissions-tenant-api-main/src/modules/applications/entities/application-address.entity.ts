import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './application.entity.js';

@Entity('application_addresses')
export class ApplicationAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (app) => app.addressRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ length: 50 })
  type: string;

  @Column({ name: 'address_line_1', type: 'text' })
  addressLine1: string;

  @Column({ name: 'address_line_2', type: 'text', nullable: true })
  addressLine2: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  district: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 20, nullable: true })
  pincode: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
