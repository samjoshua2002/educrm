export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export interface InAppNotificationItem {
  id: string;
  organizationId: string | null;
  module: string;
  type: string;
  severity: NotificationSeverity | string;
  title: string;
  body: string | null;
  link: string | null;
  relatedEntityId: string | null;
  metadata: Record<string, any> | null;
  recipientRole: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  data: InAppNotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationFilters {
  module?: string;
  severity?: string;
  status?: "all" | "read" | "unread";
  search?: string;
  page?: number;
  limit?: number;
}

export interface NotificationModuleSummary {
  module: string;
  total: number;
  unread: number;
}
