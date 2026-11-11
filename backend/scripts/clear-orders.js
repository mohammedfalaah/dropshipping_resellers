const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Order = require("../src/models/Order");
const Payment = require("../src/models/Payment");
const CodCollection = require("../src/models/CodCollection");
const LedgerEntry = require("../src/models/LedgerEntry");
const Cart = require("../src/models/Cart");
const AuditLog = require("../src/models/AuditLog");
const User = require("../src/models/User");

const clearOrders = async () => {
  try {
    console.log("[Clear Orders] Connecting to MongoDB...");
    await connectDB();
    console.log("[Clear Orders] Connected successfully.\n");

    const orderCount = await Order.countDocuments();
    const paymentCount = await Payment.countDocuments();
    const codCount = await CodCollection.countDocuments();
    const ledgerCount = await LedgerEntry.countDocuments();
    const cartCount = await Cart.countDocuments();

    console.log(`Current Database Statistics:`);
    console.log(`  - Orders:            ${orderCount}`);
    console.log(`  - Payments:          ${paymentCount}`);
    console.log(`  - COD Collections:   ${codCount}`);
    console.log(`  - Ledger Entries:    ${ledgerCount}`);
    console.log(`  - Active Carts:      ${cartCount}\n`);

    console.log("[Clear Orders] Deleting orders, payments, COD records, and ledgers...");
    const [delOrders, delPayments, delCod, delLedger, delCart] = await Promise.all([
      Order.deleteMany({}),
      Payment.deleteMany({}),
      CodCollection.deleteMany({}),
      LedgerEntry.deleteMany({}),
      Cart.deleteMany({}),
      AuditLog.deleteMany({ action: { $regex: /order|payment|cod/i } }),
    ]);

    // Reset reseller ledger balances
    await User.updateMany(
      { role: "reseller" },
      {
        $set: {
          "walletBalancePaise": 0,
          "currentDuePaise": 0,
        },
      }
    );

    console.log("\n==================================================");
    console.log("  SUCCESSFULLY CLEARED ALL TEST ORDERS & DATA!");
    console.log("==================================================");
    console.log(`  ✓ Orders deleted:          ${delOrders.deletedCount}`);
    console.log(`  ✓ Payments deleted:        ${delPayments.deletedCount}`);
    console.log(`  ✓ COD records deleted:     ${delCod.deletedCount}`);
    console.log(`  ✓ Ledger entries deleted:  ${delLedger.deletedCount}`);
    console.log(`  ✓ Carts reset:             ${delCart.deletedCount}`);
    console.log(`  ✓ Products & Categories:   PRESERVED (untouched)`);
    console.log(`  ✓ Resellers & Admin users: PRESERVED (untouched)`);
    console.log("==================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("[Clear Orders Error]:", err.message);
    process.exit(1);
  }
};

clearOrders();

