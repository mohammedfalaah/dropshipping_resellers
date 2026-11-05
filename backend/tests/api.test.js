const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/app");
const connectDB = require("../src/config/db");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Order = require("../src/models/Order");
const CodCollection = require("../src/models/CodCollection");
const LedgerEntry = require("../src/models/LedgerEntry");
const Payment = require("../src/models/Payment");

let server;
let baseUrl;

// Helper to make HTTP JSON requests
const request = ({ method, path, headers = {}, body = null }) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
};

test.before(async () => {
  await connectDB();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
});

test("GET /api/health should return 200 and operational status", async () => {
  const res = await request({ method: "GET", path: "/api/health" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.service, "sparepro-api");
});

test("Admin login with seeded credentials should succeed", async () => {
  const res = await request({
    method: "POST",
    path: "/api/auth/login",
    body: {
      email: "admin@sparepro.com",
      password: "Admin@SparePro2026!",
    },
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.token);
  assert.strictEqual(res.body.data.user.role, "admin");
});

test("Public reseller registration should default to pending approval status", async () => {
  const uniqueEmail = `test_reseller_${Date.now()}@example.com`;
  const res = await request({
    method: "POST",
    path: "/api/auth/register",
    body: {
      name: "Test Reseller",
      email: uniqueEmail,
      password: "Password123!",
      phone: "+91 9999988888",
      businessName: "Test Wholesale Enterprise",
      city: "Delhi",
    },
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.user.role, "reseller");
  assert.strictEqual(res.body.data.user.approvalStatus, "pending");
  assert.strictEqual(res.body.data.status.isApproved, false);

  // Attempting to place an order while pending must be denied with RESELLER_APPROVAL_REQUIRED
  const orderRes = await request({
    method: "POST",
    path: "/api/orders",
    headers: { Authorization: `Bearer ${res.body.data.token}` },
    body: {
      items: [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }],
      shippingAddress: {
        firstName: "Test",
        lastName: "Reseller",
        email: uniqueEmail,
        phone: "+91 9999988888",
        address: "Test address",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
      },
      paymentMethod: "COD",
    },
  });

  assert.strictEqual(orderRes.status, 403);
  assert.strictEqual(orderRes.body.success, false);
  assert.strictEqual(orderRes.body.code, "RESELLER_APPROVAL_REQUIRED");
});

test("Admin can approve pending reseller and reseller gains access", async () => {
  // 1. Login as Admin
  const adminLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "admin@sparepro.com", password: "Admin@SparePro2026!" },
  });
  const adminToken = adminLogin.body.data.token;

  // 2. Find pending reseller
  const pendingUser = await User.findOne({ email: "priya.patel@example.com" });
  assert.ok(pendingUser);

  // 3. Approve via PATCH /api/admin/resellers/:id/approve
  const approveRes = await request({
    method: "PATCH",
    path: `/api/admin/resellers/${pendingUser._id}/approve`,
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.body.success, true);
  assert.strictEqual(approveRes.body.data.reseller.approvalStatus, "approved");

  // 4. Login as Priya (now approved)
  const priyaLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "priya.patel@example.com", password: "Priya@2026!" },
  });
  assert.strictEqual(priyaLogin.status, 200);
  assert.strictEqual(priyaLogin.body.data.status.isApproved, true);
});

