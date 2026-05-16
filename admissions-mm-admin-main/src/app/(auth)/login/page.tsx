"use client";

import Image from "next/image";
import Link from "next/link";
import { SaasLoginForm } from "../_components/saas-login-form";
import { GoogleButton } from "@/app/(main)/auth/_components/social-auth/google-button";
import { X } from "lucide-react";

export default function LoginPage() {
  return (
    <div 
      className="relative min-h-screen w-full bg-sidebar flex flex-col lg:flex-row overflow-hidden selection:bg-[#2563EB]/30 selection:text-white"
      suppressHydrationWarning={true}
    >
      {/* Abstract Background - Fit Screen Height */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-auto h-full pointer-events-none z-0">
        <Image
          src="/images/abstract.svg"
          alt="Abstract decorative background"
          width={1317}
          height={982}
          className="h-full w-auto object-cover object-left opacity-60 lg:opacity-100 transition-opacity duration-1000"
          priority
        />
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen px-6 lg:px-20 py-4 lg:py-0">
        
        {/* Left Section: Branding & Headline */}
        <div className="flex-1 flex flex-col items-center lg:items-start justify-between py-8 lg:py-16 text-center lg:text-left">
          {/* Logo & Brand */}
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

          {/* Headline - Bottom Left */}
          <div className="mt-8 lg:mt-auto max-w-[400px] mx-auto lg:mx-0 animate-in fade-in slide-in-from-left duration-1000">
            <h1 className="text-white text-2xl lg:text-[32.7px] font-medium font-['Inter'] leading-[1.3] tracking-tight">
              Insights and dashboards to accelerate your brand&apos;s growth
            </h1>
          </div>
        </div>

        {/* Right Section: Login Card */}
        <div className="flex-1 flex items-center justify-center lg:justify-end py-10 lg:py-0 animate-in fade-in slide-in-from-bottom lg:slide-in-from-right duration-700">
          <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-full max-w-[520px] p-8 lg:px-12 lg:py-10 relative border border-white/10 backdrop-blur-sm bg-opacity-[0.98]">
            {/* Close Button */}
            <button 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              suppressHydrationWarning={true}
            >
              <X size={20} />
            </button>

            <div className="space-y-6">
              <h2 className="text-[#1E293B] text-2xl lg:text-3xl font-semibold font-['Inter'] tracking-tight">
                Sign in
              </h2>

              {/* Login Form */}
              <SaasLoginForm />

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#66666659]"></div>
                </div>
                <span className="relative px-4 bg-white text-[#111] text-[16px] font-medium  tracking-widest">
                  Or continue with
                </span>
              </div>

              {/* Google Button */}
              <GoogleButton 
                className="w-full h-12 bg-white hover:bg-gray-50 border border-[#66666659] text-[#1E293B] rounded-[25px] font-medium transition-all shadow-sm flex items-center justify-center gap-3 active:scale-[0.98]"
                suppressHydrationWarning={true}
              />

              {/* Footer Links */}
              <div className="space-y-4 pt-2">
                <p className="text-left text-[#666] text-base">
                  Don&apos;t have an acount?{" "}
                  <Link href="#" className="text-[#000] font-medium hover:underline transition-all">
                    Sign up
                  </Link>
                </p>
                
                <p className="text-left text-[#666] text-base leading-relaxed max-w-[380px] opacity-80">
                  This page is protected by Google reCAPTCHA to ensure you&apos;re not a bot.{" "}
                  <Link href="#" className="text-[#000] font-medium hover:underline transition-all">
                    Learn more.
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
