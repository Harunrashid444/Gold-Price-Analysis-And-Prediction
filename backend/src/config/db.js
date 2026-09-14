const mongoose = require("mongoose");

async function connectDb(env) {
  if (env.memoryDb) {
    console.warn("MEMORY_DB=true — user accounts are stored in process memory only.");
    return { mode: "memory" };
  }

  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");
    return { mode: "mongo" };
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.warn("Falling back to in-memory users. Set MEMORY_DB=true to silence this, or start MongoDB.");
    return { mode: "memory" };
  }
}

module.exports = { connectDb };
