export interface OrganizationIntegrationSettings {
  organizationId: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  razorpayWebhookSecret?: string | null;
}

export type UpdateOrganizationIntegrationSettingsInput = Partial<
  Omit<OrganizationIntegrationSettings, "organizationId">
>;
