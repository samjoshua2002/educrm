"use client";

import * as React from "react";
import Link from "next/link";

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
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = React.useState(false);

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
      const response = await apiPost<LoginResponse>("/auth/login", {
        email: data.email,
        password: data.password,
      });

      login(response.access_token, response.user);
      toast.success("Login successful!");

      if (response.user.role === Role.SUPERADMIN) {
        router.push("/superadmin/dashboard");
      } else {
        router.push("/organization/dashboard");
      }
    } catch (error: any) {
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
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-5"
        suppressHydrationWarning={true}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[#64748B] text-base font-medium">Email or phone number</FormLabel>
              <FormControl>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="" 
                  autoComplete="email" 
                  className="h-12 border-[#66666659] rounded-[10px] bg-white focus-visible:ring-[#2563EB]/20 focus-visible:border-[#2563EB]"
                  suppressHydrationWarning={true}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center justify-between">
                <FormLabel className="text-[#64748B] text-base font-medium">Password</FormLabel>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[#64748B] text-base font-medium flex items-center gap-1 hover:text-[#2563EB] transition-colors"
                  suppressHydrationWarning={true}
                >
                  {showPassword ? (
                    <EyeOff size={14} strokeWidth={2} />
                  ) : (
                    <Eye size={14} strokeWidth={2} />
                  )}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <FormControl>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  autoComplete="current-password"
                  className="h-12 border-[#66666659] rounded-[10px] bg-white focus-visible:ring-[#2563EB]/20 focus-visible:border-[#2563EB]"
                  suppressHydrationWarning={true}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

     

        <Button 
          className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[25px] font-medium text-base shadow-lg transition-all mt-1" 
          type="submit" 
          disabled={form.formState.isSubmitting}
          suppressHydrationWarning={true}
        >
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
           <div className="flex items-center justify-between pt-1">
          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-y-0 gap-2">
                <FormControl>
                  <Checkbox
                    id="login-remember"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="size-4 border-[#66666659] data-[state=checked]:bg-[#0B0033] data-[state=checked]:border-[#0B0033]"
                    suppressHydrationWarning={true}
                  />
                </FormControl>
                <FormLabel htmlFor="login-remember" className="text-[#4B5563] text-base font-medium cursor-pointer">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />
          <Link href="#" className="text-[#4B5563] text-base font-medium hover:text-[#2563EB]">
            Need help?
          </Link>
        </div>
      </form>
    </Form>
  );
}
