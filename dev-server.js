require("dotenv").config();

const express = require("express");
const path = require("path");

const dashboardHandler = require("./api/dashboard");
const configHandler = require("./api/config");
const minorHandler = require("./api/minor-offenses/index");
const minorByIdHandler = require("./api/minor-offenses/[id]");
const minorArchiveHandler = require("./api/minor-offenses/archive");
const uniformHandler = require("./api/non-wearing-uniform/index");
const uniformByIdHandler = require("./api/non-wearing-uniform/[id]");
const uniformArchiveHandler = require("./api/non-wearing-uniform/archive");
const gatepassHandler = require("./api/gatepass/index");
const gatepassByIdHandler = require("./api/gatepass/[id]");
const gatepassArchiveHandler = require("./api/gatepass/archive");
const goodMoralHandler = require("./api/good-moral/index");
const goodMoralByIdHandler = require("./api/good-moral/[id]");
const goodMoralArchiveHandler = require("./api/good-moral/archive");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.all("/api/config", (req, res) => configHandler(req, res));
app.all("/api/dashboard", (req, res) => dashboardHandler(req, res));

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

app.listen(PORT, () => {
  console.log(`OSD/OGC Monitoring server running on http://localhost:${PORT}`);
});
