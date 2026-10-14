"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Legacy route: the lead detail page lives in /organization/lead-manager/edit,
// which shows the full Lead Management data (source tracking, score, routing,
// duplicates, activity history).
function RedirectInner() {
  const router = useRouter();
  const params = useSearchParams();
  React.useEffect(() => {
    const id = params.get("id");
    router.replace(id ? `/organization/lead-manager/edit?id=${encodeURIComponent(id)}` : "/organization/lead-manager");
  }, [params, router]);
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function LegacyLeadEditPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <RedirectInner />
    </React.Suspense>
  );
}
