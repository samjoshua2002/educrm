"use client";

import { useEffect } from "react";
import { usePageHeaderStore, PageHeaderAction } from "@/stores/page-header-store";

interface UsePageHeaderOptions {
  title: string;
  description?: string;
  action?: PageHeaderAction | null;
}

/**
 * Call this hook inside a page component to register dynamic header
 * content (title, description, action button) for the layout's DynamicHeader.
 *
 * The header is automatically cleared when the component unmounts.
 */
export function usePageHeader({ title, description, action }: UsePageHeaderOptions) {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  useEffect(() => {
    setHeader({ title, description: description ?? undefined, action: action ?? null });
    return () => {
      clearHeader();
    };
    // Re-register if any values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description]);
}
