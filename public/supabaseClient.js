import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let supabaseClient;

async function loadConfig() {
  if (window.APP_CONFIG) {
    return window.APP_CONFIG;
  }

  try {
    const response = await fetch("/api/config");
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // ignore and fall through
  }

  return {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
  };
}

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const config = await loadConfig();

  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_ANON_KEY."
    );
  }

  supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  return supabaseClient;
}
