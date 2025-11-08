"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        router.replace("/sign-in");
        return;
      }

      // Fetch role from profiles and route accordingly
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = (profile?.role as string) || "";

      switch (role) {
        case "parent":
          router.replace("/dashboard/parent");
          break;
        case "teacher":
          router.replace("/dashboard/teacher");
          break;
        case "principal":
          router.replace("/dashboard/principal");
          break;
        case "superadmin":
          router.replace("/dashboard/admin");
          break;
        default:
          // Fallback to parent dashboard or onboarding if needed
          router.replace("/dashboard/parent");
      }

      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  // Minimal loader to avoid showing any placeholder screen
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>Redirecting…</main>
  );
}