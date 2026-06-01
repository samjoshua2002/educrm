import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { queryClient } from "@/lib/query-client";
import { ApiError, ApiResponse } from "@/types/api";

const COOKIE_NAME = "auth_token";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Create a public instance without the auth interceptor
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach token
api.interceptors.request.use((config) => {
  const token = Cookies.get(COOKIE_NAME);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Status-specific error handling
api.interceptors.response.use(
  (response) => {
    // Return the data field, and include pagination if it exists
    const body = response.data;
    if (body && typeof body === "object" && body.pagination && Array.isArray(body.data)) {
      return {
        data: body.data,
        pagination: body.pagination,
      };
    }
    return body.data;
  },
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    let message = error.response?.data?.message || error.message || "An unexpected error occurred.";
    if (Array.isArray(message)) {
      message = message.join(", ");
    }

    switch (status) {
      case 401:
        // Unauthorized: force logout and redirect
        toast.error("Session expired. Please login again.");
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        break;
      case 403:
        toast.error("You don't have permission to perform this action.");
        break;
      case 422:
        // Validation: errors should be handled by the form component via hook response
        // Instead of toast, we let the component catch the error.
        break;
      case 404:
        toast.error("Resource not found.");
        break;
      case 400:
        toast.error(message);
        break;
      case 500:
        toast.error("Something went wrong on the server.");
        break;
      default:
        toast.error(message);
    }
    return Promise.reject(error);
  }
);

// Typed Helper Functions
export const apiGet = <T>(url: string, params?: object): Promise<T> => 
  api.get(url, { params });

export const apiPost = <T>(url: string, data?: object): Promise<T> => 
  api.post(url, data);

export const apiPut = <T>(url: string, data?: object): Promise<T> => 
  api.put(url, data);

export const apiPatch = <T>(url: string, data?: object): Promise<T> => 
  api.patch(url, data);

export const apiDelete = <T>(url: string): Promise<T> => 
  api.delete(url);

// Public Typed Helpers
export const publicGet = <T>(url: string, params?: object): Promise<T> => 
  publicApi.get(url, { params }).then(res => res.data.data);

export const publicPost = <T>(url: string, data?: object): Promise<T> => 
  publicApi.post(url, data).then(res => res.data.data);

export default api;
