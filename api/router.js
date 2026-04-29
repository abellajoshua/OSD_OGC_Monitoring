const configHandler = require("./config");
const dashboardHandler = require("./dashboard");
const analyticsHandler = require("./analytics");
const archiveHandler = require("./archive");
const caseDismissalHandler = require("./case-dismissal");
const envStatusHandler = require("./env-status");
const adminCreateUserHandler = require("./admin/create-user");
const adminDeleteUserHandler = require("./admin/delete-user");

const gatepassIndexHandler = require("./gatepass/index");
const gatepassArchiveHandler = require("./gatepass/archive");
const gatepassByIdHandler = require("./gatepass/[id]");

const goodMoralIndexHandler = require("./good-moral/index");
const goodMoralArchiveHandler = require("./good-moral/archive");
const goodMoralByIdHandler = require("./good-moral/[id]");

const idReplacementIndexHandler = require("./id-replacement/index");
const idReplacementArchiveHandler = require("./id-replacement/archive");
const idReplacementByIdHandler = require("./id-replacement/[id]");

const leaveOfAbsenceIndexHandler = require("./leave-of-absence/index");
const leaveOfAbsenceArchiveHandler = require("./leave-of-absence/archive");
const leaveOfAbsenceByIdHandler = require("./leave-of-absence/[id]");

const majorOffensesIndexHandler = require("./major-offenses/index");
const majorOffensesArchiveHandler = require("./major-offenses/archive");
const majorOffensesByIdHandler = require("./major-offenses/[id]");

const minorOffensesIndexHandler = require("./minor-offenses/index");
const minorOffensesArchiveHandler = require("./minor-offenses/archive");
const minorOffensesByIdHandler = require("./minor-offenses/[id]");

const nonWearingUniformIndexHandler = require("./non-wearing-uniform/index");
const nonWearingUniformArchiveHandler = require("./non-wearing-uniform/archive");
const nonWearingUniformByIdHandler = require("./non-wearing-uniform/[id]");

function getQueryFromUrl(urlValue) {
  const url = new URL(urlValue || "/", "http://localhost");
  const query = {};

  url.searchParams.forEach((value, key) => {
    if (key === "path") return;
    if (typeof query[key] === "undefined") {
      query[key] = value;
      return;
    }

    if (Array.isArray(query[key])) {
      query[key].push(value);
      return;
    }

    query[key] = [query[key], value];
  });

  return query;
}

function getPathParam(req) {
  const maybePath = req?.query?.path;

  if (Array.isArray(maybePath)) {
    return maybePath.join("/");
  }

  if (typeof maybePath === "string") {
    return maybePath;
  }

  return "";
}

function normalizePath(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function parseRoute(pathname) {
  const path = normalizePath(pathname);

  if (path === "config") return { handler: configHandler };
  if (path === "dashboard") return { handler: dashboardHandler };
  if (path === "analytics") return { handler: analyticsHandler };
  if (path === "archive") return { handler: archiveHandler };
  if (path === "case-dismissal") return { handler: caseDismissalHandler };
  if (path === "env-status") return { handler: envStatusHandler };
  if (path === "admin/create-user") return { handler: adminCreateUserHandler };
  if (path === "admin/delete-user") return { handler: adminDeleteUserHandler };

  if (path === "gatepass") return { handler: gatepassIndexHandler };
  if (path === "gatepass/archive") return { handler: gatepassArchiveHandler };
  if (path.startsWith("gatepass/")) {
    return { handler: gatepassByIdHandler, id: decodeURIComponent(path.slice("gatepass/".length)) };
  }

  if (path === "good-moral") return { handler: goodMoralIndexHandler };
  if (path === "good-moral/archive") return { handler: goodMoralArchiveHandler };
  if (path.startsWith("good-moral/")) {
    return { handler: goodMoralByIdHandler, id: decodeURIComponent(path.slice("good-moral/".length)) };
  }

  if (path === "id-replacement") return { handler: idReplacementIndexHandler };
  if (path === "id-replacement/archive") return { handler: idReplacementArchiveHandler };
  if (path.startsWith("id-replacement/")) {
    return {
      handler: idReplacementByIdHandler,
      id: decodeURIComponent(path.slice("id-replacement/".length)),
    };
  }

  if (path === "leave-of-absence") return { handler: leaveOfAbsenceIndexHandler };
  if (path === "leave-of-absence/archive") return { handler: leaveOfAbsenceArchiveHandler };
  if (path.startsWith("leave-of-absence/")) {
    return {
      handler: leaveOfAbsenceByIdHandler,
      id: decodeURIComponent(path.slice("leave-of-absence/".length)),
    };
  }

  if (path === "major-offenses") return { handler: majorOffensesIndexHandler };
  if (path === "major-offenses/archive") return { handler: majorOffensesArchiveHandler };
  if (path.startsWith("major-offenses/")) {
    return {
      handler: majorOffensesByIdHandler,
      id: decodeURIComponent(path.slice("major-offenses/".length)),
    };
  }

  if (path === "minor-offenses") return { handler: minorOffensesIndexHandler };
  if (path === "minor-offenses/archive") return { handler: minorOffensesArchiveHandler };
  if (path.startsWith("minor-offenses/")) {
    return {
      handler: minorOffensesByIdHandler,
      id: decodeURIComponent(path.slice("minor-offenses/".length)),
    };
  }

  if (path === "non-wearing-uniform") return { handler: nonWearingUniformIndexHandler };
  if (path === "non-wearing-uniform/archive") return { handler: nonWearingUniformArchiveHandler };
  if (path.startsWith("non-wearing-uniform/")) {
    return {
      handler: nonWearingUniformByIdHandler,
      id: decodeURIComponent(path.slice("non-wearing-uniform/".length)),
    };
  }

  return null;
}

module.exports = async (req, res) => {
  const rawPath = getPathParam(req);
  const route = parseRoute(rawPath);

  req.query = {
    ...(req.query || {}),
    ...getQueryFromUrl(req.url),
  };

  delete req.query.path;

  if (!route || typeof route.handler !== "function") {
    return res.status(404).json({ error: `Route not found: /api/${normalizePath(rawPath)}` });
  }

  if (route.id) {
    req.query.id = route.id;
  }

  return route.handler(req, res);
};
