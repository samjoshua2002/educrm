import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  publicGet,
  publicPost,
} from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import {
  Form,
  Template,
  FormResponse,
  CreateFormInput,
  UpdateFormInput,
  SubmitFormInput,
} from "@/types/form";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

// 1. List Forms
export function useForms(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["forms", { orgId, page, limit, search, status }],
    queryFn: () =>
      apiGet<PaginatedResponse<Form>>(`/organizations/${orgId}/forms`, {
        page,
        limit,
        search,
        status,
      }),
    enabled: !!orgId,
  });
}

// 2. Single Form
export function useForm(id: string) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["form", id],
    queryFn: () => apiGet<Form>(`/organizations/${orgId}/forms/${id}`),
    enabled: !!orgId && !!id,
  });
}

// 3. Create Form
export function useCreateForm() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (data: CreateFormInput) =>
      apiPost<Form>(`/organizations/${orgId}/forms`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Form created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create form");
    },
  });
}

// 4. Update Form
export function useUpdateForm() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFormInput }) =>
      apiPatch<Form>(`/organizations/${orgId}/forms/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["form", variables.id] });
      toast.success("Form updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update form");
    },
  });
}

// 5. Delete Form
export function useDeleteForm() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/organizations/${orgId}/forms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Form deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete form");
    },
  });
}

// 6. Duplicate Form
export function useDuplicateForm() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (id: string) =>
      apiPost<Form>(`/organizations/${orgId}/forms/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Form duplicated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to duplicate form");
    },
  });
}

// 7. Form Templates
export function useFormTemplates() {
  return useQuery({
    queryKey: ["form-templates"],
    queryFn: () => apiGet<PaginatedResponse<Template>>("/form-templates"),
    staleTime: 0, // Always re-fetch when navigating to the page
  });
}

// 7b. Save Form as Template
export function useCreateTemplateFromForm() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (formId: string) =>
      apiPost<Template>(
        `/form-templates/from-form/${formId}/org/${orgId}`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Form saved as template successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to save form as template"
      );
    },
  });
}

// 7c. Delete Template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) =>
      apiDelete<void>(`/form-templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete template"
      );
    },
  });
}

// 7d. Remove Template by original Form ID
export function useRemoveTemplateByFormId() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (formId: string) =>
      apiDelete<void>(`/form-templates/from-form/${formId}/org/${orgId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Form template removed successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to remove form template"
      );
    },
  });
}



// 8. Form Responses
export function useFormResponses(
  formId: string,
  page: number = 1,
  limit: number = 10,
  status?: string,
) {
  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: ["form-responses", { orgId, formId, page, limit, status }],
    queryFn: () =>
      apiGet<PaginatedResponse<FormResponse>>(
        `/organizations/${orgId}/forms/${formId}/responses`,
        { page, limit, status },
      ),
    enabled: !!orgId && !!formId,
  });
}

// 9. Update Response Status
export function useUpdateResponseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: FormResponse["status"];
    }) => apiPatch<FormResponse>(`/responses/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-responses"] });
      toast.success("Response status updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update response");
    },
  });
}

// 10. Public Form (No Auth)
export function usePublicForm(slug: string) {
  return useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => publicGet<Form>(`/public/forms/${slug}`),
    enabled: !!slug,
    staleTime: 0,
  });
}

// 11. Submit Public Form (No Auth)
export function useSubmitPublicForm() {
  return useMutation({
    mutationFn: ({
      slug,
      data,
      utmData,
      source,
    }: { slug: string } & SubmitFormInput) =>
      publicPost(`/public/forms/${slug}/submit`, { data, utmData, source }),
    onSuccess: () => {
      toast.success("Form submitted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to submit form");
    },
  });
}
