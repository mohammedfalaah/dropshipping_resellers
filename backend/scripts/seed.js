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

const seedCategories = [
  {
    name: "Gadgets",
    slug: "gadgets",
    description: "High-demand tech gear, ANC earbuds, and magnetic fast chargers.",
    image: "/images/category-gadgets.jpg",
  },
  {
    name: "Watches",
    slug: "watches",
    description: "Precision automatic chronographs and AMOLED smart wearables.",
    image: "/images/category-watches.jpg",
  },
  {
    name: "Footwear",
    slug: "footwear",
    description: "High-cushion athletic urban runners and handcrafted Chelsea boots.",
    image: "/images/category-footwear.jpg",
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Heavyweight French terry streetwear hoodies and selvedge denim jackets.",
    image: "/images/category-fashion.jpg",
  },
];

const seedProducts = [
  // GADGETS
  {
    name: "Aether Pro ANC Wireless Earbuds",
    slug: "aether-pro-anc-wireless-earbuds",
    category: "Gadgets",
    categorySlug: "gadgets",
    sku: "RES-GAD-001",
    regularPricePaise: rupeesToPaise(59.99),
    resellerPricePaise: rupeesToPaise(34.99),
    rating: 5,
    ratingCount: 84,
    mainImage: "/images/product-earbuds.jpg",
    gallery: ["/images/product-earbuds.jpg", "/images/category-gadgets.jpg"],
    badge: "Best Seller",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 150,
    minOrderQuantity: 1,
    shortDescription: "Active Noise Cancelling Bluetooth 5.4 earbuds with 36-hour total battery life.",
    description: "Equipped with hybrid Active Noise Cancellation (up to 42dB reduction) and custom 12mm titanium drivers, the Aether Pro delivers crystal clear highs and punchy bass.",
    additionalInfo: {
      Connectivity: "Bluetooth 5.4 + EDR",
      "Battery Life": "8 hrs per charge, 36 hrs total with case",
      "Reseller Margin": "Up to 55% Estimated Resale Margin",
    },
  },
  {
    name: "MagVolt 10000mAh Magnetic Power Bank",
    slug: "magvolt-magnetic-power-bank",
    category: "Gadgets",
    categorySlug: "gadgets",
    sku: "RES-GAD-002",
    regularPricePaise: rupeesToPaise(44.99),
    resellerPricePaise: rupeesToPaise(26.5),
    rating: 5,
    ratingCount: 62,
    mainImage: "/images/product-powerbank.jpg",
    gallery: ["/images/product-powerbank.jpg", "/images/category-gadgets.jpg"],
    badge: "Hot Deal",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 120,
    minOrderQuantity: 1,
    shortDescription: "Ultra-slim magnetic wireless battery pack with real-time LED digital percentage display.",
    description: "Engineered with ultra-strong neodymium N52 magnets for seamless snap-on charging with modern smartphones. 20W PD wired fast charging.",
    additionalInfo: {
      Capacity: "10,000mAh Lithium-Polymer",
      Output: "15W Wireless + 20W USB-C Power Delivery",
      "Reseller Margin": "Up to 41% Margin",
    },
  },
  // WATCHES
  {
    name: "Aethereus Automatic Chronograph Watch",
    slug: "aethereus-automatic-chronograph-watch",
    category: "Watches",
    categorySlug: "watches",
    sku: "RES-WAT-001",
    regularPricePaise: rupeesToPaise(129.0),
    resellerPricePaise: rupeesToPaise(68.0),
    rating: 5,
    ratingCount: 47,
    mainImage: "/images/product-luxury-watch.jpg",
    gallery: ["/images/product-luxury-watch.jpg", "/images/category-watches.jpg"],
    badge: "Luxury",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 45,
    minOrderQuantity: 1,
    shortDescription: "316L stainless steel mechanical chronograph with domed sapphire crystal.",
    description: "Hand-assembled timepiece featuring a 24-jewel Japanese mechanical movement with a 42-hour power reserve and exhibition caseback.",
    additionalInfo: {
      Movement: "Seiko VK64 Meca-Quartz Mechanical Hybrid",
      Glass: "Anti-Reflective Sapphire Crystal",
      "Reseller Margin": "Up to 47% Margin",
    },
  },
  {
    name: "Velocity AMOLED Smartwatch Pro",
    slug: "velocity-amoled-smartwatch-pro",
    category: "Watches",
    categorySlug: "watches",
    sku: "RES-WAT-002",
    regularPricePaise: rupeesToPaise(69.99),
    resellerPricePaise: rupeesToPaise(38.5),
    rating: 5,
    ratingCount: 95,
    mainImage: "/images/product-smartwatch.jpg",
    gallery: ["/images/product-smartwatch.jpg", "/images/category-watches.jpg"],
    badge: "Trending",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 210,
    minOrderQuantity: 1,
    shortDescription: "Ultra-bright 1.43-inch AMOLED display with bluetooth calling and 12-day battery life.",
    description: "Features aerospace-grade zinc alloy chassis, optical biometric sensor (heart rate, SpO2, stress, sleep), and 110+ sports tracking profiles.",
    additionalInfo: {
      Display: "1.43-inch HD AMOLED (466x466, 1000 nits)",
      "Battery Life": "Up to 12 days typical use",
      "Reseller Margin": "Up to 45% Margin",
    },
  },
  // FOOTWEAR
  {
    name: "Phantom Urban Runner Athletic Sneakers",
    slug: "phantom-urban-runner-sneakers",
    category: "Footwear",
    categorySlug: "footwear",
    sku: "RES-FTW-001",
    regularPricePaise: rupeesToPaise(65.0),
    resellerPricePaise: rupeesToPaise(36.0),
    rating: 5,
    ratingCount: 58,
    mainImage: "/images/product-sneakers.jpg",
    gallery: ["/images/product-sneakers.jpg", "/images/category-footwear.jpg"],
    badge: "Hot Seller",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 85,
    minOrderQuantity: 1,
    shortDescription: "Responsive cloud-foam cushioning with engineered breathable mesh upper.",
    description: "Built for urban commuters and fitness enthusiasts, featuring ergonomic arch support, high-traction rubber outsole, and lightweight energy-return midsole.",
    additionalInfo: {
      Upper: "Engineered Jacquard Knit Mesh",
      Sole: "Dual-Density EVA CloudFoam",
      "Reseller Margin": "Up to 45% Margin",
    },
  },
  {
    name: "Heritage Artisan Leather Chelsea Boots",
    slug: "heritage-artisan-leather-chelsea-boots",
    category: "Footwear",
    categorySlug: "footwear",
    sku: "RES-FTW-002",
    regularPricePaise: rupeesToPaise(89.99),
    resellerPricePaise: rupeesToPaise(49.99),
    rating: 5,
    ratingCount: 39,
    mainImage: "/images/product-boots.jpg",
    gallery: ["/images/product-boots.jpg", "/images/category-footwear.jpg"],
    badge: "Premium",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 60,
    minOrderQuantity: 1,
    shortDescription: "Hand-finished full-grain leather boots with Goodyear welt and elastic side gussets.",
    description: "Classic silhouette handcrafted from pull-up cowhide leather with shock-absorbing stacked leather heel and breathable calfskin lining.",
    additionalInfo: {
      Material: "Full-Grain Oiled Cowhide Leather",
      Construction: "Reinforced Goodyear Welt",
      "Reseller Margin": "Up to 44% Margin",
    },
  },
  // FASHION
  {
    name: "Heavyweight French Terry Oversized Hoodie",
    slug: "heavyweight-french-terry-oversized-hoodie",
    category: "Fashion",
    categorySlug: "fashion",
    sku: "RES-FSH-001",
    regularPricePaise: rupeesToPaise(48.0),
    resellerPricePaise: rupeesToPaise(24.5),
    rating: 5,
    ratingCount: 71,
    mainImage: "/images/product-hoodie.jpg",
    gallery: ["/images/product-hoodie.jpg", "/images/category-fashion.jpg"],
    badge: "Best Value",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 180,
    minOrderQuantity: 1,
    shortDescription: "450 GSM ultra-dense combed organic cotton with double-layered hood.",
    description: "Drop-shoulder relaxed streetwear cut made from premium 100% combed cotton French terry. Pre-shrunk with ribbed cuffs and hem.",
    additionalInfo: {
      Fabric: "450 GSM 100% Combed Organic Cotton",
      Fit: "Streetwear Boxy Relaxed Fit",
      "Reseller Margin": "Up to 49% Margin",
    },
  },
  {
    name: "Raw Indigo Selvedge Denim Trucker Jacket",
    slug: "raw-indigo-selvedge-denim-trucker-jacket",
    category: "Fashion",
    categorySlug: "fashion",
    sku: "RES-FSH-002",
    regularPricePaise: rupeesToPaise(79.0),
    resellerPricePaise: rupeesToPaise(39.0),
    rating: 5,
    ratingCount: 44,
    mainImage: "/images/product-denim-jacket.jpg",
    gallery: ["/images/product-denim-jacket.jpg", "/images/category-fashion.jpg"],
    badge: "Trending",
    isFeatured: true,
    isTrending: true,
    stockQuantity: 95,
    minOrderQuantity: 1,
    shortDescription: "14oz Japanese shuttle-loom selvedge denim with custom antiqued copper hardware.",
    description: "Classic Type-III trucker jacket crafted from unwashed 14oz red-line selvedge denim that develops personalized honeycombs and fades with wear.",
    additionalInfo: {
      Denim: "14oz 100% Cotton Red-Line Selvedge",
      Hardware: "Antiqued Copper Rivets & Shank Buttons",
      "Reseller Margin": "Up to 51% Margin",
    },
  },
];

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