test("Product stock decrement and immutable ledger debit upon order placement", async () => {
  // 1. Login as approved reseller
  const resellerLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "reseller@sparepro.com", password: "Reseller@2026!" },
  });
  const resellerToken = resellerLogin.body.data.token;
  const resellerId = resellerLogin.body.data.user._id;

  // 2. Pick a product and record initial stock (create if not found)
  let product = await Product.findOne({ isActive: true });
  if (!product) {
    product = await Product.create({
      name: "Magnetic Power Bank",
      sku: "RES-GAD-001",
      slug: `power-bank-${Date.now()}`,
      pricePaise: 15000,
      resellerPricePaise: 10600,
      stockQuantity: 100,
      isActive: true,
      category: "Gadgets",
    });
  }
  const initialStock = product.stockQuantity;

  // 3. Place order for 2 units via COD with customer selling price
  const orderRes = await request({
    method: "POST",
    path: "/api/orders",
    headers: { Authorization: `Bearer ${resellerToken}` },
    body: {
      items: [{ productId: product._id.toString(), quantity: 2, customerSellingPrice: 150 }],
      shippingAddress: {
        firstName: "Rahul",
        lastName: "Sharma",
        email: "reseller@sparepro.com",
        phone: "+91 9123456780",
        address: "Shop 14, Galaxy Market",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
      paymentMethod: "COD",
    },
  });

  assert.strictEqual(orderRes.status, 201);
  assert.strictEqual(orderRes.body.success, true);
  const createdOrder = orderRes.body.data.order;
  assert.strictEqual(createdOrder.items[0].quantity, 2);

  // 4. Verify atomic stock decrement
  const updatedProduct = await Product.findById(product._id);
  assert.strictEqual(updatedProduct.stockQuantity, initialStock - 2);

  // 5. Verify Ledger DEBIT entry created ONLY for delivery charge (₹50) in dropship COD
  const ledgerEntry = await LedgerEntry.findOne({
    referenceId: createdOrder.orderNumber,
    type: "DEBIT",
  });
  assert.ok(ledgerEntry);
  assert.strictEqual(ledgerEntry.amountPaise, createdOrder.totalPaise); // ₹50 delivery charge

  // 6. Verify COD collection record created for customer selling total
  const codRecord = await CodCollection.findOne({ order: createdOrder._id });
  assert.ok(codRecord);
  assert.strictEqual(codRecord.codAmountPaise, createdOrder.customerSellingTotalPaise);
});

test("Admin recording COD collection, reconciling remittance, and settling reseller profit avoids double counting", async () => {
  // 1. Login as Admin
  const adminLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "admin@sparepro.com", password: "Admin@SparePro2026!" },
  });
  const adminToken = adminLogin.body.data.token;

  // 2. Find a pending COD record
  const codRecord = await CodCollection.findOne({ collectionStatus: "PENDING" });
  assert.ok(codRecord);
  const collectionAmountRupees = Number((codRecord.pendingAmountPaise / 100).toFixed(2));

  // 3. Mark COD as collected by courier (Stage 5)
  const collectRes = await request({
    method: "PATCH",
    path: `/api/cod/${codRecord._id}/collect`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      collectedAmount: collectionAmountRupees,
      collectionStatus: "COLLECTED",
      collectionReference: `AWB-MOCK-${Date.now()}`,
      notes: "Cash collected and deposited by courier partner",
    },
  });

  assert.strictEqual(collectRes.status, 200);
  assert.strictEqual(collectRes.body.success, true);
  assert.strictEqual(collectRes.body.data.codRecord.collectionStatus, "COLLECTED");
  assert.strictEqual(collectRes.body.data.codRecord.pendingAmountPaise, 0);

  // 4. Reconcile courier remittance with VEXORA bank account (Stage 6)
  const reconcileRes = await request({
    method: "PATCH",
    path: `/api/cod/${codRecord._id}/reconcile`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      reconciliationReference: `UTR-MOCK-TEST-${Date.now()}`,
      notes: "Courier remittance verified against VEXORA bank statement",
    },
  });
  assert.strictEqual(reconcileRes.status, 200);
  assert.strictEqual(reconcileRes.body.success, true);
  assert.strictEqual(reconcileRes.body.data.codRecord.collectionStatus, "RECONCILED");

  // 5. Settle reseller profit and credit double-entry ledger (Stage 7)
  const profitRupees = Number(((codRecord.expectedResellerProfitPaise || 0) / 100).toFixed(2));
  if (profitRupees > 0) {
    const settleRes = await request({
      method: "POST",
      path: `/api/cod/${codRecord._id}/settle`,
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        amount: profitRupees,
        reference: `SETTLE-BATCH-${Date.now()}`,
        notes: "Reseller profit settlement",
      },
    });
    assert.strictEqual(settleRes.status, 200);
    assert.strictEqual(settleRes.body.success, true);
    assert.strictEqual(settleRes.body.data.codRecord.resellerSettlementStatus, "SETTLED");

    // Verify ledger CREDIT entry for reseller profit
    const creditLedger = await LedgerEntry.findOne({
      referenceType: "COD_COLLECTION",
      referenceId: codRecord.orderNumber,
      type: "CREDIT",
    });
    assert.ok(creditLedger);
    assert.strictEqual(creditLedger.amountPaise, codRecord.expectedResellerProfitPaise);
  }
});

