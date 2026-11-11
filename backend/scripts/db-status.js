const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const Payment = require("../src/models/Payment");
const CodCollection = require("../src/models/CodCollection");
const LedgerEntry = require("../src/models/LedgerEntry");

const checkDb = async () => {
  try {
    await connectDB();
    const [users, products, categories, orders, payments, cod, ledgers] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Category.countDocuments(),
      Order.countDocuments(),
      Payment.countDocuments(),
      CodCollection.countDocuments(),
      LedgerEntry.countDocuments(),
    ]);

    console.log("Database Status (MongoDB Atlas):");
    console.log(`  Users:        ${users}`);
    console.log(`  Products:     ${products}`);
    console.log(`  Categories:   ${categories}`);
    console.log(`  Orders:       ${orders}`);
    console.log(`  Payments:     ${payments}`);
    console.log(`  COD Records:  ${cod}`);
    console.log(`  Ledger items: ${ledgers}`);
    process.exit(0);
  } catch (e) {
    console.error("DB check error:", e.message);
    process.exit(1);
  }
};

checkDb();

