import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Scope 4 rule types */
export const ROUTING_RULE_TYPES = ['geography', 'program', 'lead_score', 'load_balancing'] as const;
export type RoutingRuleType = (typeof ROUTING_RULE_TYPES)[number];

export type DistributionMode = 'round_robin' | 'load_based';

/**
 * Ordered assignment rule. Rules are evaluated by priority (lowest first);
 * the first matching rule decides who gets the lead.
 *
 * - geography:      field (country|state|city) operator value  → assignees
 * - program:        courseId / program interest in value        → assignees (program specialists)
 * - lead_score:     score >= value                               → assignees (senior counselors)
 * - load_balancing: always matches                               → distribute among assignees / role pool
 */
@Entity('lead_routing_rules')
export class LeadRoutingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'rule_type', length: 30 })
  ruleType: RoutingRuleType;

  /** geography: country | state | city; program: course | program; lead_score: score */
  @Column({ type: 'varchar', length: 30, nullable: true })
  field: string | null;

  /** eq | in | gte */
  @Column({ type: 'varchar', length: 20, default: 'eq' })
  operator: string;

  /** Comma-separated values (countries, course ids/names) or a number for lead_score */
  @Column({ type: 'text', nullable: true })
  value: string | null;

  /** Explicit counselors to receive leads matched by this rule */
  @Column({ name: 'assignee_ids', type: 'jsonb', default: () => "'[]'" })
  assigneeIds: string[];

  /** When no explicit assignees: distribute among active users with this role */
  @Column({ name: 'assignee_role', type: 'varchar', length: 50, nullable: true })
  assigneeRole: string | null;

  @Column({ type: 'varchar', length: 20, default: 'round_robin' })
  distribution: DistributionMode;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Round-robin cursor: last user that received a lead from this rule */
  @Column({ name: 'last_assigned_user_id', type: 'uuid', nullable: true })
  lastAssignedUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
