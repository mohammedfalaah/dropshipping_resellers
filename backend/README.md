# SPARE PRO Wholesale & Dropshipping Platform — Backend API Documentation

A secure, high-concurrency Node.js / Express.js REST API for wholesale and dropshipping operations built with MongoDB Atlas, Mongoose, JWT authentication, Zod request validation, Razorpay payment gateway integration, and an immutable double-entry financial ledger.

---

## 1. Tech Stack & Architectural Principles

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB Atlas / MongoDB 7.0 via Mongoose
- **Authentication**: Stateless JSON Web Tokens (JWT) with bcryptjs password hashing (12 salt rounds)
- **Validation**: Zod schema validation on all incoming payload bodies and query parameters
- **Payment Gateway**: Razorpay (order creation, HMAC SHA256 signature verification, and webhook handling)
- **Security**: Helmet, CORS origin restriction, express-rate-limit, input sanitization, and ownership checks

### Core Financial & Accounting Rules
1. **Integer Paise Currency Storage**: All monetary fields (`pricePaise`, `subtotalPaise`, `totalAmountPaise`, `outstandingBalancePaise`, `codPendingPaise`, etc.) are strictly represented as integers in INR paise (`₹1.00 = 100 paise`). Floating-point arithmetic is never used for balance or ledger computations.
2. **Double-Entry Financial Ledger**: Balances are calculated through immutable ledger records (`LedgerEntry`) tracking `balanceBeforePaise`, `amountPaise`, `entryType`, and `balanceAfterPaise`. No silent balance mutation is permitted.
3. **Decoupled COD Status**: Cash-on-Delivery delivery status (`pending`, `in_transit`, `delivered`) and financial collection status (`pending`, `collected`, `partially_collected`) are separate state machines.
4. **Approval Enforcement**: All public reseller registrations default to `pending` approval. Middleware (`requireApprovedReseller`) strictly blocks unapproved, rejected, or blocked resellers from placing wholesale orders, accessing private wholesale pricing, or checking out.
5. **No Public Admin Registration**: Admin accounts cannot be created via public sign-up endpoints; they are provisioned exclusively via database seed or existing admin invitation.

---

## 2. Directory Structure

```
backend/
├── package.json
├── .env
├── .env.example
├── scripts/
│   └── seed.js                 # Seeds Admin, Resellers, Categories, and Products
├── tests/
│   └── api.test.js             # Automated test suite using Node test runner
└── src/
    ├── app.js                  # Express app definition & middleware pipeline
    ├── server.js               # Server entry point & DB connection
    ├── config/
    │   ├── db.js               # MongoDB connection
    │   ├── env.js              # Environment variable loader & fallbacks
    │   └── razorpay.js         # Razorpay client instance
    ├── controllers/
    │   ├── adminController.js
    │   ├── authController.js
    │   ├── cartController.js
    │   ├── codController.js
    │   ├── orderController.js
    │   ├── paymentController.js
    │   ├── productController.js
    │   ├── reportController.js
    │   └── wishlistController.js
    ├── middleware/
    │   ├── auth.js             # JWT verification & role authorization
    │   ├── errorHandler.js     # Centralized error handler
    │   ├── resellerApproval.js # Enforces approved reseller status
    │   ├── upload.js           # Multer file upload handler
    │   └── validate.js         # Zod validation middleware
    ├── models/
    │   ├── AuditLog.js
    │   ├── Cart.js
    │   ├── Category.js
    │   ├── CodCollection.js
    │   ├── LedgerEntry.js
    │   ├── Order.js
    │   ├── Payment.js
    │   ├── Product.js
    │   ├── User.js
    │   └── Wishlist.js
    ├── routes/
    │   ├── adminRoutes.js
    │   ├── authRoutes.js
    │   ├── cartRoutes.js
    │   ├── codRoutes.js
    │   ├── orderRoutes.js
    │   ├── paymentRoutes.js
    │   ├── productRoutes.js
    │   ├── reportRoutes.js
    │   └── wishlistRoutes.js
    ├── services/
    │   ├── codService.js
    │   ├── ledgerService.js
    │   ├── orderService.js
    │   ├── paymentService.js
    │   └── reportService.js
    ├── utils/
    │   ├── currency.js
    │   └── response.js
    └── validators/
        ├── authValidator.js
        ├── codValidator.js
        ├── orderValidator.js
        ├── paymentValidator.js
        ├── productValidator.js
        └── resellerValidator.js
```

---

## 3. Getting Started

### 3.1 Install Dependencies
```bash
cd backend
npm install
```

### 3.2 Environment Variables
Create a `.env` file in `backend/` with the following keys:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/sparepro_reseller
JWT_SECRET=sparepro_super_secret_jwt_key_2026_wholesale_reseller
JWT_EXPIRES_IN=7d
RAZORPAY_KEY_ID=rzp_test_sparepro2026
RAZORPAY_KEY_SECRET=sparepro_secret_key_mock_2026
FRONTEND_URL=http://localhost:5173
```

### 3.3 Database Seeding
Populate the database with the initial Super Admin, pre-approved & pending resellers, categories (Gadgets, Watches, Footwear, Fashion), products, and financial ledger records:
```bash
node scripts/seed.js
```

**Pre-seeded Credentials**:
- **Super Admin**: `admin@sparepro.com` / `Admin@SparePro2026!`
- **Approved Reseller**: `reseller@sparepro.com` / `Reseller@2026!`
- **Pending Reseller**: `priya.patel@example.com` / `Priya@2026!`

### 3.4 Running the Application
```bash
# Start server
npm start

