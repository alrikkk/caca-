import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Shared helper that executes a Supabase query with error logging
 * and graceful fallback to a local storage / mock fallback.
 */
export async function withSupabaseFallback<T>(
  supabaseCall: () => Promise<T>,
  localFallback: () => T | Promise<T>,
  contextName = "DatabaseOperation"
): Promise<T> {
  if (isSupabaseConfigured()) {
    try {
      return await supabaseCall();
    } catch (err) {
      console.error(`${contextName} failed:`, err);
    }
  }
  return await localFallback();
}
