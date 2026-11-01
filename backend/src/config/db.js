const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

let cachedConnection = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedConnection || mongoose.connection.readyState === 0) {
    cachedConnection = mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
    });
  }

  try {
    const conn = await cachedConnection;
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    cachedConnection = null;
    console.error("[MongoDB] Connection Error:", error.message);
    throw error;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected. Resetting cached connection.");
  cachedConnection = null;
});

mongoose.connection.on("error", (err) => {
  console.error("[MongoDB] Connection Error event:", err.message);
  cachedConnection = null;
});

module.exports = connectDB;