# Development mode with nodemon
npm run dev
```

### 3.5 Running Automated Tests
```bash
npm test
```
Runs the automated test suite verifying:
- Authentication & JWT issuance
- Role-based authorization & Reseller approval barriers
- Product filtering by category
- Order creation & atomic stock decrement
- Financial double-entry ledger debit & credit reconciliation
- COD collection state transition

---

## 4. API Reference

All requests and responses use standard JSON format:
- **Success**: `{ "success": true, "message": "...", "data": { ... } }`
- **Error**: `{ "success": false, "message": "...", "code": "..." }`

### 4.1 Authentication & Reseller Onboarding

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new reseller account (defaults to `pending` approval) |
| `POST` | `/api/auth/login` | Public | Reseller & Admin login, returns JWT token and profile |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve current user profile and approval status |
| `PUT` | `/api/auth/profile` | Authenticated | Update contact and business details |
| `PUT` | `/api/auth/change-password` | Authenticated | Secure password change |

#### Example: Reseller Registration Request
`POST /api/auth/register`
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@gadgethub.in",
  "password": "Password@12345",
  "phone": "+91 98765 12345",
  "businessInfo": {
    "businessName": "GadgetHub Retailers",
    "taxId": "27AAAAA0000A1Z5",
    "address": "Shop 4, Commercial Plaza",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  }
}
```

---

### 4.2 Admin Panel APIs

#### Dashboard & Approvals
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/dashboard/stats` | Admin | Aggregate metrics (resellers, orders, sales, COD pending, collections) |
| `GET` | `/api/admin/resellers` | Admin | List resellers with query filters (`approvalStatus`, `accountStatus`, search, pagination) |
| `GET` | `/api/admin/resellers/:id` | Admin | Detailed reseller profile, order history, and account ledger |
| `PATCH` | `/api/admin/resellers/:id/approve` | Admin | Approve pending reseller |
| `PATCH` | `/api/admin/resellers/:id/reject` | Admin | Reject reseller with reason |
| `PATCH` | `/api/admin/resellers/:id/status` | Admin | Activate or block a reseller account |

#### Admin Order & Product Management
| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/orders` | Admin | View all system orders with filters |
| `PATCH` | `/api/admin/orders/:id/status` | Admin | Update order status (`confirmed`, `shipped`, `delivered`, `cancelled`) |
| `POST` | `/api/products` | Admin | Create a new catalog product |
| `PUT` | `/api/products/:id` | Admin | Update product details, stock, or prices |
| `DELETE` | `/api/products/:id` | Admin | Archive or delete a product |

---

### 4.3 COD Pending Management

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/cod/pending` | Admin | View all COD orders awaiting courier collection |
| `PATCH` | `/api/cod/:id/collect` | Admin | Record collection, updating collection status and posting ledger credit |
| `PATCH` | `/api/cod/:id/delivery-status` | Admin | Update courier delivery state without affecting collection status |

#### Example: Mark COD Collected
`PATCH /api/cod/67b93a0.../collect`
```json
{
  "notes": "Collected via BlueDart, Reference: BD-928104"
}
```

---

### 4.4 Payments & Financial Ledger

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/payments/reseller-summary` | Reseller | Get own balance, COD pending, and total purchases |
| `GET` | `/api/payments/reseller-ledger` | Reseller | Get own complete immutable statement & ledger entries |
| `POST` | `/api/payments/create-razorpay-order` | Approved Reseller | Create Razorpay payment order for online checkout |
| `POST` | `/api/payments/verify-razorpay` | Approved Reseller | Verify Razorpay HMAC signature and settle order |
| `POST` | `/api/payments/record-manual` | Admin | Record manual bank/cash payment received from a reseller |
| `POST` | `/api/payments/adjustment` | Admin | Record approved credit/debit adjustment with mandatory reason |

---

### 4.5 Financial Reports & Balance Sheet

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/reports/balance-sheet` | Admin | True double-entry accounting balance sheet (Assets, Receivables, Liabilities, Equity) |
| `GET` | `/api/admin/reports/sales` | Admin | Sales breakdown by category, payment method, and date range |
| `GET` | `/api/admin/reports/collections` | Admin | Reconciliation of cash, COD, and online collections |
| `GET` | `/api/admin/reports/sales/csv` | Admin | Export sales records as downloadable CSV |

---

### 4.6 Products & Categories

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public / Reseller | Browse products. If authenticated as approved reseller, returns wholesale prices |
| `GET` | `/api/products/:id` | Public / Reseller | Single product detail |
| `GET` | `/api/products/categories/list` | Public | List main categories: Gadgets, Watches, Footwear, Fashion |

---

### 4.7 Orders, Cart & Wishlist

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Approved Reseller | Place wholesale order (atomic stock validation, ledger debit entry) |
| `GET` | `/api/orders` | Reseller | List reseller's own orders |
| `GET` | `/api/orders/:id` | Reseller | View order details and price snapshots |
| `GET` | `/api/cart` | Reseller | Get persistent cart |
| `POST` | `/api/cart/add` | Reseller | Add product to cart |
| `DELETE` | `/api/cart/item/:productId`| Reseller | Remove item from cart |
| `GET` | `/api/wishlist` | Reseller | Get persistent wishlist |
| `POST` | `/api/wishlist/toggle` | Reseller | Add/remove product from wishlist |

---

## 5. Security Architecture

1. **Role-Based Access Control (RBAC)**: Defined via `restrictTo('admin')` and `restrictTo('reseller')`.
2. **Approval Middleware**: `requireApprovedReseller` prevents unapproved partners from executing checkout transactions.
3. **Audit Trail**: Sensitive actions (reseller approval, status changes, order cancellations, financial adjustments) are written to the `AuditLog` collection with actor ID, IP address, before/after values, and timestamps.
4. **Rate Limiting**: Configured at 100 requests per 15-minute window for general API endpoints; 10 requests per 15 minutes for authentication endpoints.
