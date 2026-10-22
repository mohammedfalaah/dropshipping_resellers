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

  // 2. Pick a product and record initial stock
  const product = await Product.findOne({ sku: "RES-GAD-001" });
  const initialStock = product.stockQuantity;

  // 3. Place order for 2 units via COD
  const orderRes = await request({
    method: "POST",
    path: "/api/orders",
    headers: { Authorization: `Bearer ${resellerToken}` },
    body: {
      items: [{ productId: product._id.toString(), quantity: 2 }],
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

  // 5. Verify Ledger DEBIT entry created
  const ledgerEntry = await LedgerEntry.findOne({
    referenceId: createdOrder.orderNumber,
    type: "DEBIT",
  });
  assert.ok(ledgerEntry);
  assert.strictEqual(ledgerEntry.amountPaise, createdOrder.totalPaise);

  // 6. Verify COD collection record created
  const codRecord = await CodCollection.findOne({ order: createdOrder._id });
  assert.ok(codRecord);
  assert.strictEqual(codRecord.pendingAmountPaise, createdOrder.totalPaise);
});

test("Admin recording COD collection credits the ledger and avoids double counting", async () => {
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

  // 3. Mark COD as collected
  const collectRes = await request({
    method: "PATCH",
    path: `/api/cod/${codRecord._id}/collect`,
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      collectedAmount: collectionAmountRupees,
      collectionStatus: "COLLECTED",
      collectionReference: `UTR-MOCK-TEST-${Date.now()}`,
      notes: "Cash collected and deposited by courier partner",
    },
  });

  assert.strictEqual(collectRes.status, 200);
  assert.strictEqual(collectRes.body.success, true);
  assert.strictEqual(collectRes.body.data.codRecord.collectionStatus, "COLLECTED");
  assert.strictEqual(collectRes.body.data.codRecord.pendingAmountPaise, 0);

  // 4. Verify payment and ledger CREDIT
  const payment = await Payment.findOne({
    order: codRecord.order,
    method: "COD",
    status: "PAID",
  });
  assert.ok(payment);

  const creditLedger = await LedgerEntry.findOne({
    payment: payment._id,
    type: "CREDIT",
  });
  assert.ok(creditLedger);
  assert.strictEqual(creditLedger.amountPaise, codRecord.codAmountPaise);
});

test("Payment reversal creates a compensating DEBIT entry without silently deleting", async () => {
  const adminLogin = await request({
    method: "POST",
    path: "/api/auth/login",
    body: { email: "admin@sparepro.com", password: "Admin@SparePro2026!" },
  });
  const adminToken = adminLogin.body.data.token;

  // Find a verified payment
  const payment = await Payment.findOne({ status: "PAID", isReversed: false });
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
