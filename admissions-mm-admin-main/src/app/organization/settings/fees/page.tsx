"use client";

import * as React from "react";
import { IndianRupee, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageHeaderStore } from "@/stores/page-header-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/use-organizations";

export default function FeesSettingsPage() {
  const setHeader = usePageHeaderStore((s) => s.setHeader);
  const clearHeader = usePageHeaderStore((s) => s.clearHeader);

  const user = useAuthStore((state) => state.user);
  const orgId = user?.organizationId || "";

  const { data: settings, isLoading } = useOrganizationSettings(orgId);
  const updateSettings = useUpdateOrganizationSettings(orgId);

  const [applicationFee, setApplicationFee] = React.useState("2000");
  const [seatBookingFee, setSeatBookingFee] = React.useState("5000");
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    setHeader({
      title: "Application Fee Settings",
      description:
        "Configure the fees students must pay via Razorpay — the application fee before submission, and the seat booking fee after an offer is accepted.",
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  React.useEffect(() => {
    if (settings && !initialized) {
      setApplicationFee(String(settings.applicationFee ?? 2000));
      setSeatBookingFee(String(settings.seatBookingFee ?? 5000));
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(applicationFee);
    const bookingFee = Number(seatBookingFee);
    if (Number.isNaN(fee) || fee < 0) return;
    if (Number.isNaN(bookingFee) || bookingFee < 0) return;

    updateSettings.mutate({ applicationFee: fee, seatBookingFee: bookingFee });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full min-w-0">
      <Card className="max-w-xl border border-[#e5e5e5] rounded-[12px] shadow-sm">
        <CardHeader>
          <CardTitle>Application Fee</CardTitle>
          <CardDescription>
            This is the amount collected from students on the payment step of
            the admission application form.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent>
            {!orgId || isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="size-4 animate-spin" /> Loading current settings...
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="applicationFee" className="text-sm font-medium">
                  Application Fee (INR)
                </Label>
                <div className="relative max-w-xs">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="applicationFee"
                    type="number"
                    min={0}
                    step="1"
                    className="pl-9 h-10"
                    value={applicationFee}
                    onChange={(e) => setApplicationFee(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Default is ₹2,000. Students will be charged this amount via
                  Razorpay before their application submission is finalized.
                </p>

                <Label htmlFor="seatBookingFee" className="text-sm font-medium mt-4">
                  Seat Booking Fee (INR)
                </Label>
                <div className="relative max-w-xs">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="seatBookingFee"
                    type="number"
                    min={0}
                    step="1"
                    className="pl-9 h-10"
                    value={seatBookingFee}
                    onChange={(e) => setSeatBookingFee(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Default is ₹5,000. Charged via Razorpay once a candidate
                  accepts an offer, to confirm and book their seat.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!orgId || isLoading || updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
