import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let supabaseClient;

const FALLBACK_CONFIG = {
  SUPABASE_URL: "https://fwbbxwnmchbuhwulrzhw.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3YmJ4d25tY2hidWh3dWxyemh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTg3NTIsImV4cCI6MjA4ODE3NDc1Mn0.unSrCNshGFXmhaba3Gm7Zgm6jjQSThKX9UC6U5d_sBY",
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
