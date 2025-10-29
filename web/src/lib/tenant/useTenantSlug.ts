"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TenantSlugResult {
  slug: string;
  name?: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function useTenantSlug(userId: string | undefined): TenantSlugResult {
  const [slug, setSlug] = useState<string>("");
  const [name, setName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Prefer organizations if linked
      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id, organization_name, organization_slug, preschool_id")
        .eq("id", userId)
        .maybeSingle();

      // Direct organization slug on profile
      if (prof?.organization_slug) {
        setSlug(prof.organization_slug);
        setName(prof.organization_name);
        return;
      }

      if (prof?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name, slug")
          .eq("id", prof.organization_id)
          .maybeSingle();

        const orgName = org?.name || prof.organization_name;
        const orgSlug = org?.slug || (orgName ? slugify(orgName) : "");
        if (orgSlug) {
          setSlug(orgSlug);
          setName(orgName);
          return;
        }
      }

      // Fallback to preschool
      let preschoolId = prof?.preschool_id as string | undefined;
      if (!preschoolId) {
        // Try users table to find internal mapping
        const { data: me } = await supabase
          .from("users")
          .select("preschool_id, organization_id, organization_name")
          .eq("auth_user_id", userId)
          .maybeSingle();

        // If organization exists on users, prefer that
        if (me?.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name, slug")
            .eq("id", me.organization_id)
            .maybeSingle();
          const orgName = org?.name || me.organization_name;
          const orgSlug = org?.slug || (orgName ? slugify(orgName) : "");
          if (orgSlug) {
            setSlug(orgSlug);
            setName(orgName);
            return;
          }
        }

        preschoolId = me?.preschool_id;
      }

      if (preschoolId) {
        const { data: school } = await supabase
          .from("preschools")
          .select("name, slug")
          .eq("id", preschoolId)
          .maybeSingle();

        const schoolName = school?.name;
        const schoolSlug = school?.slug || (schoolName ? slugify(schoolName) : "");
        if (schoolSlug) {
          setSlug(schoolSlug);
          setName(schoolName);
          return;
        }
      }

      // As last resort, fall back to email domain-like placeholder (stable but non-empty)
      if (!slug) {
        setSlug("");
      }
    } catch (err) {
      console.error("Failed to resolve tenant slug:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId, slug]);

  useEffect(() => {
    load();
  }, [load]);

  return { slug, name, loading, error, refetch: load };
}