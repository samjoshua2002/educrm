"use client";

import * as React from "react";
import { ChevronLeft, Check, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  OrganizationSchema,
  OrganizationFormValues,
} from "@/lib/validations/organization";
import {
  useCreateOrganization,
  useUpdateOrganization,
  useOrganization,
} from "@/hooks/use-organizations";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = !!id;

  const { data: existingOrg, isLoading: isLoadingOrg } = useOrganization(
    id || "",
  );
  const { mutate: createOrg, isPending: isCreating } = useCreateOrganization();
  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrganization(
    id || "",
  );

  const isPending = isCreating || isUpdating || isLoadingOrg;

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(OrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      address: "",
      logoUrl: "",
      status: "active",
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1),
      ),
    },
  });

  // Hydrate form if editing
  React.useEffect(() => {
    if (existingOrg && isEdit) {
      form.reset({
        name: existingOrg.name,
        slug: existingOrg.slug,
        email: existingOrg.email,
        phone: existingOrg.phone,
        address: existingOrg.address,
        logoUrl: existingOrg.logoUrl || "",
        status: existingOrg.status?.toLowerCase() || "active",
        subscriptionStart: new Date(existingOrg.subscriptionStart),
        subscriptionEnd: new Date(existingOrg.subscriptionEnd),
      });
    }
  }, [existingOrg, isEdit, form]);

  function onSubmit(values: OrganizationFormValues) {
    const payload = {
      ...values,
      phone: values.phone || "",
      address: values.address || "",
      logoUrl: values.logoUrl || "",
      status: values.status || "active",
      subscriptionStart: values.subscriptionStart.toISOString(),
      subscriptionEnd: values.subscriptionEnd.toISOString(),
    };

    const mutation = isEdit ? updateOrg : createOrg;

    mutation(payload, {
      onSuccess: () => {
        router.push("/superadmin/organizations");
      },
      onError: (error: any) => {
        if (error.response?.status === 422 || error.response?.status === 400) {
          const errors = error.response?.data?.errors;
          if (errors) {
            Object.keys(errors).forEach((key) => {
              form.setError(key as any, { message: errors[key] });
            });
          }
        }
      },
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col h-full bg-background"
      >
        <div className="sticky top-0 z-10 bg-background flex items-center px-4 md:px-6 py-4 gap-3 border-b border-border">
          <Link href="/superadmin/organizations">
            <Button variant="ghost" size="icon" type="button" className="h-8 w-8">
              <ChevronLeft className="size-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">
            {isEdit ? "Edit Organization" : "Create Organization"}
          </h1>
        </div>

        <div className="px-4 md:px-6 py-6 overflow-auto">
          {isLoadingOrg && isEdit ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">
                Loading organization details...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column — col 8 */}
                <Card className="lg:col-span-8 bg-card border border-border rounded-[8px] shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-input px-6 ">
                    <CardTitle className="text-[18px] font-medium text-foreground">
                      Organization Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 flex flex-col">
                    {/* Organization Profile */}
                    <section className="flex flex-col gap-6 py-6">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[16px] font-medium text-foreground">
                          Organization Profile
                        </p>
                        <p className="text-[14px] text-muted-foreground">
                          Basic profile information of the tenant
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="flex flex-col gap-2 space-y-0">
                              <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                                Full Legal Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Sam Joshua"
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem className="flex flex-col gap-2 space-y-0">
                              <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                                Subdomain / Slug
                              </FormLabel>
                              <FormControl>
                                <div className="flex items-center">
                                  <span className="bg-muted px-3 h-[40px] border border-input border-r-0 rounded-l-[8px] flex items-center text-[12px] text-muted-foreground select-none">
                                    /
                                  </span>
                                  <Input
                                    placeholder="e.g., Sam@gmail.com"
                                    className="border border-input h-[40px] rounded-l-none rounded-r-[8px] text-[12px] placeholder:text-muted-foreground w-full"
                                    {...field}
                                    disabled={isEdit}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="flex flex-col gap-2 space-y-0">
                              <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                                Contact Email
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground w-full"
                                  placeholder="e.g., Sam@gmail.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem className="flex flex-col gap-2 space-y-0">
                              <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                                Contact Mobile
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground w-full"
                                  placeholder="e.g., +91 9876543210"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex flex-col gap-6">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="flex flex-col gap-2 space-y-0">
                              <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                                Primary Address
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground w-full"
                                  placeholder="123, chennai campus"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="logoUrl"
                          render={({ field }) => (
                            <FormItem className="flex flex-col gap-2 space-y-0">
                              <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                                Logo URL
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://"
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] placeholder:text-muted-foreground"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>
                  </CardContent>
                </Card>

                {/* Right Column — col 4 */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="border border-border rounded-[8px] bg-card p-6 flex flex-col gap-6">
                    <h2 className="text-[18px] font-medium text-foreground">
                      Subscription
                    </h2>

                    <div className="flex flex-col gap-6">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-2 space-y-0">
                            <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                              Status
                            </FormLabel>
                            <Select
                              key={field.value || "empty"}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full data-[placeholder]:text-muted-foreground">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">
                                  Suspended
                                </SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="subscriptionStart"
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-2 space-y-0">
                            <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                              Plans Start Date
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="date"
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full"
                                  value={
                                    field.value instanceof Date
                                      ? field.value.toISOString().split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    field.onChange(new Date(e.target.value))
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subscriptionEnd"
                        render={({ field }) => (
                          <FormItem className="flex flex-col gap-2 space-y-0">
                            <FormLabel className="text-[14px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                              Plans End Date
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="date"
                                  className="border border-input h-[40px] rounded-[8px] text-[12px] text-foreground w-full"
                                  value={
                                    field.value instanceof Date
                                      ? field.value.toISOString().split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    field.onChange(new Date(e.target.value))
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                      <Button
                        type="submit"
                        className="w-full bg-[#2563eb] hover:bg-[#2563eb]/90 text-white flex items-center justify-center gap-2 h-11 text-[15px] font-medium rounded-[8px]"
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <Check className="size-[18px]" />
                        )}
                        Save Organization
                      </Button>
                      <Link href="/superadmin/organizations" className="w-full">
                        <Button
                          variant="outline"
                          className="w-full border border-border h-11 text-[15px] font-medium text-foreground rounded-[8px] hover:bg-accent hover:text-accent-foreground"
                          type="button"
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Width Tenant Isolation Card */}
              <div className="bg-[#f0f4ff] dark:bg-blue-950/30 flex flex-col gap-3 p-6 rounded-[8px] border-0">
                <div className="flex items-center gap-2">
                  <Globe className="size-5 text-[#2563eb] dark:text-blue-400" />
                  <p className="text-[#2563eb] dark:text-blue-400 text-[18px] font-semibold leading-normal">
                    Tenant Isolation
                  </p>
                </div>
                <p className="text-foreground text-[12px] font-medium leading-[20px] tracking-[0.6px]">
                  Completing the Lead Source details helps the AI system better predict conversion rates for this campaign.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}
