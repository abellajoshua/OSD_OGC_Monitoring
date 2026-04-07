require("dotenv").config();

const express = require("express");
const path = require("path");

const dashboardHandler = require("./api/dashboard");
const analyticsHandler = require("./api/analytics");
const configHandler = require("./api/config");
const minorHandler = require("./api/minor-offenses/index");
const minorByIdHandler = require("./api/minor-offenses/[id]");
const minorArchiveHandler = require("./api/minor-offenses/archive");
const majorHandler = require("./api/major-offenses/index");
const majorByIdHandler = require("./api/major-offenses/[id]");
const majorArchiveHandler = require("./api/major-offenses/archive");
const uniformHandler = require("./api/non-wearing-uniform/index");
const uniformByIdHandler = require("./api/non-wearing-uniform/[id]");
const uniformArchiveHandler = require("./api/non-wearing-uniform/archive");
const gatepassHandler = require("./api/gatepass/index");
const gatepassByIdHandler = require("./api/gatepass/[id]");
const gatepassArchiveHandler = require("./api/gatepass/archive");
const goodMoralHandler = require("./api/good-moral/index");
const goodMoralByIdHandler = require("./api/good-moral/[id]");
const goodMoralArchiveHandler = require("./api/good-moral/archive");
const idReplacementHandler = require("./api/id-replacement/index");
const idReplacementByIdHandler = require("./api/id-replacement/[id]");
const idReplacementArchiveHandler = require("./api/id-replacement/archive");
const leaveOfAbsenceHandler = require("./api/leave-of-absence/index");
const leaveOfAbsenceByIdHandler = require("./api/leave-of-absence/[id]");
const leaveOfAbsenceArchiveHandler = require("./api/leave-of-absence/archive");
const createUserHandler = require("./api/admin/create-user");
const deleteUserHandler = require("./api/admin/delete-user");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.redirect("/login.html");
});

app.all("/api/config", (req, res) => configHandler(req, res));
app.all("/api/dashboard", (req, res) => dashboardHandler(req, res));
app.all("/api/analytics", (req, res) => analyticsHandler(req, res));

app.all("/api/minor-offenses", (req, res) => minorHandler(req, res));
app.all("/api/minor-offenses/archive", (req, res) => minorArchiveHandler(req, res));
app.all("/api/minor-offenses/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return minorByIdHandler(req, res);
});

app.all("/api/non-wearing-uniform", (req, res) => uniformHandler(req, res));
app.all("/api/non-wearing-uniform/archive", (req, res) => uniformArchiveHandler(req, res));
app.all("/api/non-wearing-uniform/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return uniformByIdHandler(req, res);
});

app.all("/api/gatepass", (req, res) => gatepassHandler(req, res));
app.all("/api/gatepass/archive", (req, res) => gatepassArchiveHandler(req, res));
app.all("/api/gatepass/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return gatepassByIdHandler(req, res);
});

app.all("/api/good-moral", (req, res) => goodMoralHandler(req, res));
app.all("/api/good-moral/archive", (req, res) => goodMoralArchiveHandler(req, res));
app.all("/api/good-moral/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return goodMoralByIdHandler(req, res);
});

app.all("/api/major-offenses", (req, res) => majorHandler(req, res));
app.all("/api/major-offenses/archive", (req, res) => majorArchiveHandler(req, res));
app.all("/api/major-offenses/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return majorByIdHandler(req, res);
});

app.all("/api/id-replacement", (req, res) => idReplacementHandler(req, res));
app.all("/api/id-replacement/archive", (req, res) => idReplacementArchiveHandler(req, res));
app.all("/api/id-replacement/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return idReplacementByIdHandler(req, res);
});

app.all("/api/leave-of-absence", (req, res) => leaveOfAbsenceHandler(req, res));
app.all("/api/leave-of-absence/archive", (req, res) => leaveOfAbsenceArchiveHandler(req, res));
app.all("/api/leave-of-absence/:id", (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  return leaveOfAbsenceByIdHandler(req, res);
});

app.all("/api/admin/create-user", (req, res) => createUserHandler(req, res));
app.all("/api/admin/delete-user", (req, res) => deleteUserHandler(req, res));

app.listen(PORT, () => {
  console.log(`OSD/OGC Monitoring server running on http://localhost:${PORT}`);
});
