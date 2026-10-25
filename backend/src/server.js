const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  SPARE PRO Wholesale & Dropshipping Backend API`);
      console.log(`  Server running on port ${PORT}`);
      console.log(`  API Health: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });

    const gracefulShutdown = () => {
      console.log("\nShutting down server gracefully...");
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

