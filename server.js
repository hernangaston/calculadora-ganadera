// server.js – Express server (static + APIs)
const express = require("express");
const path = require("path");

const apiRouter = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// APIs
app.use("/api", apiRouter);

// Static
app.use(express.static(__dirname));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Basic healthcheck
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});