"use client";

import * as React from "react";
import { ChevronLeft, Save, X, Globe, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Loader2 } from "lucide-react";

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
        <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b gap-3">
          <Link href="/superadmin/organizations">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="size-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">
            {isEdit ? "Edit Organization" : "Create Organization"}
          </h1>
        </div>

        <div className="p-4 md:p-6 overflow-auto">
          {isLoadingOrg && isEdit ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">
                Loading organization details...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column — col 8 */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Profile</CardTitle>
                    <CardDescription>
                      {isEdit
                        ? "Update the profile information for the organization."
                        : "Enter the basic profile information for the new tenant."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Full Legal Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Institute of Technology"
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
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Subdomain / Slug
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm text-muted-foreground select-none">
                                  /
                                </span>
                                <Input
                                  placeholder="iot-main"
                                  className="rounded-l-none"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Contact Email
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  className="pl-9"
                                  placeholder="admin@org.com"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Contact Phone
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  className="pl-9"
                                  placeholder="+91 98765 43210"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Primary Address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                placeholder="123 Campus Road, Academic District"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Logo URL
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex gap-4">
                  <Globe className="size-6 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                      Tenant Isolation
                    </h4>
                    <p className="text-sm text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                      {isEdit
                        ? "Updates to the organization will be propagated across their dedicated resources."
                        : "Creating an organization will initialize a private database schema and dedicated storage bucket. The slug will be used as the unique identifier for their access portal."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column — col 4 */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Status
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
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
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Plan Start Date
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                value={
                                  field.value instanceof Date
                                    ? field.value.toISOString().split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  field.onChange(new Date(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="subscriptionEnd"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Plan End Date
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                value={
                                  field.value instanceof Date
                                    ? field.value.toISOString().split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  field.onChange(new Date(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {isEdit ? "Update Organization" : "Create Organization"}
                      </Button>
                      <Link href="/superadmin/organizations" className="w-full">
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          disabled={isPending}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}
