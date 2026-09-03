"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publicPost } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X, ShieldCheck, Lock, Mail, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordRequirement {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "uppercase", label: "At least 1 uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lowercase", label: "At least 1 lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "At least 1 number (0-9)", test: (pw) => /[0-9]/.test(pw) },
  {
    id: "special",
    label: "At least 1 special symbol (@$!%*?&#)",
    test: (pw) => /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  },
];

export default function StudentLoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [isOtpVerified, setIsOtpVerified] = React.useState(false);

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = React.useState(false);

  // Evaluate Password Strength
  const passedRequirements = React.useMemo(() => {
    return PASSWORD_REQUIREMENTS.filter((req) => req.test(newPassword));
  }, [newPassword]);

  const strengthScore = passedRequirements.length;
  const isPasswordValid = strengthScore === PASSWORD_REQUIREMENTS.length;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: "", color: "bg-gray-200", text: "text-gray-400" };
    if (strengthScore <= 2) return { label: "Weak", color: "bg-red-500", text: "text-red-500" };
    if (strengthScore <= 4) return { label: "Medium", color: "bg-amber-500", text: "text-amber-500" };
    return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" };
  };

  const strengthInfo = getStrengthLabel();

  // Verify OTP handler
  const handleVerifyOtp = async () => {
    if (!email.trim()) {
      toast.error("Please enter your registered email address.");
      return;
    }
    if (!otp.trim()) {
      toast.error("Please enter your One-Time Password (OTP).");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await publicPost("/auth/student-verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });
      setIsOtpVerified(true);
      toast.success("OTP verified! You can now set your password below.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Invalid email or One-Time Password.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Submit Password & Login handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOtpVerified) {
      toast.error("Please verify your OTP first.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("Please meet all password strength requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const response = await publicPost<{ access_token: string; user: any }>("/auth/student-set-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      login(response.access_token, response.user);
      toast.success("Password set successfully! Welcome to your Student Portal.");
      router.push("/my-application");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to set password. Please try again.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full bg-sidebar flex flex-col lg:flex-row overflow-hidden selection:bg-[#2563EB]/30 selection:text-white"
      suppressHydrationWarning={true}
    >
      {/* Background graphic */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-auto h-full pointer-events-none z-0">
        <Image
          src="/images/abstract.svg"
          alt="Abstract background"
          width={1317}
          height={982}
          className="h-full w-auto object-cover object-left opacity-60 lg:opacity-100 transition-opacity duration-1000"
          priority
        />
      </div>

      {/* Main Layout Container */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen px-6 lg:px-20 py-4 lg:py-0">
        {/* Left Section: Branding & Headline */}
        <div className="flex-1 flex flex-col items-center lg:items-start justify-between py-8 lg:py-16 text-center lg:text-left">
          <div className="flex items-center gap-5 group cursor-default">
            <div className="relative w-[50px] h-[54px] lg:w-[55px] lg:h-[60px] transition-transform duration-500 group-hover:scale-110">
              <Image
                src="/images/logo.svg"
                alt="EDUCRM Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-white text-3xl lg:text-[48px] font-normal font-['Inter'] tracking-tight">
              EDUCRM
            </span>
          </div>

          <div className="mt-8 lg:mt-auto max-w-[440px] mx-auto lg:mx-0 animate-in fade-in slide-in-from-left duration-1000">
            <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-400/30">
              Student Portal Sign In
            </span>
            <h1 className="text-white text-2xl lg:text-[32.7px] font-medium font-['Inter'] leading-[1.3] tracking-tight">
              Activate your student account, set your password & access your application portal.
            </h1>
          </div>
        </div>

        {/* Right Section: Unified Single Card */}
        <div className="flex-1 flex items-center justify-center lg:justify-end py-10 lg:py-0 animate-in fade-in slide-in-from-bottom lg:slide-in-from-right duration-700">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-full max-w-[520px] p-8 lg:px-12 lg:py-10 relative border border-white/10 backdrop-blur-sm bg-opacity-[0.98]">
            <div className="space-y-6">
              <div>
                <h2 className="text-[#1E293B] text-2xl lg:text-3xl font-semibold font-['Inter'] tracking-tight">
                  Student Portal Access
                </h2>
                <p className="text-[#64748B] text-sm mt-1">
                  Verify your One-Time Password (OTP) to unmute password creation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Email Field */}
                <div className="space-y-1">
                  <Label htmlFor="student-email" className="text-[#64748B] text-sm font-semibold uppercase tracking-wider">
                    Registered Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="e.g., student@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isOtpVerified}
                      className="h-12 pl-10 border-[#66666659] rounded-[10px] bg-white text-[#0F172A] disabled:bg-slate-50"
                      required
                    />
                  </div>
                </div>

                {/* 2. OTP Field & Inline Verify Button */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="student-otp" className="text-[#64748B] text-sm font-semibold uppercase tracking-wider">
                      One-Time Password (OTP)
                    </Label>
                    {isOtpVerified && (
                      <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> OTP Verified
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                      <Input
                        id="student-otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        disabled={isOtpVerified}
                        className="h-12 pl-10 border-[#66666659] rounded-[10px] bg-white text-[#0F172A] tracking-widest font-mono font-semibold disabled:bg-slate-50"
                        maxLength={6}
                        required
                      />
                    </div>
                    {!isOtpVerified && (
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || !email || !otp}
                        className="h-12 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shrink-0"
                      >
                        {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 my-2 pt-2">
                  {!isOtpVerified && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 mb-3">
                      <ShieldCheck className="size-4 shrink-0 text-amber-600" />
                      <span>Verify your OTP above to unmute password creation.</span>
                    </div>
                  )}

                  {/* 3. New Password Field (Muted until OTP verified) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="new-password"
                        className={`text-sm font-semibold uppercase tracking-wider ${
                          isOtpVerified ? "text-[#64748B]" : "text-slate-400"
                        }`}
                      >
                        New Password
                      </Label>
                      {isOtpVerified && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[#64748B] text-xs font-medium flex items-center gap-1 hover:text-[#2563EB]"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={isOtpVerified ? "Create strong password" : "Verify OTP above to unlock"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={!isOtpVerified}
                        className={`h-12 pl-10 border-[#66666659] rounded-[10px] bg-white text-[#0F172A] ${
                          !isOtpVerified ? "opacity-50 cursor-not-allowed bg-slate-100" : ""
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Live Password Strength Meter */}
                  {isOtpVerified && newPassword.length > 0 && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 mt-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">Password Strength:</span>
                        <span className={strengthInfo.text}>{strengthInfo.label}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-full rounded-full transition-all duration-300 ${
                              idx < strengthScore ? strengthInfo.color : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-1 pt-1">
                        {PASSWORD_REQUIREMENTS.map((req) => {
                          const met = req.test(newPassword);
                          return (
                            <div key={req.id} className="flex items-center gap-2 text-xs">
                              {met ? (
                                <Check className="size-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <X className="size-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className={met ? "text-emerald-700 font-medium" : "text-slate-500"}>
                                {req.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Confirm Password Field (Muted until OTP verified) */}
                  <div className="space-y-1 mt-3">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="confirm-password"
                        className={`text-sm font-semibold uppercase tracking-wider ${
                          isOtpVerified ? "text-[#64748B]" : "text-slate-400"
                        }`}
                      >
                        Confirm Password
                      </Label>
                      {isOtpVerified && (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-[#64748B] text-xs font-medium flex items-center gap-1 hover:text-[#2563EB]"
                        >
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={isOtpVerified ? "Re-enter password" : "Verify OTP above to unlock"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={!isOtpVerified}
                        className={`h-12 pl-10 border-[#66666659] rounded-[10px] bg-white text-[#0F172A] ${
                          !isOtpVerified ? "opacity-50 cursor-not-allowed bg-slate-100" : ""
                        }`}
                        required
                      />
                    </div>
                    {isOtpVerified && confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 font-medium pt-0.5">Passwords do not match.</p>
                    )}
                  </div>
                </div>

                {/* Main Submit Button with exact requested styling */}
                <Button
                  type="submit"
                  disabled={isSubmittingPassword || !isOtpVerified || !isPasswordValid || newPassword !== confirmPassword}
                  className="w-full h-12 bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground rounded-[25px] font-medium text-base shadow-lg transition-all mt-1 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPassword ? "Setting Password & Logging in..." : "Set Password & Access Portal"}
                </Button>
              </form>

              {/* Footer link to login */}
              <div className="pt-2 text-left text-[#666] text-base">
                <p>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-[#000] font-medium hover:underline transition-all"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
