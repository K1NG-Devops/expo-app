"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        router.replace("/sign-in");
        return;
      }
      setEmail(session.user.email ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>Loading...</main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Dashboard</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#555" }}>{email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/sign-in");
            }}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", background: "#f5f5f5" }}
          >
            Sign out
          </button>
        </div>
      </header>
      <section style={{ marginTop: 24 }}>
        <p>Welcome to EduDash Pro (web). This is a minimal dashboard placeholder.</p>
      </section>
    </main>
  );
}