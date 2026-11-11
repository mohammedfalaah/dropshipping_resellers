const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

const startServer = async () => {
  try {
    await connectDB();

    // Auto-ensure administrator account exists in database
    try {
      const User = require("./models/User");
      const { ADMIN_INITIAL_EMAIL, ADMIN_INITIAL_PASSWORD, ADMIN_INITIAL_NAME } = require("./config/env");
      const admin = await User.findOne({ role: "admin" });
      if (!admin) {
        await User.create({
          name: ADMIN_INITIAL_NAME || "SPARE PRO Admin",
          email: (ADMIN_INITIAL_EMAIL || "admin@sparepro.com").toLowerCase(),
          password: ADMIN_INITIAL_PASSWORD || "Admin@SparePro2026!",
          phone: "+91 8139808004",
          role: "admin",
          approvalStatus: "approved",
          accountStatus: "active",
          approvedAt: new Date(),
          businessInfo: {
            businessName: "Spare pro",
            address: "Thazepalam, Tirur",
            city: "Tirur",
            state: "Kerala",
            postalCode: "676107",
            country: "India",
          },
        });
        console.log(`[Admin]: Initial admin account verified/created (${ADMIN_INITIAL_EMAIL})`);
      }
    } catch (e) {
      console.warn("[Admin Check]:", e.message);
    }

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

