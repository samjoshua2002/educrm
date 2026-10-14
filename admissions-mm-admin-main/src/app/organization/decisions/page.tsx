"use client";

import * as React from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { Settings2 } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageHeader } from "@/hooks/use-page-header";
import { useAuthStore } from "@/stores/auth-store";

import { DecisionsTab } from "./_components/decisions-tab";
import {
  AcceptancesTab,
  OffersTab,
  RejectionsTab,
  WaitlistTab,
} from "./_components/outcome-tabs";
import {
  AccessRestricted,
  DECISION_ROLES,
  DECISION_WRITE_ROLES,
} from "./_components/shared";

const TABS = [
  { value: "decisions", label: "Decisions" },
  { value: "offers", label: "Offer Letters" },
  { value: "acceptances", label: "Acceptances" },
  { value: "waitlist", label: "Waitlist" },
  { value: "rejections", label: "Rejections" },
] as const;

function DecisionsPageInner() {
  const user = useAuthStore((s) => s.user);
  const canAccess = !!user && DECISION_ROLES.includes(user.role);
  const canWrite = !!user && DECISION_WRITE_ROLES.includes(user.role);
  const isAdmin = !!user && ["org_admin", "superadmin"].includes(user.role);

  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = TABS.some((t) => t.value === tabParam)
    ? (tabParam as string)
    : "decisions";

  const headerAction = React.useMemo(
    () =>
      isAdmin
        ? {
            label: "Decision Settings",
            href: "/organization/decisions/settings",
            icon: <Settings2 className="size-4" />,
          }
        : null,
    [isAdmin],
  );

  usePageHeader({
    title: "Admission Decisions",
    description:
      "Decision workflow, offer letters, acceptances, waitlist and rejections.",
    action: headerAction,
  });

  if (!canAccess) {
    return (
      <AccessRestricted message="Only organization staff can open admission decisions." />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <Tabs
        value={tab}
        onValueChange={(v) =>
          router.replace(
            `/organization/decisions${v === "decisions" ? "" : `?tab=${v}`}`,
          )
        }
        className="w-full"
      >
        <div className="overflow-x-auto">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="decisions" className="mt-2">
          <DecisionsTab />
        </TabsContent>
        <TabsContent value="offers" className="mt-2">
          <OffersTab />
        </TabsContent>
        <TabsContent value="acceptances" className="mt-2">
          <AcceptancesTab />
        </TabsContent>
        <TabsContent value="waitlist" className="mt-2">
          <WaitlistTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="rejections" className="mt-2">
          <RejectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdmissionDecisionsPage() {
  return (
    <React.Suspense fallback={null}>
      <DecisionsPageInner />
    </React.Suspense>
  );
}
