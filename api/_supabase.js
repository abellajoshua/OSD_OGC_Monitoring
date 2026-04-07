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

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function hasServiceRolePrivileges() {
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!key) return false;

  // New Supabase secret keys are prefixed with sb_secret_.
  if (key.startsWith("sb_secret_")) {
    return true;
  }

  // Legacy JWT service role keys should contain role=service_role in payload.
  const payload = decodeJwtPayload(key);
  return payload?.role === "service_role";
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
    const authMessage = String(authError?.message || "");
    const isInvalidServerApiKey = authMessage.toLowerCase().includes("invalid api key");
    const error = new Error(
      isInvalidServerApiKey
        ? "Server configuration error: invalid SUPABASE_SERVICE_ROLE_KEY."
        : authError?.message || "Invalid auth token."
    );
    error.status = isInvalidServerApiKey ? 503 : 401;
    throw error;
  }

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("user_id, email, full_name, role, organization_id, organizations(name)")
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    const error = new Error("User account profile not found.");
    error.status = 403;
    throw error;
  }

  const normalizedRole = String(account.role || "").trim().toLowerCase();

  if (normalizedRole !== "admin" && !account.organization_id) {
    const error = new Error("User is not assigned to an organization.");
    error.status = 403;
    throw error;
  }

  return {
    userId: user.id,
    email: user.email,
    role: normalizedRole,
    organizationId: account.organization_id,
    organizationName: String(account.organizations?.name || "").trim(),
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

function toSingleValue(input) {
  if (Array.isArray(input)) {
    return input[0];
  }
  return input;
}

function parseOrganizationId(value) {
  const normalized = toSingleValue(value);
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function canAccessAllOrganizations(context) {
  if (!context) return false;
  const role = String(context.role || "").trim().toLowerCase();
  const organizationName = String(context.organizationName || "").trim().toLowerCase();
  return role === "head" && organizationName === "alangilan";
}

function getScopedOrganizationId(req, context) {
  if (!context || !context.role) return null;

  // Only Alangilan Head can monitor all orgs and optionally narrow down via query filter.
  if (canAccessAllOrganizations(context)) {
    return parseOrganizationId(req?.query?.organization_id);
  }

  // Non-exempt heads are restricted to their own organization.
  if (context.role === "head") {
    return context.organizationId;
  }

  // Coordinator is always restricted to own organization.
  if (context.role === "coordinator") {
    return context.organizationId;
  }

  // Admin is management-only; allow optional org scope for read-only tooling endpoints.
  return parseOrganizationId(req?.query?.organization_id) || null;
}

function applyOrganizationScope(query, organizationId) {
  if (!organizationId) return query;
  return query.eq("organization_id", organizationId);
}

module.exports = {
  getSupabaseClient,
  hasServiceRolePrivileges,
  buildCsv,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  canAccessAllOrganizations,
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