test("Payment reversal creates a compensating DEBIT entry without silently deleting", async () => {
  const adminLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "admin@sparepro.com", password: "Admin@SparePro2026!" },
  });
  const adminToken = adminLogin.body.data.token;

  // Find or create a verified payment
  let payment = await Payment.findOne({ status: "PAID", isReversed: false });
  if (!payment) {
    const reseller = await User.findOne({ email: "reseller@sparepro.com" });
    const recordRes = await request({
      method: "POST",
      path: "/api/admin/payments/record-manual",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        resellerId: reseller._id.toString(),
        amount: 500,
        method: "BANK_TRANSFER",
        transactionReference: `MANUAL-${Date.now()}`,
        notes: "Test payment for reversal test",
      },
    });
    payment = recordRes.body.data.payment;
  }
  assert.ok(payment);

  const reverseRes = await request({
    method: "POST",
    path: `/api/payments/${payment._id}/reverse`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      reason: "Cheque bounced / Chargeback initiated by bank",
    },
  });

  assert.strictEqual(reverseRes.status, 200);
  assert.strictEqual(reverseRes.body.success, true);
  assert.strictEqual(reverseRes.body.data.payment.isReversed, true);
  assert.strictEqual(reverseRes.body.data.payment.status, "REVERSED");

  // Verify compensating DEBIT entry exists
  const compensatingEntry = await LedgerEntry.findOne({
    payment: payment._id,
    referenceType: "REVERSAL",
    type: "DEBIT",
  });
  assert.ok(compensatingEntry);
  assert.strictEqual(compensatingEntry.amountPaise, payment.amountPaise);
});

test("Financial reports and Balance Sheet endpoint return reconciled data", async () => {
  const adminLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "admin@sparepro.com", password: "Admin@SparePro2026!" },
  });
  const adminToken = adminLogin.body.data.token;

  const bsRes = await request({
    method: "GET",
    path: "/api/admin/reports/balance-sheet",
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(bsRes.status, 200);
  assert.strictEqual(bsRes.body.success, true);
  assert.ok(bsRes.body.data.assets);
  assert.ok(bsRes.body.data.revenueAndEquity);
  assert.strictEqual(bsRes.body.data.reconciliation.verifiedLedgerReconciled, true);
});

test("Platform settings: Admin can manage delivery charges and orders reflect updated delivery charge", async () => {
  // 1. Check public settings returns delivery charge
  const publicRes = await request({
    method: "GET",
    path: "/api/settings/public",
  });
  assert.strictEqual(publicRes.status, 200);
  assert.strictEqual(publicRes.body.success, true);
  assert.ok(typeof publicRes.body.data.deliveryChargePaise === "number");

  // 2. Admin logs in and updates delivery charge to ₹65 (6500 paise)
  const adminLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "admin@sparepro.com", password: "Admin@SparePro2026!" },
  });
  const adminToken = adminLogin.body.data.token;

  const updateRes = await request({
    method: "PUT",
    path: "/api/admin/settings",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      deliveryCharge: 65,
      platformName: "VEXORA Resellers Platform",
    },
  });
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(updateRes.body.success, true);
  assert.strictEqual(updateRes.body.data.settings.deliveryChargePaise, 6500);
  assert.strictEqual(updateRes.body.data.settings.deliveryChargeRupees, 65);

  // 3. Verify public settings immediately reflect the new ₹65 delivery charge
  const publicUpdated = await request({
    method: "GET",
    path: "/api/settings/public",
  });
  assert.strictEqual(publicUpdated.body.data.deliveryCharge, 65);
  assert.strictEqual(publicUpdated.body.data.deliveryChargePaise, 6500);

  // Reset back to standard ₹50 for platform baseline
  await request({
    method: "PUT",
    path: "/api/admin/settings",
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { deliveryCharge: 50 },
  });
});
