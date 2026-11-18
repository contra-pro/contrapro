"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserAuthClient } from "./browser";

export function SessionSync() {
  const router = useRouter();
  useEffect(() => {
    try {
      const { data } = browserAuthClient().auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") router.refresh();
      });
      return () => data.subscription.unsubscribe();
    } catch { /* Missing public configuration does not grant or simulate authentication. */ }
  }, [router]);
  return null;
}
