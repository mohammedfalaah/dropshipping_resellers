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

    // 5. Seed Products
    console.log("[Seed] Seeding 8 wholesale products...");
    const createdProducts = await Product.insertMany(seedProducts);

    // 6. Seed Sample Confirmed Orders for Approved Reseller
    console.log("[Seed] Creating sample confirmed orders and ledger entries...");

    // Order 1: COD Order
    const earbuds = createdProducts[0];
    const watch = createdProducts[2];
    const order1Items = [
      {
        product: earbuds._id,
        name: earbuds.name,
        sku: earbuds.sku,
        image: earbuds.mainImage,
        quantity: 2,
        unitPricePaise: earbuds.resellerPricePaise,
        subtotalPaise: earbuds.resellerPricePaise * 2,
      },
      {
        product: watch._id,
        name: watch.name,
        sku: watch.sku,
        image: watch.mainImage,
        quantity: 1,
        unitPricePaise: watch.resellerPricePaise,
        subtotalPaise: watch.resellerPricePaise * 1,
      },
    ];
    const order1Subtotal = order1Items.reduce((s, i) => s + i.subtotalPaise, 0);
    const order1Total = order1Subtotal; // Free shipping over 50000 paise

    const order1 = await Order.create({
      orderNumber: "SP-849201",
      reseller: approvedReseller._id,
      items: order1Items,
      subtotalPaise: order1Subtotal,
      shippingPaise: 0,
      totalPaise: order1Total,
      currency: "INR",
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      orderStatus: "SHIPPED",
      shippingAddress: {
        firstName: "Rahul",
        lastName: "Sharma",
        email: approvedReseller.email,
        phone: approvedReseller.phone,
        address: "Shop 14, Galaxy Market",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
      },
      courierName: "BlueDart Express",
      trackingNumber: "BD98472910IN",
      dispatchedAt: new Date(),
      cod: {
        codAmountPaise: order1Total,
        collectedPaise: 0,
        pendingPaise: order1Total,
        collectionStatus: "PENDING",
      },
    });

    // Create COD collection record for Order 1
    await CodCollection.create({
      order: order1._id,
      orderNumber: order1.orderNumber,
      reseller: approvedReseller._id,
      resellerName: approvedReseller.name,
      codAmountPaise: order1Total,
      collectedAmountPaise: 0,
      pendingAmountPaise: order1Total,
      deliveryStatus: "DISPATCHED",
      collectionStatus: "PENDING",
      courierName: "BlueDart Express",
      trackingNumber: "BD98472910IN",
    });

    // Ledger DEBIT for Order 1
    await LedgerEntry.create({
      entryNumber: "LEDG-1001",
      reseller: approvedReseller._id,
      type: "DEBIT",
      amountPaise: order1Total,
      balanceBeforePaise: 0,
      balanceAfterPaise: order1Total,
      referenceType: "ORDER",
      referenceId: order1.orderNumber,
      order: order1._id,
      description: `Wholesale Order Placed - ${order1.orderNumber}`,
      reason: "Confirmed wholesale order",
      recordedBy: approvedReseller._id,
    });

    // Order 2: Prepaid Order (Paid via Razorpay)
    const sneakers = createdProducts[4];
    const order2Items = [
      {
        product: sneakers._id,
        name: sneakers.name,
        sku: sneakers.sku,
        image: sneakers.mainImage,
        quantity: 2,
        unitPricePaise: sneakers.resellerPricePaise,
        subtotalPaise: sneakers.resellerPricePaise * 2,
      },
    ];
    const order2Subtotal = order2Items.reduce((s, i) => s + i.subtotalPaise, 0);
    const order2Total = order2Subtotal;

    const order2 = await Order.create({
      orderNumber: "SP-729104",
      reseller: approvedReseller._id,
      items: order2Items,
      subtotalPaise: order2Subtotal,
      shippingPaise: 0,
      totalPaise: order2Total,
      currency: "INR",
      paymentMethod: "RAZORPAY",
      paymentStatus: "PAID",
      orderStatus: "DELIVERED",
      shippingAddress: {
        firstName: "Rahul",
        lastName: "Sharma",
        email: approvedReseller.email,
        phone: approvedReseller.phone,
        address: "Shop 14, Galaxy Market",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
      },
      courierName: "Delhivery",
      trackingNumber: "DELH837201IN",
      dispatchedAt: new Date(Date.now() - 3 * 86400000),
      deliveredAt: new Date(),
      razorpay: {
        orderId: "order_mock_seed_101",
        paymentId: "pay_mock_seed_202",
        signature: "verified_sig_seed",
      },
    });

    // Payment record for Order 2
    const payment2 = await Payment.create({
      paymentNumber: "PAY-1002",
      reseller: approvedReseller._id,
      order: order2._id,
      amountPaise: order2Total,
      method: "RAZORPAY",
      status: "PAID",
      transactionReference: "pay_mock_seed_202",
      notes: "Online prepaid payment via Razorpay",
      recordedBy: approvedReseller._id,
    });

    // Ledger DEBIT (order) & CREDIT (payment)
    await LedgerEntry.create({
      entryNumber: "LEDG-1002",
      reseller: approvedReseller._id,
      type: "DEBIT",
      amountPaise: order2Total,
      balanceBeforePaise: order1Total,
      balanceAfterPaise: order1Total + order2Total,
      referenceType: "ORDER",
      referenceId: order2.orderNumber,
      order: order2._id,
      description: `Wholesale Order Placed - ${order2.orderNumber}`,
      reason: "Prepaid online order",
      recordedBy: approvedReseller._id,
    });

    await LedgerEntry.create({
      entryNumber: "LEDG-1003",
      reseller: approvedReseller._id,
      type: "CREDIT",
      amountPaise: order2Total,
      balanceBeforePaise: order1Total + order2Total,
      balanceAfterPaise: order1Total,
      referenceType: "PAYMENT",
      referenceId: payment2.paymentNumber,
      order: order2._id,
      payment: payment2._id,
      description: `Online Payment Verified - ${payment2.paymentNumber}`,
      reason: "Verified Razorpay payment",
      recordedBy: approvedReseller._id,
    });

    // Update approved reseller's financial summary
    await User.findByIdAndUpdate(approvedReseller._id, {
      "financialSummary.totalOrders": 2,
      "financialSummary.totalOrderValuePaise": order1Total + order2Total,
      "financialSummary.totalPaidPaise": order2Total,
      "financialSummary.outstandingBalancePaise": order1Total,
      "financialSummary.codPendingPaise": order1Total,
    });

    console.log("==================================================================");
    console.log("  SEED COMPLETED SUCCESSFULLY!");
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
