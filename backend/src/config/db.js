const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

let cachedConnection = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (!cachedConnection) {
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
  console.warn("[MongoDB] Disconnected. Attempting reconnect...");
});

module.exports = connectDB;

