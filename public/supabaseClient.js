import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

let supabaseClient;
let supabaseClientPromise;

const FALLBACK_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};

function normalizeConfig(rawConfig = {}) {
  const normalizedUrl = String(rawConfig.SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  return {
    SUPABASE_URL: normalizedUrl,
    SUPABASE_ANON_KEY: String(rawConfig.SUPABASE_ANON_KEY || "").trim(),
  };
}

function isValidSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".supabase.co") &&
      !parsed.hostname.startsWith("YOUR_PROJECT_REF")
    );
  } catch {
    return false;
  }
}

async function fetchServerConfig() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) return null;
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    return normalizeConfig(data || {});
  } catch {
    return null;
  }
}

async function loadConfig() {
  // Server env is the source of truth so a stale runtime-config.js cannot
  // point the browser at a decommissioned Supabase project.
  const serverConfig = await fetchServerConfig();

  if (serverConfig?.SUPABASE_URL && serverConfig?.SUPABASE_ANON_KEY) {
    return serverConfig;
  }

  const runtimeConfig = normalizeConfig(window.APP_CONFIG || {});

  if (runtimeConfig.SUPABASE_URL && runtimeConfig.SUPABASE_ANON_KEY) {
    return runtimeConfig;
  }

  return normalizeConfig(FALLBACK_CONFIG);
}

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (window.__OSD_SUPABASE_CLIENT__) {
    supabaseClient = window.__OSD_SUPABASE_CLIENT__;
    return supabaseClient;
  }

  if (supabaseClientPromise) {
    return supabaseClientPromise;
  }

  if (window.__OSD_SUPABASE_CLIENT_PROMISE__) {
    supabaseClientPromise = window.__OSD_SUPABASE_CLIENT_PROMISE__;
    return supabaseClientPromise;
  }

  supabaseClientPromise = (async () => {
    const config = await loadConfig();

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      throw new Error(
        "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in /api/config env or public/runtime-config.js."
      );
    }

    if (!isValidSupabaseUrl(config.SUPABASE_URL)) {
      throw new Error(
        `Invalid SUPABASE_URL (${config.SUPABASE_URL}). Use https://<project-ref>.supabase.co in public/runtime-config.js or server env.`
      );
    }

    const client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    window.__OSD_SUPABASE_CLIENT__ = client;
    supabaseClient = client;
    return client;
  })();

  window.__OSD_SUPABASE_CLIENT_PROMISE__ = supabaseClientPromise;

  try {
    return await supabaseClientPromise;
  } finally {
    window.__OSD_SUPABASE_CLIENT_PROMISE__ = null;
    supabaseClientPromise = null;
  }
}
