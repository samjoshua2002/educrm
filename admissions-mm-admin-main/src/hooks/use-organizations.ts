import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { Organization, CreateOrganizationInput } from "@/types/organization";
import { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";

export function useOrganizations(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ["organizations", { page, limit }],
    queryFn: () =>
      apiGet<PaginatedResponse<Organization>>("/organizations", {
        page,
        limit,
      }),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ["organization", id],
    queryFn: () => apiGet<Organization>(`/organizations/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationInput) =>
      apiPost<Organization>("/organizations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create organization",
      );
    },
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Partial<CreateOrganizationInput> & { status?: string },
    ) => apiPatch<Organization>(`/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      toast.success("Organization updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update organization",
      );
    },
  });
}

export function useDeactivateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiPatch<Organization>(`/organizations/${id}`, { status: "expired" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      toast.success("Organization deactivated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to deactivate organization",
      );
    },
  });
}

export function useActivateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiPatch<Organization>(`/organizations/${id}`, { status: "active" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      toast.success("Organization activated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to activate organization",
      );
    },
  });
}

export function useUpdateOrganizationGeneric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateOrganizationInput> & { status?: string };
    }) => apiPatch<Organization>(`/organizations/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      toast.success("Organization updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update organization",
      );
    },
  });
}
