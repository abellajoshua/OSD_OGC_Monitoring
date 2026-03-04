import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let supabaseClient;

const FALLBACK_CONFIG = {
  SUPABASE_URL: "https://axmuxanqmhuvxefhazot.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bXV4YW5xbWh1dnhlZmhhem90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc5NjgsImV4cCI6MjA4NTgwMzk2OH0.u4O0TXfrpAL9Tt7b-Yv5KEU9OFV5fhtRMf74KFohKJw",
};

async function loadConfig() {
  if (window.APP_CONFIG) {
    return window.APP_CONFIG;
  }

  return FALLBACK_CONFIG;
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
