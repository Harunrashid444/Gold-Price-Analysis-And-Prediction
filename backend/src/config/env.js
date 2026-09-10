const path = require("path");
// Load root .env first, then backend/.env as override
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const required = ["JWT_SECRET"];

function loadEnv() {
  const env = {
    port: Number(process.env.PORT) || 5000,
    clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
    mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gold_price_analysis",
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    memoryDb: String(process.env.MEMORY_DB).toLowerCase() === "true",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpFrom: process.env.SMTP_FROM || "noreply@localhost",
    resetTokenHours: Number(process.env.RESET_TOKEN_HOURS) || 1,
  };

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (env.jwtSecret.length < 16) {
    throw new Error("JWT_SECRET must be at least 16 characters");
  }

  return env;
}

module.exports = { loadEnv };
