const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const Payment = require("../src/models/Payment");
const CodCollection = require("../src/models/CodCollection");
const LedgerEntry = require("../src/models/LedgerEntry");
const Cart = require("../src/models/Cart");
const AuditLog = require("../src/models/AuditLog");
const Wishlist = require("../src/models/Wishlist");
const {
  ADMIN_INITIAL_EMAIL,
  ADMIN_INITIAL_PASSWORD,
  ADMIN_INITIAL_NAME,
} = require("../src/config/env");

const clearAll = async () => {
  try {
    console.log("[Clear All] Connecting to MongoDB...");
    await connectDB();
    console.log("[Clear All] Connected.\n");

    console.log("[Clear All] Wiping all collections...");
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      CodCollection.deleteMany({}),
      LedgerEntry.deleteMany({}),
      Cart.deleteMany({}),
      AuditLog.deleteMany({}),
      Wishlist.deleteMany({}),
      User.deleteMany({ role: { $ne: "admin" } }), // Delete all resellers & normal users
    ]);

    // Ensure Admin account exists
    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      console.log("[Clear All] Creating fresh Admin account...");
      admin = await User.create({
        name: ADMIN_INITIAL_NAME,
        email: ADMIN_INITIAL_EMAIL.toLowerCase(),
        password: ADMIN_INITIAL_PASSWORD,
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
      console.log(`[Clear All] Admin created: ${admin.email}`);
    } else {
      console.log(`[Clear All] Existing Admin preserved: ${admin.email}`);
    }

    console.log("\n==================================================");
    console.log("  ENTIRE DATABASE CLEARED SUCCESSFULLY!");
    console.log("==================================================");
    console.log("  All products, orders, categories, and test resellers wiped.");
    console.log(`  Admin account preserved: ${admin.email}`);
    console.log("==================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("[Clear All Error]:", err.message);
    process.exit(1);
  }
};

clearAll();

