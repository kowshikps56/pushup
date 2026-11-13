/**
 * Client-side Supabase client singleton for browser interactions,
 * real-time subscriptions, and authentication.
 */

import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Returns a typed browser-side Supabase client singleton.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[SupabaseClient] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined."
    );
  }

  const client = createBrowserClient(
    supabaseUrl || "https://placeholder-url.supabase.co",
    supabaseAnonKey || "placeholder-anon-key"
  );

  browserClient = client as unknown as SupabaseClient<Database>;
  return browserClient;
}

export const supabase = getSupabaseBrowserClient();
