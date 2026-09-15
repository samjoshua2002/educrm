/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { EmailTemplateCategory, CreateCategoryVariableInput } from "@/types/email-template-category";
import { PaginatedResponse } from "@/types/api";

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
}

/**
 * Live category + variable catalog, sourced from the API only.
 * There is no local fallback list here on purpose: a stale hardcoded
 * catalog is what caused the old AVAILABLE_SHORTCUTS list to drift from
 * the backend's actual variable set.
 */
export function useEmailTemplateCategories() {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["email-template-categories", { orgId }],
    queryFn: async () => {
      const res = await apiGet<EmailTemplateCategory[] | PaginatedResponse<EmailTemplateCategory>>(
        "/email-template-categories",
        orgId ? { orgId } : undefined,
      );
      return Array.isArray(res) ? res : res.data;
    },
  });
}

export function useEmailTemplateCategory(id?: string | null) {
  return useQuery({
    queryKey: ["email-template-category", id],
    queryFn: async () => {
      if (!id) return null;
      return apiGet<EmailTemplateCategory>(`/email-template-categories/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCategoryInput) => {
      return apiPost<EmailTemplateCategory>("/email-template-categories", dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template-categories"] });
      toast.success("Category created successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create category");
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      return apiDelete(`/email-template-categories/${categoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-template-categories"] });
      toast.success("Category deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete category");
    },
  });
}

export function useAddCategoryVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, dto }: { categoryId: string; dto: CreateCategoryVariableInput }) => {
      return apiPost(`/email-template-categories/${categoryId}/variables`, dto);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["email-template-categories"] });
      queryClient.invalidateQueries({ queryKey: ["email-template-category", vars.categoryId] });
      toast.success("Variable added successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add variable");
    },
  });
}

export function useRemoveCategoryVariable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, variableId }: { categoryId: string; variableId: string }) => {
      return apiDelete(`/email-template-categories/${categoryId}/variables/${variableId}`);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["email-template-categories"] });
      queryClient.invalidateQueries({ queryKey: ["email-template-category", vars.categoryId] });
      toast.success("Variable removed successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove variable");
    },
  });
}
