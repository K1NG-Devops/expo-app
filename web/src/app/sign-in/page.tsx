"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // Get user role from profiles table (single source of truth)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    setLoading(false);

    if (profileError) {
      setError('Failed to fetch user profile. Please contact support.');
      return;
    }

    const role = profile?.role as string | undefined;

    // Role-based routing
    switch (role) {
      case 'parent':
        router.push('/dashboard/parent');
        break;
      case 'teacher':
        router.push('/dashboard/teacher');
        break;
      case 'principal':
        router.push('/dashboard/principal');
        break;
      case 'superadmin':
        router.push('/dashboard/admin');
        break;
      default:
        router.push('/dashboard');
    }
  }

  return (
    <>
      <style jsx global>{`
        body {
          overflow-x: hidden;
          max-width: 100vw;
        }
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f", fontFamily: "system-ui, sans-serif", overflowX: "hidden", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "500px", background: "#111113", padding: "40px", border: "1px solid #1f1f23", boxSizing: "border-box", borderRadius: "12px" }}>
        {/* Header with icon */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>
            🎓
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>EduDash Pro</h1>
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Empowering Education Through AI</p>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Welcome Back</h2>
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Sign in to your account</p>
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", color: "#fff", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ width: "100%", padding: "12px 14px", background: "#1a1a1f", border: "1px solid #2a2a2f", borderRadius: 8, color: "#fff", fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "#fff", fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: "100%", padding: "12px 14px", background: "#1a1a1f", border: "1px solid #2a2a2f", borderRadius: 8, color: "#fff", fontSize: 14, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "#9CA3AF", cursor: "pointer", fontSize: 18 }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ color: "#9CA3AF", fontSize: 14 }}>Remember me</span>
            </label>
            <Link href="/forgot-password" style={{ color: "#00f5ff", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div style={{ padding: 12, background: "#7f1d1d", border: "1px solid #991b1b", borderRadius: 8 }}>
              <p style={{ color: "#fca5a5", fontSize: 14, margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: loading ? "#555" : "linear-gradient(135deg, #00f5ff 0%, #0088cc 100%)",
              color: "#000",
              border: 0,
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #2a2a2f" }}>
          <p style={{ color: "#9CA3AF", fontSize: 15, marginBottom: 16, textAlign: "center" }}>Don't have an account?</p>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <Link href="/sign-up/parent" style={{ flex: 1, minWidth: "200px", textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "16px 20px", background: "rgba(99, 102, 241, 0.15)", color: "#fff", border: "2px solid rgba(99, 102, 241, 0.4)", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s", minHeight: 56 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Sign Up</span>
                <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>(Parent)</span>
              </button>
            </Link>
            <Link href="/sign-up/teacher" style={{ flex: 1, minWidth: "200px", textDecoration: "none" }}>
              <button style={{ width: "100%", padding: "16px 20px", background: "rgba(99, 102, 241, 0.15)", color: "#fff", border: "2px solid rgba(99, 102, 241, 0.4)", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.2s", minHeight: 56 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Sign Up</span>
                <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>(Teacher)</span>
              </button>
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, textAlign: "center" }}>
          <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.5 }}>Looking to register a school? <a href="#" style={{ color: "#00f5ff", textDecoration: "underline", fontWeight: 600 }}>Click here</a></p>
          <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 10, lineHeight: 1.5 }}>Looking to onboard an organization? <a href="#" style={{ color: "#00f5ff", textDecoration: "underline", fontWeight: 600 }}>Click here</a></p>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/" style={{ color: "#00f5ff", fontSize: 14, textDecoration: "none" }}>
            ← Go to Home
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
