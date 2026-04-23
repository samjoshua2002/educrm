"use client";

import * as React from "react";
import { ChevronLeft, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useCreateBranch } from "@/hooks/use-branches";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
] as const;

export default function CreateBranchPage() {
  const router = useRouter();
  const { mutate: createBranch, isPending } = useCreateBranch();

  const [form, setForm] = React.useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    isActive: true,
    description: "",
  });

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const { description, ...payload } = form; // Strip description as per new API spec
    createBranch(payload, {
      onSuccess: () => {
        router.push("/organization/branches");
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b gap-3">
        <Link href="/organization/branches">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">
          Add Branch
        </h1>
      </div>

      <div className="p-4 md:p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column — col 8 */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Branch Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                
                {/* Basic Info */}
                <section className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold">Basic Information</p>
                    <p className="text-xs text-muted-foreground">Unique identifier and name for this branch.</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
                      <Input 
                        placeholder="e.g. North Campus" 
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch Code</Label>
                      <Input 
                        placeholder="e.g. NC-01" 
                        value={form.code}
                        onChange={(e) => set("code", e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Location Info */}
                <section className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold">Location Details</p>
                    <p className="text-xs text-muted-foreground">Physical address of the branch.</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label>
                      <Input 
                        placeholder="Full physical address" 
                        value={form.address}
                        onChange={(e) => set("address", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</Label>
                        <Select value={form.state} onValueChange={(v) => set("state", v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDIAN_STATES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label>
                        <Input 
                          placeholder="e.g. Mumbai" 
                          value={form.city}
                          onChange={(e) => set("city", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Description */}
                <section className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold">Description</p>
                    <p className="text-xs text-muted-foreground">Optional notes about this location.</p>
                  </div>
                  <Separator />
                  <Textarea 
                    placeholder="Enter branch description or notes..." 
                    className="min-h-24 resize-none"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </section>

              </CardContent>
            </Card>
          </div>

          {/* Right Column — col 4 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Settings & Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-bold uppercase tracking-wider">Status</Label>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Mark as Active Branch</p>
                  </div>
                  <Switch 
                    checked={form.isActive}
                    onCheckedChange={(v: boolean) => set("isActive", v)}
                  />
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <Button className="w-full" onClick={handleSave} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 size-4" />}
                    Save Branch
                  </Button>
                  <Link href="/organization/branches" className="w-full">
                    <Button variant="outline" className="w-full" disabled={isPending}>
                      <X className="mr-2 size-4" />
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 text-xs text-orange-800 dark:text-orange-200 leading-relaxed space-y-2">
              <p className="font-semibold">Important Notes:</p>
              <p>Branches are shared across all users in your organization. Ensure the Branch Code matches your internal registration systems for easier reconciliation.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
