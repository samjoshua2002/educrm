"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { apiPost } from "@/lib/api";
import { User, Role } from "@/types/auth";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  remember: z.boolean().optional(),
});

interface LoginResponse {
  access_token: string;
  user: User;
}

export function SaasLoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      // Step 1: Real API Call
      const response = await apiPost<LoginResponse>("/auth/login", {
        email: data.email,
        password: data.password,
      });

      // Step 2: Update Auth Store & Cookies
      login(response.access_token, response.user);
      
      toast.success("Login successful!");

      // Step 3: Role-based Redirection
      if (response.user.role === Role.SUPERADMIN) {
        router.push("/superadmin/dashboard");
      } else {
        router.push("/organization/dashboard");
      }
    } catch (error: any) {
      // API Interceptor handles generic toasts (401, 500)
      // Here we handle specific 400/422 validation if needed
      if (error.response?.status === 422 || error.response?.status === 400) {
        const errors = error.response?.data?.errors;
        if (errors) {
          Object.keys(errors).forEach((key) => {
            form.setError(key as any, { message: errors[key] });
          });
        } else {
          toast.error(error.response?.data?.message || "Invalid credentials");
        }
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-muted-foreground ml-1 text-sm font-medium">
                Remember me for 30 days
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Form>
  );
}
