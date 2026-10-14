import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Chat transcript received from the chatbot webhook; qualified ones become leads. */
@Entity('chatbot_conversations')
@Index(['organizationId', 'externalId'], { unique: true })
export class ChatbotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  /** Conversation id in the chatbot platform */
  @Column({ name: 'external_id', length: 150 })
  externalId: string;

  @Column({ name: 'bot_name', type: 'varchar', length: 100, nullable: true })
  botName: string | null;

  @Column({ name: 'visitor_name', type: 'varchar', length: 255, nullable: true })
  visitorName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  intent: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  messages: { from: string; text: string; at?: string }[];

  @Column({ name: 'visitor_message_count', type: 'int', default: 0 })
  visitorMessageCount: number;

  /** qualified | not_qualified */
  @Column({ length: 20, default: 'not_qualified' })
  status: string;

  @Column({ name: 'qualification_reason', type: 'varchar', length: 255, nullable: true })
  qualificationReason: string | null;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
