const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const Payment = require("../src/models/Payment");
const CodCollection = require("../src/models/CodCollection");
const LedgerEntry = require("../src/models/LedgerEntry");
const AuditLog = require("../src/models/AuditLog");
const {
  ADMIN_INITIAL_EMAIL,
  ADMIN_INITIAL_PASSWORD,
  ADMIN_INITIAL_NAME,
} = require("../src/config/env");
const { rupeesToPaise } = require("../src/utils/currency");


const seedDatabase = async () => {
  try {
    await connectDB();
    console.log("[Seed] Connected to database.");

    // Clear existing data cleanly
    console.log("[Seed] Cleaning existing collections...");
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      CodCollection.deleteMany({}),
      LedgerEntry.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    // 1. Seed Admin Account
    console.log("[Seed] Creating Admin account...");
    const admin = await User.create({
      name: ADMIN_INITIAL_NAME,
      email: ADMIN_INITIAL_EMAIL.toLowerCase(),
      password: ADMIN_INITIAL_PASSWORD,
      phone: "+91 9876543210",
      role: "admin",
      approvalStatus: "approved",
      accountStatus: "active",
      approvedAt: new Date(),
      businessInfo: {
        businessName: "SPARE PRO Headquarters",
        address: "Commercial Hub, Sector 18",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
    });
    console.log(`[Seed] Admin created: ${admin.email}`);

    // 2. Seed Approved Reseller (Demo Account)
    console.log("[Seed] Creating Demo Approved Reseller...");
    const approvedReseller = await User.create({
      name: "Rahul Sharma",
      email: "reseller@sparepro.com",
      password: "Reseller@2026!",
      phone: "+91 9123456780",
      role: "reseller",
      approvalStatus: "approved",
      accountStatus: "active",
      approvedAt: new Date(),
      approvedBy: admin._id,
      businessInfo: {
        businessName: "Apex Retailers Ltd",
        address: "Shop 14, Galaxy Market",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
        taxId: "29AAAAA0000A1Z5",
      },
    });

    // 3. Seed Pending Reseller (For Admin Approval Testing)
    console.log("[Seed] Creating Demo Pending Reseller...");
    const pendingReseller = await User.create({
      name: "Priya Patel",
      email: "priya.patel@example.com",
      password: "Priya@2026!",
      phone: "+91 9898989898",
      role: "reseller",
      approvalStatus: "pending",
      accountStatus: "active",
      businessInfo: {
        businessName: "Patel ElectroHub",
        address: "42 Ring Road",
        city: "Ahmedabad",
        state: "Gujarat",
        postalCode: "380015",
        country: "India",
      },
    });

    // 4. Seed Categories
    console.log("[Seed] Seeding categories...");
    await Category.insertMany(seedCategories);

    console.log("==================================================================");
    console.log("  SEED COMPLETED SUCCESSFULLY! (Clean DB without sample products)");
    console.log("  Admin Credentials:");
    console.log(`    Email:    ${ADMIN_INITIAL_EMAIL}`);
    console.log(`    Password: ${ADMIN_INITIAL_PASSWORD}`);
    console.log("  Approved Reseller Credentials:");
    console.log("    Email:    reseller@sparepro.com");
    console.log("    Password: Reseller@2026!");
    console.log("  Pending Reseller (for testing approval):");
    console.log("    Email:    priya.patel@example.com");
    console.log("    Password: Priya@2026!");
    console.log("==================================================================");

    process.exit(0);
  } catch (err) {
    console.error("[Seed Error]:", err);
    process.exit(1);
  }
};

seedDatabase();
