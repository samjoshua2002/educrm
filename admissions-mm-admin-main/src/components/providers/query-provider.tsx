"use client";

import * as React from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";
import { apiGet } from "@/lib/api";

function UserProfileSyncer() {
  const { user, updateUser } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => apiGet<any>("/users/me"),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  React.useEffect(() => {
    if (data && user && user.role !== "student") {
      const nameChanged = user.name !== data.name;
      const emailChanged = user.email !== data.email;
      const phoneChanged = (user.phone || "") !== (data.phone || "");

      if (nameChanged || emailChanged || phoneChanged) {
        updateUser({
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
        });
      }
    }
  }, [data, user, updateUser]);

  return null;
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileSyncer />
      {children}
    </QueryClientProvider>
  );
}
