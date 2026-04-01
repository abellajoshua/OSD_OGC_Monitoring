const { createClient } = require("@supabase/supabase-js");

let client;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }

  return client;
}

function toCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers, rows) {
  const headerLine = headers.join(",");
  const lines = rows.map((row) => headers.map((key) => toCsvValue(row[key])).join(","));
  return [headerLine, ...lines].join("\n");
}

function getBearerToken(req) {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization || "";
  if (!authHeader || typeof authHeader !== "string") return "";
  const parts = authHeader.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return "";
}

async function getRequestUserContext(req) {
  const supabase = getSupabaseClient();
  const token = getBearerToken(req);

  if (!token) {
    const error = new Error("Missing bearer token.");
    error.status = 401;
    throw error;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    const error = new Error(authError?.message || "Invalid auth token.");
    error.status = 401;
    throw error;
  }

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("user_id, email, full_name, role, organization_id")
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    const error = new Error("User account profile not found.");
    error.status = 403;
    throw error;
  }

  if (!account.organization_id) {
    const error = new Error("User is not assigned to an organization.");
    error.status = 403;
    throw error;
  }

  return {
    userId: user.id,
    email: user.email,
    role: account.role,
    organizationId: account.organization_id,
  };
}

function ensureRole(context, allowedRoles) {
  if (!allowedRoles.includes(context.role)) {
    const error = new Error("Insufficient permissions.");
    error.status = 403;
    throw error;
  }
}

function getErrorStatus(error) {
  return error?.status && Number.isInteger(error.status) ? error.status : 500;
}

module.exports = {
  getSupabaseClient,
  buildCsv,
  getRequestUserContext,
  ensureRole,
  getErrorStatus,
  getPayload(req) {
    if (!req || typeof req.body === "undefined") return {};
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body || {};
  },
};
