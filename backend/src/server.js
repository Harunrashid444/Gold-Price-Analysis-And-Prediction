const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { loadEnv } = require("./config/env");
const { connectDb } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { createMemoryStore, createMongoStore } = require("./services/userStore");
const { seedPipelineCollections } = require("./services/seedPipeline");
const { loadPipelineResults } = require("./services/pipelineData");
const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const User = require("./models/User");

async function start() {
  const env = loadEnv();
  loadPipelineResults();

  const app = express();
  app.locals.env = env;

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const db = await connectDb(env);
  app.locals.dbMode = db.mode;
  app.locals.users = db.mode === "mongo" ? createMongoStore(User) : createMemoryStore();
  await seedPipelineCollections(db.mode);

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      db: app.locals.dbMode,
      emailProvider: env.smtpHost ? "configured" : "pending",
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
