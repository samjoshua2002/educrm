"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function TopProgressBar() {
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    setLoading(false);
    setWidth(0);
  }, [pathname]);

  useEffect(() => {
    const handleStart = () => {
      setLoading(true);
      setWidth(20);
    };

    window.addEventListener("next-route-start", handleStart);
    return () => window.removeEventListener("next-route-start", handleStart);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setWidth((w) => {
        if (w >= 90) {
          clearInterval(interval);
          return w;
        }
        return w + (100 - w) * 0.15;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  return (
    <div
      className="fixed top-0 left-0 h-[3px] bg-[#ea2525] transition-all duration-300 ease-out z-50 shadow-[0_0_8px_#ea2525]"
      style={{ width: `${width}%` }}
    />
  );
}
