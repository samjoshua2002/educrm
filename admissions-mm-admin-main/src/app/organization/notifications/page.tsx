"use client";

import { usePageHeader } from "@/hooks/use-page-header";
import { NotificationsPageView } from "@/components/notifications/notifications-page-view";

export default function NotificationsPage() {
  usePageHeader({
    title: "Notifications & Alerts",
    description: "Every alert and update addressed to you, filterable by module and severity.",
  });
  return <NotificationsPageView />;
}
